// ============ USER INIT & NAVIGATION ============
// Loaded last — depends on: helpers.js, auth.js, tools.js, favorites.js, announcements.js, theme.js

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  if (userToken) verifyUser(); else updateAuthUI();
  loadCategories();
  loadTools();
  setupEvents();
  // Route from URL path on load/refresh
  // /app → home, /app/tools → tools, /app/tools/slug → tool detail, /app/pricing etc.
  initScrollMemory();
  setTimeout(() => {
    const rawPath = window.location.pathname.replace(/^\/app\/?/, '');
    const parts = rawPath.split('/').filter(Boolean);
    let routed = true;
    if (parts[0] === 'tools' && parts[1]) openTool(parts[1]);
    else if (parts[0] === 'login' || parts[0] === 'signin') {
      if (currentUser) showPage('tools');
      else navigateToAuth(null, 'login');
    }
    else if (parts[0] === 'register' || parts[0] === 'signup') {
      if (currentUser) showPage('tools');
      else navigateToAuth(null, 'register');
    }
    else if (parts[0] === 'ai-gen') { const s = parts[1] || sessionStorage.getItem('gt_last_ai_tool'); if (s) aiGenOpen(s); else showPage('tools'); }
    else if (parts[0]) showPage(parts[0]);
    // legacy ?page= support (old links)
    else {
      const qp = new URLSearchParams(window.location.search);
      const qPage = qp.get('page');
      if (qPage === 'tool-detail') { const s = qp.get('slug'); if (s) openTool(s); else showPage('tools'); }
      else if (qPage) showPage(qPage);
      else routed = false;
    }
    // Home is the default page, so showPage() never runs for it on a plain /app load —
    // its scroll has to be restored explicitly or a refresh on Home always jumps to top,
    // and the search bar (shown on Home + Tools) has to be revealed the same way.
    if (!routed) {
      _restoreScrollFor('home');
      const _sb = document.getElementById('topbarSearch');
      if (_sb) _sb.classList.remove('hidden');
    }
  }, 50);
  // Sync view mode buttons with saved preference
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === currentViewMode));
  updateLoginPrompt();
  loadAnnouncements();
  loadSidebarPromo();
  loadBottomBar();
  // Home is the default active page and showPage() doesn't run on first load,
  // so its spotlight and its own loader have to be kicked off explicitly here.
  if (typeof loadSpotlight === 'function') loadSpotlight('home');
  if (typeof loadHome === 'function') { try { loadHome(); } catch (e) {} }
  setTimeout(loadPromoPopup, 1200);
  if (localStorage.getItem('gt_new_signup')) {
    localStorage.removeItem('gt_new_signup');
    setTimeout(launchWelcome, 500);
  } else if (!sessionStorage.getItem('gt_confetti_shown')) {
    sessionStorage.setItem('gt_confetti_shown', '1');
    setTimeout(launchConfetti, 600);
  }
  initRevealOnScroll();   // cheap (IntersectionObserver) — always
  initBrandMarquee();     // builds DOM once; CSS handles the scroll
  // Heavy cursor-tracking / rAF effects — skipped on low-powered devices (lite mode)
  if (!window.GT_LITE) {
    initSpotlightCards();
    initHeroTileRepel();
    initHeroCursorLight();
    initTiltCards();
    initMagneticButtons();
    initHeroOrbit();
  }
});

