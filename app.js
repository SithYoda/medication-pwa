// Configuration
let API_URL = 'https://darthyoda.pythonanywhere.com';
let currentUserId = null;
let currentUser = null;
let currentMedications = [];
let selectedMedication = null;

// Initialize app - skip login, go straight to main app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializePayDate();
    showMainApp();
});

function setupEventListeners() {
    if (document.getElementById('loadUserBtn')) {
        document.getElementById('loadUserBtn').addEventListener('click', loadUserMedications);
    }
    if (document.getElementById('settingsBtn')) {
        document.getElementById('settingsBtn').addEventListener('click', () => {
            new bootstrap.Modal(document.getElementById('settingsModal')).show();
        });
    }
    if (document.getElementById('saveSettingsBtn')) {
        document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    }
}

// Show main app
function showMainApp() {
    document.getElementById('userSelection').style.display = 'block';
    if (document.getElementById('currentUserName')) {
        document.getElementById('currentUserName').style.display = 'inline-block';
        document.getElementById('currentUserName').textContent = 'User';
    }
    loadUsers();
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        const users = await response.json();
        
        const userSelect = document.getElementById('userSelect');
        userSelect.innerHTML = '<option value="">Select a user...</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.UsrID;
            option.textContent = user.Users;
            userSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load user medications
async function loadUserMedications() {
    const userSelect = document.getElementById('userSelect');
    const userId = userSelect.value;

    if (!userId) {
        alert('Please select a user');
        return;
    }

    currentUserId = userId;

    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${userId}/summary`);
        const data = await response.json();
        
        currentMedications = data.medications;
        displayMedications();
        loadMedicationsList();
        
        document.getElementById('summarySection').style.display = 'flex';
        document.getElementById('mainTabs').style.display = 'block';
        document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
        document.getElementById('forecastSection').style.display = 'block';
        
        // Update summary
        document.getElementById('totalMeds').textContent = data.medications.length;
        document.getElementById('lowStockMeds').textContent = data.medications.filter(m => m.StockStatus === 'low').length;
        document.getElementById('criticalMeds').textContent = data.medications.filter(m => m.StockStatus === 'critical').length;
        
    } catch (error) {
        console.error('Error loading medications:', error);
        alert('Error loading medications');
    }
}

// Display medications
function displayMedications() {
    const tbody = document.getElementById('medicationsTable')?.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    currentMedications.forEach(med => {
        const row = tbody.insertRow();
        row.style.cursor = 'pointer';
        
        // Determine stock status color and text
        let stockStatusBadge = 'bg-success';
        let stockStatusText = 'Good';
        
        if (med.StockStatus === 'critical') {
            stockStatusBadge = 'bg-danger';
            stockStatusText = 'Low';
        } else if (med.StockStatus === 'low') {
            stockStatusBadge = 'bg-warning text-dark';
            stockStatusText = 'Medium';
        }
        
        // Determine repeats status color and text
        let repeatsStatusBadge = 'bg-success';
        let repeatsStatusText = 'Good';
        
        if (med.Repeats === 0) {
            repeatsStatusBadge = 'bg-danger';
            repeatsStatusText = 'None';
        } else if (med.Repeats <= 2) {
            repeatsStatusBadge = 'bg-warning text-dark';
            repeatsStatusText = 'Low';
        }
        
        row.innerHTML = `
            <td>${med.MedicationName}</td>
            <td>${med.CommonName}</td>
            <td>${med.MedicationStrength}</td>
            <td>${med.Stocktake}</td>
            <td>${med.DaysRemaining || 'N/A'}</td>
            <td><span class="badge ${stockStatusBadge}">${stockStatusText}</span></td>
            <td><span class="badge ${repeatsStatusBadge}">${repeatsStatusText}</span></td>
        `;
        row.addEventListener('click', () => openMedicationModal(med));
    });
}

// Open medication edit modal
function openMedicationModal(med) {
    selectedMedication = med;
    
    document.getElementById('medModalTitle').textContent = med.MedicationName;
    document.getElementById('medName').value = med.MedicationName;
    document.getElementById('medCommonName').value = med.CommonName;
    document.getElementById('medStrength').value = med.MedicationStrength;
    document.getElementById('medStocktake').value = med.Stocktake || 0;
    document.getElementById('medDosageAM').value = med.DosageAM || 0;
    document.getElementById('medDosagePM').value = med.DosagePM || 0;
    document.getElementById('medDosageWeekly').value = med.DosageOncePerWeek || 0;
    document.getElementById('medRepeats').value = med.Repeats || 0;
    document.getElementById('medReorderLevel').value = med.ReorderLevel || 0;
    
    new bootstrap.Modal(document.getElementById('medicationModal')).show();
}

// Save medication changes
async function saveMedicationChanges() {
    if (!selectedMedication || !currentUserId) return;
    
    try {
        const updateData = {
            Stocktake: parseInt(document.getElementById('medStocktake').value) || 0,
            DosageAM: parseInt(document.getElementById('medDosageAM').value) || 0,
            DosagePM: parseInt(document.getElementById('medDosagePM').value) || 0,
            DosageOncePerWeek: parseInt(document.getElementById('medDosageWeekly').value) || 0,
            Repeats: parseInt(document.getElementById('medRepeats').value) || 0,
            ReorderLevel: parseInt(document.getElementById('medReorderLevel').value) || 0
        };
        
        const response = await fetch(`${API_URL}/user-med-chart/user/${currentUserId}/medication/${selectedMedication.MedIDs}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save medication changes');
        }
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('medicationModal')).hide();
        
        // Refresh medications from server
        await loadUserMedications();
        
        alert('Medication updated successfully');
        
    } catch (error) {
        console.error('Error saving medication:', error);
        alert('Error saving medication: ' + error.message);
    }
}

