// Configuration
const API_URL = 'https://darthyoda.pythonanywhere.com';
const USER_ID = 1;
const GOOGLE_CLIENT_ID = '769304845593-ri53r3bcsugr1trjgksgt8rjntevpbid.apps.googleusercontent.com';

// Global state
let currentUser = null;
let editMode = false;
let pendingChanges = {};

// Custom Alert
function showCustomAlert(title, message) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.innerHTML = `
        <div class="custom-alert-box">
            <div class="custom-alert-title">${title}</div>
            <div class="custom-alert-message">${message}</div>
            <button class="custom-alert-button" onclick="this.closest('.custom-alert-overlay').remove()">OK</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Google Sign-In
function handleCredentialResponse(response) {
    const userObject = parseJwt(response.credential);
    currentUser = {
        email: userObject.email,
        name: userObject.name,
        picture: userObject.picture
    };
    
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('mainTabs').style.display = 'flex';
    document.getElementById('userEmail').textContent = currentUser.email;
    
    loadMedications();
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Logout
document.getElementById('logoutButton')?.addEventListener('click', () => {
    google.accounts.id.disableAutoSelect();
    currentUser = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('mainTabs').style.display = 'none';
});

// Tab switching
document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(e.currentTarget.dataset.tab);
    });
});

function switchTab(tabName) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');
    
    if (tabName === 'medications') {
        document.getElementById('medicationsView').style.display = 'block';
        loadMedications();
    } else if (tabName === 'forecast') {
        document.getElementById('forecastView').style.display = 'block';
        loadForecast();
    } else if (tabName === 'timeline') {
        document.getElementById('timelineView').style.display = 'block';
        loadTimeline();
    } else if (tabName === 'manage') {
        document.getElementById('manageView').style.display = 'block';
        loadManageMedications();
    }
}

// Load medications
async function loadMedications() {
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${USER_ID}`);
        const medications = await response.json();
        displayMedications(medications);
    } catch (error) {
        showCustomAlert('Error', 'Failed to load medications');
    }
}

function displayMedications(medications) {
    const container = document.getElementById('medicationsList');
    container.innerHTML = medications.map(med => {
        const daysLeft = Math.floor(med.calcStockDays || 0);
        const repeatsLow = (med.Repeats || 0) <= 1;
        const refillSoon = daysLeft <= 7;
        
        return `
            <div class="card medication-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title mb-1">${med.medication?.Name || 'Unknown'}</h5>
                            <p class="text-muted mb-2">${med.medication?.Strength || ''}</p>
                        </div>
                        <div>
                            ${repeatsLow ? '<span class="badge bg-danger warning-badge">Low Repeats!</span>' : ''}
                            ${refillSoon ? '<span class="badge bg-warning warning-badge">Refill Soon!</span>' : ''}
                        </div>
                    </div>
                    <div class="row g-2 mt-2">
                        <div class="col-6">
                            <small class="text-muted">Stock:</small>
                            <div><strong>${med.Stocktake || 0}</strong> units</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Days Left:</small>
                            <div><strong>${daysLeft}</strong> days</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Repeats:</small>
                            <div><strong>${med.Repeats || 0}</strong> left</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Daily Dose:</small>
                            <div><strong>${med.calcDosageDaily || 0}</strong> units</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Forecast
async function loadForecast() {
    const scenario = document.querySelector('input[name="scenario"]:checked')?.value || 'A';
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${USER_ID}/forecast?scenario=${scenario}`);
        const forecast = await response.json();
        displayForecast(forecast);
    } catch (error) {
        showCustomAlert('Error', 'Failed to load forecast');
    }
}

function displayForecast(forecast) {
    const container = document.getElementById('forecastResults');
    
    let html = `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title">Summary</h5>
                <div class="row g-3">
                    <div class="col-6 text-center">
                        <div class="text-muted small">Next Purchase</div>
                        <div class="h4 mb-0">${forecast.next_purchase_in_days || 0} days</div>
                    </div>
                    <div class="col-6 text-center">
                        <div class="text-muted small">Total Items</div>
                        <div class="h4 mb-0">${forecast.total_items || 0}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    forecast.medications.forEach(med => {
        const needsScript = (med.repeats_remaining || 0) === 0;
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">${med.name}</h5>
                    <div class="row g-2">
                        <div class="col-6">
                            <small class="text-muted">Days Until Purchase:</small>
                            <div><strong>${med.days_until_purchase || 0}</strong> days</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Quantity to Buy:</small>
                            <div><strong>${med.quantity_to_purchase || 0}</strong> units</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Repeats Left:</small>
                            <div><strong>${med.repeats_remaining || 0}</strong></div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Estimated Cost:</small>
                            <div><strong>$${(med.estimated_cost || 0).toFixed(2)}</strong></div>
                        </div>
                    </div>
                    ${needsScript ? '<div class="alert alert-danger mt-2 mb-0"><i class="bi bi-exclamation-triangle"></i> New prescription needed!</div>' : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

document.querySelectorAll('input[name="scenario"]').forEach(radio => {
    radio.addEventListener('change', loadForecast);
});

// Timeline
async function loadTimeline() {
    const months = document.querySelector('input[name="timelineMonths"]:checked')?.value || 6;
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${USER_ID}/timeline?months=${months}`);
        const timeline = await response.json();
        displayTimeline(timeline);
    } catch (error) {
        showCustomAlert('Error', 'Failed to load timeline');
    }
}

