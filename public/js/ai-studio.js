// ── AI Studio workspace ───────────────────────────────────────────────────────
// A dedicated zone for the AI generators, separated from the normal cookie/
// extension tools. Reuses `allTools` (already loaded by tools.js) — filters to
// auth_type==='ai_generator', groups by type, and routes clicks through the
// existing openTool() (→ the right /studio page). Self-contained: injects its own
// styles, no dependency on tools.js internals beyond allTools + openTool.

function _aisInjectStyles() {
  if (document.getElementById('aisStyle')) return;
  const st = document.createElement('style'); st.id = 'aisStyle';
  st.textContent = `
    /* Big entry button on the Tools page */
    .ais-hero{position:relative;overflow:hidden;border-radius:20px;padding:26px 30px;margin:0 0 20px;cursor:pointer;
      background:linear-gradient(120deg,#1a1033 0%,#2a1055 45%,#3b0d4d 100%);
      border:1px solid rgba(167,139,250,.35);box-shadow:0 16px 48px rgba(109,40,217,.25);
      display:flex;align-items:center;gap:22px;transition:transform .2s,box-shadow .2s}
    .ais-hero:hover{transform:translateY(-3px);box-shadow:0 22px 60px rgba(109,40,217,.4)}
    .ais-hero::after{content:"";position:absolute;inset:-40%;background:radial-gradient(circle at 80% 20%,rgba(236,72,153,.28),transparent 55%),radial-gradient(circle at 20% 90%,rgba(245,158,11,.2),transparent 50%);pointer-events:none}
    .ais-hero-icon{position:relative;z-index:1;flex:0 0 auto;width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,#8b5cf6,#ec4899);font-size:30px;color:#fff;box-shadow:0 8px 22px rgba(139,92,246,.5)}
    .ais-hero-text{position:relative;z-index:1;flex:1;min-width:0}
    .ais-hero-text h2{margin:0 0 4px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-.3px}
    .ais-hero-text p{margin:0;color:#cfc7e6;font-size:14px;line-height:1.5}
    .ais-hero-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .ais-hero-chip{font-size:11px;font-weight:700;color:#e9d8fd;background:rgba(167,139,250,.18);border:1px solid rgba(167,139,250,.3);padding:3px 10px;border-radius:30px}
    .ais-hero-go{position:relative;z-index:1;flex:0 0 auto;color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px;
      background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);padding:11px 18px;border-radius:40px}
    @media(max-width:640px){.ais-hero{flex-direction:column;text-align:center;padding:22px}.ais-hero-go{width:100%;justify-content:center}}

    /* The AI Studio page */
    .ais-top{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px}
    .ais-top-icon{width:52px;height:52px;border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;background:linear-gradient(135deg,#8b5cf6,#ec4899)}
    .ais-top h1{margin:0;font-size:22px;font-weight:800;color:var(--text-1)}
    .ais-top .ais-sub{margin:2px 0 0;color:var(--text-2);font-size:13px}
    .ais-credits{margin-left:auto;display:flex;align-items:center;gap:10px;background:var(--bg-2);border:1px solid var(--border);border-radius:40px;padding:9px 16px}
    .ais-credits .cnum{font-weight:800;color:var(--text-1);font-size:15px}
    .ais-credits .clbl{color:var(--text-3);font-size:12px}
    .ais-credits .cbuy{background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;border:0;border-radius:30px;width:26px;height:26px;cursor:pointer;font-size:15px;line-height:1}
    .ais-notice{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.28);color:#fcd34d;border-radius:12px;padding:11px 15px;font-size:13px;margin-bottom:18px;display:none}

    .ais-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:20px;background:var(--bg-2);border:1px solid var(--border);border-radius:14px;padding:5px}
    .ais-tab{flex:1;min-width:92px;border:0;background:transparent;color:var(--text-2);font-weight:700;font-size:13.5px;padding:10px 12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s}
    .ais-tab.active{background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;box-shadow:0 4px 14px rgba(139,92,246,.35)}
    .ais-tab .tn{font-size:11px;opacity:.75;font-weight:700}

    .ais-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(188px,1fr));gap:14px}
    .ais-card{position:relative;background:var(--bg-2);border:1px solid var(--border);border-radius:16px;padding:16px;cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s;overflow:hidden}
    .ais-card:hover{transform:translateY(-4px);border-color:var(--border-hover);box-shadow:0 14px 34px rgba(0,0,0,.4)}
    .ais-card.locked{opacity:.78}
    .ais-logo{width:44px;height:44px;border-radius:12px;background:#fff;object-fit:contain;padding:5px;margin-bottom:12px}
    .ais-card h4{margin:0 0 3px;font-size:14.5px;font-weight:700;color:var(--text-1);line-height:1.25}
    .ais-card .ais-meta{color:var(--text-3);font-size:11.5px}
    .ais-badge{position:absolute;top:10px;right:10px;font-size:9px;font-weight:800;letter-spacing:.4px;padding:3px 7px;border-radius:6px;color:#fff}
    .ais-badge.NEW{background:linear-gradient(135deg,#10b981,#059669)} .ais-badge.HOT{background:linear-gradient(135deg,#ef4444,#f97316)}
    .ais-lockchip{position:absolute;top:10px;right:10px;font-size:9px;font-weight:800;padding:3px 8px;border-radius:30px;background:linear-gradient(135deg,#8b5cf6,#a855f7);color:#fff}
    .ais-empty{color:var(--text-2);padding:40px;text-align:center}`;
  document.head.appendChild(st);
}

