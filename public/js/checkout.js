// ═══════════════ SECURE CHECKOUT MODAL ═══════════════
// Premium checkout: plan summary, period selector, coupon, billing, payment method.
// Server is the source of truth for all amounts — frontend only displays.

// Stripe return handler — after redirect back from Stripe Checkout
window.addEventListener('DOMContentLoaded', () => {
  const qp = new URLSearchParams(window.location.search);
  const st = qp.get('stripe');
  if (!st) return;
  // Clean the URL
  try { history.replaceState({}, '', window.location.pathname + (qp.get('page') ? '?page=' + qp.get('page') : '')); } catch {}
  if (st === 'cancel') {
    try { sessionStorage.removeItem('gt_stripe_pending'); } catch {}
    setTimeout(() => toast('Payment cancelled — you have not been charged. You can retry anytime.', 'info'), 800);
    return;
  }
  if (st === 'success') {
    // Verify the webhook actually activated the plan before claiming success.
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem('gt_stripe_pending') || 'null'); } catch {}
    try { sessionStorage.removeItem('gt_stripe_pending'); } catch {}

    // Credits purchase via Stripe — verify the balance went up before claiming success
    if (pending && pending.itemType === 'credits') {
      setTimeout(() => {
        toast('Verifying your payment…', 'info');
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const d = await api('/api/user/credits');
            if (d && typeof d.balance === 'number' && d.balance > (pending.prevCredits || 0)) {
              clearInterval(poll);
              if (typeof prLoadUserCredits === 'function') prLoadUserCredits();
              if (typeof _aigLoadCredits === 'function') _aigLoadCredits();
              toast(`🪙 ${Number(pending.credits || 0).toLocaleString()} credits added! Balance: ${Number(d.balance).toLocaleString()}`, 'success');
            }
          } catch {}
          if (attempts >= 12) { clearInterval(poll); if (typeof prLoadUserCredits === 'function') prLoadUserCredits(); toast('Payment is being verified. Your credits appear within a minute — refresh to check. If it failed, you were not charged.', 'info'); }
        }, 1500);
      }, 600);
      return;
    }

    // Individual tool purchase via Stripe — verify the tool now shows as purchased
    if (pending && pending.itemType === 'tool') {
      setTimeout(() => {
        toast('Verifying your payment…', 'info');
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const d = await api('/api/user/purchased-tools');
            if (d && Array.isArray(d.tool_ids) && pending.toolId && d.tool_ids.includes(pending.toolId)) {
              clearInterval(poll);
              if (typeof loadTools === 'function') loadTools();
              toast(`🔓 ${pending.toolName || 'Tool'} unlocked for ${pending.days || 30} days!`, 'success');
            }
          } catch {}
          if (attempts >= 12) { clearInterval(poll); if (typeof loadTools === 'function') loadTools(); toast('Payment is being verified. Your tool unlocks within a minute — refresh to check. If it failed, you were not charged.', 'info'); }
        }, 1500);
      }, 600);
      return;
    }

    setTimeout(() => {
      toast('Verifying your payment…', 'info');
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        let confirmed = false;
        try {
          const prof = await api('/api/user/profile');
          // Confirmed only if the plan is now the one we tried to buy (and changed from before)
          if (prof && pending && prof.plan === pending.planKey) confirmed = true;
          if (confirmed) {
            clearInterval(poll);
            if (currentUser) currentUser.plan = prof.plan;
            localStorage.setItem('gt_plan', prof.plan);
            if (typeof loadTools === 'function') loadTools();
            if (typeof updateAuthUI === 'function') updateAuthUI();
            if (typeof prRenderPlans === 'function') prRenderPlans();
            if (typeof prLoadUserCredits === 'function') prLoadUserCredits();
            toast(`🎉 Payment successful! Your ${pending.planName || ''} plan is active.`, 'success');
          }
        } catch {}
        if (attempts >= 12 && !confirmed) {
          clearInterval(poll);
          // Don't claim success — webhook hasn't confirmed. Refresh balances quietly.
          if (typeof prLoadUserCredits === 'function') prLoadUserCredits();
          toast('Payment is being verified. If it succeeded, your plan activates within a minute — refresh to check. If it failed, you were not charged.', 'info');
        }
      }, 1500);
    }, 600);
  }
});

let _coState = {
  planKey: null, planName: '', period: 'monthly',
  info: null,            // checkout-info response
  coupon: null,          // { code, discount, final_amount } when applied
  paymentMethod: 'razorpay',
  step: 'billing',       // 'billing' (step 1) | 'review' (step 2)
  billing: null,         // collected billing data { name, phone, address1... }
  manual: null,          // manual-config response { enabled, methods[], instructions }
  manualMethod: null,    // selected manual method id when paymentMethod==='manual'
  currency: 'INR',       // INR (India→Razorpay) or USD (international→Stripe)
};

// Currency is driven by the SELECTED PAYMENT METHOD: Razorpay → INR, Stripe → USD, Manual → INR
function _coCurrencyForMethod(method) { return method === 'stripe' ? 'USD' : 'INR'; }
function _coSym() { return _coState.currency === 'USD' ? '$' : '₹'; }

// Entry point — called from prChoosePlan
async function coOpen(planKey, planName, period) {
  if (!currentUser) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
  if (planKey === 'free') { showPage('tools'); return; }

  // Preselect the period the pricing page was showing (Monthly / Yearly tab).
  const startPeriod = (period === 'yearly' || period === '6month') ? period : 'monthly';
  // Seed method from the pricing-page currency toggle if present
  const seedStripe = (typeof _prCurrency !== 'undefined' && _prCurrency === 'USD');
  _coState = { planKey, planName, period: startPeriod, info: null, coupon: null,
    paymentMethod: seedStripe ? 'stripe' : 'razorpay', step: 'billing', billing: null,
    manual: null, manualMethod: null, currency: seedStripe ? 'USD' : 'INR', gateways: null };

  const overlay = document.getElementById('checkoutOverlay');
  const body = document.getElementById('coBody');
  overlay.classList.remove('hidden');
  body.innerHTML = '<div class="co-loading"><i class="fas fa-spinner fa-spin"></i> Loading checkout…</div>';
  document.body.style.overflow = 'hidden';

  try {
    _coState.info = await api(`/api/payment/checkout-info?plan_key=${planKey}&period=${startPeriod}`);
    try { _coState.manual = await api('/api/payment/manual-config'); } catch { _coState.manual = { enabled: false, methods: [] }; }
    try { _coState.gateways = await api('/api/payment/gateways'); } catch { _coState.gateways = { razorpay: true, stripe: false }; }
    // If seeded method is disabled, fall back to an enabled one
    if (_coState.paymentMethod === 'stripe' && !_coState.gateways.stripe) { _coState.paymentMethod = 'razorpay'; _coState.currency = 'INR'; }
    if (_coState.paymentMethod === 'razorpay' && !_coState.gateways.razorpay && _coState.gateways.stripe) { _coState.paymentMethod = 'stripe'; _coState.currency = 'USD'; }
    coRender();
  } catch (err) {
    body.innerHTML = `<div class="co-loading" style="color:#f87171">Could not load checkout.<br><small>${escapeHtml(err.message||'')}</small></div>`;
  }
}

// Entry point for buying a GT Credits pack — same modal, billing auto-fill, Razorpay/Stripe
async function coOpenCredits(packId) {
  if (!currentUser) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
  const seedStripe = (typeof _prCurrency !== 'undefined' && _prCurrency === 'USD');
  _coState = { itemType: 'credits', pack: null, packId, planKey: 'credits', planName: 'GT Credits',
    period: 'once', info: null, coupon: null, paymentMethod: seedStripe ? 'stripe' : 'razorpay',
    step: 'billing', billing: null, manual: null, manualMethod: null,
    currency: seedStripe ? 'USD' : 'INR', gateways: null };

  const overlay = document.getElementById('checkoutOverlay');
  const body = document.getElementById('coBody');
  overlay.classList.remove('hidden');
  body.innerHTML = '<div class="co-loading"><i class="fas fa-spinner fa-spin"></i> Loading checkout…</div>';
  document.body.style.overflow = 'hidden';

  try {
    const packs = await api('/api/payment/credit-packs');
    _coState.pack = packs.find(p => p.id === packId) || packs[0];
    if (!_coState.pack) throw new Error('Credit pack unavailable');
    // User name/email + saved billing (auto-fill for returning buyers)
    const prof = await api('/api/user/profile');
    const name = [prof.first_name, prof.last_name].filter(Boolean).join(' ') || prof.email || '';
    let billing = {}; try { billing = await api('/api/user/billing'); } catch {}
    _coState.info = { user: { name, email: prof.email || (currentUser && currentUser.email) || '' }, billing: billing || {}, gst_enabled: false, plan_name: 'GT Credits' };
    try { const c = await api('/api/user/credits'); _coCreditsBalance = (c && typeof c.balance === 'number') ? c.balance : 0; } catch { _coCreditsBalance = 0; }
    try { _coState.gateways = await api('/api/payment/gateways'); } catch { _coState.gateways = { razorpay: true, stripe: false }; }
    try { _coState.manual = await api('/api/payment/manual-config'); } catch { _coState.manual = { enabled: false, methods: [] }; }
    if (_coState.paymentMethod === 'stripe' && !_coState.gateways.stripe) { _coState.paymentMethod = 'razorpay'; _coState.currency = 'INR'; }
    if (_coState.paymentMethod === 'razorpay' && !_coState.gateways.razorpay && _coState.gateways.stripe) { _coState.paymentMethod = 'stripe'; _coState.currency = 'USD'; }
    coRender();
  } catch (err) {
    body.innerHTML = `<div class="co-loading" style="color:#f87171">Could not load checkout.<br><small>${escapeHtml(err.message || '')}</small></div>`;
  }
}

