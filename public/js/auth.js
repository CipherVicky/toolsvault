// ============ USER AUTH ============
// Depends on: helpers.js (userToken, currentUser, api, toast, escapeHtml)

let _pendingEmail = null; // email waiting for verification
let _resendTimerInterval = null;

async function handleLogin(e, force) {
  if (e && e.preventDefault) e.preventDefault();
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await api('/api/auth/login', 'POST', { email, password, force: !!force });
    _loginSuccess(res);
  } catch (err) {
    // If unverified — open verify modal instead of showing error
    if (err.message && err.message.includes('verify')) {
      closeAuthModal();
      _pendingEmail = email;
      openVerifyModal(email);
      return;
    }
    // Device limit reached — offer a one-tap "switch device"
    if (err.data && err.data.device_limit_exceeded) {
      const el = document.getElementById('loginError');
      el.innerHTML = `<i class="fas fa-mobile-alt" style="margin-right:5px"></i>${err.data.error}`
        + `<button type="button" id="switchDeviceBtn2" style="margin-top:8px;width:100%;padding:8px;border:none;border-radius:8px;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;font-weight:700;font-size:12px;cursor:pointer">Sign out other device & continue here</button>`;
      el.classList.remove('hidden');
      const b = document.getElementById('switchDeviceBtn2');
      if (b) b.onclick = () => handleLogin(null, true);
      return;
    }
    document.getElementById('loginError').textContent = err.message;
    document.getElementById('loginError').classList.remove('hidden');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const first_name = document.getElementById('regFirstName').value.trim();
  const last_name  = document.getElementById('regLastName').value.trim();
  const email      = document.getElementById('regEmail').value;
  const password   = document.getElementById('regPassword').value;

  try {
    const res = await api('/api/auth/register', 'POST', { first_name, last_name, email, password });
    if (res.token) {
      _loginSuccess(res);
      closeAuthModal();
    } else if (res.pending) {
      closeAuthModal();
      _pendingEmail = res.email;
      openVerifyModal(res.email);
    }
  } catch (err) {
    document.getElementById('regError').textContent = err.message;
    document.getElementById('regError').classList.remove('hidden');
  }
}

