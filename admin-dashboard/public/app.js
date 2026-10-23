// Co-Nest Admin Dashboard - Full JavaScript Functionality
const API_BASE = '/api/admin';

// State
let authToken = localStorage.getItem('admin_token');
let adminUser = null;

let localUsers = [];
let localProperties = [];
let localTitles = [];
const defaultMockUsers = [
  { id: 1, fullName: 'System Administrator', email: 'admin@conest.com', role: { name: 'ADMIN' }, status: 'ACTIVE', cniNumber: '' },
  { id: 2, fullName: 'Jean Pierre', email: 'agent@conest.com', role: { name: 'AGENT' }, status: 'ACTIVE', agentProfile: { isVerified: true, kycDetails: { idNumber: 'AB112233445', status: 'ACTIVE' } } },
  { id: 3, fullName: 'Elie Kamga', email: 'buyer@conest.com', role: { name: 'BUYER' }, status: 'ACTIVE', cniNumber: '' }
];

function getSavedUsers() {
    const saved = localStorage.getItem('dashboard_users');
    if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultMockUsers;
}

function saveUsersToLocal(usersList) {
    localStorage.setItem('dashboard_users', JSON.stringify(usersList));
}

const defaultMockProperties = [
  { id: 1, title: 'Prime Plot of Land near Logpom Junction', price: 25000000, city: 'Douala', neighborhood: 'Logpom', address: 'Logpom Rd', status: 'Active', propertyType: 'LAND', description: 'Dry plot of land' },
  { id: 2, title: 'Modern Student Studio in Molyko', price: 65000, city: 'Buea', neighborhood: 'Molyko', address: 'Molyko street', status: 'Active', propertyType: 'STUDIO', description: 'Tiled studio' }
];

function getSavedProperties() {
    const saved = localStorage.getItem('dashboard_properties');
    if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultMockProperties;
}

function savePropertiesToLocal(propertiesList) {
    localStorage.setItem('dashboard_properties', JSON.stringify(propertiesList));
}

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminDisplayName = document.getElementById('admin-display-name');

// Tab navigation
const menuItems = document.querySelectorAll('.menu-item');
const tabPanes = document.querySelectorAll('.tab-pane');

// Metrics
const metricUsers = document.getElementById('metric-users');
const metricAgents = document.getElementById('metric-agents');
const metricListings = document.getElementById('metric-listings');
const metricRevenue = document.getElementById('metric-revenue');
const metricPendingKyc = document.getElementById('metric-pending-kyc');

// Tables
const kycTableBody = document.getElementById('kyc-requests-table');
const usersTableBody = document.getElementById('users-table');
const paymentsTableBody = document.getElementById('payments-table');

// Registry Form
const registryForm = document.getElementById('registry-form');
const registrySuccess = document.getElementById('registry-success');
const registryError = document.getElementById('registry-error');
const statusDisputed = document.getElementById('status-disputed');
const caveatDetailsGroup = document.getElementById('caveat-details-group');

// ========== UTILITY FUNCTIONS ==========

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function hideError(element) {
    element.style.display = 'none';
}

function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-US');
}

function getStatusBadge(status) {
    const map = {
        'verified': '<span class="badge badge-verified">✅ Verified</span>',
        'unverified': '<span class="badge badge-unverified">⚠️ Unverified</span>',
        'pending': '<span class="badge badge-pending">⏳ Pending</span>',
        'Pending': '<span class="badge badge-pending">⏳ Pending</span>',
        'Approved': '<span class="badge badge-verified">✅ Approved</span>',
        'Rejected': '<span class="badge badge-unverified">❌ Rejected</span>',
        'Active': '<span class="badge badge-verified">🟢 Active</span>',
        'Disputed': '<span class="badge badge-unverified">🔴 Disputed</span>'
    };
    return map[status] || `<span class="badge badge-role">${status}</span>`;
}

// CNI formatting utility: Enforces AB12345678 format (2 letters + 8 digits)
function formatCniRef(cni) {
    if (!cni) return '—';
    const clean = cni.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length === 0) return '—';
    const digits = clean.replace(/[^0-9]/g, '');
    const prefix = clean.replace(/[^A-Z]/g, '').slice(0, 2) || 'AB';
    const alignedDigits = (digits + '12345678').slice(0, 8);
    return `${prefix.length < 2 ? 'AB' : prefix}${alignedDigits}`;
}

// ========== API HELPER ==========

async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        localStorage.removeItem('admin_token');
        authToken = null;
        window.location.reload();
        throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

// ========== AUTHENTICATION ==========

if (authToken) {
    showDashboard();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(loginError);

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Authenticating...';

    try {
        const data = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        authToken = data.token;
        adminUser = data.user;
        localStorage.setItem('admin_token', authToken);

        showDashboard();
    } catch (error) {
        showError(loginError, error.message || 'Invalid credentials. Try admin@conest.com / admin123');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Secure Login';
    }
});

logoutBtn.addEventListener('click', () => {
    authToken = null;
    adminUser = null;
    localStorage.removeItem('admin_token');
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
});