// ── Individual tool purchase (à-la-carte 30-day access) ──────────────────────
async function coOpenTool(indId) {
  if (!currentUser) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
  const seedStripe = (typeof _prCurrency !== 'undefined' && _prCurrency === 'USD');
  _coState = { itemType: 'tool', tool: null, indId, planKey: 'tool', planName: 'Tool',
    period: 'once', toolDuration: '1m', info: null, coupon: null, paymentMethod: seedStripe ? 'stripe' : 'razorpay',
    step: 'billing', billing: null, manual: null, manualMethod: null,
    currency: seedStripe ? 'USD' : 'INR', gateways: null, pack: null };

  const overlay = document.getElementById('checkoutOverlay');
  const body = document.getElementById('coBody');
  overlay.classList.remove('hidden');
  body.innerHTML = '<div class="co-loading"><i class="fas fa-spinner fa-spin"></i> Loading checkout…</div>';
  document.body.style.overflow = 'hidden';

  try {
    const t = await api('/api/payment/individual-tool/' + indId);
    _coState.tool = t;
    _coState.planName = t.name;
    // reuse the price-carrier shape so _coBasePaise() works
    _coState.pack = { name: t.name, price_inr: t.price_inr, price_usd: t.price_usd };
    const prof = await api('/api/user/profile');
    const name = [prof.first_name, prof.last_name].filter(Boolean).join(' ') || prof.email || '';
    let billing = {}; try { billing = await api('/api/user/billing'); } catch {}
    _coState.info = { user: { name, email: prof.email || (currentUser && currentUser.email) || '' }, billing: billing || {}, gst_enabled: false, plan_name: t.name };
    try { _coState.gateways = await api('/api/payment/gateways'); } catch { _coState.gateways = { razorpay: true, stripe: false }; }
    try { _coState.manual = await api('/api/payment/manual-config'); } catch { _coState.manual = { enabled: false, methods: [] }; }
    if (_coState.paymentMethod === 'stripe' && !_coState.gateways.stripe) { _coState.paymentMethod = 'razorpay'; _coState.currency = 'INR'; }
    if (_coState.paymentMethod === 'razorpay' && !_coState.gateways.razorpay && _coState.gateways.stripe) { _coState.paymentMethod = 'stripe'; _coState.currency = 'USD'; }
    coRender();
  } catch (err) {
    body.innerHTML = `<div class="co-loading" style="color:#f87171">Could not load checkout.<br><small>${escapeHtml(err.message || '')}</small></div>`;
  }
}

// The full priced-durations list for the current currency (from the server).
function _coToolDurations() {
  const t = _coState.tool || {};
  return (_coState.currency === 'USD' ? t.durations_usd : t.durations_inr) || [];
}
function _coSelToolDur() {
  const list = _coToolDurations();
  return list.find(d => d.key === (_coState.toolDuration || '1m')) || list[0] || { label: '1 month', days: 30, discount_pct: 0 };
}

// Review & Pay for a single tool — pick a duration (1 month → 1 year, longer = cheaper).
function coRenderToolCheckout() {
  const body = document.getElementById('coBody');
  const t = _coState.tool;
  const sym = _coSym();
  const durs = _coToolDurations();
  const sel = _coSelToolDur();
  const amount = _coBasePaise();
  const saving = Math.max(0, (sel.gross_minor || amount) - amount); // discount vs 1-month × N
  const durOpts = durs.map(d =>
    `<option value="${d.key}" ${d.key === (_coState.toolDuration || '1m') ? 'selected' : ''}>${escapeHtml(d.label)}${d.discount_pct > 0 ? ` · save ${d.discount_pct}%` : ''}</option>`
  ).join('');
  body.innerHTML = `
    ${_coStepper(2)}
    <button class="co-back-link" onclick="coBackToBilling()"><i class="fas fa-arrow-left"></i> Back to billing</button>

    <div class="co-summary">
      <div class="co-sum-head">
        <div class="co-sum-plan">${escapeHtml(t.name)}<small>${escapeHtml(_coState.info.user.email || '')}</small></div>
        <div class="co-sum-price"><span class="co-cr-amt"><i class="fas fa-clock" style="color:#a78bfa"></i> ${escapeHtml(sel.label)}</span></div>
      </div>
      ${durs.length > 1 ? `
      <div class="co-line" style="border:0;padding-bottom:4px">
        <span class="co-line-label" style="display:flex;align-items:center;gap:7px"><i class="fas fa-clock" style="color:#a78bfa"></i> Access duration</span>
        <div class="co-period-select" style="margin:0"><select onchange="coChangeToolDuration(this.value)">${durOpts}</select></div>
      </div>` : ''}
      ${saving > 0 ? `
      <div class="co-line">
        <span class="co-line-label">${sel.months}-month price</span>
        <span class="co-line-val" style="text-decoration:line-through;color:var(--text-3)">${sym}${_coFmt(sel.gross_minor)}</span>
      </div>
      <div class="co-line">
        <span class="co-line-label" style="color:#34d399">Longer-term discount (${sel.discount_pct}% off)</span>
        <span class="co-line-val" style="color:#34d399">−${sym}${_coFmt(saving)}</span>
      </div>` : ''}
      <div class="co-line co-total">
        <span class="co-total-label">Total</span>
        <span class="co-total-val">${sym}${_coFmt(amount)}</span>
      </div>
      <div class="co-footer-note" style="margin-top:6px"><i class="fas fa-unlock"></i> Unlocks this tool for ${sel.days} days · activated instantly after payment</div>
    </div>

    ${_coBillingSummaryHtml()}

    <div class="co-section-label"><i class="fas fa-credit-card"></i> Payment Method
      <span style="margin-left:auto;font-weight:600;color:var(--text-3);font-size:11px">${_coState.currency === 'USD' ? '🌍 Billed in USD' : '🇮🇳 Billed in INR'}</span>
    </div>
    ${(_coState.gateways && _coState.gateways.razorpay) ? `
    <div class="co-pay-method ${_coState.paymentMethod === 'razorpay' ? 'selected' : ''}" onclick="coSelectMethod('razorpay')">
      <div class="co-pay-radio"></div>
      <div class="co-pay-info">
        <div class="co-pay-name">Razorpay <span class="co-pay-badge" style="background:rgba(59,130,246,.15);color:#3b82f6">₹ INR</span></div>
        <div class="co-pay-sub">UPI · Cards · Netbanking · Wallets · Intl cards</div>
      </div>
    </div>` : ''}
    ${(_coState.gateways && _coState.gateways.stripe) ? `
    <div class="co-pay-method ${_coState.paymentMethod === 'stripe' ? 'selected' : ''}" onclick="coSelectMethod('stripe')">
      <div class="co-pay-radio"></div>
      <div class="co-pay-info">
        <div class="co-pay-name">Stripe <span class="co-pay-badge">$ International</span></div>
        <div class="co-pay-sub">Debit / credit cards · Apple Pay · Google Pay</div>
      </div>
    </div>` : ''}

    <button class="co-pay-btn" id="coPayBtn" onclick="coPayNow()">
      <i class="fas fa-lock"></i> Pay ${sym}${_coFmt(amount)}
    </button>
    <div class="co-footer-note"><i class="fas fa-shield-halved"></i> Secure payment · access granted automatically</div>
  `;
}

async function coPayTool() {
  const bs = _coState.billing;
  if (!bs) { coBackToBilling(); return; }
  const billing = {
    address1: bs.address1, address2: bs.address2, country: bs.country,
    city: bs.city, state: bs.state, postal_code: bs.postal_code,
    company_name: bs.company_name, gstin: bs.gstin,
  };
  const btn = document.getElementById('coPayBtn');
  const orig = btn ? btn.innerHTML : '';
  const t = _coState.tool;

  // Stripe (USD) — redirect to Checkout
  if (_coState.paymentMethod === 'stripe') {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting to Stripe…'; }
    try {
      const r = await api('/api/payment/stripe/create-session', 'POST', { item_type: 'tool', ind_id: _coState.indId, duration: _coState.toolDuration, billing });
      if (r.url) {
        try { sessionStorage.setItem('gt_stripe_pending', JSON.stringify({ itemType: 'tool', toolId: t.tool_id, toolName: t.name, days: _coSelToolDur().days })); } catch {}
        window.location.href = r.url; return;
      }
      throw new Error('No checkout URL');
    } catch (err) { if (btn) { btn.disabled = false; btn.innerHTML = orig; } toast('Stripe checkout failed: ' + (err.message || 'try again'), 'error'); return; }
  }

  // Razorpay (INR)
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating order…'; }
  let orderData;
  try {
    orderData = await api('/api/payment/razorpay/create-tool-order', 'POST', { ind_id: _coState.indId, duration: _coState.toolDuration, billing });
  } catch (err) { if (btn) { btn.disabled = false; btn.innerHTML = orig; } toast('Could not start payment: ' + (err.message || 'Server error'), 'error'); return; }
  if (!window.Razorpay) {
    try { await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
    catch { if (btn) { btn.disabled = false; btn.innerHTML = orig; } toast('Could not load payment gateway.', 'error'); return; }
  }
  if (btn) { btn.disabled = false; btn.innerHTML = orig; }
  const options = {
    key: orderData.key_id, amount: orderData.amount, currency: 'INR', order_id: orderData.order_id,
    name: 'GraphicoToolz', description: `${t.name} — ${_coSelToolDur().label} access`,
    image: 'https://graphicotoolz.com/app/img/logo.png',
    prefill: { name: orderData.user_name, email: orderData.user_email, contact: (bs.phone || '') },
    theme: { color: '#8b5cf6' },
    modal: { ondismiss: function () { toast('Payment cancelled. You can retry anytime.', 'info'); }, escape: true, backdropclose: false },
    handler: function () { _coAfterPaymentTool(t); },
  };
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (resp) { toast('Payment failed: ' + (resp.error?.description || 'Please try again.'), 'error'); });
  rzp.open();
}