function saveSettings() {
    const apiUrl = document.getElementById('apiUrlInput')?.value;
    if (apiUrl) {
        API_URL = apiUrl;
        localStorage.setItem('apiUrl', apiUrl);
        alert('Settings saved');
    }
}

// Load medications master list
async function loadMedicationsList() {
    try {
        const response = await fetch(`${API_URL}/medications?include_inactive=true`);
        const medications = await response.json();
        displayMedicationsList(medications);
    } catch (error) {
        console.error('Error loading medications list:', error);
    }
}

// Display medications master list
function displayMedicationsList(medications) {
    const tbody = document.getElementById('medicationsListTable')?.getElementsByTagName('tbody')[0];
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    medications.forEach(med => {
        const row = tbody.insertRow();
        // Only show badge if archived, otherwise blank
        const statusBadge = med.Active === 0 ? '<span class="badge bg-danger">Archived</span>' : '';
        
        row.innerHTML = `
            <td>${med.MedicationName}</td>
            <td>${med.CommonName}</td>
            <td>${med.MedicationStrength}</td>
            <td>${med.QtyRepeat}</td>
            <td>$${(med.Price || 0).toFixed(2)}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editMedicationMaster(${med.MedIDs}, ${JSON.stringify(med).replace(/"/g, '&quot;')})" style="width: 40px;" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-${med.Active === 1 ? 'warning' : 'success'}" onclick="toggleMedicationActive(${med.MedIDs}, '${med.MedicationName}')" style="width: 40px;" title="${med.Active === 1 ? 'Archive' : 'Restore'}">
                    <i class="bi bi-${med.Active === 1 ? 'archive' : 'arrow-counterclockwise'}"></i>
                </button>
            </td>
        `;
    });
}

