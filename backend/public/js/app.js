let token = localStorage.getItem('token');
let currentUserId = null;
let currentUserData = null;
let currentResetToken = null;
let currentEmail = null;

// Service status tracking - must be declared before use
let serviceStatusInterval = null;
let lastServiceCheck = null;

// Service details object - must be declared before use
const serviceDetails = {
    cometchat: {
        title: 'CometChat - Detailed Connection',
        html: `
            <h3 style="color: #D4AF37; margin-bottom: 16px;">Connection Status</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <p><span style="color: #b0b0b0;">Status:</span> <span style="color: #4CAF50; font-weight: 600;">Connected & Operational</span></p>
                <p><span style="color: #b0b0b0;">App ID:</span> <span style="color: #D4AF37;" id="modalCometchatAppId">Loading...</span></p>
                <p><span style="color: #b0b0b0;">Region:</span> <span style="color: #D4AF37;" id="modalCometchatRegion">Loading...</span></p>
            </div>
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">APIs & Endpoints</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                <p style="color: #D4AF37; font-weight: 600;">Chat API:</p>
                <p style="color: #b0b0b0;">• POST /groups - Create/Update groups</p>
                <p style="color: #b0b0b0;">• GET /groups - List groups</p>
                <p style="color: #b0b0b0;">• POST /messages - Send messages</p>
                <p style="color: #b0b0b0;">• WebSocket: Real-time message sync</p>
            </div>
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Functions in Use</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                <p style="color: #b0b0b0;">• createGroup() - Initialize group channels</p>
                <p style="color: #b0b0b0;">• sendTextMessage() - Post messages with emergency flag</p>
                <p style="color: #b0b0b0;">• addMessageListener() - Real-time updates</p>
                <p style="color: #b0b0b0;">• getUser() - User profile sync</p>
            </div>
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Error Handling & Debugging</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 16px; font-size: 13px;">
                <p style="color: #FFD700; font-weight: 600;">Common Errors:</p>
                <p style="color: #FFD700;">Connection Timeout (30s)</p>
                <p style="color: #b0b0b0;">- Auto-retry with exponential backoff</p>
                <p style="color: #b0b0b0;">- Check frontend network connection</p>
                <p style="color: #b0b0b0;">- Verify CometChat App ID in environment</p>
                
                <p style="color: #FFD700; margin-top: 12px;">Invalid App ID / Auth Key</p>
                <p style="color: #b0b0b0;">- Verify COMETCHAT_APP_ID is correct</p>
                <p style="color: #b0b0b0;">- Verify COMETCHAT_AUTH_KEY for frontend</p>
                
                <p style="color: #FFD700; margin-top: 12px;">Message Send Failure</p>
                <p style="color: #b0b0b0;">- Queue locally & retry when online</p>
                <p style="color: #b0b0b0;">- Check browser DevTools > Network tab</p>
            </div>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; font-size: 13px;">
                <p style="color: #FFD700; font-weight: 600;">Debug Tools:</p>
                <p style="color: #b0b0b0;">• Frontend: console.log() in utils/cometChatClient.ts</p>
                <p style="color: #b0b0b0;">• Monitor: Browser DevTools > Console tab</p>
                <p style="color: #b0b0b0;">• Test: Use Group List screen to verify connection</p>
                <p style="color: #b0b0b0;">• View: Check chat for real-time message updates</p>
            </div>
        `
    },
    supabase: {
        title: 'Supabase - Database Connection',
        html: `
            <h3 style="color: #D4AF37; margin-bottom: 16px;">Connection Status</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <p><span style="color: #b0b0b0;">Status:</span> <span style="color: #4CAF50; font-weight: 600;">Connected</span></p>
                <p><span style="color: #b0b0b0;">Database:</span> <span style="color: #D4AF37;">PostgreSQL (Neon)</span></p>
                <p><span style="color: #b0b0b0;">Region:</span> <span style="color: #D4AF37;">US East</span></p>
                <p><span style="color: #b0b0b0;">Response Time:</span> <span style="color: #D4AF37;">~45ms avg</span></p>
            </div>
            
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Database Diagnostics</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <p style="color: #b0b0b0; margin-bottom: 12px;">Run a comprehensive check of all database tables:</p>
                <button onclick="runDatabaseCheck()" id="dbCheckBtn" style="background: linear-gradient(135deg, #D4AF37 0%, #B8962E 100%); color: #1a1a1a; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%; font-size: 14px; transition: all 0.3s;">
                    Run Database Check
                </button>
                <div id="dbCheckStatus" style="margin-top: 12px; display: none;">
                    <p style="color: #b0b0b0; font-size: 12px;"><span id="dbCheckTime"></span></p>
                </div>
            </div>
            
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Debug Logs</h3>
            <div id="dbCheckOutput" style="background: #0d0d0d; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-family: 'Courier New', monospace; font-size: 12px; max-height: 400px; overflow-y: auto; min-height: 150px;">
                <p style="color: #666;">Click "Run Database Check" to see results...</p>
            </div>
            
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Required Tables</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                <p style="color: #D4AF37; font-weight: 600;">Core Tables:</p>
                <p style="color: #b0b0b0;">• users (id, email, name, role, account_id, cometchat_uid, permissions)</p>
                <p style="color: #b0b0b0;">• groups (id, name, description, created_by)</p>
                <p style="color: #b0b0b0;">• group_members (group_id, user_id, role)</p>
                <p style="color: #b0b0b0;">• emergency_groups (id, name, description, priority)</p>
                <p style="color: #b0b0b0;">• emergency_group_members (emergency_group_id, user_id)</p>
                <p style="color: #b0b0b0;">• accounts (id, name, parent_account_id, billing_plan)</p>
                <p style="color: #b0b0b0;">• account_channels (account_id, channel_id, access_level)</p>
            </div>
            
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Error Handling</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 16px; font-size: 13px;">
                <p style="color: #FFD700; font-weight: 600;">Common Errors:</p>
                <p style="color: #FFD700;">PGRST205 - Table not found</p>
                <p style="color: #b0b0b0;">→ Run the SQL schema in Supabase SQL Editor</p>
                
                <p style="color: #FFD700; margin-top: 12px;">42703 - Column does not exist</p>
                <p style="color: #b0b0b0;">→ Run ALTER TABLE to add missing columns</p>
                
                <p style="color: #FFD700; margin-top: 12px;">Connection Failed</p>
                <p style="color: #b0b0b0;">→ Verify SUPABASE_URL & SERVICE_ROLE_KEY</p>
            </div>
        `
    },
    brevo: {
        title: 'Brevo - Email Service',
        html: `
            <h3 style="color: #D4AF37; margin-bottom: 16px;">Service Status</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <p><span style="color: #b0b0b0;">Status:</span> <span style="color: #4CAF50; font-weight: 600;">Active & Operational</span></p>
                <p><span style="color: #b0b0b0;">Sender Email:</span> <span style="color: #D4AF37;">noreply@worldrisk.co.za</span></p>
                <p><span style="color: #b0b0b0;">SMTP:</span> <span style="color: #D4AF37;">smtp-relay.brevo.com:587</span></p>
                <p><span style="color: #b0b0b0;">Authentication:</span> <span style="color: #D4AF37;">API Key + SMTP</span></p>
            </div>
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Email Templates</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                <p style="color: #b0b0b0;">• Verification Code (6-digit OTP)</p>
                <p style="color: #b0b0b0;">• Password Reset Link</p>
                <p style="color: #b0b0b0;">• Account Confirmation</p>
                <p style="color: #b0b0b0;">• Emergency Alert Notification</p>
            </div>
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">API Endpoints</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                <p style="color: #b0b0b0;">POST /smtp/email - Send transactional email</p>
                <p style="color: #b0b0b0;">GET /smtp/stats - Email delivery stats</p>
                <p style="color: #b0b0b0;">Rate Limit: 500 emails/hour</p>
            </div>
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Error Handling & Debugging</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 16px; font-size: 13px;">
                <p style="color: #FFD700; font-weight: 600;">Common Errors:</p>
                <p style="color: #FFD700;">Rate Limit Exceeded (500 emails/hour)</p>
                <p style="color: #b0b0b0;">→ Queue email & retry after 60s</p>
                <p style="color: #b0b0b0;">→ Monitor email send frequency</p>
                <p style="color: #b0b0b0;">→ Implement retry queue in backend</p>
                
                <p style="color: #FFD700; margin-top: 12px;">Invalid Email Address</p>
                <p style="color: #b0b0b0;">→ Validate & log error</p>
                <p style="color: #b0b0b0;">→ Check user email format</p>
                
                <p style="color: #FFD700; margin-top: 12px;">SMTP Connection Failed</p>
                <p style="color: #b0b0b0;">→ Fallback to REST API (auto-enabled)</p>
                <p style="color: #b0b0b0;">→ Verify BREVO_API_KEY configured</p>
            </div>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; font-size: 13px;">
                <p style="color: #FFD700; font-weight: 600;">Debug Tools:</p>
                <p style="color: #b0b0b0;">• Backend Logs: Check console for email send attempts</p>
                <p style="color: #b0b0b0;">• Brevo Dashboard: View sent/failed emails at app.brevo.com</p>
                <p style="color: #b0b0b0;">• Test Send: Use password reset feature to trigger email</p>
                <p style="color: #b0b0b0;">• Monitor: Check spam folders for email delivery issues</p>
            </div>
        `
    },
    expo: {
        title: 'Expo - Frontend Platform',
        html: `
            <h3 style="color: #D4AF37; margin-bottom: 16px;">Platform Status</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <p><span style="color: #b0b0b0;">Status:</span> <span style="color: #4CAF50; font-weight: 600;">Connected & Building</span></p>
                <p><span style="color: #b0b0b0;">SDK Version:</span> <span style="color: #D4AF37;">54.0.x</span></p>
                <p><span style="color: #b0b0b0;">React Native:</span> <span style="color: #D4AF37;">0.75+</span></p>
                <p><span style="color: #b0b0b0;">Build Method:</span> <span style="color: #D4AF37;">EAS Build</span></p>
            </div>
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Features Enabled</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                <p style="color: #b0b0b0;">Hot Module Reloading (HMR)</p>
                <p style="color: #b0b0b0;">Over-the-Air Updates</p>
                <p style="color: #b0b0b0;">Push Notifications</p>
                <p style="color: #b0b0b0;">Gesture Handler & Reanimated</p>
                <p style="color: #b0b0b0;">Async Storage (Session Persistence)</p>
            </div>
            <h3 style="color: #D4AF37; margin: 20px 0 16px 0;">Error Handling & Debugging</h3>
            <div style="background: #1a1a1a; border: 1px solid #404040; border-radius: 6px; padding: 16px; margin-bottom: 16px; font-size: 13px;">
                <p style="color: #FFD700; font-weight: 600;">Common Errors:</p>
                <p style="color: #FFD700;">Build Failed</p>
                <p style="color: #b0b0b0;">→ Check package.json dependencies</p>
                <p style="color: #b0b0b0;">→ Clear Metro cache: npx expo start -c</p>
                
                <p style="color: #FFD700; margin-top: 12px;">EAS Build Timeout</p>
                <p style="color: #b0b0b0;">→ Check EAS dashboard for queue status</p>
                <p style="color: #b0b0b0;">→ Verify build configuration in eas.json</p>
            </div>
        `
    }
};