function _coAfterPaymentTool(t) {
  _coState.step = 'processing';
  document.getElementById('coBody').innerHTML = `
    <div class="co-processing">
      <div class="co-spinner-ring"></div>
      <div class="co-proc-title">Confirming your payment…</div>
      <div class="co-proc-sub">Unlocking ${escapeHtml(t.name)} for ${_coSelToolDur().days} days.</div>
    </div>`;
  let attempts = 0;
  const poll = setInterval(async () => {
    attempts++;
    try {
      const d = await api('/api/user/purchased-tools');
      if (d && Array.isArray(d.tool_ids) && t.tool_id && d.tool_ids.includes(t.tool_id)) {
        clearInterval(poll);
        if (typeof loadTools === 'function') loadTools();
        _coShowToolSuccess(t);
      }
    } catch {}
    if (attempts >= 20) { clearInterval(poll); if (typeof loadTools === 'function') loadTools(); _coShowToolPending(t); }
  }, 1000);
}

function _coShowToolSuccess(t) {
  _coState.step = 'success';
  document.getElementById('coBody').innerHTML = `
    <div class="co-success">
      <div class="co-success-check" style="color:#8b5cf6"><i class="fas fa-unlock"></i></div>
      <div class="co-success-title">Tool Unlocked! 🔓</div>
      <div class="co-success-sub"><strong>${escapeHtml(t.name)}</strong> is now available for ${t.access_days || 30} days. Find it in your Tools.</div>
      <button class="co-pay-btn" onclick="coClose();if(typeof showPage==='function')showPage('tools')" style="margin-top:20px"><i class="fas fa-toolbox"></i> Go to Tools</button>
    </div>`;
}
function _coShowToolPending(t) {
  _coState.step = 'success';
  document.getElementById('coBody').innerHTML = `
    <div class="co-success">
      <div class="co-success-check" style="color:#f59e0b"><i class="fas fa-clock"></i></div>
      <div class="co-success-title">Payment received</div>
      <div class="co-success-sub">${escapeHtml(t.name)} unlocks within a minute. Refresh your Tools to check. If it failed, you were not charged.</div>
      <button class="co-pay-btn" onclick="coClose()" style="margin-top:20px"><i class="fas fa-check"></i> Done</button>
    </div>`;
}

// ── CHECKOUT ABANDON ROUTER ──────────────────────────────────────────────────
// Someone who opened checkout and closed without paying is the highest-intent
// person who didn't buy. Instead of a survey ("why didn't you buy?" — which puts
// them on the defensive and mostly returns "too expensive" regardless of the real
// reason), this is a ROUTER: one tap, and every option triggers an ACTION rather
// than just filing a row.
//
// Asked at most ONCE per session, and never traps anyone — the header X always
// closes immediately, and "Just looking" is a first-class answer.
const _CO_EXIT_KEY = 'gt_checkout_exit_asked';

function _coCanAskExit() {
  if (_coState.step !== 'billing' && _coState.step !== 'review') return false; // mid-payment / success
  try { if (sessionStorage.getItem(_CO_EXIT_KEY)) return false; } catch (e) {}
  return true;
}

function coClose() {
  if (_coCanAskExit()) {
    try { sessionStorage.setItem(_CO_EXIT_KEY, '1'); } catch (e) {}
    _coState.step = 'exit';
    _coRenderExit();
    return;
  }
  _coForceClose();
}