function displayTimeline(timeline) {
    document.getElementById('totalPurchases').textContent = timeline.total_purchases || 0;
    document.getElementById('totalScripts').textContent = timeline.total_prescriptions || 0;
    
    const eventsByMonth = {};
    timeline.events.forEach(event => {
        const month = event.month_year;
        if (!eventsByMonth[month]) eventsByMonth[month] = [];
        eventsByMonth[month].push(event);
    });
    
    let html = '';
    Object.keys(eventsByMonth).sort().forEach(month => {
        const events = eventsByMonth[month];
        const purchases = events.filter(e => e.event_type === 'purchase').length;
        const scripts = events.filter(e => e.event_type === 'prescription').length;
        
        html += `
            <div class="month-group">
                <div class="month-header">
                    ${month}
                    <span class="float-end">
                        <span class="badge bg-success">${purchases} purchases</span>
                        ${scripts > 0 ? `<span class="badge bg-danger">${scripts} scripts</span>` : ''}
                    </span>
                </div>
        `;
        
        events.forEach(event => {
            const isScript = event.event_type === 'prescription';
            html += `
                <div class="timeline-event ${isScript ? 'prescription' : 'purchase'}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <i class="bi bi-${isScript ? 'file-medical' : 'cart'} text-${isScript ? 'danger' : 'success'}"></i>
                            <strong>${event.medication_name}</strong>
                        </div>
                        <span class="badge bg-${isScript ? 'danger' : 'success'}">${event.date}</span>
                    </div>
                    <div class="small text-muted">
                        ${isScript ? 
                            '<i class="bi bi-exclamation-triangle"></i> Visit doctor for new prescription' :
                            `Purchase ${event.quantity || 0} units (${event.repeats_after || 0} repeats remaining)`
                        }
                    </div>
                    ${event.estimated_cost ? `<div class="small mt-1">Cost: $${event.estimated_cost.toFixed(2)}</div>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    document.getElementById('timelineEvents').innerHTML = html;
}

document.querySelectorAll('input[name="timelineMonths"]').forEach(radio => {
    radio.addEventListener('change', loadTimeline);
});

// Manage
function loadManageMedications() {
    loadMedications().then(async () => {
        const response = await fetch(`${API_URL}/user-med-chart/user/${USER_ID}`);
        const medications = await response.json();
        displayManageMedications(medications);
    });
}

function displayManageMedications(medications) {
    const container = document.getElementById('manageMedicationsList');
    container.innerHTML = medications.map(med => `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title">${med.medication?.Name || 'Unknown'}</h5>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Stocktake</label>
                        <input type="number" class="form-control" 
                            value="${med.Stocktake || 0}" 
                            data-med-id="${med.UserMedChartID}"
                            data-field="Stocktake"
                            ${!editMode ? 'disabled' : ''}>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Repeats</label>
                        <input type="number" class="form-control" 
                            value="${med.Repeats || 0}"
                            data-med-id="${med.UserMedChartID}"
                            data-field="Repeats"
                            ${!editMode ? 'disabled' : ''}>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Daily Dosage</label>
                        <input type="number" step="0.5" class="form-control" 
                            value="${med.calcDosageDaily || 0}"
                            data-med-id="${med.UserMedChartID}"
                            data-field="calcDosageDaily"
                            ${!editMode ? 'disabled' : ''}>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Date Started</label>
                        <input type="date" class="form-control" 
                            value="${med.DateStarted ? med.DateStarted.split('T')[0] : ''}"
                            data-med-id="${med.UserMedChartID}"
                            data-field="DateStarted"
                            ${!editMode ? 'disabled' : ''}>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    if (editMode) {
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', e => {
                const medId = e.target.dataset.medId;
                const field = e.target.dataset.field;
                if (!pendingChanges[medId]) pendingChanges[medId] = {};
                pendingChanges[medId][field] = e.target.value;
            });
        });
    }
}

document.getElementById('toggleEditMode')?.addEventListener('click', () => {
    editMode = !editMode;
    pendingChanges = {};
    
    document.getElementById('toggleEditMode').style.display = editMode ? 'none' : 'inline-block';
    document.getElementById('saveChanges').style.display = editMode ? 'inline-block' : 'none';
    document.getElementById('editModeAlert').style.display = editMode ? 'block' : 'none';
    
    loadManageMedications();
});

document.getElementById('saveChanges')?.addEventListener('click', async () => {
    try {
        await Promise.all(Object.entries(pendingChanges).map(([medId, changes]) => {
            return fetch(`${API_URL}/user-med-chart/${medId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes)
            });
        }));
        
        showCustomAlert('Success', 'Changes saved successfully!');
        editMode = false;
        pendingChanges = {};
        document.getElementById('toggleEditMode').click();
        loadMedications();
        loadManageMedications();
    } catch (error) {
        showCustomAlert('Error', 'Failed to save changes');
    }
});

document.getElementById('refreshButton')?.addEventListener('click', loadMedications);

// Initialize
window.onload = function() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById('buttonDiv'),
        { theme: 'outline', size: 'large' }
    );
    google.accounts.id.prompt();
};