// Orbital AI-model constellation — glowing core with model chips orbiting on 3 rings.
// 3-level nesting per node keeps chips upright while the rings spin.
function initHeroOrbit() {
  const el = document.getElementById('heroOrbit');
  if (!el) return;
  const rings = [
    { R: 92,  spd: 34, dir: 1,  nodes: [['fa-bolt','#a78bfa'],['fa-hat-wizard','#c084fc'],['fa-seedling','#34d399']] },
    { R: 150, spd: 48, dir: -1, nodes: [['fa-video','#f472b6'],['fa-film','#60a5fa'],['fa-clapperboard','#fbbf24'],['fa-wand-magic-sparkles','#f87171']] },
    { R: 208, spd: 64, dir: 1,  nodes: [['fa-microphone','#fbbf24'],['fa-robot','#22d3ee'],['fa-font','#a78bfa'],['fa-pen-ruler','#f472b6'],['fa-atom','#fb923c']] },
  ];
  let html = '<div class="orbit-core"><span class="orbit-core-glow"></span><span class="orbit-core-glow d2"></span><img src="/app/img/logo.png" alt=""></div>';
  rings.forEach(ring => {
    const n = ring.nodes.length;
    const ringSpin = ring.dir > 0 ? 'obSpin' : 'obSpinR';
    const nodeSpin = ring.dir > 0 ? 'obSpinR' : 'obSpin';
    let nodes = '';
    ring.nodes.forEach((nd, i) => {
      nodes +=
        `<span class="ob-node" style="--i:${i};--n:${n};--R:${ring.R}px">` +
          `<span class="ob-rot" style="--i:${i};--n:${n}">` +
            `<span class="ob-spin" style="animation-name:${nodeSpin};animation-duration:${ring.spd}s">` +
              `<span class="ob-pill" style="--c:${nd[1]}"><i class="fas ${nd[0]}"></i></span>` +
            `</span>` +
          `</span>` +
        `</span>`;
    });
    html += `<span class="ob-ring" style="--d:${ring.R * 2}px;animation-name:${ringSpin};animation-duration:${ring.spd}s">${nodes}</span>`;
  });
  el.innerHTML = html;
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
  const parts = window.location.pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'tools' && parts[1]) openTool(parts[1]);
  else if (parts[0] === 'ai-gen') { const s = parts[1] || sessionStorage.getItem('gt_last_ai_tool'); if (s) aiGenOpen(s); else showPage('tools'); }
  else if (parts[0]) showPage(parts[0]);
  else showPage('home');
});

// Hero cursor-following spotlight (Linear-style)
function initHeroCursorLight() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  let raf = null, lastE = null;
  hero.addEventListener('mousemove', (e) => {
    lastE = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--hx', ((lastE.clientX - r.left) / r.width * 100) + '%');
      hero.style.setProperty('--hy', ((lastE.clientY - r.top) / r.height * 100) + '%');
      raf = null;
    });
  });
}

// Letter-stagger reveal for hero title (Apple-style)
function initLetterStagger() {
  const title = document.querySelector('.hero-title');
  if (!title || title.dataset.split) return;
  title.dataset.split = '1';
  const html = title.innerHTML;
  // Walk text nodes and wrap each character in <span class="char">
  const wrap = (text) => text.split('').map((c, i) =>
    c === ' ' ? ' ' : `<span class="char" style="animation-delay:${(i * 0.025).toFixed(3)}s">${c}</span>`
  ).join('');
  // Split around <br> tags
  const parts = html.split(/(<br\s*\/?>)/i);
  let charIdx = 0;
  const out = parts.map(part => {
    if (/<br/i.test(part)) return part;
    return part.split('').map(c => {
      if (c === ' ') return ' ';
      const delay = (charIdx++ * 0.025).toFixed(3);
      return `<span class="char" style="animation-delay:${delay}s">${c}</span>`;
    }).join('');
  }).join('');
  title.innerHTML = out;
}