function _coForceClose() {
  document.getElementById('checkoutOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function _coRenderExit() {
  const opts = [
    { k: 'missing_tool', i: 'fa-magnifying-glass', t: "The tool I need isn't listed" },
    { k: 'unsure',       i: 'fa-circle-question',  t: "Not sure it'll actually work" },
    { k: 'budget',       i: 'fa-wallet',           t: 'More than my budget right now' },
    { k: 'browsing',     i: 'fa-eye',              t: 'Just looking around' },
  ];
  document.getElementById('coBody').innerHTML = `
    <div class="co-exit">
      <h3 class="co-exit-title">Before you go — what stopped you?</h3>
      <p class="co-exit-sub">One tap. It genuinely helps us fix the right thing.</p>
      <div class="co-exit-opts">
        ${opts.map(o => `
          <button class="co-exit-opt" onclick="coExitPick('${o.k}')">
            <i class="fas ${o.i}"></i><span>${o.t}</span>
            <i class="fas fa-chevron-right co-exit-arrow"></i>
          </button>`).join('')}
      </div>
      <button class="co-exit-skip" onclick="_coForceClose()">Close</button>
    </div>`;
}

function coExitPick(kind) {
  // Record the tap immediately — even if they abandon the follow-up step, the
  // headline reason is already captured.
  api('/api/requests', 'POST', { kind: 'checkout_exit', reason: kind, query: '' }).catch(() => {});

  const body = document.getElementById('coBody');
  if (kind === 'browsing') { _coForceClose(); return; }

  if (kind === 'missing_tool') {
    if (typeof gtInjectRequestStyles === 'function') gtInjectRequestStyles();
    body.innerHTML = `<div class="co-exit">${
      typeof gtRequestBoxHtml === 'function'
        ? gtRequestBoxHtml('')
        : '<p class="co-exit-sub">Thanks — we\'ll look into it.</p>'
    }<button class="co-exit-skip" onclick="_coForceClose()">Close</button></div>`;
    return;
  }

  if (kind === 'unsure') {
    // The honest answer to "will this actually work" is a demo and a human,
    // not a discount.
    body.innerHTML = `
      <div class="co-exit">
        <div class="co-exit-icon"><i class="fas fa-circle-play"></i></div>
        <h3 class="co-exit-title">Fair question</h3>
        <p class="co-exit-sub">There's a short walkthrough on the Extension page showing a real tool opening end to end. Or ask us directly — we reply fast.</p>
        <div class="co-exit-opts">
          <button class="co-exit-opt" onclick="_coForceClose(); showPage('extension');">
            <i class="fas fa-circle-play"></i><span>Watch the walkthrough</span><i class="fas fa-chevron-right co-exit-arrow"></i>
          </button>
          <button class="co-exit-opt" onclick="_coExitChat()">
            <i class="fas fa-comments"></i><span>Ask us a question</span><i class="fas fa-chevron-right co-exit-arrow"></i>
          </button>
        </div>
        <button class="co-exit-skip" onclick="_coForceClose()">No thanks</button>
      </div>`;
    return;
  }

  // budget — the ONLY branch where money is discussed. Kept deliberately narrow:
  // showing an offer to everyone who hesitates just teaches people to hesitate.
  body.innerHTML = `
    <div class="co-exit">
      <div class="co-exit-icon"><i class="fas fa-wallet"></i></div>
      <h3 class="co-exit-title">That's fair</h3>
      <p class="co-exit-sub">Two smaller ways in, if either fits better:</p>
      <div class="co-exit-opts">
        <button class="co-exit-opt" onclick="_coForceClose(); showPage('pricing');">
          <i class="fas fa-layer-group"></i><span>See the lower-priced plans</span><i class="fas fa-chevron-right co-exit-arrow"></i>
        </button>
        <button class="co-exit-opt" onclick="_coForceClose(); showPage('tools');">
          <i class="fas fa-cube"></i><span>Buy just the one tool you need</span><i class="fas fa-chevron-right co-exit-arrow"></i>
        </button>
      </div>
      <button class="co-exit-skip" onclick="_coForceClose()">Maybe later</button>
    </div>`;
}

function _coExitChat() {
  _coForceClose();
  try {
    if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') { window.Tawk_API.maximize(); return; }
  } catch (e) {}
  toast('Use the chat bubble at the bottom-right and we\'ll help you out.', 'info');
}

// Format minor units (paise/cents) → string. USD always 2dp, INR integer unless fractional.
function _coFmt(minor) {
  const v = minor / 100;
  if (_coState.currency === 'USD') return v.toFixed(2);
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(2);
}

// Current base price in minor units (after period discount, before coupon) — currency-aware
function _coBasePaise() {
  if (_coState.itemType === 'tool') {
    const t = _coState.tool || {};
    const list = _coState.currency === 'USD' ? (t.durations_usd || []) : (t.durations_inr || []);
    const sel = list.find(d => d.key === (_coState.toolDuration || '1m')) || list[0];
    if (sel) return sel.amount_minor;                     // selected term's price
    const major = _coState.currency === 'USD' ? (t.price_usd || 0) : (t.price_inr || 0);
    return Math.round(major * 100);                        // fallback: 1-month base
  }
  if (_coState.itemType === 'credits') {
    const p = _coState.pack || {};
    const major = _coState.currency === 'USD' ? (p.price_usd || 0) : (p.price_inr || 0);
    return Math.round(major * 100);
  }
  const per = _coState.info.periods[_coState.period];
  const major = _coState.currency === 'USD' ? per.price_usd : per.price_inr;
  return Math.round(major * 100);
}

function _coGrossPaise() {
  const per = _coState.info.periods[_coState.period];
  const major = _coState.currency === 'USD' ? per.gross_usd : per.gross_inr;
  return Math.round(major * 100);
}

function coRender() {
  if (_coState.step === 'review') {
    if (_coState.itemType === 'credits') return coRenderCreditsCheckout();
    if (_coState.itemType === 'tool') return coRenderToolCheckout();
    return coRenderCheckout();
  }
  coRenderBilling();
}

// Review & Pay step for a GT Credits pack (no period/coupon/proration — just the pack price)
function coRenderCreditsCheckout() {
  const body = document.getElementById('coBody');
  const pack = _coState.pack;
  const sym = _coSym();
  const amount = _coBasePaise();
  body.innerHTML = `
    ${_coStepper(2)}
    <button class="co-back-link" onclick="coBackToBilling()"><i class="fas fa-arrow-left"></i> Back to billing</button>

    <div class="co-summary">
      <div class="co-sum-head">
        <div class="co-sum-plan">${escapeHtml(pack.name)} Credit Pack<small>${escapeHtml(_coState.info.user.email || '')}</small></div>
        <div class="co-sum-price"><span class="co-cr-amt"><i class="fas fa-coins" style="color:#f59e0b"></i> ${Number(pack.credits).toLocaleString()} credits</span></div>
      </div>
      <div class="co-line co-total">
        <span class="co-total-label">Total</span>
        <span class="co-total-val">${sym}${_coFmt(amount)}</span>
      </div>
      <div class="co-footer-note" style="margin-top:6px"><i class="fas fa-infinity"></i> Credits never expire · added instantly after payment</div>
    </div>

    ${_coBillingSummaryHtml()}

    <div class="co-section-label"><i class="fas fa-credit-card"></i> Payment Method
      <span style="margin-left:auto;font-weight:600;color:var(--text-3);font-size:11px">${_coState.currency === 'USD' ? '🌍 Billed in USD' : '🇮🇳 Billed in INR'}</span>
    </div>
    ${(_coState.gateways && _coState.gateways.razorpay) ? `
    <div class="co-pay-method ${_coState.paymentMethod === 'razorpay' ? 'selected' : ''}" onclick="coSelectMethod('razorpay')">
      <div class="co-pay-radio"></div>
      <div class="co-pay-info">
        <div class="co-pay-name">Razorpay <span class="co-pay-badge" style="background:rgba(59,130,246,.15);color:#3b82f6">₹ INR</span></div>
        <div class="co-pay-sub">UPI · Cards · Netbanking · Wallets · Intl cards</div>
      </div>
    </div>` : ''}
    ${(_coState.gateways && _coState.gateways.stripe) ? `
    <div class="co-pay-method ${_coState.paymentMethod === 'stripe' ? 'selected' : ''}" onclick="coSelectMethod('stripe')">
      <div class="co-pay-radio"></div>
      <div class="co-pay-info">
        <div class="co-pay-name">Stripe <span class="co-pay-badge">$ International</span></div>
        <div class="co-pay-sub">Debit / credit cards · Apple Pay · Google Pay</div>
      </div>
    </div>` : ''}

    <button class="co-pay-btn" id="coPayBtn" onclick="coPayNow()">
      <i class="fas fa-lock"></i> Pay ${sym}${_coFmt(amount)}
    </button>
    <div class="co-footer-note"><i class="fas fa-shield-halved"></i> Secure payment · credits added automatically</div>
  `;
}

// Progress stepper HTML — step 1 = Billing, step 2 = Review & Pay
function _coStepper(currentStep) {
  // currentStep: 1 (billing) or 2 (review)
  return `
    <div class="co-stepper">
      <div class="co-step ${currentStep === 1 ? 'active' : 'done'}">
        <div class="co-step-dot">${currentStep > 1 ? '<i class="fas fa-check"></i>' : '1'}</div>
        <div class="co-step-label">Billing</div>
      </div>
      <div class="co-step-line ${currentStep > 1 ? 'filled' : ''}"></div>
      <div class="co-step ${currentStep === 2 ? 'active' : ''}">
        <div class="co-step-dot">2</div>
        <div class="co-step-label">Review &amp; Pay</div>
      </div>
    </div>`;
}

function coRenderCheckout() {
  const info = _coState.info;
  const body = document.getElementById('coBody');
  const base = _coBasePaise();
  const gross = _coGrossPaise();
  const per = info.periods[_coState.period];
  const periodSaving = gross - base;

  const couponDiscount = _coState.coupon ? _coState.coupon.discount : 0;
  // Proration credit applies only to INR (it's computed from INR plan price server-side)
  const proration = info.proration || {};
  const prorationCredit = _coState.currency === 'USD' ? 0 : Math.round((proration.credit_inr || 0) * 100);
  // Single-tool → plan credit (unused days of a tool the plan now covers). Per-currency.
  const toolCreditRaw = _coState.currency === 'USD' ? (proration.tool_credit_usd || 0) : (proration.tool_credit_inr || 0);
  const toolCredit = Math.round(toolCreditRaw * 100);
  const toolItems = proration.tool_items || [];
  let finalAmount = base - couponDiscount;
  const appliedProration = Math.min(prorationCredit, Math.max(0, finalAmount));
  finalAmount -= appliedProration;
  const appliedToolCredit = Math.min(toolCredit, Math.max(0, finalAmount));
  finalAmount -= appliedToolCredit;
  if (finalAmount < 0) finalAmount = 0;
  const sym = _coSym();

  // Period options
  const periodOpts = ['monthly', '6month', 'yearly'].map(p => {
    const label = info.periods[p].label;
    const disc = info.periods[p].discount_pct;
    const suffix = disc > 0 ? ` (${disc}% off)` : '';
    return `<option value="${p}" ${p === _coState.period ? 'selected' : ''}>${label}${suffix}</option>`;
  }).join('');

  body.innerHTML = `
    ${_coStepper(2)}
    <button class="co-back-link" onclick="coBackToBilling()"><i class="fas fa-arrow-left"></i> Back to billing</button>
    <!-- Plan summary -->
    <div class="co-summary">
      <div class="co-sum-top">
        <div class="co-sum-plan">${escapeHtml(info.plan_name)} Plan<small>${currentUser ? escapeHtml(_coState.info.user.email) : ''}</small></div>
        <div class="co-period-select">
          <select onchange="coChangePeriod(this.value)">${periodOpts}</select>
        </div>
      </div>

      <div class="co-line">
        <span class="co-line-label">${per.label} price</span>
        <span class="co-line-val">${sym}${_coFmt(gross)}</span>
      </div>
      ${periodSaving > 0 ? `
        <div class="co-line co-line-discount">
          <span class="co-line-label">Plan discount <span class="co-line-save">${per.discount_pct}% OFF</span></span>
          <span class="co-line-val">−${sym}${_coFmt(periodSaving)}</span>
        </div>` : ''}
      ${couponDiscount > 0 ? `
        <div class="co-line co-line-discount">
          <span class="co-line-label">Coupon ${escapeHtml(_coState.coupon.code)}</span>
          <span class="co-line-val">−${sym}${_coFmt(couponDiscount)}</span>
        </div>` : ''}
      ${appliedProration > 0 ? `
        <div class="co-line co-line-discount">
          <span class="co-line-label">Credit from ${escapeHtml(proration.cur_plan_name || 'current plan')} <span class="co-line-save">${proration.rem_days || 0} days left</span></span>
          <span class="co-line-val">−${sym}${_coFmt(appliedProration)}</span>
        </div>` : ''}
      ${appliedToolCredit > 0 ? `
        <div class="co-line co-line-discount">
          <span class="co-line-label">Credit from ${escapeHtml((toolItems[0] && toolItems[0].tool) || 'your tool purchase')}${toolItems[0] ? ` <span class="co-line-save">${toolItems[0].rem_days} days left</span>` : ''}</span>
          <span class="co-line-val">−${sym}${_coFmt(appliedToolCredit)}</span>
        </div>` : ''}
      ${info.gst_enabled && _coState.currency === 'INR' ? `
        <div class="co-line">
          <span class="co-line-label">GST (18%)</span>
          <span class="co-line-val">+${sym}${_coFmt(Math.round(finalAmount * 0.18))}</span>
        </div>` : ''}
      <div class="co-divider"></div>
      <div class="co-total">
        <span class="co-total-label">Total</span>
        <span class="co-total-val">${sym}${_coFmt((info.gst_enabled && _coState.currency === 'INR') ? Math.round(finalAmount * 1.18) : finalAmount)}<small>/${per.label.toLowerCase()}</small></span>
      </div>
    </div>

    <!-- Coupon / reseller code (works in INR & USD for percent coupons) -->
    <div class="co-section-label"><i class="fas fa-tag"></i> Have a coupon or reseller code?</div>
    <div class="co-coupon-row">
      <input type="text" id="coCouponInput" placeholder="Enter code" style="text-transform:uppercase" ${_coState.coupon ? 'disabled value="' + escapeHtml(_coState.coupon.code) + '"' : ''}>
      <button class="co-coupon-btn" onclick="coApplyCoupon()" id="coCouponBtn">${_coState.coupon ? 'Remove' : 'Apply'}</button>
    </div>
    <div class="co-coupon-msg" id="coCouponMsg"></div>

    ${_coBillingSummaryHtml()}

    <!-- Payment method — all enabled gateways shown; method picks the currency -->
    <div class="co-section-label"><i class="fas fa-credit-card"></i> Payment Method
      <span style="margin-left:auto;font-weight:600;color:var(--text-3);font-size:11px">${_coState.currency === 'USD' ? '🌍 Billed in USD' : '🇮🇳 Billed in INR'}</span>
    </div>
    ${(_coState.gateways && _coState.gateways.razorpay) ? `
    <div class="co-pay-method ${_coState.paymentMethod === 'razorpay' ? 'selected' : ''}" onclick="coSelectMethod('razorpay')">
      <div class="co-pay-radio"></div>
      <div class="co-pay-info">
        <div class="co-pay-name">Razorpay <span class="co-pay-badge" style="background:rgba(59,130,246,.15);color:#3b82f6">₹ INR</span></div>
        <div class="co-pay-sub">UPI · Cards · Netbanking · Wallets · Intl cards</div>
      </div>
    </div>` : ''}
    ${(_coState.gateways && _coState.gateways.stripe) ? `
    <div class="co-pay-method ${_coState.paymentMethod === 'stripe' ? 'selected' : ''}" onclick="coSelectMethod('stripe')">
      <div class="co-pay-radio"></div>
      <div class="co-pay-info">
        <div class="co-pay-name">Stripe <span class="co-pay-badge">$ International</span></div>
        <div class="co-pay-sub">Debit / credit cards · Apple Pay · Google Pay</div>
      </div>
    </div>` : ''}
    ${(_coState.manual && _coState.manual.enabled) ? `
    <div class="co-pay-method ${_coState.paymentMethod === 'manual' ? 'selected' : ''}" onclick="coSelectMethod('manual')">
      <div class="co-pay-radio"></div>
      <div class="co-pay-info">
        <div class="co-pay-name">Pay via QR / PayPal / Crypto <span class="co-pay-badge" style="background:rgba(245,158,11,.15);color:#f59e0b">Manual</span></div>
        <div class="co-pay-sub">${_coState.manual.methods.map(m => escapeHtml(m.label)).join(' · ')}</div>
      </div>
    </div>` : ''}

    <button class="co-pay-btn" id="coPayBtn" onclick="coPayNow()">
      ${_coState.paymentMethod === 'manual'
        ? `<i class="fas fa-qrcode"></i> Continue to Pay ${sym}${_coFmt((info.gst_enabled && _coState.currency === 'INR') ? Math.round(finalAmount * 1.18) : finalAmount)}`
        : `<i class="fas fa-lock"></i> Pay ${sym}${_coFmt((info.gst_enabled && _coState.currency === 'INR') ? Math.round(finalAmount * 1.18) : finalAmount)}`}
    </button>
    <div class="co-footer-note"><i class="fas fa-shield-halved"></i> Secured by 256-bit SSL encryption</div>
  `;
}

// Compact billing summary shown on the review step
function _coBillingSummaryHtml() {
  const b = _coState.billing;
  if (!b) return '';
  const addr = [b.address1, b.address2, b.city, b.state, b.postal_code, b.country].filter(Boolean).join(', ');
  return `
    <div class="co-section-label"><i class="fas fa-location-dot"></i> Billing To <button class="co-edit-billing" onclick="coBackToBilling()">Edit</button></div>
    <div class="co-billing-summary">
      <div class="co-bs-name">${escapeHtml(b.name || '')}</div>
      <div class="co-bs-line">${escapeHtml(b.email || '')}</div>
      ${b.phone ? `<div class="co-bs-line">${escapeHtml(b.phone)}</div>` : ''}
      ${addr ? `<div class="co-bs-line">${escapeHtml(addr)}</div>` : ''}
      ${b.gstin ? `<div class="co-bs-line">GSTIN: ${escapeHtml(b.gstin)}</div>` : ''}
    </div>`;
}

// ── Manual payment screen (QR / PayPal / Crypto + proof upload) ──────────────
function _coManualFinalPaise() {
  const base = _coBasePaise();
  const couponDiscount = _coState.coupon ? _coState.coupon.discount : 0;
  const proration = _coState.info.proration || {};
  const prorationCredit = _coState.currency === 'USD' ? 0 : Math.min(Math.round((proration.credit_inr || 0) * 100), Math.max(0, base - couponDiscount));
  let amt = base - couponDiscount - prorationCredit;
  const toolCreditRaw = _coState.currency === 'USD' ? (proration.tool_credit_usd || 0) : (proration.tool_credit_inr || 0);
  amt -= Math.min(Math.round(toolCreditRaw * 100), Math.max(0, amt));
  if (_coState.info.gst_enabled && _coState.currency === 'INR') amt = Math.round(amt * 1.18);
  return Math.max(0, amt);
}

function coRenderManual() {
  const m = _coState.manual;
  if (!m || !m.enabled || !m.methods.length) { toast('Manual payment unavailable', 'error'); return; }
  _coState.step = 'manual';
  if (!_coState.manualMethod) _coState.manualMethod = m.methods[0].id;
  const body = document.getElementById('coBody');
  const amt = _coManualFinalPaise();
  const amtStr = _coSym() + _coFmt(amt);

  // Method tabs
  const tabs = m.methods.map(mt => `
    <button class="co-mm-tab ${_coState.manualMethod === mt.id ? 'active' : ''}" onclick="coSelectManualMethod('${mt.id}')">
      ${mt.id === 'upi' ? '<i class="fas fa-qrcode"></i>' : mt.id === 'paypal' ? '<i class="fab fa-paypal"></i>' : '<i class="fab fa-bitcoin"></i>'}
      ${escapeHtml(mt.label)}
    </button>`).join('');

  const sel = m.methods.find(x => x.id === _coState.manualMethod) || m.methods[0];
  let payBlock = '';
  if (sel.id === 'upi') {
    payBlock = `
      ${sel.qr_url ? `<div class="co-mm-qr"><img src="${sel.qr_url}" alt="UPI QR"></div>` : ''}
      <div class="co-mm-amt">Amount to pay<br><strong>${amtStr}</strong></div>
      ${sel.upi_id ? `<div class="co-mm-id">UPI ID: <strong>${escapeHtml(sel.upi_id)}</strong> <button class="co-mm-copy" onclick="coCopy('${escapeHtml(sel.upi_id)}')"><i class="fas fa-copy"></i></button></div>` : ''}
      ${sel.name ? `<div class="co-mm-sub">Pay to: ${escapeHtml(sel.name)}</div>` : ''}`;
  } else if (sel.id === 'paypal') {
    const link = sel.link || (sel.email ? '' : '');
    payBlock = `
      <div class="co-mm-amt">Amount to pay<br><strong>${amtStr}</strong></div>
      ${sel.email ? `<div class="co-mm-id">PayPal: <strong>${escapeHtml(sel.email)}</strong> <button class="co-mm-copy" onclick="coCopy('${escapeHtml(sel.email)}')"><i class="fas fa-copy"></i></button></div>` : ''}
      ${sel.link ? `<a class="co-mm-openbtn" href="${escapeHtml(sel.link)}" target="_blank"><i class="fab fa-paypal"></i> Open PayPal</a>` : ''}`;
  } else if (sel.id === 'crypto') {
    payBlock = `
      ${sel.qr_url ? `<div class="co-mm-qr"><img src="${sel.qr_url}" alt="Wallet QR"></div>` : ''}
      <div class="co-mm-amt">Amount to pay<br><strong>${amtStr}</strong></div>
      <div class="co-mm-sub">${escapeHtml(sel.coin)} · ${escapeHtml(sel.network)} network</div>
      <div class="co-mm-id" style="word-break:break-all">Address: <strong>${escapeHtml(sel.address)}</strong> <button class="co-mm-copy" onclick="coCopy('${escapeHtml(sel.address)}')"><i class="fas fa-copy"></i></button></div>`;
  }

  body.innerHTML = `
    <button class="co-back-link" onclick="coBackToReview()"><i class="fas fa-arrow-left"></i> Back</button>
    <div class="co-mm-tabs">${tabs}</div>
    <div class="co-mm-pay">${payBlock}</div>

    <div class="co-mm-instructions"><i class="fas fa-circle-info"></i> ${escapeHtml(m.instructions || '')}</div>

    <div class="co-section-label"><i class="fas fa-cloud-arrow-up"></i> Submit Payment Proof</div>
    <div class="co-field"><input class="co-input" id="coManualTxn" placeholder="Transaction ID (optional)"></div>
    <label class="co-mm-upload" id="coProofLabel">
      <input type="file" id="coProofFile" accept="image/*" style="display:none" onchange="coProofPicked(this)">
      <i class="fas fa-cloud-arrow-up"></i>
      <span id="coProofText">Click to upload payment screenshot *</span>
    </label>
    <button class="co-pay-btn" id="coManualSubmitBtn" onclick="coSubmitManual()">
      <i class="fas fa-check"></i> Submit Proof
    </button>
    <div class="co-footer-note">Your payment will be verified within ${escapeHtml(m.verify_time || '2-5 minutes')}.</div>
  `;
}

function coSelectManualMethod(id) { _coState.manualMethod = id; coRenderManual(); }
function coBackToReview() { _coState.step = 'review'; coRenderCheckout(); }
function coCopy(txt) { navigator.clipboard?.writeText(txt); toast('Copied!', 'success'); }

let _coProofFile = null;
function coProofPicked(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  _coProofFile = f;
  const t = document.getElementById('coProofText');
  if (t) t.textContent = '✓ ' + f.name;
  document.getElementById('coProofLabel')?.classList.add('has-file');
}

async function coSubmitManual() {
  if (!_coProofFile) { toast('Please upload your payment screenshot', 'error'); return; }
  const btn = document.getElementById('coManualSubmitBtn');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';

  const fd = new FormData();
  fd.append('proof', _coProofFile);
  fd.append('plan_key', _coState.planKey);
  fd.append('period', _coState.period);
  fd.append('coupon_code', _coState.coupon ? _coState.coupon.code : '');
  fd.append('method', _coState.manualMethod);
  fd.append('txn_id', document.getElementById('coManualTxn')?.value.trim() || '');
  fd.append('billing', JSON.stringify(_coState.billing || {}));

  try {
    const res = await fetch('/api/payment/manual-submit', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + (sessionStorage.getItem('user_token')||localStorage.getItem('user_token')) },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submit failed');
    _coProofFile = null;
    _coShowManualSuccess();
  } catch (e) {
    btn.disabled = false; btn.innerHTML = orig;
    toast(e.message || 'Could not submit proof', 'error');
  }
}

function _coShowManualSuccess() {
  _coState.step = 'success';
  const body = document.getElementById('coBody');
  body.innerHTML = `
    <div class="co-success">
      <div class="co-success-check" style="color:#f59e0b"><i class="fas fa-clock"></i></div>
      <div class="co-success-title">Proof Submitted! ⏳</div>
      <div class="co-success-sub">We've received your payment proof and are verifying it. Your plan activates within <strong>${escapeHtml((_coState.manual && _coState.manual.verify_time) || '2-5 minutes')}</strong>. You'll get a notification + email once approved.</div>
      <button class="co-pay-btn" onclick="coGoDashboard()" style="margin-top:20px"><i class="fas fa-arrow-right"></i> Go to Dashboard</button>
      <button class="co-success-secondary" onclick="coClose()">Close</button>
    </div>`;
}

function coChangeToolDuration(key) {
  _coState.toolDuration = key;
  coRenderToolCheckout(); // re-price the summary + total for the chosen term
}

function coChangePeriod(period) {
  _coState.period = period;
  // Re-validate coupon against new base if one is applied
  if (_coState.coupon) {
    _coState.coupon = null; // force re-apply since base changed
  }
  coRenderCheckout();
}

function coSelectMethod(method) {
  _coState.paymentMethod = method;
  // Method drives currency: Stripe = USD, Razorpay/Manual = INR
  const newCur = _coCurrencyForMethod(method === 'manual' ? 'razorpay' : method);
  if (newCur !== _coState.currency) {
    _coState.currency = newCur;
    _coState.coupon = null; // amounts changed currency
  }
  coRenderCheckout();
}

async function coApplyCoupon() {
  // If already applied → remove
  if (_coState.coupon) {
    _coState.coupon = null;
    coRenderCheckout();
    return;
  }
  const input = document.getElementById('coCouponInput');
  const msg = document.getElementById('coCouponMsg');
  const code = (input.value || '').trim().toUpperCase();
  if (!code) { msg.className = 'co-coupon-msg err'; msg.textContent = 'Enter a coupon code'; return; }

  const btn = document.getElementById('coCouponBtn');
  btn.disabled = true; btn.textContent = '…';
  try {
    const r = await api('/api/payment/validate-coupon', 'POST', { code, plan_key: _coState.planKey, period: _coState.period, currency: _coState.currency });
    _coState.coupon = { code: r.code, discount: r.discount, final_amount: r.final_amount };
    coRenderCheckout();
    setTimeout(() => {
      const m = document.getElementById('coCouponMsg');
      const sym = _coState.currency === 'USD' ? '$' : '₹';
      if (m) { m.className = 'co-coupon-msg ok'; m.textContent = `✓ Code applied — you saved ${sym}${_coFmt(r.discount)}`; }
    }, 0);
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Apply';
    msg.className = 'co-coupon-msg err';
    msg.textContent = err.message || 'Invalid coupon';
  }
}

function coRenderBilling() {
  const info = _coState.info;
  // Pre-fill from state (if returning from review) else from server billing
  const b = _coState.billing || info.billing || {};
  const savedName = (_coState.billing && _coState.billing.name) || info.user.name || '';
  const savedPhone = (_coState.billing && _coState.billing.phone) || b.phone || '';
  const body = document.getElementById('coBody');
  const indianStates = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands','Dadra and Nagar Haveli and Daman and Diu','Lakshadweep'];
  const stateOpts = ['<option value="">State *</option>'].concat(
    indianStates.map(s => `<option value="${s}" ${b.state === s ? 'selected' : ''}>${s}</option>`)
  ).join('');

  body.innerHTML = `
    ${_coStepper(1)}

    <div class="co-section-label"><i class="fas fa-user"></i> Billing Information</div>
    <div class="co-field-row">
      <div class="co-field"><input class="co-input" id="coName" placeholder="Full name *" value="${escapeHtml(savedName)}"></div>
      <div class="co-field"><input class="co-input" id="coEmail" placeholder="Email *" value="${escapeHtml(info.user.email || '')}" readonly></div>
    </div>
    <div class="co-field"><input class="co-input" id="coPhone" placeholder="Phone (optional)" value="${escapeHtml(savedPhone)}"></div>
    <div class="co-field"><input class="co-input" id="coAddr1" placeholder="Address line 1 *" value="${escapeHtml(b.address1 || '')}"></div>
    <div class="co-field"><input class="co-input" id="coAddr2" placeholder="Address line 2 (optional)" value="${escapeHtml(b.address2 || '')}"></div>
    <div class="co-field">
      <select class="co-select" id="coCountry" onchange="coCountryChanged()">${_coCountryOpts(b.country || 'India')}</select>
    </div>
    <div class="co-field-row">
      <div class="co-field"><input class="co-input" id="coCity" placeholder="City *" value="${escapeHtml(b.city || '')}"></div>
      <div class="co-field" id="coStateWrap"></div>
      <div class="co-field"><input class="co-input" id="coPin" placeholder="ZIP / Postal *" value="${escapeHtml(b.postal_code || '')}"></div>
    </div>

    <button class="co-gst-toggle" onclick="coToggleGst()"><i class="fas fa-building" id="coGstIcon"></i> <span id="coGstLabel">Add Business / GST Details</span></button>
    <div class="co-gst-fields" id="coGstFields">
      <div class="co-field"><input class="co-input" id="coCompany" placeholder="Company name (optional)" value="${escapeHtml(b.company_name || '')}"></div>
      <div class="co-field"><input class="co-input" id="coGstin" placeholder="GSTIN (optional)" value="${escapeHtml(b.gstin || '')}"></div>
    </div>

    <button class="co-pay-btn" id="coPayBtn" onclick="coGoToReview()">
      Continue to Review <i class="fas fa-arrow-right"></i>
    </button>
    <div class="co-footer-note"><i class="fas fa-shield-halved"></i> Your details are encrypted and secure</div>
  `;
  if (b.company_name || b.gstin) coToggleGst();
  _coRenderStateField(b.state || '');  // build the state field based on selected country
}

// Country options — India + common international, with the rest grouped
// Full list of countries (ISO, as of 2026). India + popular pinned to top, then the rest A–Z.
const _CO_TOP = ['India','United States','United Kingdom','Canada','Australia','United Arab Emirates','Singapore'];
const _CO_ALL = ['Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo (Brazzaville)','Congo (Kinshasa)','Costa Rica','Croatia','Cuba','Cyprus','Czechia','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'];
function _coCountryOpts(selected) {
  const sel = selected || '';
  const rest = _CO_ALL.filter(c => !_CO_TOP.includes(c));
  const opt = c => `<option value="${c}" ${sel === c ? 'selected' : ''}>${c}</option>`;
  return '<option value="">Country *</option>'
    + _CO_TOP.map(opt).join('')
    + '<option disabled>──────────</option>'
    + rest.map(opt).join('');
}

// Render the State field — dropdown for India, free text for other countries
function _coRenderStateField(currentState) {
  const wrap = document.getElementById('coStateWrap');
  if (!wrap) return;
  const country = document.getElementById('coCountry')?.value || '';
  if (country === 'India') {
    const indianStates = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands','Dadra and Nagar Haveli and Daman and Diu','Lakshadweep'];
    wrap.innerHTML = `<select class="co-select" id="coStateSel">` +
      ['<option value="">State *</option>'].concat(indianStates.map(s => `<option value="${s}" ${currentState === s ? 'selected' : ''}>${s}</option>`)).join('') +
      `</select>`;
  } else {
    wrap.innerHTML = `<input class="co-input" id="coStateSel" placeholder="State / Province *" value="${escapeHtml(currentState || '')}">`;
  }
}

function coCountryChanged() {
  _coRenderStateField(''); // reset state field (India dropdown vs free text) when country changes
  // Currency is driven by payment method (chosen on the review step), not country.
}

// Step 1 → 2: validate billing, save to state, go to review
function coGoToReview() {
  const name = document.getElementById('coName')?.value.trim();
  const addr1 = document.getElementById('coAddr1')?.value.trim();
  const city = document.getElementById('coCity')?.value.trim();
  const country = document.getElementById('coCountry')?.value;
  const state = document.getElementById('coStateSel')?.value;
  const pin = document.getElementById('coPin')?.value.trim();
  if (!name) { toast('Please enter your full name', 'error'); return; }
  if (!country) { toast('Please select your country', 'error'); return; }
  if (!addr1 || !city || !state || !pin) {
    toast('Please fill all required billing fields (*)', 'error');
    return;
  }
  _coState.billing = {
    name,
    email: _coState.info.user.email,
    phone: document.getElementById('coPhone')?.value.trim() || '',
    ..._coCollectBilling(),
  };
  _coState.step = 'review';
  coRender();
}

function coBackToBilling() {
  _coState.step = 'billing';
  coRenderBilling();
}

function coToggleGst() {
  const f = document.getElementById('coGstFields');
  const lbl = document.getElementById('coGstLabel');
  const icon = document.getElementById('coGstIcon');
  if (f.classList.contains('show')) {
    f.classList.remove('show');
    lbl.textContent = 'Add Business / GST Details';
    icon.className = 'fas fa-building';
  } else {
    f.classList.add('show');
    lbl.textContent = 'Hide Business / GST Details';
    icon.className = 'fas fa-chevron-up';
  }
}

function _coCollectBilling() {
  return {
    address1: document.getElementById('coAddr1')?.value.trim() || '',
    address2: document.getElementById('coAddr2')?.value.trim() || '',
    country: document.getElementById('coCountry')?.value || 'India',
    city: document.getElementById('coCity')?.value.trim() || '',
    state: document.getElementById('coStateSel')?.value || '',
    postal_code: document.getElementById('coPin')?.value.trim() || '',
    company_name: document.getElementById('coCompany')?.value.trim() || '',
    gstin: document.getElementById('coGstin')?.value.trim() || '',
  };
}

async function coPayNow() {
  // ── GT Credits pack ──────────────────────────────────────────────────────
  if (_coState.itemType === 'credits') { return coPayCredits(); }
  if (_coState.itemType === 'tool') { return coPayTool(); }

  if (_coState.paymentMethod === 'manual') {
    coRenderManual();
    return;
  }
  // Billing was collected + validated in step 1 (coGoToReview)
  const bs = _coState.billing;
  if (!bs) { coBackToBilling(); return; }

  // Stripe — international USD: create a Checkout Session and redirect
  if (_coState.paymentMethod === 'stripe') {
    const billingS = {
      address1: bs.address1, address2: bs.address2, country: bs.country,
      city: bs.city, state: bs.state, postal_code: bs.postal_code,
      company_name: bs.company_name, gstin: bs.gstin,
    };
    const sbtn = document.getElementById('coPayBtn');
    const sorig = sbtn.innerHTML; sbtn.disabled = true; sbtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting to Stripe…';
    try {
      const r = await api('/api/payment/stripe/create-session', 'POST', {
        plan_key: _coState.planKey, period: _coState.period,
        coupon_code: _coState.coupon ? _coState.coupon.code : '', item_type: 'plan', billing: billingS,
      });
      if (r.url) {
        // Remember what we expected + the plan BEFORE leaving, to verify honestly on return
        try {
          sessionStorage.setItem('gt_stripe_pending', JSON.stringify({
            planKey: _coState.planKey, planName: _coState.planName,
            prevPlan: (currentUser && currentUser.plan) || 'free',
          }));
        } catch {}
        window.location.href = r.url; return;
      }
      throw new Error('No checkout URL');
    } catch (err) {
      sbtn.disabled = false; sbtn.innerHTML = sorig;
      toast('Stripe checkout failed: ' + (err.message || 'try again'), 'error');
      return;
    }
  }
  const name = bs.name;
  const billing = {
    address1: bs.address1, address2: bs.address2, country: bs.country,
    city: bs.city, state: bs.state, postal_code: bs.postal_code,
    company_name: bs.company_name, gstin: bs.gstin,
  };
  const btn = document.getElementById('coPayBtn');
  const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating order…';

  let orderData;
  try {
    orderData = await api('/api/payment/razorpay/create-order', 'POST', {
      plan_key: _coState.planKey,
      period: _coState.period,
      coupon_code: _coState.coupon ? _coState.coupon.code : '',
      billing,
    });
  } catch (err) {
    toast('Could not start payment: ' + (err.message || 'Server error'), 'error');
    btn.disabled = false; btn.innerHTML = orig;
    return;
  }

  // Load Razorpay JS if needed
  if (!window.Razorpay) {
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    } catch {
      toast('Could not load payment gateway. Check your connection.', 'error');
      btn.disabled = false; btn.innerHTML = orig;
      return;
    }
  }

  btn.disabled = false; btn.innerHTML = orig;

  const options = {
    key: orderData.key_id,
    amount: orderData.amount,
    currency: 'INR',
    order_id: orderData.order_id,
    name: 'GraphicoToolz',
    description: `${orderData.plan_name} Plan — ${orderData.period}`,
    image: 'https://graphicotoolz.com/app/img/logo.png',
    prefill: { name, email: _coState.info.user.email, contact: (_coState.billing && _coState.billing.phone) || '' },
    theme: { color: '#7c3aed' },
    modal: {
      ondismiss: function () { toast('Payment cancelled. You can retry anytime.', 'info'); },
      escape: true, backdropclose: false,
    },
    handler: function (response) {
      _coExpectingPayment = null;
      _coAfterPayment(_coState.planKey, orderData.plan_name);
    },
  };

  // Safety net: if Razorpay's redirect/popup quirk means the handler never fires
  // (common in test mode), detect activation when the user returns to our tab.
  _coExpectingPayment = { planKey: _coState.planKey, planName: orderData.plan_name };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (resp) {
    _coExpectingPayment = null;
    toast('Payment failed: ' + (resp.error?.description || 'Please try again.'), 'error');
  });
  rzp.open();
}

