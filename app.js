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
    
    // Medication management
    document.getElementById('addMedicationBtn').addEventListener('click', showAddMedicationForm);
    document.getElementById('saveMedicationBtn').addEventListener('click', saveMedication);
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
        
        // Load forecast by default
        await loadForecast();
        
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
function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('#mainTabs .nav-link').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    
    if (tabName === 'medications') {
        document.getElementById('medicationsList').style.display = 'block';
    } else if (tabName === 'forecast') {
        document.getElementById('forecastView').style.display = 'block';
        loadForecast();
    } else if (tabName === 'manage') {
        document.getElementById('manageView').style.display = 'block';
        loadManageMedications();
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

// ==================== MEDICATION MANAGEMENT ====================

// Show add medication form
function showAddMedicationForm() {
    document.getElementById('medicationFormTitle').textContent = 'Add New Medication';
    document.getElementById('editMedId').value = '';
    document.getElementById('medName').value = '';
    document.getElementById('medCommonName').value = '';
    document.getElementById('medStrength').value = '';
    document.getElementById('medQtyRepeat').value = '';
    document.getElementById('medPrice').value = '';
    new bootstrap.Modal(document.getElementById('medicationFormModal')).show();
}

// Save medication (add or edit)
async function saveMedication() {
    const medId = document.getElementById('editMedId').value;
    const medData = {
        MedicationName: document.getElementById('medName').value.trim(),
        CommonName: document.getElementById('medCommonName').value.trim(),
        MedicationStrength: document.getElementById('medStrength').value.trim(),
        QtyRepeat: parseInt(document.getElementById('medQtyRepeat').value),
        Price: parseFloat(document.getElementById('medPrice').value) || null
    };
    
    // Validation
    if (!medData.MedicationName || !medData.CommonName || !medData.MedicationStrength || !medData.QtyRepeat) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const url = medId ? `${API_URL}/medications/${medId}` : `${API_URL}/medications`;
        const method = medId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(medData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.description || 'Failed to save medication');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('medicationFormModal')).hide();
        await loadManageMedications();
        alert(medId ? 'Medication updated successfully!' : 'Medication added successfully!');
        
    } catch (error) {
        console.error('Error saving medication:', error);
        alert(`Error: ${error.message}`);
    }
}

// Load medications for management view
async function loadManageMedications() {
    try {
        const response = await fetch(`${API_URL}/medications?include_inactive=true`);
        const medications = await response.json();
        
        const container = document.getElementById('manageMedicationsList');
        container.innerHTML = '';
        
        if (medications.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No medications found.</p>';
            return;
        }
        
        medications.forEach(med => {
            const card = createManageMedicationCard(med);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading medications:', error);
        alert('Failed to load medications.');
    }
}

// Create medication management card
function createManageMedicationCard(med) {
    const card = document.createElement('div');
    card.className = `card mb-2 ${!med.Active ? 'border-secondary' : ''}`;
    
    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="card-title mb-1">
                        ${med.MedicationName}
                        ${!med.Active ? '<span class="badge bg-secondary ms-2">Inactive</span>' : ''}
                    </h6>
                    <small class="text-muted">${med.CommonName} - ${med.MedicationStrength}</small>
                    <div class="mt-1">
                        <small>Qty: ${med.QtyRepeat} | Price: ${med.Price ? '$' + med.Price.toFixed(2) : 'N/A'}</small>
                    </div>
                </div>
                <div class="btn-group-vertical btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editMedication(${med.MedIDs})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-${med.Active ? 'warning' : 'success'}" 
                            onclick="toggleMedicationActive(${med.MedIDs}, ${med.Active})">
                        <i class="bi bi-${med.Active ? 'archive' : 'arrow-counterclockwise'}"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Edit medication
async function editMedication(medId) {
    try {
        const response = await fetch(`${API_URL}/medications/${medId}`);
        const med = await response.json();
        
        document.getElementById('medicationFormTitle').textContent = 'Edit Medication';
        document.getElementById('editMedId').value = med.MedIDs;
        document.getElementById('medName').value = med.MedicationName;
        document.getElementById('medCommonName').value = med.CommonName;
        document.getElementById('medStrength').value = med.MedicationStrength;
        document.getElementById('medQtyRepeat').value = med.QtyRepeat;
        document.getElementById('medPrice').value = med.Price || '';
        
        new bootstrap.Modal(document.getElementById('medicationFormModal')).show();
        
    } catch (error) {
        console.error('Error loading medication:', error);
        alert('Failed to load medication details.');
    }
}

// Toggle medication active status
async function toggleMedicationActive(medId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this medication?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/medications/${medId}/toggle-active`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle medication status');
        }
        
        await loadManageMedications();
        
    } catch (error) {
        console.error('Error toggling medication status:', error);
        alert('Failed to update medication status.');
    }
}