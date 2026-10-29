// ============ HOME DASHBOARD ============
// Depends on: helpers.js (api, toast, escapeHtml, currentUser, gtTimeAgo),
//             tools.js (allTools, openTool), user.js (showPage)
//
// Ordering rule for this page: TOOLS FIRST, account second. People open tools
// every day and check their plan once a month, so the thing they came for gets
// the top of the page. The hero is a working launcher rather than a search box
// that goes somewhere else — on a tool platform, "get me in" IS the product.

// Weak devices get the layout without the cursor physics. Same signal the rest
// of the dashboard already uses, so behaviour stays consistent across pages.
const _hLite = () => (typeof window !== 'undefined' && window.GT_LITE) ||
  matchMedia('(prefers-reduced-motion: reduce)').matches;

let _homeLoaded   = false;   // heavy sections load once per page load
let _homeFeed     = null;
let _lxItems      = [];
let _lxShown      = [];
let _lxSel        = 0;

/* ────────────────────────────────────────────────────────────────────────────
   STATUS RAIL
   One rail, three tiers, decided by consequence — never by how much we want it
   seen. Urgent (money/access) turns it amber and removes the dismiss button so
   it stays until resolved. Normal shows the single most important item plus a
   count; the drawer holds the rest. Quiet still reports honest status, because
   on a shared-credential product "everything's working" is the real message.
   The rail NEVER stacks: two banners means neither gets read.
   ──────────────────────────────────────────────────────────────────────────── */
const _RAIL_ICON = {
  fixed: ['fa-circle-check', 'var(--h-ok)',     'rgba(16,185,129,.14)'],
  new:   ['fa-wand-magic-sparkles', 'var(--h-accent)', 'rgba(167,139,250,.14)'],
  promo: ['fa-tag',          'var(--h-pink)',   'rgba(236,72,153,.14)'],
  info:  ['fa-circle-info',  'var(--h-blue)',   'rgba(56,189,248,.14)'],
};

async function loadHomeRail() {
  const rail = document.getElementById('hRail');
  if (!rail) return;
  try {
    _homeFeed = await api('/api/home/feed');
  } catch (e) {
    rail.classList.add('hidden');           // rail must never break the page
    return;
  }
  const f = _homeFeed || {};
  // items the user already dismissed this session stay gone until reload
  let seen = {};
  try { seen = JSON.parse(sessionStorage.getItem('gt_rail_seen') || '{}') || {}; } catch (e) {}
  const items = (f.items || []).filter(i => !seen[i.id]);

  const msg  = document.getElementById('hRailMsg');
  const more = document.getElementById('hRailMore');
  const cta  = document.getElementById('hRailCta');
  const x    = document.getElementById('hRailX');
  const sep  = document.getElementById('hRailSep');
  rail.classList.remove('hidden', 'urgent', 'open');

  if (f.urgent) {
    // TIER 1 — not dismissible on purpose. It is about to cost them access.
    rail.classList.add('urgent');
    msg.innerHTML = `<b>${escapeHtml(f.urgent.title)}</b> — ${escapeHtml(f.urgent.body)}`;
    cta.innerHTML = `${escapeHtml(f.urgent.cta)} <i class="fas fa-arrow-right"></i>`;
    cta.style.display = ''; cta.onclick = e => { e.preventDefault(); showPage('pricing'); };
    x.style.display = 'none';
  } else {
    // TIER 2/3 — honest status headline. The count carries everything else.
    const n = f.status && f.status.refreshed_today;
    msg.innerHTML = `<b>Everything's working</b> — extension connected` +
      (n ? `, ${n} access point${n === 1 ? '' : 's'} refreshed today` : ', all sessions healthy');
    cta.style.display = 'none';
    x.style.display = items.length ? '' : 'none';
  }

  if (items.length) {
    sep.style.display = '';
    more.style.display = '';
    more.innerHTML = `${items.length} update${items.length > 1 ? 's' : ''} <i class="fas fa-chevron-down"></i>`;
    document.getElementById('hRailList').innerHTML = items.map(i => {
      const [ic, col, bg] = _RAIL_ICON[i.kind] || _RAIL_ICON.info;
      return `<div class="h-ann" data-id="${escapeHtml(i.id)}">
        <div class="h-ann-ic" style="background:${bg};color:${col}"><i class="fas ${ic}"></i></div>
        <div class="h-ann-b">
          <div class="h-ann-t">${escapeHtml(i.title)}</div>
          ${i.body ? `<div class="h-ann-s">${escapeHtml(i.body)}</div>` : ''}
        </div>
        ${i.when ? `<span class="h-ann-when">${gtTimeAgo(i.when)}</span>` : ''}
        <button class="h-ann-x" aria-label="Dismiss"><i class="fas fa-xmark"></i></button>
      </div>`;
    }).join('');
    _wireRailDismiss();
    /* Open by default now that it is a card with room. In the old 40px strip
       the drawer had to start closed or it covered the page; here the updates
       ARE the point, and an announcement behind a click is an announcement
       nobody reads. Still collapsible — the chevron keeps working. */
    rail.classList.add('open');
  } else {
    sep.style.display = 'none';
    more.style.display = 'none';
  }

  // the same items feed the permanent changelog, so dismissing loses nothing
  _renderChangelog(f.items || []);
}

