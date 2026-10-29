// ============ USER ANNOUNCEMENTS ============
// Depends on: helpers.js (api, escapeHtml)

let announceTimer = null;
let announceIndex = 0;

async function loadAnnouncements() {
  try {
    const data = await api('/api/announcements');
    const bar = document.getElementById('announceBanner');
    if (!data.enabled || !data.announcements || data.announcements.length === 0) {
      bar.classList.add('hidden');
      if (announceTimer) { clearInterval(announceTimer); announceTimer = null; }
      return;
    }

    const items = data.announcements;
    const mode = data.mode;
    const interval = data.interval || 5000;

    bar.className = `announce-bar style-${items[0].style || 'info'}`;

    if (items.length === 1 || mode === 'single') {
      const a = items[0];
      bar.innerHTML = `
        <div class="announce-bar-inner">
          <span class="announce-icon">${escapeHtml(a.icon || '📣')}</span>
          <span class="announce-msg">${escapeHtml(a.message)}</span>
          ${a.link_url ? `<a href="${escapeHtml(a.link_url)}" target="_blank" class="announce-link">${escapeHtml(a.link_label || 'Learn more')}</a>` : ''}
          <button class="announce-close" onclick="dismissAnnouncement()"><i class="fas fa-times"></i></button>
        </div>
      `;
    } else {
      const slidesHtml = items.map((a, i) => `
        <div class="announce-slide${i === 0 ? ' active' : ''}" data-style="${a.style || 'info'}">
          <span class="announce-icon">${escapeHtml(a.icon || '📣')}</span>
          <span class="announce-msg">${escapeHtml(a.message)}</span>
          ${a.link_url ? `<a href="${escapeHtml(a.link_url)}" target="_blank" class="announce-link">${escapeHtml(a.link_label || 'Learn more')}</a>` : ''}
        </div>
      `).join('');

      const dotsHtml = items.map((_, i) => `<span class="announce-dot${i === 0 ? ' active' : ''}"></span>`).join('');

      bar.innerHTML = `
        <div class="announce-bar-inner" style="position:relative">
          ${slidesHtml}
        </div>
        ${items.length > 1 ? `<div class="announce-dots">${dotsHtml}</div>` : ''}
        <button class="announce-close" onclick="dismissAnnouncement()"><i class="fas fa-times"></i></button>
      `;

      announceIndex = 0;
      if (announceTimer) clearInterval(announceTimer);
      announceTimer = setInterval(() => rotateAnnouncement(bar, items), interval);
    }
  } catch (err) {
    console.error('Announcements load error:', err);
  }
}

function rotateAnnouncement(bar, items) {
  const slides = bar.querySelectorAll('.announce-slide');
  const dots = bar.querySelectorAll('.announce-dot');
  if (!slides.length) return;

  const current = slides[announceIndex];
  current.classList.add('exit-up');
  current.classList.remove('active');

  announceIndex = (announceIndex + 1) % items.length;

  const next = slides[announceIndex];
  const style = next.dataset.style || 'info';
  bar.className = `announce-bar style-${style}`;

  setTimeout(() => {
    current.classList.remove('exit-up');
    next.classList.add('active');
  }, 80);

  dots.forEach((d, i) => d.classList.toggle('active', i === announceIndex));
}

function dismissAnnouncement() {
  const bar = document.getElementById('announceBanner');
  bar.classList.add('hidden');
  if (announceTimer) { clearInterval(announceTimer); announceTimer = null; }
}