// ============ VERIFY MODAL ============
function openVerifyModal(email) {
  _pendingEmail = email;
  const short = email.length > 28 ? email.slice(0, 14) + '…' + email.split('@')[1] : email;
  document.getElementById('verifySubtitle').textContent = `Enter the 6-digit code sent to ${short}`;
  document.getElementById('verifyError').classList.add('hidden');
  document.getElementById('verifyModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Clear inputs and focus first
  document.querySelectorAll('.otp-input').forEach(i => i.value = '');
  setTimeout(() => document.querySelector('.otp-input').focus(), 100);
}

function closeVerifyModal() {
  document.getElementById('verifyModal').classList.add('hidden');
  document.body.style.overflow = '';
  clearInterval(_resendTimerInterval);
}

async function handleVerify() {
  const inputs = document.querySelectorAll('.otp-input');
  const code   = Array.from(inputs).map(i => i.value).join('');
  if (code.length < 6) {
    showVerifyError('Please enter all 6 digits');
    return;
  }

  const btn = document.getElementById('verifyBtn');
  btn.disabled = true;
  btn.textContent = 'Verifying…';

  try {
    const res = await api('/api/auth/verify-email', 'POST', { email: _pendingEmail, code });
    _loginSuccess(res);
    closeVerifyModal();
  } catch (err) {
    showVerifyError(err.message);
    btn.disabled = false;
    btn.textContent = 'Verify & Continue';
  }
}

async function handleResend() {
  const btn = document.getElementById('resendBtn');
  btn.disabled = true;

  try {
    await api('/api/auth/resend-code', 'POST', { email: _pendingEmail });
    document.getElementById('verifyError').classList.add('hidden');
    toast('New code sent!', 'success');
    startResendCooldown(60);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
}

function startResendCooldown(seconds) {
  const btn   = document.getElementById('resendBtn');
  const timer = document.getElementById('resendTimer');
  btn.classList.add('hidden');
  timer.classList.remove('hidden');
  let left = seconds;
  timer.textContent = `Resend in ${left}s`;
  clearInterval(_resendTimerInterval);
  _resendTimerInterval = setInterval(() => {
    left--;
    if (left <= 0) {
      clearInterval(_resendTimerInterval);
      btn.disabled = false;
      btn.classList.remove('hidden');
      timer.classList.add('hidden');
    } else {
      timer.textContent = `Resend in ${left}s`;
    }
  }, 1000);
}

function showVerifyError(msg) {
  const el = document.getElementById('verifyError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ============ SHARED LOGIN SUCCESS ============
function _loginSuccess(res) {
  userToken   = res.token;
  currentUser = res.user;
  localStorage.setItem('user_token', userToken);
  localStorage.setItem('gt_last_activity', String(Date.now())); // fresh session start (idle-timeout clock)
  if (typeof clearScrollMemory === 'function') clearScrollMemory();
  else try { sessionStorage.removeItem('gt_scroll_v1'); } catch (e) {}
  if (res.user.avatar_url) localStorage.setItem('gt_avatar', res.user.avatar_url);
  else localStorage.removeItem('gt_avatar');
  updateAuthUI();
  loadFavorites();
  if (typeof loadNotifications === 'function') loadNotifications();
  if (typeof loadFixBanner === 'function') loadFixBanner();
  if (typeof initSessionTimeout === 'function') initSessionTimeout();
  const name = res.user.first_name || 'Operative';
  toast('Access Granted: Welcome to ToolsVault, ' + name + '! 🛡️', 'success');
  if (typeof closeAuthModal === 'function') closeAuthModal();

  // Redirect handling: check pending redirect
  let target = sessionStorage.getItem('gt_auth_redirect');
  sessionStorage.removeItem('gt_auth_redirect');
  if (!target) {
    const qp = new URLSearchParams(window.location.search);
    target = qp.get('redirect');
  }

  if (target) {
    if (target.startsWith('/app/tools/') || target.startsWith('/tools/')) {
      const slug = target.split('/').pop();
      if (slug && typeof openTool === 'function') {
        openTool(slug);
        return;
      }
    }
    const cleanTarget = target.replace(/^\/app\/?/, '').replace(/^\//, '');
    if (cleanTarget && typeof showPage === 'function') {
      showPage(cleanTarget);
      return;
    }
  }

  if (typeof showPage === 'function') {
    showPage('tools');
  }
}

// ============ SESSION ============
async function verifyUser() {
  try {
    const payload = JSON.parse(atob(userToken.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) { logout(); return; }

    // Set initial state from JWT so UI is not blank while fetching
    currentUser = {
      id: payload.id,
      first_name: payload.first_name || '',
      last_name: payload.last_name || '',
      plan: payload.plan || 'free',
      avatar_url: localStorage.getItem('gt_avatar') || ''
    };
    updateAuthUI();
    loadFavorites();
    if (typeof loadNotifications === 'function') loadNotifications();
    if (typeof loadFixBanner === 'function') loadFixBanner();
    if (typeof initSessionTimeout === 'function') initSessionTimeout();

    // Fetch live profile to get current plan (admin may have changed it since JWT was issued)
    try {
      const profile = await api('/api/user/profile');
      let changed = false;
      if (profile.plan && profile.plan !== currentUser.plan) {
        currentUser.plan = profile.plan;
        changed = true;
      }
      if (profile.avatar_url && profile.avatar_url !== currentUser.avatar_url) {
        currentUser.avatar_url = profile.avatar_url;
        localStorage.setItem('gt_avatar', profile.avatar_url);
        changed = true;
      }
      if (profile.first_name) currentUser.first_name = profile.first_name;
      if (profile.last_name !== undefined) currentUser.last_name = profile.last_name || '';
      if (changed) {
        updateAuthUI();
        // Re-render tool list with updated plan (no extra API call needed)
        if (typeof renderTools === 'function' && typeof allTools !== 'undefined' && allTools.length) {
          renderTools(allTools);
        }
      }
      // 🎁 Relaunch gift just redeemed on this login — celebrate once.
      if (profile.gift_just_claimed && typeof showGiftModal === 'function') {
        try { showGiftModal(profile.gift_just_claimed); } catch (e) {}
      }
    } catch (_) { /* non-critical — JWT data is still usable */ }
  } catch {
    logout();
  }
}

function logout() {
  api('/api/auth/logout', 'POST').catch(() => {});
  localStorage.removeItem('user_token');
  sessionStorage.removeItem('user_token');
  localStorage.removeItem('gt_avatar');
  localStorage.removeItem('gt_last_activity');
  if (typeof clearScrollMemory === 'function') clearScrollMemory();
  else try { sessionStorage.removeItem('gt_scroll_v1'); } catch (e) {}
  userToken         = null;
  currentUser       = null;
  userFavorites     = new Set();
  showFavoritesOnly = false;
  updateAuthUI();
  toast('Clearance revoked. Signed out safely.', 'info');
  if (typeof navigateToAuth === 'function') navigateToAuth('/app/tools');
}

function getDisplayName(user) {
  if (!user) return '';
  return (user.first_name + ' ' + (user.last_name || '')).trim();
}

const PLAN_COLORS = {
  free: { badge: 'plan-badge-free', icon: 'fa-unlock', label: 'Free' },
  basic: { badge: 'plan-badge-basic', icon: 'fa-layer-group', label: 'Basic' },
  premium: { badge: 'plan-badge-premium', icon: 'fa-bolt', label: 'Premium' },
  ultimate: { badge: 'plan-badge-ultimate', icon: 'fa-crown', label: 'Ultimate' },
};

function getPlanStyle(plan) {
  return PLAN_COLORS[plan] || { badge: 'plan-badge-custom', icon: 'fa-star', label: plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Free' };
}

function updateAuthUI() {
  // The sidebar account block follows auth state on every page, so it is
  // refreshed here rather than from any single page's loader.
  if (typeof initSidebarAccount === 'function') { try { initSidebarAccount(); } catch (e) {} }
  const sidebarLogin = document.getElementById('sidebarGuestLogin');
  const crown = document.getElementById('avatarCrown');
  const badge = document.getElementById('avatarPlanBadge');
  const accountBtn = document.getElementById('accountBtn');

  if (currentUser) {
    const name = getDisplayName(currentUser);
    const plan = currentUser.plan || 'free';
    const ps = getPlanStyle(plan);

    // Avatar ring color (plan badge hidden — crown is sufficient)
    if (accountBtn) accountBtn.setAttribute('data-plan', plan);

    // Avatar image or default icon
    if (accountBtn) {
      if (currentUser.avatar_url) {
        accountBtn.innerHTML = `<img src="${escapeHtml(currentUser.avatar_url)}" class="topbar-avatar-img" alt="">`;
      } else {
        accountBtn.innerHTML = `<i class="fas fa-user"></i>`;
      }
    }

    // Crown for paid plans
    if (crown) crown.classList.toggle('hidden', plan === 'free');

    // Dropdown header with plan badge
    document.getElementById('userActions').classList.remove('hidden');
    document.getElementById('usernameDisplay').innerHTML =
      `<div style="font-weight:700;color:var(--text-1);margin-bottom:3px">${escapeHtml(name)}</div>
       <span class="dropdown-plan-badge ${ps.badge}"><i class="fas ${ps.icon}"></i> ${ps.label} Plan</span>`;

    if (sidebarLogin) sidebarLogin.classList.add('hidden');
  } else {
    document.getElementById('userActions').classList.add('hidden');
    if (sidebarLogin) sidebarLogin.classList.remove('hidden');
    if (crown) crown.classList.add('hidden');
    if (accountBtn) {
      accountBtn.removeAttribute('data-plan');
      accountBtn.innerHTML = `<i class="fas fa-user"></i>`;
    }
  }
  updateLoginPrompt();
  if (typeof updateHeroGreeting === 'function') updateHeroGreeting();
  if (typeof refreshSidebarPromo === 'function') refreshSidebarPromo();
  if (typeof refreshBottomBar === 'function') refreshBottomBar();
}

function updateLoginPrompt() {
  const prompt = document.getElementById('loginPrompt');
  const grid   = document.getElementById('toolsGrid');
  if (!prompt) return;
  if (currentUser) {
    prompt.classList.add('hidden');
    grid.style.display = '';
  } else {
    prompt.classList.remove('hidden');
    grid.style.display = 'none';
  }
}

// ============ AUTH MODAL ============
function openAuthModal() {
  if (typeof closeAllDropdowns === 'function') closeAllDropdowns();
  document.getElementById('authModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  document.body.style.overflow = '';
}
function showTab(tab, ev) {
  if (ev && ev.preventDefault) ev.preventDefault();
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tab + 'Tab').classList.add('active');
  const err = document.getElementById(tab === 'login' ? 'loginError' : 'regError');
  if (err) err.classList.add('hidden');
}

// ============ OTP INPUT BEHAVIOUR ============
document.addEventListener('DOMContentLoaded', () => {
  const inputs = document.querySelectorAll('.otp-input');

  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      // Allow only digits
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && idx < inputs.length - 1) inputs[idx + 1].focus();
      // Auto-submit when all 6 filled
      if (Array.from(inputs).every(i => i.value)) handleVerify();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
    });

    // Paste support — paste full 6-digit code
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      inputs.forEach((inp, i) => { inp.value = pasted[i] || ''; });
      const next = Math.min(pasted.length, inputs.length - 1);
      inputs[next].focus();
      if (pasted.length === 6) handleVerify();
    });
  });
});