function _wireRailDismiss() {
  document.querySelectorAll('#hRailList .h-ann-x').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const row = btn.closest('.h-ann');
      let seen = {};
      try { seen = JSON.parse(sessionStorage.getItem('gt_rail_seen') || '{}') || {}; } catch (e2) {}
      seen[row.dataset.id] = 1;
      try { sessionStorage.setItem('gt_rail_seen', JSON.stringify(seen)); } catch (e2) {}
      row.style.cssText += ';opacity:0;transform:translateX(10px);transition:.2s';
      setTimeout(() => {
        row.remove();
        const n = document.querySelectorAll('#hRailList .h-ann').length;
        const more = document.getElementById('hRailMore');
        if (!n) {
          more.style.display = 'none';
          document.getElementById('hRailSep').style.display = 'none';
          document.getElementById('hRail').classList.remove('open');
        } else {
          more.innerHTML = `${n} update${n > 1 ? 's' : ''} <i class="fas fa-chevron-down"></i>`;
        }
      }, 200);
    };
  });
}

function toggleHomeRail(e) {
  if (e) e.stopPropagation();
  document.getElementById('hRail').classList.toggle('open');
}
function dismissHomeRailHead() {
  document.getElementById('hRailMsg').innerHTML = `<b>Everything's working</b> — all sessions healthy`;
  document.getElementById('hRailX').style.display = 'none';
}

/* ────────────────────────────────────────────────────────────────────────────
   LAUNCHER — a real palette, not a search box. "/" focuses it from anywhere,
   arrows move, Enter opens, Esc closes. Index is built from the tools already
   in memory plus the AI studios and the pages people actually look for.
   ──────────────────────────────────────────────────────────────────────────── */
const _LX_STATIC = [
  { n: 'Nano Banana Pro — image', t: 'AI',   ic: 'fa-wand-magic-sparkles', go: () => openTool('ai-nano-banana') },
  { n: 'Generate a video',        t: 'AI',   ic: 'fa-film',       go: () => showPage('tools') },
  { n: 'Remove a background',     t: 'AI',   ic: 'fa-scissors',   go: () => openTool('ai-bg-remove') },
  { n: 'Upscale an image',        t: 'AI',   ic: 'fa-expand',     go: () => openTool('ai-upscale') },
  { n: 'Describe an image',       t: 'AI',   ic: 'fa-eye',        go: () => openTool('ai-describe') },
  { n: 'Your plan & credits',     t: 'Page', ic: 'fa-crown',      go: () => showPage('pricing') },
  { n: 'Install the extension',   t: 'Page', ic: 'fa-puzzle-piece', go: () => showPage('extension') },
  { n: 'Browse all tools',        t: 'Page', ic: 'fa-th-large',   go: () => showPage('tools') },
];

