// ============ USER TOOLS ============
// Depends on: helpers.js (api, toast, escapeHtml, currentUser)
// Depends on: auth.js (openAuthModal)

const TOOL_TIERS = { '': 0, free: 1, basic: 2, premium: 3, ultimate: 4 };
const PLAN_RANK = { free: 0, basic: 1, standard: 2, premium: 3, ultimate: 4 }; // cheapest→priciest
let _purchasedToolIds = new Set(); // tools bought à-la-carte (still active)

// Logged-in users now SEE every tool that's available in any plan (locked or not),
// so the page acts like a storefront. Lock state is computed separately.
function canUserSeeTool(tool) {
  if (!currentUser) return true; // guests see everything
  if (_purchasedToolIds.has(tool.id)) return true; // bought individually → always visible
  const keys = tool.plan_keys || [];
  return keys.length > 0; // in at least one plan → show it (locked or unlocked)
}
// True when the tool exists but the user's current plan doesn't include it (and they
// haven't bought it individually) → show it locked with an "Unlock with X" CTA.
function isToolPlanLocked(tool) {
  if (!currentUser) return false;                 // guests: prompt sign-up on access, not "locked"
  if (_purchasedToolIds.has(tool.id)) return false;
  const keys = tool.plan_keys || [];
  if (keys.length === 0) return false;
  return !keys.includes(currentUser.plan);
}
function _cheapestPlanKey(keys) { return [...(keys || [])].sort((a, b) => (PLAN_RANK[a] ?? 9) - (PLAN_RANK[b] ?? 9))[0]; }
function _planLabel(key) { return (_planMeta && _planMeta.names[key]) || (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'a plan'); }
// "Basic", "Basic & Premium", or "Basic, Standard & Premium" — every plan a tool is in, cheapest first
function _planNamesList(keys) {
  const names = [...(keys || [])].sort((a, b) => (PLAN_RANK[a] ?? 9) - (PLAN_RANK[b] ?? 9)).map(_planLabel);
  if (names.length <= 1) return names[0] || 'a plan';
  if (names.length === 2) return names.join(' & ');
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}

// Load the user's à-la-carte tool purchases so they show + are accessible
async function loadPurchasedTools() {
  if (!currentUser) { _purchasedToolIds = new Set(); return; }
  try {
    const r = await api('/api/user/purchased-tools');
    _purchasedToolIds = new Set((r && r.tool_ids) || []);
  } catch (e) { _purchasedToolIds = new Set(); }
}

// Plan display names + which tools are sold individually (for the unlock modal). Cached.
let _planMeta = null;
async function loadPlanMeta() {
  if (_planMeta) return _planMeta;
  try {
    const d = await api('/api/pricing');
    const names = {}; (d.plans || []).forEach(p => { if (p.plan_key) names[p.plan_key] = p.name; });
    const indByTool = {};
    (d.individualTools || []).forEach(it => { if (it.tool_id) indByTool[it.tool_id] = { id: it.id, price_inr: it.price_inr, price_usd: it.price_usd }; });
    // Plan price + tool count power the value line on the unlock modal.
    const plans = {};
    (d.plans || []).forEach(p => {
      if (p.plan_key) plans[p.plan_key] = { price_inr: p.price_inr, price_usd: p.price_usd, tool_count: p.tool_count || 0 };
    });
    _planMeta = { names, indByTool, plans };
  } catch (e) { _planMeta = { names: {}, indByTool: {}, plans: {} }; }
  return _planMeta;
}

let allTools = [];
let _toolsLoaded = false; // true once /api/tools has been fetched at least once (avoids redundant re-fetch + re-render blink on every Tools nav)
let currentCategory = null;
// One-time reset to the new compact "grid" cards (the approved preview look). Clears any old
// saved 'detail' preference once, then respects the user's choice afterward.
try { if (!localStorage.getItem('gt_view_v2')) { localStorage.removeItem('gt_view_mode'); localStorage.setItem('gt_view_v2', '1'); } } catch (e) {}
let currentViewMode = localStorage.getItem('gt_view_mode') || 'grid'; // default = compact preview-style cards
let hideLocked = localStorage.getItem('gt_hide_locked') === '1';
let _upsellPlans = null;

function toggleHideLocked() {
  hideLocked = !hideLocked;
  localStorage.setItem('gt_hide_locked', hideLocked ? '1' : '0');
  const btn = document.getElementById('hideLockedBtn');
  if (btn) btn.classList.toggle('active', hideLocked);
  renderTools(allTools);
}

// ============ CATEGORIES ============
let _catApiCache = null;
async function loadCategories() {
  try {
    _catApiCache = await api('/api/categories');
    renderCategoryPills();
  } catch (err) {
    console.error('Categories load error:', err);
  }
}
// Category pills exclude AI generators (they live in AI Studio). Count the non-AI
// tools per category from allTools; hide any category that has none left.
function renderCategoryPills() {
  if (!_catApiCache) return;
  const container = document.getElementById('categoryPills');
  if (!container) return;
  const list = (typeof allTools !== 'undefined' ? allTools : []);
  const nonAiByCat = {};
  list.forEach(t => { if (t.auth_type !== 'ai_generator' && t.category_name) nonAiByCat[t.category_name] = (nonAiByCat[t.category_name] || 0) + 1; });
  const haveTools = list.length > 0;
  container.innerHTML = _catApiCache
    .map(c => {
      // if allTools is loaded, use the non-AI count; else fall back to the API count
      const n = haveTools ? (nonAiByCat[c.name] || 0) : c.tool_count;
      return { c, n };
    })
    .filter(x => x.n > 0)
    .map(({ c, n }) => `
        <button class="cat-pill" data-cat="${c.slug}" onclick="filterCategory('${c.slug}')">
          ${c.icon} ${escapeHtml(c.name)} <small style="opacity:0.6">(${n})</small>
        </button>
      `).join('');
  requestAnimationFrame(updateCategoryScrollState);
}

function scrollCategories(dir) {
  const bar = document.getElementById('categoriesBar');
  if (!bar) return;
  bar.scrollBy({ left: dir * Math.max(200, bar.clientWidth * 0.7), behavior: 'smooth' });
}

function updateCategoryScrollState() {
  const bar = document.getElementById('categoriesBar');
  if (!bar) return;
  const wrap = bar.parentElement;
  const hasOverflow = bar.scrollWidth > bar.clientWidth + 2;
  wrap.classList.toggle('has-overflow', hasOverflow);
  wrap.classList.toggle('at-start', hasOverflow && bar.scrollLeft <= 2);
  wrap.classList.toggle('at-end', hasOverflow && bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 2);
}

(function initCategoryScroll() {
  function attach() {
    const bar = document.getElementById('categoriesBar');
    if (!bar) return;
    bar.addEventListener('wheel', function(e) {
      if (e.deltaY === 0) return;
      e.preventDefault();
      bar.scrollLeft += e.deltaY;
    }, { passive: false });
    bar.addEventListener('scroll', updateCategoryScrollState, { passive: true });
    window.addEventListener('resize', updateCategoryScrollState);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();

function filterCategory(slug) {
  currentCategory = slug;
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', slug === null ? p.dataset.cat === 'all' : p.dataset.cat === slug);
  });
  loadTools();
}

// ============ TOOLS ============
async function loadTools() {
  try {
    const params = new URLSearchParams();
    if (currentCategory) params.set('category', currentCategory);
    const search = document.getElementById('searchInput').value;
    if (search) params.set('search', search);

    const tools = await api('/api/tools?' + params.toString());
    allTools = tools;
    renderCategoryPills(); // re-count pills now that allTools is known (excludes AI)
    await loadPurchasedTools(); // so individually-bought tools show + filter correctly
    await loadReportLocks();   // so the "Report a problem" button knows which tools are already reported
    if (forYouOn && !_frecent) await loadFrecent(); // ranking for the "For You" section
    if (currentUser) await loadPlanMeta(); // plan names + individual-tool map for the lock badges/modal
    const hideBtn = document.getElementById('hideLockedBtn');
    if (hideBtn) hideBtn.classList.toggle('active', hideLocked);
    // "For You" persists across sessions, so the button has to reflect that on load
    const fyBtn = document.getElementById('forYouBtn');
    if (fyBtn) {
      fyBtn.classList.toggle('active', forYouOn);
      fyBtn.classList.toggle('hidden', !currentUser);  // guests have no history to rank
    }
    // Sync the view-mode toolbar to the active mode (HTML defaults to grid)
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === currentViewMode));
    renderTools(tools);
    _toolsLoaded = true;
  } catch (err) {
    console.error('Tools load error:', err);
  }
}

// Map a category name → clean monochrome FontAwesome icon for the section header (matches the preview)
function _catIcon(name) {
  const n = (name || '').toLowerCase();
  if (/ai|generat/.test(n)) return 'fa-wand-magic-sparkles';
  if (/design|graphic/.test(n)) return 'fa-palette';
  if (/stock|photo|image/.test(n)) return 'fa-images';
  if (/video|motion/.test(n)) return 'fa-film';
  if (/writ|copy|content/.test(n)) return 'fa-pen-nib';
  if (/seo|search/.test(n)) return 'fa-magnifying-glass-chart';
  if (/market/.test(n)) return 'fa-bullhorn';
  if (/audio|music|sound|voice/.test(n)) return 'fa-music';
  if (/learn|course|edu/.test(n)) return 'fa-graduation-cap';
  return 'fa-layer-group';
}

// Renders a single tool card (used by both the flat grid and the category sections)
/* ────────────────────────────────────────────────────────────────────────────
   FOR YOU — the tools you actually reach for, kept at the top.

   Ranked server-side by frecency (see /api/tools/frecent): frequency weighted by
   how recent each use was. Neither half works alone — raw counts freeze last
   month's habits in place, pure recency forgets a daily tool the moment you skip
   a day. It re-ranks itself as habits change; there is nothing to curate.

   Deliberately ADDITIVE: it prepends a section rather than filtering, so turning
   it on never hides anything. Below three distinct tools there is no signal worth
   showing, so it stays hidden rather than presenting a list of one.
   ──────────────────────────────────────────────────────────────────────────── */
