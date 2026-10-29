// ============ PRICING PAGE (embedded in dashboard) ============

let _prCurrency = localStorage.getItem('gt_currency') || 'USD';
let _prPeriod = 'monthly';   // 'monthly' | 'yearly' — the plan-group tab
let _prPlans = [];
let _prIndTools = [];
let _prIndFiltered = [];
let _prIndPage = 0;
let _prLoaded = false;
const PR_PER_PAGE = 6;

// AI limits + models per plan_key — shown on pricing cards
const PR_PLAN_AI = {
  free:     { credits: 0,    image: 0,   video: 0,   audio: 0,   bg: 0,   upscale: 0,   models: [] },
  basic:    { credits: 100,  image: 20,  video: 20,  audio: 10,  bg: 50,  upscale: 25,
    models: [
      { name: 'Nano Banana Pro', tag: 'Image' },
      { name: 'Kling 2.5',       tag: 'Video', free: true },
      { name: 'Minimax 2.3',     tag: 'Video', free: true },
      { name: 'Wan 2.2',         tag: 'Video', free: true },
      { name: 'ElevenLabs',      tag: 'Audio' },
    ]
  },
  standard: { credits: 250,  image: 35,  video: 30,  audio: 20,  bg: -1,  upscale: 50,
    models: [
      { name: 'All Image Models', tag: 'Image' },
      { name: 'Kling 2.5',        tag: 'Video', free: true },
      { name: 'Minimax 2.3',      tag: 'Video', free: true },
      { name: 'Seedance 2.0 Fast',tag: 'Video', hot: true },
      { name: 'Gemini TTS',       tag: 'Audio' },
    ]
  },
  premium:  { credits: 600,  image: 60,  video: 50,  audio: 50,  bg: -1,  upscale: -1,
    models: [
      { name: 'All Image Models', tag: 'Image' },
      { name: 'Kling 3.0',        tag: 'Video', hot: true },
      { name: 'Seedance 2.0',     tag: 'Video', hot: true },
      { name: 'Veo 3.1 Fast',     tag: 'Video', hot: true },
      { name: 'ElevenLabs v3',    tag: 'Audio' },
    ]
  },
  ultimate: { credits: 4000, image: 100, video: 80,  audio: 100, bg: -1,  upscale: -1,
    models: [
      { name: 'Sora 2',           tag: 'Video', hot: true },
      { name: 'Runway Gen 4.5',   tag: 'Video', hot: true },
      { name: 'Veo 3.1',          tag: 'Video', hot: true },
      { name: 'Kling 3.0',        tag: 'Video', hot: true },
      { name: 'All 160+ Models',  tag: 'All' },
    ]
  },
};

// GT Credits packs — hardcoded (not from DB)
const PR_CREDIT_PACKS = [
  { name: 'Starter',  credits: 150,  price_inr: 49,  price_usd: 0.59, note: '15 Seedance or 3 Kling 3.0 videos',  icon: 'fa-seedling' },
  { name: 'Standard', credits: 500,  price_inr: 149, price_usd: 1.79, note: '12 Kling 3.0 or 4 Sora 2 videos',    icon: 'fa-bolt' },
  { name: 'Pro',      credits: 1200, price_inr: 299, price_usd: 3.59, note: '30 Kling 3.0 or 10 Sora 2 videos',   icon: 'fa-rocket', popular: true },
  { name: 'Studio',   credits: 3000, price_inr: 649, price_usd: 7.79, note: '75 Kling 3.0 or 25 Sora 2 videos',   icon: 'fa-crown' },
];

const PR_FAQS = [
  { q: 'Can I cancel anytime?', a: 'Yes. You continue to have access until the end of your billing period. No recurring subscription — no need for manual cancellation.' },
  { q: 'How do I access the tools?', a: 'Install our browser extension, log in, and click "Access" on any tool in the dashboard. The extension handles authentication automatically.' },
  { q: 'Are these shared accounts?', a: 'Yes — group-buy shared accounts. You get full access to tool features without your own subscription. Usage limits may apply per plan.' },
  { q: 'What payment methods are accepted?', a: 'UPI, credit/debit cards, net banking, and international card payments. All payments are processed securely.' },
  { q: 'What happens after my plan expires?', a: 'Access to premium tools stops once your plan expires. Renew at any time to restore access instantly.' },
  { q: 'Is there a refund policy?', a: 'We offer a 24-hour refund window for unresolvable technical issues. Contact support within 24 hours of purchase.' }
];

// Plan tier ranking (for upgrade/downgrade detection + proration)
const PR_TIER = { free: 0, basic: 1, standard: 2, premium: 3, ultimate: 4 };
let _prUserPlan = null; // { plan, plan_expires_at, plan_started_at }

async function prLoadUserPlanInfo() {
  if (!userToken) { _prUserPlan = null; return; }
  try {
    const prof = await api('/api/user/profile');
    _prUserPlan = { plan: prof.plan, plan_expires_at: prof.plan_expires_at, plan_started_at: prof.plan_started_at };
  } catch { _prUserPlan = null; }
}

// Proration: unused value of the current plan credited toward the target plan.
// Returns { credit, pay, remDays, curName } in the active currency, or null.
function _prProration(targetPlan) {
  if (!_prUserPlan || !_prUserPlan.plan || _prUserPlan.plan === 'free') return null;
  if (!_prUserPlan.plan_expires_at) return null;
  const cur = _prPlans.find(p => p.plan_key === _prUserPlan.plan);
  if (!cur) return null;
  const curPrice = _prCurrency === 'INR' ? cur.price_inr : cur.price_usd;
  const tgtPrice = _prCurrency === 'INR' ? targetPlan.price_inr : targetPlan.price_usd;
  const now = Date.now();
  const exp = new Date(_prUserPlan.plan_expires_at).getTime();
  const remMs = exp - now;
  if (remMs <= 0) return null;
  const start = _prUserPlan.plan_started_at ? new Date(_prUserPlan.plan_started_at).getTime() : null;
  const totalMs = (start && exp > start) ? (exp - start) : 30 * 86400000;
  const ratio = Math.max(0, Math.min(1, remMs / totalMs));
  const credit = curPrice * ratio;
  const pay = Math.max(0, tgtPrice - credit);
  return { credit, pay, remDays: Math.ceil(remMs / 86400000), curName: cur.name };
}

// Plan CTA clicked — opens Razorpay payment modal (INR) or Stripe (USD, coming soon)
// Plan CTA clicked — opens the premium Secure Checkout modal (checkout.js)
function prChoosePlan(planKey, planName) {
  if (!currentUser) { openAuthModal(); return; }
  const plan = _prPlans.find(p => p.plan_key === planKey);
  if (!plan) { showPage('tools'); return; }
  if (planKey === 'free' || !plan.price_inr) { showPage('tools'); return; }
  coOpen(planKey, planName || plan.name, _prPeriod);   // open checkout on the selected period
}

// Monthly / Yearly plan-group tab
function _prPositionPeriodInd() {
  const tabs = document.getElementById('prPeriodTabs');
  if (!tabs) return;
  tabs.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('on', b.dataset.period === _prPeriod));
  const ind = document.getElementById('prPeriodInd');
  const active = tabs.querySelector('[data-period].on');
  if (ind && active && active.offsetWidth) { ind.style.width = active.offsetWidth + 'px'; ind.style.transform = 'translateX(' + (active.offsetLeft - 4) + 'px)'; }
}
function prSetPeriod(period) {
  _prPeriod = (period === 'yearly') ? 'yearly' : 'monthly';
  _prPositionPeriodInd();
  prRenderPlans();
}

