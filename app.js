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
    
    // Timeline month selector
    document.querySelectorAll('input[name="timelineMonths"]').forEach(radio => {
        radio.addEventListener('change', loadTimeline);
    });
    
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
    
    // Pharmacy management
    document.getElementById('addPharmacyBtn').addEventListener('click', showAddPharmacyForm);
    document.getElementById('savePharmacyBtn').addEventListener('click', savePharmacy);
    
    // Share functionality - ADD THESE LINES
    document.getElementById('shareForecastBtn').addEventListener('click', showShareModal);
    document.getElementById('shareEmailBtn').addEventListener('click', shareViaEmail);
    document.getElementById('shareSMSBtn').addEventListener('click', shareViaSMS);
    document.getElementById('copyToClipboardBtn').addEventListener('click', copyToClipboard);
    document.getElementById('showQRCodeBtn').addEventListener('click', generateQRCode);

    // At the end of setupEventListeners function, add:
    document.getElementById('confirmAssignBtn').addEventListener('click', confirmAssignMedication);
}

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(reg => console.log('Service worker registered'))
        .catch(err => console.error('Service worker registration failed:', err));
}

// Save settings
function saveSettings() {
    const apiUrl = document.getElementById('apiUrlInput').value.trim();
    localStorage.setItem('apiUrl', apiUrl);
    API_URL = apiUrl;
    bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
    customAlert('Settings saved! Please reload to apply changes.');
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
        customAlert('Failed to load users. Check your connection.');
    }
}