// Which AI tools belong to which tab (by slug — reliable, no category dependency)
function _aisGroup(slug) {
  if (slug.startsWith('ai-img-')) return 'image';
  if (slug.startsWith('ai-vid-')) return 'video';
  if (slug === 'ai-audio') return 'audio';
  // ai-upscale, ai-3d, ai-describe, ai-bg-remove → Utilities
  return 'utility';
}
const _AIS_TABS = [
  { id: 'image',   name: 'Image',     icon: 'fa-image' },
  { id: 'video',   name: 'Video',     icon: 'fa-film' },
  { id: 'audio',   name: 'Audio',     icon: 'fa-waveform-lines' },
  { id: 'utility', name: 'Utilities', icon: 'fa-wand-magic-sparkles' },
];
let _aisTab = 'image';

function _aisAiTools() {
  const list = (typeof allTools !== 'undefined' ? allTools : []);
  // ai_hidden (from /api/tools) = a single-model AI tool whose model is admin-hidden
  // (credit-only by default). Those cards are dropped; free + multi-model tools stay.
  return list.filter(t => t.auth_type === 'ai_generator' && !t.ai_hidden);
}

// Credit header (reuses /api/user/credits — same source the generators use)
function _aisLoadCredits() {
  const box = document.getElementById('aisCredits');
  if (!box) return;
  if (typeof currentUser === 'undefined' || !currentUser) { box.style.display = 'none'; return; }
  api('/api/user/credits').then(d => {
    box.style.display = '';
    box.innerHTML = `<i class="fas fa-coins" style="color:#fbbf24"></i>
      <span class="cnum">${(d.balance || 0).toLocaleString()}</span><span class="clbl">AI credits</span>
      <button class="cbuy" title="Buy credits" onclick="showPage('pricing')">+</button>`;
  }).catch(() => { box.style.display = 'none'; });
}