// ============ DEDICATED AUTH PORTAL HELPERS ============

function navigateToAuth(redirectUrl, tab = 'login') {
  if (redirectUrl) {
    sessionStorage.setItem('gt_auth_redirect', redirectUrl);
  }
  if (currentUser) {
    if (typeof showPage === 'function') showPage('tools');
    return;
  }
  if (typeof showPage === 'function') {
    showPage('auth');
    switchAuthTab(tab);
  }
}

function switchAuthTab(tab) {
  const loginBtn = document.getElementById('authPortalLoginTabBtn');
  const regBtn   = document.getElementById('authPortalRegTabBtn');
  const loginForm = document.getElementById('authPortalLoginForm');
  const regForm   = document.getElementById('authPortalRegForm');

  if (tab === 'login') {
    if (loginBtn) loginBtn.classList.add('active');
    if (regBtn) regBtn.classList.remove('active');
    if (loginForm) loginForm.classList.remove('hidden');
    if (regForm) regForm.classList.add('hidden');
  } else {
    if (regBtn) regBtn.classList.add('active');
    if (loginBtn) loginBtn.classList.remove('active');
    if (regForm) regForm.classList.remove('hidden');
    if (loginForm) loginForm.classList.add('hidden');
  }
}

async function handlePortalLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const email = document.getElementById('portalLoginEmail').value.trim();
  const password = document.getElementById('portalLoginPassword').value;
  const errEl = document.getElementById('portalLoginError');
  if (errEl) errEl.classList.add('hidden');

  try {
    const res = await api('/api/auth/login', 'POST', { email, password });
    _loginSuccess(res);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Authentication failed. Please verify credentials.';
      errEl.classList.remove('hidden');
    } else {
      toast(err.message, 'error');
    }
  }
}

async function handlePortalRegister(e) {
  if (e && e.preventDefault) e.preventDefault();
  const first_name = document.getElementById('portalRegFirstName').value.trim();
  const last_name  = document.getElementById('portalRegLastName').value.trim();
  const email      = document.getElementById('portalRegEmail').value.trim();
  const password   = document.getElementById('portalRegPassword').value;
  const errEl      = document.getElementById('portalRegError');
  if (errEl) errEl.classList.add('hidden');

  try {
    const res = await api('/api/auth/register', 'POST', { first_name, last_name, email, password });
    _loginSuccess(res);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Registration failed.';
      errEl.classList.remove('hidden');
    } else {
      toast(err.message, 'error');
    }
  }
}

async function handleDemoLogin() {
  try {
    toast('Authenticating with master demo clearance...', 'info');
    const res = await api('/api/auth/login', 'POST', {
      email: 'demo@toolsvault.com',
      password: 'password123'
    });
    _loginSuccess(res);
  } catch (err) {
    toast('Demo login failed: ' + err.message, 'error');
  }
}