// Load user medications
async function loadUserMedications() {
    const userId = document.getElementById('userSelect').value;
    
    if (!userId) {
        customAlert('Please select a user');
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
        
        // If no medications, show option to assign
        if (currentMedications.length === 0) {
            switchTab('manage');
            await customAlert('This user has no medications assigned yet. Go to the Manage tab to assign medications.');
        } else {
            // Load forecast and switch to forecast tab
            await loadForecast();
            switchTab('forecast');
        }
        
    } catch (error) {
        console.error('Error loading medications:', error);
        customAlert('Failed to load medications.');
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
    document.getElementById('modalRepeats').value = med.Repeats;
    document.getElementById('modalDosageAM').value = med.DosageAM || 0;
    document.getElementById('modalDosagePM').value = med.DosagePM || 0;
    document.getElementById('modalDosageWeekly').value = med.DosageOncePerWeek || 0;
    document.getElementById('modalDaysRemaining').value = `${med.calcDaysRemaining} days`;
    document.getElementById('modalRunOutDate').value = med.calcRunOutDate ? formatDate(med.calcRunOutDate) : 'N/A';
    
    // Calculate and show daily total
    const dailyTotal = med.calcDosageDaily || 0;
    document.getElementById('modalDosageTotal').textContent = dailyTotal.toFixed(1);
    
    // Reset to normal mode
    exitEditMode();
    
    // Show low repeats warning
    const repeatsWarning = document.getElementById('repeatsWarning');
    if (med.Repeats <= 2 && med.Repeats > 0) {
        repeatsWarning.style.display = 'block';
        repeatsWarning.className = 'alert alert-warning';
        repeatsWarning.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> Only ${med.Repeats} repeat${med.Repeats === 1 ? '' : 's'} remaining!`;
    } else if (med.Repeats === 0) {
        repeatsWarning.style.display = 'block';
        repeatsWarning.className = 'alert alert-danger';
        repeatsWarning.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i> No repeats remaining - prescription renewal needed!';
    } else {
        repeatsWarning.style.display = 'none';
    }
    
    // Setup edit mode button listeners
    document.getElementById('editModeBtn').onclick = enterEditMode;
    document.getElementById('saveEditsBtn').onclick = saveStockRepeatsEdit;
    document.getElementById('cancelEditBtn').onclick = exitEditMode;
    
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
        await customAlert('Usage recorded successfully!');
        
    } catch (error) {
        console.error('Error recording usage:', error);
        await customAlert('Failed to record usage.');
    }
}

// Record purchase
async function recordPurchase() {
    if (!selectedMedication) return;
    
    // Show warning if no repeats remaining
    if (selectedMedication.Repeats === 0) {
        const proceed = await customConfirm('⚠️ You have no prescription repeats remaining. Do you want to record this purchase anyway (e.g., after getting a new prescription)?');
        if (!proceed) return;
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
            await customAlert(`Purchase recorded! ⚠️ No repeats remaining - you'll need a new prescription next time.`);
        } else if (result.repeats_remaining <= 2) {
            await customAlert(`Purchase recorded! ${result.repeats_remaining} repeat${result.repeats_remaining === 1 ? '' : 's'} remaining.`);
        } else {
            await customAlert('Purchase recorded successfully!');
        }
        
    } catch (error) {
        console.error('Error recording purchase:', error);
        await customAlert('Failed to record purchase.');
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
    } else if (tabName === 'timeline') {
        document.getElementById('timelineView').style.display = 'block';
        loadTimeline();
    } else if (tabName === 'manage') {
        document.getElementById('manageView').style.display = 'block';
        loadManageMedications();
    } else if (tabName === 'pharmacies') {  // ADD THIS CASE
        document.getElementById('pharmaciesView').style.display = 'block';
        loadPharmacies();
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

// ==================== TIMELINE FORECAST ====================

// Load timeline
async function loadTimeline() {
    if (!currentUserId) return;
    
    // Get selected month range
    const months = document.querySelector('input[name="timelineMonths"]:checked').value;
    
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${currentUserId}/timeline?months=${months}`);
        const timeline = await response.json();
        
        displayTimeline(timeline);
        
    } catch (error) {
        console.error('Error loading timeline:', error);
        await customAlert('Failed to load timeline.');
    }
}

// Display timeline
function displayTimeline(timeline) {
    const container = document.getElementById('timelineEvents');
    container.innerHTML = '';
    
    if (!timeline.timeline || timeline.timeline.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No timeline events found.</p>';
        return;
    }
    
    // Calculate totals
    let totalPurchases = 0;
    let totalPrescriptions = 0;
    
    timeline.timeline.forEach(month => {
        totalPurchases += month.events.filter(e => e.type === 'purchase').length;
        totalPrescriptions += month.prescription_renewals_needed;
    });
    
    document.getElementById('totalPurchases').textContent = totalPurchases;
    document.getElementById('totalPrescriptions').textContent = totalPrescriptions;
    
    // Display events by month
    timeline.timeline.forEach(monthData => {
        const monthCard = createMonthCard(monthData);
        container.appendChild(monthCard);
    });
}

// Create month card
function createMonthCard(monthData) {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    
    const purchaseEvents = monthData.events.filter(e => e.type === 'purchase');
    const prescriptionEvents = monthData.events.filter(e => e.type === 'prescription_renewal');
    
    let eventsHTML = '';
    
    monthData.events.forEach(event => {
        const eventDate = new Date(event.date);
        const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const isPrescription = event.type === 'prescription_renewal';
        const badgeColor = isPrescription ? 'danger' : 'success';
        const icon = isPrescription ? 'file-medical' : 'cart';
        const label = isPrescription ? 'New Script' : 'Purchase';
        
        eventsHTML += `
            <div class="d-flex justify-content-between align-items-start mb-2 pb-2 border-bottom">
                <div>
                    <div>
                        <span class="badge bg-${badgeColor} me-2">
                            <i class="bi bi-${icon}"></i> ${label}
                        </span>
                        <strong>${dateStr}</strong>
                    </div>
                    <div class="mt-1">
                        <small class="text-muted">
                            ${event.medication_name} (${event.common_name})<br>
                            ${event.strength} - Qty: ${event.quantity}
                            ${event.price ? ` - $${event.price.toFixed(2)}` : ''}
                        </small>
                    </div>
                    ${!isPrescription && event.repeats_after !== undefined ? 
                        `<small class="text-muted">Repeats after: ${event.repeats_after}</small>` : ''}
                </div>
            </div>
        `;
    });
    
    card.innerHTML = `
        <div class="card-header bg-light">
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0">
                    <i class="bi bi-calendar-month"></i> ${monthData.month}
                </h6>
                <div>
                    ${prescriptionEvents.length > 0 ? 
                        `<span class="badge bg-danger me-1">${prescriptionEvents.length} Script${prescriptionEvents.length > 1 ? 's' : ''}</span>` : ''}
                    <span class="badge bg-primary">${purchaseEvents.length} Purchase${purchaseEvents.length > 1 ? 's' : ''}</span>
                    ${monthData.total_cost > 0 ? 
                        `<span class="badge bg-success ms-1">$${monthData.total_cost.toFixed(2)}</span>` : ''}
                </div>
            </div>
        </div>
        <div class="card-body">
            ${eventsHTML}
        </div>
    `;
    
    return card;
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
        await customAlert('Please fill in all required fields');
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
        await customAlert(medId ? 'Medication updated successfully!' : 'Medication added successfully!');
        
    } catch (error) {
        console.error('Error saving medication:', error);
        await customAlert(`Error: ${error.message}`);
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
        await customAlert('Failed to load medications.');
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
                    <button class="btn btn-outline-success" onclick="assignMedicationToUser(${med.MedIDs})" title="Assign to User">
                        <i class="bi bi-person-plus"></i>
                    </button>
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
        await customAlert('Failed to load medication details.');
    }
}

// Toggle medication active status
async function toggleMedicationActive(medId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    const proceed = await customConfirm(`Are you sure you want to ${action} this medication?`);
    if (!proceed) return;
    
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
        await customAlert('Failed to update medication status.');
    }
}

// ==================== PHARMACY MANAGEMENT ====================

// Show add pharmacy form
function showAddPharmacyForm() {
    document.getElementById('pharmacyFormTitle').textContent = 'Add Pharmacy';
    document.getElementById('editPharmacyId').value = '';
    document.getElementById('pharmacyName').value = '';
    document.getElementById('pharmacyPhone').value = '';
    document.getElementById('pharmacyFax').value = '';
    document.getElementById('pharmacyEmail').value = '';
    document.getElementById('pharmacyAddress').value = '';
    new bootstrap.Modal(document.getElementById('pharmacyFormModal')).show();
}

// Save pharmacy (add or edit)
async function savePharmacy() {
    const pharmacyId = document.getElementById('editPharmacyId').value;
    const pharmacyData = {
        Name: document.getElementById('pharmacyName').value.trim(),
        Phone: document.getElementById('pharmacyPhone').value.trim(),
        Fax: document.getElementById('pharmacyFax').value.trim(),
        Email: document.getElementById('pharmacyEmail').value.trim(),
        Address: document.getElementById('pharmacyAddress').value.trim()
    };
    
    // Validation
    if (!pharmacyData.Name) {
        await customAlert('Please enter pharmacy name');
        return;
    }
    
    try {
        const url = pharmacyId ? `${API_URL}/pharmacies/${pharmacyId}` : `${API_URL}/pharmacies`;
        const method = pharmacyId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pharmacyData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.description || 'Failed to save pharmacy');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('pharmacyFormModal')).hide();
        await loadPharmacies();
        await customAlert(pharmacyId ? 'Pharmacy updated successfully!' : 'Pharmacy added successfully!');
        
    } catch (error) {
        console.error('Error saving pharmacy:', error);
        await customAlert(`Error: ${error.message}`);
    }
}

// Load pharmacies
async function loadPharmacies() {
    try {
        const response = await fetch(`${API_URL}/pharmacies?include_inactive=true`);
        const pharmacies = await response.json();
        
        const container = document.getElementById('pharmaciesList');
        container.innerHTML = '';
        
        if (pharmacies.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No pharmacies found.</p>';
            return;
        }
        
        pharmacies.forEach(pharmacy => {
            const card = createPharmacyCard(pharmacy);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading pharmacies:', error);
        await customAlert('Failed to load pharmacies.');
    }
}

// Create pharmacy card
function createPharmacyCard(pharmacy) {
    const card = document.createElement('div');
    card.className = `card mb-2 ${!pharmacy.Active ? 'border-secondary' : ''}`;
    
    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="card-title mb-1">
                        <i class="bi bi-shop"></i> ${pharmacy.Name}
                        ${!pharmacy.Active ? '<span class="badge bg-secondary ms-2">Inactive</span>' : ''}
                    </h6>
                    ${pharmacy.Phone ? `<small class="text-muted d-block"><i class="bi bi-telephone"></i> ${pharmacy.Phone}</small>` : ''}
                    ${pharmacy.Email ? `<small class="text-muted d-block"><i class="bi bi-envelope"></i> ${pharmacy.Email}</small>` : ''}
                    ${pharmacy.Address ? `<small class="text-muted d-block"><i class="bi bi-geo-alt"></i> ${pharmacy.Address}</small>` : ''}
                </div>
                <div class="btn-group-vertical btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editPharmacy(${pharmacy.PharmacyID})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-${pharmacy.Active ? 'warning' : 'success'}" 
                            onclick="togglePharmacyActive(${pharmacy.PharmacyID}, ${pharmacy.Active})">
                        <i class="bi bi-${pharmacy.Active ? 'archive' : 'arrow-counterclockwise'}"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Edit pharmacy
async function editPharmacy(pharmacyId) {
    try {
        const response = await fetch(`${API_URL}/pharmacies/${pharmacyId}`);
        const pharmacy = await response.json();
        
        document.getElementById('pharmacyFormTitle').textContent = 'Edit Pharmacy';
        document.getElementById('editPharmacyId').value = pharmacy.PharmacyID;
        document.getElementById('pharmacyName').value = pharmacy.Name;
        document.getElementById('pharmacyPhone').value = pharmacy.Phone || '';
        document.getElementById('pharmacyFax').value = pharmacy.Fax || '';
        document.getElementById('pharmacyEmail').value = pharmacy.Email || '';
        document.getElementById('pharmacyAddress').value = pharmacy.Address || '';
        
        new bootstrap.Modal(document.getElementById('pharmacyFormModal')).show();
        
    } catch (error) {
        console.error('Error loading pharmacy:', error);
        await customAlert('Failed to load pharmacy details.');
    }
}

// Toggle pharmacy active status
async function togglePharmacyActive(pharmacyId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    const proceed = await customConfirm(`Are you sure you want to ${action} this pharmacy?`);
    if (!proceed) return;
    
    try {
        const response = await fetch(`${API_URL}/pharmacies/${pharmacyId}/toggle-active`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle pharmacy status');
        }
        
        await loadPharmacies();
        
    } catch (error) {
        console.error('Error toggling pharmacy status:', error);
        await customAlert('Failed to update pharmacy status.');
    }
}

// ==================== EDIT MODE FOR STOCK/REPEATS ====================

// Enable edit mode for stock, repeats, and dosages
function enterEditMode() {
    document.getElementById('modalStock').removeAttribute('readonly');
    document.getElementById('modalRepeats').removeAttribute('readonly');
    document.getElementById('modalDosageAM').removeAttribute('readonly');
    document.getElementById('modalDosagePM').removeAttribute('readonly');
    document.getElementById('modalDosageWeekly').removeAttribute('readonly');
    
    document.getElementById('modalStock').classList.add('border-primary');
    document.getElementById('modalRepeats').classList.add('border-primary');
    document.getElementById('modalDosageAM').classList.add('border-primary');
    document.getElementById('modalDosagePM').classList.add('border-primary');
    document.getElementById('modalDosageWeekly').classList.add('border-primary');
    
    document.getElementById('normalModeButtons').style.display = 'none';
    document.getElementById('editModeButtons').style.display = 'block';
}

// Exit edit mode
function exitEditMode() {
    document.getElementById('modalStock').setAttribute('readonly', true);
    document.getElementById('modalRepeats').setAttribute('readonly', true);
    document.getElementById('modalDosageAM').setAttribute('readonly', true);
    document.getElementById('modalDosagePM').setAttribute('readonly', true);
    document.getElementById('modalDosageWeekly').setAttribute('readonly', true);
    
    document.getElementById('modalStock').classList.remove('border-primary');
    document.getElementById('modalRepeats').classList.remove('border-primary');
    document.getElementById('modalDosageAM').classList.remove('border-primary');
    document.getElementById('modalDosagePM').classList.remove('border-primary');
    document.getElementById('modalDosageWeekly').classList.remove('border-primary');
    
    document.getElementById('normalModeButtons').style.display = 'block';
    document.getElementById('editModeButtons').style.display = 'none';
}

// Save edited stock, repeats, and dosages
async function saveStockRepeatsEdit() {
    if (!selectedMedication) return;
    
    const newStock = parseInt(document.getElementById('modalStock').value);
    const newRepeats = parseInt(document.getElementById('modalRepeats').value);
    const newDosageAM = parseFloat(document.getElementById('modalDosageAM').value);
    const newDosagePM = parseFloat(document.getElementById('modalDosagePM').value);
    const newDosageWeekly = parseFloat(document.getElementById('modalDosageWeekly').value);
    
    if (newStock < 0 || newRepeats < 0) {
        await customAlert('Stock and repeats cannot be negative!');
        return;
    }
    
    if (newDosageAM === 0 && newDosagePM === 0 && newDosageWeekly === 0) {
        await customAlert('At least one dosage value must be greater than 0!');
        return;
    }
    
    const proceed = await customConfirm(`Update stock to ${newStock}, repeats to ${newRepeats}, and dosages (AM: ${newDosageAM}, PM: ${newDosagePM}, Weekly: ${newDosageWeekly})?`);
    if (!proceed) return;
    
    try {
        const response = await fetch(`${API_URL}/user-med-chart/${selectedMedication.UsrID}/${selectedMedication.MedIDs}/update-stock-repeats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                stock: newStock,
                repeats: newRepeats,
                dosage_am: newDosageAM,
                dosage_pm: newDosagePM,
                dosage_once_per_week: newDosageWeekly
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('medDetailModal')).hide();
        await loadUserMedications();
        await customAlert('Updated successfully!');
        
    } catch (error) {
        console.error('Error updating:', error);
        await customAlert('Failed to update. Please try again.');
    }
}