// ========== DASHBOARD ==========

function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    adminDisplayName.textContent = adminUser?.fullName || 'Admin User';

    // Load all dashboard data
    loadAnalytics();
    loadKycRequests();
    loadUsers();
    loadProperties();
    loadPayments();
    loadRegistry();
    loadChats();
    loadMessages();
    loadReports();
}

// ========== TAB NAVIGATION ==========

menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        menuItems.forEach(m => m.classList.remove('active'));
        item.classList.add('active');

        const tabId = item.dataset.tab;
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');

        if (tabId === 'tab-payments') {
            loadPayments();
        } else if (tabId === 'tab-properties') {
            loadProperties();
        } else if (tabId === 'tab-chats') {
            loadChats();
            loadMessages();
            loadReports();
        } else if (tabId === 'tab-users') {
            loadUsers();
        }
    });
});

// ========== ANALYTICS ==========

async function loadAnalytics() {
    try {
        const data = await apiRequest('/analytics');
        metricUsers.textContent = data.totalUsers || 0;
        metricAgents.textContent = data.verifiedAgents || 0;
        metricListings.textContent = data.totalListings || 0;
        metricRevenue.textContent = formatCurrency(data.totalRevenue || 0);
        metricPendingKyc.textContent = data.pendingKyc || 0;
    } catch (error) {
        metricUsers.textContent = '14';
        metricAgents.textContent = '3';
        metricListings.textContent = '8';
        metricRevenue.textContent = formatCurrency(45000);
        metricPendingKyc.textContent = '1';
    }
}

// ========== KYC REQUESTS ==========

async function loadKycRequests() {
    try {
        const requests = await apiRequest('/kyc/pending');

        if (requests.length === 0) {
            kycTableBody.innerHTML = `<tr><td colspan="6" class="text-center">No KYC verification requests.</td></tr>`;
            return;
        }

        kycTableBody.innerHTML = requests.map(req => {
            const isPending = req.status === 'PENDING' || req.status === 'Pending';
            const actionButtons = isPending ? `
              <div class="action-buttons-group">
                <button class="btn btn-sm" style="background-color: #2563eb;" onclick="handleKycDecision(${req.id}, 'Approved')">✅ Approve</button>
                <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handleKycDecision(${req.id}, 'Rejected')">❌ Reject</button>
              </div>
            ` : `<span style="font-weight: bold; color: ${req.status === 'ACTIVE' || req.status === 'Approved' ? '#2563eb' : '#ef4444'}">${req.status === 'ACTIVE' || req.status === 'Approved' ? 'Approved' : 'Rejected'}</span>`;

            return `
              <tr>
                <td><strong>${req.agent?.user?.fullName || 'Unknown'}</strong></td>
                <td>${req.agent?.user?.email || 'N/A'}</td>
                <td><code>${formatCniRef(req.idNumber)}</code></td>
                <td>${getStatusBadge(req.agent?.user?.role?.name || 'AGENT')}</td>
                <td>${getStatusBadge(req.status === 'ACTIVE' ? 'verified' : req.status === 'REJECTED' ? 'Rejected' : 'Pending')}</td>
                <td>${actionButtons}</td>
              </tr>
            `;
        }).join('');
    } catch (error) {
        kycTableBody.innerHTML = `
      <tr>
        <td><strong>Jean Pierre</strong></td>
        <td>agent@conest.com</td>
        <td><code>AB11223344</code></td>
        <td>${getStatusBadge('AGENT')}</td>
        <td>${getStatusBadge('Pending')}</td>
        <td>
          <div class="action-buttons-group">
            <button class="btn btn-sm" style="background-color: #2563eb;" onclick="handleKycDecision(5, 'Approved')">✅ Approve</button>
            <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handleKycDecision(5, 'Rejected')">❌ Reject</button>
          </div>
        </td>
      </tr>
    `;
    }
}

async function handleKycDecision(requestId, decision) {
    try {
        const statusDecision = decision === 'Approved' ? 'ACTIVE' : 'REJECTED';
        await apiRequest('/kyc/verify', {
            method: 'POST',
            body: JSON.stringify({
                requestId,
                status: statusDecision,
                adminNotes: decision === 'Approved' ? 'Verified CNI matches user.' : 'Name did not match CNI card.'
            })
        });
        alert(`KYC request successfully ${decision.toLowerCase()}d.`);
        loadKycRequests();
        loadAnalytics();
    } catch (error) {
        alert(`Mock Success: KYC request simulated as ${decision}.`);
        loadKycRequests();
        loadAnalytics();
    }
}

window.handleKycDecision = handleKycDecision;

// ========== USERS LIST & BLOCK USE CASE ==========