// Period-aware price for a plan in the active currency. Yearly uses the admin's
// explicit yearly price when set (>0); else auto = monthly × 12 × (1 − 20%).
function _prPlanPricing(p) {
  const inr = _prCurrency === 'INR';
  const monthly = inr ? (p.price_inr || 0) : (p.price_usd || 0);
  if (_prPeriod !== 'yearly') return { price: monthly, per: '/month', off: 0, monthlyEquiv: monthly };
  const explicit = inr ? (p.price_inr_yearly || 0) : (p.price_usd_yearly || 0);
  const yearly = explicit > 0 ? explicit : Math.round(monthly * 12 * 0.8 * 100) / 100;
  const gross = monthly * 12;
  const off = gross > 0 ? Math.max(0, Math.round((1 - yearly / gross) * 100)) : 0;
  return { price: yearly, per: '/year', off, monthlyEquiv: yearly / 12 };
}

// Buy a single tool à-la-carte → opens the same checkout modal as plans
function prBuyTool(indId) {
  if (!currentUser) { openAuthModal(); return; }
  if (typeof coOpenTool === 'function') coOpenTool(indId);
}

async function prLoadPricing() {
  // Always sync toggle button active state on every open (even if already loaded)
  _prCurrency = localStorage.getItem('gt_currency') || 'USD';
  const btnINR = document.getElementById('prBtnINR');
  const btnUSD = document.getElementById('prBtnUSD');
  if (btnINR) btnINR.classList.toggle('active', _prCurrency === 'INR');
  if (btnUSD) btnUSD.classList.toggle('active', _prCurrency === 'USD');

  await prLoadUserPlanInfo(); // know the user's current plan + expiry before rendering buttons

  if (_prLoaded) {
    // Already have data — just re-render with correct currency
    prRenderPlans();
    prRenderInd();
    prLoadUserCredits();
    prfRender();
    requestAnimationFrame(_prPositionPeriodInd);
    return;
  }
  try {
    const data = await api('/api/pricing');
    _prPlans = data.plans || [];
    _prIndTools = data.individualTools || [];
    _prIndFiltered = [..._prIndTools];
    _prLoaded = true;
    prfBuild(); prfRender();
    prRenderPlans();
    prRenderInd();
    prRenderFaq();
    prLoadUserCredits();
    requestAnimationFrame(_prPositionPeriodInd);
  } catch (e) {
    const g = document.getElementById('prPlansGrid');
    if (g) g.innerHTML = '<div class="plans-empty-state">Failed to load pricing. Please refresh.</div>';
  }
}

async function prLoadUserCredits() {
  const el = document.getElementById('prUserCredits');
  if (!el || !userToken) { if (el) el.style.display = 'none'; return; }
  try {
    const d = await api('/api/user/credits');
    const planAlloc = d.plan_allocation || 0;
    const balance   = d.balance || 0;
    const used      = d.used || 0;
    const pct = planAlloc > 0 ? Math.min(100, Math.round((used / planAlloc) * 100)) : 0;
    el.style.display = '';
    el.innerHTML = `
      <div class="pr-user-cr-inner">
        <div class="pr-user-cr-left">
          <i class="fas fa-coins" style="color:#f59e0b;font-size:18px"></i>
          <div>
            <div class="pr-user-cr-label">Your GT Credits</div>
            <div class="pr-user-cr-bal">${balance.toLocaleString()} <span>credits available</span></div>
          </div>
        </div>
        <div class="pr-user-cr-right">
          <div class="pr-user-cr-stat"><span>${planAlloc.toLocaleString()}</span> included with ${(d.plan || 'free').charAt(0).toUpperCase()+(d.plan||'free').slice(1)}</div>
          <div class="pr-user-cr-stat"><span>${used.toLocaleString()}</span> used</div>
          ${planAlloc > 0 ? `
            <div class="pr-user-cr-bar-wrap">
              <div class="pr-user-cr-bar"><div class="pr-user-cr-bar-fill" style="width:${pct}%"></div></div>
              <span>${pct}% used</span>
            </div>` : ''}
        </div>
      </div>`;
  } catch { if (el) el.style.display = 'none'; }
}

function prSetCurrency(cur) {
  _prCurrency = cur;
  localStorage.setItem('gt_currency', cur);
  const btnINR = document.getElementById('prBtnINR');
  const btnUSD = document.getElementById('prBtnUSD');
  if (btnINR) btnINR.classList.toggle('active', cur === 'INR');
  if (btnUSD) btnUSD.classList.toggle('active', cur === 'USD');
  prRenderPlans();
  prRenderInd();
  prfRenderReco();
}

function _prInit(name){ return String(name||'').replace(/[^A-Za-z0-9 ]/g,'').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '•'; }
function _prColor(i){ return ['#8b5cf6','#ec4899','#f59e0b','#06b6d4','#10b981','#ef4444','#3b82f6','#a855f7'][i%8]; }