// allTools is only filled by loadTools(), which runs on the TOOLS page — so on a
// fresh home load it is empty and the launcher would find nothing. Fetch the list
// ourselves when that happens; /api/tools is edge-cached, so it is nearly free.
let _lxFetching = false;
function _buildLxIndex() {
  const src = (typeof allTools !== 'undefined' && Array.isArray(allTools)) ? allTools : [];
  _lxItems = src
    .filter(t => !t.slug || !t.slug.startsWith('ai-'))     // AI studios are listed by task instead
    .map(t => ({ n: t.name, t: 'Tool', logo: t.logo_url, go: () => openTool(t.slug) }))
    .concat(_LX_STATIC);

  if (!src.length && !_lxFetching) {
    _lxFetching = true;
    api('/api/tools').then(list => {
      if (!Array.isArray(list)) return;
      // hand it to tools.js too, so opening the Tools page doesn't refetch
      if (typeof allTools !== 'undefined') { try { allTools = list; } catch (e) {} }
      _lxItems = list
        .filter(t => !t.slug || !t.slug.startsWith('ai-'))
        .map(t => ({ n: t.name, t: 'Tool', logo: t.logo_url, go: () => openTool(t.slug) }))
        .concat(_LX_STATIC);
      // if the user is already typing, re-run the filter against the real index
      const inp = document.getElementById('hLxIn');
      if (inp && document.getElementById('hLx').classList.contains('on')) _lxRender(inp.value);
    }).catch(() => {}).finally(() => { _lxFetching = false; });
  }
}

function _lxRender(q) {
  const pop = document.getElementById('hLxPop');
  if (!pop) return;
  const s = (q || '').trim().toLowerCase();
  _lxShown = s
    ? _lxItems.filter(i => i.n.toLowerCase().includes(s)).slice(0, 7)
    : _lxItems.slice(0, 5);

  if (!_lxShown.length) {
    // a search that finds nothing is a demand signal, not a dead end
    pop.innerHTML = `<div class="h-lx-empty">Nothing matches “${escapeHtml(q)}”.
      <button class="h-lx-ask" onclick="showPage('tools')">Tell us what you need →</button></div>`;
    return;
  }
  _lxSel = Math.min(_lxSel, _lxShown.length - 1);
  pop.innerHTML =
    `<div class="h-lx-grp">${s ? 'Results' : 'Jump to'}</div>` +
    _lxShown.map((i, k) => `<div class="h-lx-row${k === _lxSel ? ' sel' : ''}" data-k="${k}">
      ${i.logo ? `<img src="${escapeHtml(i.logo)}" alt="" onerror="this.style.visibility='hidden'">`
                : `<div class="h-lx-ic"><i class="fas ${i.ic || 'fa-cube'}"></i></div>`}
      <span class="h-lx-nm">${escapeHtml(i.n)}</span>
      <span class="h-lx-tag">${i.t}</span></div>`).join('') +
    `<div class="h-lx-foot"><span><kbd>↑↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>`;

  pop.querySelectorAll('.h-lx-row').forEach(r => {
    r.onmouseenter = () => { _lxSel = +r.dataset.k; _lxPaint(); };
    r.onclick = () => _lxGo(+r.dataset.k);
  });
}
function _lxPaint() {
  document.querySelectorAll('#hLxPop .h-lx-row').forEach((r, k) => r.classList.toggle('sel', k === _lxSel));
}
function _lxGo(k) {
  const it = _lxShown[k];
  if (!it) return;
  _lxClose();
  const inp = document.getElementById('hLxIn');
  if (inp) inp.value = '';
  try { it.go(); } catch (e) {}
}
function _lxOpen()  { const l = document.getElementById('hLx'); if (l) { l.classList.add('on'); _lxRender(document.getElementById('hLxIn').value); } }
function _lxClose() { const l = document.getElementById('hLx'); if (l) l.classList.remove('on'); }