// Assign medication to user
async function assignMedicationToUser(medId) {
    if (!currentUserId) {
        await customAlert('Please select a user first');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/medications/${medId}`);
        const med = await response.json();
        
        // Get current user name
        const userSelect = document.getElementById('userSelect');
        const userName = userSelect.options[userSelect.selectedIndex].text;
        
        // Populate modal
        document.getElementById('assignToUserName').textContent = userName;
        document.getElementById('assignMedName').textContent = `${med.MedicationName} (${med.CommonName}) - ${med.MedicationStrength}`;
        document.getElementById('assignMedId').value = medId;
        
        // Reset form
        document.getElementById('assignInitialStock').value = '0';
        document.getElementById('assignRepeats').value = '0';
        document.getElementById('assignDosageAM').value = '0';
        document.getElementById('assignDosagePM').value = '0';
        document.getElementById('assignDosageWeekly').value = '0';
        
        // Show modal
        new bootstrap.Modal(document.getElementById('assignMedicationModal')).show();
        
    } catch (error) {
        console.error('Error loading medication:', error);
        await customAlert(`Error: ${error.message}`);
    }
}

// Confirm assign medication
async function confirmAssignMedication() {
    const medId = parseInt(document.getElementById('assignMedId').value);
    const initialStock = parseInt(document.getElementById('assignInitialStock').value);
    const repeats = parseInt(document.getElementById('assignRepeats').value);
    const dosageAM = parseFloat(document.getElementById('assignDosageAM').value);
    const dosagePM = parseFloat(document.getElementById('assignDosagePM').value);
    const dosageWeekly = parseFloat(document.getElementById('assignDosageWeekly').value);
    
    // Validation
    if (dosageAM === 0 && dosagePM === 0 && dosageWeekly === 0) {
        await customAlert('Please enter at least one dosage value greater than 0');
        return;
    }
    
    try {
        const assignResponse = await fetch(`${API_URL}/user-med-chart/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: parseInt(currentUserId),
                med_id: medId,
                initial_stock: initialStock,
                repeats: repeats,
                dosage_am: dosageAM,
                dosage_pm: dosagePM,
                dosage_once_per_week: dosageWeekly
            })
        });
        
        if (!assignResponse.ok) {
            const error = await assignResponse.json();
            throw new Error(error.description || 'Failed to assign medication');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('assignMedicationModal')).hide();
        await customAlert('Medication assigned successfully!');
        await loadUserMedications();
        
    } catch (error) {
        console.error('Error assigning medication:', error);
        await customAlert(`Error: ${error.message}`);
    }
}


