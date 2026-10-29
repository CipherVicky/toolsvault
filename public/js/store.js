/* ============ STORE (manually-fulfilled products) ============
   Nothing here is delivered automatically. Placing an order writes a row on our
   side FIRST and only then offers WhatsApp — so if the handoff fails (no
   WhatsApp Web, tab closed, message never sent) the order and the customer's
   number still exist and we can follow up. The WhatsApp link is a convenience,
   never the mechanism. */

let _stProducts = [], _stLoaded = false, _stCat = 'All', _stCur = null, _stSel = {}, _stQty = 1;
let _stWa = null;   // support WhatsApp number, from settings (admin-managed)

function stMoney(n, cur) {
  const sym = cur === 'USD' ? '$' : '₹';
  const v = (cur === 'USD' && n % 1 !== 0) ? n.toFixed(2) : Number(n).toLocaleString('en-IN');
  return sym + v;
}
const _stCurrency = () => (localStorage.getItem('gt_currency') === 'USD' ? 'USD' : 'INR');

// ₹/$ switch — shares the same gt_currency key as the pricing page, so a
// customer's choice follows them across the whole site.
function _stCurToggle() {
  const c = _stCurrency();
  return `<div class="st-cur">
    <button class="st-cur-btn${c === 'INR' ? ' on' : ''}" data-cur="INR" onclick="stSetCurrency('INR')">₹ INR</button>
    <button class="st-cur-btn${c === 'USD' ? ' on' : ''}" data-cur="USD" onclick="stSetCurrency('USD')">$ USD</button>
  </div>`;
}
function stSetCurrency(cur) {
  localStorage.setItem('gt_currency', cur === 'USD' ? 'USD' : 'INR');
  document.querySelectorAll('.st-cur-btn').forEach(b => b.classList.toggle('on', b.dataset.cur === _stCurrency()));
  // Re-price whatever is on screen, keeping the customer's place.
  if (document.getElementById('stGrid')) stRenderList();
  if (_stCur && document.getElementById('stOpts')) { _stRenderOptCards(); stTotal(); }
}

async function stLoad(force) {
  const host = document.getElementById('storeView');
  if (!host) return;
  if (_stLoaded && !force) { stRenderGrid(); return; }
  host.innerHTML = '<div class="st-empty"><i class="fas fa-spinner fa-spin fa-lg"></i></div>';
  try {
    const d = await api('/api/store/products');
    _stProducts = d.products || [];
    _stLoaded = true;
    // Cached once: the success screen offers this as the "continue on WhatsApp"
    // link. If it isn't configured the button is simply omitted — the order is
    // already saved either way.
    if (_stWa === null) {
      try { const s = await api('/api/settings/support-widgets'); _stWa = (s && s.whatsapp_number) ? String(s.whatsapp_number) : ''; }
      catch (e) { _stWa = ''; }
    }
    stRenderGrid();
  } catch (e) {
    host.innerHTML = '<div class="st-empty"><div class="e1">Couldn\'t load the store</div><div>Please refresh and try again.</div></div>';
  }
}

function _stStock(p) {
  if (p.on_request) return '<span class="st-stock quote"><span class="dot"></span>Quoted after a chat</span>';
  if (p.stock === -1) return '<span class="st-stock"><span class="dot"></span>Available</span>';
  if (p.stock === 0)  return '<span class="st-stock out"><span class="dot"></span>Out of stock</span>';
  if (p.stock <= 3)   return `<span class="st-stock low"><span class="dot"></span>Only ${p.stock} left</span>`;
  return '<span class="st-stock"><span class="dot"></span>In stock</span>';
}
function _stThumb(p, big) {
  return p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" alt="" onerror="this.replaceWith(document.createTextNode('📦'))">`
    : '📦';
}