async function loadUsers() {
    try {
        const users = await apiRequest('/users');
        localUsers = users;
        saveUsersToLocal(localUsers);
    } catch (error) {
        console.log('Using local user persistence...');
        localUsers = getSavedUsers();
    }

    if (localUsers.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="7" class="text-center">No users found.</td></tr>`;
        return;
    }

    usersTableBody.innerHTML = localUsers.map(u => {
        const isBlocked = u.status === 'BLOCKED' || u.status === 'REJECTED' || u.isBlocked;
        const blockBtn = `
            <div class="action-buttons-group">
                <button class="btn btn-sm" style="background-color: #fbbf24; color: black; font-weight: bold;" 
                        onclick="showEditUserForm('${u.id}', '${u.fullName}', '${u.email}', '${u.role?.name || u.role || 'BUYER'}')">
                    ✏️ Edit
                </button>
                <button class="btn btn-sm ${isBlocked ? 'btn-success' : 'btn-danger'}" 
                        onclick="toggleBlockUser('${u.id}', ${!isBlocked})">
                    ${isBlocked ? '🔓' : '🚫'}
                </button>
                <button class="btn btn-sm" style="background-color: #ef4444;" 
                        onclick="deleteUser('${u.id}')">
                    🗑️
                </button>
            </div>
        `;
        
        // Derive KYC status & CNI ref from specialized sub-table response
        let kycStatus = 'unverified';
        let cniNumber = u.cniNumber || '—';
        
        const profile = u.agentProfile;
        if (profile) {
            cniNumber = profile.kycDetails?.idNumber || cniNumber;
            const kStatus = profile.kycDetails?.status;
            if (profile.isVerified || kStatus === 'ACTIVE') {
                kycStatus = 'verified';
            } else if (kStatus === 'PENDING') {
                kycStatus = 'pending';
            } else {
                kycStatus = 'unverified';
            }
        }

        return `
          <tr>
            <td><code>${u.id}</code></td>
            <td><strong>${u.fullName}</strong></td>
            <td>${u.email}</td>
            <td>${getStatusBadge(u.role ? u.role.name || u.role : 'BUYER')}</td>
            <td>${getStatusBadge(isBlocked ? 'REJECTED' : kycStatus)}</td>
            <td><code>${formatCniRef(cniNumber)}</code></td>
            <td>${blockBtn}</td>
          </tr>
        `;
    }).join('');
}

async function toggleBlockUser(userId, block) {
    localUsers = getSavedUsers();
    const idx = localUsers.findIndex(x => String(x.id) === String(userId));
    if (idx !== -1) {
        localUsers[idx].status = block ? 'REJECTED' : 'ACTIVE';
        localUsers[idx].isBlocked = block;
        saveUsersToLocal(localUsers);
    }
    
    try {
        await apiRequest(`/users/${userId}/block`, {
            method: 'POST',
            body: JSON.stringify({ block })
        });
        alert(`User successfully ${block ? 'blocked' : 'unblocked'}.`);
    } catch (e) {
        alert(`Mock Action: User ${userId} has been ${block ? 'blocked' : 'unblocked'} in dashboard persistence.`);
    }
    loadUsers();
}
window.toggleBlockUser = toggleBlockUser;

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user account? This action is irreversible.')) {
        return;
    }
    localUsers = getSavedUsers();
    localUsers = localUsers.filter(x => String(x.id) !== String(userId));
    saveUsersToLocal(localUsers);

    try {
        await apiRequest(`/users/${userId}`, { method: 'DELETE' });
        alert('User successfully deleted.');
    } catch (e) {
        alert(`Mock Action: User ${userId} has been deleted from dashboard persistence.`);
    }
    loadUsers();
    loadAnalytics();
}
window.deleteUser = deleteUser;

function showCreateUserForm() {
    document.getElementById('user-form-title').innerText = "Create User Account";
    document.getElementById('crud-user-id').value = "";
    document.getElementById('crud-user-fullname').value = "";
    document.getElementById('crud-user-email').value = "";
    document.getElementById('crud-user-password').value = "";
    document.getElementById('crud-password-group').style.display = "block";
    document.getElementById('crud-user-role').value = "BUYER";
    document.getElementById('crud-user-cniref').value = "";
    document.getElementById('user-form-card').style.display = "block";
}

function showEditUserForm(id, name, email, role) {
    document.getElementById('user-form-title').innerText = "Edit User Account";
    document.getElementById('crud-user-id').value = id;
    document.getElementById('crud-user-fullname').value = name;
    document.getElementById('crud-user-email').value = email;
    document.getElementById('crud-password-group').style.display = "none";
    document.getElementById('crud-user-role').value = role;
    
    const u = localUsers.find(x => String(x.id) === String(id));
    const cni = u ? (u.cniNumber || u.agentProfile?.kycDetails?.idNumber || '') : '';
    document.getElementById('crud-user-cniref').value = cni;
    
    document.getElementById('user-form-card').style.display = "block";
}

function hideUserForm() {
    document.getElementById('user-form-card').style.display = "none";
}

window.showCreateUserForm = showCreateUserForm;
window.showEditUserForm = showEditUserForm;
window.hideUserForm = hideUserForm;

document.getElementById('user-crud-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('crud-user-id').value;
    const fullName = document.getElementById('crud-user-fullname').value;
    const email = document.getElementById('crud-user-email').value;
    const password = document.getElementById('crud-user-password').value;
    const role = document.getElementById('crud-user-role').value;
    const cniNumber = document.getElementById('crud-user-cniref').value;

    localUsers = getSavedUsers();

    try {
        if (id) {
            const idx = localUsers.findIndex(x => String(x.id) === String(id));
            if (idx !== -1) {
                localUsers[idx].fullName = fullName;
                localUsers[idx].email = email;
                localUsers[idx].role = { name: role };
                localUsers[idx].cniNumber = cniNumber;
                saveUsersToLocal(localUsers);
            }
            await apiRequest(`/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ fullName, email, role, cniNumber })
            });
            alert('User account updated successfully.');
        } else {
            const newId = localUsers.length ? Math.max(...localUsers.map(x => parseInt(x.id) || 1)) + 1 : 4;
            const newUser = {
                id: newId,
                fullName,
                email,
                role: { name: role },
                status: 'ACTIVE',
                cniNumber: cniNumber || ''
            };
            localUsers.push(newUser);
            saveUsersToLocal(localUsers);

            await apiRequest('/users', {
                method: 'POST',
                body: JSON.stringify({ fullName, email, password, role, cniNumber })
            });
            alert('User account created successfully.');
        }
    } catch (err) {
        alert('Action complete (Saved in dashboard persistence): ' + err.message);
    }
    hideUserForm();
    loadUsers();
    loadAnalytics();
});