// ==================== SHARE/EXPORT FUNCTIONALITY ====================

// Show share modal
function showShareModal() {
    // Build order summary text
    const activeMedications = currentMedications.filter(m => m.Active !== false && m.calcStockStatus !== 'good');
    
    if (activeMedications.length === 0) {
        customAlert('No medications need to be purchased at this time.');
        return;
    }
    
    let summaryHTML = '<h6>Medications to Purchase:</h6><ul class="list-unstyled">';
    let summaryText = 'Medication Order:\n\n';
    
    activeMedications.forEach(med => {
        const itemText = `${med.MedicationName} (${med.CommonName}) - ${med.MedicationStrength}`;
        summaryHTML += `<li><i class="bi bi-capsule"></i> ${itemText}</li>`;
        summaryText += `• ${itemText}\n`;
    });
    
    summaryHTML += '</ul>';
    summaryText += `\nTotal Items: ${activeMedications.length}`;
    
    document.getElementById('shareOrderSummary').innerHTML = summaryHTML;
    
    // Store summary text for sharing
    window.currentOrderSummary = summaryText;
    
    new bootstrap.Modal(document.getElementById('shareModal')).show();
}

// Share via email
function shareViaEmail() {
    const subject = encodeURIComponent('Medication Order');
    const body = encodeURIComponent(window.currentOrderSummary);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// Share via SMS
function shareViaSMS() {
    const body = encodeURIComponent(window.currentOrderSummary);
    // This works on mobile devices
    window.location.href = `sms:?body=${body}`;
}

// Copy to clipboard
async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(window.currentOrderSummary);
        await customAlert('Order copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy:', error);
        await customAlert('Failed to copy to clipboard. Please try again.');
    }
}

