// ============ SIDEBAR PROMO CARD ============
async function loadSidebarPromo() {
  try {
    const data = await api('/api/sidebar-promo');
    if (!data) return;
    // Pick which card to show based on login state
    const isLoggedIn = !!currentUser;
    const s = isLoggedIn ? data.member : data.guest;
    if (!s || s.enabled !== '1') return;
    const card = document.getElementById('sidebarPromo');
    if (!card) return;
    document.getElementById('sidebarPromoBadge').textContent    = s.badge    || '';
    document.getElementById('sidebarPromoTitle').textContent    = s.title    || '';
    document.getElementById('sidebarPromoSubtitle').textContent = s.subtitle || '';
    const btn = document.getElementById('sidebarPromoBtn');
    btn.textContent = s.btn_text || 'Upgrade Now';
    const url = (s.btn_url || '').trim();
    btn.onclick = null;
    btn.removeAttribute('target');
    if (!url) {
      // No URL configured — default to pricing page
      btn.href = '#';
      btn.onclick = (e) => { e.preventDefault(); showPage('pricing'); };
    } else {
      const pageMatch = url.match(/[?&]page=([^&]+)/);
      if (pageMatch) {
        // SPA page URL like /app?page=pricing — navigate in-app
        btn.href = '#';
        btn.onclick = (e) => { e.preventDefault(); showPage(pageMatch[1]); };
      } else if (url.startsWith('http')) {
        // External URL — open in new tab
        btn.href = url;
        btn.target = '_blank';
      } else {
        // Internal path like /pricing — navigate normally
        btn.href = url;
      }
    }
    card.classList.remove('hidden');
  } catch (e) { console.warn('[GT] Sidebar promo error:', e); }
}

// Called after login/logout to refresh the promo card
function refreshSidebarPromo() {
  const card = document.getElementById('sidebarPromo');
  if (card) card.classList.add('hidden');
  loadSidebarPromo();
}

// ============ BOTTOM NOTIFICATION BAR ============
async function loadBottomBar() {
  try {
    const data = await api('/api/bottom-bar');
    if (!data) return;
    const s = currentUser ? data.member : data.guest;
    if (!s || s.enabled !== '1') return;
    // Check session dismissal
    const key = currentUser ? 'gt_bottombar_member_dismissed' : 'gt_bottombar_guest_dismissed';
    if (sessionStorage.getItem(key)) return;
    document.getElementById('bottomBarMsg').textContent = s.message || '';
    const btn = document.getElementById('bottomBarBtn');
    btn.textContent = s.btn_text || 'Learn More';
    const barUrl = s.btn_url || '';
    btn.onclick = null;
    if (barUrl) {
      const pageMatch = barUrl.match(/[?&]page=([^&]+)/);
      if (pageMatch) {
        btn.href = '#';
        btn.onclick = (e) => { e.preventDefault(); showPage(pageMatch[1]); };
      } else {
        btn.href = barUrl;
        btn.target = barUrl.startsWith('http') ? '_blank' : '_self';
      }
    } else {
      btn.href = '#';
    }
    const bar = document.getElementById('bottomBar');
    bar.classList.remove('hidden');
    requestAnimationFrame(() => bar.classList.add('visible'));
  } catch (e) { console.warn('[GT] Bottom bar error:', e); }
}

function closeBottomBar() {
  const bar = document.getElementById('bottomBar');
  bar.classList.remove('visible');
  setTimeout(() => bar.classList.add('hidden'), 300);
  const key = currentUser ? 'gt_bottombar_member_dismissed' : 'gt_bottombar_guest_dismissed';
  sessionStorage.setItem(key, '1');
}

function refreshBottomBar() {
  const bar = document.getElementById('bottomBar');
  if (bar) { bar.classList.remove('visible'); bar.classList.add('hidden'); }
  loadBottomBar();
}

// ============ PROMOTIONAL POPUP ============
// Depends on: helpers.js (api)
// Shows the active popup from admin on dashboard load.
// "Don't show again" is stored per popup ID in localStorage.