// ========== PROPERTIES MODERATION USE CASE ==========

async function loadProperties() {
    const tableBody = document.getElementById('admin-properties-table');
    if (!tableBody) return;
    try {
        const properties = await apiRequest('/properties');
        localProperties = properties;
    } catch (e) {
        console.log('API error fetching properties, using default mocked list');
    }

    if (!localProperties || localProperties.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center">No listings found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = localProperties.map(p => `
      <tr>
        <td><code>PROP-${p.id}</code></td>
        <td><strong>${p.title}</strong></td>
        <td>${p.city} / ${p.neighborhood || p.address || ''}</td>
        <td>${formatCurrency(p.price)} FCFA</td>
        <td>${p.agent?.user?.fullName || 'Agent'}</td>
        <td>${getStatusBadge(p.status || 'Active')}</td>
        <td>
          <div class="action-buttons-group">
            ${(p.status === 'PENDING' || p.status === 'Pending') ? `
              <button class="btn btn-sm" style="background-color: #2563eb;" 
                      onclick="resolvePropertyApproval(${p.id}, 'approve')">
                  ✅ Approve
              </button>
              <button class="btn btn-sm" style="background-color: #f97316;" 
                      onclick="resolvePropertyApproval(${p.id}, 'reject')">
                  ❌ Reject
              </button>
            ` : ''}
            <button class="btn btn-sm" style="background-color: #fbbf24; color: black; font-weight: bold;" 
                    onclick="showEditPropertyForm(${p.id})">
                ✏️ Edit
            </button>
            <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handlePropertyAction(${p.id}, 'delete')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
}

async function handlePropertyAction(id, action) {
    try {
        if (action === 'delete') {
            await apiRequest(`/properties/${id}`, { method: 'DELETE' });
            alert(`Property listing permanently deleted.`);
        } else {
            await apiRequest(`/properties/${id}/${action}`, { method: 'POST' });
            alert(`Property successfully ${action}d.`);
        }
        loadProperties();
        loadAnalytics();
    } catch (e) {
        alert(`Mock Action: Property #${id} successfully ${action}d.`);
        loadProperties();
        loadAnalytics();
    }
}
window.handlePropertyAction = handlePropertyAction;

async function resolvePropertyApproval(propertyId, action) {
    try {
        await apiRequest(`/properties/${propertyId}/${action}`, { method: 'POST' });
        alert(`Property listing successfully ${action}d.`);
        loadProperties();
        loadAnalytics();
    } catch (e) {
        alert(`Mock Action: Property Listing successfully approved/rejected.`);
        loadProperties();
        loadAnalytics();
    }
}
window.resolvePropertyApproval = resolvePropertyApproval;
window.loadProperties = loadProperties;

function showCreatePropertyForm() {
    document.getElementById('property-form-title').innerText = "Create Property Listing";
    document.getElementById('crud-property-id').value = "";
    document.getElementById('crud-prop-title').value = "";
    document.getElementById('crud-prop-price').value = "";
    document.getElementById('crud-prop-city').value = "Yaoundé";
    document.getElementById('crud-prop-neighborhood').value = "";
    document.getElementById('crud-prop-landtitle').value = "";
    document.getElementById('crud-prop-type').value = "APARTMENT";
    document.getElementById('crud-prop-desc').value = "";

    // CITI defaults
    document.getElementById('crud-prop-watersource').value = "Borehole";
    document.getElementById('crud-prop-waterrating').value = 4;
    document.getElementById('crud-prop-elecoption').value = "Eneo + Generator";
    document.getElementById('crud-prop-elecrating').value = 4;
    document.getElementById('crud-prop-roadtype').value = "Dirt";
    document.getElementById('crud-prop-roadrating').value = 4;
    document.getElementById('crud-prop-motofare').value = 100;
    document.getElementById('crud-prop-proximity').value = 50;
    document.getElementById('crud-prop-security').value = 4;

    document.getElementById('property-form-card').style.display = "block";
}

function showEditPropertyForm(id) {
    const p = localProperties.find(x => String(x.id) === String(id));
    if (!p) return;

    document.getElementById('property-form-title').innerText = "Edit Property Listing";
    document.getElementById('crud-property-id').value = p.id;
    document.getElementById('crud-prop-title').value = p.title || '';
    document.getElementById('crud-prop-price').value = p.price || '';
    document.getElementById('crud-prop-city').value = p.city || 'Yaoundé';
    document.getElementById('crud-prop-neighborhood').value = p.neighborhood || p.address || '';
    document.getElementById('crud-prop-landtitle').value = p.landTitle?.titleNumber || p.landTitleNumber || '';
    document.getElementById('crud-prop-type').value = p.propertyType || p.type || "APARTMENT";
    document.getElementById('crud-prop-desc').value = p.description || "";

    // CITI sub-elements
    const citi = p.citiIndex || p.citiChecklist || {};
    document.getElementById('crud-prop-watersource').value = citi.waterSource || "Borehole";
    document.getElementById('crud-prop-waterrating').value = citi.waterSupply || citi.waterRating || 4;
    document.getElementById('crud-prop-elecoption').value = citi.eneoBackup ? "Eneo + Generator" : "Eneo Only";
    document.getElementById('crud-prop-elecrating').value = citi.electricity || 4;
    document.getElementById('crud-prop-roadtype').value = citi.roadType || "Dirt";
    document.getElementById('crud-prop-roadrating').value = citi.roadAccess || 4;
    document.getElementById('crud-prop-motofare').value = citi.estimatedMotoFare || 100;
    document.getElementById('crud-prop-proximity').value = citi.proximityToMainStreet || 50;
    document.getElementById('crud-prop-security').value = citi.securityLevel || 4;

    document.getElementById('property-form-card').style.display = "block";
}

function hidePropertyForm() {
    document.getElementById('property-form-card').style.display = "none";
}

window.showCreatePropertyForm = showCreatePropertyForm;
window.showEditPropertyForm = showEditPropertyForm;
window.hidePropertyForm = hidePropertyForm;

document.getElementById('property-crud-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('crud-property-id').value;
    const title = document.getElementById('crud-prop-title').value;
    const price = document.getElementById('crud-prop-price').value;
    const city = document.getElementById('crud-prop-city').value;
    const neighborhood = document.getElementById('crud-prop-neighborhood').value;
    const landTitleNumber = document.getElementById('crud-prop-landtitle').value;
    const propertyType = document.getElementById('crud-prop-type').value;
    const description = document.getElementById('crud-prop-desc').value;

    // CITI parameters
    const waterSource = document.getElementById('crud-prop-watersource').value;
    const waterSupply = document.getElementById('crud-prop-waterrating').value;
    const electricity = document.getElementById('crud-prop-elecrating').value;
    const roadType = document.getElementById('crud-prop-roadtype').value;
    const roadAccess = document.getElementById('crud-prop-roadrating').value;
    const estimatedMotoFare = document.getElementById('crud-prop-motofare').value;
    const proximityToMainStreet = document.getElementById('crud-prop-proximity').value;
    const securityLevel = document.getElementById('crud-prop-security').value;

    const payload = {
        title, price, city, neighborhood, landTitleNumber, propertyType, description,
        waterSource, waterSupply, electricity, roadType, roadAccess, estimatedMotoFare, proximityToMainStreet, securityLevel
    };

    try {
        if (id) {
            await apiRequest(`/properties/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            alert('Property listing updated successfully.');
        } else {
            await apiRequest('/properties', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            alert('Property listing created successfully.');
        }
        hidePropertyForm();
        loadProperties();
        loadAnalytics();
    } catch (err) {
        alert('Error saving property listing: ' + err.message);
    }
});

// ========== CHATS MODERATOR USE CASE ==========

async function loadChats() {
    const tableBody = document.getElementById('admin-chats-table');
    if (!tableBody) return;
    try {
        const chats = await apiRequest('/chats');
        if (chats.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No conversation channels active.</td></tr>`;
            return;
        }
        tableBody.innerHTML = chats.map(c => `
          <tr>
            <td><code>CHAT-${c.id}</code></td>
            <td>${c.buyer?.user?.fullName || 'Buyer'}</td>
            <td>${c.agent?.user?.fullName || 'Agent'}</td>
            <td>${c.property?.title || 'General Inq'}</td>
            <td>${c.lastMessage || 'Click to view'}</td>
            <td>
              <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handleChatAction(${c.id}, 'delete')">🗑️ Delete</button>
            </td>
          </tr>
        `).join('');
    } catch (e) {
        tableBody.innerHTML = `
          <tr>
            <td><code>CHAT-1</code></td>
            <td>Elie Kamga</td>
            <td>Jean Pierre</td>
            <td>Modern Student Studio in Molyko</td>
            <td>Yes, registered under TF 4432/Fako.</td>
            <td>
              <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handleChatAction(1, 'delete')">🗑️ Delete</button>
            </td>
          </tr>
        `;
    }
}

async function handleChatAction(id, action) {
    try {
        if (action === 'delete') {
            await apiRequest(`/chats/${id}`, { method: 'DELETE' });
            alert(`Conversation threads successfully deleted.`);
        } else {
            await apiRequest(`/chats/${id}/${action}`, { method: 'POST' });
        }
        loadChats();
    } catch (e) {
        alert(`Mock Action: Conversation #${id} moderated.`);
        loadChats();
    }
}
window.loadChats = loadChats;
window.handleChatAction = handleChatAction;

// ========== LAND REGISTRY CRUD ==========

async function loadRegistry() {
    const tableBody = document.getElementById('registry-table-body');
    if (!tableBody) return;
    try {
        const titles = await apiRequest('/land-registry');
        localTitles = titles;
        if (titles.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center">No registered titles found.</td></tr>`;
            return;
        }
        tableBody.innerHTML = titles.map(t => {
            const dateStr = t.registeredAt || '';
            const statusLabel = (t.status === 'ACTIVE' || t.status === 'Active') ? '🟢 Clear' : '🔴 Disputed';
            return `
              <tr>
                <td><code>TF-${t.id}</code></td>
                <td><strong>${t.titleNumber}</strong></td>
                <td>${t.ownerName}</td>
                <td>${dateStr}</td>
                <td>${t.landArea || 500} sqm</td>
                <td>${statusLabel}</td>
                <td>
                  <div class="action-buttons-group">
                    <button class="btn btn-sm" style="background-color: #fbbf24; color: black; font-weight: bold;" 
                            onclick="showEditRegistryForm(${t.id})">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-sm" style="background-color: #ef4444;" onclick="deleteRegistry(${t.id})">
                        🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `;
        }).join('');
    } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Offline MINDCAF simulated database loading failed.</td></tr>`;
    }
}

async function deleteRegistry(id) {
    if (!confirm('Are you sure you want to permanently delete this land title record from MINDCAF registry?')) {
        return;
    }
    try {
        await apiRequest(`/land-registry/${id}`, { method: 'DELETE' });
        alert('Land title successfully deleted from registry.');
        loadRegistry();
    } catch (e) {
        alert('Mock Action: Land title record deleted from registry persistence.');
        loadRegistry();
    }
}

function showEditRegistryForm(id) {
    const t = localTitles.find(x => String(x.id) === String(id));
    if (!t) return;

    document.getElementById('registry-form-title').innerText = "✏️ Edit MINDCAF Land Title";
    document.getElementById('tf-id').value = t.id;
    document.getElementById('tf-number').value = t.titleNumber;
    document.getElementById('tf-owner').value = t.ownerName;
    document.getElementById('tf-date').value = t.registeredAt || '';
    document.getElementById('tf-area').value = t.landArea || 500;
    document.getElementById('tf-boundaries').value = t.boundaries || '';
    if (t.status === 'ACTIVE' || t.status === 'Active') {
        document.getElementById('status-active').checked = true;
        if (typeof caveatDetailsGroup !== 'undefined') caveatDetailsGroup.style.display = 'none';
    } else {
        document.getElementById('status-disputed').checked = true;
        if (typeof caveatDetailsGroup !== 'undefined') caveatDetailsGroup.style.display = 'block';
    }
    document.getElementById('btn-registry-submit').textContent = "Save Changes";
    document.getElementById('btn-registry-cancel').style.display = "inline-block";
}

function cancelRegistryEdit() {
    document.getElementById('registry-form-title').innerText = "Register New Titre Foncier";
    document.getElementById('tf-id').value = "";
    registryForm.reset();
    document.getElementById('btn-registry-submit').textContent = "Register Title Reference";
    document.getElementById('btn-registry-cancel').style.display = "none";
    if (typeof caveatDetailsGroup !== 'undefined') caveatDetailsGroup.style.display = 'none';
}

statusDisputed.addEventListener('change', () => {
    caveatDetailsGroup.style.display = statusDisputed.checked ? 'block' : 'none';
});

registryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(registryError);
    registrySuccess.style.display = 'none';

    const id = document.getElementById('tf-id').value;
    const titleNumber = document.getElementById('tf-number').value;
    const ownerName = document.getElementById('tf-owner').value;
    const registrationDate = document.getElementById('tf-date').value;
    const area = document.getElementById('tf-area').value;
    const boundaries = document.getElementById('tf-boundaries').value;
    const status = document.querySelector('input[name="tf-status"]:checked').value;

    const payload = {
        titleNumber,
        ownerName,
        registeredAt: registrationDate,
        landArea: area,
        boundaries,
        status: status === 'Disputed' ? 'REJECTED' : 'ACTIVE'
    };

    try {
        if (id) {
            await apiRequest(`/land-registry/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            alert('Land title successfully updated.');
            cancelRegistryEdit();
        } else {
            await apiRequest('/land-registry/add', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            alert('New land title reference successfully registered.');
            registryForm.reset();
        }
        loadRegistry();
    } catch (error) {
        showError(registryError, error.message || 'Failed to resolve title change.');
    }
});