// Load and display service status dynamically
async function loadServiceStatus() {
    const checkTime = new Date();
    
    try {
        const response = await fetch('/api/services/status');
        const services = await response.json();

        // Update each service with fetched status
        updateServiceCard('cometchat', services.cometchat, checkTime);
        updateServiceCard('supabase', services.supabase, checkTime);
        updateServiceCard('brevo', services.brevo, checkTime);
        updateServiceCard('expo', services.expo, checkTime);
        
        // Update global last checked time
        lastServiceCheck = checkTime;
        updateLastCheckedDisplay();
    } catch (error) {
        console.error('Error loading service status:', error);
    }
}

// Refresh service status with button animation
async function refreshServiceStatus() {
    const btn = document.getElementById('refreshServicesBtn');
    const icon = document.getElementById('refreshIcon');
    
    // Disable button and show spinning animation
    btn.disabled = true;
    btn.style.opacity = '0.7';
    icon.style.animation = 'spin 1s linear infinite';
    
    // Set all services to "Checking..." state
    ['cometchat', 'supabase', 'brevo', 'expo'].forEach(service => {
        const statusEl = document.getElementById(service + 'Status');
        const pingEl = document.getElementById(service + 'PingIndicator');
        if (statusEl) statusEl.textContent = 'Checking...';
        if (pingEl) pingEl.className = 'ping-checking';
    });
    
    try {
        await loadServiceStatus();
    } finally {
        // Re-enable button
        btn.disabled = false;
        btn.style.opacity = '1';
        icon.style.animation = 'none';
    }
}

// Update the last checked timestamp display
function updateLastCheckedDisplay() {
    const el = document.getElementById('servicesLastChecked');
    if (el && lastServiceCheck) {
        const now = new Date();
        const diff = Math.floor((now - lastServiceCheck) / 1000);
        
        let timeStr;
        if (diff < 5) {
            timeStr = 'Just now';
        } else if (diff < 60) {
            timeStr = diff + 's ago';
        } else if (diff < 3600) {
            timeStr = Math.floor(diff / 60) + 'm ago';
        } else {
            timeStr = lastServiceCheck.toLocaleTimeString();
        }
        
        el.textContent = 'Last checked: ' + timeStr;
    }
}

// Start auto-refresh interval (every 30 seconds)
function startServiceStatusAutoRefresh() {
    if (serviceStatusInterval) clearInterval(serviceStatusInterval);
    serviceStatusInterval = setInterval(() => {
        loadServiceStatus();
        updateLastCheckedDisplay();
    }, 30000);
    
    // Also update the "X ago" display every second
    setInterval(updateLastCheckedDisplay, 1000);
}

function updateServiceCard(serviceName, serviceData, checkTime) {
    const statusElement = document.getElementById(serviceName + 'Status');
    const errorElement = document.getElementById(serviceName + 'Error');
    const indicatorElement = document.getElementById(serviceName + 'ErrorIndicator');
    const pingIndicator = document.getElementById(serviceName + 'PingIndicator');
    const lastPingElement = document.getElementById(serviceName + 'LastPing');

    // Update last ping time
    if (lastPingElement && checkTime) {
        lastPingElement.textContent = 'Last ping: ' + checkTime.toLocaleTimeString();
    }

    if (serviceData.status === 'connected') {
        statusElement.textContent = 'Connected';
        statusElement.style.color = '#4CAF50';
        errorElement.style.display = 'none';
        indicatorElement.style.display = 'none';
        
        // Update ping indicator
        if (pingIndicator) {
            pingIndicator.className = '';
            pingIndicator.style.background = '#4CAF50';
            pingIndicator.style.animation = 'pulse 2s infinite';
        }
        
        // Update CometChat specific fields
        if (serviceName === 'cometchat') {
            const appIdElement = document.getElementById('cometchatAppId');
            const regionElement = document.getElementById('cometchatRegion');
            if (appIdElement) appIdElement.textContent = serviceData.appId || 'N/A';
            if (regionElement) regionElement.textContent = (serviceData.region || 'N/A').toUpperCase();
        }
    } else if (serviceData.status === 'disconnected' || serviceData.status === 'error') {
        statusElement.textContent = serviceData.status === 'disconnected' ? 'Disconnected' : 'Error';
        statusElement.style.color = '#FF6B6B';
        
        // Update ping indicator
        if (pingIndicator) {
            pingIndicator.className = '';
            pingIndicator.style.background = '#FF6B6B';
            pingIndicator.style.animation = 'none';
        }
        
        if (serviceData.error) {
            errorElement.textContent = serviceData.error;
            errorElement.style.display = 'block';
        }

        // Show appropriate indicator
        if (serviceData.severity === 'critical') {
            indicatorElement.textContent = '!';
            indicatorElement.style.color = '#FF6B6B';
            indicatorElement.title = 'Critical Error - App affected';
        } else if (serviceData.severity === 'minor') {
            indicatorElement.textContent = '!';
            indicatorElement.style.color = '#FFB84D';
            indicatorElement.title = 'Caution - Minor error';
        }
        indicatorElement.style.display = 'block';
        
        // Update CometChat specific fields with error state
        if (serviceName === 'cometchat') {
            const appIdElement = document.getElementById('cometchatAppId');
            const regionElement = document.getElementById('cometchatRegion');
            if (appIdElement) appIdElement.textContent = 'Not configured';
            if (regionElement) regionElement.textContent = 'Not configured';
        }
    }
}

// SEND VERIFICATION CODE
async function sendVerificationCode() {
    const email = document.getElementById('email').value;
    const sendBtn = document.getElementById('sendCodeBtn');
    const errorDiv = document.getElementById('loginError');

    if (!email) {
        errorDiv.textContent = 'Please enter your email';
        errorDiv.style.display = 'block';
        return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch('/api/auth/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send code');
        }

        currentEmail = email;
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        document.getElementById('code').focus();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Code';
    }
}

// VERIFY CODE
async function verifyCode() {
    const code = document.getElementById('code').value;
    const verifyBtn = document.getElementById('verifyCodeBtn');
    const errorDiv = document.getElementById('loginError');

    if (!code || code.length !== 6) {
        errorDiv.textContent = 'Please enter a valid 6-digit code';
        errorDiv.style.display = 'block';
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch('/api/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, code })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Verification failed');
        }

        token = data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showDashboard();
        loadUsers();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Sign In';
    }
}

// GO BACK TO EMAIL
function goBackToEmail() {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
    document.getElementById('code').value = '';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('email').focus();
}

// Allow Enter key in code field
document.getElementById('code')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') verifyCode();
});

function showDashboard() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('currentUser').textContent = user.username || user.email;
    
    // Start auto-refresh for service status
    startServiceStatusAutoRefresh();
}

