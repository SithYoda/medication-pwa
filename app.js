// Configuration
let API_URL = 'https://darthyoda.pythonanywhere.com';
let currentUserId = null;
let currentMedications = [];
let selectedMedication = null;

// Load API URL from localStorage
if (localStorage.getItem('apiUrl')) {
    API_URL = localStorage.getItem('apiUrl');
    document.getElementById('apiUrlInput').value = API_URL;
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('loadUserBtn').addEventListener('click', loadUserMedications);
    document.getElementById('settingsBtn').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('settingsModal')).show();
    });
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('recordUsageBtn').addEventListener('click', recordUsage);
    document.getElementById('recordPurchaseBtn').addEventListener('click', recordPurchase);
    
    // Tab switching
    document.querySelectorAll('#mainTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tab.dataset.tab);
        });
    });
}

// Save settings
function saveSettings() {
    const apiUrl = document.getElementById('apiUrlInput').value.trim();
    localStorage.setItem('apiUrl', apiUrl);
    API_URL = apiUrl;
    bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
    alert('Settings saved! Please reload to apply changes.');
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        const users = await response.json();
        
        const select = document.getElementById('userSelect');
        select.innerHTML = '<option value="">Select a user...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.UsrID;
            option.textContent = user.Users;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Failed to load users. Check your connection.');
    }
}

// Load user medications
async function loadUserMedications() {
    const userId = document.getElementById('userSelect').value;
    
    if (!userId) {
        alert('Please select a user');
        return;
    }
    
    currentUserId = userId;
    
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${userId}`);
        currentMedications = await response.json();
        
        // Show main interface
        document.getElementById('summarySection').style.display = 'flex';
        document.getElementById('mainTabs').style.display = 'flex';
        
        displayMedications();
        updateSummary();
        
    } catch (error) {
        console.error('Error loading medications:', error);
        alert('Failed to load medications.');
    }
}

// Display medications
function displayMedications() {
    const container = document.getElementById('medicationsList');
    container.innerHTML = '';
    
    if (currentMedications.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No medications found.</p>';
        return;
    }
    
    currentMedications.forEach(med => {
        const card = createMedicationCard(med);
        container.appendChild(card);
    });
}

// Create medication card
function createMedicationCard(med) {
    const card = document.createElement('div');
    card.className = `card medication-card status-${med.calcStockStatus} mb-2`;
    card.onclick = () => showMedicationDetail(med);
    
    const statusColor = {
        'critical': 'danger',
        'low': 'warning',
        'good': 'success'
    }[med.calcStockStatus];
    
    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="card-title mb-1">${med.MedicationName}</h6>
                    <small class="text-muted">${med.CommonName} ${med.MedicationStrength}</small>
                </div>
                <span class="badge bg-${statusColor} stock-badge">
                    ${med.Stocktake}
                </span>
            </div>
            <div class="mt-2">
                <small>
                    <i class="bi bi-clock"></i> ${med.calcDaysRemaining} days remaining
                    ${med.calcRunOutDate ? `<br><i class="bi bi-calendar-x"></i> Runs out: ${formatDate(med.calcRunOutDate)}` : ''}
                </small>
            </div>
        </div>
    `;
    
    return card;
}

// Show medication detail
function showMedicationDetail(med) {
    selectedMedication = med;
    
    document.getElementById('modalMedName').textContent = med.MedicationName;
    document.getElementById('modalCommonName').textContent = med.CommonName;
    document.getElementById('modalStrength').textContent = med.MedicationStrength;
    document.getElementById('modalStock').value = med.Stocktake;
    document.getElementById('modalDaysRemaining').value = `${med.calcDaysRemaining} days`;
    document.getElementById('modalRunOutDate').value = med.calcRunOutDate ? formatDate(med.calcRunOutDate) : 'N/A';
    
    new bootstrap.Modal(document.getElementById('medDetailModal')).show();
}

// Record usage
async function recordUsage() {
    if (!selectedMedication) return;
    
    const quantity = prompt('Enter quantity used:', selectedMedication.calcDosageDaily || 1);
    if (!quantity || quantity <= 0) return;
    
    try {
        await fetch(`${API_URL}/user-med-chart/${selectedMedication.UsrID}/${selectedMedication.MedIDs}/record-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: parseFloat(quantity) })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('medDetailModal')).hide();
        loadUserMedications();
        
    } catch (error) {
        console.error('Error recording usage:', error);
        alert('Failed to record usage.');
    }
}

// Record purchase
async function recordPurchase() {
    if (!selectedMedication) return;
    
    const quantity = prompt('Enter quantity purchased:', 100);
    if (!quantity || quantity <= 0) return;
    
    try {
        await fetch(`${API_URL}/user-med-chart/${selectedMedication.UsrID}/${selectedMedication.MedIDs}/record-purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: parseInt(quantity) })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('medDetailModal')).hide();
        loadUserMedications();
        
    } catch (error) {
        console.error('Error recording purchase:', error);
        alert('Failed to record purchase.');
    }
}

// Update summary
function updateSummary() {
    document.getElementById('totalMeds').textContent = currentMedications.length;
    document.getElementById('lowStockCount').textContent = 
        currentMedications.filter(m => m.calcStockStatus === 'low').length;
    document.getElementById('criticalCount').textContent = 
        currentMedications.filter(m => m.calcStockStatus === 'critical').length;
}

// Switch tabs
async function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('#mainTabs .nav-link').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    
    if (tabName === 'medications') {
        document.getElementById('medicationsList').style.display = 'block';
    } else if (tabName === 'forecast') {
        document.getElementById('forecastView').style.display = 'block';
        await loadForecast();
    }
}

// Load forecast
async function loadForecast() {
    if (!currentUserId) return;
    
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${currentUserId}/forecast`);
        const forecast = await response.json();
        
        // Update next purchase date
        const nextPurchase = forecast.medications.find(m => m.NextPurchaseDate);
        document.getElementById('nextPurchaseDate').textContent = 
            nextPurchase ? formatDate(nextPurchase.NextPurchaseDate) : 'Not set';
        
        document.getElementById('estimatedCost').textContent = 
            `$${forecast.estimated_total_cost.toFixed(2)}`;
        
        // Display forecast items
        const container = document.getElementById('forecastList');
        container.innerHTML = '';
        
        forecast.medications.forEach(med => {
            const item = createForecastItem(med);
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Error loading forecast:', error);
    }
}

// Create forecast item
function createForecastItem(med) {
    const item = document.createElement('div');
    item.className = `card forecast-item mb-2 ${med.NeedsPurchase ? 'needs-purchase' : ''}`;
    
    const statusIcon = {
        'critical': 'exclamation-circle-fill text-danger',
        'low': 'exclamation-triangle-fill text-warning',
        'good': 'check-circle-fill text-success'
    }[med.StockStatus];
    
    item.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">
                        <i class="bi bi-${statusIcon}"></i>
                        ${med.MedicationName}
                    </h6>
                    <small class="text-muted">${med.CommonName}</small>
                </div>
                ${med.NeedsPurchase ? '<span class="badge bg-danger">Purchase Needed</span>' : ''}
            </div>
            <div class="mt-2">
                <small>
                    <strong>${med.DaysRemaining} days</strong> remaining<br>
                    ${med.RunOutDate ? `Runs out: ${formatDate(med.RunOutDate)}` : ''}<br>
                    ${med.Price ? `Recommended qty: ${med.RecommendedPurchaseQty} ($${med.Price.toFixed(2)})` : ''}
                </small>
            </div>
        </div>
    `;
    
    return item;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}