function initHomeLauncher() {
  const inp = document.getElementById('hLxIn');
  if (!inp || inp.dataset.wired) return;
  inp.dataset.wired = '1';
  _buildLxIndex();

  inp.addEventListener('focus', _lxOpen);
  inp.addEventListener('input', () => { _lxSel = 0; _lxRender(inp.value); });
  inp.addEventListener('keydown', e => {
    if (!_lxShown.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); _lxSel = (_lxSel + 1) % _lxShown.length; _lxPaint(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); _lxSel = (_lxSel - 1 + _lxShown.length) % _lxShown.length; _lxPaint(); }
    if (e.key === 'Enter')     { e.preventDefault(); _lxGo(_lxSel); }
    if (e.key === 'Escape')    { inp.blur(); _lxClose(); }
  });
  document.addEventListener('click', e => {
    const l = document.getElementById('hLx');
    if (l && !l.contains(e.target)) _lxClose();
  });
  // "/" from anywhere — but never while the user is typing in another field
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey) return;
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    const home = document.getElementById('page-home');
    if (!home || home.classList.contains('hidden')) return;   // only on this page
    e.preventDefault();
    inp.focus();
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   JUMP BACK IN — the tools they actually use, with the freshness stamp that
   answers "is this still alive?" without them having to click and find out.
   ──────────────────────────────────────────────────────────────────────────── */
async function loadHomeRecent() {
  const el = document.getElementById('hDeck');
  if (!el) return;
  let acts = [];
  try { acts = await api('/api/user/activity'); } catch (e) {}
  if (!Array.isArray(acts) || !acts.length) {
    // first-time user: point at the catalogue rather than showing an empty shelf
    el.innerHTML = `<div class="h-empty">
      <i class="fas fa-compass"></i>
      <div class="h-empty-t">Nothing opened yet</div>
      <div class="h-empty-s">Pick your first tool — everything in your plan is one click away.</div>
      <button class="h-btn h-btn-p" onclick="showPage('tools')">Browse tools</button></div>`;
    document.getElementById('hDeckSec').classList.remove('hidden');
    return;
  }
  const seen = new Set();
  const list = acts.filter(a => { if (seen.has(a.tool_id)) return false; seen.add(a.tool_id); return true; }).slice(0, 4);

  el.innerHTML = list.map(a => `
    <a class="h-t3d" href="#" onclick="event.preventDefault();openTool('${escapeHtml(a.slug || '')}')">
      <div class="h-sheen"></div>
      <div class="h-t3d-top">
        ${a.logo_url ? `<img class="h-t3d-logo" src="${escapeHtml(gtLogoSrc(a.logo_url))}" alt="" onerror="this.style.visibility='hidden'">`
                     : `<div class="h-t3d-logo h-t3d-fallback"><i class="fas fa-cube"></i></div>`}
        <span class="h-fresh"><i class="h-d"></i>${gtTimeAgo(a.accessed_at)}</span>
      </div>
      <div class="h-t3d-nm">${escapeHtml(a.name || 'Tool')}</div>
      <p class="h-body h-clamp2 h-t3d-ds">${escapeHtml(a.description || 'Open it again from here.')}</p>
      <span class="h-t3d-go">Open again <i class="fas fa-arrow-right"></i></span>
    </a>`).join('');

  document.getElementById('hDeckSec').classList.remove('hidden');
  _initTilt();
}

/* real depth: the card rotates and the inner layers sit at different translateZ,
   so the logo lifts further than the text. rAF-batched; skipped on weak devices. */
function _initTilt() {
  if (_hLite()) return;
  const MAX = 9;
  document.querySelectorAll('.h-t3d').forEach(c => {
    if (c.dataset.tilt) return;
    c.dataset.tilt = '1';
    let raf = null, ev = null;
    c.addEventListener('mousemove', e => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const r = c.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
        c.style.transform = `rotateY(${(px - .5) * MAX * 2}deg) rotateX(${-(py - .5) * MAX * 2}deg) translateZ(6px)`;
        c.style.setProperty('--mx', px * 100 + '%');
        c.style.setProperty('--my', py * 100 + '%');
      });
    });
    c.addEventListener('mouseleave', () => { c.style.transform = ''; });
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   CATEGORIES — <span data-gt-tools>100+</span> tools is the product, so it gets a section of its own.
   ──────────────────────────────────────────────────────────────────────────── */
