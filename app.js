// Configuration
const API_URL = 'https://darthyoda.pythonanywhere.com';
const USER_ID = 1; // Your user ID

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = '769304845593-ri53r3bcsugr1trjgksgt8rjntevpbid.apps.googleusercontent.com';

// Global state
let currentUser = null;
let medications = [];
let editMode = false;
let pendingChanges = {};

// Custom Alert Function
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

// Initialize Google Sign-In (waits for library to load)
function initGoogleSignIn() {
    console.log('initGoogleSignIn called');
    
    // Check if Google Sign-In library is loaded
    if (typeof google !== 'undefined' && google.accounts) {
        console.log('Google Sign-In library loaded successfully');
        console.log('Client ID:', GOOGLE_CLIENT_ID);
        
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleSignIn,
                auto_select: false
            });
            
            // Render the Google Sign-In button
            google.accounts.id.renderButton(
                document.getElementById('googleSignInButton'),
                { 
                    theme: 'outline', 
                    size: 'large',
                    text: 'signin_with',
                    width: 250
                }
            );
            
            console.log('Google Sign-In initialized and button rendered');
        } catch (error) {
            console.error('Error initializing Google Sign-In:', error);
            showCustomAlert('Error', 'Failed to initialize Google Sign-In: ' + error.message);
        }
    } else {
        // Wait a bit and try again if library isn't loaded yet
        console.log('Waiting for Google Sign-In library to load...');
        setTimeout(initGoogleSignIn, 100);
    }
}

// Handle Google Sign-In
function handleGoogleSignIn(response) {
    console.log('Google Sign-In response received');
    
    try {
        // Decode the JWT token to get user info
        const userInfo = parseJwt(response.credential);
        console.log('User signed in:', userInfo.email);
        
        currentUser = {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
        };
        
        // Show main content
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('userEmail').textContent = currentUser.email;
        
        // Load initial data
        loadMedications();
    } catch (error) {
        console.error('Error handling sign-in:', error);
        showCustomAlert('Error', 'Failed to process sign-in: ' + error.message);
    }
}

// Parse JWT token
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Logout Button
document.getElementById('logoutButton')?.addEventListener('click', () => {
    currentUser = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    google.accounts.id.disableAutoSelect();
});

// Tab Navigation
document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = e.currentTarget.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Show corresponding content
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    switch(tabName) {
        case 'medications':
            document.getElementById('medicationsView').style.display = 'block';
            loadMedications();
            break;
        case 'forecast':
            document.getElementById('forecastView').style.display = 'block';
            loadForecast();
            break;
        case 'timeline':
            document.getElementById('timelineView').style.display = 'block';
            loadTimeline();
            break;
        case 'manage':
            document.getElementById('manageView').style.display = 'block';
            loadManageMedications();
            break;
    }
}