// 3D tilt on cards (Stripe-style)
function initTiltCards() {
  const cards = document.querySelectorAll('.stat-card, .quick-link');
  cards.forEach(card => {
    if (card.classList.contains('stat-card') && !card.querySelector('.tilt-shine')) {
      const shine = document.createElement('div');
      shine.className = 'tilt-shine';
      card.appendChild(shine);
    }
    let raf = null, lastE = null;
    card.addEventListener('mousemove', (e) => {
      lastE = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (lastE.clientX - r.left) / r.width;
        const py = (lastE.clientY - r.top) / r.height;
        const rx = (py - 0.5) * -10;
        const ry = (px - 0.5) * 14;
        card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        card.classList.add('tilt-active');
        raf = null;
      });
    });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('tilt-active');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

// Magnetic buttons (Framer-style) — gently pulled toward cursor
function initMagneticButtons() {
  const buttons = document.querySelectorAll('.btn-glow');
  const STRENGTH = 0.35;
  buttons.forEach(btn => {
    let raf = null, lastE = null;
    btn.addEventListener('mousemove', (e) => {
      lastE = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = btn.getBoundingClientRect();
        const dx = (lastE.clientX - (r.left + r.width / 2)) * STRENGTH;
        const dy = (lastE.clientY - (r.top + r.height / 2)) * STRENGTH;
        btn.style.setProperty('--mtx', dx.toFixed(1) + 'px');
        btn.style.setProperty('--mty', dy.toFixed(1) + 'px');
        btn.classList.add('magnetic-active');
        raf = null;
      });
    });
    btn.addEventListener('mouseleave', () => {
      btn.classList.remove('magnetic-active');
      btn.style.setProperty('--mtx', '0px');
      btn.style.setProperty('--mty', '0px');
    });
  });
}

// Hero tiles "run away" from cursor when it gets close
function initHeroTileRepel() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const tiles = hero.querySelectorAll('.hero-tile');
  if (!tiles.length) return;

  const RADIUS = 140;
  const STRENGTH = 50;
  // Cache tile rects, refresh on resize/scroll only
  let rects = [];
  const refreshRects = () => { rects = Array.from(tiles).map(t => t.getBoundingClientRect()); };
  refreshRects();
  window.addEventListener('resize', refreshRects);
  window.addEventListener('scroll', refreshRects, { passive: true });

  let raf = null, lastE = null;
  hero.addEventListener('mousemove', (e) => {
    lastE = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const ex = lastE.clientX, ey = lastE.clientY;
      tiles.forEach((tile, i) => {
        const r = rects[i];
        if (!r) return;
        const dx = (r.left + r.width / 2) - ex;
        const dy = (r.top + r.height / 2) - ey;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < RADIUS) {
          const force = (1 - dist / RADIUS) * STRENGTH;
          const angle = Math.atan2(dy, dx);
          tile.style.setProperty('--tx', (Math.cos(angle) * force).toFixed(1) + 'px');
          tile.style.setProperty('--ty', (Math.sin(angle) * force).toFixed(1) + 'px');
        } else {
          tile.style.setProperty('--tx', '0px');
          tile.style.setProperty('--ty', '0px');
        }
      });
      raf = null;
    });
  });

  hero.addEventListener('mouseleave', () => {
    tiles.forEach(tile => {
      tile.style.setProperty('--tx', '0px');
      tile.style.setProperty('--ty', '0px');
    });
  });
}

// Mouse-tracking spotlight effect for premium cards
function initSpotlightCards() {
  let raf = null, lastE = null;
  document.addEventListener('mousemove', (e) => {
    lastE = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const card = lastE.target.closest && lastE.target.closest('.stat-card, .quick-link');
      raf = null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((lastE.clientX - rect.left) / rect.width * 100) + '%');
      card.style.setProperty('--my', ((lastE.clientY - rect.top) / rect.height * 100) + '%');
    });
  });
}

// Scroll reveal — fade-up elements when they enter viewport
function initRevealOnScroll() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
  els.forEach(e => obs.observe(e));
}

// Populate the brand marquee with real tool names from API
async function initBrandMarquee() {
  const track = document.getElementById('brandMarqueeTrack');
  if (!track) return;
  try {
    const tools = await api('/api/tools');
    if (!tools || !tools.length) return;
    const names = tools.slice(0, 20).map(t => t.name);
    // Duplicate the list for seamless infinite loop
    const html = [...names, ...names].map(n =>
      `<span class="brand-marquee-item">${escapeHtml(n)}</span>`
    ).join('');
    track.innerHTML = html;
  } catch (err) {
    track.parentElement.style.display = 'none';
  }
}