async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        if (data.users && data.users.length > 0) {
            data.users.forEach(user => {
                const row = document.createElement('tr');
                const lastVisit = user.last_login ? new Date(user.last_login).toLocaleString() : 'Never';
                const status = user.permissions?.is_enabled ? 'Enabled' : 'Disabled';
                const statusClass = user.permissions?.is_enabled ? 'enabled' : 'disabled';

                row.innerHTML = `
                    <td>${user.username || 'N/A'}</td>
                    <td>${user.email}</td>
                    <td>${user.account_name || 'N/A'}</td>
                    <td>${user.billing_plan || 'N/A'}</td>
                    <td>${lastVisit}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                    <td>
                        <div class="actions">
                            <button class="edit-btn" onclick="openEditUserModal('${user.id}')">Edit</button>
                            <button class="delete-btn" onclick="deleteUser('${user.id}')">Delete</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
            // Update dashboard count
            document.getElementById('totalUsersCount').textContent = data.total || data.users.length;
            const activeCount = data.users.filter(u => u.permissions?.is_enabled).length;
            document.getElementById('activeUsersCount').textContent = activeCount;
            
            // Update billing plan counts
            updateBillingPlanCounts(data.users);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found</td></tr>';
            updateBillingPlanCounts([]);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// SECTION SWITCHING
function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Remove active from nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Mark nav item as active
    event.target.classList.add('active');
    
    // Load section-specific data
    if (sectionId === 'logs-section') {
        loadLogs();
    } else if (sectionId === 'tracking') {
        loadTrackedUsers();
    }
}

// SERVICE MODAL FUNCTIONS
function openServiceModal(service) {
    const data = serviceDetails[service];
    document.getElementById('serviceTitle').textContent = data.title;
    document.getElementById('serviceModalBody').innerHTML = data.html;
    document.getElementById('serviceModal').classList.add('active');
}

function closeServiceModal() {
    document.getElementById('serviceModal').classList.remove('active');
}

async function runDatabaseCheck() {
    const btn = document.getElementById('dbCheckBtn');
    const output = document.getElementById('dbCheckOutput');
    const statusDiv = document.getElementById('dbCheckStatus');
    const timeSpan = document.getElementById('dbCheckTime');
    
    if (!btn || !output) {
        console.error('Database check elements not found');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Checking...';
    btn.style.opacity = '0.7';
    
    const startTime = new Date();
    output.innerHTML = '<p style="color: #D4AF37;">Running database check...</p>';
    
    try {
        const response = await fetch('/api/db-check');
        const data = await response.json();
        const endTime = new Date();
        const duration = endTime - startTime;
        
        let html = '';
        
        // Status header
        const statusColor = data.status === 'ok' ? '#4CAF50' : '#FF6B6B';
        const statusIcon = data.status === 'ok' ? 'OK' : 'INCOMPLETE';
        html += `<p style="color: ${statusColor}; font-weight: bold; font-size: 14px; margin-bottom: 12px;">STATUS: ${statusIcon}</p>`;
        
        // Summary
        html += `<p style="color: #b0b0b0; margin-bottom: 8px;">Supabase URL: <span style="color: ${data.supabase_url === 'configured' ? '#4CAF50' : '#FF6B6B'};">${data.supabase_url}</span></p>`;
        
        if (data.summary) {
            html += `<p style="color: #b0b0b0;">Tables: <span style="color: #D4AF37;">${data.summary.existing}/${data.summary.total_tables}</span> configured</p>`;
            if (data.summary.missing > 0) {
                html += `<p style="color: #FF6B6B;">Missing: ${data.summary.missing_tables.join(', ')}</p>`;
            }
        }
        
        html += '<hr style="border: none; border-top: 1px solid #404040; margin: 16px 0;">';
        html += '<p style="color: #D4AF37; font-weight: bold; margin-bottom: 8px;">TABLE DETAILS:</p>';
        
        // Table details
        if (data.tables) {
            for (const [tableName, info] of Object.entries(data.tables)) {
                const tableStatus = info.exists ? '#4CAF50' : '#FF6B6B';
                const icon = info.exists ? '[OK]' : '[MISSING]';
                html += `<p style="color: ${tableStatus}; margin: 4px 0;">${icon} ${tableName}`;
                
                if (info.exists && info.rows !== undefined && info.rows !== null) {
                    html += ` <span style="color: #888;">(${info.rows} rows)</span>`;
                }
                
                if (info.error) {
                    html += `<br><span style="color: #FF6B6B; margin-left: 20px; font-size: 11px;">Error: ${info.error}</span>`;
                    if (info.code) {
                        html += ` <span style="color: #888;">[${info.code}]</span>`;
                    }
                }
                html += '</p>';
            }
        }
        
        html += '<hr style="border: none; border-top: 1px solid #404040; margin: 16px 0;">';
        html += `<p style="color: #888; font-size: 11px;">Completed in ${duration}ms at ${endTime.toLocaleTimeString()}</p>`;
        
        output.innerHTML = html;
        
        // Update status
        if (statusDiv && timeSpan) {
            statusDiv.style.display = 'block';
            timeSpan.textContent = `Last check: ${endTime.toLocaleTimeString()} (${duration}ms)`;
        }
        
    } catch (error) {
        output.innerHTML = `<p style="color: #FF6B6B;">Error: ${error.message}</p><p style="color: #888; margin-top: 8px;">Make sure the backend server is running.</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Run Database Check';
        btn.style.opacity = '1';
    }
}

let cachedAccounts = [];

async function loadAccountsForDropdown() {
    try {
        const response = await fetch('/api/accounts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            // API returns { accounts: [], tree: [] }, we need the flat accounts array
            cachedAccounts = data.accounts || data || [];
            // Ensure cachedAccounts is always an array
            if (!Array.isArray(cachedAccounts)) {
                console.warn('cachedAccounts is not an array, resetting to empty array');
                cachedAccounts = [];
            }
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
        cachedAccounts = []; // Ensure it's an array even on error
    }
}

function populateAccountDropdown(selectedAccountName = '') {
    const select = document.getElementById('userAccount');
    select.innerHTML = '<option value="">Select an account...</option>';
    
    // Defensive check to ensure cachedAccounts is an array
    if (!Array.isArray(cachedAccounts)) {
        console.warn('populateAccountDropdown: cachedAccounts is not an array');
        return;
    }
    
    cachedAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.name;
        option.textContent = account.name;
        if (account.name === selectedAccountName) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function handleContactVisibilityChange() {
    const visibility = document.getElementById('contactVisibility').value;
    const allowedSection = document.getElementById('allowedContactsSection');
    
    if (visibility === 'allowed_only') {
        allowedSection.style.display = 'block';
        loadAllowedContacts();
    } else {
        allowedSection.style.display = 'none';
    }
}

async function loadAllowedContacts() {
    const container = document.getElementById('allowedContactsContainer');
    const existingAllowed = currentUserData?.permissions?.allowed_contacts || [];
    
    if (!availableUsers || availableUsers.length === 0) {
        await fetchAvailableUsers();
    }
    
    let html = '';
    availableUsers.forEach(user => {
        if (user.id !== currentUserId) {
            const isChecked = existingAllowed.includes(user.id) ? 'checked' : '';
            html += `
                <label style="display: flex; align-items: center; padding: 6px; border-bottom: 1px solid #333; cursor: pointer;">
                    <input type="checkbox" class="allowed-contact" value="${user.id}" ${isChecked} style="margin-right: 10px;">
                    <span style="color: #FFFFFF; font-size: 13px;">${user.username || user.email}</span>
                </label>
            `;
        }
    });
    container.innerHTML = html || '<p style="color: #808080; text-align: center; padding: 10px;">No other users available</p>';
}

async function openEditUserModal(userId) {
    currentUserId = userId;
    try {
        console.log('[Step 1] Fetching user with ID:', userId);
        const response = await fetch(`/api/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('[Step 2] Response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Step 2] Error response:', errorText);
            throw new Error(`Failed to fetch user: ${response.status} - ${errorText}`);
        }
        currentUserData = await response.json();
        console.log('[Step 3] User data loaded successfully');

        // Load accounts for dropdown
        console.log('[Step 4] Loading accounts for dropdown...');
        await loadAccountsForDropdown();
        console.log('[Step 5] Populating account dropdown...');
        populateAccountDropdown(currentUserData.account_name || '');

        console.log('[Step 6] Setting modal fields...');
        document.getElementById('modalTitle').textContent = 'Edit User';
        document.getElementById('userName').value = currentUserData.username || '';
        document.getElementById('userEmail').value = currentUserData.email || '';
        document.getElementById('userBillingPlan').value = currentUserData.billing_plan || 'basic';
        document.getElementById('creatorName').value = currentUserData.creator_id ? (currentUserData.creator_id === currentUserData.id ? 'System' : currentUserData.creator_id) : 'System';
        document.getElementById('createdDate').value = currentUserData.created_at ? new Date(currentUserData.created_at).toLocaleString() : '';
        document.getElementById('lastVisit').value = currentUserData.last_login ? new Date(currentUserData.last_login).toLocaleString() : 'Never';
        document.getElementById('lastDevice').value = currentUserData.last_device || '';

        console.log('[Step 7] Setting permissions...');
        const perms = currentUserData.permissions || {};
        document.getElementById('isEnabled').checked = perms.is_enabled !== false;
        document.getElementById('canChangePassword').checked = perms.can_change_password !== false;
        document.getElementById('canCreateGroups').checked = perms.can_create_groups || false;
        document.getElementById('canAccessCms').checked = perms.can_access_cms || false;
        document.getElementById('canEditProfile').checked = perms.can_edit_profile || false;
        
        // Set contact visibility
        console.log('[Step 8] Setting contact visibility...');
        const contactVisibility = perms.contact_visibility || 'all';
        document.getElementById('contactVisibility').value = contactVisibility;
        handleContactVisibilityChange();
        
        console.log('[Step 9] Setting location tracking...');
        document.getElementById('locationTracking').checked = currentUserData.location_tracking || false;

        // Clear password fields when editing (user can optionally set new password)
        console.log('[Step 10] Clearing password fields...');
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        // Apply billing plan restrictions dynamically
        console.log('[Step 11] Applying billing plan restrictions...');
        applyBillingPlanRestrictions();

        console.log('[Step 12] Opening modal...');
        document.getElementById('userModal').classList.add('active');
        console.log('[Step 13] Edit modal opened successfully!');
    } catch (error) {
        console.error('Error loading user:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        alert('Failed to load user: ' + (error.message || 'Unknown error'));
    }
}

async function openAddUserModal() {
    currentUserId = null;
    currentUserData = null;
    
    // Load accounts for dropdown
    await loadAccountsForDropdown();
    populateAccountDropdown('');
    
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userEmail').disabled = false;
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userBillingPlan').value = 'basic';
    document.getElementById('creatorName').value = '';
    document.getElementById('createdDate').value = '';
    document.getElementById('lastVisit').value = '';
    document.getElementById('lastDevice').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    document.getElementById('isEnabled').checked = true;
    document.getElementById('canChangePassword').checked = true;
    document.getElementById('canCreateGroups').checked = false;
    document.getElementById('canAccessCms').checked = false;
    document.getElementById('canEditProfile').checked = false;
    
    // Reset contact visibility
    document.getElementById('contactVisibility').value = 'all';
    document.getElementById('allowedContactsSection').style.display = 'none';
    
    document.getElementById('locationTracking').checked = false;

    // Apply billing plan restrictions dynamically for new users
    applyBillingPlanRestrictions();

    document.getElementById('userModal').classList.add('active');
}

function closeModal() {
    document.getElementById('userModal').classList.remove('active');
    currentUserId = null;
    currentUserData = null;
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

async function saveUser() {
    const userName = document.getElementById('userName').value;
    const userEmail = document.getElementById('userEmail').value;
    const userAccount = document.getElementById('userAccount').value;
    const billingPlan = document.getElementById('userBillingPlan').value;
    const locationTracking = document.getElementById('locationTracking').checked;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords if provided
    if (newPassword || confirmPassword) {
        if (!newPassword || !confirmPassword) {
            alert('Please fill in both password fields or leave them blank');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }
    }

    // Get billing plan configuration and apply restrictions
    const planConfig = BILLING_PLANS[billingPlan] || BILLING_PLANS.basic;
    const planPerms = planConfig.permissions;
    
    // Get contact visibility and allowed contacts
    const contactVisibility = document.getElementById('contactVisibility').value;
    const allowedContactCheckboxes = document.querySelectorAll('.allowed-contact:checked');
    const allowedContacts = Array.from(allowedContactCheckboxes).map(cb => cb.value);
    
    // Build permissions based on billing plan restrictions
    const permissions = {
        is_enabled: document.getElementById('isEnabled').checked,
        can_change_password: document.getElementById('canChangePassword').checked,
        // Apply billing plan restrictions - if plan doesn't allow, force false
        can_create_groups: planPerms.can_create_groups === true ? document.getElementById('canCreateGroups').checked : false,
        can_access_cms: planPerms.can_access_cms === true ? document.getElementById('canAccessCms').checked : (planPerms.can_access_cms === 'limited' ? 'limited' : false),
        can_edit_profile: planPerms.can_edit_profile === true ? document.getElementById('canEditProfile').checked : false,
        // Store additional billing plan metadata
        location_tracking_level: planPerms.location_tracking,
        contact_list_access: planPerms.contact_list,
        group_management_level: planPerms.group_management,
        // Contact visibility settings
        contact_visibility: contactVisibility,
        allowed_contacts: contactVisibility === 'allowed_only' ? allowedContacts : []
    };

    try {
        if (currentUserId) {
            // Update existing user
            const updateData = {
                username: userName,
                account_name: userAccount,
                billing_plan: billingPlan,
                location_tracking: locationTracking,
                permissions
            };

            if (newPassword) {
                updateData.password = newPassword;
            }

            const response = await fetch(`/api/users/${currentUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) throw new Error('Failed to update user');
        } else {
            // Create new user
            if (!userEmail) {
                alert('Email is required when creating a new user');
                return;
            }
            if (!newPassword) {
                alert('Password is required when creating a new user');
                return;
            }

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: userEmail,
                    username: userName,
                    password: newPassword,
                    account_name: userAccount,
                    billing_plan: billingPlan,
                    permissions
                })
            });

            if (!response.ok) throw new Error('Failed to create user');
        }

        closeModal();
        loadUsers();
        alert('User saved successfully');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete user');
        loadUsers();
        alert('User deleted successfully');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('loginForm').reset();
}

