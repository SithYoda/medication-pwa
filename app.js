// Configuration
let API_URL = 'https://darthyoda.pythonanywhere.com';
let currentUserId = null;
let currentUser = null;
let currentMedications = [];
let selectedMedication = null;

// Initialize app - skip login, go straight to main app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
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
        
        document.getElementById('summarySection').style.display = 'flex';
        document.getElementById('mainTabs').style.display = 'block';
        document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
        document.getElementById('medicationsSection').style.display = 'block';
        
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
        
        // Update local data
        selectedMedication.Stocktake = updateData.Stocktake;
        selectedMedication.DosageAM = updateData.DosageAM;
        selectedMedication.DosagePM = updateData.DosagePM;
        selectedMedication.DosageOncePerWeek = updateData.DosageOncePerWeek;
        selectedMedication.Repeats = updateData.Repeats;
        selectedMedication.ReorderLevel = updateData.ReorderLevel;
        
        // Update in currentMedications array
        const index = currentMedications.findIndex(m => m.MedIDs === selectedMedication.MedIDs);
        if (index !== -1) {
            currentMedications[index] = selectedMedication;
        }
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('medicationModal')).hide();
        
        // Refresh display
        displayMedications();
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
