// ============ NOTIFICATIONS ============
// Depends on: helpers.js (api, escapeHtml, currentUser)

let _notifOpen = false;
let _notifLoaded = false;

const NOTIF_ICONS = {
  info:    { icon: 'fa-circle-info',  cls: 'notif-type-info' },
  success: { icon: 'fa-circle-check', cls: 'notif-type-success' },
  warning: { icon: 'fa-triangle-exclamation', cls: 'notif-type-warning' },
  promo:   { icon: 'fa-tag',          cls: 'notif-type-promo' }
};

function _timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function loadNotifications() {
  if (!currentUser) return;
  try {
    const data = await api('/api/notifications');
    _renderNotifications(data);
    _updateBadge(data.unread);
    _notifLoaded = true;
  } catch (e) {
    console.error('[GT] Notifications load failed:', e.message);
  }
}

function _updateBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function _renderNotifications(data) {
  const list = document.getElementById('notifList');
  if (!list) return;

  if (!data.notifications.length) {
    list.innerHTML = `<div class="notif-empty"><i class="fas fa-bell-slash"></i><p>All caught up!</p></div>`;
    return;
  }

  list.innerHTML = data.notifications.map(n => {
    const style = NOTIF_ICONS[n.type] || NOTIF_ICONS.info;
    return `<div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.id}, this)">
      <div class="notif-type-icon ${style.cls}"><i class="fas ${style.icon}"></i></div>
      <div class="notif-content">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        ${n.body ? `<div class="notif-body">${escapeHtml(n.body)}</div>` : ''}
        <div class="notif-time">${_timeAgo(n.created_at)}</div>
      </div>
      <div class="notif-dot"></div>
    </div>`;
  }).join('');
}

function toggleNotifDropdown() {
  const dropdown = document.getElementById('notifDropdown');
  const allDropdowns = document.querySelectorAll('.dropdown-panel');
  const isOpen = !dropdown.classList.contains('hidden');

  allDropdowns.forEach(d => d.classList.add('hidden'));

  if (!isOpen) {
    dropdown.classList.remove('hidden');
    _notifOpen = true;
    if (!_notifLoaded && currentUser) loadNotifications();
  } else {
    _notifOpen = false;
  }
}

async function markNotifRead(id, el) {
  if (!el.classList.contains('unread')) return;
  try {
    await api(`/api/notifications/${id}/read`, 'PATCH');
    el.classList.remove('unread');
    el.querySelector('.notif-dot')?.classList.remove('notif-unread-dot');
    // Decrease badge count
    const badge = document.getElementById('notifBadge');
    if (badge && !badge.classList.contains('hidden')) {
      const cur = parseInt(badge.textContent) || 0;
      const newCount = Math.max(0, cur - 1);
      _updateBadge(newCount);
    }
  } catch (e) { /* silent */ }
}

async function markAllNotifsRead(e) {
  e.stopPropagation();
  try {
    await api('/api/notifications/read-all', 'PATCH');
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    _updateBadge(0);
  } catch (e) { /* silent */ }
}

// Poll for new notifications every 60s (while page is open and user logged in)
setInterval(() => {
  if (currentUser && document.visibilityState === 'visible') loadNotifications();
}, 60000);