// PASSWORD RESET FUNCTIONS
function showForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').classList.add('active');
    document.getElementById('resetStep1').style.display = 'block';
    document.getElementById('resetStep2').style.display = 'none';
    document.getElementById('resetError').style.display = 'none';
    currentResetToken = null;
}

function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').classList.remove('active');
    document.getElementById('resetEmail').value = '';
    document.getElementById('resetUsername').value = '';
    document.getElementById('resetError').style.display = 'none';
    currentResetToken = null;
}

async function requestPasswordReset() {
    const email = document.getElementById('resetEmail').value;
    const resetError = document.getElementById('resetError');

    if (!email) {
        resetError.textContent = 'Email is required';
        resetError.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/auth/request-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        // Show success message regardless of response code
        document.getElementById('resetStep1').style.display = 'none';
        document.getElementById('resetStep2').style.display = 'block';
        resetError.style.display = 'none';
    } catch (error) {
        resetError.textContent = 'Network error: ' + error.message;
        resetError.style.display = 'block';
    }
}

// ============= USER TRACKING FUNCTIONS =============
let trackingMap = null;
let trackingMarkers = [];

// Custom marker colors for users
const markerColors = ['#D4AF37', '#4CAF50', '#FF6B6B', '#8B5CF6', '#00BCD4', '#FF9800', '#E91E63', '#3F51B5'];

function createColoredMarker(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width: 24px;
            height: 24px;
            background: ${color};
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

function initTrackingMap() {
    const mapContainer = document.getElementById('trackingMap');
    if (!mapContainer) return null;
    
    // Remove existing map if any
    if (trackingMap) {
        trackingMap.remove();
        trackingMap = null;
    }
    
    // Initialize Leaflet map with OpenStreetMap
    const map = L.map('trackingMap', {
        zoomControl: true,
        attributionControl: true
    }).setView([51.505, -0.09], 3);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    return map;
}

async function loadTrackedUsers() {
    const tbody = document.getElementById('trackedUsersTableBody');
    const mapPlaceholder = document.getElementById('mapPlaceholder');
    const mapElement = document.getElementById('trackingMap');
    
    try {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading tracked users...</td></tr>';
        
        const response = await fetch('/api/users/tracked', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch tracked users');
        
        const users = await response.json();
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #808080;">No users with location tracking enabled. Enable location tracking in user settings.</td></tr>';
            mapElement.style.display = 'none';
            mapPlaceholder.style.display = 'flex';
            return;
        }
        
        // Render table
        tbody.innerHTML = users.map(user => {
            const lastUpdate = user.last_location_update ? new Date(user.last_location_update).toLocaleString() : 'Offline';
            const lat = user.last_latitude ? parseFloat(user.last_latitude).toFixed(6) : '-';
            const lng = user.last_longitude ? parseFloat(user.last_longitude).toFixed(6) : '-';
            
            return `
                <tr style="border-bottom: 1px solid #333;">
                    <td style="padding: 12px 16px; color: #FFFFFF;">${user.username || 'N/A'}</td>
                    <td style="padding: 12px 16px; color: #b0b0b0;">${user.email || '-'}</td>
                    <td style="padding: 12px 16px; color: #D4AF37; font-family: monospace;">${lat}</td>
                    <td style="padding: 12px 16px; color: #D4AF37; font-family: monospace;">${lng}</td>
                    <td style="padding: 12px 16px; color: #808080;">${lastUpdate}</td>
                    <td style="padding: 12px 16px; color: #b0b0b0;">${user.last_device || '-'}</td>
                </tr>
            `;
        }).join('');
        
        // Filter users with valid location data
        const usersWithLocation = users.filter(u => u.last_latitude && u.last_longitude);
        
        if (usersWithLocation.length > 0) {
            mapPlaceholder.style.display = 'none';
            mapElement.style.display = 'block';
            
            // Initialize map if not already done
            if (!trackingMap) {
                trackingMap = initTrackingMap();
            }
            
            // Clear existing markers
            trackingMarkers.forEach(marker => trackingMap.removeLayer(marker));
            trackingMarkers = [];
            
            // Add markers for each user
            const bounds = L.latLngBounds();
            
            usersWithLocation.forEach((user, index) => {
                const lat = parseFloat(user.last_latitude);
                const lng = parseFloat(user.last_longitude);
                const color = markerColors[index % markerColors.length];
                
                const marker = L.marker([lat, lng], {
                    icon: createColoredMarker(color)
                }).addTo(trackingMap);
                
                // Create popup with user info
                const lastUpdate = user.last_location_update ? 
                    new Date(user.last_location_update).toLocaleString() : 'Offline';
                
                marker.bindPopup(`
                    <div style="min-width: 150px;">
                        <strong style="color: #333;">${user.username || 'Unknown'}</strong><br>
                        <span style="color: #666; font-size: 12px;">${user.email || ''}</span><br>
                        <hr style="margin: 6px 0; border: none; border-top: 1px solid #ddd;">
                        <span style="font-size: 11px; color: #888;">
                            Lat: ${lat.toFixed(6)}<br>
                            Lng: ${lng.toFixed(6)}<br>
                            Updated: ${lastUpdate}
                        </span>
                    </div>
                `);
                
                trackingMarkers.push(marker);
                bounds.extend([lat, lng]);
            });
            
            // Fit map to show all markers with padding
            if (usersWithLocation.length === 1) {
                trackingMap.setView([usersWithLocation[0].last_latitude, usersWithLocation[0].last_longitude], 15);
            } else {
                trackingMap.fitBounds(bounds, { padding: [50, 50] });
            }
        } else {
            mapElement.style.display = 'none';
            mapPlaceholder.innerHTML = '<p style="color: #666; margin-bottom: 10px;">Users found but no location data yet</p><p style="color: #808080; font-size: 12px;">Location data will appear once users share their position</p>';
            mapPlaceholder.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading tracked users:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #FF6B6B;">Failed to load tracked users: ' + error.message + '</td></tr>';
    }
    
    // Auto-refresh every 60 seconds
    setTimeout(loadTrackedUsers, 60000);
}

// ============= LOGS FUNCTIONS =============
let loadFromDatabase = true;

async function loadLogs(filter = '') {
    try {
        let params = new URLSearchParams();
        if (filter) params.set('filter', filter);
        if (loadFromDatabase) params.set('source', 'database');
        
        const queryString = params.toString() ? '?' + params.toString() : '';
        const response = await fetch(`/api/logs${queryString}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load logs');
        
        const logs = await response.json();
        renderLogs(logs);
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('logsTableBody').innerHTML = 
            '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #FF6B6B;">Failed to load logs: ' + error.message + '</td></tr>';
    }
}

function renderLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #808080;">No logs found. Logs will persist after actions are taken.</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const levelColor = log.level === 'ERROR' ? '#FF6B6B' : 
                           log.level === 'WARN' ? '#FFB84D' : 
                           log.level === 'INFO' ? '#4CAF50' : '#FFFFFF';
        
        const timestamp = new Date(log.timestamp).toLocaleString();
        const details = log.details ? ` - ${log.details}` : '';
        const userInfo = log.user ? `<span style="color: #D4AF37;">${log.user}</span>` : '<span style="color: #666;">-</span>';
        
        return `
            <tr style="border-bottom: 1px solid #333;">
                <td style="padding: 12px 16px; color: #b0b0b0; font-size: 12px; white-space: nowrap;">${timestamp}</td>
                <td style="padding: 12px 16px;"><span style="color: ${levelColor}; font-weight: 600; font-size: 12px;">${log.level}</span></td>
                <td style="padding: 12px 16px; color: #D4AF37; font-size: 13px;">${log.source}</td>
                <td style="padding: 12px 16px; color: #FFFFFF; font-size: 13px;">${log.message}${details}</td>
                <td style="padding: 12px 16px; font-size: 12px;">${userInfo}</td>
            </tr>
        `;
    }).join('');
}

function toggleLogSource() {
    loadFromDatabase = !loadFromDatabase;
    const btn = document.getElementById('logSourceBtn');
    if (btn) {
        btn.textContent = loadFromDatabase ? 'Database' : 'Memory';
        btn.style.background = loadFromDatabase ? '#4CAF50' : '#2a2a2a';
    }
    refreshLogs();
}

function refreshLogs() {
    const filter = document.getElementById('logFilter').value;
    loadLogs(filter);
}

async function clearLogs() {
    if (!confirm('Are you sure you want to clear all logs?')) return;
    
    try {
        const response = await fetch('/api/logs', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to clear logs');
        
        loadLogs();
        alert('Logs cleared successfully');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Add event listener for log filter
document.getElementById('logFilter')?.addEventListener('change', refreshLogs);

// ============= GROUP MANAGEMENT FUNCTIONS =============

let availableUsers = [];

async function fetchAvailableUsers() {
    try {
        const response = await fetch('/api/users/available', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        availableUsers = await response.json();
        return availableUsers;
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

function renderMembersCheckboxes(containerId, prefix) {
    const users = availableUsers;
    const container = document.getElementById(containerId);
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p style="color: #808080; text-align: center; padding: 20px;">No users available</p>';
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="checkbox-group" style="margin-bottom: 8px;">
            <input type="checkbox" id="${prefix}_${user.id}" value="${user.id}" class="${prefix}-member">
            <label for="${prefix}_${user.id}" style="margin: 0; font-weight: normal; color: #FFFFFF;">${user.username} (${user.email})</label>
        </div>
    `).join('');
}

// Groups data cache
let allGroups = [];

async function fetchAllGroups() {
    try {
        const response = await fetch('/api/groups', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch groups');
        allGroups = await response.json();
        return allGroups;
    } catch (error) {
        console.error('Error fetching groups:', error);
        return [];
    }
}

function renderParentGroupDropdown() {
    const select = document.getElementById('parentGroupId');
    select.innerHTML = '<option value="">-- No Parent (Main Group) --</option>';
    
    // Build hierarchical options
    function addGroupOptions(groups, level = 0) {
        const mainGroups = groups.filter(g => !g.parent_group_id);
        mainGroups.forEach(group => {
            const indent = '\u00A0'.repeat(level * 4);
            select.innerHTML += `<option value="${group.id}">${indent}${group.name}</option>`;
            // Add child groups
            const children = groups.filter(g => g.parent_group_id === group.id);
            children.forEach(child => {
                const childIndent = '\u00A0'.repeat((level + 1) * 4);
                select.innerHTML += `<option value="${child.id}">${childIndent}└─ ${child.name}</option>`;
            });
        });
    }
    
    addGroupOptions(allGroups);
}

async function openAddGroupModal() {
    document.getElementById('groupError').style.display = 'none';
    document.getElementById('groupName').value = '';
    document.getElementById('groupDescription').value = '';
    document.getElementById('parentGroupId').value = '';
    
    // Fetch users and groups
    await Promise.all([fetchAvailableUsers(), fetchAllGroups()]);
    renderMembersCheckboxes('groupMembersContainer', 'group');
    renderParentGroupDropdown();
    
    document.getElementById('groupModal').classList.add('active');
}

function closeGroupModal() {
    document.getElementById('groupModal').classList.remove('active');
}

async function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    const parentGroupId = document.getElementById('parentGroupId').value;
    const errorDiv = document.getElementById('groupError');
    const btn = event.target;

    if (!name) {
        errorDiv.textContent = 'Group name is required';
        errorDiv.style.display = 'block';
        return;
    }

    const memberCheckboxes = document.querySelectorAll('.group-member:checked');
    const memberIds = Array.from(memberCheckboxes).map(cb => cb.value);

    btn.disabled = true;
    btn.textContent = 'Creating...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch('/api/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                description,
                parentGroupId: parentGroupId || null,
                memberIds
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create group');
        }

        alert('Group created successfully!');
        closeGroupModal();
        loadGroups(); // Refresh the groups table
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Group';
    }
}

async function loadGroups() {
    await fetchAllGroups();
    renderGroupsTable();
}

function renderGroupsTable() {
    const tbody = document.querySelector('#groups table tbody');
    if (!tbody) return;

    if (allGroups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No groups found. Create your first group!</td></tr>';
        return;
    }

    // Build hierarchical structure
    const mainGroups = allGroups.filter(g => !g.parent_group_id);
    let html = '';

    function renderGroup(group, level = 0) {
        const indent = level > 0 ? '&nbsp;'.repeat(level * 4) + '└─ ' : '';
        const parentName = group.parent_group_id 
            ? allGroups.find(g => g.id === group.parent_group_id)?.name || '-'
            : '-';
        const memberCount = group.member_count || 0;
        const createdDate = new Date(group.created_at).toLocaleDateString();
        
        html += `
            <tr data-group-id="${group.id}">
                <td style="font-weight: ${level === 0 ? '600' : '400'}; color: ${level === 0 ? '#D4AF37' : '#FFFFFF'};">${indent}${group.name}</td>
                <td>${parentName}</td>
                <td>${memberCount}</td>
                <td>${level === 0 ? 'Main Group' : 'Subgroup'}</td>
                <td>${createdDate}</td>
                <td>
                    <button onclick="editGroup(${group.id})" style="background: #4CAF50; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; margin-right: 4px;">Edit</button>
                    <button onclick="deleteGroup(${group.id})" style="background: #FF6B6B; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">Delete</button>
                </td>
            </tr>
        `;
        
        // Render children
        const children = allGroups.filter(g => g.parent_group_id === group.id);
        children.forEach(child => renderGroup(child, level + 1));
    }

    mainGroups.forEach(group => renderGroup(group));
    tbody.innerHTML = html;
}

async function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group? This will also delete all subgroups.')) {
        return;
    }

    try {
        const response = await fetch(`/api/groups/${groupId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete group');
        }

        alert('Group deleted successfully!');
        loadGroups();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

let currentEditGroupId = null;
let currentEditGroupData = null;

async function editGroup(groupId) {
    currentEditGroupId = groupId;
    const errorDiv = document.getElementById('editGroupError');
    errorDiv.style.display = 'none';
    
    try {
        // Fetch group details
        const response = await fetch(`/api/groups/${groupId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load group');
        currentEditGroupData = await response.json();
        
        // Populate form fields
        document.getElementById('editGroupName').value = currentEditGroupData.name || '';
        document.getElementById('editGroupDescription').value = currentEditGroupData.description || '';
        
        // Populate parent group dropdown
        const parentSelect = document.getElementById('editGroupParent');
        parentSelect.innerHTML = '<option value="">None (Top-Level Group)</option>';
        
        // Fetch all groups for parent selection
        const groupsResponse = await fetch('/api/groups', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (groupsResponse.ok) {
            const allGroups = await groupsResponse.json();
            allGroups.forEach(g => {
                // Don't allow group to be its own parent or child's parent
                if (g.id !== groupId) {
                    const option = document.createElement('option');
                    option.value = g.id;
                    option.textContent = g.name;
                    if (currentEditGroupData.parent_group_id == g.id) {
                        option.selected = true;
                    }
                    parentSelect.appendChild(option);
                }
            });
        }
        
        // Load users for member selection
        await fetchAvailableUsers();
        renderEditGroupMemberCheckboxes();
        
        document.getElementById('editGroupModal').classList.add('active');
    } catch (error) {
        console.error('Error loading group:', error);
        alert('Failed to load group: ' + error.message);
    }
}

function renderEditGroupMemberCheckboxes() {
    const container = document.getElementById('editGroupMembersContainer');
    const existingMemberIds = currentEditGroupData.memberIds || [];
    
    if (!availableUsers || availableUsers.length === 0) {
        container.innerHTML = '<p style="color: #808080; text-align: center; padding: 20px;">No users available</p>';
        return;
    }
    
    let html = '';
    availableUsers.forEach(user => {
        const isChecked = existingMemberIds.includes(user.id) ? 'checked' : '';
        html += `
            <label style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #333; cursor: pointer;">
                <input type="checkbox" class="edit-group-member" value="${user.id}" ${isChecked} style="margin-right: 12px;">
                <span style="color: #FFFFFF;">${user.username || user.email}</span>
                ${user.email ? `<span style="color: #808080; margin-left: 8px; font-size: 12px;">(${user.email})</span>` : ''}
            </label>
        `;
    });
    container.innerHTML = html;
}

function closeEditGroupModal() {
    document.getElementById('editGroupModal').classList.remove('active');
    currentEditGroupId = null;
    currentEditGroupData = null;
}

async function saveGroupEdit() {
    const name = document.getElementById('editGroupName').value.trim();
    const description = document.getElementById('editGroupDescription').value.trim();
    const parentGroupId = document.getElementById('editGroupParent').value;
    const errorDiv = document.getElementById('editGroupError');
    const btn = event.target;

    if (!name) {
        errorDiv.textContent = 'Group name is required';
        errorDiv.style.display = 'block';
        return;
    }

    const memberCheckboxes = document.querySelectorAll('.edit-group-member:checked');
    const memberIds = Array.from(memberCheckboxes).map(cb => cb.value);

    btn.disabled = true;
    btn.textContent = 'Saving...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(`/api/groups/${currentEditGroupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                description,
                parent_group_id: parentGroupId || null,
                memberIds
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update group');
        }

        alert('Group updated successfully!');
        closeEditGroupModal();
        loadGroups();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

async function openAddEmergencyGroupModal() {
    document.getElementById('emergencyGroupError').style.display = 'none';
    document.getElementById('emergencyGroupName').value = '';
    document.getElementById('emergencyGroupDescription').value = '';
    document.getElementById('alertProtocol').value = 'standard';
    
    // Fetch users
    await fetchAvailableUsers();
    renderMembersCheckboxes('emergencyGroupMembersContainer', 'emergency');
    
    document.getElementById('emergencyGroupModal').classList.add('active');
}

function closeEmergencyGroupModal() {
    document.getElementById('emergencyGroupModal').classList.remove('active');
}

async function createEmergencyGroup() {
    const name = document.getElementById('emergencyGroupName').value.trim();
    const description = document.getElementById('emergencyGroupDescription').value.trim();
    const alertProtocol = document.getElementById('alertProtocol').value;
    const errorDiv = document.getElementById('emergencyGroupError');
    const btn = event.target;

    if (!name) {
        errorDiv.textContent = 'Emergency group name is required';
        errorDiv.style.display = 'block';
        return;
    }

    const memberCheckboxes = document.querySelectorAll('.emergency-member:checked');
    const memberIds = Array.from(memberCheckboxes).map(cb => cb.value);

    btn.disabled = true;
    btn.textContent = 'Creating...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch('/api/emergency-groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                description,
                alertProtocol,
                memberIds
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create emergency group');
        }

        alert('Emergency group created successfully!');
        closeEmergencyGroupModal();
        // Optionally refresh emergency groups list here
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Emergency Group';
    }
}

