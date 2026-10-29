/* GraphicoToolz — Affiliate dashboard (premium). api() is positional: api(url, method, body). */
let _af = null;            // cached /me
let _afLinks = null;       // cached links
let _afTab = 'overview';
let _afShowCreate = false;
let _afJoinCur = 'INR';
const _AF_TIER_ICONS = ['fa-seedling', 'fa-award', 'fa-trophy', 'fa-crown'];

function _afMoney(cur, n) { return (cur === 'USD' ? '$' : '₹') + Number(n || 0).toFixed(2); }
function _afCur() { return (_af && _af.payout_currency) || 'INR'; }
function _afEarn(cur) { cur = (cur || _afCur()).toLowerCase(); return (_af && _af.earnings && _af.earnings[cur]) || { total: 0, available: 0, pending: 0, paid: 0 }; }
function _afDate(s) { try { return new Date((s || '').replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }); } catch (e) { return s; } }
function afCopy(link) {
  navigator.clipboard.writeText(link).then(() => { if (typeof toast === 'function') toast('Link copied!', 'success'); })
    .catch(() => { if (typeof toast === 'function') toast('Copy failed', 'error'); });
}

async function afLoad() {
  const body = document.getElementById('afBody');
  if (!currentUser) {
    body.innerHTML = `<div class="af-card" style="text-align:center;padding:48px 24px">
      <i class="fas fa-handshake" style="font-size:40px;color:var(--af-emerald);margin-bottom:14px"></i>
      <h3 style="font-size:20px;margin-bottom:8px">Sign in to start earning</h3>
      <p style="color:var(--text-2);margin-bottom:18px">Join the GraphicoToolz affiliate program and earn cash on every sale you refer.</p>
      <a href="/login" class="af-btn af-btn-primary" style="text-decoration:none">Sign In</a></div>`;
    return;
  }
  body.innerHTML = `<div class="af-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</div>`;
  try { _af = await api('/api/affiliate/me'); }
  catch (e) { body.innerHTML = `<div class="af-empty">Could not load. Please retry.</div>`; return; }
  if (!_af.registered) afRenderJoin();
  else afRenderShell();
}

/* ── Join screen (with currency choice) ── */
function afRenderJoin() {
  const cfg = _af.config || {};
  const tiers = (cfg.tiers || []).map((t, i) =>
    `<div class="af-tier af-rev"><div class="pct">${t.rate}%</div><div class="nm">${t.name}</div>
      <div class="rq">${t.min === 0 ? 'Start here' : t.min + '+ sales'}</div></div>`).join('');
  const top = (cfg.tiers || []).slice(-1)[0] || { rate: 30 };
  document.getElementById('afBody').innerHTML = `
    <div class="af-hero af-rev">
      <span class="af-hero-chip"><i class="fas fa-bolt"></i> Affiliate Program</span>
      <h1>Refer once. <span class="g">Get paid for the sale.</span></h1>
      <p>Share your link. When someone buys a plan or a tool through it, you earn a one-time commission, paid out in <b>cash or crypto</b>. The more you sell, the higher your rate climbs — up to ${top.rate}%.</p>
      <div style="margin-top:20px;position:relative;z-index:1">
        <div style="font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:8px">Pay me in</div>
        <div class="af-curtoggle">
          <button class="${_afJoinCur === 'INR' ? 'active' : ''}" onclick="afSetJoinCur('INR')">₹ INR</button>
          <button class="${_afJoinCur === 'USD' ? 'active' : ''}" onclick="afSetJoinCur('USD')">$ USD</button>
        </div>
      </div>
      <div class="af-hero-cta">
        <button class="af-btn af-btn-primary" id="afJoinBtn" onclick="afRegister()"><i class="fas fa-rocket"></i> Activate my affiliate link</button>
      </div>
    </div>
    <div class="af-benefits">
      <div class="af-ben af-rev"><i class="fas fa-coins"></i><h4>Up to ${top.rate}% per sale</h4><p>One-time commission on every plan & individual tool you refer.</p></div>
      <div class="af-ben af-rev"><i class="fas fa-clock"></i><h4>${cfg.cookie_days || 60}-day tracking</h4><p>We remember your referral for ${cfg.cookie_days || 60} days — longer than most.</p></div>
      <div class="af-ben af-rev"><i class="fas fa-wallet"></i><h4>Cash & crypto payouts</h4><p>Withdraw to bank, UPI, PayPal — or crypto (USDT) anywhere in the world.</p></div>
      <div class="af-ben af-rev"><i class="fas fa-link"></i><h4>Custom links</h4><p>Create your own named links pointing to any page, each tracked separately.</p></div>
    </div>
    <h3 style="font-size:15px;margin:26px 0 4px;color:var(--text-1)">Your rate grows as you sell</h3>
    <div class="af-tiers">${tiers}</div>
    <p class="af-note" style="margin-top:14px">Commissions clear after a ${cfg.hold_days || 7}-day review window (for refunds). Self-referrals and fraudulent orders don't qualify. Buying GT credit packs doesn't earn commission. By joining you agree to the program terms.</p>`;
}
function afSetJoinCur(c) { _afJoinCur = c; afRenderJoin(); }