function setupEvents() {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-icon-wrap')) closeAllDropdowns();
  });

  // "/" jumps to the search box (like GitHub / GFXToolz); Esc leaves it. Ignored
  // while you are already typing in a field, so it never eats a real slash.
  document.addEventListener('keydown', (e) => {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const box = document.getElementById('topbarSearch');
    const typing = /^(input|textarea|select)$/i.test((e.target.tagName || '')) || e.target.isContentEditable;
    if (e.key === '/' && !typing && box && !box.classList.contains('hidden')) {
      e.preventDefault();
      input.focus();
    } else if (e.key === 'Escape' && document.activeElement === input) {
      input.blur();
    }
  });
}

// ============ UI: PAGES, SIDEBAR, DROPDOWNS ============
// Remembers how far down each page was scrolled, so coming back from a tool — or
// refreshing — lands you where you left off instead of at the top of a 100+ tool list.
// tool-detail is deliberately excluded: each tool is fresh content and starts at its own top.
//
// The offset saved is always the LIVE scrollTop, which the browser has already clamped
// if a search shortened the list — so it stays correct without needing to be cleared
// when the grid re-renders.
//
// Persisted to sessionStorage so it survives a refresh (F5) but NOT a new tab or a
// return days later, where landing mid-list would just be confusing.
const _SCROLL_KEY = 'gt_scroll_v1';
let _scrollMem = {};
try { _scrollMem = JSON.parse(sessionStorage.getItem(_SCROLL_KEY) || '{}') || {}; } catch (e) { _scrollMem = {}; }

// Signing in or out ends the browsing context that produced these positions.
// Both copies have to go: sessionStorage AND the in-memory object, because an
// in-page login never reloads user.js, so _scrollMem would otherwise survive and
// get re-persisted on the next scroll — putting the position straight back.
function clearScrollMemory() {
  _scrollMem = {};
  clearTimeout(_scrollSaveTimer);
  try { sessionStorage.removeItem(_SCROLL_KEY); } catch (e) {}
}

let _scrollSaveTimer = null;
function _persistScroll() {
  clearTimeout(_scrollSaveTimer);
  _scrollSaveTimer = setTimeout(() => {
    try { sessionStorage.setItem(_SCROLL_KEY, JSON.stringify(_scrollMem)); } catch (e) {}
  }, 150);
}

function _currentPageName() {
  const el = document.querySelector('.page:not(.hidden)');
  return el ? el.id.replace('page-', '') : null;
}

// Record position continuously, not only on navigation — a refresh can happen at any
// moment and there is no reliable "about to reload" hook to save on.
function initScrollMemory() {
  const mw = document.querySelector('.main-wrap');
  if (!mw) return;
  let t = null;
  mw.addEventListener('scroll', () => {
    if (t) return;
    t = setTimeout(() => {
      t = null;
      const p = _currentPageName();
      if (p && p !== 'tool-detail') { _scrollMem[p] = mw.scrollTop; _persistScroll(); }
    }, 180);
  }, { passive: true });
}

// Restoring has to survive content that arrives late: on a refresh the tools grid is
// still being fetched, so the container has no height yet and an early scrollTo is
// silently clamped to 0. Retry briefly until the content is tall enough — but abandon
// immediately if the user scrolls themselves or navigates elsewhere, so we never yank
// the page out from under them.
let _restoreToken = 0;
function _restoreScrollFor(page) {
  const mw = document.querySelector('.main-wrap');
  if (!mw) return;
  const want = page === 'tool-detail' ? 0 : Math.round(_scrollMem[page] || 0);
  const token = ++_restoreToken;
  mw.scrollTo({ top: want, behavior: 'instant' });
  if (want < 2) return;

  const cancel = () => { if (token === _restoreToken) _restoreToken++; };
  ['wheel', 'touchstart', 'keydown'].forEach(ev =>
    window.addEventListener(ev, cancel, { once: true, passive: true }));

  let tries = 16;                                   // ~1.9s of grace for a slow list
  const tick = () => {
    if (token !== _restoreToken || !mw.isConnected) return;   // superseded or gone
    if (Math.abs(mw.scrollTop - want) <= 2) return;           // landed
    if (mw.scrollHeight - mw.clientHeight >= want) {          // content is tall enough now
      mw.scrollTo({ top: want, behavior: 'instant' });
      return;
    }
    if (--tries > 0) setTimeout(tick, 120);
  };
  setTimeout(tick, 60);
}