// ============= BILLING PLAN CONFIGURATION =============

const BILLING_PLANS = {
    basic: {
        name: 'Basic',
        tier: 1,
        permissions: {
            can_create_groups: false,
            can_access_cms: false,
            can_edit_profile: false,
            location_tracking: 'active_only',
            contact_list: 'allowed_only',
            group_management: 'backend_only'
        }
    },
    admin: {
        name: 'Admin',
        tier: 2,
        permissions: {
            can_create_groups: true,
            can_access_cms: 'limited',
            can_edit_profile: true,
            location_tracking: 'full',
            contact_list: 'admin_and_below',
            group_management: 'frontend_admin'
        }
    },
    executive: {
        name: 'Executive',
        tier: 3,
        permissions: {
            can_create_groups: true,
            can_access_cms: true,
            can_edit_profile: true,
            location_tracking: 'full',
            contact_list: 'all',
            group_management: 'full_control',
            can_allocate_permissions: true
        }
    }
};

// Apply billing plan restrictions when plan changes
function applyBillingPlanRestrictions() {
    const plan = document.getElementById('userBillingPlan').value;
    const config = BILLING_PLANS[plan];
    
    if (!config) return;

    // Update permission checkboxes based on billing plan
    const canCreateGroups = document.getElementById('canCreateGroups');
    const canAccessCms = document.getElementById('canAccessCms');
    const canEditProfile = document.getElementById('canEditProfile');
    const locationTracking = document.getElementById('locationTracking');

    if (canCreateGroups) {
        canCreateGroups.checked = config.permissions.can_create_groups === true;
        canCreateGroups.disabled = plan === 'basic';
    }
    
    if (canAccessCms) {
        canAccessCms.checked = config.permissions.can_access_cms === true;
        canAccessCms.disabled = plan === 'basic';
    }
    
    if (canEditProfile) {
        canEditProfile.checked = config.permissions.can_edit_profile === true;
        canEditProfile.disabled = plan === 'basic';
    }
    
    if (locationTracking) {
        locationTracking.checked = config.permissions.location_tracking === 'full';
        locationTracking.disabled = plan === 'basic';
    }

    // Show restriction notice for Basic plan
    let restrictionNotice = document.getElementById('billingRestrictionNotice');
    if (!restrictionNotice) {
        restrictionNotice = document.createElement('div');
        restrictionNotice.id = 'billingRestrictionNotice';
        restrictionNotice.style.cssText = 'background: #2a2a2a; border: 1px solid #FF6B6B; border-radius: 6px; padding: 12px; margin-top: 16px; display: none;';
        const accessTab = document.getElementById('access');
        if (accessTab) accessTab.appendChild(restrictionNotice);
    }
    
    if (plan === 'basic') {
        restrictionNotice.innerHTML = '<p style="color: #FF6B6B; font-size: 13px; margin: 0;"><strong>Basic Plan Restrictions:</strong> This user has limited access. All permissions are controlled by the backend.</p>';
        restrictionNotice.style.display = 'block';
    } else if (plan === 'admin') {
        restrictionNotice.innerHTML = '<p style="color: #FFB84D; font-size: 13px; margin: 0;"><strong>Admin Plan:</strong> CMS access is limited and must be allocated by an Executive user.</p>';
        restrictionNotice.style.display = 'block';
    } else {
        restrictionNotice.style.display = 'none';
    }
}