// Save new medication
async function saveNewMedication() {
    const name = document.getElementById('addMedName').value;
    const commonName = document.getElementById('addMedCommonName').value;
    const strength = document.getElementById('addMedStrength').value;
    const qtyRepeat = parseInt(document.getElementById('addMedQtyRepeat').value);
    const price = parseFloat(document.getElementById('addMedPrice').value) || 0;
    
    if (!name || !commonName || !strength || !qtyRepeat) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/medications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                MedicationName: name,
                CommonName: commonName,
                MedicationStrength: strength,
                QtyRepeat: qtyRepeat,
                Price: price
            })
        });
        
        if (!response.ok) throw new Error('Failed to save medication');
        
        // Clear form
        document.getElementById('addMedName').value = '';
        document.getElementById('addMedCommonName').value = '';
        document.getElementById('addMedStrength').value = '';
        document.getElementById('addMedQtyRepeat').value = '';
        document.getElementById('addMedPrice').value = '';
        
        bootstrap.Modal.getInstance(document.getElementById('addMedicationModal')).hide();
        loadMedicationsList();
        alert('Medication added successfully');
        
    } catch (error) {
        console.error('Error saving medication:', error);
        alert('Error saving medication: ' + error.message);
    }
}

// Edit medication master
function editMedicationMaster(medId, med) {
    document.getElementById('editMedId').value = medId;
    document.getElementById('editMedName').value = med.MedicationName;
    document.getElementById('editMedCommonName').value = med.CommonName;
    document.getElementById('editMedStrength').value = med.MedicationStrength;
    document.getElementById('editMedQtyRepeat').value = med.QtyRepeat;
    document.getElementById('editMedPrice').value = med.Price || 0;
    
    new bootstrap.Modal(document.getElementById('editMedicationModal')).show();
}

// Save edited medication
async function saveEditedMedication() {
    const medId = document.getElementById('editMedId').value;
    const name = document.getElementById('editMedName').value;
    const commonName = document.getElementById('editMedCommonName').value;
    const strength = document.getElementById('editMedStrength').value;
    const qtyRepeat = parseInt(document.getElementById('editMedQtyRepeat').value);
    const price = parseFloat(document.getElementById('editMedPrice').value) || 0;
    
    if (!name || !commonName || !strength || !qtyRepeat) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/medications/${medId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                MedicationName: name,
                CommonName: commonName,
                MedicationStrength: strength,
                QtyRepeat: qtyRepeat,
                Price: price
            })
        });
        
        if (!response.ok) throw new Error('Failed to save medication');
        
        bootstrap.Modal.getInstance(document.getElementById('editMedicationModal')).hide();
        loadMedicationsList();
        alert('Medication updated successfully');
        
    } catch (error) {
        console.error('Error saving medication:', error);
        alert('Error saving medication: ' + error.message);
    }
}

// Toggle medication active status
async function toggleMedicationActive(medId, medName) {
    try {
        const response = await fetch(`${API_URL}/medications/${medId}/toggle-active`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to toggle medication');
        
        loadMedicationsList();
        alert(`${medName} has been archived/restored`);
        
    } catch (error) {
        console.error('Error toggling medication:', error);
        alert('Error: ' + error.message);
    }
}

function showTab(tabName) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(tabName).style.display = 'block';
    
    // Update active tab
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');
}

// Initialize next pay date to 15th of next month
function initializePayDate() {
    const today = new Date();
    let nextPay = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    document.getElementById('nextPayDate').value = nextPay.toISOString().split('T')[0];
}