function showPage(page, extra) {
  // Authentication route mappings
  if (page === 'login' || page === 'signin') {
    if (currentUser) { showPage('tools'); return; }
    page = 'auth';
    setTimeout(() => { if (typeof switchAuthTab === 'function') switchAuthTab('login'); }, 40);
  } else if (page === 'register' || page === 'signup') {
    if (currentUser) { showPage('tools'); return; }
    page = 'auth';
    setTimeout(() => { if (typeof switchAuthTab === 'function') switchAuthTab('register'); }, 40);
  } else if (page === 'auth') {
    if (currentUser) { showPage('tools'); return; }
  }

  const current = document.querySelector('.page:not(.hidden)');
  const target = document.getElementById('page-' + page);

  // Save where we were BEFORE anything moves.
  if (current) {
    const fromPage = current.id.replace('page-', '');
    const mw = document.querySelector('.main-wrap');
    if (mw && fromPage !== 'tool-detail') { _scrollMem[fromPage] = mw.scrollTop; _persistScroll(); }
  }

  // Clean path-based URLs — always update before early-return
  // Strips # left by href="#" sidebar links (window.location.hash check)
  const slug = (extra && extra.slug) ? extra.slug : null;
  const newUrl = page === 'home' ? '/app'
    : (page === 'tool-detail' && slug) ? `/app/tools/${encodeURIComponent(slug)}`
    : (page === 'auth') ? '/login'
    : `/app/${page}`;
  if (window.location.pathname !== newUrl || window.location.hash) {
    history.pushState({ page, slug }, '', newUrl);
  }

  if (!target || target === current) {
    closeSidebar();
    return;
  }

  if (current) {
    current.style.transition = 'opacity .13s ease-out';
    current.style.opacity = '0';
    setTimeout(() => {
      current.classList.add('hidden');
      current.style.opacity = '';
      current.style.transition = '';
      _revealPage(target, page);
    }, 130);
  } else {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    _revealPage(target, page);
  }
}

function _revealPage(target, page) {
  if (!page) page = target.id.replace('page-', '');
  target.classList.remove('hidden');
  target.style.opacity = '0';
  target.style.transition = 'opacity .18s ease-out';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.style.opacity = '1';
      setTimeout(() => {
        target.style.opacity = '';
        target.style.transition = '';
      }, 200);
    });
  });

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Restore the remembered offset for this page (0 for a first visit, always 0 for
  // tool-detail). Retries briefly in case the page's content is still loading.
  _restoreScrollFor(page);

  const search = document.getElementById('topbarSearch');
  // Search is available on Home as well as Tools (typing on Home jumps to the
  // Tools results — see handleSearch). Hidden on every other page.
  if (search) search.classList.toggle('hidden', page !== 'tools' && page !== 'home');

  // "Working again" strip rides along on home + tools only — never over checkout.
  if (typeof refreshFixBannerVisibility === 'function') refreshFixBannerVisibility(page);
  // Each page loads its own spotlight slides on first visit.
  if (typeof refreshSpotlight === 'function') refreshSpotlight(page);

  // Tools page: only fetch the first time. On later visits the grid is already
  // rendered — re-fetching would re-run the card entrance animation (visible "blink").
  // Category/search/favorites changes call loadTools()/renderTools() themselves.
  if (page === 'home') { try { loadHome(); } catch (e) {} }
  if (page === 'tools') { if (!_toolsLoaded) loadTools(); updateLoginPrompt(); }
  if (page === 'ai-studio') { try { if (!_toolsLoaded) loadTools(); aiStudioOpen(); } catch (e) {} }
  if (page === 'pricing') prLoadPricing();
  if (page === 'store') { try { stLoad(); } catch (e) {} }
  if (page === 'extension') extLoadPage();
  if (page === 'affiliate') { try { afLoad(); } catch (e) {} }

  // mobile: collapse the slide-out drawer after picking a page (no-op on desktop)
  closeSidebar();
}

