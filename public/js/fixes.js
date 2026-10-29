// ============ "WORKING AGAIN" STRIP ============
// Depends on: helpers.js (api, escapeHtml)
//
// Design notes (deliberate, don't "simplify" these away):
//  · NOT a modal. A modal blocks the goal the user came for, so the click
//    becomes "remove obstacle" instead of "read". A strip sits on the eye path
//    to the tools grid and gets read in passing — zero interaction required.
//  · Targeted server-side to tools the user actually opened. A broadcast strip
//    becomes wallpaper in ~2 weeks and then fails for the case that matters.
//  · Restrained green on the dark surface, not a loud filled bar. Loud bars
//    read as alerts (= something's wrong); restraint reads as in-control, which
//    is what a paying audience is buying.
//  · Everything visible at once — no rotation, no expand, no "+N more".
//    Waiting for a carousel is the same failure as the bell icon.

let _fixItems = [];
let _fixLoaded = false;

async function loadFixBanner() {
  if (!userToken) return;                    // guests have no usage history to target
  try {
    const data = await api('/api/fixes');
    _fixItems = (data && data.items) || [];
    _fixLoaded = true;
    renderFixBanner();
  } catch (e) {
    _fixItems = [];                          // never let this break the page
  }
}

// Home + Tools only. Kept off checkout/pricing on purpose — interrupting
// someone mid-payment is the most expensive place to put a distraction.
const _FIX_PAGES = ['home', 'tools'];

function refreshFixBannerVisibility(page) {
  const bar = document.getElementById('fixBanner');
  if (!bar) return;
  const ok = _FIX_PAGES.includes(page) && _fixItems.length > 0;
  bar.classList.toggle('hidden', !ok);
}

function renderFixBanner() {
  const bar = document.getElementById('fixBanner');
  if (!bar) return;

  if (!_fixItems.length) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
    return;
  }

  const chips = _fixItems.map(f => {
    const logo = f.logo_url
      ? `<img src="${escapeHtml(f.logo_url)}" alt="" class="fix-chip-logo" onerror="this.style.display='none'">`
      : `<span class="fix-chip-dot"></span>`;
    return `<button class="fix-chip" onclick="openFixedTool('${escapeHtml(f.slug)}')" title="Open ${escapeHtml(f.tool_name)}">
      ${logo}<span>${escapeHtml(f.tool_name)}</span>
    </button>`;
  }).join('');

  // "Working again" over "Fixed" — present-positive. "Fixed" makes the past
  // breakage the salient fact; this keeps the focus on the current good state.
  const label = _fixItems.length === 1 ? 'Working again' : `${_fixItems.length} tools working again`;

  bar.innerHTML = `
    <div class="fix-bar-inner">
      <span class="fix-bar-icon"><i class="fas fa-circle-check"></i></span>
      <span class="fix-bar-label">${label}</span>
      <div class="fix-chips">${chips}</div>
      <button class="fix-bar-close" onclick="dismissFixBanner()" aria-label="Dismiss">
        <i class="fas fa-times"></i>
      </button>
    </div>`;

  const current = document.querySelector('.page:not(.hidden)');
  const page = current ? current.id.replace('page-', '') : 'home';
  refreshFixBannerVisibility(page);
}

function openFixedTool(slug) {
  if (typeof openTool === 'function') openTool(slug);
}

// Dismisses only what they've seen. A fix announced tomorrow brings the strip
// back with just the new tool — so the channel never dies permanently.
async function dismissFixBanner() {
  const bar = document.getElementById('fixBanner');
  const ids = _fixItems.map(f => f.id);
  if (bar) bar.classList.add('hidden');
  _fixItems = [];
  try { await api('/api/fixes/dismiss', 'POST', { ids }); } catch (e) {}
}