// Generate QR Code
function generateQRCode() {
    const container = document.getElementById('qrCodeContainer');
    const canvas = document.getElementById('qrCodeCanvas');
    
    // Clear previous QR code
    canvas.innerHTML = '';
    
    // Generate new QR code
    const qr = new QRCode(canvas, {
        text: window.currentOrderSummary,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Show container
    container.style.display = 'block';
}


// ==================== CUSTOM ALERT/CONFIRM ====================

// Custom alert function
function customAlert(message) {
    return new Promise((resolve) => {
        document.getElementById('customAlertBody').innerHTML = message;
        document.getElementById('customAlertFooter').innerHTML = `
            <button type="button" class="btn btn-primary" id="customAlertOkBtn">OK</button>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('customAlertModal'));
        modal.show();
        
        document.getElementById('customAlertOkBtn').onclick = () => {
            modal.hide();
            resolve(true);
        };
    });
}

// Custom confirm function
function customConfirm(message) {
    return new Promise((resolve) => {
        document.getElementById('customAlertBody').innerHTML = message;
        document.getElementById('customAlertFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" id="customConfirmCancelBtn">Cancel</button>
            <button type="button" class="btn btn-primary" id="customConfirmOkBtn">OK</button>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('customAlertModal'));
        modal.show();
        
        document.getElementById('customConfirmOkBtn').onclick = () => {
            modal.hide();
            resolve(true);
        };
        
        document.getElementById('customConfirmCancelBtn').onclick = () => {
            modal.hide();
            resolve(false);
        };
    });
}