// Generate forecast
async function generateForecast() {
    if (!currentUserId) {
        alert('Please load a user first');
        return;
    }
    
    console.log('=== FORECAST DEBUG ===');
    console.log('Total medications:', currentMedications.length);
    
    // Log first medication to see structure
    if (currentMedications.length > 0) {
        console.log('First medication:', currentMedications[0]);
        console.log('calcRunOutDate field:', currentMedications[0].calcRunOutDate);
    }
    
    const payFrequency = parseInt(document.getElementById('payFrequency').value);
    const nextPayDate = new Date(document.getElementById('nextPayDate').value);
    const forecastMonths = parseInt(document.getElementById('forecastPeriod').value);
    
    if (!nextPayDate || isNaN(nextPayDate.getTime())) {
        alert('Please select a valid next pay date');
        return;
    }
    
    try {
        // Calculate pay periods
        const payPeriods = [];
        let currentDate = new Date(nextPayDate);
        
        // Calculate number of periods
        const numPeriods = Math.ceil((forecastMonths * 30) / payFrequency);
        
        console.log('Forecast months:', forecastMonths, 'Pay frequency days:', payFrequency, 'Num periods:', numPeriods);
        
        for (let i = 0; i < numPeriods; i++) {
            const periodStart = new Date(currentDate);
            const periodEnd = new Date(currentDate);
            periodEnd.setDate(periodEnd.getDate() + payFrequency);
            
            payPeriods.push({
                start: periodStart,
                end: periodEnd,
                medications: []
            });
            
            console.log(`Period ${i}: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`);
            
            currentDate = new Date(periodEnd);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Get medications that need to be purchased in each period
        console.log('Starting medication matching...');
        let matchedCount = 0;
        
        for (const period of payPeriods) {
            const medicationsInPeriod = [];
            
            for (const med of currentMedications) {
                console.log(`Checking: ${med.MedicationName}`);
                console.log('  - calcRunOutDate:', med.calcRunOutDate);
                console.log('  - Price:', med.Price);
                console.log('  - PurchaseQuantity:', med.PurchaseQuantity);
                
                // Check if medication has a run-out date
                if (med.calcRunOutDate) {
                    const runOutDate = new Date(med.calcRunOutDate);
                    
                    console.log(`  - RunOut: ${runOutDate.toLocaleDateString()}, Period: ${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`);
                    
                    // If run out date falls within this pay period
                    if (runOutDate >= period.start && runOutDate <= period.end) {
                        medicationsInPeriod.push({
                            name: med.MedicationName,
                            commonName: med.CommonName,
                            quantity: 1,  // Each purchase is 1 repeat
                            price: med.Price || 0,
                            runOutDate: med.calcRunOutDate
                        });
                        
                        matchedCount++;
                        console.log(`  -> MATCHED for period!`);
                    }
                } else {
                    console.log('  - NO calcRunOutDate field');
                }
            }
            
            period.medications = medicationsInPeriod;
        }
        
        console.log('Total matched medications:', matchedCount);
        console.log('Pay periods:', payPeriods);
        
        // Display forecast
        displayForecast(payPeriods);
        
    } catch (error) {
        console.error('Error generating forecast:', error);
        alert('Error generating forecast: ' + error.message);
    }
}

// Display forecast results
function displayForecast(payPeriods) {
    const forecastContent = document.getElementById('forecastContent');
    let html = '';
    let totalCost = 0;
    let totalMeds = 0;
    
    payPeriods.forEach((period, index) => {
        const periodCost = period.medications.reduce((sum, med) => sum + (med.price * med.quantity), 0);
        totalCost += periodCost;
        totalMeds += period.medications.length;
        
        const startDate = period.start.toLocaleDateString();
        const endDate = period.end.toLocaleDateString();
        
        html += `
            <div class="card mb-3">
                <div class="card-header bg-light">
                    <h6 class="mb-0">Period ${index + 1}: ${startDate} - ${endDate}</h6>
                </div>
                <div class="card-body">
                    ${period.medications.length === 0 ? 
                        '<p class="text-muted">No medications to purchase</p>' :
                        `<table class="table table-sm mb-0">
                            <thead>
                                <tr>
                                    <th>Medication</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th class="text-end">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${period.medications.map(med => `
                                    <tr>
                                        <td>${med.name}</td>
                                        <td>${med.quantity}</td>
                                        <td>$${(med.price).toFixed(2)}</td>
                                        <td class="text-end">$${(med.price * med.quantity).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="table-active">
                                    <th colspan="3">Period Total:</th>
                                    <th class="text-end">$${periodCost.toFixed(2)}</th>
                                </tr>
                            </tfoot>
                        </table>`
                    }
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="card bg-primary text-white">
            <div class="card-body">
                <h6>Total Medications: ${totalMeds}</h6>
                <h5 class="mb-0">Grand Total: $${totalCost.toFixed(2)}</h5>
            </div>
        </div>
    `;
    
    forecastContent.innerHTML = html;
    document.getElementById('forecastResults').style.display = 'block';
}