// ── Pay for a GT Credits pack (Razorpay INR / Stripe USD) ───────────────────
let _coCreditsBalance = null;   // balance captured before purchase (to detect the top-up)
let _coExpectingCredits = null; // safety-net watcher state
async function coPayCredits() {
  const bs = _coState.billing;
  if (!bs) { coBackToBilling(); return; }
  const billing = {
    address1: bs.address1, address2: bs.address2, country: bs.country,
    city: bs.city, state: bs.state, postal_code: bs.postal_code,
    company_name: bs.company_name, gstin: bs.gstin,
  };
  const btn = document.getElementById('coPayBtn');
  const orig = btn ? btn.innerHTML : '';

  // Stripe (USD) — redirect to Checkout
  if (_coState.paymentMethod === 'stripe') {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting to Stripe…'; }
    try {
      const r = await api('/api/payment/stripe/create-session', 'POST', { item_type: 'credits', pack_id: _coState.pack.id, billing });
      if (r.url) {
        try { sessionStorage.setItem('gt_stripe_pending', JSON.stringify({ itemType: 'credits', credits: _coState.pack.credits, prevCredits: (_coCreditsBalance != null ? _coCreditsBalance : 0), packName: _coState.pack.name })); } catch {}
        window.location.href = r.url; return;
      }
      throw new Error('No checkout URL');
    } catch (err) { if (btn) { btn.disabled = false; btn.innerHTML = orig; } toast('Stripe checkout failed: ' + (err.message || 'try again'), 'error'); return; }
  }

  // Razorpay (INR)
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating order…'; }
  let orderData;
  try {
    orderData = await api('/api/payment/razorpay/create-credit-order', 'POST', { pack_id: _coState.pack.id, billing });
  } catch (err) { if (btn) { btn.disabled = false; btn.innerHTML = orig; } toast('Could not start payment: ' + (err.message || 'Server error'), 'error'); return; }
  if (!window.Razorpay) {
    try { await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
    catch { if (btn) { btn.disabled = false; btn.innerHTML = orig; } toast('Could not load payment gateway.', 'error'); return; }
  }
  if (btn) { btn.disabled = false; btn.innerHTML = orig; }
  const options = {
    key: orderData.key_id, amount: orderData.amount, currency: 'INR', order_id: orderData.order_id,
    name: 'GraphicoToolz', description: `${orderData.credits} GT Credits`,
    image: 'https://graphicotoolz.com/app/img/logo.png',
    prefill: { name: orderData.user_name, email: orderData.user_email, contact: (bs.phone || '') },
    theme: { color: '#f59e0b' },
    modal: { ondismiss: function () { toast('Payment cancelled. You can retry anytime.', 'info'); }, escape: true, backdropclose: false },
    handler: function () { _coExpectingCredits = null; _coAfterPaymentCredits(orderData.credits); },
  };
  _coExpectingCredits = { credits: orderData.credits, prev: (_coCreditsBalance != null ? _coCreditsBalance : 0) };
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (resp) { _coExpectingCredits = null; toast('Payment failed: ' + (resp.error?.description || 'Please try again.'), 'error'); });
  rzp.open();
}

