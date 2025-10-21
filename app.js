// Configuration
let API_URL = 'https://darthyoda.pythonanywhere.com';
let currentUserId = null;
let currentUser = null;
let currentMedications = [];
let selectedMedication = null;

// Load API URL from localStorage
if (localStorage.getItem('apiUrl')) {
    API_URL = localStorage.getItem('apiUrl');
    document.getElementById('apiUrlInput').value = API_URL;
}

// Check if user is logged in
function checkAuth() {
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        showMainApp();
    } else {
        showLogin();
    }
}

// Show login screen
function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('userSelection').style.display = 'none';
    document.getElementById('summarySection').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').style.display = 'none';
    }
    if (document.getElementById('currentUserName')) {
        document.getElementById('currentUserName').style.display = 'none';
    }
}

// Show main app
function showMainApp() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userSelection').style.display = 'block';
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').style.display = 'inline-block';
    }
    if (document.getElementById('currentUserName')) {
        document.getElementById('currentUserName').style.display = 'inline-block';
        document.getElementById('currentUserName').textContent = currentUser.Users;
    }
    loadUsers();
}

// Handle Google login (called by Google Sign-In)
async function handleGoogleLogin(response) {
    try {
        // Send the Google token to our backend for verification
        const apiResponse = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });
        
        // Try to parse the response as JSON
        let errorData;
        try {
            errorData = await apiResponse.json();
        } catch (e) {
            // If response is not JSON (e.g., HTML error page), show generic error
            throw new Error('Unable to connect to the server. Please try again later.');
        }
        
        if (!apiResponse.ok) {
            // Handle specific error types with user-friendly messages
            let errorMessage;
            
            switch (errorData.error) {
                case 'user_not_found':
                    errorMessage = errorData.message || "Sorry, your email address is not authorized to use this app.";
                    break;
                case 'invalid_token':
                    errorMessage = "Your login session expired. Please try signing in again.";
                    break;
                case 'no_email':
                    errorMessage = "Unable to retrieve your email from Google. Please check your Google account settings.";
                    break;
                default:
                    errorMessage = errorData.message || "Login failed. Please try again.";
            }
            
            throw new Error(errorMessage);
        }
        
        const userData = errorData;
        currentUser = userData;
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        
        showMainApp();
        
    } catch (error) {
        console.error('Login error:', error);
        const errorDiv = document.getElementById('loginError');
        errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill"></i> 
            ${error.message}
        `;
        errorDiv.style.display = 'block';
        
        // Keep error visible longer (10 seconds instead of 5)
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 10000);
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Sign out from Google
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }
        
        // Clear local session
        sessionStorage.removeItem('currentUser');
        currentUser = null;
        currentUserId = null;
        currentMedications = [];
        showLogin();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    }
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
    
    // Filter out inactive medications
    const activeMedications = currentMedications.filter(m => m.Active !== false);
    
    if (activeMedications.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No active medications found.</p>';
        return;
    }
    
    activeMedications.forEach(med => {
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
    
    // Check for low repeats
    let repeatsWarning = '';
    if (med.Repeats === 0) {
        repeatsWarning = '<span class="badge bg-danger ms-2"><i class="bi bi-exclamation-circle"></i> No Repeats</span>';
    } else if (med.Repeats <= 2) {
        repeatsWarning = `<span class="badge bg-warning text-dark ms-2"><i class="bi bi-exclamation-triangle"></i> ${med.Repeats} Repeat${med.Repeats === 1 ? '' : 's'}</span>`;
    }
    
    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="card-title mb-1">
                        ${med.MedicationName}
                        ${repeatsWarning}
                    </h6>
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
    document.getElementById('modalRepeats').value = med.Repeats;
    
    // Show low repeats warning
    const repeatsWarning = document.getElementById('repeatsWarning');
    if (med.Repeats <= 2 && med.Repeats > 0) {
        repeatsWarning.style.display = 'block';
        repeatsWarning.textContent = `⚠️ Only ${med.Repeats} repeat${med.Repeats === 1 ? '' : 's'} remaining!`;
    } else if (med.Repeats === 0) {
        repeatsWarning.style.display = 'block';
        repeatsWarning.textContent = '🔴 No repeats remaining - prescription renewal needed!';
        repeatsWarning.classList.remove('alert-warning');
        repeatsWarning.classList.add('alert-danger');
    } else {
        repeatsWarning.style.display = 'none';
    }
    
    new bootstrap.Modal(document.getElementById('medDetailModal')).show();
}

// Record usage
async function recordUsage() {
    if (!selectedMedication) return;
    
    // Default to weekly dosage instead of daily
    const defaultQuantity = selectedMedication.calcDosageWeekly || selectedMedication.calcDosageDaily || 1;
    const quantity = prompt('Enter quantity used:', defaultQuantity);
    
    if (!quantity || quantity <= 0) return;
    
    try {
        await fetch(`${API_URL}/user-med-chart/${selectedMedication.UsrID}/${selectedMedication.MedIDs}/record-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: parseFloat(quantity) })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('medDetailModal')).hide();
        await loadUserMedications();
        alert('Usage recorded successfully!');
        
    } catch (error) {
        console.error('Error recording usage:', error);
        alert('Failed to record usage.');
    }
}

