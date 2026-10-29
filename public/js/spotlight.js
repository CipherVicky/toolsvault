// ============ SPOTLIGHT HERO ============
// Depends on: helpers.js (api, escapeHtml)
//
// The big rotating banner at the top of Home / Tools. Prime real estate, so
// it's for SELLING (featured tool, offer, launch) — notices and warnings live
// in the strips below it, where dismissing one doesn't wipe out the other.
//
// Home and Tools hold separate content and independent rotation state, so a
// tools-page promo never bleeds onto Home.

const _spot = {
  home:  { items: [], idx: 0, timer: null, loaded: false },
  tools: { items: [], idx: 0, timer: null, loaded: false }
};
const SPOT_ROTATE_MS = 6500;

async function loadSpotlight(page) {
  const st = _spot[page];
  if (!st || st.loaded) return;          // fetch once per page per session
  st.loaded = true;
  try {
    const data = await api(`/api/spotlights?page=${encodeURIComponent(page)}`);
    st.items = (data && data.items) || [];
    renderSpotlight(page);
  } catch (e) {
    st.items = [];                       // never let the hero break the page
  }
}

function renderSpotlight(page) {
  const st = _spot[page];
  const el = document.getElementById(page === 'tools' ? 'spotlightTools' : 'spotlightHome');
  if (!el || !st) return;

  if (!st.items.length) {
    el.classList.add('hidden');
    el.innerHTML = '';
    _spotStopRotate(page);
    return;
  }

  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="spot-track">${st.items.map((s, i) => _spotSlideHtml(s, i)).join('')}</div>
    ${st.items.length > 1 ? `
      <button class="spot-arrow prev" onclick="spotPrev('${page}')" aria-label="Previous slide">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button class="spot-arrow next" onclick="spotNext('${page}')" aria-label="Next slide">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      <div class="spot-dots">
        ${st.items.map((_, i) => `<button class="spot-dot${i === 0 ? ' active' : ''}" onclick="spotGo('${page}',${i})" aria-label="Slide ${i + 1}"></button>`).join('')}
      </div>` : ''}
  `;
  st.idx = 0;
  _spotStartRotate(page);
  _spotTickTimers();
}

function _spotSlideHtml(s, i) {
  const bg = (s.bg_start || s.bg_end)
    ? `background:linear-gradient(120deg, ${escapeHtml(s.bg_start || s.bg_end)}, ${escapeHtml(s.bg_end || s.bg_start)})`
    : '';
  const onClick = (s.tool_slug || s.cta_url)
    ? ` onclick="spotAction(${JSON.stringify(s.tool_slug || '').replace(/"/g, '&quot;')},${JSON.stringify(s.cta_url || '').replace(/"/g, '&quot;')})" style="cursor:pointer"`
    : '';

  return `
    <div class="spot-slide${i === 0 ? ' active' : ''}" style="${bg}"${onClick}>
      <div class="spot-copy">
        ${s.eyebrow ? `<span class="spot-eyebrow">${escapeHtml(s.eyebrow)}</span>` : ''}
        <h2 class="spot-title">${escapeHtml(s.title)}</h2>
        ${s.subtitle ? `<p class="spot-sub">${escapeHtml(s.subtitle)}</p>` : ''}
        ${s.show_timer && s.ends_at ? `<div class="spot-timer" data-ends="${escapeHtml(s.ends_at)}"></div>` : ''}
        ${s.cta_text ? `<span class="spot-cta">${escapeHtml(s.cta_text)}</span>` : ''}
      </div>
      ${s.image_url ? `
        <div class="spot-visual">
          ${s.badge ? `<span class="spot-badge">${escapeHtml(s.badge)}</span>` : ''}
          ${/\.(mp4|webm)(\?|$)/i.test(s.image_url)
            /* A UI demo as a GIF is routinely 5-10 MB; the same clip as MP4 is a
               few hundred KB, because GIF has no interframe compression and is
               capped at 256 colours. Detecting the extension means the admin
               pastes a URL either way and never has to know which tag to use.
               muted+playsinline are what make autoplay legal on iOS and Chrome;
               without both, the video silently refuses to start. */
            ? `<video src="${escapeHtml(s.image_url)}" autoplay muted loop playsinline preload="metadata"
                      onerror="this.closest('.spot-visual').style.display='none'"></video>`
            : `<img src="${escapeHtml(s.image_url)}" alt="" loading="lazy"
                    onerror="this.closest('.spot-visual').style.display='none'">`}
        </div>` : ''}
    </div>`;
}

function spotAction(slug, url) {
  if (slug && typeof openTool === 'function') return openTool(slug);
  if (!url) return;
  /* action:<name> addresses something in the app that is not a page — here,
     the suggestion box. Without it a banner could only ever navigate, so
     "tell us what you need" would have to dump the user on a page and hope
     they found the form. */
  const act = String(url).match(/^action:([a-z-]+)/i);
  if (act) {
    if (typeof gtOpenRequestModal === 'function') {
      if (act[1] === 'suggest') return gtOpenRequestModal('', 'missing');
      if (act[1] === 'problem') return gtOpenRequestModal('', 'problem');
    }
    return;
  }
  // /app/<page> stays in-app; anything external opens a new tab
  const m = String(url).match(/^\/app\/([a-z-]+)/i);
  if (m && typeof showPage === 'function') return showPage(m[1]);
  if (/^https?:\/\//i.test(url)) return window.open(url, '_blank', 'noopener');
  window.location.href = url;
}

/* Arrows wrap at both ends. A carousel that dead-ends makes the user check
   whether they broke it; wrapping means the control always does something.
   Both route through spotGo, so they also restart the dwell timer — being
   yanked to the next slide 400ms after choosing one feels like a fault. */
function spotPrev(page) {
  const st = _spot[page];
  if (st && st.items.length > 1) spotGo(page, st.idx - 1);
}
function spotNext(page) {
  const st = _spot[page];
  if (st && st.items.length > 1) spotGo(page, st.idx + 1);
}

function spotGo(page, i) {
  const st = _spot[page];
  const el = document.getElementById(page === 'tools' ? 'spotlightTools' : 'spotlightHome');
  if (!st || !el || !st.items.length) return;
  st.idx = ((i % st.items.length) + st.items.length) % st.items.length;
  el.querySelectorAll('.spot-slide').forEach((s, n) => s.classList.toggle('active', n === st.idx));
  el.querySelectorAll('.spot-dot').forEach((d, n) => d.classList.toggle('active', n === st.idx));
  _spotStartRotate(page);              // manual pick restarts the dwell timer
}

function _spotStartRotate(page) {
  const st = _spot[page];
  _spotStopRotate(page);
  if (!st || st.items.length < 2) return;
  st.timer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;   // don't spin unseen
    spotGoQuiet(page, st.idx + 1);
  }, SPOT_ROTATE_MS);
}
function _spotStopRotate(page) {
  const st = _spot[page];
  if (st && st.timer) { clearInterval(st.timer); st.timer = null; }
}
// Advance without resetting the interval (used by the auto-rotate itself)
function spotGoQuiet(page, i) {
  const st = _spot[page];
  const el = document.getElementById(page === 'tools' ? 'spotlightTools' : 'spotlightHome');
  if (!st || !el || !st.items.length) return;
  st.idx = ((i % st.items.length) + st.items.length) % st.items.length;
  el.querySelectorAll('.spot-slide').forEach((s, n) => s.classList.toggle('active', n === st.idx));
  el.querySelectorAll('.spot-dot').forEach((d, n) => d.classList.toggle('active', n === st.idx));
}

// Live countdown ("2d 04h 11m"). Urgency that expires by itself — no cleanup,
// and the slide auto-hides server-side once ends_at passes.
function _spotTickTimers() {
  const nodes = document.querySelectorAll('.spot-timer[data-ends]');
  if (!nodes.length) return;
  nodes.forEach(n => {
    const raw = n.getAttribute('data-ends');
    const iso = /Z|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : String(raw).replace(' ', 'T') + 'Z';
    let ms = new Date(iso).getTime() - Date.now();
    if (!ms || isNaN(ms) || ms <= 0) { n.textContent = 'Ended'; n.classList.add('ended'); return; }
    const d = Math.floor(ms / 86400000); ms -= d * 86400000;
    const h = Math.floor(ms / 3600000);  ms -= h * 3600000;
    const m = Math.floor(ms / 60000);    ms -= m * 60000;
    const s = Math.floor(ms / 1000);
    n.textContent = d > 0 ? `⏳ ${d}d ${h}h ${m}m left` : `⏳ ${h}h ${m}m ${s}s left`;
  });
}
setInterval(_spotTickTimers, 1000);

// Called by showPage() so each page loads its own slides on first visit.
function refreshSpotlight(page) {
  if (page === 'home' || page === 'tools') loadSpotlight(page);
}