function _coAfterPaymentCredits(addedCredits) {
  _coState.step = 'processing';
  const body = document.getElementById('coBody');
  body.innerHTML = `
    <div class="co-processing">
      <div class="co-spinner-ring"></div>
      <div class="co-proc-title">Confirming your payment…</div>
      <div class="co-proc-sub">Adding ${Number(addedCredits).toLocaleString()} credits to your account.</div>
    </div>`;
  const baseline = (_coCreditsBalance != null ? _coCreditsBalance : 0);
  let attempts = 0;
  const poll = setInterval(async () => {
    attempts++;
    try {
      const d = await api('/api/user/credits');
      if (d && typeof d.balance === 'number' && d.balance > baseline) {
        clearInterval(poll);
        _coCreditsBalance = d.balance;
        if (typeof prLoadUserCredits === 'function') prLoadUserCredits();
        if (typeof _aigLoadCredits === 'function') _aigLoadCredits();
        _coShowCreditsSuccess(d.balance, addedCredits);
      }
    } catch {}
    if (attempts >= 20) { clearInterval(poll); _coShowCreditsPending(addedCredits); }
  }, 1000);
}

function _coShowCreditsSuccess(balance, added) {
  _coState.step = 'success';
  document.getElementById('coBody').innerHTML = `
    <div class="co-success">
      <div class="co-success-check" style="color:#f59e0b"><i class="fas fa-coins"></i></div>
      <div class="co-success-title">Credits Added! 🪙</div>
      <div class="co-success-sub">${Number(added).toLocaleString()} credits added. Your balance is now <strong>${Number(balance).toLocaleString()}</strong>.</div>
      <button class="co-pay-btn" onclick="coClose()" style="margin-top:20px"><i class="fas fa-check"></i> Done</button>
    </div>`;
}