const _CAT_COLOR = [
  ['var(--h-accent)', 'rgba(167,139,250,.14)'], ['var(--h-pink)', 'rgba(236,72,153,.14)'],
  ['var(--h-blue)',   'rgba(56,189,248,.14)'],  ['var(--h-ok)',   'rgba(16,185,129,.14)'],
  ['var(--h-warn)',   'rgba(245,158,11,.14)'],  ['var(--h-muted)','rgba(255,255,255,.07)'],
];
// NOTE: must NOT be called _catIcon — tools.js already owns that name and these
// are classic scripts sharing one global scope. home.js loads later, so the
// collision silently replaced the tools page version and broke its headers.
// categories.icon holds an EMOJI in this database ("🤖"), not a FontAwesome
// class. Putting that in a class attribute renders an empty box, so detect the
// format instead of assuming one: only strings that actually look like FA
// classes go in `class`, everything else is printed as text.
function _homeCatIcon(icon) {
  const s = (icon || '').trim();
  if (!s) return '<i class="fas fa-cube"></i>';
  if (/^(fa[srlbd]?\s|fa-)/.test(s)) return `<i class="${escapeHtml(s)}"></i>`;
  return `<span class="h-cat-emo">${escapeHtml(s)}</span>`;
}

async function loadHomeCategories() {
  const el = document.getElementById('hCats');
  if (!el) return;
  let cats = [];
  try { cats = await api('/api/categories'); } catch (e) { return; }
  cats = (cats || []).filter(c => c.tool_count > 0).slice(0, 6);
  if (!cats.length) return;

  el.innerHTML = cats.map((c, i) => {
    const [col, bg] = _CAT_COLOR[i % _CAT_COLOR.length];
    return `<button class="h-cat" onclick="filterCategory(${c.id});showPage('tools')">
      <div class="h-cat-ic" style="background:${bg};color:${col}">${_homeCatIcon(c.icon)}</div>
      <div class="h-cat-nm">${escapeHtml(c.name)}</div>
      <div class="h-cat-n">${c.tool_count} tool${c.tool_count === 1 ? '' : 's'}</div></button>`;
  }).join('');

  const total = document.getElementById('hCatTotal');
  if (total && _homeFeed && _homeFeed.status) total.textContent = _homeFeed.status.tool_count || '';
  document.getElementById('hCatSec').classList.remove('hidden');

  if (_hLite()) return;
  el.querySelectorAll('.h-cat').forEach(c => {
    c.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.transform = `translate(${(px - .5) * 6}px, ${(py - .5) * 6 - 3}px)`;
      c.style.setProperty('--mx', px * 100 + '%');
      c.style.setProperty('--my', py * 100 + '%');
    });
    c.addEventListener('mouseleave', () => { c.style.transform = ''; });
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   ACCOUNT — one card, not four boxes. Every branch fails closed: an unknown
   value renders an em dash rather than a guess.
   ──────────────────────────────────────────────────────────────────────────── */
async function loadHomeAccount() {
  const sec = document.getElementById('hAcctSec');
  if (!sec || !currentUser) return;
  let p = null, c = null;
  try { p = await api('/api/user/profile'); } catch (e) { return; }
  try { c = await api('/api/user/credits'); } catch (e) {}

  const planName = (typeof _planLabelHome === 'function') ? _planLabelHome(p.plan) : _hPlanLabel(p.plan);
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const html = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };

  set('hAcctPlan', planName);
  document.getElementById('hAcctPlan').className = 'h-badge acc';

  // expiry
  const exp = p.plan_expires_at ? new Date(p.plan_expires_at) : null;
  if (exp && !isNaN(exp)) {
    const d = Math.ceil((exp - Date.now()) / 86400000);
    html('hAcctRenew', d > 0 ? `${d}<small>day${d === 1 ? '' : 's'}</small>` : 'Expired');
    document.getElementById('hAcctRenew').classList.toggle('h-warn', d <= 7);
    set('hAcctRenewLbl', d > 0 ? 'Renews in' : 'Plan');
  } else {
    set('hAcctRenewLbl', 'Member since');
    set('hAcctRenew', p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—');
  }

  html('hAcctDev', `${p.device_count || 0}<small>of ${p.device_limit || 1}</small>`);
  set('hAcctTools', p.tools_used || 0);

  // headline line + gauge
  const bal = Number(c && c.balance) || 0;
  const alloc = Number(c && c.plan_allocation) || 0;
  const parts = [];
  if (exp && !isNaN(exp)) parts.push(`Renews <b>${exp.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</b>`);
  if (alloc > 0) parts.push(`<b>${bal.toLocaleString()}</b> of ${alloc.toLocaleString()} credits left this month`);
  html('hAcctLine', parts.join(' · ') || 'You are on the free plan.');

  sec.classList.remove('hidden');
  _animateGauge(bal, alloc);
}
function _hPlanLabel(p) {
  return ({ free: 'Free', basic: 'Basic', standard: 'Standard', premium: 'Premium', ultimate: 'AI Toolkit' })[p] || p || 'Free';
}

// gauge + count-up run once, when the card is first scrolled into view
function _animateGauge(bal, alloc) {
  const arc = document.getElementById('hGArc'), out = document.getElementById('hGVal');
  if (!arc || !out) return;
  const C = 301.6;
  const pct = alloc > 0 ? Math.max(0, Math.min(1, bal / alloc)) : 0;
  const run = () => {
    requestAnimationFrame(() => { arc.style.strokeDashoffset = C * (1 - pct); });
    if (_hLite()) { out.textContent = bal.toLocaleString(); return; }
    const t0 = performance.now(), D = 1100;
    (function tick(t) {
      const q = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - q, 3);
      out.textContent = Math.round(bal * e).toLocaleString();
      if (q < 1) requestAnimationFrame(tick);
    })(t0);
  };
  const card = document.getElementById('hAcctCard');
  if (!card || !('IntersectionObserver' in window)) { run(); return; }
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { io.disconnect(); run(); } });
  }, { threshold: .25 });
  io.observe(card);
}