window.loadRegistry = loadRegistry;
window.deleteRegistry = deleteRegistry;
window.showEditRegistryForm = showEditRegistryForm;
window.cancelRegistryEdit = cancelRegistryEdit;

// ========== PAYMENTS ==========

async function loadPayments() {
    try {
        const payments = await apiRequest('/payments');

        if (payments.length === 0) {
            paymentsTableBody.innerHTML = `<tr><td colspan="8" class="text-center">No transactions found.</td></tr>`;
            return;
        }

        paymentsTableBody.innerHTML = payments.map(tx => {
            const isPending = tx.status === 'PENDING' || tx.status === 'Pending';
            let actionBtn = '—';
            if (isPending) {
                actionBtn = `
                    <div class="action-buttons-group">
                        <button class="btn btn-sm" style="background-color: #2563eb;" onclick="handlePaymentStatus(${tx.id}, 'SUCCESS')">✅ Approve</button>
                        <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handlePaymentStatus(${tx.id}, 'FAILED')">❌ Fail</button>
                    </div>
                `;
            }

            return `
              <tr>
                <td><code>TX-${tx.id}</code></td>
                <td><strong>${tx.user?.fullName || 'N/A'}</strong></td>
                <td>${tx.user?.email || 'N/A'}</td>
                <td>${formatCurrency(tx.amount)}</td>
                <td><span style="color: #2563eb; font-weight: bold;">${tx.method}</span></td>
                <td><span class="badge" style="background-color: #334155; color: white;">${tx.paymentType || 'SUBSCRIPTION'}</span></td>
                <td>${getStatusBadge(tx.status)}</td>
                <td>${actionBtn}</td>
              </tr>
            `;
        }).join('');
    } catch (error) {
        paymentsTableBody.innerHTML = `
          <tr>
            <td><code>TX-1</code></td>
            <td><strong>Elie Kamga</strong></td>
            <td>buyer@conest.com</td>
            <td>25,000</td>
            <td><span style="color: #2563eb; font-weight: bold;">Mobile money</span></td>
            <td><span class="badge" style="background-color: #334155; color: white;">PROMOTION</span></td>
            <td>${getStatusBadge('Approved')}</td>
            <td>—</td>
          </tr>
          <tr>
            <td><code>TX-2</code></td>
            <td><strong>Jean Pierre</strong></td>
            <td>agent@conest.com</td>
            <td>15,000</td>
            <td><span style="color: #f97316; font-weight: bold;">Orange money</span></td>
            <td><span class="badge" style="background-color: #334155; color: white;">SUBSCRIPTION</span></td>
            <td>${getStatusBadge('Pending')}</td>
            <td>
                <div class="action-buttons-group">
                    <button class="btn btn-sm" style="background-color: #2563eb;" onclick="handlePaymentStatus(2, 'SUCCESS')">Approve</button>
                    <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handlePaymentStatus(2, 'FAILED')">Fail</button>
                </div>
            </td>
          </tr>
        `;
    }
}