function _coShowCreditsPending(added) {
  _coState.step = 'success';
  document.getElementById('coBody').innerHTML = `
    <div class="co-success">
      <div class="co-success-check" style="color:#f59e0b"><i class="fas fa-clock"></i></div>
      <div class="co-success-title">Payment received ⏳</div>
      <div class="co-success-sub">Your ${Number(added).toLocaleString()} credits are being added — this usually takes a few seconds. Refresh if they don't appear shortly. If the payment failed, you were not charged.</div>
      <button class="co-pay-btn" onclick="coClose()" style="margin-top:20px">Close</button>
    </div>`;
}

async function _coCheckPendingCredits() {
  if (!_coExpectingCredits || !userToken) return;
  const exp = _coExpectingCredits;
  try {
    const d = await api('/api/user/credits');
    if (d && typeof d.balance === 'number' && d.balance > (exp.prev || 0)) {
      _coExpectingCredits = null;
      const overlay = document.getElementById('checkoutOverlay'); if (overlay) overlay.classList.remove('hidden'); document.body.style.overflow = 'hidden';
      _coCreditsBalance = d.balance;
      if (typeof prLoadUserCredits === 'function') prLoadUserCredits();
      if (typeof _aigLoadCredits === 'function') _aigLoadCredits();
      _coShowCreditsSuccess(d.balance, exp.credits);
    }
  } catch {}
}