function prRenderPlans() {
  const grid = document.getElementById('prPlansGrid');
  if (!grid) return;
  if (!_prPlans.length) {
    grid.innerHTML = '<div class="plans-empty-state"><i class="fas fa-spinner fa-spin fa-lg"></i></div>';
    return;
  }
  const sym = _prCurrency === 'INR' ? '₹' : '$';

  // No Free card — a signed-up non-buyer is obviously on free.
  const plans = _prPlans.filter(p => p.plan_key && p.plan_key !== 'free')
                        .sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));

  const loggedIn = !!(typeof currentUser !== 'undefined' && currentUser);
  const userPlanKey = _prUserPlan ? _prUserPlan.plan : (loggedIn && currentUser ? currentUser.plan : null);
  const onPaid = userPlanKey && userPlanKey !== 'free';

  // Yearly tab badge → the biggest real discount across plans (kept accurate as
  // admin edits yearly prices).
  const yearlyOff = p => {
    const inr = _prCurrency === 'INR';
    const m = inr ? (p.price_inr || 0) : (p.price_usd || 0);
    const ex = inr ? (p.price_inr_yearly || 0) : (p.price_usd_yearly || 0);
    const y = ex > 0 ? ex : m * 12 * 0.8;
    return m > 0 ? Math.max(0, Math.round((1 - y / (m * 12)) * 100)) : 0;
  };
  const maxOff = plans.reduce((mx, p) => Math.max(mx, yearlyOff(p)), 0);
  const saveBadge = document.querySelector('#prPeriodTabs .pv-save');
  if (saveBadge) saveBadge.textContent = maxOff > 0 ? 'SAVE ' + maxOff + '%' : 'SAVE';

  grid.innerHTML = plans.map(p => {
    const ai   = PR_PLAN_AI[p.plan_key] || {};
    const pr   = _prPlanPricing(p);
    const hot  = !!p.is_featured;
    const tier = hot ? 'pv-hot' : (p.plan_key === 'standard' ? 'pv-t-standard' : p.plan_key === 'ultimate' ? 'pv-t-top' : 'pv-t-basic');
    // Yearly grants a year's worth of credits (×12) — matches the webhook grant.
    const credits = (ai.credits || 0) * (_prPeriod === 'yearly' ? 12 : 1);

    // price block (period-aware)
    const offChip = pr.off > 0 ? `<span class="pv-off">${pr.off}% off</span>` : '';
    const priceHtml = `<div class="pv-price"><div class="pv-was">${offChip}</div>
      <div class="pv-amt"><span class="pv-v">${sym}${_prFmt(pr.price)}</span><span class="pv-u">${pr.per}</span></div></div>`;

    // credits row (led) with count-up
    const credHtml = `<div class="pv-cred"><span class="pv-coin"><i class="fas fa-coins"></i></span>
      <div><div class="pv-crn" data-count="${credits}">${credits.toLocaleString()}</div>
      <div class="pv-crl">GT credits${_prPeriod === 'yearly' ? ' / year' : ' / month'} · top up anytime</div></div></div>`;

    // latest AI models (run with credits)
    const modelsHtml = (ai.models || []).length ? `<div class="pv-models"><div class="pv-sech">The latest AI models <span class="pv-tag">run with credits</span></div>
      <div class="pv-pills">${(ai.models || []).map(m => `<span class="pv-mp${m.hot ? ' star' : ''}">${escapeHtml(m.name)}${m.hot ? ' <span class="s">★</span>' : ''}</span>`).join('')}</div></div>` : '';

    // included free every day — the limits rail
    const row = (icon, label, val, inf) => `<div class="pv-lim"><span class="pv-lic"><i class="fas ${icon}"></i></span><span class="pv-lb">${label}</span><span class="pv-vl${inf ? ' inf' : ''}">${inf ? '∞' : val}</span></div>`;
    const railHtml = (ai.image !== undefined) ? `<div class="pv-freepill"><i class="fas fa-check"></i> Included free every day</div>
      <div class="pv-limits">
        ${row('fa-image', 'Images', ai.image + '<i>/day</i>')}
        ${row('fa-video', 'Videos', ai.video + '<i>/day</i>')}
        ${row('fa-microphone', 'Audio', ai.audio + '<i>/day</i>')}
        ${row('fa-scissors', 'BG removal', ai.bg === -1 ? '∞' : ai.bg + '<i>/day</i>', ai.bg === -1)}
      </div>` : '';

    // clarity callout
    const legendHtml = `<div class="pv-legend"><i class="fas fa-circle-info pv-lic2"></i>
      <span><b class="fr">Free usage refills every day.</b> Out of <b class="cr">GT credits</b>? <b class="cr">Top up anytime</b> to keep going. <span class="inf">∞</span> = <b class="fr">never runs out</b>.</span></div>`;

    // shared tools bar → opens the included-tools modal. People were reading
    // "N shared tools" as a fact and not realising they can open the list, so
    // the copy now says "tap to see all" and the featured plan gets a
    // hand-drawn doodle pointing at it as a one-off guide for the whole page.
    const toolCount = p.tool_count || (p.tools || []).length || 0;
    const avs = (p.tools || []).slice(0, 5).map((t, i) => `<span class="pv-av" style="background:${_prColor(i)}">${_prInit(t.name)}</span>`).join('');
    const peek = (toolCount > 0) ? `<div class="pv-peek">
      <svg class="pv-doodle" viewBox="0 0 96 50" aria-hidden="true"><path d="M18 7 C 40 1, 44 21, 29 23 C 18 24, 23 10, 39 13 C 57 16, 62 32, 60 44"/><path d="M51 35 L60 46 L69 35"/></svg>
      <span>see what's inside 👇</span></div>` : '';
    const toolsBar = toolCount > 0 ? `${peek}<button class="pv-toolsbar" onclick="prOpenModal(${p.id}, '${escapeHtml(p.name)}')" title="Tap to see every tool in ${escapeHtml(p.name)}">
      <div class="pv-avs">${avs}</div><div class="pv-tx"><b>${toolCount}</b> tools inside · <span class="pv-tap">tap to see all</span></div><span class="pv-ar">→</span></button>` : '';

    // CTA (period-aware; proration only on monthly)
    const onClick = `onclick="prChoosePlan('${p.plan_key}','${escapeHtml(p.name)}')"`;
    let btnHtml, prNote = '';
    if (_prPeriod === 'monthly' && userPlanKey && userPlanKey === p.plan_key) {
      btnHtml = `<button class="pv-cta pv-cta-current" disabled><i class="fas fa-circle-check"></i> Current plan</button>`;
    } else if (_prPeriod === 'monthly' && onPaid) {
      const isUpgrade = (PR_TIER[p.plan_key] ?? 0) > (PR_TIER[userPlanKey] ?? 0);
      if (isUpgrade) {
        const prr = _prProration(p);
        if (prr && prr.credit > 0.5) {
          btnHtml = `<button class="pv-cta pv-cta-primary" ${onClick}><i class="fas fa-arrow-up"></i> Upgrade · ${sym}${_prFmt(Math.round(prr.pay))}</button>`;
          prNote = `<div class="pv-pronote"><i class="fas fa-gift"></i> ${sym}${_prFmt(Math.round(prr.credit))} credited from your plan (${prr.remDays}d left)</div>`;
        } else {
          btnHtml = `<button class="pv-cta pv-cta-primary" ${onClick}><i class="fas fa-arrow-up"></i> Upgrade now</button>`;
        }
      } else {
        btnHtml = `<button class="pv-cta pv-cta-locked" disabled><i class="fas fa-clock"></i> Switch when plan ends</button>`;
      }
    } else {
      btnHtml = `<button class="pv-cta${hot ? ' pv-cta-primary' : ''}" ${onClick}>${_prPeriod === 'yearly' ? 'Get yearly' : 'Subscribe'}</button>`;
    }

    return `<div class="pv-card ${tier}">
      <div class="pv-top"><span class="pv-name">${escapeHtml(p.name)}</span>${hot ? `<span class="pv-badge">${escapeHtml(p.badge || 'Popular')}</span>` : (p.badge ? `<span class="pv-badge pv-badge-q">${escapeHtml(p.badge)}</span>` : '')}</div>
      ${priceHtml}
      ${credHtml}
      ${btnHtml}${prNote}
      ${modelsHtml}
      ${railHtml}
      ${legendHtml}
      ${toolsBar}
      <div class="pv-foot">1 device · billed ${_prPeriod === 'yearly' ? 'yearly · price locked' : 'monthly'}</div>
    </div>`;
  }).join('');

  prRenderCreditsPanel();
  prAnimateCredits();
  return;
}