async function handlePaymentStatus(paymentId, status) {
    try {
        await apiRequest('/payments/update-status', {
            method: 'POST',
            body: JSON.stringify({ paymentId, status })
        });
        alert(`Transaction successfully resolved as ${status}.`);
        loadPayments();
        loadAnalytics();
    } catch (error) {
        alert(`Mock transaction status updated to ${status}.`);
        loadPayments();
        loadAnalytics();
    }
}

window.handlePaymentStatus = handlePaymentStatus;

// ========== MESSAGES LOG MODERATION ==========

async function loadMessages() {
    const tableBody = document.getElementById('admin-messages-table');
    if (!tableBody) return;
    try {
        const messages = await apiRequest('/messages');
        if (messages.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center">No messages sent yet.</td></tr>`;
            return;
        }
        tableBody.innerHTML = messages.map(m => {
            const date = m.createdAt ? new Date(m.createdAt).toLocaleString('en-US') : 'N/A';
            const content = m.messageType === 'IMAGE' 
              ? `<img src="${m.imageUrl}" style="max-height: 40px; border-radius: 4px;" />` 
              : m.content;
            return `
              <tr>
                <td><code>MSG-${m.id}</code></td>
                <td><code>CHAT-${m.conversationId}</code></td>
                <td><strong>${m.sender?.fullName || 'Sender'}</strong></td>
                <td>${m.recipientName || 'Recipient'}</td>
                <td>${content}</td>
                <td><span class="badge" style="background-color: ${m.messageType === 'IMAGE' ? '#7c3aed' : '#334155'}; color: white;">${m.messageType || 'TEXT'}</span></td>
                <td>${date}</td>
                <td>
                  <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handleMessageDelete(${m.id})">🗑️ Delete</button>
                </td>
              </tr>
            `;
        }).join('');
    } catch (e) {
        tableBody.innerHTML = `
          <tr>
            <td><code>MSG-1</code></td>
            <td><code>CHAT-1</code></td>
            <td><strong>Elie Kamga</strong></td>
            <td>Jean Pierre</td>
            <td>Hello agent, I am interested in the Bastos Apartment.</td>
            <td><span class="badge" style="background-color: #334155; color: white;">TEXT</span></td>
            <td>2026-07-17 19:40</td>
            <td>
              <button class="btn btn-sm" style="background-color: #ef4444;" onclick="handleMessageDelete(1)">🗑️ Delete</button>
            </td>
          </tr>
        `;
    }
}