// Safety-net watcher — if user paid but handler didn't fire, catch it on tab refocus
let _coExpectingPayment = null;
async function _coCheckPendingPayment() {
  if (!_coExpectingPayment || !userToken) return;
  const expecting = _coExpectingPayment;
  try {
    const profile = await api('/api/user/profile');
    if (profile && profile.plan === expecting.planKey) {
      _coExpectingPayment = null;
      // Make sure modal is open to show success
      const overlay = document.getElementById('checkoutOverlay');
      if (overlay) overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      if (currentUser) currentUser.plan = expecting.planKey;
      localStorage.setItem('gt_plan', expecting.planKey);
      if (typeof loadTools === 'function') loadTools();
      if (typeof updateAuthUI === 'function') updateAuthUI();
      if (typeof prRenderPlans === 'function') prRenderPlans();
      if (typeof prLoadUserCredits === 'function') prLoadUserCredits();
      _coShowSuccess(profile, expecting.planName);
    }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { _coCheckPendingPayment(); _coCheckPendingCredits(); } });
window.addEventListener('focus', () => { _coCheckPendingPayment(); _coCheckPendingCredits(); });

// After payment — show processing screen in modal, poll for webhook activation, then success
function _coAfterPayment(planKey, planName) {
  _coState.step = 'processing';
  const body = document.getElementById('coBody');
  body.innerHTML = `
    <div class="co-processing">
      <div class="co-spinner-ring"></div>
      <div class="co-proc-title">Confirming your payment…</div>
      <div class="co-proc-sub">Please don't close this window. Activating your ${escapeHtml(planName)} plan.</div>
    </div>`;

  let attempts = 0;
  const poll = setInterval(async () => {
    attempts++;
    try {
      const profile = await api('/api/user/profile');
      if (profile && profile.plan === planKey) {
        clearInterval(poll);
        if (currentUser) currentUser.plan = planKey;
        localStorage.setItem('gt_plan', planKey);
        if (typeof loadTools === 'function') loadTools();
        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof prRenderPlans === 'function') prRenderPlans();
        if (typeof prLoadUserCredits === 'function') prLoadUserCredits();
        _coShowSuccess(profile, planName);
      }
    } catch {}
    if (attempts >= 20) {
      clearInterval(poll);
      // Webhook hasn't confirmed yet — show an honest "verifying" state, not false success
      _coShowPending(planName);
    }
  }, 1000);
}

// Shown when payment went through on the gateway but our webhook hasn't activated the plan yet
function _coShowPending(planName) {
  _coState.step = 'success'; // lock modal from accidental close
  const body = document.getElementById('coBody');
  body.innerHTML = `
    <div class="co-success">
      <div class="co-success-check" style="color:#f59e0b"><i class="fas fa-clock"></i></div>
      <div class="co-success-title">Verifying your payment…</div>
      <div class="co-success-sub">If your payment succeeded, your <strong>${escapeHtml(planName)}</strong> plan activates within a minute. If it failed, you were <strong>not charged</strong>. You can refresh your dashboard to check.</div>
      <button class="co-pay-btn" onclick="coGoDashboard()" style="margin-top:20px"><i class="fas fa-arrow-right"></i> Go to Dashboard</button>
      <button class="co-success-secondary" onclick="coClose()">Close</button>
    </div>`;
}

function _coShowSuccess(profile, planName) {
  _coState.step = 'success';
  const body = document.getElementById('coBody');
  let daysLine = '';
  if (profile && profile.plan_expires_at) {
    const exp = new Date(profile.plan_expires_at);
    const days = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400000));
    const expStr = exp.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    daysLine = `
      <div class="co-success-stats">
        <div class="co-success-stat"><span class="co-ss-num">${days}</span><span class="co-ss-lbl">Days Active</span></div>
        <div class="co-success-stat"><span class="co-ss-num">${expStr}</span><span class="co-ss-lbl">Renews / Expires</span></div>
      </div>`;
  }
  body.innerHTML = `
    <div class="co-success">
      <div class="co-success-check"><i class="fas fa-circle-check"></i></div>
      <div class="co-success-title">Payment Successful! 🎉</div>
      <div class="co-success-sub">Your <strong>${escapeHtml(planName)}</strong> plan is now active. A confirmation invoice has been emailed to you.</div>
      ${daysLine}
      <button class="co-pay-btn" onclick="coGoDashboard()" style="margin-top:20px">
        <i class="fas fa-arrow-right"></i> Go to Dashboard
      </button>
      <button class="co-success-secondary" onclick="coClose()">Stay on this page</button>
    </div>`;
  // Confetti if available
  if (typeof launchConfettiBurst === 'function') { try { launchConfettiBurst(160); } catch {} }
}

function coGoDashboard() {
  coClose();
  if (typeof showPage === 'function') showPage('home');
  else window.location.href = '/app';
}

// Close on overlay backdrop click (but not during processing/success)
document.addEventListener('click', function (e) {
  const overlay = document.getElementById('checkoutOverlay');
  if (e.target === overlay && _coState.step !== 'processing' && _coState.step !== 'success') coClose();
});