function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  if (!sb) return;
  const isCurrentlyOpen = sb.classList.contains('open');
  if (isCurrentlyOpen) {
    closeSidebar();
  } else {
    sb.classList.add('open');
    let bd = document.getElementById('sidebarBackdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'sidebarBackdrop';
      bd.className = 'sidebar-backdrop';
      bd.addEventListener('click', closeSidebar);
      bd.addEventListener('touchstart', function(e) {
        closeSidebar();
      }, { passive: true });
      document.body.appendChild(bd);
    }
    bd.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  const sb = document.querySelector('.sidebar');
  if (sb) sb.classList.remove('open');
  const bd = document.getElementById('sidebarBackdrop');
  if (bd) bd.classList.remove('show');
  document.body.style.overflow = '';
}

function handleAccountClick() {
  if (!currentUser) {
    navigateTo('/login');
  } else {
    toggleDropdown('accountDropdown');
  }
}

function toggleDropdown(id) {
  const panel = document.getElementById(id);
  const wasHidden = panel.classList.contains('hidden');
  closeAllDropdowns();
  if (wasHidden) panel.classList.remove('hidden');
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-panel').forEach(d => d.classList.add('hidden'));
}

// ============ NEW SIGNUP WELCOME ============
function launchWelcome() {
  // Overlay card
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
    animation:wlc-fade-in .4s ease both;
  `;
  const firstName = (currentUser && currentUser.first_name) ? currentUser.first_name : 'there';
  overlay.innerHTML = `
    <style>
      @keyframes wlc-fade-in{from{opacity:0}to{opacity:1}}
      @keyframes wlc-card-in{from{opacity:0;transform:scale(.7) translateY(40px)}to{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes wlc-pop{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}
      @keyframes wlc-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      @keyframes wlc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      .wlc-card{
        background:var(--bg-2,#111118);border:1px solid rgba(139,92,246,.35);border-radius:28px;
        padding:48px 52px;max-width:480px;width:90%;text-align:center;
        box-shadow:0 0 80px rgba(139,92,246,.3),0 32px 80px rgba(0,0,0,.5);
        animation:wlc-card-in .55s cubic-bezier(.34,1.56,.64,1) both;
      }
      .wlc-emoji{font-size:72px;display:block;margin-bottom:16px;animation:wlc-float 2s ease-in-out infinite;}
      .wlc-title{
        font-size:32px;font-weight:900;letter-spacing:-1px;margin-bottom:8px;
        background:linear-gradient(135deg,#a78bfa,#ec4899,#f59e0b);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        background-size:200% auto;animation:wlc-shimmer 2s linear infinite;
      }
      .wlc-sub{color:var(--text-2,#8e8ea0);font-size:15px;line-height:1.6;margin-bottom:28px;}
      .wlc-name{color:var(--text-1,#ededf0);font-weight:700;}
      .wlc-pills{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:32px;}
      .wlc-pill{background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.25);color:var(--accent,#a78bfa);
        border-radius:20px;padding:5px 14px;font-size:12px;font-weight:600;}
      .wlc-btn{
        display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);
        color:#fff;font-weight:700;font-size:15px;border:none;border-radius:14px;
        padding:14px 36px;cursor:pointer;width:100%;
        transition:transform .15s,box-shadow .15s;
        box-shadow:0 8px 30px rgba(139,92,246,.4);
      }
      .wlc-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(139,92,246,.55);}
      .wlc-btn:active{transform:scale(.97);}
    </style>
    <div class="wlc-card">
      <span class="wlc-emoji">🛡️</span>
      <div class="wlc-title">Welcome to ToolsVault!</div>
      <p class="wlc-sub">Hey <span class="wlc-name">${escapeHtml(firstName)}</span> 👋 You're officially in.<br>100+ premium tools are waiting for you.</p>
      <div class="wlc-pills">
        <span class="wlc-pill">✨ AI Tools</span>
        <span class="wlc-pill">🎨 Design</span>
        <span class="wlc-pill">📈 SEO</span>
        <span class="wlc-pill">🎬 Video</span>
        <span class="wlc-pill">✍️ Writing</span>
      </div>
      <button class="wlc-btn" id="wlcDismissBtn">🚀 Let's Go!</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('wlcDismissBtn').onclick = () => {
    overlay.style.animation = 'wlc-fade-in .3s ease reverse both';
    setTimeout(() => overlay.remove(), 300);
  };
  // Auto-dismiss after 8 seconds
  setTimeout(() => { if (overlay.isConnected) overlay.remove(); }, 8000);

  // Heavy confetti burst
  launchConfettiBurst(250);
}

// ============ RELAUNCH GIFT MODAL ============
// Fired once from verifyUser() when the server redeems a pending gift on this
// login. Self-contained (injects its own styles). The clock already started
// server-side — this just celebrates it.
function showGiftModal(g) {
  if (!g || document.getElementById('gtGiftOverlay')) return;
  const planName = ({ premium: 'Premium', ultimate: 'AI Toolkit', standard: 'Standard', basic: 'Basic' })[g.plan] || g.plan;
  const days = g.days || 30;
  if (!document.getElementById('gtGiftStyle')) {
    const st = document.createElement('style'); st.id = 'gtGiftStyle';
    st.textContent = `
      #gtGiftOverlay{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;
        background:rgba(5,5,6,.72);backdrop-filter:blur(8px);animation:gtGiftFade .3s ease}
      @keyframes gtGiftFade{from{opacity:0}to{opacity:1}}
      @keyframes gtGiftPop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
      @keyframes gtGiftFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      .gtgift-card{position:relative;width:min(440px,92vw);background:linear-gradient(160deg,#16121f,#0c0a12);
        border:1px solid rgba(167,139,250,.35);border-radius:22px;padding:34px 28px 26px;text-align:center;
        box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04) inset;animation:gtGiftPop .5s cubic-bezier(.34,1.56,.64,1)}
      .gtgift-emoji{font-size:56px;line-height:1;animation:gtGiftFloat 3s ease-in-out infinite}
      .gtgift-title{font-size:23px;font-weight:800;margin:14px 0 6px;
        background:linear-gradient(135deg,#a78bfa,#ec4899,#f59e0b);-webkit-background-clip:text;background-clip:text;color:transparent}
      .gtgift-sub{color:#c9c7d4;font-size:14.5px;line-height:1.55;margin:0 4px 18px}
      .gtgift-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(167,139,250,.14);
        border:1px solid rgba(167,139,250,.3);color:#ddd6fe;font-weight:700;font-size:14px;padding:9px 16px;border-radius:40px;margin-bottom:20px}
      .gtgift-btn{display:block;width:100%;padding:13px;border:0;border-radius:12px;font-size:15px;font-weight:700;color:#fff;cursor:pointer;
        background:linear-gradient(135deg,#8b5cf6,#ec4899);box-shadow:0 8px 24px rgba(139,92,246,.4)}
      .gtgift-btn:hover{filter:brightness(1.08)}
      .gtgift-foot{color:#6b6880;font-size:11.5px;margin-top:12px}
      .gtgift-report{display:inline-block;margin-top:14px;color:#9b98ad;font-size:12px;text-decoration:none;border-bottom:1px dashed rgba(167,139,250,.4);cursor:pointer}
      .gtgift-report:hover{color:#ddd6fe}`;
    document.head.appendChild(st);
  }
  const name = (typeof currentUser !== 'undefined' && currentUser && currentUser.first_name) ? (', ' + currentUser.first_name) : '';
  const ov = document.createElement('div'); ov.id = 'gtGiftOverlay';
  ov.innerHTML = `
    <div class="gtgift-card">
      <div class="gtgift-emoji">🎁</div>
      <div class="gtgift-title">A gift for you${name}!</div>
      <div class="gtgift-sub">We've been rebuilding GraphicoToolz to be faster and more reliable — and to say thanks for being with us, here's a gift on the house.</div>
      <div class="gtgift-badge">✨ ${days} days of ${planName} — activated</div>
      <button class="gtgift-btn" onclick="(function(){var o=document.getElementById('gtGiftOverlay');if(o)o.remove();})()">Start exploring 🚀</button>
      <div class="gtgift-foot">Your ${days} days start today. Enjoy!</div>
      <a class="gtgift-report" onclick="(function(){var o=document.getElementById('gtGiftOverlay');if(o)o.remove();if(typeof gtOpenRequestModal==='function')gtOpenRequestModal('','problem');})()">Run into a problem with a tool? Tell us →</a>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  try { if (typeof launchConfettiBurst === 'function') launchConfettiBurst(220); } catch (e) {}
}

// ============ CONFETTI ============
function launchConfetti() { launchConfettiBurst(120); }

function launchConfettiBurst(count) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#8b5cf6','#ec4899','#f59e0b','#22c55e','#3b82f6','#f43f5e','#a78bfa','#fbbf24','#34d399','#60a5fa'];
  const EMOJIS = ['🎉','🎊','✨','🥳','🎈','⭐','💜','🌟'];
  const particles = [];
  const isHeavy = count > 120;

  for (let i = 0; i < count; i++) {
    const side = i % 3; // 0=left, 1=right, 2=center-top (heavy only)
    let x, y, vx, vy;
    if (side === 0) {
      x = 0; y = canvas.height;
      vx = Math.random() * 20 + 8; vy = -(Math.random() * 26 + 14);
    } else if (side === 1) {
      x = canvas.width; y = canvas.height;
      vx = -(Math.random() * 20 + 8); vy = -(Math.random() * 26 + 14);
    } else {
      x = canvas.width / 2 + (Math.random() - 0.5) * 200;
      y = isHeavy ? -10 : canvas.height / 2;
      vx = (Math.random() - 0.5) * 16; vy = Math.random() * 14 + 4;
    }
    particles.push({
      x, y, vx, vy,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * (isHeavy ? 12 : 8) + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      shape: Math.random() < (isHeavy ? 0.2 : 0.15) ? 'emoji' : (Math.random() < 0.5 ? 'rect' : 'circle'),
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      opacity: 1,
      gravity: 0.5 + Math.random() * 0.25,
      drag: 0.975
    });
  }

  let frame = 0;
  const MAX_FRAMES = isHeavy ? 260 : 180;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - (frame / MAX_FRAMES) * 1.3);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      if (p.shape === 'emoji') {
        ctx.font = `${p.size * 2.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
      } else if (p.shape === 'rect') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size / 2.5);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    frame++;
    if (frame < MAX_FRAMES) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(draw);
}

/* ── topbar control cluster ────────────────────────────────────────────────
   Each control expands to show its own label while its dropdown is open, so
   the open panel is anchored to a named button rather than to one of three
   identical grey glyphs. It also means the pill only ever spends space on the
   thing you are actually using — a permanent row of labels would be wider and
   say the same amount.

   The state is READ from the panels rather than tracked separately: the
   dropdowns are opened by several different functions (toggleDropdown,
   toggleNotifDropdown, toggleWeatherPanel, closeAllDropdowns), so anything
   that kept its own copy would drift the moment one of them changed. Here the
   panel's own .hidden class is the single source of truth.

   Runs on capture + rAF: capture fires before the click handlers, and the
   frame callback lands after they have finished mutating the DOM. */
function syncTopbarLabels() {
  document.querySelectorAll('.topbar-icon-group .topbar-icon-wrap, .topbar-vibe .topbar-icon-wrap')
    .forEach(function (wrap) {
      var panel = wrap.querySelector('.dropdown-panel');
      wrap.classList.toggle('open', !!panel && !panel.classList.contains('hidden'));
    });
}
document.addEventListener('click', function () { requestAnimationFrame(syncTopbarLabels); }, true);
document.addEventListener('keyup', function (e) { if (e.key === 'Escape') syncTopbarLabels(); });