/* ── CHANGELOG — the permanent home for everything, so dismissing the rail
      never loses information. ─────────────────────────────────────────────── */
function _renderChangelog(items) {
  const el = document.getElementById('hLog');
  if (!el) return;
  const list = (items || []).filter(i => i.when).slice(0, 5);
  if (!list.length) { document.getElementById('hLogSec').classList.add('hidden'); return; }
  const TAG = { fixed: ['Fixed', 'ok'], new: ['New', 'acc'], promo: ['Offer', 'pink'], info: ['Update', 'ok'] };
  el.innerHTML = list.map(i => {
    const [t, cls] = TAG[i.kind] || TAG.info;
    return `<div class="h-row">
      <span class="h-row-d">${_hShortDate(i.when)}</span>
      <span class="h-row-t">${escapeHtml(i.title)}</span>
      <span class="h-badge ${cls}">${t}</span></div>`;
  }).join('');
  document.getElementById('hLogSec').classList.remove('hidden');
}
function _hShortDate(s) {
  try {
    return new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z'))
      .toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch (e) { return ''; }
}

/* ── RECENT ACTIVITY list ──────────────────────────────────────────────────── */
async function loadHomeActivity() {
  const el = document.getElementById('hAct');
  if (!el) return;
  let acts = [];
  try { acts = await api('/api/user/activity'); } catch (e) { return; }
  if (!Array.isArray(acts) || !acts.length) { document.getElementById('hActSec').classList.add('hidden'); return; }
  el.innerHTML = acts.slice(0, 5).map(a => `
    <div class="h-row">
      ${a.logo_url ? `<img class="h-row-lg" src="${escapeHtml(gtLogoSrc(a.logo_url))}" alt="" onerror="this.style.visibility='hidden'">`
                   : `<div class="h-row-lg h-t3d-fallback"><i class="fas fa-cube"></i></div>`}
      <span class="h-row-t">${escapeHtml(a.name || 'Tool')}</span>
      <span class="h-ago">${gtTimeAgo(a.accessed_at)}</span></div>`).join('');
  document.getElementById('hActSec').classList.remove('hidden');
}

/* ── SUPPORT — wired to whatever the admin has actually configured ─────────── */
async function loadHomeSupport() {
  const sec = document.getElementById('hHelpSec');
  if (!sec) return;
  let s = {};
  try { s = await api('/api/settings/support-widgets'); } catch (e) {}
  const wa = document.getElementById('hHelpWa');
  if (wa) {
    if (s.whatsapp_enabled && s.whatsapp_number) {
      wa.href = 'https://wa.me/' + String(s.whatsapp_number).replace(/\D/g, '') +
                (s.whatsapp_message ? '?text=' + encodeURIComponent(s.whatsapp_message) : '');
      wa.target = '_blank'; wa.rel = 'noopener';
      wa.closest('.h-card').classList.remove('hidden');
    } else {
      wa.closest('.h-card').classList.add('hidden');
    }
  }
  const lc = document.getElementById('hHelpChat');
  if (lc) {
    if (s.tawkto_enabled) lc.closest('.h-card').classList.remove('hidden');
    else lc.closest('.h-card').classList.add('hidden');
  }
  sec.classList.remove('hidden');
}
function homeOpenChat(e) {
  if (e) e.preventDefault();
  if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') window.Tawk_API.maximize();
  else toast('Live chat is loading — try again in a moment', 'info');
}

/* ── reveal-on-scroll ──────────────────────────────────────────────────────── */
function _initHomeReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('#page-home .h-rv').forEach(e => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12 });
  document.querySelectorAll('#page-home .h-rv').forEach(e => io.observe(e));
}