// Update billing plan user counts
function updateBillingPlanCounts(users) {
    let basicCount = 0;
    let adminCount = 0;
    let executiveCount = 0;
    
    if (users && users.length > 0) {
        users.forEach(user => {
            const plan = (user.billing_plan || '').toLowerCase();
            if (plan === 'basic') basicCount++;
            else if (plan === 'admin') adminCount++;
            else if (plan === 'executive' || plan === 'enterprise') executiveCount++;
        });
    }
    
    const basicEl = document.getElementById('basicUsersCount');
    const adminEl = document.getElementById('adminUsersCount');
    const executiveEl = document.getElementById('executiveUsersCount');
    
    if (basicEl) basicEl.textContent = basicCount;
    if (adminEl) adminEl.textContent = adminCount;
    if (executiveEl) executiveEl.textContent = executiveCount;
}

// Get billing plan permissions for API calls
function getBillingPlanPermissions(plan) {
    return BILLING_PLANS[plan] ? BILLING_PLANS[plan].permissions : BILLING_PLANS.basic.permissions;
}

// Check if user can access feature based on billing plan
function canAccessFeature(userPlan, feature) {
    const config = BILLING_PLANS[userPlan] || BILLING_PLANS.basic;
    const permission = config.permissions[feature];
    
    if (permission === true || permission === 'full' || permission === 'all' || permission === 'full_control') {
        return true;
    }
    if (permission === 'limited' || permission === 'admin_and_below' || permission === 'frontend_admin' || permission === 'active_only' || permission === 'allowed_only') {
        return 'limited';
    }
    return false;
}

// ============= ACCOUNTS MANAGEMENT =============
let accountsData = { accounts: [], tree: [] };
let currentAccountId = null;
let selectedAccountForUsers = null;
let selectedAccountForChannels = null;

// Load accounts from API
async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.warn('Accounts API not available - tables may not exist yet');
            document.getElementById('accountTreeContainer').innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: #FFB84D; margin-bottom: 10px;">Accounts feature requires database setup</p>
                    <p style="color: #666; font-size: 12px;">Run the SQL queries to create the accounts table</p>
                </div>
            `;
            return;
        }
        
        accountsData = await response.json();
        renderAccountTree();
        updateAccountStats();
    } catch (error) {
        console.error('Load accounts error:', error);
        document.getElementById('accountTreeContainer').innerHTML = `
            <p style="color: #FF6B6B; text-align: center; padding: 20px;">Error loading accounts</p>
        `;
    }
}

// Render account tree
function renderAccountTree() {
    const container = document.getElementById('accountTreeContainer');
    
    if (!accountsData.tree || accountsData.tree.length === 0) {
        container.innerHTML = `
            <p style="color: #666; text-align: center; padding: 20px;">No accounts yet. Create your first account!</p>
        `;
        return;
    }

    const renderNode = (node, level = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const indent = level * 20;
        
        let html = `
            <div class="account-node" style="padding: 8px 8px 8px ${indent + 8}px; cursor: pointer; border-radius: 4px; margin-bottom: 2px; transition: background 0.2s;" 
                 onclick="selectAccount(${node.id})"
                 onmouseover="this.style.background='#333'" 
                 onmouseout="this.style.background='transparent'"
                 data-account-id="${node.id}">
                <span style="color: ${hasChildren ? '#D4AF37' : '#808080'}; margin-right: 6px;">${hasChildren ? '&#9660;' : '&#9679;'}</span>
                <span style="color: #FFFFFF; font-size: 13px;">${node.name}</span>
                <span style="color: #666; font-size: 11px; margin-left: 8px;">(${node.billing_plan || 'basic'})</span>
            </div>
        `;
        
        if (hasChildren) {
            node.children.forEach(child => {
                html += renderNode(child, level + 1);
            });
        }
        
        return html;
    };

    let html = '';
    accountsData.tree.forEach(node => {
        html += renderNode(node);
    });
    
    container.innerHTML = html;
}

// Select account and show details
async function selectAccount(accountId) {
    currentAccountId = accountId;
    
    // Highlight selected node
    document.querySelectorAll('.account-node').forEach(node => {
        node.style.background = node.dataset.accountId == accountId ? '#404040' : 'transparent';
    });

    try {
        const response = await fetch(`/api/accounts/${accountId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load account');
        
        const account = await response.json();
        renderAccountDetails(account);
    } catch (error) {
        console.error('Load account details error:', error);
    }
}