// subtle count-up on each card's GT-credit number
function prAnimateCredits() {
  const els = document.querySelectorAll('#prPlansGrid .pv-crn[data-count]');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  els.forEach(el => {
    const target = +el.dataset.count || 0;
    if (reduce || target <= 0) { el.textContent = target.toLocaleString(); return; }
    let t0 = null;
    const step = ts => { if (!t0) t0 = ts; const k = Math.min(1, (ts - t0) / 750); const e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * e).toLocaleString(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

// Buy GT Credits panel (below the plans)
function prBuyPack(idx) { _prSelectedPackIdx = idx; prBuyCredits(); }
function prRenderCreditsPanel() {
  const wrap = document.getElementById('prCreditsPanel');
  if (!wrap) return;
  const sym = _prCurrency === 'INR' ? '₹' : '$';
  wrap.innerHTML = `<div class="pv-credhead"><h2>Need more AI? Top up GT credits.</h2>
    <p>Credits run the premium models like <b>Kling&nbsp;3.0</b> &amp; <b>Sora&nbsp;2</b>. They never expire, stack on any plan, and work on every model.</p></div>
    <div class="pv-cgrid">${PR_CREDIT_PACKS.map((k, i) => {
      const price = _prCurrency === 'INR' ? k.price_inr : k.price_usd;
      const pstr = (typeof price === 'number' && price % 1 !== 0) ? price.toFixed(2) : price;
      return `<div class="pv-pack${k.popular ? ' pop' : ''}">
        <div class="pv-pk-n">${k.name}${k.popular ? '<span class="pv-pk-tag">Best value</span>' : ''}</div>
        <div class="pv-pk-c"><span class="big">${k.credits.toLocaleString()}</span><span class="cr">credits</span></div>
        <div class="pv-pk-note">${escapeHtml(k.note || '')}</div>
        <div class="pv-pk-p">${sym}${pstr} <small>one-time</small></div>
        <button class="pv-pk-buy" onclick="prBuyPack(${i})">Buy credits</button>
      </div>`;
    }).join('')}</div>`;
}

// (legacy renderer kept for safety; unused by the new layout)
function _prRenderPlansOld() {
  const grid = document.getElementById('prPlansGrid');
  if (!grid) return;
  const sym = _prCurrency === 'INR' ? '₹' : '$';
  const gstNote = _prCurrency === 'INR' ? '+ GST' : '';

  // Sort by sort_order ascending (Basic=1, Premium=2, Standard=3, AI Studio=4, Premium Team=5, Free=6)
  const sorted = [..._prPlans].sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));

  const sym2 = sym;
  // Build GT Credits card — interactive pack selector
  const defaultPack = PR_CREDIT_PACKS.find(p => p.popular) || PR_CREDIT_PACKS[1];
  const creditsCardHtml = `<div class="pln-card pln-credits-card" id="plnCreditsCard">
    <div class="pln-popular-banner" style="background:linear-gradient(90deg,#f59e0b,#f97316,#f59e0b)">
      <i class="fas fa-coins"></i> GT Credits
    </div>
    <div class="pln-name-row">
      <span class="pln-name">Buy GT Credits</span>
    </div>
    <div class="pln-desc" style="margin-bottom:14px">Top up anytime. Use on <strong>Seedance</strong>, <strong>Kling 3.0</strong>, <strong>Sora 2</strong>, <strong>Veo 3.1</strong> & more. Never expire.</div>

    <div class="pln-cr-selector">
      ${PR_CREDIT_PACKS.map((pack, i) => {
        const price = _prCurrency === 'INR' ? pack.price_inr : pack.price_usd;
        const priceStr = typeof price === 'number' && price % 1 !== 0 ? price.toFixed(2) : price;
        const isSelected = pack.popular;
        return `<label class="pln-cr-option${isSelected ? ' selected' : ''}" onclick="prSelectCreditPack(${i})">
          <input type="radio" name="crPack" value="${i}" ${isSelected ? 'checked' : ''} style="display:none">
          <div class="pln-cr-opt-left">
            <i class="fas ${pack.icon}" style="color:${pack.popular ? 'var(--accent)' : '#f59e0b'};width:14px;font-size:12px"></i>
            <div>
              <div class="pln-cr-opt-name">${pack.name} ${pack.popular ? '<span class="pln-cr-best-tag">Best Value</span>' : ''}</div>
              <div class="pln-cr-opt-note">${pack.note}</div>
            </div>
          </div>
          <div class="pln-cr-opt-right">
            <span class="pln-cr-opt-credits">${pack.credits.toLocaleString()}<span> cr</span></span>
            <span class="pln-cr-opt-price">${sym2}${priceStr}</span>
          </div>
        </label>`;
      }).join('')}
    </div>

    <div class="pln-cr-summary" id="plnCrSummary">
      <span id="plnCrSumCredits">${defaultPack.credits.toLocaleString()} credits</span>
      <span class="pln-cr-sum-arrow">→</span>
      <span id="plnCrSumPrice" style="color:#f59e0b;font-weight:800">${sym2}${_prCurrency === 'INR' ? defaultPack.price_inr : defaultPack.price_usd}</span>
    </div>

    <div class="pln-actions" style="margin-top:12px">
      <button class="pln-btn-primary" style="background:linear-gradient(135deg,#f59e0b,#f97316);border:none" onclick="prBuyCredits()">
        <i class="fas fa-coins"></i> Buy Credits
      </button>
    </div>
    <div style="font-size:11px;color:var(--text-3);text-align:center;margin-top:10px">
      <i class="fas fa-shield-halved" style="color:var(--accent)"></i> Requires active plan · Credits never expire
    </div>
  </div>`;

  grid.innerHTML = sorted.map(p => {

    const price    = _prCurrency === 'INR' ? p.price_inr : p.price_usd;
    const isFree   = p.plan_key === 'free' || price === 0;
    const borderCl = p.border_color ? `pln-border-${p.border_color}` : '';
    const featCl   = p.is_featured ? 'featured' : '';
    const ai       = PR_PLAN_AI[p.plan_key] || {};

    // Badge
    const badgeHtml = p.badge
      ? `<span class="pln-badge ${p.badge_style || 'custom'}">${escapeHtml(p.badge)}</span>` : '';

    // GT Credits badge
    const creditsHtml = ai.credits > 0
      ? `<div class="pln-credits-badge"><i class="fas fa-coins"></i> ${ai.credits.toLocaleString()} GT Credits included</div>`
      : '';

    // Daily limits strip
    const limitsHtml = !isFree && ai.image !== undefined ? `
      <div class="pln-limits-strip">
        <div class="pln-limit-item"><i class="fas fa-image"></i> ${ai.image}/day images</div>
        <div class="pln-limit-item"><i class="fas fa-video"></i> ${ai.video}/day videos</div>
        <div class="pln-limit-item"><i class="fas fa-microphone"></i> ${ai.audio}/day audio</div>
        <div class="pln-limit-item"><i class="fas fa-scissors"></i> ${ai.bg === -1 ? '∞' : ai.bg+'/day'} BG removal</div>
      </div>` : '';

    // Model pills
    const modelsHtml = (ai.models || []).length > 0 ? `
      <div class="pln-model-pills">
        ${(ai.models || []).map(m =>
          `<span class="pln-model-pill${m.hot ? ' hot' : ''}" title="${m.tag}">
            <i class="fas ${m.tag === 'Video' ? 'fa-video' : m.tag === 'Audio' ? 'fa-microphone' : m.tag === 'All' ? 'fa-wand-magic-sparkles' : 'fa-image'}"></i>
            ${escapeHtml(m.name)}${m.hot ? ' ⭐' : ''}
          </span>`
        ).join('')}
      </div>` : '';

    // Feature list
    const featsHtml = (p.features || []).map(f =>
      `<li class="pln-feat-item ${f.is_included ? 'included' : 'excluded'}">
        <i class="fas ${f.is_included ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
        <span>${escapeHtml(f.feature_text)}</span>
      </li>`
    ).join('');

    // ── Pillar 1: Premium Tools (the reliable core) ──
    const toolCount = p.tool_count || (p.tools || []).length || 0;
    const toolChips = (p.tools || []).slice(0, 4).map(t =>
      `<span class="pln-tool-chip">${escapeHtml(t.name)}</span>`).join('');
    const toolsPillarHtml = `
      <div class="pln-pillar">
        <div class="pln-pl-head tools"><i class="fas fa-palette"></i> ${toolCount > 0 ? toolCount + '+ Premium Tools' : (isFree ? 'Free Tools' : 'Premium Tools')}</div>
        ${toolChips ? `<div class="pln-pl-chips">${toolChips}</div>` : ''}
        <button class="pln-view-btn" onclick="prOpenModal(${p.id}, '${escapeHtml(p.name)}')"><i class="fas fa-layer-group"></i> View Included Tools</button>
      </div>`;

    // ── Pillar 2: AI Included (keeps the original GT credits badge) ──
    const aiHasContent = (ai.credits > 0) || (ai.models || []).length > 0 || (!isFree && ai.image !== undefined);
    const aiPillarHtml = `
      <div class="pln-pillar ai">
        <div class="pln-pl-head aih"><i class="fas fa-wand-magic-sparkles"></i> AI Included</div>
        ${aiHasContent ? `${creditsHtml}${modelsHtml}${limitsHtml}` : `<div class="pln-ai-note">Limited free AI — upgrade to unlock credits &amp; premium models</div>`}
      </div>`;

    // CTA button — current plan / upgrade (prorated) / downgrade / get started
    const loggedIn   = !!(typeof currentUser !== 'undefined' && currentUser);
    const userPlanKey = _prUserPlan ? _prUserPlan.plan : (loggedIn && currentUser ? currentUser.plan : null);
    const onPaid     = userPlanKey && userPlanKey !== 'free';
    let btnHtml = '', prorationNote = '';
    const onClick = `onclick="prChoosePlan('${p.plan_key}','${escapeHtml(p.name)}')"`;

    if (userPlanKey && userPlanKey === p.plan_key) {
      btnHtml = `<button class="pln-btn-current" disabled><i class="fas fa-circle-check"></i> Current Plan</button>`;
    } else if (onPaid) {
      const isUpgrade = (PR_TIER[p.plan_key] ?? 0) > (PR_TIER[userPlanKey] ?? 0);
      if (isUpgrade && !isFree) {
        const pr = _prProration(p);
        if (pr && pr.credit > 0.5) {
          btnHtml = `<button class="pln-btn-primary" ${onClick}><i class="fas fa-arrow-up"></i> Upgrade · ${sym}${_prFmt(Math.round(pr.pay))}</button>`;
          prorationNote = `<div class="pln-proration"><i class="fas fa-gift"></i> ${sym}${_prFmt(Math.round(pr.credit))} credited from your current plan (${pr.remDays} days left)</div>`;
        } else {
          btnHtml = `<button class="pln-btn-primary" ${onClick}><i class="fas fa-arrow-up"></i> Upgrade Now</button>`;
        }
      } else {
        // Lower / lateral tier than the current paid plan — no mid-cycle downgrade.
        // Soft, dateless label: they can move to it once the current plan ends.
        btnHtml = `<button class="pln-btn-locked" disabled><i class="fas fa-clock"></i> Switch when current plan ends</button>`;
      }
    } else if (isFree) {
      btnHtml = loggedIn
        ? `<button class="pln-btn-current" disabled><i class="fas fa-circle-check"></i> Current Plan</button>`
        : `<button class="pln-btn-outline" onclick="prChoosePlan('free','Free')">${escapeHtml(p.button_text || 'Start Free')}</button>`;
    } else {
      btnHtml = `<button class="pln-btn-primary" ${onClick}><i class="fas fa-bolt"></i> Purchase Now</button>`;
    }

    return `<div class="pln-card ${featCl} ${borderCl}">
      ${p.is_featured ? `<div class="pln-popular-banner"><i class="fas fa-star"></i> Most Popular</div>` : ''}
      <div class="pln-name-row">
        <span class="pln-name">${escapeHtml(p.name)}</span>
        ${badgeHtml}
      </div>
      <div class="pln-price-row">
        <span class="pln-currency">${sym}</span>
        <span class="pln-amount">${isFree ? 'Free' : _prFmt(price)}</span>
        ${!isFree ? `<span class="pln-period">/month</span>` : ''}
      </div>
      ${!isFree && gstNote ? `<div class="pln-gst">${gstNote}</div>` : ''}
      ${p.description ? `<div class="pln-desc">${escapeHtml(p.description)}</div>` : ''}
      ${toolsPillarHtml}
      ${aiPillarHtml}
      ${featsHtml ? `<div class="pln-divider"></div><ul class="pln-feats">${featsHtml}</ul>` : ''}
      <div class="pln-actions">
        ${btnHtml}
        ${prorationNote}
      </div>
    </div>`;
  }).join('') + creditsCardHtml;
}

// ── Credits card interaction ──────────────────────────────────────────────────
let _prSelectedPackIdx = PR_CREDIT_PACKS.findIndex(p => p.popular) || 1;

function prSelectCreditPack(idx) {
  _prSelectedPackIdx = idx;
  const pack = PR_CREDIT_PACKS[idx];
  if (!pack) return;
  const sym = _prCurrency === 'INR' ? '₹' : '$';
  const price = _prCurrency === 'INR' ? pack.price_inr : pack.price_usd;
  const priceStr = typeof price === 'number' && price % 1 !== 0 ? price.toFixed(2) : price;

  // Update selected state
  document.querySelectorAll('.pln-cr-option').forEach((el, i) => el.classList.toggle('selected', i === idx));

  // Update summary
  const sumCredits = document.getElementById('plnCrSumCredits');
  const sumPrice   = document.getElementById('plnCrSumPrice');
  if (sumCredits) sumCredits.textContent = pack.credits.toLocaleString() + ' credits';
  if (sumPrice)   sumPrice.textContent   = sym + priceStr;
}

async function prBuyCredits() {
  if (!currentUser) { openAuthModal(); return; }
  const pack = PR_CREDIT_PACKS[_prSelectedPackIdx];
  if (!pack) return;

  // Map the selected pack to its DB id, then open the unified secure checkout
  // (billing auto-fill + Razorpay INR / Stripe USD — same as plan purchases).
  const btn = document.querySelector('#plnCreditsCard .pln-btn-primary');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading…'; }
  try {
    const dbPacks = await api('/api/payment/credit-packs');
    const dbPack = dbPacks.find(p => p.credits === pack.credits && Math.round(p.price_inr) === Math.round(pack.price_inr))
                || dbPacks[_prSelectedPackIdx];
    if (!dbPack) { toast('Credit pack unavailable', 'error'); return; }
    coOpenCredits(dbPack.id);
  } catch (err) {
    toast('Could not load credit packs', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = orig; }
  }
}

// ── GT Credits Packs ──────────────────────────────────────────────────────────
function prRenderCredits() {
  const wrap = document.getElementById('prCreditsGrid');
  if (!wrap) return;
  const sym = _prCurrency === 'INR' ? '₹' : '$';

  wrap.innerHTML = PR_CREDIT_PACKS.map(pack => {
    const price = _prCurrency === 'INR' ? pack.price_inr : pack.price_usd;
    return `<div class="cr-pack${pack.popular ? ' cr-pack-popular' : ''}">
      ${pack.popular ? `<div class="cr-pack-best">Best Value</div>` : ''}
      <div class="cr-pack-icon"><i class="fas ${pack.icon}"></i></div>
      <div class="cr-pack-name">${pack.name}</div>
      <div class="cr-pack-credits"><span class="cr-pack-num">${pack.credits.toLocaleString()}</span> credits</div>
      <div class="cr-pack-price">${sym}${typeof price === 'number' && price % 1 !== 0 ? price.toFixed(2) : price}</div>
      <div class="cr-pack-note">${pack.note}</div>
      <button class="cr-pack-btn" onclick="showPage('tools')">Buy Credits</button>
    </div>`;
  }).join('');
}

function _prFmt(val) {
  const n = Number(val) || 0;
  return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function prFilterInd() {
  const q = (document.getElementById('prIndSearch')?.value || '').toLowerCase().trim();
  _prIndFiltered = q
    ? _prIndTools.filter(t => {
        const name = (t.custom_name || t.tool_name || '').toLowerCase();
        const desc = (t.custom_description || t.tool_description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      })
    : [..._prIndTools];
  _prIndPage = 0;
  prRenderInd();
}

function prRenderInd() {
  const grid = document.getElementById('prIndGrid');
  const pagination = document.getElementById('prIndPagination');
  if (!grid) return;

  if (!_prIndFiltered.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-3)"><i class="fas fa-search" style="font-size:24px;display:block;margin-bottom:8px"></i>No tools found.</div>';
    if (pagination) pagination.style.display = 'none';
    return;
  }

  const totalPages = Math.ceil(_prIndFiltered.length / PR_PER_PAGE);
  const start = _prIndPage * PR_PER_PAGE;
  const slice = _prIndFiltered.slice(start, start + PR_PER_PAGE);
  const sym = _prCurrency === 'INR' ? '₹' : '$';

  grid.innerHTML = slice.map(t => {
    const name = t.custom_name || t.tool_name || 'Tool';
    const desc = t.custom_description || t.tool_description || '';
    const logo = t.custom_logo_url || t.tool_logo_url || '';
    const price = _prCurrency === 'INR' ? t.price_inr : t.price_usd;

    return `<div class="ind-tool-card">
      <div class="ind-card-banner">
        <div class="ind-card-brand">
          <div class="ind-card-brand-dot">G</div> GraphicoToolz
        </div>
        <div class="ind-card-badge-pill">
          <i class="fas fa-clock"></i> ${escapeHtml(t.badge_text || '30-day access')}
        </div>
        ${logo
          ? `<img class="ind-card-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(name)}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
          : ''}
        <span class="ind-card-logo-fallback" ${logo ? 'style="display:none"' : ''}>
          <i class="fas fa-toolbox"></i>
        </span>
      </div>
      <div class="ind-card-body">
        <div class="ind-card-name">${escapeHtml(name)}</div>
        ${desc ? `<div class="ind-card-desc">${escapeHtml(desc)}</div>` : ''}
        <button class="ind-card-buy-btn" onclick="prBuyTool(${t.id})">
          <i class="fas fa-shopping-cart"></i> ${sym}${_prFmt(price)}
        </button>
      </div>
    </div>`;
  }).join('');

  if (pagination) {
    pagination.style.display = 'flex';
    const info = document.getElementById('prIndInfo');
    if (info) info.textContent = `Showing ${start + 1}–${Math.min(start + PR_PER_PAGE, _prIndFiltered.length)} of ${_prIndFiltered.length} tools`;
    const prev = document.getElementById('prIndPrev');
    const next = document.getElementById('prIndNext');
    if (prev) prev.disabled = _prIndPage === 0;
    if (next) next.disabled = _prIndPage >= totalPages - 1;
  }
}

function prIndPageNav(dir) {
  const totalPages = Math.ceil(_prIndFiltered.length / PR_PER_PAGE);
  _prIndPage = Math.max(0, Math.min(_prIndPage + dir, totalPages - 1));
  prRenderInd();
}

function prRenderFaq() {
  const list = document.getElementById('prFaqList');
  if (!list) return;
  list.innerHTML = PR_FAQS.map(f =>
    `<div class="faq-acc" onclick="this.classList.toggle('open')">
      <button class="faq-acc-q">${escapeHtml(f.q)}<i class="fas fa-chevron-down"></i></button>
      <div class="faq-acc-a"><p>${escapeHtml(f.a)}</p></div>
    </div>`
  ).join('');
}

// ── Modal state ──────────────────────────────────────────────────────────────
let _prModalTools = [];        // all tools for current plan
let _prModalFiltered = [];     // after search + category filter
let _prModalCat = 'all';       // active category filter

function prOpenModal(planId, planName) {
  const plan = _prPlans.find(p => p.id === planId);
  if (!plan) return;

  // Set title + subtitle
  document.getElementById('plnToolsModalTitle').textContent = `Tools included in ${planName}`;

  // Store tools for this plan
  _prModalTools = plan.tools || [];
  _prModalCat = 'all';
  document.getElementById('plnToolSearch').value = '';
  document.getElementById('plnToolSort').value = 'featured';

  _prBuildCategoryPills();
  _prApplyModalFilter();

  document.getElementById('plnToolsOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function prCloseModal() {
  document.getElementById('plnToolsOverlay').classList.remove('open');
  document.body.style.overflow = '';
  _prHideInfoTooltip();
}

function _prBuildCategoryPills() {
  const catMap = {};
  _prModalTools.forEach(t => {
    const cat = t.category_name || 'Other';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const total = _prModalTools.length;

  const wrap = document.getElementById('plnModalCats');
  wrap.innerHTML = `<button class="pln-cat-pill active" data-cat="all" onclick="prSetModalCat('all',this)">All (${total})</button>`
    + cats.map(([name, count]) =>
        `<button class="pln-cat-pill" data-cat="${escapeHtml(name)}" onclick="prSetModalCat('${escapeHtml(name)}',this)">${escapeHtml(name)} (${count})</button>`
      ).join('');
}

function prSetModalCat(cat, btn) {
  _prModalCat = cat;
  document.querySelectorAll('.pln-cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _prApplyModalFilter();
}

function prFilterModalTools() {
  _prApplyModalFilter();
}

function prSortModalTools() {
  _prApplyModalFilter();
}

function _prApplyModalFilter() {
  const q = (document.getElementById('plnToolSearch').value || '').toLowerCase();
  const sort = document.getElementById('plnToolSort').value;

  let list = _prModalTools.filter(t => {
    const catMatch = _prModalCat === 'all' || (t.category_name || 'Other') === _prModalCat;
    const qMatch = !q || t.name.toLowerCase().includes(q) || (t.category_name || '').toLowerCase().includes(q);
    return catMatch && qMatch;
  });

  if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'za') list = [...list].sort((a, b) => b.name.localeCompare(a.name));

  // Always surface AI tools first (stable sort keeps each group's order)
  const _isAI = t => (t.auth_type === 'ai_generator') ? 1 : 0;
  list = [...list].sort((a, b) => _isAI(b) - _isAI(a));

  _prModalFiltered = list;
  _prRenderModalGrid();
}

function _prRenderModalGrid() {
  const grid = document.getElementById('plnModalGrid');
  const footer = document.getElementById('plnModalFooterCount');
  const total = _prModalTools.length;
  const shown = _prModalFiltered.length;

  if (footer) footer.textContent = `${shown} tool${shown !== 1 ? 's' : ''} included • Click info icon for details`;

  if (!_prModalFiltered.length) {
    grid.innerHTML = `<div class="pln-modal-empty"><i class="fas fa-search"></i><p>No tools match your search</p></div>`;
    return;
  }

  const BADGE_COLORS = {
    NEW: 'pln-badge-new', HOT: 'pln-badge-hot', POPULAR: 'pln-badge-popular',
    PRO: 'pln-badge-pro', UNLIMITED: 'pln-badge-unlimited', BETA: 'pln-badge-beta', SOON: 'pln-badge-soon'
  };

  grid.innerHTML = _prModalFiltered.map((t, i) => {
    const logoHtml = t.logo_url
      ? `<img src="${escapeHtml(t.logo_url)}" alt="" class="pln-tool-logo" onerror="this.style.display='none'">`
      : `<div class="pln-tool-logo-fallback">${escapeHtml(t.name.charAt(0))}</div>`;
    const badgeHtml = t.badge
      ? `<span class="pln-tool-badge ${BADGE_COLORS[t.badge] || 'pln-badge-new'}">${escapeHtml(t.badge)}</span>`
      : '';
    const hasInfo = (t.info_notes && t.info_notes.trim()) || (t.info_limitations && t.info_limitations.trim());
    const hasVideo = t.demo_video_url && t.demo_video_url.trim();
    return `<div class="pln-modal-tool-card">
      <div class="pln-tool-card-left">
        ${logoHtml}
        <div class="pln-tool-card-info">
          <div class="pln-tool-card-name">${escapeHtml(t.name)}${badgeHtml}</div>
          <div class="pln-tool-card-cat">${escapeHtml(t.category_name || 'Tool')}</div>
        </div>
      </div>
      <div class="pln-tool-card-actions">
        <button class="pln-tool-action-btn pln-play-btn ${hasVideo ? '' : 'pln-info-no-data'}"
          title="${hasVideo ? 'Play demo video' : 'No demo available'}"
          onclick="${hasVideo ? `prOpenVideoPlayer(event, ${i})` : ''}" ${hasVideo ? '' : 'disabled'}>
          <i class="fas fa-play"></i>
        </button>
        <button class="pln-tool-action-btn pln-info-btn ${hasInfo ? '' : 'pln-info-no-data'}"
          title="Info" onclick="prToggleInfoTooltip(event, ${i})" ${hasInfo ? '' : 'disabled'}><i class="fas fa-circle-info"></i></button>
      </div>
    </div>`;
  }).join('');
}

// ── Info tooltip ──────────────────────────────────────────────────────────────
function prToggleInfoTooltip(e, idx) {
  e.stopPropagation();
  const tooltip = document.getElementById('plnInfoTooltip');
  const tool = _prModalFiltered[idx];
  if (!tool) return;

  // Build tooltip content
  const noteLines = (tool.info_notes || '').split('\n').map(l => l.trim()).filter(Boolean);
  const limitLines = (tool.info_limitations || '').split('\n').map(l => l.trim()).filter(Boolean);

  const notesHtml = noteLines.length
    ? `<div class="pln-tip-section"><div class="pln-tip-title"><i class="fas fa-note-sticky"></i> Notes</div>${noteLines.map(l => `<div class="pln-tip-line">${escapeHtml(l)}</div>`).join('')}</div>`
    : '';
  const limitsHtml = limitLines.length
    ? `<div class="pln-tip-section"><div class="pln-tip-title"><i class="fas fa-triangle-exclamation"></i> Limitations</div>${limitLines.map(l => `<div class="pln-tip-line">${escapeHtml(l)}</div>`).join('')}</div>`
    : '';

  if (!notesHtml && !limitsHtml) return;
  tooltip.innerHTML = notesHtml + limitsHtml;

  // Position near the clicked button
  const rect = e.currentTarget.getBoundingClientRect();
  const overlayRect = document.getElementById('plnToolsOverlay').getBoundingClientRect();
  tooltip.classList.remove('hidden');
  const tw = tooltip.offsetWidth || 260;
  let left = rect.right - overlayRect.left - tw;
  let top  = rect.bottom - overlayRect.top + 6;
  if (left < 8) left = 8;
  tooltip.style.left = left + 'px';
  tooltip.style.top  = top + 'px';
}

function _prHideInfoTooltip() {
  const t = document.getElementById('plnInfoTooltip');
  if (t) t.classList.add('hidden');
}

// Close tooltip when clicking elsewhere inside overlay
document.addEventListener('click', (e) => {
  if (!e.target.closest('.pln-info-btn')) _prHideInfoTooltip();
});

// ── Video Player ──────────────────────────────────────────────────────────────
function prOpenVideoPlayer(e, idx) {
  e.stopPropagation();
  const tool = _prModalFiltered[idx];
  if (!tool || !tool.demo_video_url) return;

  let src = tool.demo_video_url.trim();
  let embedHtml = '';

  // Convert YouTube watch URL → embed
  const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    src = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    embedHtml = `<iframe src="${src}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen class="pr-video-frame"></iframe>`;
  } else if (vimeoMatch) {
    src = `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    embedHtml = `<iframe src="${src}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen class="pr-video-frame"></iframe>`;
  } else {
    embedHtml = `<video src="${escapeHtml(src)}" controls autoplay class="pr-video-frame"></video>`;
  }

  let overlay = document.getElementById('prVideoOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'prVideoOverlay';
    overlay.className = 'pr-video-overlay';
    overlay.onclick = (ev) => { if (ev.target === overlay) prCloseVideoPlayer(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="pr-video-modal">
      <div class="pr-video-header">
        <span class="pr-video-title"><i class="fas fa-play" style="color:var(--accent);margin-right:8px"></i>${escapeHtml(tool.name)} — Demo</span>
        <button class="pr-video-close" onclick="prCloseVideoPlayer()"><i class="fas fa-times"></i></button>
      </div>
      <div class="pr-video-body">${embedHtml}</div>
    </div>`;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function prCloseVideoPlayer() {
  const overlay = document.getElementById('prVideoOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.innerHTML = ''; // stops video playback
  document.body.style.overflow = '';
}

// ============ PLAN FINDER — pick tools → cheapest plan that has them all ======
// Built entirely from _prPlans (each plan already carries its tools + category +
// price), so no extra request. The covering plans for a selection are exactly
// the plans whose tool set is a superset of the picks; the cheapest of those is
// the answer. Nested plans (Basic⊂Standard⊂Premium⊂AI Toolkit) make it exact.
let _prfSel = new Set();
let _prfCat = 'all', _prfQuery = '';
let _prfBuilt = false, _prfPlans = [], _prfTools = new Map(), _prfCats = [];

function prfBuild() {
  _prfPlans = []; _prfTools = new Map();
  (_prPlans || []).filter(p => p.plan_key && p.plan_key !== 'free').forEach(p => {
    const ids = new Set();
    (p.tools || []).forEach(t => {
      ids.add(t.tool_id);
      let rec = _prfTools.get(t.tool_id);
      if (!rec) { rec = { id: t.tool_id, name: t.name, logo: t.logo_url, cat: t.category_name || 'Other', plans: new Set() }; _prfTools.set(t.tool_id, rec); }
      rec.plans.add(p.plan_key);
    });
    _prfPlans.push({ key: p.plan_key, name: p.name, inr: p.price_inr || 0, usd: p.price_usd || 0, ids });
  });
  _prfPlans.sort((a, b) => (a.inr || 0) - (b.inr || 0));   // cheapest first
  _prfCats = [...new Set([..._prfTools.values()].map(t => t.cat))].sort();
  _prfBuilt = true;
}
const _prfPrice = pl => _prCurrency === 'INR' ? pl.inr : pl.usd;
const _prfSym = () => _prCurrency === 'INR' ? '₹' : '$';

function prfRecommend() {
  const sel = [..._prfSel];
  if (!sel.length) return null;
  const covering = _prfPlans.filter(pl => sel.every(id => pl.ids.has(id)));
  if (covering.length) return { plan: covering[0], missing: [] };   // cheapest, sorted
  // no single plan has everything → recommend the plan covering the most, flag the rest
  let best = null, bestN = -1;
  _prfPlans.forEach(pl => { const n = sel.filter(id => pl.ids.has(id)).length; if (n > bestN) { bestN = n; best = pl; } });
  return { plan: best, missing: sel.filter(id => !best.ids.has(id)) };
}

function prfToggle(id) { _prfSel.has(id) ? _prfSel.delete(id) : _prfSel.add(id); prfRenderChips(); prfRenderList(); prfRenderReco(); }
function prfClear() { _prfSel.clear(); prfRenderChips(); prfRenderList(); prfRenderReco(); }
function prfSetCat(c) { _prfCat = c; prfRenderList(); }
function prfSearch(v) { _prfQuery = (v || '').toLowerCase().trim(); prfRenderList(); }
function prfDropMissing() { const r = prfRecommend(); if (r) r.missing.forEach(id => _prfSel.delete(id)); prfRenderChips(); prfRenderList(); prfRenderReco(); }
function prfGetStarted(key) { const pl = _prfPlans.find(p => p.key === key); if (pl && typeof prChoosePlan === 'function') prChoosePlan(pl.key, pl.name); }
function prfViewInside() { const g = document.getElementById('prPlansGrid'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
// Open the real included-tools list for the recommended plan (the finder holds
// plan_key; the modal wants the plan id — map through _prPlans).
function prfViewTools(key) { const p = (_prPlans || []).find(x => x.plan_key === key); if (p && typeof prOpenModal === 'function') prOpenModal(p.id, p.name); }
function prfScrollTo() {
  const w = document.getElementById('prfWrap'); if (!w) return;
  w.scrollIntoView({ behavior: 'smooth', block: 'center' });
  w.classList.remove('prf-flash'); void w.offsetWidth; w.classList.add('prf-flash');   // brief highlight so it's obvious where you landed
  const s = document.getElementById('prfSearch'); if (s) setTimeout(() => s.focus({ preventScroll: true }), 400);
}
const _prfLogo = t => t.logo ? `<img src="${escapeHtml(t.logo)}" alt="" onerror="this.style.display='none'">` : '<span class="prf-nologo"><i class="fas fa-toolbox"></i></span>';

function prfRender() { if (!_prfBuilt) prfBuild(); prfRenderChips(); prfRenderList(); prfRenderReco(); }

function prfRenderChips() {
  const el = document.getElementById('prfChips'); if (!el) return;
  const sel = [..._prfSel];
  el.innerHTML = sel.length
    ? sel.map(id => { const t = _prfTools.get(id); return t ? `<span class="prf-chip">${_prfLogo(t)}<span>${escapeHtml(t.name)}</span><button onclick="prfToggle(${id})" aria-label="Remove ${escapeHtml(t.name)}">✕</button></span>` : ''; }).join('')
      + `<button class="prf-clear" onclick="prfClear()">Clear all</button>`
    : `<span class="prf-empty-chip"><i class="fas fa-hand-pointer"></i> No tools picked yet — tap the ones you need below</span>`;
}

function prfRenderList() {
  const listEl = document.getElementById('prfList'), tabsEl = document.getElementById('prfCats');
  if (!listEl) return;
  if (tabsEl) {
    tabsEl.innerHTML = `<button class="prf-cat${_prfCat === 'all' ? ' on' : ''}" onclick="prfSetCat('all')">All <b>${_prfTools.size}</b></button>` +
      _prfCats.map(c => {
        const n = [..._prfTools.values()].filter(t => t.cat === c).length;
        return `<button class="prf-cat${_prfCat === c ? ' on' : ''}" onclick="prfSetCat('${escapeHtml(c).replace(/'/g, "\'")}')">${escapeHtml(c)} <b>${n}</b></button>`;
      }).join('');
  }
  let items = [..._prfTools.values()];
  if (_prfCat !== 'all') items = items.filter(t => t.cat === _prfCat);
  if (_prfQuery) items = items.filter(t => t.name.toLowerCase().includes(_prfQuery));
  items.sort((a, b) => a.name.localeCompare(b.name));
  const keepScroll = listEl.scrollTop;
  listEl.innerHTML = items.length ? items.map(t => {
    const on = _prfSel.has(t.id);
    return `<button class="prf-tool${on ? ' on' : ''}" onclick="prfToggle(${t.id})">
      <span class="prf-tool-logo">${_prfLogo(t)}</span>
      <span class="prf-tool-name">${escapeHtml(t.name)}</span>
      <span class="prf-tool-add">${on ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>'}</span></button>`;
  }).join('') : `<div class="prf-noresult">No tools match that search.</div>`;
  listEl.scrollTop = keepScroll;
}

function prfRenderReco() {
  const el = document.getElementById('prfReco'); if (!el) return;
  const sym = _prfSym();
  if (!_prfSel.size) {
    el.innerHTML = `<div class="prf-reco-empty">
      <div class="prf-reco-ic"><i class="fas fa-wand-magic-sparkles"></i></div>
      <div class="prf-reco-eh">Your plan appears here</div>
      <p>Tap the tools you need and we'll point you to the cheapest plan that includes all of them.</p></div>`;
    return;
  }
  const r = prfRecommend(), pl = r.plan, price = _prfPrice(pl);
  const more = Math.max(0, pl.ids.size - _prfSel.size);
  const incLine = r.missing.length
    ? `<i class="fas fa-check"></i> Covers ${_prfSel.size - r.missing.length} of your ${_prfSel.size} picks · ${pl.ids.size} tools inside`
    : `<i class="fas fa-check"></i> Includes all ${_prfSel.size} selected · <b>+${more} more</b> inside`;
  const warn = r.missing.length
    ? `<div class="prf-reco-warn"><i class="fas fa-circle-info"></i> ${r.missing.length} pick${r.missing.length > 1 ? "s aren't" : " isn't"} in any single plan. <button onclick="prfDropMissing()">Drop ${r.missing.length > 1 ? 'them' : 'it'}</button></div>`
    : '';
  el.innerHTML = `
    <div class="prf-reco-tag"><i class="fas fa-wand-magic-sparkles"></i> Your best match</div>
    <div class="prf-reco-name">${escapeHtml(pl.name)}</div>
    <div class="prf-reco-price"><span class="prf-reco-amt">${sym}${_prFmt(price)}</span><span class="prf-reco-per">/month</span></div>
    <div class="prf-reco-inc">${incLine}</div>
    ${warn}
    <button class="prf-reco-btn" onclick="prfGetStarted('${pl.key}')">Get ${escapeHtml(pl.name)} <i class="fas fa-arrow-right"></i></button>
    <button class="prf-reco-tools" onclick="prfViewTools('${pl.key}')"><i class="fas fa-layer-group"></i> See all ${pl.ids.size} tools inside</button>`;
}