async function handleMessageDelete(id) {
    if (!confirm('Are you sure you want to permanently delete this message from the database log?')) {
        return;
    }
    try {
        await apiRequest(`/messages/${id}`, { method: 'DELETE' });
        alert('Message successfully deleted.');
        loadMessages();
    } catch (e) {
        alert('Mock Action: Message deleted from database view.');
        loadMessages();
    }
}

window.loadMessages = loadMessages;
window.handleMessageDelete = handleMessageDelete;

// ========== ABUSE & SCAMMER REPORTS ==========

async function loadReports() {
    const tableBody = document.getElementById('admin-reports-table');
    if (!tableBody) return;
    try {
        const reports = await apiRequest('/reports');
        if (reports.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center">No abuse reports submitted yet.</td></tr>`;
            return;
        }
        tableBody.innerHTML = reports.map(r => {
            const reported = r.reportedUser;
            let actionBtn = '—';
            let statusLabel = 'N/A';
            if (reported) {
                const isBlocked = reported.status === 'REJECTED' || reported.status === 'BLOCKED';
                statusLabel = isBlocked 
                  ? '<span class="badge badge-unverified">🚫 Blocked</span>' 
                  : '<span class="badge badge-verified">🟢 Active</span>';
                  
                actionBtn = `
                  <button class="btn btn-sm ${isBlocked ? 'btn-success' : 'btn-danger'}" 
                          onclick="toggleBlockUser('${reported.id}', ${!isBlocked}).then(() => loadReports())">
                      ${isBlocked ? '🔓 Unblock' : '🚫 Block Suspect'}
                  </button>
                `;
            }
            return `
              <tr>
                <td><code>REP-${r.id}</code></td>
                <td><code>CHAT-${r.conversationId}</code></td>
                <td><strong>${r.reporter?.fullName || 'Reporter'}</strong><br><small>${r.reporter?.email || ''}</small></td>
                <td><strong>${reported?.fullName || 'Suspect'}</strong><br><small>${reported?.email || ''}</small></td>
                <td><span style="color: #f97316; font-weight: bold;">${r.reason}</span></td>
                <td>${r.description || '—'}</td>
                <td>${statusLabel}</td>
                <td>${actionBtn}</td>
              </tr>
            `;
        }).join('');
    } catch (e) {
        tableBody.innerHTML = `
          <tr>
            <td><code>REP-1</code></td>
            <td><code>CHAT-1</code></td>
            <td><strong>Elie Kamga</strong><br><small>buyer@conest.com</small></td>
            <td><strong>Jean Pierre</strong><br><small>agent@conest.com</small></td>
            <td><span style="color: #f97316; font-weight: bold;">Fraudulent land title</span></td>
            <td>The agent is claiming the plot is clear but high court says disputed.</td>
            <td><span class="badge badge-verified">🟢 Active</span></td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="toggleBlockUser('88712395', true).then(() => loadReports())">🚫 Block Suspect</button>
            </td>
          </tr>
        `;
    }
}

window.loadReports = loadReports;

// ========== GENERATE ANALYTICAL REPORT USE CASE ==========

document.getElementById('btn-generate-report').addEventListener('click', () => {
    const totalUsers = document.getElementById('metric-users').textContent;
    const verifiedAgents = document.getElementById('metric-agents').textContent;
    const totalListings = document.getElementById('metric-listings').textContent;
    const totalRevenue = document.getElementById('metric-revenue').textContent;
    const pendingKyc = document.getElementById('metric-pending-kyc').textContent;

    const csvContent = "data:text/csv;charset=utf-8," 
        + "Metric,Value\n"
        + `Total Platform Users,${totalUsers}\n`
        + `Verified Users,${verifiedAgents}\n`
        + `Active Properties Seeded,${totalListings}\n`
        + `Total Reconciled MoMo Revenue (FCFA),${totalRevenue.replace(/,/g, '')}\n`
        + `Pending KYC Verification Requests,${pendingKyc}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CoNest_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ========== INITIALIZATION ==========

console.log('Co-Nest Admin Dashboard loaded successfully.');
console.log('Demo login: admin@conest.com / admin123');