const FORYOU_KEY = 'gt_for_you';
const FORYOU_MIN = 3;          // fewer than this isn't a habit, it's a coincidence
let forYouOn   = localStorage.getItem(FORYOU_KEY) === '1';
let _frecent   = null;         // [{tool_id, score, uses}] — null until fetched

async function loadFrecent() {
  if (!currentUser) { _frecent = []; return; }
  try {
    const r = await api('/api/tools/frecent');
    _frecent = (r && r.ranked) || [];
  } catch (e) { _frecent = []; }   // fall back to plain category order
}

function _forYouSectionHtml(usable) {
  if (!forYouOn || !currentUser || !_frecent || _frecent.length < FORYOU_MIN) return '';
  const byId = {};
  usable.forEach(t => { byId[t.id] = t; });
  // rank order is the server's; anything the user can no longer open just drops out
  const picks = _frecent.map(r => byId[r.tool_id]).filter(Boolean).slice(0, 8);
  if (picks.length < FORYOU_MIN) return '';
  return `<div class="ts-sec ts-foryou">
      <div class="ts-head">
        <span class="ts-ic"><i class="fas fa-wand-magic-sparkles"></i></span>For You
        <span class="ts-count">${picks.length}</span>
        <span class="ts-foryou-note">Learns from what you open</span>
        <span class="ts-line"></span>
      </div>
      <div class="tools-grid">${picks.map(_toolCardHtml).join('')}</div>
    </div>`;
}

async function toggleForYou() {
  forYouOn = !forYouOn;
  localStorage.setItem(FORYOU_KEY, forYouOn ? '1' : '0');
  const btn = document.getElementById('forYouBtn');
  if (btn) btn.classList.toggle('active', forYouOn);

  if (forYouOn) {
    if (!_frecent) await loadFrecent();
    // Say why nothing appeared rather than silently doing nothing — a toggle that
    // looks broken is worse than one that explains itself.
    if (!_frecent || _frecent.length < FORYOU_MIN) {
      toast('Open a few tools first — this starts suggesting once it has something to go on', 'info');
    }
  }
  renderTools(allTools);
}

/* Category → hue. Matched on the name rather than the id so a renamed or newly
   added category still lands somewhere sensible instead of falling back to a
   single purple. Keyword order matters: "AI Generators" must be caught by the
   ai/generat test before anything else can claim it. */
const _CAT_HUES = [
  [/ai|generat/,            '#a78bfa'],
  [/design|graphic|icon/,   '#EC4899'],
  [/stock|photo|image/,     '#F59E0B'],
  [/video|motion/,          '#38BDF8'],
  [/writ|copy|content/,     '#2DD4BF'],
  [/seo|search/,            '#10B981'],
  [/market/,                '#FB923C'],
  [/develop|code/,          '#818CF8'],
  [/educat|learn|course/,   '#22D3EE'],
  [/entertain|stream/,      '#F472B6'],
];
function _catHue(name) {
  const n = (name || '').toLowerCase();
  for (const [re, hue] of _CAT_HUES) if (re.test(n)) return hue;
  return '#a78bfa';
}

/* A card is tinted with its OWN brand colour when we could read one off the logo,
   so the band identifies the tool rather than just its shelf. Falls back to the
   category hue when the logo has no usable colour — a black wordmark, an
   unreadable format, or a tool added since the last backfill. Validated before
   use: this value reaches an inline style attribute, so anything that isn't a
   plain hex is refused rather than trusted. */