function aisSetTab(id) {
  _aisTab = id;
  document.querySelectorAll('.ais-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  _aisRenderGrid();
}

// refresh the little (N) count on each tab (after tools load)
function aisRefreshCounts() {
  const counts = {};
  _aisAiTools().forEach(t => { const g = _aisGroup(t.slug); counts[g] = (counts[g] || 0) + 1; });
  document.querySelectorAll('.ais-tab').forEach(b => {
    const tn = b.querySelector('.tn'); if (tn) tn.textContent = counts[b.dataset.tab] || 0;
  });
}

function _aisRenderGrid() {
  const grid = document.getElementById('aisGrid');
  if (!grid) return;
  const tools = _aisAiTools().filter(t => _aisGroup(t.slug) === _aisTab);
  // only show what the user is allowed to see (reuse the tools.js gate if present)
  const visible = (typeof canUserSeeTool === 'function') ? tools.filter(canUserSeeTool) : tools;
  if (!visible.length) { grid.innerHTML = `<div class="ais-empty">No ${_aisTab} tools available on your plan yet.</div>`; return; }
  grid.innerHTML = visible.map(t => {
    const locked = (typeof isToolPlanLocked === 'function') && isToolPlanLocked(t);
    const logo = t.logo_url || '/app/img/logo.png';
    const name = (t.name || '').replace(/ AI (Image|Video) Generator$/i, '').replace(/ AI Video Generator$/i, '').trim() || t.name;
    const badge = (t.badge && /^(NEW|HOT)$/i.test(t.badge)) ? `<span class="ais-badge ${t.badge.toUpperCase()}">${t.badge.toUpperCase()}</span>` : '';
    const lock = locked ? '<span class="ais-lockchip"><i class="fas fa-lock"></i> Upgrade</span>' : badge;
    return `<div class="ais-card ${locked ? 'locked' : ''}" onclick="openTool('${t.slug}')">
      ${lock}
      <img class="ais-logo" src="${escapeHtml(logo)}" onerror="this.src='/app/img/logo.png'">
      <h4>${escapeHtml(name)}</h4>
      <div class="ais-meta">${escapeHtml(t.category_name || 'AI Generator')}</div>
    </div>`;
  }).join('');
}

// Entry — called by showPage('ai-studio')
function aiStudioOpen() {
  _aisInjectStyles();
  const page = document.getElementById('page-ai-studio');
  if (!page) return;
  // If the tool list hasn't arrived yet (direct landing on /app/ai-studio), show
  // the shell and re-render once allTools is populated.
  if (!(typeof allTools !== 'undefined' && allTools && allTools.length)) {
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (typeof allTools !== 'undefined' && allTools && allTools.length) {
        clearInterval(iv);
        if (!document.getElementById('page-ai-studio').classList.contains('hidden')) { _aisLoadCredits(); _aisRenderGrid(); aisRefreshCounts(); }
      } else if (tries > 40) clearInterval(iv); // ~8s cap
    }, 200);
  }
  // counts per tab
  const counts = {};
  _aisAiTools().forEach(t => { const g = _aisGroup(t.slug); counts[g] = (counts[g] || 0) + 1; });
  page.innerHTML = `
    <div class="ais-top">
      <div class="ais-top-icon"><i class="fas fa-wand-magic-sparkles"></i></div>
      <div>
        <h1>AI Studio</h1>
        <p class="ais-sub">Generate images, video, audio & more — powered by the best AI models.</p>
      </div>
      <div class="ais-credits" id="aisCredits" style="display:none"></div>
    </div>
    <div class="ais-notice" id="aisNotice"></div>
    <div class="ais-tabs">
      ${_AIS_TABS.filter(t => (counts[t.id] || 0) > 0).map(t => `<button class="ais-tab ${t.id === _aisTab ? 'active' : ''}" data-tab="${t.id}" onclick="aisSetTab('${t.id}')">
        <i class="fas ${t.icon}"></i> ${t.name}<span class="tn">${counts[t.id] || 0}</span></button>`).join('')}
    </div>
    <div class="ais-grid" id="aisGrid"></div>`;
  // If the active tab has no tools (e.g. Audio hidden), switch to the first tab that does.
  if (!(counts[_aisTab] > 0)) {
    const firstWith = _AIS_TABS.map(t => t.id).find(id => (counts[id] || 0) > 0);
    if (firstWith) _aisTab = firstWith;
    document.querySelectorAll('.ais-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === _aisTab));
  }
  _aisLoadCredits();
  _aisRenderGrid();
}

// Inject the styles as soon as this script loads, so the AI Studio HERO on the
// Tools page is always styled — even before the user has opened AI Studio once.
// (Was previously injected lazily inside aiStudioOpen(), which left the hero as
// plain unstyled text until you visited the page.)
_aisInjectStyles();