async function loadPromoPopup() {
  try {
    const popup = await api('/api/popup');
    if (!popup) return;

    // Check if user dismissed this specific popup
    if (popup.show_dont_show && localStorage.getItem(`gt_popup_dismissed_${popup.id}`)) return;

    renderPromoPopup(popup);
  } catch (_) {}
}

// Minimal rich text for the popup body: `code` chips, **bold** and line breaks.
// XSS-safe by construction — the text is FULLY escaped first, and only then do
// we introduce our own tags. Admin-authored copy still can't inject HTML.
// Note escapeHtml() leaves quotes intact, so the chip's value is NEVER written
// into an attribute — the copy handler reads it back off textContent instead.
function _promoRich(text) {
  return escapeHtml(text)
    .replace(/`([^`\n]+)`/g, '<button type="button" class="promo-code">$1</button>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// Turn every `code` chip in the popup into click-to-copy. Saves the user
// retyping a coupon at checkout — the whole point of showing them one.
function _wirePromoCodes(root) {
  root.querySelectorAll('.promo-code').forEach(btn => {
    btn.title = 'Click to copy';
    btn.addEventListener('click', async () => {
      // Mid-confirmation the label reads "Copied!", so ignore clicks until it resets.
      if (btn.classList.contains('copied')) return;
      const code = btn.textContent.trim();
      try {
        await navigator.clipboard.writeText(code);
      } catch (_) {
        // Older/insecure contexts have no clipboard API — fall back to a temp selection.
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (__) {}
        ta.remove();
      }
      btn.classList.add('copied');
      btn.dataset.label = code;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = btn.dataset.label;
        btn.classList.remove('copied');
      }, 1400);
    });
  });
}

function renderPromoPopup(p) {
  const el = document.getElementById('promoPopup');
  if (!el) return;

  // Media
  let mediaHtml = '';
  if (p.media_type === 'image' && p.media_url) {
    mediaHtml = `<div class="promo-media"><img src="${escapeHtml(p.media_url)}" alt="${escapeHtml(p.title)}"></div>`;
  } else if (p.media_type === 'video' && p.media_url) {
    mediaHtml = `<div class="promo-media"><video src="${escapeHtml(p.media_url)}" autoplay muted loop playsinline controls></video></div>`;
  }

  // Button
  const btnHtml = p.button_text && p.button_url
    ? `<a href="${escapeHtml(p.button_url)}" target="_blank" rel="noopener" class="promo-btn">${escapeHtml(p.button_text)}</a>`
    : '';

  // Don't show again checkbox
  const dontShowHtml = p.show_dont_show
    ? `<label class="promo-dont-show">
         <input type="checkbox" id="promoDontShow"> Don't show this again
       </label>`
    : '';

  el.innerHTML = `
    <div class="promo-overlay" onclick="closePromoPopup(${p.id}, false)"></div>
    <div class="promo-card">
      <button class="promo-close" onclick="closePromoPopup(${p.id}, false)" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
      ${mediaHtml}
      <div class="promo-body">
        <h2 class="promo-title">${escapeHtml(p.title)}</h2>
        ${p.subtitle ? `<p class="promo-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}
        ${p.highlight ? `<p class="promo-highlight"${p.highlight_color ? ` style="color:${escapeHtml(p.highlight_color)}"` : ''}>${_promoRich(p.highlight)}</p>` : ''}
        ${p.description ? `<p class="promo-desc">${_promoRich(p.description)}</p>` : ''}
        ${btnHtml}
        ${dontShowHtml}
      </div>
    </div>
  `;

  _wirePromoCodes(el);

  el.classList.remove('hidden');
  // Slight delay so animation plays on entry
  requestAnimationFrame(() => el.classList.add('visible'));
}

function closePromoPopup(popupId, fromDontShow) {
  const el = document.getElementById('promoPopup');
  if (!el) return;

  const checkbox = document.getElementById('promoDontShow');
  if (checkbox && checkbox.checked) {
    localStorage.setItem(`gt_popup_dismissed_${popupId}`, '1');
  }

  el.classList.remove('visible');
  setTimeout(() => el.classList.add('hidden'), 300);
}
