/* EasySales - documents: estimate -> pro forma -> invoice -> waybill, with preview before saving,
   print / save as PDF, WhatsApp, payments, owner delete, and the ceiling estimator (rules from Setup). */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, api, esc, money, r2, sum, kk, $, today, toast, sheet, closeSheet, errText, cfg, bizName, logoSrc } = KL;
  const render = k => KL.fn('render')(k);
  const POWERED = 'Powered by EasySales · 020 320 7240';
  const T = { EST: 'Estimate', PF: 'Pro forma', INV: 'Invoice', WB: 'Waybill' };
  const TITLE = { EST: 'ESTIMATE', PF: 'PRO FORMA INVOICE', INV: 'INVOICE', WB: 'WAYBILL' };
  const D = { list: null, type: 'INV', filter: 'all', edit: null, view: null, rules: null, est: null, loading: false };
  Object.assign(KL.ERR, { bad_type: 'Pick a document type.', invoice_locked: 'A saved invoice cannot be changed. Delete it and make a new one.', reason_needed: 'Please give a reason.', more_than_owed: 'That is more than the balance.', not_found: 'Not found. Refresh and try again.', too_long: 'Too many lines in one document.', bad_status: 'Bad status.' });
  const on = () => (cfg().docs || 'Yes') !== 'No';
  const isOwner = () => S.session && S.session.role === 'admin';

  /* ---------- tab ---------- */
  ICON.docs = '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>';
  const _tabsFor = KL.fn('tabsFor');
  KL.setFn('tabsFor', function () { const t = _tabsFor(); if (isOwner() && on()) t.splice(2, 0, ['docs', 'Docs']); return t; });
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    _render(k);
    if (!isOwner()) return;
    const m = document.querySelector('main.wrap'); if (!m) return;
    if (S.tab === 'docs') m.innerHTML = docsHTML();
    if (S.tab === 'setup' && !document.getElementById('xdocset')) m.insertAdjacentHTML('afterbegin', '<div id="xdocset" class="row" style="gap:8px;margin-top:6px"><button class="btn sm grow" data-act="dRules">Estimator rules</button><button class="btn sm grow" data-act="dSettings">Document settings</button></div>');
  });
  const _tab = ACT.tab;
  ACT.tab = d => { _tab(d); if (d.t === 'docs') loadDocs(); };

  async function loadDocs() {
    if (!D.list) { try { D.list = await KL.kvGet('docs'); } catch (e) { /* ignore */ } if (D.list && S.tab === 'docs') render(true); }
    if (!navigator.onLine) return;
    D.loading = true;
    try { const r = await api('docs', { op: 'list' }); if (r.ok) { D.list = r.docs; KL.kvSet('docs', r.docs).catch(() => {}); } else toast(errText(r.error)); } catch (e) { /* offline */ }
    D.loading = false; if (S.tab === 'docs') render(true);
  }

  /* ---------- status of a document ---------- */
  function status(d) {
    if (d.type === 'INV') {
      const bal = r2(d.total - (d.paid || 0));
      if (bal <= 0.004) return ['Paid', 'green'];
      if (d.until && d.until < today()) return ['Overdue', 'red'];
      return (d.paid || 0) > 0 ? ['Part paid', 'amber'] : ['Unpaid', ''];
    }
    if (d.type === 'WB') return d.status === 'Delivered' ? ['Delivered', 'green'] : ['On the way', 'amber'];
    if (d.status === 'Accepted') return ['Accepted', 'green'];
    if (d.status === 'Declined') return ['Declined', 'red'];
    if (d.until && d.until < today()) return ['Expired', ''];
    return ['Waiting', ''];
  }

  function docsHTML() {
    const L = D.list;
    let h = '<div class="chips" style="margin-top:6px">' + Object.keys(T).map(k => '<button class="chip ' + (D.type === k ? 'on' : '') + '" data-act="dType" data-k="' + k + '">' + T[k] + (k === 'PF' || k === 'EST' ? 's' : k === 'INV' ? 's' : 's') + '</button>').join('') + '</div>';
    h += '<button class="btn primary block" data-act="dNew" data-k="' + D.type + '" style="margin:6px 0 4px">+ New ' + T[D.type].toLowerCase() + '</button>';
    if (!L) return h + '<div class="empty">' + (navigator.onLine ? 'Loading…' : 'Connect to the internet once to load documents.') + '</div>';
    const mine = L.filter(d => d.type === D.type);
    if (D.type === 'INV') {
      const paid = sum(mine, d => Math.min(d.paid || 0, d.total)), owed = sum(mine, d => Math.max(0, d.total - (d.paid || 0)));
      const over = sum(mine.filter(d => status(d)[0] === 'Overdue'), d => d.total - (d.paid || 0));
      h += '<div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:8px"><div class="stat"><span>Paid</span><b class="green" style="font-size:16px">' + money(paid) + '</b></div><div class="stat"><span>Unpaid</span><b style="font-size:16px">' + money(owed) + '</b></div><div class="stat"><span>Overdue</span><b class="red" style="font-size:16px">' + money(over) + '</b></div></div>';
    }
    if (!mine.length) return h + '<div class="empty">No ' + T[D.type].toLowerCase() + 's yet.</div>';
    h += '<div class="card" style="padding:4px 14px">' + mine.slice(0, 150).map(d => {
      const st = status(d);
      return '<button class="item" data-act="dOpen" data-no="' + esc(d.no) + '"><span class="grow"><span class="nm">' + esc(d.customer) + '</span><br><span class="small muted">' + esc(d.no) + ' · ' + esc(d.date) + (d.title ? ' · ' + esc(d.title) : '') + '</span></span><span class="right">' +
        (d.type === 'WB' ? '<span class="amt">' + sum(d.data.items || [], i => i.q) + ' pcs</span>' : '<span class="amt">' + money(d.total) + '</span>') + '<br><span class="badge ' + st[1] + '">' + st[0] + '</span></span></button>';
    }).join('') + '</div>';
    if (D.loading) h += '<p class="small muted" style="text-align:center">Refreshing…</p>';
    return h;
  }
  ACT.dType = d => { D.type = d.k; render(true); };

  /* ---------- the paper: what the customer sees (preview, view, print) ---------- */
  function paperHTML(doc, preview) {
    const c = cfg(), items = doc.data.items || [], wb = doc.type === 'WB';
    const total = wb ? 0 : r2(sum(items, i => i.q * i.u)), paid = doc.type === 'INV' ? r2((doc.paid || 0)) : 0, bal = r2(total - paid);
    const st = doc.type === 'INV' ? (bal <= 0.004 ? ['PAID', '#1E7B4F'] : paid > 0 ? ['PART PAID', '#B26A00'] : ['UNPAID', '#B3261E']) : null;
    const c1 = c.c1 || '#7A1F3D';
    let h = '<div class="paper" style="position:relative;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;font-size:13px;color:#241B2F;overflow:hidden">';
    if (preview) h += '<div style="position:absolute;top:8px;right:-34px;transform:rotate(35deg);background:#FFF0D2;color:#7A4B00;font-weight:800;font-size:11px;padding:3px 40px">PREVIEW</div>';
    if (st && !preview) h += '<div aria-hidden="true" style="position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) rotate(-16deg);border:4px solid ' + st[1] + ';color:' + st[1] + ';opacity:.18;font-size:34px;font-weight:800;padding:0 14px;border-radius:10px;white-space:nowrap">' + st[0] + '</div>';
    h += '<div style="display:flex;gap:10px;align-items:center;padding-bottom:10px;border-bottom:3px solid ' + esc(c1) + '"><img src="' + logoSrc() + '" alt="" style="width:52px;height:52px;object-fit:contain"><div style="flex:1"><b style="font-size:15px">' + esc(bizName()) + '</b><div style="font-size:11px;color:#6E6479">' + esc([c.tagline, c.location, c.phone].filter(Boolean).join(' · ')) + '</div></div></div>';
    h += '<div style="display:flex;justify-content:space-between;gap:10px;margin:10px 0"><div><div style="font-size:16px;font-weight:800;color:' + esc(c1) + '">' + TITLE[doc.type] + '</div><div style="font-size:11px;color:#6E6479">' + esc(doc.no || 'New') + ' · ' + esc(doc.date || today()) + (doc.until && !wb ? ' · ' + (doc.type === 'INV' ? 'due ' : 'valid until ') + esc(doc.until) : '') + '</div>' + (doc.from ? '<div style="font-size:11px;color:#6E6479">From ' + esc(doc.from) + '</div>' : '') + '</div>' +
      '<div style="text-align:right"><div style="font-size:11px;color:#6E6479">' + (wb ? 'Deliver to' : 'Bill to') + '</div><b>' + esc(doc.customer) + '</b><div style="font-size:11px;color:#6E6479">' + esc([doc.location || doc.data.dest, doc.phone].filter(Boolean).join(' · ')) + '</div></div></div>';
    if (doc.title) h += '<div style="font-weight:700;margin-bottom:6px">' + esc(doc.title) + '</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:' + esc(c1) + ';color:#fff"><th style="text-align:left;padding:6px">Item</th><th style="text-align:right;padding:6px">Qty</th>' + (wb ? '' : '<th style="text-align:right;padding:6px">Price</th><th style="text-align:right;padding:6px">Amount</th>') + '</tr>' +
      items.map((i, n) => '<tr style="background:' + (n % 2 ? '#F7F4FA' : '#fff') + '"><td style="padding:6px">' + esc(i.p) + '</td><td style="text-align:right;padding:6px">' + i.q + '</td>' + (wb ? '' : '<td style="text-align:right;padding:6px">' + r2(i.u).toFixed(2) + '</td><td style="text-align:right;padding:6px">' + r2(i.q * i.u).toFixed(2) + '</td>') + '</tr>').join('') + '</table>';
    if (!wb) {
      h += '<div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-end;gap:3px"><div style="font-size:16px;font-weight:800">Total ' + money(total) + '</div>';
      if (doc.type === 'INV' && paid > 0) h += '<div style="color:#1E7B4F">Paid ' + money(paid) + '</div>';
      if (doc.type === 'INV') h += '<div style="color:' + (bal > 0.004 ? '#B3261E' : '#1E7B4F') + ';font-weight:700">' + (bal > 0.004 ? 'Balance ' + money(bal) : 'Fully paid') + '</div>';
      h += '</div>';
    } else {
      h += '<div style="margin-top:10px;font-size:12px">Vehicle: <b>' + esc(doc.data.vehicle || '—') + '</b> · Driver: <b>' + esc(doc.data.driver || '—') + '</b></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:26px;font-size:11px;color:#6E6479;text-align:center"><div style="border-top:1px solid #999;padding-top:4px">Dispatched by</div><div style="border-top:1px solid #999;padding-top:4px">Driver</div><div style="border-top:1px solid #999;padding-top:4px">Received by</div></div>';
    }
    const terms = doc.data.terms;
    if (terms) h += '<div style="margin-top:10px;font-size:11px;white-space:pre-line"><b>Terms</b><br>' + esc(terms) + '</div>';
    if (!wb && (c.momo || c.bank)) h += '<div style="margin-top:8px;font-size:11px;background:#F7F4FA;border-radius:8px;padding:8px">' + (c.momo ? 'Pay by MoMo: <b>' + esc(c.momo) + '</b>' + (c.momoName ? ' (' + esc(c.momoName) + ')' : '') : '') + (c.momo && c.bank ? '<br>' : '') + (c.bank ? 'Bank: ' + esc(c.bank) : '') + '</div>';
    if (doc.data.note) h += '<div style="margin-top:6px;font-size:11px;color:#6E6479">' + esc(doc.data.note) + '</div>';
    h += '<div style="margin-top:12px;text-align:center;font-size:10px;color:#9A90A6">' + POWERED + '</div></div>';
    return h;
  }

  /* ---------- open a saved document ---------- */
  function findDoc(no) { return (D.list || []).find(d => d.no === no); }
  ACT.dOpen = d => { const doc = findDoc(d.no); if (doc) viewSheet(doc); };
  function viewSheet(doc) {
    D.view = doc; const st = status(doc), t = doc.type;
    const left = t === 'INV' ? r2(doc.total - (doc.paid || 0)) : 0;
    let acts = '';
    if (t === 'INV' && left > 0.004) acts += '<button class="btn primary block" data-act="dPay">Record payment</button>';
    if (t === 'EST') acts += '<button class="btn violet block" data-act="dConvert" data-k="PF">Make pro forma</button><button class="btn violet block" data-act="dConvert" data-k="INV">Make invoice</button>';
    if (t === 'PF') acts += '<button class="btn violet block" data-act="dConvert" data-k="INV">Make invoice</button>';
    if (t === 'INV') { const rem = remaining(doc); if (rem.some(i => i.q > 0)) acts += '<button class="btn block" data-act="dConvert" data-k="WB">Make waybill (' + sum(rem, i => i.q) + ' still to deliver)</button>'; }
    if (t === 'WB' && doc.status !== 'Delivered') acts += '<button class="btn block" data-act="dStatus" data-s="Delivered">Mark delivered</button>';
    if ((t === 'EST' || t === 'PF') && doc.status !== 'Accepted') acts += '<button class="btn block" data-act="dStatus" data-s="Accepted">Mark accepted</button>';
    if (t !== 'INV') acts += '<button class="btn block" data-act="dEdit">Edit</button>';
    sheet('<h2>' + T[t] + ' ' + esc(doc.no) + ' <span class="badge ' + st[1] + '">' + st[0] + '</span></h2>' + paperHTML(doc, false) +
      '<div style="display:grid;gap:8px;margin-top:12px">' + acts +
      '<div class="row"><button class="btn grow" data-act="dPrint">Print / PDF</button><button class="btn grow" data-act="dWa">WhatsApp</button></div>' +
      (isOwner() ? '<button class="btn danger block" data-act="dDel">Delete</button>' : '') + '</div>');
  }
  function remaining(inv) {
    const done = inv.delivered || {};
    return (inv.data.items || []).map(i => ({ p: i.p, q: r2(Math.max(0, i.q - (done[i.p] || 0))) }));
  }

  /* ---------- the editor ---------- */
  function blank(type) {
    const c = cfg();
    return { type, no: '', customer: '', phone: '', location: '', title: '', from: '', items: [], terms: type === 'INV' ? (c.invTerms || '') : type === 'WB' ? '' : (c.estTerms || ''), note: '', vehicle: '', driver: '', dest: '', cash: '', momo: '', rooms: null };
  }
  ACT.dNew = d => { D.edit = blank(d.k || D.type); editSheet(); };
  ACT.dEdit = () => { const v = D.view; D.edit = Object.assign(blank(v.type), { no: v.no, customer: v.customer, phone: v.phone, location: v.location, title: v.title, from: v.from, items: (v.data.items || []).map(i => Object.assign({}, i)), terms: v.data.terms || '', note: v.data.note || '', vehicle: v.data.vehicle || '', driver: v.data.driver || '', dest: v.data.dest || '', rooms: v.data.rooms || null }); editSheet(); };
  ACT.dConvert = d => {
    const v = D.view, k = d.k;
    const e = Object.assign(blank(k), { customer: v.customer, phone: v.phone, location: v.location, title: v.title, from: v.no, items: (v.data.items || []).map(i => Object.assign({}, i)), rooms: v.data.rooms || null });
    if (k === 'WB') { e.items = remaining(v).filter(i => i.q > 0); e.dest = v.location; }
    else if (k === 'INV' && v.type === 'EST') e.terms = cfg().invTerms || '';
    D.edit = e; editSheet();
  };

  function products() { return ((S.lists && S.lists.products) || (S.cache && S.cache.products) || []); }
  function priceOf(name) { const p = products().find(x => kk(x.name) === kk(name)); return p ? p.price : null; }

  function editSheet() {
    const e = D.edit, wb = e.type === 'WB', custs = KL.derived().customers.filter(c => kk(c.name) !== kk(KL.WALKIN));
    const total = wb ? 0 : r2(sum(e.items, i => (+i.q || 0) * (+i.u || 0)));
    sheet('<h2>' + (e.no ? 'Edit ' + esc(e.no) : 'New ' + T[e.type].toLowerCase()) + '</h2>' +
      (e.from ? '<p class="small muted" style="margin:0">From ' + esc(e.from) + '</p>' : '') +
      '<label>Customer</label><input id="dc" list="dcl" value="' + esc(e.customer) + '" autocomplete="off" placeholder="Name"><datalist id="dcl">' + custs.map(c => '<option value="' + esc(c.name) + '">').join('') + '</datalist>' +
      '<div class="picker"><div><label>Phone</label><input id="dp" inputmode="tel" value="' + esc(e.phone) + '"></div><div><label>' + (wb ? 'Deliver to' : 'Location') + '</label><input id="dl" value="' + esc(wb ? (e.dest || e.location) : e.location) + '"></div></div>' +
      (wb ? '' : '<label>Job / title (optional)</label><input id="dt" value="' + esc(e.title) + '" placeholder="Example: 3 rooms plasterboard ceiling">') +
      '<h3 style="margin:14px 0 4px">Items</h3><datalist id="dpl">' + products().map(p => '<option value="' + esc(p.name) + '">').join('') + '</datalist>' +
      (e.items.length ? e.items.map((i, n) => '<div class="card" style="padding:10px;margin:6px 0"><input data-di="p" data-n="' + n + '" list="dpl" value="' + esc(i.p) + '" placeholder="Item">' +
        '<div class="row" style="margin-top:6px"><div class="grow"><label style="margin:0">Qty</label><input data-di="q" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(i.q) + '"></div>' +
        (wb ? '' : '<div class="grow"><label style="margin:0">Price</label><input data-di="u" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(i.u) + '"></div>') +
        '<button class="btn sm danger" data-act="dDelLine" data-n="' + n + '" style="align-self:flex-end" aria-label="Remove line">✕</button></div></div>').join('') : '<p class="small muted">No items yet.</p>') +
      '<div class="row" style="gap:8px"><button class="btn sm grow" data-act="dAddLine">+ Add item</button>' + (wb ? '' : '<button class="btn sm violet grow" data-act="dEstimator">Ceiling estimator</button>') + '</div>' +
      (wb ? '<div class="picker"><div><label>Vehicle number</label><input id="dv" value="' + esc(e.vehicle) + '" placeholder="GT 4512-22"></div><div><label>Driver (name, phone)</label><input id="dd" value="' + esc(e.driver) + '"></div></div>' :
        '<p style="text-align:right;font-weight:800;font-size:17px;margin:12px 0 0" id="dtot">Total ' + money(total) + '</p>') +
      (e.type === 'INV' && !e.no ? '<div class="picker"><div><label>Paid now: cash</label><input id="dcash" type="number" inputmode="decimal" value="' + esc(e.cash) + '" placeholder="0"></div><div><label>Paid now: MoMo</label><input id="dmomo" type="number" inputmode="decimal" value="' + esc(e.momo) + '" placeholder="0"></div></div>' : '') +
      (wb ? '' : '<label>Terms</label><textarea id="dterms" rows="3" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(e.terms) + '</textarea>') +
      '<label>Note (optional)</label><input id="dnote" value="' + esc(e.note) + '">' +
      '<br><button class="btn primary block" data-act="dPreview">Preview</button>');
  }
  function readEdit() {
    const e = D.edit; if (!e || !$('#dc')) return;
    e.customer = $('#dc').value.trim(); e.phone = $('#dp').value.trim();
    if (e.type === 'WB') e.dest = $('#dl').value.trim(); else e.location = $('#dl').value.trim();
    if ($('#dt')) e.title = $('#dt').value.trim();
    if ($('#dv')) e.vehicle = $('#dv').value.trim(); if ($('#dd')) e.driver = $('#dd').value.trim();
    if ($('#dterms')) e.terms = $('#dterms').value; e.note = $('#dnote').value.trim();
    if ($('#dcash')) e.cash = $('#dcash').value; if ($('#dmomo')) e.momo = $('#dmomo').value;
    document.querySelectorAll('[data-di]').forEach(el => { const i = e.items[+el.dataset.n]; if (!i) return; const k = el.dataset.di; i[k] = k === 'p' ? el.value : el.value === '' ? '' : +el.value; });
  }
  document.addEventListener('input', ev => {
    const t = ev.target; if (!t.dataset || t.dataset.di === undefined || !D.edit) return;
    const i = D.edit.items[+t.dataset.n]; if (!i) return;
    if (t.dataset.di === 'p') { i.p = t.value; const pr = priceOf(t.value); if (pr !== null && D.edit.type !== 'WB') { i.u = pr; const u = document.querySelector('[data-di="u"][data-n="' + t.dataset.n + '"]'); if (u) u.value = pr; } }
    else i[t.dataset.di] = t.value === '' ? '' : +t.value;
    const el = $('#dtot'); if (el) el.textContent = 'Total ' + money(sum(D.edit.items, x => (+x.q || 0) * (+x.u || 0)));
  });
  ACT.dAddLine = () => { readEdit(); D.edit.items.push({ p: '', q: 1, u: 0 }); editSheet(); };
  ACT.dDelLine = d => { readEdit(); D.edit.items.splice(+d.n, 1); editSheet(); };

  /* ---------- preview before saving ---------- */
  ACT.dPreview = () => {
    readEdit(); const e = D.edit;
    if (!e.customer) { toast('Enter the customer'); return; }
    e.items = e.items.filter(i => String(i.p || '').trim());
    if (!e.items.length) { toast('Add at least one item'); editSheet(); return; }
    if (e.items.some(i => !(+i.q > 0) || (e.type !== 'WB' && !(+i.u >= 0)))) { toast('Check quantities and prices'); editSheet(); return; }
    const total = r2(sum(e.items, i => i.q * (i.u || 0))), paid = r2((+e.cash || 0) + (+e.momo || 0));
    if (e.type === 'INV' && paid > total + 0.001) { toast('Paid is more than the total'); editSheet(); return; }
    const doc = { type: e.type, no: e.no || 'New', date: today(), customer: e.customer, phone: e.phone, location: e.location, title: e.title, from: e.from, paid, data: { items: e.items, terms: e.terms, note: e.note, vehicle: e.vehicle, driver: e.driver, dest: e.dest } };
    sheet('<h2>Check before saving</h2><p class="small muted" style="margin-top:0">This is exactly what your customer will see.</p>' + paperHTML(doc, true) +
      '<div class="row" style="margin-top:12px"><button class="btn grow" data-act="dBack">Edit</button><button class="btn primary grow" data-act="dSave">Confirm and save</button></div>');
  };
  ACT.dBack = () => editSheet();
  ACT.dSave = async (d, btn) => {
    const e = D.edit; if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const r = await api('docs', { op: 'save', type: e.type, no: e.no, customer: e.customer, phone: e.phone, location: e.location, title: e.title, from: e.from, items: e.items, terms: e.terms, note: e.note, vehicle: e.vehicle, driver: e.driver, dest: e.dest, rooms: e.rooms, cash: +e.cash || 0, momo: +e.momo || 0 });
      if (!r.ok) { toast(errText(r.error)); if (btn) { btn.disabled = false; btn.textContent = 'Confirm and save'; } return; }
      toast(T[e.type] + ' ' + r.doc.no + ' saved'); D.edit = null; D.type = r.doc.type;
      await loadDocs(); const doc = findDoc(r.doc.no) || r.doc; viewSheet(doc);
      if (e.type === 'INV') KL.refreshCache();
    } catch (err) { toast('Needs internet to save'); if (btn) { btn.disabled = false; btn.textContent = 'Confirm and save'; } }
  };

  /* ---------- payments, status, delete ---------- */
  ACT.dPay = () => {
    const v = D.view, left = r2(v.total - (v.paid || 0));
    sheet('<h2>Payment for ' + esc(v.no) + '</h2><p class="muted" style="margin:0">' + esc(v.customer) + ' owes <b class="red">' + money(left) + '</b></p>' +
      '<div class="picker"><div><label>Cash</label><input id="pc" type="number" inputmode="decimal" placeholder="0"></div><div><label>MoMo</label><input id="pm" type="number" inputmode="decimal" placeholder="0"></div></div><br>' +
      '<button class="btn primary block" data-act="dPaySave">Save payment</button>');
  };
  ACT.dPaySave = async (d, btn) => {
    const cash = r2(+$('#pc').value || 0), momo = r2(+$('#pm').value || 0), v = D.view;
    if (cash + momo <= 0) { toast('Enter the amount'); return; }
    if (cash + momo > r2(v.total - (v.paid || 0)) + 0.001) { toast('That is more than the balance'); return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const r = await api('docs', { op: 'pay', no: v.no, cash, momo });
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; btn.textContent = 'Save payment'; return; }
      toast('Payment saved: ' + money(cash + momo)); await loadDocs(); KL.refreshCache();
      const doc = findDoc(v.no); if (doc) viewSheet(doc);
      // receipt for this payment, with the stamp, ready for WhatsApp
      if (doc && KL.fn('receiptSheet')) setTimeout(() => KL.fn('receiptSheet')({ id: r.id, date: today(), time: KL.nowTime(), customer: doc.customer, items: doc.data.items, total: doc.total, cash: r2((doc.paid || 0) - momo), momo: momo }, false), 50);
    } catch (e) { toast('Needs internet'); btn.disabled = false; btn.textContent = 'Save payment'; }
  };
  ACT.dStatus = async d => {
    try { const r = await api('docs', { op: 'status', no: D.view.no, status: d.s }); if (!r.ok) { toast(errText(r.error)); return; } toast('Marked ' + d.s.toLowerCase()); await loadDocs(); const doc = findDoc(D.view.no); if (doc) viewSheet(doc); } catch (e) { toast('Needs internet'); }
  };
  ACT.dDel = () => {
    const v = D.view;
    sheet('<h2>Delete ' + esc(v.no) + '?</h2><p class="small">' + (v.type === 'INV' ? 'This also removes its sale lines and payments from the records.' : 'The document is removed.') + ' A copy of the details is kept in the Deleted log.</p><label>Reason</label><input id="dreason" placeholder="Example: entered twice"><br><button class="btn danger block" data-act="dDelGo">Delete</button>');
  };
  ACT.dDelGo = async (d, btn) => {
    const reason = $('#dreason').value.trim(); if (reason.length < 3) { toast('Please give a reason'); return; }
    btn.disabled = true;
    try { const r = await api('docs', { op: 'delete', no: D.view.no, reason }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } toast('Deleted'); closeSheet(); await loadDocs(); KL.refreshCache(); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };

  /* ---------- print / PDF and WhatsApp ---------- */
  ACT.dPrint = () => {
    const v = D.view; let host = $('#printdoc'); if (host) host.remove();
    host = document.createElement('div'); host.id = 'printdoc'; host.innerHTML = paperHTML(v, false); document.body.appendChild(host);
    if (!$('#printcss')) { const st = document.createElement('style'); st.id = 'printcss'; st.textContent = '#printdoc{display:none}@media print{body>*:not(#printdoc){display:none!important}#printdoc{display:block!important;padding:10mm}#printdoc .paper{border:0!important;font-size:12pt}@page{size:A4;margin:10mm}}'; document.head.appendChild(st); }
    document.title = T[v.type] + ' ' + v.no + ' - ' + v.customer;
    setTimeout(() => { window.print(); document.title = bizName(); }, 80);
    toast('Choose "Save as PDF" to keep a PDF');
  };
  ACT.dWa = () => {
    const v = D.view, items = v.data.items || [], wb = v.type === 'WB';
    const lines = [bizName() + ' - ' + T[v.type] + ' ' + v.no, v.date, (wb ? 'Deliver to: ' : 'Customer: ') + v.customer, ''].concat(items.map(i => '- ' + i.q + ' x ' + i.p + (wb ? '' : ' @ ' + r2(i.u).toFixed(2) + ' = ' + r2(i.q * i.u).toFixed(2))));
    if (!wb) { lines.push('', 'Total: ' + money(v.total)); if (v.type === 'INV') { lines.push('Paid: ' + money(v.paid || 0)); const b = r2(v.total - (v.paid || 0)); lines.push(b > 0.004 ? 'Balance: ' + money(b) : 'Fully paid'); } if (cfg().momo) lines.push('', 'Pay by MoMo: ' + cfg().momo + (cfg().momoName ? ' (' + cfg().momoName + ')' : '')); }
    else lines.push('', 'Vehicle: ' + (v.data.vehicle || '-') + '  Driver: ' + (v.data.driver || '-'));
    if (v.data.terms && !wb) lines.push('', v.data.terms);
    lines.push('', POWERED);
    let n = String(v.phone || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1);
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  };

  /* ---------- ceiling estimator (rules from Setup > Estimator rules) ---------- */
  async function getRules() {
    if (D.rules) return D.rules;
    try { D.rules = await KL.kvGet('rules'); } catch (e) { /* ignore */ }
    try { const r = await api('docs', { op: 'rules' }); if (r.ok) { D.rules = r.rules; D.ruleHead = r.head; KL.kvSet('rules', r.rules).catch(() => {}); } } catch (e) { /* offline: use saved */ }
    return D.rules;
  }
  KL.estimate = calc; // for testing
  function calc(rooms, R, wastePb, wasteAc) {
    const n = k => +R[k] || 0, out = [], add = (item, q, unit) => { if (q > 0) out.push({ p: String(R[item] || item), q, unit }); };
    const pb = rooms.filter(r => r.t !== 'AC'), ac = rooms.filter(r => r.t === 'AC');
    const A = list => sum(list, r => (+r.l || 0) * (+r.w || 0)), P = list => sum(list, r => 2 * ((+r.l || 0) + (+r.w || 0)));
    const aPb = A(pb), aAc = A(ac), pPb = P(pb), pAc = P(ac), corn = P(rooms.filter(r => r.c));
    const wp = (wastePb === undefined ? n('pb_waste') : +wastePb) / 100, wa = (wasteAc === undefined ? n('ac_waste') : +wasteAc) / 100;
    const ceil = x => Math.ceil(r2(x) - 1e-9);
    if (aPb > 0) {
      add('pb_board_item', ceil(aPb * (1 + wp) / (n('pb_board_m2') || 2.88)));
      add('pb_main_item', ceil(aPb / (n('pb_main_space') || 1.2) / (n('pb_main_len') || 3)));
      add('pb_omega_item', ceil(aPb / (n('pb_omega_space') || 0.6) / (n('pb_omega_len') || 3)));
      add('pb_angle_item', ceil(pPb / (n('pb_angle_len') || 3)));
      add('pb_comp_item', ceil(aPb * n('pb_comp_per_m2') / (n('pb_comp_bag') || 25)));
      if (n('lab_pb_rate') > 0) out.push({ p: String(R.lab_pb_item), q: r2(aPb), u: n('lab_pb_rate'), labour: true });
    }
    if (corn > 0) { const pcs = ceil(corn / (n('cornice_len') || 2.4)); add('cornice_item', pcs); if (n('lab_cornice_rate') > 0) out.push({ p: String(R.lab_cornice_item), q: pcs, u: n('lab_cornice_rate'), labour: true }); }
    if (aAc > 0) {
      add('ac_tile_item', ceil(aAc * (1 + wa) / (n('ac_tile_m2') || 0.36)));
      add('ac_main_item', ceil(aAc / (n('ac_main_space') || 1.2) / (n('ac_main_len') || 3.6)));
      add('ac_ct12_item', ceil(aAc * n('ac_ct12_per_m2')));
      add('ac_ct06_item', ceil(aAc * n('ac_ct06_per_m2')));
      add('ac_angle_item', ceil(pAc / (n('ac_angle_len') || 3)));
      if (n('lab_ac_rate') > 0) out.push({ p: String(R.lab_ac_item), q: r2(aAc), u: n('lab_ac_rate'), labour: true });
    }
    return { lines: out, areaPb: r2(aPb), areaAc: r2(aAc) };
  }
  ACT.dEstimator = async () => {
    readEdit();
    const R = await getRules(); if (!R) { toast('Connect to the internet once to load the estimator rules'); return; }
    D.est = D.est || { rooms: (D.edit.rooms && D.edit.rooms.length ? D.edit.rooms : [{ n: 'Room 1', l: '', w: '', t: 'PB', c: false }]), wp: R.pb_waste, wa: R.ac_waste };
    estSheet();
  };
  function readEst() {
    if (!D.est || !$('#ewp')) return;
    D.est.wp = $('#ewp').value; D.est.wa = $('#ewa').value;
    document.querySelectorAll('[data-er]').forEach(el => { const r = D.est.rooms[+el.dataset.n]; if (!r) return; const k = el.dataset.er; r[k] = k === 'c' ? el.checked : el.value; });
  }
  function estSheet() {
    const E = D.est, R = D.rules, res = calc(E.rooms, R, E.wp, E.wa);
    sheet('<h2>Ceiling estimator</h2><p class="small muted" style="margin-top:0">Rules come from Setup → Estimator rules.</p>' +
      E.rooms.map((r, n) => '<div class="card" style="padding:10px;margin:6px 0"><div class="row"><input data-er="n" data-n="' + n + '" value="' + esc(r.n) + '" class="grow" placeholder="Room name"><button class="btn sm danger" data-act="eDel" data-n="' + n + '" aria-label="Remove room">✕</button></div>' +
        '<div class="row" style="margin-top:6px"><div class="grow"><label style="margin:0">Length (m)</label><input data-er="l" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(r.l) + '"></div><div class="grow"><label style="margin:0">Width (m)</label><input data-er="w" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(r.w) + '"></div></div>' +
        '<div class="row" style="margin-top:6px"><select data-er="t" data-n="' + n + '" class="grow"><option value="PB"' + (r.t !== 'AC' ? ' selected' : '') + '>Plasterboard</option><option value="AC"' + (r.t === 'AC' ? ' selected' : '') + '>Acoustic</option></select>' +
        '<label style="margin:0;display:flex;align-items:center;gap:6px;white-space:nowrap"><input data-er="c" data-n="' + n + '" type="checkbox" style="width:auto;min-height:0"' + (r.c ? ' checked' : '') + '> Cornice</label></div></div>').join('') +
      '<button class="btn sm block" data-act="eAdd">+ Add room</button>' +
      '<div class="picker"><div><label>Board waste %</label><input id="ewp" type="number" inputmode="decimal" value="' + esc(E.wp) + '"></div><div><label>Tile waste %</label><input id="ewa" type="number" inputmode="decimal" value="' + esc(E.wa) + '"></div></div>' +
      '<button class="btn block" data-act="eCalc" style="margin-top:8px">Work it out</button>' +
      '<div class="card" style="margin-top:8px"><h3>Materials · ' + res.areaPb + ' m² plasterboard' + (res.areaAc ? ' · ' + res.areaAc + ' m² acoustic' : '') + '</h3>' +
      (res.lines.length ? res.lines.map(i => { const pr = i.u !== undefined ? i.u : priceOf(i.p); return '<div class="row between small" style="padding:4px 0"><span>' + esc(i.p) + '</span><span><b>' + i.q + '</b>' + (pr === null ? ' <span class="badge amber">no price</span>' : '') + '</span></div>'; }).join('') : '<p class="small muted">Enter room sizes, then tap Work it out.</p>') + '</div>' +
      '<br><button class="btn primary block" data-act="eUse"' + (res.lines.length ? '' : ' disabled') + '>Add these to the ' + T[D.edit.type].toLowerCase() + '</button>');
  }
  ACT.eAdd = () => { readEst(); D.est.rooms.push({ n: 'Room ' + (D.est.rooms.length + 1), l: '', w: '', t: D.est.rooms.length ? D.est.rooms[D.est.rooms.length - 1].t : 'PB', c: false }); estSheet(); };
  ACT.eDel = d => { readEst(); D.est.rooms.splice(+d.n, 1); if (!D.est.rooms.length) D.est.rooms.push({ n: 'Room 1', l: '', w: '', t: 'PB', c: false }); estSheet(); };
  ACT.eCalc = () => { readEst(); estSheet(); };
  ACT.eUse = () => {
    readEst(); const res = calc(D.est.rooms, D.rules, D.est.wp, D.est.wa), e = D.edit;
    res.lines.forEach(l => {
      const u = l.u !== undefined ? l.u : (priceOf(l.p) || 0), ex = e.items.find(i => kk(i.p) === kk(l.p));
      if (ex) ex.q = l.q; else e.items.push({ p: l.p, q: l.q, u });
    });
    e.rooms = D.est.rooms.map(r => ({ n: r.n, l: +r.l || 0, w: +r.w || 0, t: r.t, c: !!r.c }));
    if (!e.title) { const a = r2(res.areaPb + res.areaAc); e.title = e.rooms.length + ' room' + (e.rooms.length > 1 ? 's' : '') + ' ceiling · ' + a + ' m²'; }
    D.est = null; editSheet(); toast('Materials added. Check the prices, then Preview.');
  };

  /* ---------- Setup: estimator rules and document settings ---------- */
  ACT.dRules = async () => {
    D.rules = null; const R = await getRules(); if (!R || !D.ruleHead) { toast('Needs internet'); return; }
    sheet('<h2>Estimator rules</h2><p class="small muted" style="margin-top:0">Product names must match your products list so prices fill in.</p>' +
      D.ruleHead.map(h => '<label>' + esc(h.label) + '</label><input data-rule="' + esc(h.key) + '" value="' + esc(R[h.key]) + '">' + (h.note ? '<div class="small muted">' + esc(h.note) + '</div>' : '')).join('') +
      '<br><button class="btn primary block" data-act="dRulesSave">Save rules</button>');
  };
  ACT.dRulesSave = async (d, btn) => {
    const values = {}; document.querySelectorAll('[data-rule]').forEach(el => { values[el.dataset.rule] = el.value; });
    btn.disabled = true; btn.textContent = 'Saving…';
    try { const r = await api('docs', { op: 'rulesSet', values }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } D.rules = r.rules; KL.kvSet('rules', r.rules).catch(() => {}); toast('Rules saved'); closeSheet(); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.dSettings = () => {
    const c = cfg();
    sheet('<h2>Document settings</h2>' +
      '<label>Use documents (estimates, invoices, waybills)?</label><select id="sdocs"><option value="Yes"' + (c.docs !== 'No' ? ' selected' : '') + '>Yes</option><option value="No"' + (c.docs === 'No' ? ' selected' : '') + '>No, hide them</option></select>' +
      '<div class="picker"><div><label>Estimate valid (days)</label><input id="sed" type="number" value="' + esc(c.estDays || 14) + '"></div><div><label>Invoice due (days)</label><input id="sid" type="number" value="' + esc(c.invDays || 7) + '"></div></div>' +
      '<label>Estimate and pro forma terms</label><textarea id="set" rows="4" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(c.estTerms || '') + '</textarea>' +
      '<label>Invoice terms</label><textarea id="sit" rows="3" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(c.invTerms || '') + '</textarea>' +
      '<br><button class="btn primary block" data-act="dSettingsSave">Save</button>');
  };
  ACT.dSettingsSave = async (d, btn) => {
    const values = { docs: $('#sdocs').value, estDays: $('#sed').value, invDays: $('#sid').value, estTerms: $('#set').value, invTerms: $('#sit').value };
    btn.disabled = true;
    try { const r = await api('admin', { op: 'saveSettings', values }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } if (S.cache && r.cfg) S.cache.cfg = r.cfg; toast('Saved'); closeSheet(); render(); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
})();
