// ============ DEMAND CAPTURE ============
// The signal we used to throw away: what people were looking for, and what
// stopped them. Two entry points —
//   1. an automatic log every time a search returns nothing (no typing needed)
//   2. a free-form box where they can write a word, a sentence or a paragraph
//
// Deliberately framed as "what are you looking for / what's not working" rather
// than "why haven't you bought". The second makes someone justify their inaction
// to a company: most just close it, and the ones who answer overwhelmingly say
// "too expensive" whatever the real reason — which would send us chasing price
// when the actual problem was a missing tool or a broken flow.
//
// Depends on: helpers.js (api, toast, escapeHtml)

// Never log the same failed search twice in one session — the debounced input
// would otherwise record "c", "ca", "can"… as separate misses and drown the data.
const _reqLoggedSearches = new Set();

// Fire-and-forget: a failed search must never slow down or break the results.
function gtLogFailedSearch(query, matched) {
  const q = String(query || '').trim();
  if (q.length < 2 || q.length > 80) return;
  const key = q.toLowerCase();
  if (_reqLoggedSearches.has(key)) return;
  _reqLoggedSearches.add(key);
  api('/api/requests', 'POST', { kind: 'search', query: q, matched: matched ? 1 : 0 })
    .catch(() => {});
}

// The box itself. `prefill` seeds it with whatever they just searched for, so the
// common case is one click and no typing at all.
/* `mode` is 'missing' (default) or 'problem'. Same form, same endpoint, same
   table — only the framing changes. Asking "what went wrong" under a heading
   that says "can't find what you need" gets you answers to the wrong
   question, and a mismatched heading also reads as a bait-and-switch. */
function gtRequestBoxHtml(prefill, mode) {
  const pre = escapeHtml(prefill || '');
  const problem = mode === 'problem';
  // `currentUser` is a top-level `let` in helpers.js — shared across these classic
  // scripts but NOT a window property, so it must be read directly, not off window.
  const guest = (typeof currentUser === 'undefined') || !currentUser;
  return `
    <div class="gtreq-box" id="gtReqBox">
      <div class="gtreq-icon"><i class="fas ${problem ? 'fa-life-ring' : 'fa-comment-dots'}"></i></div>
      <h3 class="gtreq-title">${problem ? 'Having a problem?' : "Can't find what you need?"}</h3>
      <p class="gtreq-sub">${problem
        ? `Tell us what went wrong — which tool, and what happened. The more you tell us,
           the faster we can fix it.`
        : `Tell us which tool you're looking for — or anything else that isn't working for you.
           If we have it, we'll point you to it. If we don't, we'll look at adding it.`}
      </p>
      <textarea id="gtReqText" class="gtreq-input" rows="3" maxlength="2000"
        data-mode="${problem ? 'problem' : 'missing'}"
        placeholder="${problem
          ? 'e.g. &quot;Canva opens but says my session expired&quot; — tell us as much as you like.'
          : "e.g. &quot;Do you have Photoshop?&quot; — or write as much as you like about what's missing or not working."}">${pre}</textarea>
      ${guest ? `<input type="email" id="gtReqEmail" class="gtreq-email" maxlength="160"
        placeholder="Your email (optional — only so we can reply)">` : ''}
      <button class="gtreq-btn" id="gtReqBtn" onclick="gtSubmitRequest()">
        <i class="fas fa-paper-plane"></i> Send
      </button>
      <p class="gtreq-foot">${guest ? 'No signup needed. ' : ''}We read every one.</p>
    </div>`;
}

async function gtSubmitRequest() {
  const ta = document.getElementById('gtReqText');
  const btn = document.getElementById('gtReqBtn');
  if (!ta || !btn) return;
  const text = ta.value.trim();
  if (text.length < 2) { toast('Please tell us a little more.', 'info'); ta.focus(); return; }

  const emailEl = document.getElementById('gtReqEmail');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending…';
  let res = null;
  try {
    res = await api('/api/requests', 'POST', {
      kind: 'request', query: text, contact: emailEl ? emailEl.value.trim() : '',
      // kind stays 'request': the server allowlists kinds and the admin
      // counters are hard-coded to them, so a new kind would 400 on the way in
      // and be invisible on the way out. `reason` already exists, is already
      // stored for any kind, and separates the two cleanly.
      reason: (document.getElementById('gtReqText')?.dataset.mode === 'problem') ? 'problem' : ''
    });
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
    toast("Couldn't send that — please try again.", 'error');
    return;
  }

  const box = document.getElementById('gtReqBox');
  if (!box) return;

  // If they named something we already stock, answer immediately. A failed search
  // is very often just a naming mismatch ("photoshop" → we list it as "Adobe CC"),
  // and that is a sale lost to vocabulary rather than to missing stock.
  if (res && res.found) {
    const f = res.found;
    box.innerHTML = `
      <div class="gtreq-icon gtreq-ok"><i class="fas fa-circle-check"></i></div>
      <h3 class="gtreq-title">Good news — we have that</h3>
      <p class="gtreq-sub">It's listed as <strong>${escapeHtml(f.name)}</strong> on our side, which is why your search missed it.</p>
      <button class="gtreq-btn" onclick="openTool('${escapeHtml(f.slug)}')">
        Open ${escapeHtml(f.name)} <i class="fas fa-arrow-right"></i>
      </button>`;
    return;
  }

  box.innerHTML = `
    <div class="gtreq-icon gtreq-ok"><i class="fas fa-circle-check"></i></div>
    <h3 class="gtreq-title">Got it — thank you</h3>
    <p class="gtreq-sub">A real person reads these. If it's a tool we can add, we usually do it within a few days.</p>`;
}