async function afRegister() {
  const btn = document.getElementById('afJoinBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activating…'; }
  try {
    await api('/api/affiliate/register', 'POST', { payout_currency: _afJoinCur });
    if (typeof toast === 'function') toast('Affiliate account activated! 🎉', 'success');
    _afTab = 'overview'; await afLoad();
  } catch (e) {
    if (typeof toast === 'function') toast('Could not activate. Try again.', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rocket"></i> Activate my affiliate link'; }
  }
}

/* ── Dashboard shell ── */
function afRenderShell() {
  const a = _af, t = a.tier || {};
  const noMethod = !a.payout_method;
  const warn = noMethod ? `<div class="af-warn"><i class="fas fa-circle-exclamation"></i>
    <div><b>No payout method set</b><p>You won't be able to receive payments until you set one up. <a onclick="afShowTab('settings')">Set up now →</a></p></div></div>` : '';
  document.getElementById('afBody').innerHTML = `
    <div class="af-top">
      <div>
        <h2>Affiliate Dashboard</h2>
        <div class="af-code-line">Code <span class="af-code-chip">${escapeHtml(a.code)}</span></div>
      </div>
      <div class="af-top-right">
        <span class="af-tierbadge"><i class="fas ${_AF_TIER_ICONS[(a.config.tiers||[]).findIndex(x=>x.name===t.name)] || 'fa-seedling'}"></i> ${t.name} • ${t.rate}%</span>
        <button class="af-refresh" onclick="afLoad()" title="Refresh"><i class="fas fa-rotate"></i></button>
      </div>
    </div>
    ${warn}
    <div class="af-tabs">
      ${['overview','links','transactions','payouts','settings'].map(tb =>
        `<button class="af-tab ${_afTab===tb?'active':''}" onclick="afShowTab('${tb}')">${({overview:'Overview',links:'Affiliate Links',transactions:'Transactions',payouts:'Payouts',settings:'Settings'})[tb]}</button>`).join('')}
    </div>
    <div id="afTabBody"></div>`;
  afShowTab(_afTab);
}

function afShowTab(tab) {
  _afTab = tab;
  // keep tab highlight in sync (covers calls from the warn-banner link)
  document.querySelectorAll('.af-tab').forEach((b, i) => b.classList.toggle('active', ['overview','links','transactions','payouts','settings'][i] === tab));
  if (tab === 'overview') afOverview();
  else if (tab === 'links') afLinksTab();
  else if (tab === 'transactions') afTransactions();
  else if (tab === 'payouts') afPayouts();
  else afSettings();
}

/* ── Overview ── */
function afOverview() {
  const a = _af, cur = _afCur(), e = _afEarn(), t = a.tier || {}, next = t.next;
  const prog = next ? Math.min(100, Math.round((t.conversions / next.min) * 100)) : 100;
  const baseLink = location.origin + '/ref/' + a.code;
  document.getElementById('afTabBody').innerHTML = `
    <div class="af-stats">
      <div class="af-stat af-rev"><div class="lbl">Total clicks</div><div class="val">${a.clicks || 0}</div><div class="sub">${a.clicks_today || 0} today</div></div>
      <div class="af-stat af-rev"><div class="lbl">Conversions</div><div class="val">${a.conversions || 0}</div><div class="sub">${t.conversions || 0} confirmed</div></div>
      <div class="af-stat hl af-rev"><div class="lbl">Available</div><div class="val">${_afMoney(cur, e.available)}</div><div class="sub">ready to withdraw</div></div>
      <div class="af-stat af-rev"><div class="lbl">Lifetime earned</div><div class="val">${_afMoney(cur, e.total)}</div><div class="sub">${_afMoney(cur, e.pending)} pending</div></div>
    </div>
    <div class="af-card af-rev">
      <div class="af-card-h"><h3><i class="fas fa-link"></i> Your main referral link</h3>
        <button class="af-ghostbtn" onclick="afShowTab('links')"><i class="fas fa-plus"></i> Create custom links</button></div>
      <div class="af-link"><div class="af-link-in" id="afBaseLink">${baseLink}</div>
        <button class="af-copy" onclick="afCopy('${baseLink}')"><i class="fas fa-copy"></i> Copy</button></div>
    </div>
    <div class="af-card af-rev">
      <div class="af-card-h"><h3><i class="fas fa-chart-line"></i> Tier progress</h3>
        <span class="af-pill approved">${t.name} • ${t.rate}%</span></div>
      <div class="af-bar"><div class="af-bar-fill" style="width:${prog}%"></div></div>
      <div class="af-prog-meta">
        <span>${t.conversions || 0} confirmed sales</span>
        <span>${next ? `${next.min - t.conversions} more → ${next.name} (${next.rate}%)` : '🏆 Top tier reached'}</span>
      </div>
    </div>`;
}

/* ── Affiliate Links ── */
async function afLinksTab() {
  const el = document.getElementById('afTabBody');
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin:4px 0 6px;flex-wrap:wrap">
      <p style="font-size:13px;color:var(--text-2)">Create named links to any page — each one tracks its own clicks, conversions and earnings.</p>
      <button class="af-btn af-btn-primary" onclick="afToggleCreate()"><i class="fas fa-plus"></i> Create New Link</button>
    </div>
    <div id="afCreateWrap"></div>
    <div id="afLinksList"><div class="af-empty"><i class="fas fa-spinner fa-spin"></i></div></div>`;
  if (_afShowCreate) afRenderCreate();
  try { _afLinks = await api('/api/affiliate/links'); } catch (e) { _afLinks = { links: [] }; }
  afRenderLinks();
}
function afToggleCreate() { _afShowCreate = !_afShowCreate; afRenderCreate(); }
function afRenderCreate() {
  const wrap = document.getElementById('afCreateWrap');
  if (!wrap) return;
  if (!_afShowCreate) { wrap.innerHTML = ''; return; }
  const targets = (_af.config && _af.config.targets) || { home: { label: 'Homepage' } };
  const opts = Object.keys(targets).map(k => `<option value="${k}">${escapeHtml(targets[k].label)}</option>`).join('');
  wrap.innerHTML = `
    <div class="af-card">
      <div class="af-create-head"><h3 style="font-size:15px;font-weight:800"><i class="fas fa-wand-magic-sparkles" style="color:var(--af-emerald)"></i> Create New Affiliate Link</h3></div>
      <div class="af-create-grid">
        <div class="af-field"><label>Link name</label><input id="afNewName" placeholder="e.g. Instagram bio, Blog CTA"></div>
        <div class="af-field"><label>Target page</label><select id="afNewTarget">${opts}</select></div>
      </div>
      <div class="af-create-actions">
        <button class="af-ghostbtn" onclick="afToggleCreate()">Cancel</button>
        <button class="af-btn af-btn-primary" id="afGenBtn" onclick="afCreateLink()"><i class="fas fa-bolt"></i> Generate Link</button>
      </div>
    </div>`;
}
async function afCreateLink() {
  const name = (document.getElementById('afNewName').value || '').trim();
  const target = document.getElementById('afNewTarget').value;
  const btn = document.getElementById('afGenBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…'; }
  try {
    await api('/api/affiliate/links', 'POST', { name, target });
    _afShowCreate = false;
    if (typeof toast === 'function') toast('Link created!', 'success');
    _afLinks = await api('/api/affiliate/links');
    afRenderCreate(); afRenderLinks();
  } catch (e) {
    if (typeof toast === 'function') toast((e && e.data && e.data.error) || 'Could not create link', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Link'; }
  }
}
function afRenderLinks() {
  const el = document.getElementById('afLinksList'); if (!el) return;
  const links = (_afLinks && _afLinks.links) || [];
  if (!links.length) { el.innerHTML = `<div class="af-empty-box"><i class="fas fa-link" style="font-size:22px;opacity:.5;display:block;margin-bottom:8px"></i>No custom links yet. Create one to start tracking by source.</div>`; return; }
  el.innerHTML = links.map(l => {
    const full = location.origin + l.url;
    const cur = l.currency === 'USD' ? '$' : '₹';
    return `<div class="af-link-card">
      <div class="af-link-top"><b>${escapeHtml(l.name)}</b><span class="af-link-target">${escapeHtml(l.target)}</span>
        <span class="af-link-date">${_afDate(l.created_at)}</span></div>
      <div class="af-link-urlrow"><span>${full}</span>
        <button class="af-iconbtn" onclick="afCopy('${full}')" title="Copy"><i class="fas fa-copy"></i></button>
        <button class="af-iconbtn" onclick="window.open('${full}','_blank')" title="Open"><i class="fas fa-arrow-up-right-from-square"></i></button>
        <button class="af-iconbtn danger" onclick="afDeleteLink(${l.id})" title="Delete"><i class="fas fa-trash"></i></button></div>
      <div class="af-link-stats">
        <div class="af-mini"><div class="n">${l.clicks}</div><div class="l">Clicks</div></div>
        <div class="af-mini"><div class="n">${l.conversions}</div><div class="l">Conversions</div></div>
        <div class="af-mini"><div class="n">${cur}${Number(l.earned).toFixed(0)}</div><div class="l">Earned</div></div>
      </div></div>`;
  }).join('');
}
async function afDeleteLink(id) {
  if (!confirm('Delete this link? Its click history stays but the URL stops working.')) return;
  try { await api('/api/affiliate/links/' + id, 'DELETE'); _afLinks = await api('/api/affiliate/links'); afRenderLinks(); }
  catch (e) { if (typeof toast === 'function') toast('Could not delete', 'error'); }
}

/* ── Transactions ── */
async function afTransactions() {
  const el = document.getElementById('afTabBody');
  el.innerHTML = `<div class="af-card"><div class="af-empty"><i class="fas fa-spinner fa-spin"></i></div></div>`;
  let rows = [];
  try { rows = await api('/api/affiliate/conversions'); } catch (e) {}
  if (!rows.length) { el.innerHTML = `<div class="af-card"><div class="af-empty">No referred sales yet. Share your link to get started! 🚀</div></div>`; return; }
  const body = rows.map(r => {
    const cur = r.currency === 'USD' ? '$' : '₹';
    return `<tr><td>${_afDate(r.created_at)}</td>
      <td><span class="af-pill ${r.item_type==='plan'?'approved':'paid'}" style="text-transform:capitalize">${r.item_type}</span> ${escapeHtml(r.item_name || '')}</td>
      <td>${cur}${r.sale_amount.toFixed(2)}</td><td>${r.rate}%</td>
      <td style="font-weight:800;color:#34d399">${cur}${r.commission.toFixed(2)}</td>
      <td><span class="af-pill ${r.status}">${r.status}</span></td></tr>`;
  }).join('');
  el.innerHTML = `<div class="af-card" style="overflow-x:auto"><table class="af-table">
    <thead><tr><th>Date</th><th>Item</th><th>Sale</th><th>Rate</th><th>You earn</th><th>Status</th></tr></thead>
    <tbody>${body}</tbody></table></div>`;
}

/* ── Payouts (both currencies) ── */
async function afPayouts() {
  const a = _af, cfg = a.config || {};
  const card = (cur) => {
    const e = _afEarn(cur), sym = cur === 'USD' ? '$' : '₹', min = (cfg.min_payout && cfg.min_payout[cur.toLowerCase()]) || 0;
    const canReq = a.payout_method && e.available >= min && e.available > 0;
    return `<div class="af-bal-card">
      <div class="af-bal-head"><b><span class="cur-ico">${sym}</span> ${cur} Balance</b><span class="af-bal-min">Min: ${sym}${min}</span></div>
      <div class="af-bal-body">
        <div class="af-bal-cell avail"><div class="l">Available</div><div class="v">${sym}${e.available.toFixed(2)}</div></div>
        <div class="af-bal-cell"><div class="l">Pending</div><div class="v">${sym}${e.pending.toFixed(2)}</div></div>
      </div>
      <button class="af-btn af-btn-primary" style="width:100%;margin-top:12px;justify-content:center;${canReq?'':'opacity:.5;cursor:not-allowed'}" ${canReq?'':'disabled'} onclick="afRequestPayout('${cur}')">
        <i class="fas fa-money-bill-wave"></i> Request ${cur} payout</button>
    </div>`;
  };
  document.getElementById('afTabBody').innerHTML = `
    ${a.payout_method ? '' : `<div class="af-warn"><i class="fas fa-circle-exclamation"></i><div><b>No payout method set</b><p>Add one in <a onclick="afShowTab('settings')">Settings</a> before requesting a payout.</p></div></div>`}
    <div class="af-bal-grid">${card('INR')}${card('USD')}</div>
    <div class="af-card" style="margin-top:16px"><div class="af-card-h"><h3><i class="fas fa-clock-rotate-left"></i> Payout history</h3></div>
      <div id="afPayHist"><div class="af-empty"><i class="fas fa-spinner fa-spin"></i></div></div></div>`;
  let rows = [];
  try { rows = await api('/api/affiliate/payouts'); } catch (e) {}
  const hist = document.getElementById('afPayHist');
  if (!rows.length) { hist.innerHTML = `<div class="af-empty">No payouts yet.</div>`; return; }
  hist.innerHTML = `<div style="overflow-x:auto"><table class="af-table">
    <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>${
    rows.map(r => { const sym = r.currency === 'USD' ? '$' : '₹'; const m = r.method ? r.method.type.toUpperCase() : '—';
      return `<tr><td>${_afDate(r.created_at)}</td><td>${sym}${r.amount.toFixed(2)}</td><td>${m}</td><td><span class="af-pill ${r.status==='paid'?'paid':r.status==='rejected'?'rejected':'pending'}">${r.status}</span></td></tr>`; }).join('')
    }</tbody></table></div>`;
}
async function afRequestPayout(cur) {
  if (!_af.payout_method) { afShowTab('settings'); return; }
  if (!confirm(`Request a ${cur} payout of your full available balance?`)) return;
  try {
    await api('/api/affiliate/payout', 'POST', { currency: cur });
    if (typeof toast === 'function') toast('Payout requested — we\'ll process it shortly.', 'success');
    await afLoad();
  } catch (e) { if (typeof toast === 'function') toast((e && e.data && e.data.error) || 'Could not request payout', 'error'); }
}

/* ── Settings ── */
function afSettings() {
  const a = _af, m = a.payout_method, cfg = a.config || {}, t = a.tier || {};
  const tiers = (cfg.tiers || []).map((x, i) => {
    const cur = x.name === t.name;
    return `<div class="af-tier-row ${cur ? 'cur' : ''}"><div class="af-tier-ico"><i class="fas ${_AF_TIER_ICONS[i] || 'fa-gift'}"></i></div>
      <div><div class="tn">${x.name}${cur ? ' <span class="af-pill approved">Current</span>' : ''}</div><div class="tc">${x.min}+ confirmed sales</div></div>
      <div class="tr"><div class="p">${x.rate}%</div><div class="s">commission</div></div></div>`;
  }).join('');
  const next = t.next;
  const prog = next ? Math.min(100, Math.round((t.conversions / next.min) * 100)) : 100;
  const mIcon = m ? (m.type === 'paypal' ? 'fa-brands fa-paypal' : m.type === 'upi' ? 'fa-solid fa-mobile-screen' : m.type === 'crypto' ? 'fa-solid fa-coins' : 'fa-solid fa-building-columns') : '';
  const mDetail = m ? (m.type === 'crypto' ? (m.network + ' · ' + (m.address || '').slice(0, 10) + '…' + (m.address || '').slice(-6)) : (m.upi || m.email || (m.account ? m.holder + ' · ' + m.account : '') || '')) : '';
  const mLabel = m ? (m.type === 'crypto' ? 'Crypto' : m.type) : '';
  const methodHtml = m ? `<div class="af-method-row"><span class="mi"><i class="${mIcon}"></i></span>
      <div class="md"><b style="text-transform:uppercase">${mLabel}</b><p>${escapeHtml(mDetail)}</p></div>
      <button class="af-ghostbtn" onclick="afEditMethod()">Edit</button></div>`
    : `<div class="af-empty-box"><i class="fas fa-wallet" style="font-size:20px;opacity:.5;display:block;margin-bottom:8px"></i>No payout method added yet</div>`;
  document.getElementById('afTabBody').innerHTML = `
    <div class="af-card">
      <div class="af-card-h"><h3><i class="fas fa-fingerprint"></i> Affiliate code</h3></div>
      <div class="af-link"><div class="af-link-in">${escapeHtml(a.code)}</div>
        <button class="af-copy" onclick="afCopy('${escapeHtml(a.code)}')"><i class="fas fa-copy"></i> Copy</button></div>
      <p class="af-note">Your unique referral identifier — it's in every one of your links so we can track and credit your sales.</p>
    </div>
    <div class="af-card">
      <div class="af-card-h"><h3><i class="fas fa-wallet"></i> Payout method</h3>
        ${m ? '' : '<button class="af-btn af-btn-primary" style="padding:9px 16px" onclick="afEditMethod()"><i class="fas fa-plus"></i> Add method</button>'}</div>
      <div style="font-size:12px;color:var(--text-2);margin-bottom:6px">Preferred currency: <b>${a.payout_currency || 'INR'}</b></div>
      ${methodHtml}
      <div id="afMethodForm"></div>
    </div>
    <div class="af-card">
      <div class="af-card-h"><h3><i class="fas fa-layer-group"></i> Commission structure</h3>
        <span style="font-size:12px;color:var(--text-2)">Higher rate as you refer more</span></div>
      ${tiers}
      <div style="margin-top:14px">
        <div class="af-bar"><div class="af-bar-fill" style="width:${prog}%"></div></div>
        <div class="af-prog-meta"><span>Progress to ${next ? next.name : 'top tier'}</span>
          <span>${next ? `${t.conversions} / ${next.min}` : 'Maxed out 🏆'}</span></div>
        ${next ? `<p class="af-note">${next.min - t.conversions} more sales to unlock <b style="color:#34d399">${next.rate}%</b> commission.</p>` : ''}
      </div>
    </div>`;
}
function afEditMethod() {
  const m = _af.payout_method || {};
  const wrap = document.getElementById('afMethodForm');
  wrap.innerHTML = `
    <div style="border-top:1px solid var(--border);margin-top:14px;padding-top:14px">
      <div class="af-create-grid">
        <div class="af-field"><label>Currency</label>
          <select id="afPmCur"><option value="INR" ${(_af.payout_currency!=='USD')?'selected':''}>₹ INR</option><option value="USD" ${(_af.payout_currency==='USD')?'selected':''}>$ USD</option></select></div>
        <div class="af-field"><label>Method</label>
          <select id="afMethod" onchange="afMethodChange()">
            <option value="upi" ${m.type==='upi'?'selected':''}>UPI (India)</option>
            <option value="bank" ${m.type==='bank'?'selected':''}>Bank transfer (India)</option>
            <option value="paypal" ${m.type==='paypal'?'selected':''}>PayPal (international)</option>
            <option value="crypto" ${m.type==='crypto'?'selected':''}>Crypto / USDT (international)</option>
          </select></div>
      </div>
      <div id="afMethodFields">${afMethodFieldsHtml(m.type || 'upi', m)}</div>
      <div class="af-create-actions"><button class="af-ghostbtn" onclick="document.getElementById('afMethodForm').innerHTML=''">Cancel</button>
        <button class="af-btn af-btn-primary" onclick="afSaveMethodBtn()"><i class="fas fa-check"></i> Save method</button></div>
    </div>`;
}
function afMethodFieldsHtml(type, m) {
  m = m || {};
  if (type === 'upi') return `<div class="af-field"><label>UPI ID</label><input id="af_upi" value="${escapeHtml(m.upi||'')}" placeholder="name@bank"></div>`;
  if (type === 'paypal') return `<div class="af-field"><label>PayPal email</label><input id="af_email" value="${escapeHtml(m.email||'')}" placeholder="you@email.com"></div>`;
  if (type === 'crypto') {
    const nets = (_af.config && _af.config.crypto_networks) || ['USDT-TON'];
    const cur = m.network || nets[0];
    return `<div class="af-create-grid">
      <div class="af-field"><label>Network / coin</label><select id="af_network">${nets.map(n => `<option value="${n}" ${n===cur?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="af-field"><label>Wallet address</label><input id="af_address" value="${escapeHtml(m.address||'')}" placeholder="Paste your wallet address"></div></div>
      <p class="af-note" style="margin-top:0">Double-check the address & network — crypto transfers can't be reversed. USDT is recommended for the lowest fees.</p>`;
  }
  return `<div class="af-create-grid"><div class="af-field"><label>Account holder</label><input id="af_holder" value="${escapeHtml(m.holder||'')}"></div>
    <div class="af-field"><label>Account number</label><input id="af_account" value="${escapeHtml(m.account||'')}"></div>
    <div class="af-field"><label>IFSC code</label><input id="af_ifsc" value="${escapeHtml(m.ifsc||'')}"></div>
    <div class="af-field"><label>Bank name</label><input id="af_bank" value="${escapeHtml(m.bank||'')}"></div></div>`;
}
function afMethodChange() {
  const t = document.getElementById('afMethod').value;
  document.getElementById('afMethodFields').innerHTML = afMethodFieldsHtml(t, _af.payout_method || {});
}
async function afSaveMethodBtn() {
  try {
    const t = document.getElementById('afMethod').value;
    const payload = { type: t, currency: document.getElementById('afPmCur').value };
    if (t === 'upi') payload.upi = (document.getElementById('af_upi').value || '').trim();
    else if (t === 'paypal') payload.email = (document.getElementById('af_email').value || '').trim();
    else if (t === 'crypto') { payload.network = document.getElementById('af_network').value; payload.address = (document.getElementById('af_address').value || '').trim(); }
    else { payload.holder = document.getElementById('af_holder').value.trim(); payload.account = document.getElementById('af_account').value.trim(); payload.ifsc = document.getElementById('af_ifsc').value.trim(); payload.bank = document.getElementById('af_bank').value.trim(); }
    if (t === 'upi' && !payload.upi) throw new Error('Enter your UPI ID');
    if (t === 'paypal' && !payload.email) throw new Error('Enter your PayPal email');
    if (t === 'crypto' && !payload.address) throw new Error('Enter your wallet address');
    if (t === 'bank' && (!payload.account || !payload.ifsc)) throw new Error('Enter account number and IFSC');
    await api('/api/affiliate/payout-method', 'PUT', payload);
    if (typeof toast === 'function') toast('Payout method saved', 'success');
    await afLoad(); afShowTab('settings');
  } catch (e) { if (typeof toast === 'function') toast(e.message || 'Could not save', 'error'); }
}