// Record purchase
async function recordPurchase() {
    if (!selectedMedication) return;
    
    // Show warning if no repeats remaining
    if (selectedMedication.Repeats === 0) {
        if (!confirm('⚠️ You have no prescription repeats remaining. Do you want to record this purchase anyway (e.g., after getting a new prescription)?')) {
            return;
        }
    }
    
    const quantity = prompt('Enter quantity purchased:', 100);
    if (!quantity || quantity <= 0) return;
    
    try {
        const response = await fetch(`${API_URL}/user-med-chart/${selectedMedication.UsrID}/${selectedMedication.MedIDs}/record-purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: parseInt(quantity) })
        });
        
        const result = await response.json();
        
        bootstrap.Modal.getInstance(document.getElementById('medDetailModal')).hide();
        await loadUserMedications();
        
        // Show success message with repeats info
        if (result.repeats_remaining === 0) {
            alert(`Purchase recorded! ⚠️ No repeats remaining - you'll need a new prescription next time.`);
        } else if (result.repeats_remaining <= 2) {
            alert(`Purchase recorded! ${result.repeats_remaining} repeat${result.repeats_remaining === 1 ? '' : 's'} remaining.`);
        } else {
            alert('Purchase recorded successfully!');
        }
        
    } catch (error) {
        console.error('Error recording purchase:', error);
        alert('Failed to record purchase.');
    }
}

// Update summary
function updateSummary() {
    const activeMedications = currentMedications.filter(m => m.Active !== false);
    
    document.getElementById('totalMeds').textContent = activeMedications.length;
    document.getElementById('lowStockCount').textContent = 
        activeMedications.filter(m => m.calcStockStatus === 'low').length;
    document.getElementById('criticalCount').textContent = 
        activeMedications.filter(m => m.calcStockStatus === 'critical').length;
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
        
        // Filter out inactive medications
        const activeMedications = forecast.medications.filter(m => m.Active !== false);
        
        // Update next purchase date
        const nextPurchase = activeMedications.find(m => m.NextPurchaseDate);
        document.getElementById('nextPurchaseDate').textContent = 
            nextPurchase ? formatDate(nextPurchase.NextPurchaseDate) : 'Not set';
        
        // Recalculate total cost for active medications only
        const totalCost = activeMedications.reduce((sum, item) => sum + (item.EstimatedCost || 0), 0);
        document.getElementById('estimatedCost').textContent = `$${totalCost.toFixed(2)}`;
        
        // Display forecast items (active only)
        const container = document.getElementById('forecastList');
        container.innerHTML = '';
        
        if (activeMedications.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No active medications found.</p>';
            return;
        }
        
        activeMedications.forEach(med => {
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