// Styles are injected once, on first use, so this module stays self-contained and
// nothing else has to change to adopt it.
let _gtReqStyled = false;
function gtInjectRequestStyles() {
  if (_gtReqStyled) return;
  _gtReqStyled = true;
  const css = `
    .gtreq-box{max-width:520px;margin:8px auto 0;padding:26px 24px;text-align:center;
      background:var(--bg-2);border:1px solid var(--border);border-radius:16px;
      box-shadow:0 8px 28px rgba(0,0,0,.28)}
    .gtreq-icon{width:46px;height:46px;margin:0 auto 12px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:19px;
      color:var(--accent);background:rgba(139,92,246,.12)}
    .gtreq-icon.gtreq-ok{color:var(--green);background:rgba(52,211,153,.12)}
    .gtreq-title{font-size:17px;font-weight:800;color:var(--text-1);margin:0 0 7px;letter-spacing:-.2px}
    .gtreq-sub{font-size:13.5px;color:var(--text-2);line-height:1.6;margin:0 0 16px}
    .gtreq-sub strong{color:var(--text-1)}
    .gtreq-input,.gtreq-email{width:100%;padding:11px 13px;font-family:inherit;font-size:13.5px;
      color:var(--text-1);background:var(--bg-3);border:1px solid var(--border);
      border-radius:10px;outline:none;transition:border-color .18s,box-shadow .18s}
    .gtreq-input{resize:vertical;min-height:76px;line-height:1.55}
    .gtreq-email{margin-top:9px}
    .gtreq-input:focus,.gtreq-email:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(139,92,246,.15)}
    .gtreq-input::placeholder,.gtreq-email::placeholder{color:var(--text-3)}
    .gtreq-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
      margin-top:13px;padding:11px 26px;font-family:inherit;font-size:13.5px;font-weight:700;
      color:#fff;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:10px;
      cursor:pointer;transition:transform .18s,box-shadow .18s,opacity .18s;
      box-shadow:0 6px 18px rgba(124,58,237,.32)}
    .gtreq-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 24px rgba(124,58,237,.42)}
    .gtreq-btn:disabled{opacity:.7;cursor:default}
    .gtreq-foot{font-size:11.5px;color:var(--text-3);margin:11px 0 0}
    @media(max-width:600px){.gtreq-box{padding:22px 18px}}
  `;
  const el = document.createElement('style');
  el.id = 'gtReqStyles';
  el.textContent = css;
  document.head.appendChild(el);
}

/* ── the suggestion box as a modal ─────────────────────────────────────────
   The box already existed, but only inside the empty state of a failed
   search — so it was reachable exactly when someone had already failed to
   find something. That is the worst moment to ask: they came to use a tool,
   not to fill in a form, and most people leave rather than type.

   Opening it from the banner instead asks while nothing has gone wrong,
   which is when people are actually willing to answer.

   Reuses gtRequestBoxHtml + gtSubmitRequest untouched, so there is one
   implementation of the form and one place it can break. */
function gtOpenRequestModal(prefill, mode) {
  gtInjectRequestStyles();
  let ov = document.getElementById('gtReqOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'gtReqOverlay';
    ov.className = 'gtreq-ov';
    ov.addEventListener('click', function (e) { if (e.target === ov) gtCloseRequestModal(); });
    document.body.appendChild(ov);
  }
  ov.innerHTML =
    '<div class="gtreq-modal" role="dialog" aria-modal="true" aria-label="Send us a message">' +
      '<button class="gtreq-x" onclick="gtCloseRequestModal()" aria-label="Close">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' +
      gtRequestBoxHtml(prefill || '', mode) +
    '</div>';
  ov.classList.add('open');
  document.body.style.overflow = 'hidden';
  // focus the field, not the close button — the point is to type
  const ta = ov.querySelector('textarea');
  if (ta) setTimeout(function () { ta.focus(); }, 60);
  document.addEventListener('keydown', _gtReqEsc);
}
function gtCloseRequestModal() {
  const ov = document.getElementById('gtReqOverlay');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', _gtReqEsc);
}
function _gtReqEsc(e) { if (e.key === 'Escape') gtCloseRequestModal(); }
