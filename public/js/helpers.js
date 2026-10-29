// ============ SHARED HELPERS ============
// Loaded first — provides api(), toast(), escapeHtml(), debounce() to all user modules

let userToken = (sessionStorage.getItem('user_token')||localStorage.getItem('user_token'));
let currentUser = null;

async function api(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (userToken) opts.headers['Authorization'] = `Bearer ${userToken}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(`Server error (${res.status}). Try refreshing the page.`);
  }

  const data = await res.json();
  if (!res.ok) {
    // Account deleted / banned / disabled → force logout immediately
    if (data && (data.account_gone || data.banned || data.disabled)) {
      try {
        (localStorage.removeItem('user_token'),sessionStorage.removeItem('user_token'));
        localStorage.removeItem('gt_avatar');
        // session over — don't leave a scroll position for the next sign-in
        if (typeof clearScrollMemory === 'function') clearScrollMemory();
  else try { sessionStorage.removeItem('gt_scroll_v1'); } catch (e) {}
        localStorage.removeItem('gt_plan');
      } catch {}
      const reason = data.banned ? 'banned' : (data.account_gone ? 'deleted' : 'disabled');
      window.location.href = '/login?reason=' + reason;
      // Stop further handling
      const err = new Error(data.error || 'Session ended');
      err.data = data; err.handled = true;
      throw err;
    }
    const err = new Error(data.error || 'Request failed');
    err.data = data;
    throw err;
  }
  return data;
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// Short relative time ("2h ago"). Used for credential freshness — a live
// timestamp reads as an actively maintained product, which is the trust signal
// a new visitor picks up before they've experienced anything.
function gtTimeAgo(ts) {
  if (!ts) return '';
  // SQLite CURRENT_TIMESTAMP is UTC but has no zone marker — tag it so the
  // browser doesn't read it as local time and show a future/negative age.
  const iso = /Z|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : ts.replace(' ', 'T') + 'Z';
  const then = new Date(iso).getTime();
  if (!then || isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return days + 'd ago';
  const months = Math.floor(days / 30);
  return months < 12 ? months + 'mo ago' : Math.floor(months / 12) + 'y ago';
}

// ── Session Inactivity Timeout ──
let _sessionHeartbeat = null;
// This is now an ABSENCE window, not an idle-while-open window: how long the
// browser can be CLOSED before we sign you out. While a tab is open the
// heartbeat below keeps the stamp fresh, so an open browser never times out —
// which is what stops the "it logs me out every time" complaint. Default is
// generous (admin-configurable via session_timeout_minutes).
let _sessionTimeoutMs = 30 * 24 * 60 * 60 * 1000; // 30 days until fetched from server
const _LAST_ACTIVITY_KEY = 'gt_last_activity';
let _lastActivityWrite = 0;

async function initSessionTimeout() {
  try {
    const d = await fetch('/api/settings/session-timeout').then(r => r.json());
    if (d.minutes && d.minutes > 0) _sessionTimeoutMs = d.minutes * 60 * 1000;
  } catch {}
  // On load: if the stamp is older than the window, the browser was closed /
  // the PC was off long enough — sign out. While the browser stays open the
  // heartbeat refreshes the stamp every minute, so this only fires after a real
  // absence (approximating "you shut down and came back much later"). A fresh
  // login writes a current stamp at every login point, so this never logs out
  // someone who just signed in.
  const last = parseInt(localStorage.getItem(_LAST_ACTIVITY_KEY) || '0', 10);
  if (last && Date.now() - last > _sessionTimeoutMs) { _sessionTimeoutLogout(); return; }
  _touchActivity(true);
  // Heartbeat: prove the browser is still open every 60s. This is a LOCAL
  // localStorage write — NOT a network request — so it keeps you signed in
  // while your PC is on without costing any server bandwidth.
  clearInterval(_sessionHeartbeat);
  _sessionHeartbeat = setInterval(() => _touchActivity(true), 60000);
  // Also stamp on real activity so the "away since" time is accurate.
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, () => _touchActivity(false), { passive: true })
  );
}

// Throttled write of the last-activity timestamp (≤ once / 15s to avoid hammering localStorage)
function _touchActivity(force) {
  const now = Date.now();
  if (force || now - _lastActivityWrite > 15000) {
    _lastActivityWrite = now;
    try { localStorage.setItem(_LAST_ACTIVITY_KEY, String(now)); } catch {}
  }
}

function _sessionTimeoutLogout() {
  (localStorage.removeItem('user_token'),sessionStorage.removeItem('user_token'));
  localStorage.removeItem('gt_avatar');
  // session over — don't leave a scroll position for the next sign-in
  if (typeof clearScrollMemory === 'function') clearScrollMemory();
  else try { sessionStorage.removeItem('gt_scroll_v1'); } catch (e) {}
  localStorage.removeItem(_LAST_ACTIVITY_KEY);
  window.location.href = '/login?reason=timeout';
}

/* Ask the favicon service for the biggest icon it has.
   Cards render the logo at 80px CSS, which is 160 device pixels on a 2× screen
   and more once the tile overscales — so a 128px source was already being
   upscaled before anything cropped it, and that is what reads as pixelation.
   sz=256 returns a genuinely larger image for most domains (measured: canva
   193px, coursera 180, skillshare 256, openai 180 — all bigger than at 128).
   Some sites only publish a small icon and are capped no matter what we ask
   for (netflix tops out at 64px); those need a real logo uploaded, which the
   admin panel already supports. Rewritten at render time so nothing in the
   database has to change and a tool added later gets it automatically. */
function gtLogoSrc(url) {
  const u = (url || '').trim();
  if (!u || u.indexOf('/s2/favicons') === -1) return u;   // only Google's service
  return /[?&]sz=\d+/.test(u) ? u.replace(/([?&]sz=)\d+/, '$1256') : u + '&sz=256';
}

/* Fill every "100+ tools" claim from the live count.
   The number was hand-written in a dozen places, so each one drifted the
   moment a tool was added or retired. The markup keeps a sensible number as
   its text, so if this request never lands the copy still reads correctly —
   the fetch only ever makes it MORE accurate, never blank. */
(function gtFillToolCount() {
  function fill() {
    const els = document.querySelectorAll('[data-gt-tools]');
    if (!els.length) return;
    fetch('/api/public-stats')
      .then(r => r.json())
      .then(d => { if (d && d.label) els.forEach(e => { e.textContent = d.label; }); })
      .catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
})();