// Render account details panel
function renderAccountDetails(account) {
    const container = document.getElementById('accountDetailsContent');
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div>
                <h3 style="color: #D4AF37; font-size: 20px; margin-bottom: 6px;">${account.name}</h3>
                <p style="color: #666; font-size: 13px;">${account.description || 'No description'}</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="openEditAccountModal(${account.id})" style="background: #D4AF37; color: #1a1a1a; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">Edit</button>
                <button onclick="deleteAccount(${account.id})" style="background: #FF6B6B; color: #FFFFFF; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">Delete</button>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="background: #1a1a1a; border-radius: 6px; padding: 12px;">
                <p style="color: #666; font-size: 11px;">Billing Plan</p>
                <p style="color: #D4AF37; font-size: 14px; font-weight: 600; text-transform: capitalize;">${account.billing_plan || 'Basic'}</p>
            </div>
            <div style="background: #1a1a1a; border-radius: 6px; padding: 12px;">
                <p style="color: #666; font-size: 11px;">Users</p>
                <p style="color: #4CAF50; font-size: 14px; font-weight: 600;">${(account.users || []).length}</p>
            </div>
            <div style="background: #1a1a1a; border-radius: 6px; padding: 12px;">
                <p style="color: #666; font-size: 11px;">Channels</p>
                <p style="color: #8B5CF6; font-size: 14px; font-weight: 600;">${(account.channels || []).length}</p>
            </div>
        </div>

        <!-- Users Section -->
        <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="color: #FFFFFF; font-size: 14px;">Assigned Users</h4>
                <button onclick="openAssignUsersModal(${account.id}, '${account.name}')" style="background: transparent; border: 1px solid #D4AF37; color: #D4AF37; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">+ Assign Users</button>
            </div>
            <div style="background: #1a1a1a; border-radius: 6px; padding: 12px; max-height: 200px; overflow-y: auto;">
                ${(account.users || []).length > 0 
                    ? account.users.map(user => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #333;">
                            <div>
                                <span style="color: #FFFFFF; font-size: 13px;">${user.username || user.email}</span>
                                <span style="color: #666; font-size: 11px; margin-left: 8px;">${user.billing_plan || 'basic'}</span>
                            </div>
                            <button onclick="removeUserFromAccount(${account.id}, '${user.id}')" style="background: transparent; border: none; color: #FF6B6B; cursor: pointer; font-size: 18px;" title="Remove user">&times;</button>
                        </div>
                    `).join('')
                    : '<p style="color: #666; text-align: center; padding: 12px;">No users assigned</p>'
                }
            </div>
        </div>

        <!-- Channels Section -->
        <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="color: #FFFFFF; font-size: 14px;">Assigned Channels</h4>
                <button onclick="openAssignChannelsModal(${account.id}, '${account.name}')" style="background: transparent; border: 1px solid #8B5CF6; color: #8B5CF6; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">+ Assign Channels</button>
            </div>
            <div style="background: #1a1a1a; border-radius: 6px; padding: 12px; max-height: 200px; overflow-y: auto;">
                ${(account.channels || []).length > 0 
                    ? account.channels.map(ch => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #333;">
                            <div>
                                <span style="color: #FFFFFF; font-size: 13px;">${ch.channel_id}</span>
                                <span style="color: #4CAF50; font-size: 11px; margin-left: 8px;">${ch.access_level || 'read_write'}</span>
                            </div>
                            <button onclick="removeChannelFromAccount(${account.id}, '${ch.channel_id}')" style="background: transparent; border: none; color: #FF6B6B; cursor: pointer; font-size: 18px;" title="Remove channel">&times;</button>
                        </div>
                    `).join('')
                    : '<p style="color: #666; text-align: center; padding: 12px;">No channels assigned</p>'
                }
            </div>
        </div>

        <!-- Child Accounts -->
        ${(account.childAccounts || []).length > 0 ? `
            <div>
                <h4 style="color: #FFFFFF; font-size: 14px; margin-bottom: 12px;">Sub-Accounts</h4>
                <div style="background: #1a1a1a; border-radius: 6px; padding: 12px;">
                    ${account.childAccounts.map(child => `
                        <div style="padding: 8px 0; border-bottom: 1px solid #333; cursor: pointer;" onclick="selectAccount(${child.id})">
                            <span style="color: #D4AF37; margin-right: 6px;">&#8627;</span>
                            <span style="color: #FFFFFF; font-size: 13px;">${child.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// Update account statistics
function updateAccountStats() {
    const accounts = accountsData.accounts || [];
    const topLevel = accounts.filter(a => !a.parent_account_id);
    const subAccounts = accounts.filter(a => a.parent_account_id);
    
    document.getElementById('totalAccountsCount').textContent = accounts.length;
    document.getElementById('topLevelAccountsCount').textContent = topLevel.length;
    document.getElementById('subAccountsCount').textContent = subAccounts.length;
    
    // Count assigned users (would need to fetch from API for accuracy)
    document.getElementById('assignedUsersCount').textContent = '-';
}

// Open add account modal
function openAddAccountModal() {
    currentAccountId = null;
    document.getElementById('accountModalTitle').textContent = 'Add Account';
    document.getElementById('accountName').value = '';
    document.getElementById('accountDescription').value = '';
    document.getElementById('accountBillingPlan').value = 'basic';
    document.getElementById('saveAccountBtn').textContent = 'Create Account';
    
    // Populate parent account dropdown
    const parentSelect = document.getElementById('accountParent');
    parentSelect.innerHTML = '<option value="">None (Top-Level Account)</option>';
    (accountsData.accounts || []).forEach(account => {
        parentSelect.innerHTML += `<option value="${account.id}">${account.name}</option>`;
    });
    
    document.getElementById('accountModal').classList.add('active');
}

// Open edit account modal
async function openEditAccountModal(accountId) {
    currentAccountId = accountId;
    
    try {
        const response = await fetch(`/api/accounts/${accountId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load account');
        
        const account = await response.json();
        
        document.getElementById('accountModalTitle').textContent = 'Edit Account';
        document.getElementById('accountName').value = account.name;
        document.getElementById('accountDescription').value = account.description || '';
        document.getElementById('accountBillingPlan').value = account.billing_plan || 'basic';
        document.getElementById('saveAccountBtn').textContent = 'Save Changes';
        
        // Populate parent account dropdown (excluding self and descendants)
        const parentSelect = document.getElementById('accountParent');
        parentSelect.innerHTML = '<option value="">None (Top-Level Account)</option>';
        (accountsData.accounts || []).filter(a => a.id !== accountId).forEach(a => {
            parentSelect.innerHTML += `<option value="${a.id}" ${a.id === account.parent_account_id ? 'selected' : ''}>${a.name}</option>`;
        });
        
        document.getElementById('accountModal').classList.add('active');
    } catch (error) {
        console.error('Load account error:', error);
        alert('Failed to load account');
    }
}

// Close account modal
function closeAccountModal() {
    document.getElementById('accountModal').classList.remove('active');
    currentAccountId = null;
}

// Save account (create or update)
async function saveAccount() {
    const name = document.getElementById('accountName').value;
    const description = document.getElementById('accountDescription').value;
    const parentId = document.getElementById('accountParent').value;
    const billingPlan = document.getElementById('accountBillingPlan').value;

    if (!name) {
        alert('Account name is required');
        return;
    }

    try {
        const url = currentAccountId ? `/api/accounts/${currentAccountId}` : '/api/accounts';
        const method = currentAccountId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                description,
                parent_account_id: parentId ? parseInt(parentId) : null,
                billing_plan: billingPlan
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save account');
        }

        closeAccountModal();
        loadAccounts();
        alert(currentAccountId ? 'Account updated successfully' : 'Account created successfully');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Delete account
async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account? This will remove all user and channel assignments.')) {
        return;
    }

    try {
        const response = await fetch(`/api/accounts/${accountId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete account');
        }

        loadAccounts();
        document.getElementById('accountDetailsContent').innerHTML = `
            <p style="color: #666; text-align: center; padding: 40px 0;">Select an account from the tree to view details</p>
        `;
        alert('Account deleted successfully');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Open assign users modal
async function openAssignUsersModal(accountId, accountName) {
    selectedAccountForUsers = accountId;
    document.getElementById('assignUsersAccountName').textContent = accountName;
    
    try {
        const response = await fetch('/api/users/available', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const users = await response.json();
        const container = document.getElementById('assignUsersContainer');
        
        if (users.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No users available</p>';
        } else {
            container.innerHTML = users.map(user => `
                <div style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #333;">
                    <input type="checkbox" id="user-${user.id}" value="${user.id}" style="margin-right: 12px; width: 18px; height: 18px;">
                    <label for="user-${user.id}" style="color: #FFFFFF; font-size: 13px; cursor: pointer; flex: 1;">
                        ${user.username || user.email}
                        <span style="color: #666; font-size: 11px; margin-left: 8px;">${user.email}</span>
                    </label>
                </div>
            `).join('');
        }
        
        document.getElementById('assignUsersModal').classList.add('active');
    } catch (error) {
        console.error('Load users error:', error);
        alert('Failed to load users');
    }
}

// Close assign users modal
function closeAssignUsersModal() {
    document.getElementById('assignUsersModal').classList.remove('active');
    selectedAccountForUsers = null;
}

// Save assigned users
async function saveAssignedUsers() {
    const checkboxes = document.querySelectorAll('#assignUsersContainer input[type="checkbox"]:checked');
    const userIds = Array.from(checkboxes).map(cb => cb.value);

    if (userIds.length === 0) {
        alert('Please select at least one user');
        return;
    }

    try {
        const response = await fetch(`/api/accounts/${selectedAccountForUsers}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userIds })
        });

        if (!response.ok) throw new Error('Failed to assign users');

        closeAssignUsersModal();
        selectAccount(selectedAccountForUsers);
        alert('Users assigned successfully');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Remove user from account
async function removeUserFromAccount(accountId, userId) {
    if (!confirm('Remove this user from the account?')) return;

    try {
        const response = await fetch(`/api/accounts/${accountId}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to remove user');

        selectAccount(accountId);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Open assign channels modal
async function openAssignChannelsModal(accountId, accountName) {
    selectedAccountForChannels = accountId;
    document.getElementById('assignChannelsAccountName').textContent = accountName;
    
    try {
        const response = await fetch('/api/channels', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load channels');
        
        const channels = await response.json();
        const container = document.getElementById('assignChannelsContainer');
        
        if (channels.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No channels available. Create groups first.</p>';
        } else {
            container.innerHTML = channels.map(ch => `
                <div style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #333;">
                    <input type="checkbox" id="channel-${ch.id}" value="${ch.id}" style="margin-right: 12px; width: 18px; height: 18px;">
                    <label for="channel-${ch.id}" style="color: #FFFFFF; font-size: 13px; cursor: pointer; flex: 1;">
                        ${ch.name}
                        <span style="color: ${ch.type === 'emergency' ? '#FF6B6B' : '#4CAF50'}; font-size: 11px; margin-left: 8px;">${ch.type}</span>
                    </label>
                </div>
            `).join('');
        }
        
        document.getElementById('assignChannelsModal').classList.add('active');
    } catch (error) {
        console.error('Load channels error:', error);
        alert('Failed to load channels');
    }
}

// Close assign channels modal
function closeAssignChannelsModal() {
    document.getElementById('assignChannelsModal').classList.remove('active');
    selectedAccountForChannels = null;
}

// Save assigned channels
async function saveAssignedChannels() {
    const checkboxes = document.querySelectorAll('#assignChannelsContainer input[type="checkbox"]:checked');
    const channelIds = Array.from(checkboxes).map(cb => cb.value);
    const accessLevel = document.getElementById('channelAccessLevel').value;

    if (channelIds.length === 0) {
        alert('Please select at least one channel');
        return;
    }

    try {
        const response = await fetch(`/api/accounts/${selectedAccountForChannels}/channels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ channelIds, accessLevel })
        });

        if (!response.ok) throw new Error('Failed to assign channels');

        closeAssignChannelsModal();
        selectAccount(selectedAccountForChannels);
        alert('Channels assigned successfully');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Remove channel from account
async function removeChannelFromAccount(accountId, channelId) {
    if (!confirm('Remove this channel from the account?')) return;

    try {
        const response = await fetch(`/api/accounts/${accountId}/channels/${encodeURIComponent(channelId)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to remove channel');

        selectAccount(accountId);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Filter accounts in tree
function filterAccounts() {
    const searchTerm = document.getElementById('accountSearchBox').value.toLowerCase();
    const nodes = document.querySelectorAll('.account-node');
    
    nodes.forEach(node => {
        const text = node.textContent.toLowerCase();
        node.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Load accounts/groups when sections are shown
const originalSwitchSection = switchSection;
switchSection = function(sectionId) {
    originalSwitchSection(sectionId);
    if (sectionId === 'accounts') {
        loadAccounts();
    } else if (sectionId === 'groups') {
        loadGroups();
    }
};

// ==================== SECURITY DASHBOARD FUNCTIONS ====================

// Load Security Dashboard
async function loadSecurityDashboard() {
    console.log('Loading security dashboard...');
    try {
        const response = await fetch('/api/security/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update overview cards
            document.getElementById('securityScore').textContent = data.securityScore || '--';
            document.getElementById('activeAlerts').textContent = data.activeAlerts || 0;
            document.getElementById('apiRpm').textContent = data.requestsPerMinute || 0;
            
            const errorRate = data.errorRate || 0;
            const errorRateEl = document.getElementById('errorRate');
            errorRateEl.textContent = errorRate.toFixed(1) + '%';
            errorRateEl.style.color = errorRate > 5 ? '#FF6B6B' : errorRate > 1 ? '#FFB84D' : '#4CAF50';
            
            // Update score color
            const scoreEl = document.getElementById('securityScore');
            if (data.securityScore) {
                scoreEl.style.color = data.securityScore >= 80 ? '#4CAF50' : data.securityScore >= 60 ? '#FFB84D' : '#FF6B6B';
            }
        }
        
        // Load other panels
        await Promise.all([
            loadSecurityAlerts(),
            loadRecommendations(),
            refreshTrafficMetrics()
        ]);
    } catch (error) {
        console.error('Failed to load security dashboard:', error);
    }
}

// Run Secret Scan
async function runSecretScan() {
    const btn = document.getElementById('secretScanBtn');
    const resultsDiv = document.getElementById('secretScanResults');
    
    btn.disabled = true;
    btn.textContent = 'Scanning...';
    resultsDiv.innerHTML = '<p style="color: #D4AF37;">Scanning files for exposed secrets...</p>';
    
    try {
        const response = await fetch('/api/security/scan-secrets', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.findings && data.findings.length > 0) {
            resultsDiv.innerHTML = data.findings.map(f => `
                <div style="margin-bottom: 12px; padding: 8px; background: ${f.severity === 'high' ? 'rgba(255,107,107,0.1)' : 'rgba(255,184,77,0.1)'}; border-left: 3px solid ${f.severity === 'high' ? '#FF6B6B' : '#FFB84D'}; border-radius: 4px;">
                    <p style="color: ${f.severity === 'high' ? '#FF6B6B' : '#FFB84D'}; font-weight: 600; margin-bottom: 4px;">${f.type}</p>
                    <p style="color: #888; font-size: 11px;">File: ${f.file}${f.line ? ', Line: ' + f.line : ''}</p>
                    ${f.suggestion ? `<p style="color: #b0b0b0; font-size: 11px; margin-top: 4px;">${f.suggestion}</p>` : ''}
                </div>
            `).join('');
        } else {
            resultsDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <span style="color: #4CAF50; font-size: 24px;">&#10003;</span>
                    <p style="color: #4CAF50; margin-top: 8px;">No exposed secrets found</p>
                    <p style="color: #666; font-size: 11px; margin-top: 4px;">Scanned at ${new Date().toLocaleTimeString()}</p>
                </div>
            `;
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: #FF6B6B;">Scan failed: ${error.message}</p>`;
    }
    
    btn.disabled = false;
    btn.textContent = 'Run Scan';
}

// Run NPM Audit
async function runNpmAudit() {
    const btn = document.getElementById('npmAuditBtn');
    const resultsDiv = document.getElementById('npmAuditResults');
    
    btn.disabled = true;
    btn.textContent = 'Auditing...';
    resultsDiv.innerHTML = '<p style="color: #D4AF37;">Checking dependencies for vulnerabilities...</p>';
    
    try {
        const response = await fetch('/api/security/npm-audit', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        const summary = data.severityCounts || data.summary || { critical: 0, high: 0, moderate: 0, low: 0 };
        const hasVulns = summary.critical > 0 || summary.high > 0 || summary.moderate > 0 || summary.low > 0;
        
        resultsDiv.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
                    <div style="background: ${summary.critical > 0 ? 'rgba(255,107,107,0.2)' : '#1a1a1a'}; padding: 8px; border-radius: 4px;">
                        <p style="color: #FF6B6B; font-size: 18px; font-weight: 600;">${summary.critical || 0}</p>
                        <p style="color: #888; font-size: 10px;">Critical</p>
                    </div>
                    <div style="background: ${summary.high > 0 ? 'rgba(255,107,107,0.1)' : '#1a1a1a'}; padding: 8px; border-radius: 4px;">
                        <p style="color: #FF8C8C; font-size: 18px; font-weight: 600;">${summary.high || 0}</p>
                        <p style="color: #888; font-size: 10px;">High</p>
                    </div>
                    <div style="background: ${summary.moderate > 0 ? 'rgba(255,184,77,0.1)' : '#1a1a1a'}; padding: 8px; border-radius: 4px;">
                        <p style="color: #FFB84D; font-size: 18px; font-weight: 600;">${summary.moderate || 0}</p>
                        <p style="color: #888; font-size: 10px;">Moderate</p>
                    </div>
                    <div style="background: #1a1a1a; padding: 8px; border-radius: 4px;">
                        <p style="color: #888; font-size: 18px; font-weight: 600;">${summary.low || 0}</p>
                        <p style="color: #888; font-size: 10px;">Low</p>
                    </div>
                </div>
            </div>
            ${!hasVulns ? `
                <div style="text-align: center; padding: 12px;">
                    <span style="color: #4CAF50; font-size: 20px;">&#10003;</span>
                    <p style="color: #4CAF50; margin-top: 4px; font-size: 13px;">No vulnerabilities found</p>
                </div>
            ` : `
                <p style="color: #b0b0b0; font-size: 11px;">${data.recommendation || "Run 'npm audit fix' to automatically fix issues"}</p>
            `}
            <p style="color: #666; font-size: 10px; margin-top: 8px;">Audited at ${new Date().toLocaleTimeString()}</p>
        `;
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: #FF6B6B;">Audit failed: ${error.message}</p>`;
    }
    
    btn.disabled = false;
    btn.textContent = 'Run Audit';
}

// Refresh Traffic Metrics
async function refreshTrafficMetrics() {
    try {
        const response = await fetch('/api/security/traffic', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const metrics = data.metrics || data;
            
            const traffic10 = metrics.last10Minutes?.requests || metrics.last10min?.requests || 0;
            const traffic60 = metrics.last60Minutes?.requests || metrics.last60min?.requests || 0;
            
            document.getElementById('traffic10min').textContent = traffic10;
            document.getElementById('traffic60min').textContent = traffic60;
            
            const endpointsDiv = document.getElementById('topEndpoints');
            const topEndpoints = data.topEndpoints || metrics.topEndpoints || [];
            if (topEndpoints.length > 0) {
                endpointsDiv.innerHTML = topEndpoints.slice(0, 5).map(e => `
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #333;">
                        <span style="color: #b0b0b0;">${e.endpoint}</span>
                        <span style="color: #D4AF37;">${e.count}</span>
                    </div>
                `).join('');
            } else {
                endpointsDiv.innerHTML = '<p style="color: #666;">No traffic data yet...</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load traffic metrics:', error);
    }
}

// Check System Integrity
async function checkIntegrity() {
    const btn = document.getElementById('integrityBtn');
    const resultsDiv = document.getElementById('integrityResults');
    
    btn.disabled = true;
    btn.textContent = 'Checking...';
    resultsDiv.innerHTML = '<p style="color: #D4AF37;">Verifying file integrity...</p>';
    
    try {
        const response = await fetch('/api/security/integrity', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        const files = data.files || data.checks || [];
        
        if (files.length > 0) {
            resultsDiv.innerHTML = files.map(check => {
                const status = check.status || 'unknown';
                const isOk = status === 'ok' || status === 'unchanged';
                const isWarning = status === 'warning' || status === 'modified' || status === 'new';
                const isMissing = status === 'missing' || status === 'error';
                const statusColor = isOk ? '#4CAF50' : isWarning ? '#FFB84D' : '#FF6B6B';
                const icon = isOk ? '&#10003;' : isWarning ? '&#9888;' : '&#10007;';
                const fileName = check.file || check.name || 'Unknown file';
                
                return `
                <div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #333;">
                    <span style="color: ${statusColor}; margin-right: 8px;">${icon}</span>
                    <span style="color: #b0b0b0; flex: 1; font-size: 11px;">${fileName}</span>
                    <span style="color: ${statusColor}; font-size: 10px;">${status}</span>
                </div>
            `}).join('');
            
            if (data.anomalies > 0) {
                resultsDiv.innerHTML += `<p style="color: #FFB84D; margin-top: 12px; font-size: 11px;">${data.anomalies} file(s) modified since last check</p>`;
            }
        } else {
            resultsDiv.innerHTML = '<p style="color: #666;">No files to check</p>';
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: #FF6B6B;">Check failed: ${error.message}</p>`;
    }
    
    btn.disabled = false;
    btn.textContent = 'Check';
}

// Load Security Recommendations
async function loadRecommendations() {
    const panel = document.getElementById('recommendationsPanel');
    
    try {
        const response = await fetch('/api/security/recommendations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.recommendations && data.recommendations.length > 0) {
                panel.innerHTML = data.recommendations.map(rec => {
                    const priority = rec.priority || 'medium';
                    const priorityColor = priority === 'critical' ? '#FF6B6B' : priority === 'high' ? '#FF8C8C' : priority === 'medium' ? '#FFB84D' : '#4CAF50';
                    const title = rec.issue || rec.title || rec.category || 'Security Issue';
                    const description = rec.recommendation || rec.description || '';
                    const action = rec.impact || rec.action || '';
                    
                    return `
                    <div style="background: #1a1a1a; border: 1px solid #404040; border-left: 3px solid ${priorityColor}; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <h4 style="color: #FFFFFF; margin: 0; font-size: 14px;">${title}</h4>
                            <span style="background: ${priorityColor}; color: ${priority === 'high' || priority === 'critical' ? 'white' : '#1a1a1a'}; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">
                                ${priority.toUpperCase()}
                            </span>
                        </div>
                        <p style="color: #888; font-size: 12px; margin: 0;">${description}</p>
                        ${action ? `<p style="color: #D4AF37; font-size: 11px; margin-top: 8px;">Impact: ${action}</p>` : ''}
                    </div>
                `}).join('');
            } else {
                panel.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <span style="color: #4CAF50; font-size: 32px;">&#10003;</span>
                        <p style="color: #4CAF50; margin-top: 12px; font-size: 16px;">All security recommendations met!</p>
                        <p style="color: #666; font-size: 12px; margin-top: 4px;">Your system follows security best practices</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        panel.innerHTML = `<p style="color: #FF6B6B;">Failed to load recommendations</p>`;
    }
}

// Load Security Alerts
async function loadSecurityAlerts() {
    const panel = document.getElementById('alertsPanel');
    
    try {
        const response = await fetch('/api/security/alerts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update active alerts count
            const activeCount = (data.alerts || []).filter(a => !a.acknowledged).length;
            document.getElementById('activeAlerts').textContent = activeCount;
            
            if (data.alerts && data.alerts.length > 0) {
                panel.innerHTML = data.alerts.map(alert => `
                    <div style="background: #1a1a1a; border: 1px solid #404040; border-left: 3px solid ${alert.severity === 'critical' ? '#FF6B6B' : alert.severity === 'warning' ? '#FFB84D' : '#4CAF50'}; border-radius: 6px; padding: 12px; margin-bottom: 8px; ${alert.acknowledged ? 'opacity: 0.6;' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="color: ${alert.severity === 'critical' ? '#FF6B6B' : alert.severity === 'warning' ? '#FFB84D' : '#4CAF50'}; font-weight: 600; font-size: 13px;">${alert.type}</span>
                                <p style="color: #888; font-size: 11px; margin: 4px 0 0 0;">${alert.message}</p>
                                <p style="color: #666; font-size: 10px; margin-top: 4px;">${new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                            ${!alert.acknowledged ? `
                                <button onclick="acknowledgeAlert('${alert.id}')" style="background: transparent; border: 1px solid #404040; color: #888; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">
                                    Ack
                                </button>
                            ` : '<span style="color: #666; font-size: 10px;">Acknowledged</span>'}
                        </div>
                    </div>
                `).join('');
            } else {
                panel.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <span style="color: #4CAF50; font-size: 24px;">&#10003;</span>
                        <p style="color: #4CAF50; margin-top: 8px;">No security alerts</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        panel.innerHTML = `<p style="color: #FF6B6B;">Failed to load alerts</p>`;
    }
}

// Acknowledge Alert
async function acknowledgeAlert(alertId) {
    try {
        await fetch(`/api/security/alerts/${alertId}/acknowledge`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadSecurityAlerts();
    } catch (error) {
        console.error('Failed to acknowledge alert:', error);
    }
}

// Clear All Security Alerts
async function clearSecurityAlerts() {
    if (!confirm('Are you sure you want to clear all security alerts?')) return;
    
    try {
        await fetch('/api/security/alerts', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadSecurityAlerts();
    } catch (error) {
        alert('Failed to clear alerts: ' + error.message);
    }
}

// Initialize app - called after all sections are loaded
function initializeApp() {
    console.log('Initializing World Risk Admin Dashboard...');
    if (token) {
        showDashboard();
        loadUsers();
        loadServiceStatus();
    }
}

// Auto-initialize if sections are already loaded (fallback)
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure sections are loaded first
    setTimeout(() => {
        if (token && !document.getElementById('dashboard').classList.contains('dashboard-initialized')) {
            initializeApp();
        }
    }, 500);
});