/* ────────────────────────────────────────────────────────────────────────────
   SIDEBAR ACCOUNT BLOCK
   Lives here rather than in a page loader because the sidebar is on every page,
   so it has to survive navigation. Guests never see it — they get the login
   button that's already there. Fails closed: an unknown balance shows a dash.
   ──────────────────────────────────────────────────────────────────────────── */
let _sbLoaded = false;

function initSidebarAccount() {
  const box = document.getElementById('sbAccount');
  if (!box) return;

  if (!currentUser) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');

  // identity comes from state we already hold, so it paints immediately
  const first = (currentUser.first_name || '').trim();
  const last  = (currentUser.last_name || '').trim();
  const nm = [first, last].filter(Boolean).join(' ') || currentUser.email || 'Account';
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('sbName', nm);
  set('sbPlan', _hPlanLabel(currentUser.plan));

  const av = document.getElementById('sbAvatar');
  if (av) {
    const url = currentUser.avatar_url || localStorage.getItem('gt_avatar') || '';
    if (url) av.innerHTML = `<img src="${escapeHtml(url)}" alt="" onerror="this.remove()">`;
    else av.textContent = ((first.charAt(0) + last.charAt(0)) || nm.charAt(0) || 'U').toUpperCase();
  }

  if (_sbLoaded) return;      // the network parts only need doing once
  _sbLoaded = true;

  api('/api/user/credits').then(c => {
    const bal = Number(c && c.balance) || 0;
    const alloc = Number(c && c.plan_allocation) || 0;
    set('sbCredits', bal.toLocaleString());
    const bar = document.getElementById('sbCredBar');
    if (bar && alloc > 0) {
      const pct = Math.max(0, Math.min(100, (bal / alloc) * 100));
      bar.querySelector('i').style.width = pct + '%';
      bar.classList.toggle('low', pct < 15);
    }
  }).catch(() => {});          // leave the dash rather than invent a number

  // live tool count on the nav — answers "how much am I actually getting"
  api('/api/tools').then(list => {
    if (!Array.isArray(list) || !list.length) return;
    const el = document.getElementById('sbToolCount');
    if (el) { el.textContent = list.length; el.classList.remove('hidden'); }
  }).catch(() => {});
}

/* ── entry point, called by showPage('home') ───────────────────────────────── */
function loadHome() {
  const g = document.getElementById('hGreet');
  if (g && currentUser && currentUser.first_name) g.textContent = currentUser.first_name;

  initHomeLauncher();
  if (_homeLoaded) { _buildLxIndex(); return; }   // refresh the index, skip the rest
  _homeLoaded = true;

  loadHomeRail();
  loadHomeRecent();
  loadHomeCategories();
  loadHomeAccount();
  loadHomeActivity();
  loadHomeSupport();
  _initHomeReveal();
}