function stRenderGrid() {
  const host = document.getElementById('storeView');
  if (!host) return;
  const cur = _stCurrency();
  const cats = ['All', ...new Set(_stProducts.map(p => p.category || 'Other'))];

  host.innerHTML = `
    <div class="st-hero">
      <div>
        <span class="st-eyebrow"><i class="fas fa-bag-shopping"></i> Store</span>
        <h1>Things we set up for you, personally.</h1>
        <p>One-off purchases that sit outside your plan — licence keys, upgrades and services we arrange by hand. Order here and we'll take it from there.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:11px;align-items:flex-end">
        ${_stCurToggle()}
        <div style="display:flex;gap:9px">
          <div class="st-stat"><div class="v">${_stProducts.length}</div><div class="l">Products</div></div>
          <div class="st-stat"><div class="v">&lt;6h</div><div class="l">Typical reply</div></div>
        </div>
      </div>
    </div>
    <div class="st-bar">
      <div class="st-search"><i class="fas fa-search" style="color:var(--text-3);font-size:13px"></i>
        <input id="stQ" placeholder="Search the store…" oninput="stRenderList()"></div>
      <select class="st-sort" id="stSort" onchange="stRenderList()">
        <option value="featured">Featured first</option>
        <option value="lo">Price: Low → High</option>
        <option value="hi">Price: High → Low</option>
        <option value="az">Name: A → Z</option>
      </select>
      <div class="st-cats">${cats.map(c => {
        const n = c === 'All' ? _stProducts.length : _stProducts.filter(p => (p.category || 'Other') === c).length;
        return `<div class="st-cat${c === _stCat ? ' on' : ''}" onclick="stSetCat('${escapeHtml(c).replace(/'/g, "\\'")}')">${escapeHtml(c)}<span class="n">${n}</span></div>`;
      }).join('')}</div>
    </div>
    <div class="st-grid" id="stGrid"></div>
    <div style="margin-top:34px;padding-top:24px;border-top:1px solid var(--st-line)">
      <div class="st-sech" style="margin-bottom:14px">Your orders</div>
      <div id="stMyOrders"><div style="color:var(--text-3);font-size:12.5px">Loading…</div></div>
    </div>`;
  stRenderList();
  stLoadMyOrders();
}

function stSetCat(c) { _stCat = c; stRenderGrid(); }

function stRenderList() {
  const grid = document.getElementById('stGrid');
  if (!grid) return;
  const cur = _stCurrency();
  const q = (document.getElementById('stQ')?.value || '').toLowerCase().trim();
  const sort = document.getElementById('stSort')?.value || 'featured';
  let list = _stProducts.filter(p =>
    (_stCat === 'All' || (p.category || 'Other') === _stCat) &&
    (!q || `${p.name} ${p.short_desc} ${p.category}`.toLowerCase().includes(q)));

  // Quote-only items have no comparable price, so they always sort to the END
  // — never "cheapest" or "dearest". Priced items compare on the CHEAPEST a
  // customer could actually pay (base + smallest option), so the card's "from"
  // and the sort agree with each other.
  const noPrice = p => !!p.on_request;
  const val = p => _stMinPrice(p, cur);
  const byPrice = dir => (a, b) => {
    if (noPrice(a) !== noPrice(b)) return noPrice(a) ? 1 : -1;
    if (noPrice(a)) return a.name.localeCompare(b.name);
    return dir * (val(a) - val(b));
  };
  if (sort === 'lo') list.sort(byPrice(1));
  else if (sort === 'hi') list.sort(byPrice(-1));
  else if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  else list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));

  grid.innerHTML = list.length ? list.map(p => {
    const out = !p.on_request && p.stock === 0;
    const price = p.on_request ? '<span class="req">Price on request</span>'
      : `<span class="v">${stMoney(val(p), cur)}</span><span class="u">from</span>`;
    return `<div class="st-card${p.is_featured ? ' feat' : ''}${out ? ' soldout' : ''}" ${out ? '' : `onclick="stOpen('${escapeHtml(p.slug)}')"`}>
      <div class="st-ph"><div class="st-phbox">${_stThumb(p)}${p.badge ? `<span class="st-tag">${escapeHtml(p.badge)}</span>` : ''}</div></div>
      <div class="st-b">
        <div class="st-c">${escapeHtml(p.category || 'Other')}</div>
        <div class="st-nm">${escapeHtml(p.name)}</div>
        <div class="st-ds">${escapeHtml(p.short_desc || '')}</div>
        <div class="st-prow"><div class="st-pr">${price}</div>${_stStock(p)}</div>
      </div></div>`;
  }).join('')
    // "Nothing here yet" and "your filter matched nothing" are different problems
    // — telling someone to clear filters they never set just reads as broken.
    : (_stProducts.length
      ? '<div class="st-empty"><div class="e1">Nothing matches that</div><div>Try another word, or clear the filters.</div></div>'
      : '<div class="st-empty"><div class="e1">The store is being stocked</div><div>Nothing listed yet — check back shortly.</div></div>');
}

// ── product detail ──────────────────────────────────────────────────────────
async function stOpen(slug) {
  const host = document.getElementById('storeView');
  host.innerHTML = '<div class="st-empty"><i class="fas fa-spinner fa-spin fa-lg"></i></div>';
  let p;
  try { p = await api('/api/store/products/' + encodeURIComponent(slug)); }
  catch (e) { host.innerHTML = '<div class="st-empty"><div class="e1">Product not found</div></div>'; return; }
  _stCur = p; _stSel = {}; _stQty = 1;
  (p.options || []).forEach(g => { _stSel[g.name] = (g.values || [])[0]; });
  const cur = _stCurrency();

  // Left = a clean brand hero with the logo held in a fixed squircle (like the
  // tools page) instead of the image stretched to fill a big panel.
  // Right = everything to decide + buy, in a clear top-to-bottom order.
  const logoInner = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" alt="" onerror="this.parentNode.innerHTML='📦'">`
    : '📦';
  const descLong = (p.description || '').length > 260;
  const hasOpts = (p.options || []).length > 0;

  host.innerHTML = `
    <div class="st-crumb-row">
      <div class="st-crumb"><b onclick="stLoad()">← Store</b> / ${escapeHtml(p.name)}</div>
    </div>
    <div class="st-det">
      <div class="st-hero">
        <div class="st-hero-glow"></div>
        <div class="st-logo">${logoInner}</div>
        <div class="st-hero-name">${escapeHtml(p.name)}</div>
        <div class="st-hero-cat">${escapeHtml(p.category || 'Other')}</div>
        ${p.badge ? `<span class="st-hero-badge">${escapeHtml(p.badge)}</span>` : ''}
      </div>

      <div class="st-glass st-dp">
        <div class="st-dtop">
          <span class="st-dcat">${escapeHtml(p.category || 'Other')}</span>
          <div class="st-dtop-right">${p.on_request ? '' : _stCurToggle()}${_stStock(p)}</div>
        </div>
        <div class="st-title">${escapeHtml(p.name)}</div>

        ${p.description ? `<div class="st-desc-wrap">
          <div class="st-desc${descLong ? ' clamp' : ''}" id="stDesc">${escapeHtml(p.description)}</div>
          ${descLong ? `<button class="st-readmore" id="stReadMore" onclick="stToggleDesc()">Read more ▾</button>` : ''}
        </div>` : ''}

        ${(p.points || []).length ? `<div class="st-sec"><div class="st-sech">What you get</div>
          <ul class="st-pts">${p.points.map(t => `<li><span class="ck"><i class="fas fa-check"></i></span><span>${escapeHtml(t)}</span></li>`).join('')}</ul></div>` : ''}

        <div id="stOpts"></div>

        <!-- C — ticket: the order, a perforation, then the total to pay -->
        <div class="st-ticket">
          <div class="st-tk-top">
            <div class="st-tk-order">
              <div class="st-tk-lbl">Your order</div>
              <div class="st-tk-name">${escapeHtml(p.name)}</div>
              <div class="st-tk-pick" id="stPick"></div>
            </div>
            <div class="st-qty"><button id="stMinus" onclick="stQty(-1)">−</button><span class="n" id="stQN">1</span><button id="stPlus" onclick="stQty(1)">+</button></div>
          </div>
          <div class="st-ob-hint" id="stQHint"></div>
          <div class="st-perf"></div>
          <div class="st-tk-bot">
            <div><div class="st-tk-tl">Total to pay</div><div class="st-tk-sub" id="stSub"></div></div>
            <div class="st-tk-tv" id="stTotal"></div>
          </div>
        </div>

        ${p.terms ? `<div class="st-termsbox"><div class="st-termsh"><i class="fas fa-shield-halved"></i> What you're agreeing to</div><div class="st-termsbody">${escapeHtml(p.terms)}</div></div>` : ''}

        <label class="st-agree" id="stAgreeBox">
          <input type="checkbox" id="stAgree" onchange="stSyncBuy()">
          <span>I've read and <b>agree to the details${p.terms ? ', points and terms' : ' and points'} above</b> for this product.</span>
        </label>
        <button class="st-buy st-buy-gold" id="stBuy" disabled onclick="stCheckout()">${p.on_request ? 'Request a quote' : 'Reserve this order'}</button>
        <div class="st-hint">🔒 You get a reference instantly — then we message you to finish up.</div>
      </div>
    </div>`;

  _stRenderOptCards();
  stQty(0);
}

// Options: a clear "Choose ___" heading per group, each choice a card showing
// the label with its price effect. Split out so a currency switch can re-price
// the cards in place without resetting the customer's selection.
function _stRenderOptCards() {
  const p = _stCur, cur = _stCurrency();
  const host = document.getElementById('stOpts');
  if (!host) return;
  // Each choice shows its OWN price — "3 Months ₹350" — exactly what you pay if
  // you pick it. Nothing is added to it.
  host.innerHTML = (p.options || []).map((g, gi) => `
    <div class="st-sec"><div class="st-sech">Choose ${escapeHtml(g.name)}</div><div class="st-opts">
      ${(g.values || []).map((v, vi) => {
        const sel = _stSel[g.name];
        const on = sel ? sel.label === v.label : vi === 0;
        const d = cur === 'USD' ? (v.delta_usd || 0) : (v.delta_inr || 0);
        const dl = p.on_request ? '' : `<small>${d > 0 ? stMoney(d, cur) : 'included'}</small>`;
        return `<div class="st-o${on ? ' on' : ''}" onclick="stPick(${gi},${vi})"><span class="st-o-lbl">${escapeHtml(v.label)}</span>${dl}</div>`;
      }).join('')}</div></div>`).join('');
}

// Cheapest price a customer could actually pay — the smallest choice in each
// group (choices are absolute prices, not add-ons). This is what the grid's
// "from ₹X" shows. With no options, it's just the product's price.
function _stMinPrice(p, cur) {
  const opts = p.options || [];
  if (opts.length) {
    let v = 0;
    opts.forEach(g => {
      const ds = (g.values || []).map(x => cur === 'USD' ? (x.delta_usd || 0) : (x.delta_inr || 0));
      if (ds.length) v += Math.min(...ds);
    });
    return Math.max(0, v);
  }
  return Math.max(0, cur === 'USD' ? (p.price_usd || 0) : (p.price_inr || 0));
}

function stToggleDesc() {
  const d = document.getElementById('stDesc'), b = document.getElementById('stReadMore');
  if (!d) return;
  const open = d.classList.toggle('clamp') === false;
  if (b) b.textContent = open ? 'Show less ▴' : 'Read more ▾';
}

function stPick(gi, vi) {
  const g = _stCur.options[gi];
  _stSel[g.name] = g.values[vi];
  document.querySelectorAll('#stOpts .st-sec')[gi].querySelectorAll('.st-o').forEach((el, i) => el.classList.toggle('on', i === vi));
  stTotal();
}
function stQty(d) {
  const p = _stCur;
  const max = Math.max(1, Math.min(p.max_qty || 5, p.stock === -1 ? (p.max_qty || 5) : p.stock));
  _stQty = Math.max(1, Math.min(max, _stQty + d));
  document.getElementById('stQN').textContent = _stQty;
  document.getElementById('stMinus').disabled = _stQty <= 1;
  document.getElementById('stPlus').disabled = _stQty >= max;
  document.getElementById('stQHint').textContent = _stQty >= max ? 'Maximum for this product' : `Up to ${max} per order`;
  stTotal();
}
function _stUnit() {
  const p = _stCur, cur = _stCurrency();
  if (p.on_request) return null;
  const opts = p.options || [];
  // Each choice carries its OWN price — it is never added to the base. So a
  // product WITH options is priced entirely by what's chosen (3 Months = ₹350,
  // full stop). The base price is only the price of a product that has no
  // options at all. Multiple groups add their chosen prices together.
  if (opts.length) {
    let v = 0;
    opts.forEach(g => { const s = _stSel[g.name]; if (s) v += Number(cur === 'USD' ? (s.delta_usd || 0) : (s.delta_inr || 0)) || 0; });
    return Math.max(0, v);
  }
  return Math.max(0, cur === 'USD' ? (p.price_usd || 0) : (p.price_inr || 0));
}
function stTotal() {
  const cur = _stCurrency(), u = _stUnit(), p = _stCur;
  const totalEl = document.getElementById('stTotal');
  const subEl = document.getElementById('stSub');
  const pickEl = document.getElementById('stPick');
  // the chosen options, e.g. "6 Months" — shown in the ticket order line
  const chosen = (p.options || []).map(g => (_stSel[g.name] || {}).label).filter(Boolean);
  if (pickEl) pickEl.textContent = [chosen.join(' · '), 'Qty ' + _stQty].filter(Boolean).join(' · ');
  if (totalEl) totalEl.innerHTML = u == null ? '<span style="font-size:19px;color:var(--st-gold)">On request</span>' : stMoney(u * _stQty, cur);
  if (subEl) {
    subEl.textContent = u == null ? "We'll quote you after a quick chat"
      : (_stQty > 1 ? `${stMoney(u, cur)} each · ${_stQty}` : (chosen.length ? chosen.join(' · ') : 'Taxes may apply'));
  }
}
function stSyncBuy() {
  const ok = document.getElementById('stAgree').checked;
  document.getElementById('stBuy').disabled = !ok;
  document.getElementById('stAgreeBox').classList.toggle('ok', ok);
}

// ── checkout ────────────────────────────────────────────────────────────────
function stCheckout() {
  if (!currentUser) { openAuthModal(); return; }
  const p = _stCur, cur = _stCurrency(), u = _stUnit();
  const rows = (p.options || []).map(g => `<div class="st-row"><span>${escapeHtml(g.name)}</span><b>${escapeHtml((_stSel[g.name] || {}).label || '')}</b></div>`).join('');
  const phone = (currentUser && currentUser.phone) || '';
  const ov = document.getElementById('stOverlay');
  const body = document.getElementById('stBody');
  if (!ov || !body) { toast('Checkout unavailable', 'error'); return; }
  ov.classList.add('on');
  document.body.style.overflow = 'hidden';
  body.innerHTML = `
    <div class="st-step-head"><div class="st-eyebrow2">Step 1 of 2</div>
      <h3 class="st-mtitle">How should we reach you?</h3>
      <p class="st-msub">We finish this order with you personally — we just need a number that works.</p></div>
    <div class="st-sumbox">
      <div class="st-sumtop"><span class="st-sumic">📦</span><div><b>${escapeHtml(p.name)}</b><div class="st-mini">${escapeHtml(p.category || '')}</div></div></div>
      ${rows}<div class="st-row"><span>Quantity</span><b>${_stQty}</b></div>
      <div class="st-row st-tot"><span>Total</span><b>${u == null ? 'Price on request' : stMoney(u * _stQty, cur)}</b></div>
    </div>
    <div class="st-fld"><label>Your name</label><input class="st-inp" id="stName" value="${escapeHtml([currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || '')}"></div>
    <div class="st-fld"><label>WhatsApp number <span style="color:#fb7185">*</span></label>
      <div style="display:flex;gap:9px">
        <select class="st-inp" id="stCc" style="width:112px;flex-shrink:0">
          <option value="+91">🇮🇳 +91</option><option value="+20">🇪🇬 +20</option><option value="+971">🇦🇪 +971</option>
          <option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option><option value="+880">🇧🇩 +880</option><option value="+92">🇵🇰 +92</option>
        </select>
        <input class="st-inp" id="stPhone" inputmode="numeric" placeholder="70000 00000" value="${escapeHtml(phone)}">
      </div>
      <label style="display:flex;gap:9px;align-items:center;font-size:12.5px;color:var(--text-2);margin-top:9px;cursor:pointer">
        <input type="checkbox" id="stIsWa" checked style="width:16px;height:16px;accent-color:#25d366"> This number is on WhatsApp</label>
      <div class="st-mini" style="margin-top:7px">We only use this to complete your order.</div>
    </div>
    <div class="st-fld"><label>Anything we should know? <span class="st-mini">optional</span></label>
      <input class="st-inp" id="stNote" placeholder="e.g. need it before Friday"></div>
    <div class="st-actions">
      <button class="st-btn st-btn-ghost" onclick="stCloseCheckout()">Cancel</button>
      <button class="st-btn st-btn-primary" id="stPlace" onclick="stPlaceOrder()">Place order →</button>
    </div>`;
}
function stCloseCheckout() {
  const ov = document.getElementById('stOverlay');
  if (ov) ov.classList.remove('on');
  document.body.style.overflow = '';
}

async function stPlaceOrder() {
  const phoneEl = document.getElementById('stPhone');
  const digits = (phoneEl.value || '').replace(/\D/g, '');
  if (digits.length < 7) { phoneEl.style.borderColor = '#fb7185'; phoneEl.focus(); toast('A working phone number is required', 'error'); return; }
  const btn = document.getElementById('stPlace');
  btn.disabled = true; btn.textContent = 'Placing…';
  try {
    const sel = {};
    (_stCur.options || []).forEach(g => { const s = _stSel[g.name]; if (s) sel[g.name] = s.label; });
    const r = await api('/api/store/orders', 'POST', {
      slug: _stCur.slug, selections: sel, qty: _stQty,
      name: document.getElementById('stName').value,
      cc: document.getElementById('stCc').value, phone: digits,
      is_whatsapp: document.getElementById('stIsWa').checked,
      note: document.getElementById('stNote').value,
      currency: _stCurrency(),
    });
    stShowSuccess(r);
    _stLoaded = false;   // stock changed — refetch next time the grid opens
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Place order →';
    toast((e.data && e.data.message) || e.message || 'Could not place the order', 'error');
  }
}

function stShowSuccess(r) {
  const lines = Object.entries(r.selections || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  const msg = encodeURIComponent(
    `Hi! Order ${r.ref}\n${r.product}\n${lines}${lines ? '\n' : ''}Qty: ${r.qty}\nTotal: ${r.total == null ? 'Price on request' : stMoney(r.total, r.currency)}`);
  const wa = String(_stWa || '').replace(/\D/g, '');
  const body = document.getElementById('stBody');
  body.innerHTML = `
    <div class="st-step-head"><div class="st-eyebrow2">Step 2 of 2</div>
      <h3 class="st-mtitle">Order received</h3>
      <p class="st-msub">It's saved on our side — nothing more for you to do right now.</p></div>
    <div style="text-align:center;padding:6px 0 2px">
      <div class="st-okic">✓</div>
      <div class="st-mini" style="letter-spacing:.1em;text-transform:uppercase;font-weight:800">Your reference</div>
      <div class="st-ref">${escapeHtml(r.ref)}</div>
      <div style="font-size:13px;color:var(--text-2);line-height:1.65;margin-bottom:15px">
        We have your details and we'll message you on <b style="color:var(--text-1)">${escapeHtml(r.phone)}</b> shortly to finish up.</div>
      ${wa ? `<a class="st-wa" href="https://wa.me/${wa}?text=${msg}" target="_blank" rel="noopener">💬 Message us now on WhatsApp</a>` : ''}
      <div style="font-size:12px;color:var(--text-3);margin-top:14px;line-height:1.65">
        Prefer not to? No problem — the order is <b style="color:var(--text-2)">already logged</b> and we'll reach out.<br>
        Track it any time at the bottom of the <b style="color:var(--text-2)">Store</b> page.</div>
    </div>
    <div class="st-actions">
      <button class="st-btn st-btn-ghost" onclick="stCloseCheckout();stLoad(true)">Back to store</button>
      <button class="st-btn st-btn-primary" onclick="stCloseCheckout();stLoad(true)">Done</button>
    </div>`;
}

async function stLoadMyOrders() {
  const el = document.getElementById('stMyOrders');
  if (!el) return;
  if (!currentUser) { el.innerHTML = '<div style="color:var(--text-3);font-size:12.5px">Sign in to see your orders.</div>'; return; }
  try {
    const d = await api('/api/store/my-orders');
    const list = d.orders || [];
    if (!list.length) { el.innerHTML = '<div style="color:var(--text-3);font-size:12.5px">No orders yet — anything you buy here will show up in this list.</div>'; return; }
    el.innerHTML = list.map(o => {
      const sel = Object.entries(o.selections || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');
      return `<div class="st-ord">
        <span class="r">${escapeHtml(o.ref)}</span>
        <div class="p">${escapeHtml(o.product_name)}<div class="m">${escapeHtml(sel)}${sel ? ' · ' : ''}Qty ${o.qty} · ${gtTimeAgo(o.created_at)}</div></div>
        <div style="font-weight:800;color:var(--text-1);font-size:13.5px">${o.on_request ? 'Quote' : stMoney(o.total_price, o.currency)}</div>
        <span class="st-badge ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span>
      </div>`;
    }).join('');
  } catch (e) { el.innerHTML = ''; }
}