function _toolHue(tool) {
  const c = (tool && tool.logo_color || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  return _catHue(tool && tool.category_name);
}

/* Exposes the logo as a CSS url() so the band can paint a scaled, blurred copy
   of it behind the sharp mark — the album-art treatment. Blurring is what makes
   the crop acceptable: a square logo stretched across a wide band shows only its
   middle strip, which is unreadable sharp and simply a colour field once blurred.
   The value lands inside a style attribute, so the URL is restricted to shapes
   we actually issue and anything containing quotes, parens or a backslash is
   dropped rather than escaped — there is no reason to accept those here. */
function _logoVar(tool) {
  const u = (tool && tool.logo_url || '').trim();
  if (!u) return '';
  if (!/^(https?:\/\/|\/uploads\/)/i.test(u)) return '';
  if (/["'()\\\s]/.test(u)) return '';
  return `;--logo:url("${u}")`;
}

function _toolCardHtml(tool) {
  const isFav = userFavorites.has(tool.id);
  const locked = tool.is_locked;
  const favBtn = currentUser ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${tool.id})" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
      <i class="fa${isFav ? 's' : 'r'} fa-heart"></i>
    </button>` : '';

  const logoFallback = `this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex'`;
  const logo = tool.logo_url
    ? `<img class="tool-card-logo" src="${escapeHtml(gtLogoSrc(tool.logo_url))}" alt="" onerror="${logoFallback}"><div class="tool-card-logo-placeholder" style="display:none">${escapeHtml(tool.name[0])}</div>`
    : `<div class="tool-card-logo-placeholder">${escapeHtml(tool.name[0])}</div>`;

  const planLocked = !locked && isToolPlanLocked(tool);
  const unlockKey = planLocked ? _cheapestPlanKey(tool.plan_keys) : null;
  const unlockLbl = planLocked ? _planLabel(unlockKey) : '';

  const badge = tool.badge ? `<span class="tool-badge badge-${tool.badge.toLowerCase()}">${escapeHtml(tool.badge)}</span>` : '';
  const lockChip = locked
    ? `<span class="tool-lock-chip"><i class="fas fa-lock"></i> Coming Soon</span>`
    : planLocked
      ? `<span class="tool-lock-chip tool-unlock-chip"><i class="fas fa-lock"></i> ${escapeHtml(unlockLbl)}</span>`
      : '';
  const cardClass = `tool-card${locked ? ' is-locked' : ''}${planLocked ? ' is-plan-locked' : ''}${tool.is_featured ? ' is-featured' : ''}`;
  const clickAttr = locked
    ? `onclick="showLockedToast(event)"`
    : planLocked
      ? `onclick="showUnlockModal(${tool.id})"`
      : `onclick="openTool('${tool.slug}')"`;
  const statusText = locked
    ? `<span class="tool-card-status locked"><i class="fas fa-lock"></i> Coming Soon</span>`
    : planLocked
      ? `<span class="tool-card-status locked"><i class="fas fa-lock"></i> ${escapeHtml(unlockLbl)}</span>`
      : `<span class="tool-card-status"><span class="dot"></span> Active</span>`;
  const footerLink = locked ? 'Coming Soon' : planLocked ? 'Unlock' : 'Open';

  // The old card spent about 55% of its height on a purple→orange banner stamped
  // "GraphicoToolz" — identical on every card, so it carried no information while
  // being the loudest thing on the page, and the watermark named the site the user
  // was already on. The logo is the identity now, and the space it freed goes to
  // what the tool does plus how fresh its session is: the two things that decide
  // whether someone clicks.
  const desc = (tool.description || '').trim();
  const fresh = (!locked && !planLocked && tool.last_verified)
    // "2h ago" alone is ambiguous — ago since what? The verb is the whole point.
    ? `<span class="tc-fresh"><span class="d"></span>Refreshed ${escapeHtml(gtTimeAgo(tool.last_verified))}</span>`
    : statusText;

  // The band keeps the useful half of the old banner — a colour block that made a
  // card scannable from across the screen — and drops the wordmark that made it
  // useless. Its hue comes from the category, so the block now carries meaning
  // instead of repeating the name of the site the user is already on.
  return `
    <div class="${cardClass}" ${clickAttr} style="--h:${_toolHue(tool)}">
      <div class="tc-tr">${badge}${lockChip}${favBtn}</div>
      <div class="tc-band"><div class="tc-logo">${logo}</div></div>
      <div class="tc-body">
        <div class="tc-name">${escapeHtml(tool.name)}</div>
        ${desc ? `<p class="tc-desc">${escapeHtml(desc)}</p>` : '<div class="tc-desc-sp"></div>'}
        <div class="tc-foot">
          ${fresh}
          <span class="tool-card-link">${footerLink} <i class="fas fa-arrow-right"></i></span>
        </div>
      </div>
    </div>
  `;
}

function renderTools(tools) {
  const grid = document.getElementById('toolsGrid');
  const noTools = document.getElementById('noTools');
  const count = document.getElementById('toolsCount');

  let filtered = tools;
  // AI generators live in their own workspace (AI Studio) — keep them OUT of the
  // normal tools directory so the two groups stay separate.
  filtered = filtered.filter(t => t.auth_type !== 'ai_generator');
  // Filter by user's plan — logged-in users only see tools they have access to
  filtered = filtered.filter(canUserSeeTool);
  if (showFavoritesOnly && currentUser) {
    filtered = filtered.filter(t => userFavorites.has(t.id));
  }
  if (hideLocked) {
    // hide both "coming soon" and plan-locked tools
    filtered = filtered.filter(t => !t.is_locked && !isToolPlanLocked(t));
  }

  // Order for THIS user (stable sort preserves each group's existing order):
  //  1) AI tools the user can actually use (their plan's AI), 2) other usable tools,
  //  3) locked tools (coming-soon OR other plans' tools — incl. locked AI) at the bottom.
  // So only the AI tools allowed on the user's plan sit on top — not every locked AI tool.
  const _rank = t => {
    const lockedNow = t.is_locked || isToolPlanLocked(t); // can't use on this plan
    if (!lockedNow && t.auth_type === 'ai_generator') return 0; // usable AI → very top
    if (!lockedNow) return 1;                                   // usable regular tools
    return 2;                                                   // locked (AI or regular) → bottom
  };
  filtered = [...filtered].sort((a, b) => _rank(a) - _rank(b));

  renderFreeBanner();
  count.textContent = `${filtered.length} tool${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noTools.classList.remove('hidden');
    if (showFavoritesOnly) {
      noTools.innerHTML = '<i class="fas fa-heart"></i><p>No favorite tools yet. Click the heart on any tool to add it.</p>';
    } else {
      // A dead end used to be the end of the conversation. Now it captures the
      // demand instead — and answers on the spot when we already stock it.
      const q = (((document.getElementById('searchInput') || {}).value) || '').trim();
      if (typeof gtLogFailedSearch === 'function') gtLogFailedSearch(q, false);
      if (typeof gtInjectRequestStyles === 'function') {
        gtInjectRequestStyles();
        noTools.innerHTML =
          `<i class="fas fa-search"></i><p>${q ? `No results for "${escapeHtml(q)}"` : 'No tools found'}</p>`
          + gtRequestBoxHtml(q);
      } else {
        noTools.innerHTML = '<i class="fas fa-search"></i><p>No tools found</p>';
      }
    }
    return;
  }

  noTools.classList.add('hidden');
  _injectLockStyles(); // ensure section-header + lock styles are present (idempotent)

  // Sectioned (category headers) only in the default "All" browse — when a specific category
  // is selected, the user is searching, or favorites-only is on, render a single flat grid.
  const searchActive = (((document.getElementById('searchInput') || {}).value) || '').trim().length > 0;
  const sectioned = !currentCategory && !showFavoritesOnly && !searchActive;

  if (!sectioned) {
    grid.className = 'tools-grid';
    grid.innerHTML = filtered.map(_toolCardHtml).join('');
  } else {
    // Two passes so the user ALWAYS sees their usable tools first, with every locked
    // tool (coming-soon OR another plan's tools, incl. AI Toolkit-only AI) collected
    // into category sections at the very BOTTOM. Within each pass, sections follow the
    // admin category order; uncategorized → "More Tools" last within its pass.
    const isLocked = t => t.is_locked || isToolPlanLocked(t);
    const buildSections = (list, lockedPass) => {
      const groups = {}, meta = {};
      list.forEach(t => {
        const k = t.category_name || '__uncat__';
        if (!groups[k]) { groups[k] = []; meta[k] = { uncat: !t.category_name, so: (t.category_sort_order != null ? t.category_sort_order : 99999) }; }
        groups[k].push(t);
      });
      const order = Object.keys(groups).sort((a, b) =>
        (meta[a].uncat - meta[b].uncat) || (meta[a].so - meta[b].so) || a.localeCompare(b));
      return order.map(k => {
        const items = groups[k];
        const label = meta[k].uncat ? 'More Tools' : k;
        const icon = lockedPass ? 'fa-lock' : _catIcon(label);
        // the section carries the same hue as its cards, so the header, rule and
        // icon all agree — locked sections stay neutral, they are not a category
        const hue = lockedPass ? 'var(--text-3)' : _catHue(label);
        return `<div class="ts-sec" style="--h:${hue}"><div class="ts-head${lockedPass ? ' ts-locked' : ''}">`
          + `<span class="ts-ic"><i class="fas ${icon}"></i></span>${escapeHtml(label)}<span class="ts-count">${items.length}</span><span class="ts-line"></span></div>`
          + `<div class="tools-grid">${items.map(_toolCardHtml).join('')}</div></div>`;
      }).join('');
    };
    const usable = filtered.filter(t => !isLocked(t));
    const locked = filtered.filter(isLocked);
    grid.className = 'tools-sections';
    grid.innerHTML = _forYouSectionHtml(usable) + buildSections(usable, false) + buildSections(locked, true);
  }

  // Show upsell cards for higher plans after the tools grid
  renderPlanUpsell(tools);
}

function showLockedToast(ev) {
  if (ev) ev.stopPropagation();
  toast('This tool is coming soon. We\'re adding access shortly!', 'info');
}

// "Refreshed 2h ago" next to an access point. This is the PASSIVE half of the
// fix-communication system — it works on people who never read a banner, never
// report a problem and never open the bell. Someone who got logged out on
// Tuesday comes back Thursday, sees the session was refreshed since, and just
// tries again. No message to read, no action required.
//
// Colour rule (important): green when fresh, plain grey otherwise — NEVER red
// or amber. An alarm colour on a tool that works perfectly manufactures doubt
// that wasn't there. We only ever highlight the positive.
function _freshnessHtml(ts) {
  if (!ts || typeof gtTimeAgo !== 'function') return '';
  const ago = gtTimeAgo(ts);
  if (!ago) return '';
  const iso = /Z|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : ts.replace(' ', 'T') + 'Z';
  const hrs = (Date.now() - new Date(iso).getTime()) / 3600000;
  const fresh = hrs >= 0 && hrs < 24;
  // Kept on one line — stray whitespace inside a flex pill renders as a gap.
  return `<span class="access-fresh${fresh ? ' is-fresh' : ''}" title="Session last refreshed"><i class="fas fa-rotate"></i>${escapeHtml(ago)}</span>`;
}

// Notes shown above the Access Points: per-tool note (access_note) + the global
// universal support note (with optional WhatsApp / Live Chat buttons).
function _toolNotesHtml(tool) {
  let html = '';
  if (tool.access_note && tool.access_note.trim()) {
    html += `<div class="tool-note tool-note-info">
      <div class="tool-note-icon"><i class="fas fa-circle-info"></i></div>
      <div class="tool-note-body">${escapeHtml(tool.access_note).replace(/\n/g, '<br>')}</div>
    </div>`;
  }
  const un = tool.universal_note;
  if (un && (un.text || un.whatsapp || un.livechat)) {
    let btns = '';
    if (un.whatsapp && un.whatsapp_number) {
      const waUrl = 'https://wa.me/' + un.whatsapp_number + (un.whatsapp_message ? '?text=' + encodeURIComponent(un.whatsapp_message) : '');
      btns += `<a class="tool-note-btn tool-note-wa" href="${waUrl}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp Support</a>`;
    }
    if (un.livechat) {
      btns += `<button class="tool-note-btn tool-note-chat" onclick="_openLiveChat()"><i class="fas fa-comments"></i> Live Chat</button>`;
    }
    html += `<div class="tool-note tool-note-support">
      <div class="tool-note-icon"><i class="fas fa-headset"></i></div>
      <div class="tool-note-body">
        ${un.text ? `<div>${escapeHtml(un.text).replace(/\n/g, '<br>')}</div>` : ''}
        ${btns ? `<div class="tool-note-btns">${btns}</div>` : ''}
      </div>
    </div>`;
  }
  return html;
}
function _openLiveChat() {
  try { if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') { window.Tawk_API.maximize(); return; } } catch (e) {}
  toast('Live chat is loading — please try again in a moment.', 'info');
}

// ============ LOCKED TOOL → UNLOCK MODAL ============
function _injectLockStyles() {
  if (document.getElementById('gtLockStyles')) return;
  const s = document.createElement('style');
  s.id = 'gtLockStyles';
  s.textContent = `
    /* tool DETAIL page — shown instead of Access Points when the plan excludes it */
    .td-lock{display:flex;gap:16px;align-items:flex-start;padding:20px;border-radius:16px;
      background:linear-gradient(180deg,rgba(139,92,246,.10),rgba(139,92,246,.03));
      border:1px solid rgba(139,92,246,.28)}
    .td-lock-ico{flex-shrink:0;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;
      background:rgba(139,92,246,.16);color:#a78bfa;font-size:17px}
    .td-lock-body{flex:1;min-width:0}
    .td-lock-body h4{margin:0 0 6px;font-size:15.5px;font-weight:700;color:var(--text-1);line-height:1.35}
    .td-lock-body p{margin:0 0 14px;font-size:13px;color:var(--text-2);line-height:1.55}
    .td-lock-actions{display:flex;gap:10px;flex-wrap:wrap}
    .td-lock-actions .btn-access{background:linear-gradient(135deg,#8b5cf6,#7c3aed);border:none;color:#fff}
    .btn-ghost-sm{background:none;border:1px solid var(--border-hover);color:var(--text-2);
      padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:.2s}
    .btn-ghost-sm:hover{color:var(--text-1);border-color:var(--accent)}
    .tool-card.is-plan-locked{position:relative}
    .tool-card.is-plan-locked .tool-card-logo,.tool-card.is-plan-locked .tool-card-logo-placeholder{filter:grayscale(.4) opacity(.92)}
    .tool-card.is-plan-locked::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(10,8,20,.04),rgba(10,8,20,.16));pointer-events:none;z-index:1}
    .tool-unlock-chip{background:linear-gradient(135deg,#8b5cf6,#ec4899)!important;color:#fff!important;border:none!important;z-index:2}
    .tool-card.is-plan-locked .tool-card-status.locked{color:#a78bfa}
    /* free-plan banner */
    .free-plan-banner{display:flex;align-items:center;gap:14px;margin:0 0 16px;padding:14px 18px;border-radius:14px;
      background:linear-gradient(135deg,rgba(139,92,246,.16),rgba(236,72,153,.12));border:1px solid rgba(139,92,246,.3);position:relative;overflow:hidden}
    .free-plan-banner .fpb-icon{width:40px;height:40px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;background:linear-gradient(135deg,#8b5cf6,#ec4899)}
    .free-plan-banner .fpb-text{flex:1;min-width:0}
    .free-plan-banner .fpb-title{font-weight:800;font-size:14.5px;color:var(--text-1)}
    .free-plan-banner .fpb-sub{font-size:12.5px;color:var(--text-2);margin-top:1px}
    .free-plan-banner .fpb-btn{flex-shrink:0;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;border:none;border-radius:10px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}
    .free-plan-banner .fpb-btn:hover{filter:brightness(1.08)}
    .free-plan-banner .fpb-x{flex-shrink:0;background:none;border:none;color:var(--text-3);cursor:pointer;font-size:15px;padding:4px}
    @media(max-width:600px){.free-plan-banner{flex-wrap:wrap}.free-plan-banner .fpb-btn{order:3;width:100%}}
    /* unlock modal */
    .ul-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,5,8,.72);backdrop-filter:blur(6px);animation:ulFade .18s ease}
    @keyframes ulFade{from{opacity:0}to{opacity:1}}
    .ul-modal{width:100%;max-width:420px;background:var(--bg-2);border:1px solid var(--border);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5);animation:ulPop .25s cubic-bezier(.22,1,.36,1)}
    @keyframes ulPop{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}
    .ul-head{padding:22px 22px 16px;text-align:center;background:linear-gradient(135deg,rgba(139,92,246,.14),rgba(236,72,153,.10))}
    .ul-logo{width:60px;height:60px;border-radius:15px;object-fit:contain;background:#fff;padding:6px;margin:0 auto 12px;display:block;box-shadow:0 8px 22px rgba(0,0,0,.25)}
    .ul-logo-ph{width:60px;height:60px;border-radius:15px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;background:linear-gradient(135deg,#8b5cf6,#ec4899)}
    .ul-lockico{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:rgba(139,92,246,.2);color:#a78bfa;font-size:11px;margin-bottom:8px}
    .ul-title{font-size:18px;font-weight:800;color:var(--text-1)}
    .ul-sub{font-size:13px;color:var(--text-2);margin-top:5px;padding:0 6px}
    .ul-sub b{color:var(--text-1)}
    .ul-body{padding:18px 22px 22px;display:flex;flex-direction:column;gap:10px}
    .ul-btn{display:flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:12px;padding:13px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}
    .ul-btn-primary{background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff}
    .ul-btn-primary:hover{filter:brightness(1.08)}
    .ul-btn-ghost{background:var(--bg-3);color:var(--text-1);border:1px solid var(--border)}
    .ul-btn-ghost:hover{border-color:var(--accent)}
    .ul-or{text-align:center;font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;margin:2px 0}
    .ul-value{background:var(--bg-3);border:1px solid var(--border);border-radius:11px;padding:12px 14px;margin-bottom:4px}
    .ul-value-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:4px 0}
    .ul-value-lbl{font-size:12.5px;color:var(--text-2);line-height:1.4}
    .ul-value-win .ul-value-lbl{color:var(--text-1);font-weight:600}
    .ul-value-old{font-size:14px;font-weight:700;color:var(--text-3);text-decoration:line-through;white-space:nowrap}
    .ul-value-new{font-size:16px;font-weight:800;color:var(--green);white-space:nowrap}
    .ul-value-old small,.ul-value-new small{font-size:10px;font-weight:600;opacity:.75;margin-left:1px}
    .ul-value-note{display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:8px;
      border-top:1px dashed var(--border);font-size:11.5px;color:var(--green);line-height:1.45}
    .ul-close{position:absolute;top:14px;right:14px;background:rgba(0,0,0,.3);border:none;color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px}
    .ul-seeall{text-align:center;margin-top:4px}
    .ul-seeall a{color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;text-decoration:none}
    /* access-point freshness — green only when fresh, never an alarm colour */
    /* Row must be a flex line, not inline text — an inline-flex pill with vertical
       padding is taller than the 13px line box and pushes out of it (overlap). */
    .access-label{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0}
    .access-fresh{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;line-height:1;white-space:nowrap;flex-shrink:0;background:var(--bg-3);color:var(--text-3)}
    .access-fresh i{font-size:9px}
    .access-fresh.is-fresh{background:rgba(16,185,129,.13);color:#34d399}
    /* tool detail notes (above Access Points) */
    .tool-note{display:flex;gap:12px;align-items:flex-start;padding:13px 15px;border-radius:12px;margin-bottom:12px;font-size:13.5px;line-height:1.5}
    .tool-note-icon{flex-shrink:0;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px}
    .tool-note-body{flex:1;min-width:0;color:var(--text-1)}
    .tool-note-info{background:rgba(59,130,246,.10);border:1px solid rgba(59,130,246,.28)}
    .tool-note-info .tool-note-icon{background:rgba(59,130,246,.18);color:#60a5fa}
    .tool-note-support{background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.28)}
    .tool-note-support .tool-note-icon{background:rgba(245,158,11,.18);color:#fbbf24}
    .tool-note-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .tool-note-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:9px;font-size:12.5px;font-weight:700;cursor:pointer;border:none;text-decoration:none;font-family:inherit}
    .tool-note-wa{background:#25d366;color:#fff}
    .tool-note-wa:hover{filter:brightness(1.07)}
    .tool-note-chat{background:var(--accent-bold,#8b5cf6);color:#fff}
    .tool-note-chat:hover{filter:brightness(1.07)}
    /* category sections */
    .tools-sections{display:flex;flex-direction:column;gap:4px}
    .ts-sec{margin-top:18px}
    .ts-sec:first-child{margin-top:0}
    .ts-head{display:flex;align-items:center;gap:10px;margin:0 2px 14px;font-size:15px;font-weight:800;letter-spacing:-.2px;color:var(--text-1)}
    /* --h is the category hue set on .ts-sec. It has to be read HERE rather than
       in user.css: this block is injected at runtime, so it lands after the
       stylesheet and wins any equal-specificity rule there. */
    .ts-head .ts-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--h, var(--accent)) 16%, transparent);color:var(--h, var(--accent));font-size:14px;flex-shrink:0}
    .ts-head.ts-locked .ts-ic{background:rgba(245,158,11,.14);color:var(--amber,#f59e0b)}
    .ts-head .ts-count{font-size:11.5px;font-weight:700;color:var(--text-3);background:var(--bg-2);border:1px solid var(--border);border-radius:20px;padding:2px 10px}
    .ts-head .ts-line{flex:1;height:1px;background:linear-gradient(90deg, color-mix(in srgb, var(--h, var(--border)) 30%, transparent), var(--border))}`;
  document.head.appendChild(s);
}

// The value line on the unlock modal — fires at the exact moment someone wants a
// SPECIFIC tool, which is when the price comparison actually lands.
//
// Every branch fails CLOSED. If the tool has no retail price, or the plan price is
// unknown, or the tool is somehow cheaper on its own, we show nothing rather than
// print a weak or wrong claim. An unconvincing comparison is worse than silence.
function _unlockValueHtml(tool, planKey, planName, sym) {
  const usd = sym === '$';
  const retail = usd ? Number(tool.retail_price_usd || 0) : Number(tool.retail_price_inr || 0);
  if (!retail || retail <= 0) return '';

  const plan = (_planMeta && _planMeta.plans && _planMeta.plans[planKey]) || null;
  const planPrice = plan ? Number(usd ? plan.price_usd : plan.price_inr) : 0;
  if (!planPrice || planPrice <= 0) return '';
  if (retail <= planPrice) return '';        // comparison doesn't favour us — stay quiet

  const fmt = n => usd ? Number(n).toFixed(2) : Math.round(n).toLocaleString('en-IN');
  const others = Math.max(0, (plan.tool_count || 0) - 1);
  const times = Math.floor(retail / planPrice);

  return `
    <div class="ul-value">
      <div class="ul-value-row">
        <span class="ul-value-lbl">${escapeHtml(tool.name)} on its own</span>
        <span class="ul-value-old">${sym}${fmt(retail)}<small>/mo</small></span>
      </div>
      <div class="ul-value-row ul-value-win">
        <span class="ul-value-lbl">${escapeHtml(planName)}${others ? ` — plus ${others} more tools` : ''}</span>
        <span class="ul-value-new">${sym}${fmt(planPrice)}<small>/mo</small></span>
      </div>
      ${times >= 2 ? `<div class="ul-value-note"><i class="fas fa-arrow-trend-down"></i> The whole plan costs less than this one tool${times >= 3 ? ` — about ${times}× less` : ''}.</div>` : ''}
    </div>`;
}

function showUnlockModal(toolId) {
  const tool = allTools.find(t => t.id === toolId);
  if (!tool) return;
  if (!currentUser) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
  _injectLockStyles();
  const keys = tool.plan_keys || [];
  const planKey = _cheapestPlanKey(keys);
  const planName = _planLabel(planKey);
  const ind = _planMeta && _planMeta.indByTool && _planMeta.indByTool[tool.id];
  const sym = (typeof _prCurrency !== 'undefined' && _prCurrency === 'USD') ? '$' : '₹';
  const indPrice = ind ? (sym === '$' ? ind.price_usd : ind.price_inr) : null;

  const logoHtml = tool.logo_url
    ? `<img class="ul-logo" src="${escapeHtml(gtLogoSrc(tool.logo_url))}" alt="" onerror="this.outerHTML='<div class=&quot;ul-logo-ph&quot;>${escapeHtml(tool.name[0])}</div>'">`
    : `<div class="ul-logo-ph">${escapeHtml(tool.name[0])}</div>`;

  const valueHtml = _unlockValueHtml(tool, planKey, planName, sym);

  const overlay = document.createElement('div');
  overlay.className = 'ul-overlay';
  overlay.id = 'gtUnlockOverlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeUnlockModal(); };
  overlay.innerHTML = `
    <div class="ul-modal">
      <button class="ul-close" onclick="closeUnlockModal()"><i class="fas fa-times"></i></button>
      <div class="ul-head">
        ${logoHtml}
        <div class="ul-lockico"><i class="fas fa-lock"></i></div>
        <div class="ul-title">Unlock ${escapeHtml(tool.name)}</div>
        <div class="ul-sub">Available in the <b>${escapeHtml(_planNamesList(keys))}</b> plan${keys.length > 1 ? 's' : ''}. Upgrade to use it${ind ? ', or buy just this tool for 30 days.' : '.'}</div>
      </div>
      <div class="ul-body">
        ${valueHtml}
        <button class="ul-btn ul-btn-primary" onclick="closeUnlockModal(); _unlockUpgrade('${planKey}','${escapeHtml(planName).replace(/'/g, "\\'")}')">
          <i class="fas fa-crown"></i> Upgrade to ${escapeHtml(planName)}
        </button>
        ${ind ? `
        <div class="ul-or">— or —</div>
        <button class="ul-btn ul-btn-ghost" onclick="closeUnlockModal(); coOpenTool(${ind.id})">
          <i class="fas fa-shopping-cart"></i> Buy this tool · ${sym}${indPrice}
        </button>` : ''}
        <div class="ul-seeall"><a onclick="closeUnlockModal(); showPage('pricing')">See all plans →</a></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
function closeUnlockModal() { const o = document.getElementById('gtUnlockOverlay'); if (o) o.remove(); }
function _unlockUpgrade(planKey, planName) {
  if (typeof coOpen === 'function' && planKey && planKey !== 'free') coOpen(planKey, planName);
  else if (typeof showPage === 'function') showPage('pricing');
}

// Friendly banner for free/unsubscribed users at the top of the tools list
function renderFreeBanner() {
  const grid = document.getElementById('toolsGrid');
  if (!grid) return;
  let banner = document.getElementById('freePlanBanner');
  const isFree = currentUser && (!currentUser.plan || currentUser.plan === 'free' || currentUser.plan === '');
  const dismissed = sessionStorage.getItem('gt_free_banner_dismissed') === '1';
  if (!isFree || dismissed || showFavoritesOnly) { if (banner) banner.remove(); return; }
  _injectLockStyles();
  const unlockable = allTools.filter(t => (t.plan_keys || []).length > 0).length || 60;
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'freePlanBanner';
    grid.parentNode.insertBefore(banner, grid);
  }
  banner.className = 'free-plan-banner';
  banner.innerHTML = `
    <div class="fpb-icon"><i class="fas fa-bolt"></i></div>
    <div class="fpb-text">
      <div class="fpb-title">You're on the Free plan</div>
      <div class="fpb-sub">Unlock ${unlockable}+ premium tools — plans from ₹299/mo. Click any 🔒 tool to upgrade.</div>
    </div>
    <button class="fpb-btn" onclick="showPage('pricing')"><i class="fas fa-crown"></i> View Plans</button>
    <button class="fpb-x" onclick="sessionStorage.setItem('gt_free_banner_dismissed','1');this.closest('.free-plan-banner').remove()" title="Dismiss"><i class="fas fa-times"></i></button>`;
}

function handleSearch() {
  // The search box now lives on Home too, but the results grid is on the Tools
  // page. So if a query is typed anywhere the grid is not showing, jump to Tools
  // first — otherwise you would type and see nothing happen.
  const q = (document.getElementById('searchInput')?.value || '').trim();
  const toolsPage = document.getElementById('page-tools');
  if (q && toolsPage && toolsPage.classList.contains('hidden')) {
    showPage('tools');   // reveal the results; loadTools() below applies the query
  }
  loadTools();
}

// ============ PLAN UPSELL SECTION ============
async function renderPlanUpsell(allToolsList) {
  const wrap = document.getElementById('planUpsell');
  if (!wrap) return;

  // Only show upsell to logged-in users, and not if searching/filtering favorites
  if (!currentUser || showFavoritesOnly) { wrap.innerHTML = ''; return; }

  const userTierVal = TOOL_TIERS[currentUser.plan] || 0;

  // Lazy-load pricing plans once
  if (!_upsellPlans) {
    try { _upsellPlans = (await api('/api/pricing')).plans; } catch { _upsellPlans = []; }
  }

  // Plans the user is NOT on and that have a different plan_key (show upgrade options)
  const upgradePlans = (_upsellPlans || [])
    .filter(p => p.plan_key && p.plan_key !== currentUser.plan && TOOL_TIERS[p.plan_key] > userTierVal && p.tools && p.tools.length > 0)
    .sort((a, b) => (TOOL_TIERS[a.plan_key] || 0) - (TOOL_TIERS[b.plan_key] || 0))
    .slice(0, 2);

  if (!upgradePlans.length) { wrap.innerHTML = ''; return; }

  const tierLabel = { free: 'Free', basic: 'Basic', premium: 'Premium', ultimate: 'Ultimate' };

  wrap.innerHTML = `
    <div class="upsell-section">
      <div class="upsell-header">
        <div class="upsell-header-left">
          <span class="upsell-icon">✨</span>
          <div>
            <div class="upsell-title">Unlock More Premium Tools</div>
            <div class="upsell-sub">Upgrade your plan to access ${upgradePlans.reduce((a, p) => a + p.tools.length, 0)}+ more tools</div>
          </div>
        </div>
      </div>
      <div class="upsell-cards">
        ${upgradePlans.map(p => {
          const visibleLogos = p.tools.slice(0, 5);
          const extra = p.tools.length - visibleLogos.length;
          const tierKey = p.plan_key;
          return `
          <div class="upsell-card" onclick="showPage('pricing')">
            <div class="upsell-card-glow"></div>
            <div class="upsell-card-top">
              <div class="upsell-plan-info">
                <span class="upsell-plan-name">${escapeHtml(p.name)}</span>
                ${p.badge ? `<span class="upsell-plan-badge">${escapeHtml(p.badge)}</span>` : ''}
              </div>
              <div class="upsell-tool-count"><i class="fas fa-toolbox"></i> ${p.tools.length} tools</div>
            </div>
            <div class="upsell-logos">
              ${visibleLogos.map(t => t.logo_url
                ? `<img src="${escapeHtml(gtLogoSrc(t.logo_url))}" class="upsell-logo" title="${escapeHtml(t.name)}" onerror="this.onerror=null;this.style.display='none'">`
                : `<div class="upsell-logo upsell-logo-placeholder">${escapeHtml(t.name[0])}</div>`
              ).join('')}
              ${extra > 0 ? `<div class="upsell-logo upsell-logo-more">+${extra}</div>` : ''}
            </div>
            <div class="upsell-price">
              <span class="upsell-price-val">₹${p.price_inr}<small>/${p.period}</small></span>
            </div>
            <button class="upsell-btn" onclick="event.stopPropagation(); showPage('pricing')">
              <i class="fas fa-crown"></i> Upgrade to ${escapeHtml(tierLabel[tierKey] || p.name)}
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ============ VIEW MODE ============
function setViewMode(mode) {
  currentViewMode = mode;
  localStorage.setItem('gt_view_mode', mode);
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === mode));
  renderTools(allTools);
}

// ============ EXTENSION DETECTION ============
function isExtensionInstalled() {
  const ok = document.documentElement.getAttribute('data-gt-ext') === 'true';
  // The extension's content script only matches /app*, so /settings can never detect it
  // itself. Record the reading here (where it IS reliable) and let settings read it back
  // with a freshness window — a stale value is dropped rather than shown as "connected".
  try {
    if (ok) localStorage.setItem('gt_ext_seen', String(Date.now()));
    else    localStorage.removeItem('gt_ext_seen');
  } catch (e) {}
  return ok;
}

/* Wait for the extension to announce itself, then answer whether it is here.
   content.js sets data-gt-ext at document_idle — AFTER this page's own scripts
   run — so on a HARD REFRESH landing straight on a tool page, openTool() used to
   read the attribute before it existed and declare "Install / Update Extension"
   on a browser that already had it. Navigating away and back worked only because
   document_idle had long passed by then. The old watchForExtension() reload
   papered over it but fires just once per session (gt_ext_reloaded), so every
   later hard refresh raced and lost — the exact bug reported.

   If the flag is already set we answer instantly (the normal SPA-nav case, zero
   delay). Otherwise we wait for the attribute to appear, up to a ceiling. Its
   version (data-gt-ext-ver) is set on the same synchronous tick, so once true
   fires the version check that follows is reliable too. */
function waitForExtension(timeoutMs) {
  if (document.documentElement.getAttribute('data-gt-ext') === 'true') return Promise.resolve(true);
  return new Promise(function (resolve) {
    var done = false;
    var finish = function (val) {
      if (done) return; done = true;
      try { obs.disconnect(); } catch (e) {}
      clearTimeout(timer);
      resolve(val);
    };
    var obs = new MutationObserver(function () {
      if (document.documentElement.getAttribute('data-gt-ext') === 'true') finish(true);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-gt-ext'] });
    var timer = setTimeout(function () { finish(false); }, timeoutMs || 1500);
  });
}

// Compare version strings like "v1.2.0" / "1.2.0" → -1, 0, 1
function _cmpVer(a, b) {
  const pa = String(a || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

let _extMinVer = null;
// Returns true if the installed extension is older than the server's required minimum.
async function isExtensionOutdated() {
  try {
    // Only meaningful once an extension is actually present (install is checked separately first)
    if (document.documentElement.getAttribute('data-gt-ext') !== 'true') return false;
    if (_extMinVer === null) {
      const s = await api('/api/settings/extension');
      _extMinVer = s.extension_min_version || s.extension_version || '';
    }
    if (!_extMinVer) return false;
    const installed = document.documentElement.getAttribute('data-gt-ext-ver');
    // Version reporting was added in v1.2.1 — an installed extension that reports NO
    // version is therefore a pre-1.2.1 build → force update.
    if (!installed) return true;
    return _cmpVer(installed, _extMinVer) < 0;
  } catch { return false; }
}

function showExtensionUpdateModal() {
  let m = document.getElementById('extUpdateModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'extUpdateModal';
    m.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(5,5,8,.8);backdrop-filter:blur(6px)" onclick="if(event.target===this)this.remove()">
        <div style="max-width:420px;width:92%;background:linear-gradient(180deg,#13131c,#0c0c12);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:30px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.6)">
          <div style="font-size:46px;margin-bottom:14px">🔄</div>
          <div style="font-size:19px;font-weight:800;color:#ededf0;margin-bottom:10px">Update Required</div>
          <div style="font-size:13.5px;color:#b8b8c8;line-height:1.6;margin-bottom:22px">
            Your ToolsVault extension is outdated and no longer supported. Please install the latest version to keep accessing tools securely.
          </div>
          <a href="/app/extension" class="no-transition" onclick="document.getElementById('extUpdateModal').remove(); showPage('extension'); return false" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
            <i class="fas fa-download"></i> Get the Latest Extension
          </a>
          <div style="margin-top:14px"><button onclick="document.getElementById('extUpdateModal').remove()" style="background:none;border:none;color:#8e8ea0;font-size:12px;cursor:pointer">Close</button></div>
        </div>
      </div>`;
    document.body.appendChild(m);
  }
}

// Watch for extension install — only if page loaded WITHOUT extension.
// Uses sessionStorage flag to prevent reload loops.
(function watchForExtension() {
  if (isExtensionInstalled()) {
    sessionStorage.removeItem('gt_ext_reloaded');
    return;
  }
  if (sessionStorage.getItem('gt_ext_reloaded')) return;
  const obs = new MutationObserver(function() {
    if (isExtensionInstalled()) {
      obs.disconnect();
      sessionStorage.setItem('gt_ext_reloaded', '1');
      location.reload();
    }
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-gt-ext'] });
})();

// ============ TOOL DETAIL & ACCESS ============

async function openTool(slug) {
  if (!currentUser) {
    if (typeof navigateToAuth === 'function') {
      navigateToAuth('/app/tools/' + slug);
    } else {
      openAuthModal();
    }
    toast('Access Restricted: Please authenticate to launch ' + slug.toUpperCase(), 'info');
    return;
  }

  /* Route by the tool's TYPE, not by whether its slug starts with "ai-". A real
     cookie/credential tool an admin happens to name "AI World" gets the slug
     ai-world, and matching on the string alone sent it to the generator flow —
     which has no such generator, so the page just never opened. Only tools that
     are actually auth_type 'ai_generator' belong on the studio/generator paths.
     We look the tool up in the already-loaded list; when it isn't there yet
     (e.g. a direct deep link before the list loads) we fall back to the slug
     heuristic so genuine generators still open. */
  const _known = (typeof allTools !== 'undefined' ? allTools : []).find(t => t.slug === slug);
  const _isAiGen = _known ? _known.auth_type === 'ai_generator' : (slug && slug.startsWith('ai-'));

  if (_isAiGen) {
    // AI video generators → dedicated standalone studio page (/studio/<model>)
    if (slug.startsWith('ai-vid-')) { window.location.href = '/studio/' + slug.slice('ai-vid-'.length); return; }
    // AI image generators → standalone image studio (/studio-img/<model>)
    if (slug.startsWith('ai-img-')) { window.location.href = '/studio-img/' + slug.slice('ai-img-'.length); return; }
    // AI Image Upscaler → standalone upscaler studio
    if (slug === 'ai-upscale') { window.location.href = '/studio-upscale'; return; }
    // Image → 3D → standalone 3D studio
    if (slug === 'ai-3d') { window.location.href = '/studio-3d'; return; }
    // Everything else → the in-page generator
    if (typeof aiGenOpen === 'function') { aiGenOpen(slug); }
    else { toast('AI generator is loading...', 'info'); }
    return;
  }

  try {
    // The tool fetch and the extension wait run together, so neither blocks the
    // other. waitForExtension() resolves instantly on SPA navigation (attribute
    // already set) and only actually waits on a hard refresh, where it lets the
    // content script catch up instead of misreading "not installed". The wait is
    // capped below the api round trip (~400ms India→Oregon), so in the common
    // case it is free; a browser with no extension pays the cap once, which is
    // fine since it is about to see an Install screen anyway. The .catch()es keep
    // a helper failure from ever blocking the page from rendering.
    const [tool, , extInstalled] = await Promise.all([
      api(`/api/tools/${slug}`),
      loadReportLocks().catch(() => {}),   // refresh so a just-fixed report shows "Fixed on <date>"
      waitForExtension().catch(() => false)
    ]);
    isExtensionInstalled();                // record gt_ext_seen for the settings page
    const extOutdated = extInstalled ? await isExtensionOutdated().catch(() => false) : false;
    _gtCurrentTool = tool;                 // for the report modal's access-point dropdown (has credentials)
    _injectReportStyles();                 // style report/suggest buttons on first paint (no unstyled flash)
    const body = document.getElementById('toolDetailBody');
    _injectLockStyles(); // also carries the tool-note styles

    const isCookieBased = tool.auth_type !== 'email_password';
    const needsInstall = isCookieBased && !extInstalled;        // no extension at all
    const needsUpdate  = isCookieBased && extInstalled && extOutdated; // old extension
    const needsExtension = needsInstall || needsUpdate;
    const extActionLabel = needsUpdate ? 'Update Extension' : 'Install Extension';

    /* The tools GRID gates locked tools, but every other route here — "Jump back
       in", a direct /app/tools/<slug> link, search — called openTool straight,
       so a lapsed user was still shown "Access Now" and only found out when the
       server refused. The gate belongs on the page itself, not on one entry
       point. (The server 403 was always there; this makes the UI tell the truth.) */
    const planLocked = isToolPlanLocked(tool);
    if (planLocked) { await loadPlanMeta(); }
    const unlockKey  = planLocked ? _cheapestPlanKey(tool.plan_keys) : null;
    const unlockName = planLocked ? _planLabel(unlockKey) : '';
    const unlockAll  = planLocked ? _planNamesList(tool.plan_keys) : '';

    body.innerHTML = `
      <div class="tool-detail-hero">
        <div class="tool-detail-hero-left">
          ${tool.logo_url
            ? `<img class="tool-detail-logo" src="${escapeHtml(gtLogoSrc(tool.logo_url))}" alt="" onerror="this.onerror=null;this.style.display='none';this.insertAdjacentHTML('afterend','<div class=\\'tool-detail-logo-placeholder\\'>${escapeHtml(tool.name[0])}</div>')">`
            : `<div class="tool-detail-logo-placeholder">${escapeHtml(tool.name[0])}</div>`
          }
          <div class="tool-detail-info">
            <div class="tool-detail-category">${tool.category_icon || ''} ${escapeHtml(tool.category_name || 'Tools')}</div>
            <h1 class="tool-detail-title">${escapeHtml(tool.name)}</h1>
          </div>
        </div>
        <div class="tool-detail-meta">
          <div class="meta-item">
            <i class="fas fa-circle-check"></i>
            <div>
              <div class="meta-label">Status</div>
              <div class="meta-value">Active</div>
            </div>
          </div>
          <div class="meta-item">
            <i class="fas fa-key"></i>
            <div>
              <div class="meta-label">Access Points</div>
              <div class="meta-value">${tool.credentials.length}</div>
            </div>
          </div>
          ${tool.plan_keys && tool.plan_keys.length ? `<div class="meta-item">
            <i class="fas fa-crown" style="color:#f59e0b"></i>
            <div>
              <div class="meta-label">Plans</div>
              <div class="meta-value" style="color:#f59e0b;font-weight:700">${tool.plan_keys.map(k=>k.charAt(0).toUpperCase()+k.slice(1)).join(', ')}</div>
            </div>
          </div>` : ''}
        </div>
      </div>

      <div class="tool-detail-grid">
        <div class="tool-detail-main">
          <div class="detail-section">
            <h3 class="section-title">About this tool</h3>
            <p class="section-text">${escapeHtml(tool.description || 'Access this premium tool with your membership.')}</p>
          </div>

          ${_toolNotesHtml(tool)}

          ${planLocked ? `
          <div class="detail-section">
            <h3 class="section-title"><i class="fas fa-lock"></i> Not in your plan</h3>
            <div class="td-lock">
              <div class="td-lock-ico"><i class="fas fa-lock"></i></div>
              <div class="td-lock-body">
                <h4>${escapeHtml(tool.name)} is included in ${escapeHtml(unlockAll)}</h4>
                <p>Your current plan doesn't include this tool. Upgrade to open it right away — your GT credits and everything else carry over.</p>
                <div class="td-lock-actions">
                  <button class="btn btn-access" onclick="showUnlockModal(${tool.id})">
                    <i class="fas fa-bolt"></i> Unlock with ${escapeHtml(unlockName)}
                  </button>
                  <button class="btn btn-ghost-sm" onclick="showPage('pricing')">See all plans</button>
                </div>
              </div>
            </div>
          </div>
          ` : `
          <div class="detail-section">
            <h3 class="section-title"><i class="fas fa-key"></i> Access Points</h3>
            <div class="gt-report-row">
              <span class="gt-report-hint"><i class="fas fa-circle-question"></i> Having trouble with this tool?</span>
              <div class="gt-report-actions">${_reportBtnHtml(tool)}${_suggestBtnHtml()}</div>
            </div>
            <div class="access-list">
              ${tool.credentials.length === 0
                ? '<div class="no-access">No access points available currently</div>'
                : tool.credentials.map(cred => `
                  <div class="access-item">
                    <div class="access-item-info">
                      <div class="access-item-icon"><i class="fas fa-key"></i></div>
                      <div>
                        <div class="access-label">${escapeHtml(cred.label)}${_freshnessHtml(cred.last_verified)}</div>
                        <div class="access-status">${needsExtension ? `<span class="status-warn">${needsUpdate ? 'Update needed' : 'Extension needed'}</span>` : '<span class="status-ok">● Available</span>'}</div>
                      </div>
                    </div>
                    ${needsExtension
                      ? `<button class="btn btn-sm btn-access" onclick="showPage('extension')">
                          <i class="fas fa-puzzle-piece"></i> ${extActionLabel}
                        </button>`
                      : `<button class="btn btn-access" onclick="accessTool(${tool.id}, ${cred.id}, '${escapeHtml(tool.website_url)}')">
                          <i class="fas fa-external-link-alt"></i> Access Now
                        </button>`
                    }
                  </div>
                `).join('')
              }
            </div>
          </div>
          `}

          ${(!planLocked && needsExtension) ? `
            <div class="ext-warning">
              <div class="ext-warning-icon"><i class="fas fa-puzzle-piece"></i></div>
              <div class="ext-warning-body">
                <h4>${needsUpdate ? 'Extension Update Required' : 'Browser Extension Required'}</h4>
                <p>${needsUpdate
                  ? 'A newer version of the ToolsVault extension is required to access tools securely.'
                  : 'Install the ToolsVault extension to access this tool.'}</p>
                <button class="btn btn-access" onclick="showPage('extension')" style="margin:4px 0 14px">
                  <i class="fas fa-download"></i> ${needsUpdate ? 'Get the Latest Version' : 'Download the Extension'}
                </button>
                <ol class="ext-steps">
                  <li><a href="/app/extension" class="no-transition" onclick="showPage('extension');return false;" style="color:var(--accent)">${needsUpdate ? 'Download the new version' : 'Download the extension'}</a> (ZIP — no need to unzip)</li>
                  <li>Open <b>chrome://extensions/</b></li>
                  <li>Enable <b>Developer mode</b> (top right)</li>
                  ${needsUpdate ? '<li>Remove the old ToolsVault extension</li>' : ''}
                  <li><b>Drag the ZIP</b> onto the page &rarr; <b>Drop to install</b></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          ` : `
            <div class="ext-ok">
              <i class="fas fa-circle-check"></i>
              <span>You're ready to access this tool.</span>
            </div>
          `}
        </div>

        <aside class="tool-detail-side">
          <div class="side-card">
            <h4 class="side-title">${planLocked ? 'How to get this tool' : 'How to access'}</h4>
            <ol class="side-steps">
              ${planLocked ? `
                <li>Upgrade to ${escapeHtml(unlockName)} — takes a minute</li>
                <li>Install the extension if you haven't</li>
                <li>Open this tool straight from your dashboard</li>
              ` : `
                <li>Make sure the extension is installed</li>
                <li>Click "Access Now" on any access point</li>
                <li>Tool opens in a new tab, ready to use</li>
              `}
            </ol>
          </div>
          <div class="side-card">
            <h4 class="side-title">Secure Access</h4>
            <p class="side-text">
              <i class="fas fa-shield-halved"></i> All credentials are encrypted and securely delivered.
            </p>
          </div>
        </aside>
      </div>
    `;

    showPage('tool-detail', { slug });
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function accessTool(toolId, credId, websiteUrl) {
  if (!currentUser) {
    openAuthModal();
    toast('Please login to access tools', 'error');
    return;
  }

  try {
    const res = await api(`/api/tools/${toolId}/access/${credId}`, 'POST');

    if (res.auth_type === 'email_password') {
      toast('Credentials ready! Check the popup.', 'success');
      alert(`Email: ${res.credential_data.email}\nPassword: ${res.credential_data.password}\n\nWebsite: ${websiteUrl}`);
      window.open(websiteUrl, '_blank');
    } else {
      if (!isExtensionInstalled()) {
        toast('Opening ' + (res.tool_name || 'tool') + ' web application in secure tab...', 'success');
        window.open(websiteUrl, '_blank');
        return;
      }

      // Force-update gate: block outdated extensions
      const outdated = await isExtensionOutdated();
      if (outdated) {
        showExtensionUpdateModal();
        return;
      }

      toast('Opening tool...', 'success');
      window.postMessage({
        type: 'GT_ACCESS_TOOL',
        cookies: res.credential_data,
        url: websiteUrl,
        toolName: res.tool_name,
        localStorage: res.localStorage || null,
        sessionStorage: res.sessionStorage || null,
        blockedUrls: res.blocked_urls || null,
        vaultMode: res.vault_mode || 'vault',
        hideSelectors: res.hide_selectors || null
      }, '*');
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

// Listen for injection results from extension
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== 'GT_ACCESS_RESULT') return;

  if (event.data.success) {
    toast(`Tool ready (${event.data.injected}/${event.data.total})! Opening...`, 'success');
  } else {
    const err = event.data.error || 'Unknown error';
    if (err.includes('sendMessage') || err.includes('Extension context') || err.includes('chrome.runtime')) {
      toast('Extension disconnected. Please reinstall the extension and refresh this page.', 'error');
    } else {
      toast('Access failed: ' + err, 'error');
    }
  }
});

// ══════════ Report a problem / Suggest a tool (in-app, bell-notified) ══════════
let _reportLocks = new Set();  // tool_ids with an OPEN report (locked)
let _reportFixed = {};         // tool_id → resolved_at (recently fixed → show date)
let _gtCurrentTool = null;     // currently-open tool detail (carries credentials for the access dropdown)
async function loadReportLocks() {
  if (!currentUser) { _reportLocks = new Set(); _reportFixed = {}; return; }
  try {
    const r = await api('/api/reports/my-open');
    _reportLocks = new Set((r && r.tool_ids) || []);
    _reportFixed = {}; ((r && r.fixed) || []).forEach(f => { if (!_reportLocks.has(f.tool_id)) _reportFixed[f.tool_id] = f.resolved_at; });
  } catch (e) { _reportLocks = new Set(); _reportFixed = {}; }
}
function _rpFmtDate(s) { try { return new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') ? '' : 'Z')).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function _reportBtnHtml(tool) {
  if (!currentUser) return '';
  if (_reportLocks.has(tool.id))
    return `<span class="gt-rp-state open"><i class="fas fa-clock-rotate-left"></i> Reported — we're on it</span>`;
  const fixed = _reportFixed[tool.id]
    ? `<span class="gt-rp-state fixed"><i class="fas fa-circle-check"></i> Fixed on ${_rpFmtDate(_reportFixed[tool.id])}</span>`
    : '';
  return `${fixed}<button class="gt-report-btn" onclick="gtReportOpen(${tool.id})"><i class="fas fa-triangle-exclamation"></i> Report a problem</button>`;
}
function _suggestBtnHtml() { return `<button class="gt-suggest-btn" onclick="gtSuggestOpen()"><i class="fas fa-lightbulb"></i> Suggest a tool</button>`; }
function _reportModalClose() { const m = document.getElementById('gtReportModal'); if (m) { m.classList.add('gt-rp-out'); setTimeout(() => m.remove(), 130); } }
function _reportShell(icon, iconClass, title, subtitle, inner) {
  _injectReportStyles(); const ex = document.getElementById('gtReportModal'); if (ex) ex.remove();
  const ov = document.createElement('div'); ov.id = 'gtReportModal'; ov.className = 'gt-rp-overlay';
  ov.innerHTML = `<div class="gt-rp-card">
    <div class="gt-rp-head">
      <div class="gt-rp-hd-ic ${iconClass}"><i class="fas ${icon}"></i></div>
      <div class="gt-rp-hd-tx"><h3>${title}</h3><p>${subtitle}</p></div>
      <button class="gt-rp-x" onclick="_reportModalClose()" aria-label="Close"><i class="fas fa-xmark"></i></button>
    </div>
    <div class="gt-rp-body">${inner}</div></div>`;
  ov.addEventListener('click', e => { if (e.target === ov) _reportModalClose(); });
  document.body.appendChild(ov);
}
function gtReportOpen(toolId) {
  if (!currentUser) { toast('Please log in to report', 'error'); return; }
  // Use the OPEN tool detail (it has credentials); the tools list doesn't → that's why the dropdown was empty
  const tool = (_gtCurrentTool && _gtCurrentTool.id === toolId) ? _gtCurrentTool : (allTools || []).find(t => t.id === toolId);
  if (!tool) return;
  if (_reportLocks.has(toolId)) { toast("You've already reported this — we're on it.", 'info'); return; }
  const aps = (tool.credentials || []).filter(c => c.is_active === undefined || c.is_active); // live access points → dynamic
  const opts = ['<option value="">All access points</option>'].concat(aps.map(c => `<option value="${c.id}">${escapeHtml(c.label)}</option>`)).join('');
  _reportShell('fa-triangle-exclamation', 'warn', 'Report a problem', escapeHtml(tool.name), `
    <label class="gt-rp-lbl">Which access isn't working?</label>
    <select id="gtRpAccess" class="gt-rp-in">${opts}</select>
    <label class="gt-rp-lbl">What's happening?</label>
    <div class="gt-rp-chips" id="gtRpChips">
      ${[['not_logging_in', 'Not logging in'], ['expired', 'Session expired'], ['error', 'Error page'], ['other', 'Other']]
        .map((c, i) => `<button type="button" class="gt-rp-chip${i === 0 ? ' on' : ''}" data-v="${c[0]}" onclick="_gtRpChip(this)">${c[1]}</button>`).join('')}
    </div>
    <input type="hidden" id="gtRpCat" value="not_logging_in">
    <label class="gt-rp-lbl">Anything else? <span class="gt-rp-opt">(optional)</span></label>
    <textarea id="gtRpMsg" class="gt-rp-in" rows="2" placeholder="e.g. it opens but asks me to log in again"></textarea>
    <button class="gt-rp-send" onclick="gtReportSubmit(${toolId}, this)"><i class="fas fa-paper-plane"></i> Send report</button>
    <p class="gt-rp-foot"><i class="fas fa-bell"></i> You'll get a notification here the moment it's fixed.</p>`);
}
function _gtRpChip(el) { el.parentElement.querySelectorAll('.gt-rp-chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); document.getElementById('gtRpCat').value = el.dataset.v; }
function gtSuggestOpen() {
  if (!currentUser) { toast('Please log in to suggest', 'error'); return; }
  _reportShell('fa-lightbulb', 'idea', 'Suggest a tool or feature', 'We consider every suggestion', `
    <p class="gt-rp-sub">Want a tool added, or have an idea for the platform? Tell us — if we add it, you'll be the first to know.</p>
    <label class="gt-rp-lbl">What is it?</label>
    <div class="gt-rp-chips" id="gtSgChips">
      <button type="button" class="gt-rp-chip on" data-v="tool" onclick="_gtSgChip(this)">A tool to add</button>
      <button type="button" class="gt-rp-chip" data-v="feature" onclick="_gtSgChip(this)">A platform feature</button>
    </div>
    <input type="hidden" id="gtSgCat" value="tool">
    <label class="gt-rp-lbl">Your suggestion</label>
    <textarea id="gtSgMsg" class="gt-rp-in" rows="4" placeholder="e.g. Please add [tool name] — I'd use it for…"></textarea>
    <button class="gt-rp-send" onclick="gtSuggestSubmit(this)"><i class="fas fa-paper-plane"></i> Send suggestion</button>
    <p class="gt-rp-foot"><i class="fas fa-bell"></i> We'll notify you here if your idea makes it in.</p>`);
}
function _gtSgChip(el) { el.parentElement.querySelectorAll('.gt-rp-chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); document.getElementById('gtSgCat').value = el.dataset.v; }
function _rpLoading(btn) { if (!btn) return () => {}; const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…'; return () => { btn.disabled = false; btn.innerHTML = html; }; }
async function gtReportSubmit(toolId, btn) {
  const done = _rpLoading(btn);
  const body = { credential_id: document.getElementById('gtRpAccess').value || null, category: document.getElementById('gtRpCat').value, message: document.getElementById('gtRpMsg').value.trim() };
  try {
    await api(`/api/tools/${toolId}/report`, 'POST', body);
    _reportLocks.add(toolId); delete _reportFixed[toolId];
    _refreshReportRow(toolId);
    _reportDone('Report sent ✅', "Our technical team has it — we'll fix it as soon as possible. You'll get a notification here the moment it's resolved.");
  } catch (e) {
    done();
    if (e.data && e.data.error === 'already_reported') { _reportLocks.add(toolId); _refreshReportRow(toolId); _reportModalClose(); toast("You've already reported this — we're on it.", 'info'); }
    else toast('Could not send: ' + ((e.data && e.data.message) || e.message), 'error');
  }
}
async function gtSuggestSubmit(btn) {
  const message = document.getElementById('gtSgMsg').value.trim();
  if (!message) { toast('Please write your suggestion first', 'error'); return; }
  const done = _rpLoading(btn);
  try {
    await api('/api/suggest', 'POST', { category: document.getElementById('gtSgCat').value, message });
    _reportDone('Thank you! 🙌', "We review every suggestion. If we add it, you'll get a notification here — personally.");
  } catch (e) { done(); toast('Could not send: ' + ((e.data && e.data.message) || e.message), 'error'); }
}
function _refreshReportRow(toolId) {
  const wrap = document.querySelector('.gt-report-actions');
  if (wrap) { const t = (allTools || []).find(x => x.id === toolId); wrap.innerHTML = (t ? _reportBtnHtml(t) : '') + _suggestBtnHtml(); }
}
function _reportDone(title, msg) {
  _injectReportStyles(); const ex = document.getElementById('gtReportModal'); if (ex) ex.remove();
  const ov = document.createElement('div'); ov.className = 'gt-rp-overlay'; ov.id = 'gtReportModal';
  ov.innerHTML = `<div class="gt-rp-card gt-rp-done"><div class="gt-rp-done-ic"><svg viewBox="0 0 52 52"><circle class="gt-rp-ck-c" cx="26" cy="26" r="24"/><path class="gt-rp-ck-k" d="M14 27l8 8 16-17"/></svg></div><h3>${title}</h3><p>${msg}</p><button class="gt-rp-send" onclick="_reportModalClose()">Got it</button></div>`;
  ov.addEventListener('click', e => { if (e.target === ov) _reportModalClose(); });
  document.body.appendChild(ov);
}
function _injectReportStyles() {
  if (document.getElementById('gtRpStyles')) return;
  const s = document.createElement('style'); s.id = 'gtRpStyles';
  s.textContent = `
  /* margin-bottom matters: without it this bordered box sits flush against the
     first access card and the two borders read as one overlapping element. */
  .gt-report-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;margin-bottom:12px;padding:12px 15px;border:1px solid var(--border);border-radius:12px;background:var(--bg-3)}
  .gt-report-hint{font-size:13px;color:var(--text-2);font-weight:600;display:inline-flex;align-items:center;gap:8px}
  .gt-report-hint i{color:var(--accent)}
  .gt-report-actions{display:flex;gap:8px;flex-wrap:wrap}
  .gt-report-btn,.gt-suggest-btn{background:var(--bg-3);border:1px solid var(--border);color:var(--text-2);font-size:13px;padding:8px 14px;border-radius:10px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:7px;transition:.15s}
  .gt-report-btn:hover{border-color:#f59e0b;color:#f59e0b;background:#f59e0b12}
  .gt-suggest-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-dim,rgba(139,92,246,.1))}
  .gt-rp-state{font-size:13px;display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:10px;font-weight:600;border:1px solid}
  .gt-rp-state.open{color:#f59e0b;background:#f59e0b14;border-color:#f59e0b40}
  .gt-rp-state.fixed{color:#10b981;background:#10b98114;border-color:#10b98140}
  .gt-rp-overlay{position:fixed;inset:0;background:rgba(6,6,12,.68);backdrop-filter:blur(5px);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;animation:gtRpFade .18s ease}
  .gt-rp-overlay.gt-rp-out{animation:gtRpFade .13s ease reverse}
  @keyframes gtRpFade{from{opacity:0}to{opacity:1}}
  .gt-rp-card{background:var(--bg-2);border:1px solid var(--border);border-radius:18px;width:100%;max-width:430px;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden;animation:gtRpPop .22s cubic-bezier(.2,.9,.3,1.2)}
  @keyframes gtRpPop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
  .gt-rp-head{display:flex;align-items:flex-start;gap:13px;padding:18px 18px 15px;border-bottom:1px solid var(--border)}
  .gt-rp-hd-ic{flex:none;width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:17px}
  .gt-rp-hd-ic.warn{background:#f59e0b1e;color:#f59e0b}
  .gt-rp-hd-ic.idea{background:var(--accent-dim,rgba(139,92,246,.16));color:var(--accent)}
  .gt-rp-hd-tx{flex:1;min-width:0}
  .gt-rp-hd-tx h3{font-size:16px;margin:0;color:var(--text-1);line-height:1.3}
  .gt-rp-hd-tx p{font-size:12.5px;color:var(--text-3);margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gt-rp-x{flex:none;background:var(--bg-3);border:none;color:var(--text-3);width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s}
  .gt-rp-x:hover{color:var(--text-1);background:var(--border)}
  .gt-rp-body{padding:16px 18px 18px}
  .gt-rp-sub{font-size:13px;color:var(--text-2);margin:0 0 6px;line-height:1.55}
  .gt-rp-lbl{display:block;font-size:11px;color:var(--text-3);font-weight:700;margin:14px 0 7px;text-transform:uppercase;letter-spacing:.05em}
  .gt-rp-lbl:first-child{margin-top:0}
  .gt-rp-opt{color:var(--text-3);font-weight:500;text-transform:none;letter-spacing:0}
  .gt-rp-in{width:100%;background:var(--bg-3);border:1px solid var(--border);border-radius:10px;padding:11px 12px;color:var(--text-1);font-size:14px;font-family:inherit;box-sizing:border-box;transition:.15s}
  .gt-rp-in:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim,rgba(139,92,246,.15))}
  textarea.gt-rp-in{resize:vertical;min-height:44px}
  .gt-rp-chips{display:flex;flex-wrap:wrap;gap:7px}
  .gt-rp-chip{background:var(--bg-3);border:1px solid var(--border);color:var(--text-2);font-size:13px;padding:8px 13px;border-radius:9px;cursor:pointer;font-weight:600;transition:.15s;font-family:inherit}
  .gt-rp-chip:hover{border-color:var(--border-hover)}
  .gt-rp-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
  .gt-rp-send{width:100%;margin-top:18px;background:linear-gradient(135deg,var(--accent-bold),var(--accent));border:none;color:#fff;font-weight:700;font-size:14px;padding:12px;border-radius:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:.15s}
  .gt-rp-send:hover{filter:brightness(1.08)}
  .gt-rp-send:disabled{opacity:.7;cursor:default;filter:none}
  .gt-rp-foot{font-size:12px;color:var(--text-3);text-align:center;margin:12px 0 0;display:flex;align-items:center;justify-content:center;gap:6px}
  .gt-rp-done{text-align:center;padding:30px 26px}
  .gt-rp-done-ic{width:66px;height:66px;margin:0 auto 14px}
  .gt-rp-done h3{font-size:18px;color:var(--text-1);margin:0 0 8px}
  .gt-rp-done p{color:var(--text-2);font-size:13.5px;line-height:1.55;margin:0 0 4px}
  .gt-rp-done .gt-rp-send{max-width:150px;margin:18px auto 0}
  .gt-rp-ck-c{fill:none;stroke:#10b981;stroke-width:2.6;opacity:.25}
  .gt-rp-ck-k{fill:none;stroke:#10b981;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:48;stroke-dashoffset:48;animation:gtRpCk .45s .12s ease forwards}
  @keyframes gtRpCk{to{stroke-dashoffset:0}}
  @media(max-width:600px){.gt-report-row{flex-direction:column;align-items:flex-start}.gt-rp-card{max-width:100%}}`;
  document.head.appendChild(s);
}