// Load Medications
async function loadMedications() {
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${USER_ID}`);
        if (!response.ok) throw new Error('Failed to load medications');
        
        medications = await response.json();
        displayMedications(medications);
    } catch (error) {
        console.error('Error loading medications:', error);
        showCustomAlert('Error', 'Failed to load medications. Please try again.');
    }
}

// Display Medications
function displayMedications(meds) {
    const container = document.getElementById('medicationsList');
    if (!meds || meds.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No medications found.</div>';
        return;
    }
    
    container.innerHTML = meds.map(med => {
        const daysUntilRefill = Math.floor(med.calcStockDays || 0);
        const repeatsWarning = (med.Repeats || 0) <= 1;
        const refillWarning = daysUntilRefill <= 7;
        
        return `
            <div class="card medication-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title mb-1">${med.medication?.Name || 'Unknown'}</h5>
                            <p class="text-muted mb-2">${med.medication?.Strength || ''}</p>
                        </div>
                        <div class="text-end">
                            ${repeatsWarning ? '<span class="badge bg-danger warning-badge">Low Repeats!</span>' : ''}
                            ${refillWarning ? '<span class="badge bg-warning warning-badge">Refill Soon!</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="row g-2 mt-2">
                        <div class="col-6">
                            <small class="text-muted">Stock:</small>
                            <div><strong>${med.Stocktake || 0}</strong> units</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Days Left:</small>
                            <div><strong>${daysUntilRefill}</strong> days</div>
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

// Load Forecast
async function loadForecast() {
    const scenario = document.querySelector('input[name="scenario"]:checked')?.value || 'A';
    
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${USER_ID}/forecast?scenario=${scenario}`);
        if (!response.ok) throw new Error('Failed to load forecast');
        
        const forecast = await response.json();
        displayForecast(forecast);
    } catch (error) {
        console.error('Error loading forecast:', error);
        showCustomAlert('Error', 'Failed to load forecast. Please try again.');
    }
}

// Display Forecast
function displayForecast(forecast) {
    const container = document.getElementById('forecastResults');
    
    if (!forecast || !forecast.medications || forecast.medications.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No forecast data available.</div>';
        return;
    }
    
    // Summary Card
    let html = `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title">Summary</h5>
                <div class="row g-3">
                    <div class="col-6">
                        <div class="text-center">
                            <div class="text-muted small">Next Purchase</div>
                            <div class="h4 mb-0">${forecast.next_purchase_in_days || 0} days</div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="text-center">
                            <div class="text-muted small">Total Items</div>
                            <div class="h4 mb-0">${forecast.total_items || 0}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Medications
    html += forecast.medications.map(med => {
        const needsScript = (med.repeats_remaining || 0) === 0;
        
        return `
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
                    ${needsScript ? '<div class="alert alert-danger mt-2 mb-0"><i class="bi bi-exclamation-triangle"></i> New prescription needed from doctor!</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Scenario Change Listener
document.querySelectorAll('input[name="scenario"]').forEach(radio => {
    radio.addEventListener('change', loadForecast);
});

// Load Timeline
async function loadTimeline() {
    const months = document.querySelector('input[name="timelineMonths"]:checked')?.value || 6;
    
    try {
        const response = await fetch(`${API_URL}/user-med-chart/user/${USER_ID}/timeline?months=${months}`);
        if (!response.ok) throw new Error('Failed to load timeline');
        
        const timeline = await response.json();
        displayTimeline(timeline);
    } catch (error) {
        console.error('Error loading timeline:', error);
        showCustomAlert('Error', 'Failed to load timeline. Please check the console for details.');
    }
}

// Display Timeline
function displayTimeline(timeline) {
    if (!timeline || !timeline.events || timeline.events.length === 0) {
        document.getElementById('timelineEvents').innerHTML = 
            '<div class="alert alert-info">No timeline events found.</div>';
        document.getElementById('totalPurchases').textContent = '0';
        document.getElementById('totalScripts').textContent = '0';
        return;
    }
    
    // Update summary
    document.getElementById('totalPurchases').textContent = timeline.total_purchases || 0;
    document.getElementById('totalScripts').textContent = timeline.total_prescriptions || 0;
    
    // Group events by month
    const eventsByMonth = {};
    timeline.events.forEach(event => {
        const month = event.month_year;
        if (!eventsByMonth[month]) {
            eventsByMonth[month] = [];
        }
        eventsByMonth[month].push(event);
    });
    
    // Display events
    let html = '';
    Object.keys(eventsByMonth).sort().forEach(month => {
        const events = eventsByMonth[month];
        const monthPurchases = events.filter(e => e.event_type === 'purchase').length;
        const monthScripts = events.filter(e => e.event_type === 'prescription').length;
        
        html += `
            <div class="month-group">
                <div class="month-header">
                    ${month}
                    <span class="float-end">
                        <span class="badge bg-success">${monthPurchases} purchases</span>
                        ${monthScripts > 0 ? `<span class="badge bg-danger">${monthScripts} scripts</span>` : ''}
                    </span>
                </div>
        `;
        
        events.forEach(event => {
            const isScript = event.event_type === 'prescription';
            const eventClass = isScript ? 'prescription' : 'purchase';
            const icon = isScript ? 'file-medical' : 'cart';
            const color = isScript ? 'danger' : 'success';
            
            html += `
                <div class="timeline-event ${eventClass}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <i class="bi bi-${icon} text-${color}"></i>
                            <strong>${event.medication_name}</strong>
                        </div>
                        <span class="badge bg-${color}">${event.date}</span>
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

// Timeline Month Change Listener
document.querySelectorAll('input[name="timelineMonths"]').forEach(radio => {
    radio.addEventListener('change', loadTimeline);
});

// Manage Medications
function loadManageMedications() {
    const container = document.getElementById('manageMedicationsList');
    
    if (!medications || medications.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No medications to manage.</div>';
        return;
    }
    
    container.innerHTML = medications.map(med => `
        <div class="card mb-3 ${editMode ? 'border-warning' : ''}">
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
    
    // Add change listeners if in edit mode
    if (editMode) {
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', handleFieldChange);
        });
    }
}

// Toggle Edit Mode
document.getElementById('toggleEditMode')?.addEventListener('click', () => {
    editMode = !editMode;
    pendingChanges = {};
    
    if (editMode) {
        document.getElementById('toggleEditMode').style.display = 'none';
        document.getElementById('saveChanges').style.display = 'inline-block';
        document.getElementById('editModeAlert').style.display = 'block';
        document.getElementById('manageView').classList.add('edit-mode');
    } else {
        document.getElementById('toggleEditMode').style.display = 'inline-block';
        document.getElementById('saveChanges').style.display = 'none';
        document.getElementById('editModeAlert').style.display = 'none';
        document.getElementById('manageView').classList.remove('edit-mode');
    }
    
    loadManageMedications();
});

// Handle Field Change
function handleFieldChange(e) {
    const medId = e.target.dataset.medId;
    const field = e.target.dataset.field;
    const value = e.target.value;
    
    if (!pendingChanges[medId]) {
        pendingChanges[medId] = {};
    }
    pendingChanges[medId][field] = value;
}

// Save Changes
document.getElementById('saveChanges')?.addEventListener('click', async () => {
    try {
        const updates = Object.entries(pendingChanges).map(([medId, changes]) => {
            return fetch(`${API_URL}/user-med-chart/${medId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(changes)
            });
        });
        
        await Promise.all(updates);
        showCustomAlert('Success', 'Changes saved successfully!');
        
        // Exit edit mode and reload
        editMode = false;
        pendingChanges = {};
        document.getElementById('toggleEditMode').click();
        await loadMedications();
        loadManageMedications();
    } catch (error) {
        console.error('Error saving changes:', error);
        showCustomAlert('Error', 'Failed to save changes. Please try again.');
    }
});

// Refresh Button
document.getElementById('refreshButton')?.addEventListener('click', loadMedications);

// Note: initGoogleSignIn() is now called by the onload callback in index.html
// when the Google Sign-In library finishes loading
