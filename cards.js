/* EasySales - job cards: phone & laptop repairs, tailoring & sewing. Preview before saving, claim ticket, "ready" message. */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, api, esc, money, r2, sum, kk, $, today, toast, sheet, closeSheet, errText, cfg, bizName } = KL;
  const render = k => KL.fn('render')(k);
  const POWERED = 'Powered by EasySales · 020 320 7240';
  const C = { list: null, flow: { Repair: ['Received', 'Checking', 'Waiting for parts', 'Fixing', 'Ready', 'Collected', 'Cannot fix'], Tailoring: ['Received', 'Cutting', 'Sewing', 'Fitting', 'Ready', 'Collected'] }, f: 'open', q: '', e: null, v: null };
  Object.assign(KL.ERR, { set_price_first: 'Put the price first, then take the deposit.' });
  const on = () => KL.hasMod && KL.hasMod('cards');
  const kinds = () => { const k = cfg().cardKinds || 'Both'; return k === 'Repair' ? ['Repair'] : k === 'Tailoring' ? ['Tailoring'] : ['Repair', 'Tailoring']; };
  const KN = { Repair: 'Repair', Tailoring: 'Sewing order' };
  const MEAS = ['Chest / bust', 'Waist', 'Hips', 'Shoulder', 'Sleeve length', 'Round sleeve', 'Neck', 'Top length', 'Trouser / skirt length', 'Thigh', 'Knee', 'Bottom / ankle', 'Inseam'];
  const GARMENTS = ['Kaba and slit', 'Dress', 'Skirt', 'Blouse', 'Shirt', 'Trousers', 'Suit', 'Smock / fugu', 'Agbada', 'Kente / cloth sewing', 'Uniform', 'Alteration'];

  /* ---------- tab ---------- */
  ICON.cards = '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';
  const _tabsFor = KL.fn('tabsFor');
  KL.setFn('tabsFor', function () {
    const t = _tabsFor(); if (!S.session || !on()) return t;
    const at = t.findIndex(x => x[0] === 'custs'); t.splice(at >= 0 ? at : t.length, 0, ['cards', 'Job cards']); return t;
  });
  const _tab = ACT.tab; ACT.tab = d => { _tab(d); if (d.t === 'cards') load(); };
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    _render(k);
    if (!S.session) return;
    const m = document.querySelector('main.wrap');
    if (m && S.tab === 'cards') m.innerHTML = listHTML();
    if (S.tab === 'dash' && on() && !C.list && !C.asked && navigator.onLine) { C.asked = 1; load(); }
  });
  // Home: cards that are ready but not collected, and cards past their due date
  const _att = KL.moreAttention;
  KL.moreAttention = () => {
    const base = _att ? _att() : []; if (!on() || !C.list) return base;
    C.list.filter(c => c.status === 'Ready').slice(0, 3).forEach(c => base.push({ k: 'cards', i: '✓', bg: '#ECFDF3', fg: '#166534', a: esc(c.customer) + ' · ' + esc(c.item), b: 'Ready, not collected · ' + esc(c.no), amt: c.balance > 0 ? money(c.balance) : 'paid', o: 1 }));
    C.list.filter(c => c.due && c.due < today() && ['Ready', 'Collected', 'Cannot fix'].indexOf(c.status) < 0).slice(0, 3).forEach(c => base.push({ k: 'cards', i: '!', bg: '#FEE2E2', fg: '#B91C1C', a: esc(c.customer) + ' · ' + esc(c.item), b: 'Late · was due ' + esc(c.due), amt: esc(c.status), o: 0 }));
    return base;
  };
  KL.cardsOn = on;
  async function load() {
    try { const r = await api('cards', { op: 'list' }); if (r.ok) { C.list = r.cards; C.flow = r.flow || C.flow; KL.kvSet('cards', r.cards).catch(() => {}); } else toast(errText(r.error)); }
    catch (e) { if (!C.list) { try { C.list = await KL.kvGet('cards'); } catch (x) { /* none */ } } }
    if (S.tab === 'cards' || S.tab === 'dash') render(true);
  }
  const badge = s => '<span class="badge ' + (s === 'Ready' ? 'green' : s === 'Collected' ? '' : s === 'Cannot fix' ? 'red' : 'amber') + '">' + esc(s) + '</span>';

  /* ---------- list ---------- */
  ACT.cfF = d => { C.f = d.k; render(true); };
  document.addEventListener('input', ev => { if (ev.target.id === 'cfq') { C.q = ev.target.value; const el = document.getElementById('cflist'); if (el) el.innerHTML = rowsHTML(); } });
  function filtered() {
    const q = kk(C.q);
    return (C.list || []).filter(c => (C.f === 'all' || (C.f === 'open' ? ['Collected', 'Cannot fix'].indexOf(c.status) < 0 && c.status !== 'Ready' : C.f === 'ready' ? c.status === 'Ready' : ['Collected', 'Cannot fix'].indexOf(c.status) >= 0)) &&
      (!q || kk(c.customer + ' ' + c.item + ' ' + c.no + ' ' + c.phone + ' ' + (c.data.imei || '')).indexOf(q) >= 0));
  }
  function rowsHTML() {
    const L = filtered(); if (!L.length) return '<div class="empty">Nothing here.</div>';
    return L.slice(0, 150).map(c => '<button class="item" data-act="cfOpen" data-no="' + esc(c.no) + '"><span class="grow"><span class="nm">' + esc(c.customer) + '</span><br><span class="small muted">' + esc(c.no) + ' · ' + esc(c.item) + (c.due ? ' · due <span class="' + (c.due < today() && ['Ready', 'Collected', 'Cannot fix'].indexOf(c.status) < 0 ? 'red' : '') + '">' + esc(c.due) + '</span>' : '') + '</span></span><span class="right">' + badge(c.status) + '<br><span class="small ' + (c.balance > 0.004 ? 'red' : 'muted') + '">' + (c.price ? (c.balance > 0.004 ? money(c.balance) + ' to pay' : 'paid') : 'no price yet') + '</span></span></button>').join('');
  }
  function listHTML() {
    const K = kinds();
    let h = '<div class="row" style="gap:8px;margin-top:6px">' + K.map(k => '<button class="btn primary grow" data-act="cfNew" data-k="' + k + '">+ ' + (k === 'Repair' ? 'New repair' : 'New sewing order') + '</button>').join('') + '</div>';
    if (!C.list) return h + '<div class="empty">' + (navigator.onLine ? 'Loading…' : 'Needs internet.') + '</div>';
    const open = C.list.filter(c => ['Collected', 'Cannot fix'].indexOf(c.status) < 0), ready = C.list.filter(c => c.status === 'Ready');
    h += '<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><span>In the shop</span><b>' + open.length + '</b></div><div class="stat"><span>Ready</span><b class="green">' + ready.length + '</b></div><div class="stat"><span>To collect</span><b style="font-size:15px" class="red">' + money(sum(C.list, c => Math.max(0, c.balance))) + '</b></div></div>';
    h += '<input id="cfq" placeholder="Search name, phone, item, IMEI, card no." value="' + esc(C.q) + '" style="margin-top:8px">';
    h += '<div class="chips" style="margin-top:8px">' + [['open', 'Working on'], ['ready', 'Ready'], ['done', 'Collected'], ['all', 'All']].map(x => '<button class="chip ' + (C.f === x[0] ? 'on' : '') + '" data-act="cfF" data-k="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    if (S.session.role === 'admin') h += '<div class="row" style="justify-content:flex-end"><button class="btn sm ghost" data-act="cfSet">Job card settings</button></div>';
    return h + '<div class="card" style="padding:4px 14px" id="cflist">' + rowsHTML() + '</div>';
  }

  /* ---------- the ticket the customer keeps (also the preview before saving) ---------- */
  function ticketHTML(c, preview) {
    const s = cfg(), c1 = s.c1 || '#7A1F3D', d = c.data || {}, R = (a, b) => b ? '<tr><td style="padding:4px 6px;color:#5B6B78;width:38%;vertical-align:top">' + a + '</td><td style="padding:4px 6px">' + b + '</td></tr>' : '';
    const parts = d.parts || [], price = r2((+d.service || 0) + sum(parts, p => p.q * p.u)), paid = r2(c.paid || 0), bal = r2(price - paid);
    let h = '<div class="paper" style="position:relative;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;font-size:12.5px;color:#1F2933;overflow:hidden">';
    if (preview) h += '<div style="position:absolute;top:10px;right:-36px;transform:rotate(35deg);background:#FFF0D2;color:#7A4B00;font-weight:800;font-size:11px;padding:3px 42px">PREVIEW</div>';
    h += '<div style="display:flex;gap:10px;align-items:center"><img src="' + KL.logoSrc() + '" alt="" style="width:48px;height:48px;object-fit:contain"><div style="flex:1"><b style="color:' + esc(c1) + '">' + esc(bizName()) + '</b><div style="font-size:11px;color:#5B6B78">' + esc([s.location, s.phone].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div style="text-align:right"><b style="color:' + esc(c1) + '">' + (c.kind === 'Tailoring' ? 'SEWING ORDER' : 'REPAIR TICKET') + '</b><div style="font-size:20px;font-weight:800">' + esc(c.no || 'New') + '</div></div></div>' +
      '<div style="height:3px;background:' + esc(c1) + ';margin:8px 0"></div><table style="width:100%;border-collapse:collapse">' +
      R('Customer', '<b>' + esc(c.customer) + '</b>' + (c.phone ? ' · ' + esc(c.phone) : '')) + R('Received', esc(c.date || today())) + R(c.kind === 'Tailoring' ? 'Garment' : 'Item', '<b>' + esc(c.item) + '</b>' + (c.kind === 'Tailoring' && d.qty > 1 ? ' × ' + d.qty : '')) +
      (c.kind === 'Tailoring' ? R('Fabric', esc(d.fabric || '')) + R('Style', esc(d.style || '')) + R('Fitting', esc(d.fitting || '')) : R('IMEI / serial', esc(d.imei || '')) + R('Problem', esc(d.problem || '')) + R('Left with us', esc(d.accessories || '')) + R('Condition', esc(d.condition || ''))) +
      R('Ready by', '<b>' + esc(c.due || 'we will call you') + '</b>') + '</table>';
    if (parts.length) h += '<table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:11.5px"><tr style="background:#F1F3F6"><th style="text-align:left;padding:4px 6px">Parts</th><th style="text-align:right;padding:4px 6px">Qty</th><th style="text-align:right;padding:4px 6px">Amount</th></tr>' + parts.map(p => '<tr><td style="padding:4px 6px">' + esc(p.p) + '</td><td style="text-align:right;padding:4px 6px">' + p.q + '</td><td style="text-align:right;padding:4px 6px">' + r2(p.q * p.u).toFixed(2) + '</td></tr>').join('') + '</table>';
    h += '<div style="margin-top:8px;display:flex;flex-direction:column;align-items:flex-end;gap:2px">' + (price ? (parts.length && +d.service ? '<div>' + (c.kind === 'Tailoring' ? 'Sewing' : 'Service') + ' ' + money(+d.service) + '</div>' : '') + '<div style="font-size:16px;font-weight:800">Total ' + money(price) + '</div>' + (paid ? '<div style="color:#1E7B4F">Paid ' + money(paid) + '</div>' : '') + '<div style="font-weight:700;color:' + (bal > 0.004 ? '#B3261E' : '#1E7B4F') + '">' + (bal > 0.004 ? 'Balance ' + money(bal) : 'Fully paid') + '</div>' : '<div class="muted">Price: after checking</div>') + '</div>';
    if (s.cardTerms) h += '<div style="margin-top:10px;font-size:10.5px;color:#5B6B78">' + esc(s.cardTerms) + '</div>';
    h += '<div style="margin-top:8px;font-size:11px;text-align:center"><b>Bring this ticket (or the number ' + esc(c.no || '') + ') when you come for it.</b></div><div style="margin-top:8px;text-align:center;font-size:9.5px;color:#9AA5B1">' + POWERED + '</div></div>';
    return h;
  }

  /* ---------- new / edit ---------- */
  ACT.cfNew = d => { C.e = { kind: d.k, no: '', customer: '', phone: '', item: '', due: '', service: '', parts: [], cash: '', momo: '', imei: '', problem: '', accessories: '', condition: '', tech: '', garment: '', qty: 1, fabric: "Customer's own", style: '', fitting: '', note: '', meas: {} }; form(); };
  ACT.cfEdit = () => { const v = C.v; C.e = Object.assign({ kind: v.kind, no: v.no, customer: v.customer, phone: v.phone, item: v.item, due: v.due, cash: '', momo: '', parts: (v.data.parts || []).map(p => Object.assign({}, p)), meas: Object.assign({}, v.data.meas || {}) }, v.data, { service: v.data.service || '' }); form(); };
  const custs = () => KL.derived().customers.filter(c => kk(c.name) !== kk(KL.WALKIN));
  const products = () => ((S.lists && S.lists.products) || (S.cache && S.cache.products) || []);
  function form() {
    const e = C.e, tl = e.kind === 'Tailoring', inp = (id, lab, v, ph, t) => '<label>' + lab + '</label><input id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (t ? ' type="' + t + '"' + (t === 'number' ? ' inputmode="decimal"' : '') : '') + '>';
    let h = '<h2>' + (e.no ? 'Edit ' + esc(e.no) : tl ? 'New sewing order' : 'New repair') + '</h2>' +
      '<label>Customer</label><input id="cfc" list="cfcl" value="' + esc(e.customer) + '" autocomplete="off"><datalist id="cfcl">' + custs().map(c => '<option value="' + esc(c.name) + '">').join('') + '</datalist>' + inp('cfp', 'Phone (for the ready message)', e.phone, '024…', 'tel');
    if (tl) {
      h += '<label>Garment</label><input id="cfi" list="cfgl" value="' + esc(e.item) + '" placeholder="Example: Kaba and slit"><datalist id="cfgl">' + GARMENTS.map(g => '<option value="' + esc(g) + '">').join('') + '</datalist>' +
        '<div class="picker"><div>' + inp('cfqty', 'How many', e.qty, '', 'number') + '</div><div>' + inp('cffab', 'Fabric', e.fabric, "Customer's own / ours") + '</div></div>' + inp('cfsty', 'Style', e.style, 'Example: off-shoulder, short sleeve, slit with lining') +
        '<h3 style="margin:14px 0 0">Measurements (inches) <button class="btn sm ghost" data-act="cfLast" style="float:right">Use last</button></h3><div class="picker">' + MEAS.map((m, i) => '<div><label>' + m + '</label><input data-ms="' + esc(m) + '" inputmode="decimal" value="' + esc(e.meas[m] || '') + '"></div>').join('') + '</div>' +
        inp('cffit', 'Fitting date', e.fitting, '', 'date');
    } else {
      h += '<label>Phone / laptop</label><input id="cfi" value="' + esc(e.item) + '" placeholder="Example: Samsung A15, HP EliteBook 840">' + inp('cfim', 'IMEI / serial number', e.imei, 'Dial *#06# for IMEI') +
        inp('cfpr', 'Problem', e.problem, 'Example: broken screen, not charging') + inp('cfac', 'Left with us', e.accessories, 'Example: charger, case, SIM, memory card') + inp('cfco', 'Condition when received', e.condition, 'Example: scratches on back, cracked camera glass') + inp('cfte', 'Technician', e.tech, '');
      h += '<h3 style="margin:14px 0 0">Parts used</h3><datalist id="cfpl">' + products().map(p => '<option value="' + esc(p.name) + '">').join('') + '</datalist>' +
        (e.parts.length ? e.parts.map((p, n) => '<div class="row" style="gap:6px;margin-top:6px"><input data-cpp="p" data-n="' + n + '" list="cfpl" class="grow" value="' + esc(p.p) + '" placeholder="Part"><input data-cpp="q" data-n="' + n + '" type="number" inputmode="decimal" style="width:62px" value="' + esc(p.q) + '"><input data-cpp="u" data-n="' + n + '" type="number" inputmode="decimal" style="width:88px" value="' + esc(p.u) + '" placeholder="Price"><button class="btn sm danger" data-act="cfDelPart" data-n="' + n + '" aria-label="Remove part">✕</button></div>').join('') : '<p class="small muted">None yet. Parts from your products come off stock.</p>') +
        '<button class="btn sm block" data-act="cfAddPart" style="margin-top:6px">+ Add part</button>';
    }
    h += '<div class="picker"><div>' + inp('cfsv', tl ? 'Sewing price (GH₵)' : 'Service charge (GH₵)', e.service, tl ? '' : 'leave empty if not checked yet', 'number') + '</div><div>' + inp('cfdue', 'Ready by', e.due, '', 'date') + '</div></div>' +
      '<p style="text-align:right;font-weight:800;font-size:17px;margin:8px 0 0" id="cftot"></p>' +
      '<div class="picker"><div>' + inp('cfcash', e.no ? 'Pay now: cash' : 'Deposit: cash', e.cash, '0', 'number') + '</div><div>' + inp('cfmomo', e.no ? 'Pay now: MoMo' : 'Deposit: MoMo', e.momo, '0', 'number') + '</div></div>' +
      inp('cfnote', 'Note (only for you)', e.note, '') + '<br><button class="btn primary block" data-act="cfPreview">Preview</button>';
    sheet(h); total();
  }
  function read() {
    const e = C.e, g = id => { const el = $('#' + id); return el ? el.value : undefined; };
    e.customer = g('cfc').trim(); e.phone = g('cfp').trim(); e.item = g('cfi').trim(); e.service = g('cfsv'); e.due = g('cfdue'); e.cash = g('cfcash'); e.momo = g('cfmomo'); e.note = g('cfnote');
    if (e.kind === 'Tailoring') { e.qty = g('cfqty'); e.fabric = g('cffab'); e.style = g('cfsty'); e.fitting = g('cffit'); document.querySelectorAll('[data-ms]').forEach(el => { e.meas[el.dataset.ms] = el.value.trim(); }); }
    else { e.imei = g('cfim'); e.problem = g('cfpr'); e.accessories = g('cfac'); e.condition = g('cfco'); e.tech = g('cfte'); document.querySelectorAll('[data-cpp]').forEach(el => { const p = e.parts[+el.dataset.n]; if (p) p[el.dataset.cpp] = el.dataset.cpp === 'p' ? el.value : el.value === '' ? '' : +el.value; }); }
  }
  const priceOf = n => { const p = products().find(x => kk(x.name) === kk(n)); return p ? p.price : null; };
  function total() { const e = C.e, el = $('#cftot'); if (!el || !e) return; const t = r2((+($('#cfsv') || {}).value || 0) + sum(e.parts, p => (+p.q || 0) * (+p.u || 0))); el.textContent = t ? 'Total ' + money(t) : ''; }
  document.addEventListener('input', ev => {
    const t = ev.target; if (!C.e || !t.dataset) return;
    if (t.dataset.cpp) { const p = C.e.parts[+t.dataset.n]; if (!p) return; if (t.dataset.cpp === 'p') { p.p = t.value; const pr = priceOf(t.value); if (pr !== null) { p.u = pr; const u = document.querySelector('[data-cpp="u"][data-n="' + t.dataset.n + '"]'); if (u) u.value = pr; } } else p[t.dataset.cpp] = t.value === '' ? '' : +t.value; }
    if (t.dataset.cpp || t.id === 'cfsv') total();
    if (t.id === 'cfc') { const c = custs().find(x => kk(x.name) === kk(t.value)); if (c && c.phone && $('#cfp') && !$('#cfp').value) $('#cfp').value = c.phone; }
  });
  ACT.cfAddPart = () => { read(); C.e.parts.push({ p: '', q: 1, u: '' }); form(); };
  ACT.cfDelPart = d => { read(); C.e.parts.splice(+d.n, 1); form(); };
  ACT.cfLast = async () => {
    read(); if (!C.e.customer) { toast('Enter the customer first'); return; }
    try { const r = await api('cards', { op: 'meas', customer: C.e.customer }); if (r.ok && r.meas) { C.e.meas = Object.assign({}, r.meas.data); form(); toast('Measurements from ' + r.meas.updated.slice(0, 10)); } else toast('No measurements saved for ' + C.e.customer + ' yet'); } catch (e) { toast('Needs internet'); }
  };
  ACT.cfPreview = () => {
    read(); const e = C.e;
    if (!e.customer) { toast('Enter the customer'); return; } if (!e.item) { toast(e.kind === 'Tailoring' ? 'Enter the garment' : 'Enter the phone or laptop'); return; }
    e.parts = e.parts.filter(p => String(p.p || '').trim() && +p.q > 0);
    const price = r2((+e.service || 0) + sum(e.parts, p => p.q * (+p.u || 0))), pay = r2((+e.cash || 0) + (+e.momo || 0)), before = e.no && C.v ? (C.v.paid || 0) : 0;
    if (pay > 0 && !price) { toast('Put the price first, then take the deposit'); form(); return; }
    if (before + pay > price + 0.001) { toast('That is more than the total'); form(); return; }
    const c = { kind: e.kind, no: e.no, date: e.no && C.v ? C.v.date : today(), customer: e.customer, phone: e.phone, item: e.item, due: e.due, paid: before + pay, data: Object.assign({}, e, { service: +e.service || 0 }) };
    sheet('<h2>Check before saving</h2><p class="small muted" style="margin-top:0">This is the ticket your customer gets.</p>' + ticketHTML(c, true) + (e.kind === 'Tailoring' && Object.values(e.meas).some(Boolean) ? '<details class="card small" style="margin-top:8px"><summary><b>Measurements</b> (kept for you, not on the ticket)</summary>' + MEAS.filter(m => e.meas[m]).map(m => '<div class="row between"><span>' + m + '</span><b>' + esc(e.meas[m]) + '</b></div>').join('') + '</details>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn grow" data-act="cfBack">Edit</button><button class="btn primary grow" data-act="cfSave">Confirm and save</button></div>');
  };
  ACT.cfBack = () => form();
  ACT.cfSave = async (d, btn) => {
    const e = C.e; btn.disabled = true; btn.textContent = 'Saving…';
    const body = { op: 'save', no: e.no, kind: e.kind, customer: e.customer, phone: e.phone, item: e.item, due: e.due, service: +e.service || 0, cash: +e.cash || 0, momo: +e.momo || 0, note: e.note };
    if (e.kind === 'Tailoring') Object.assign(body, { qty: e.qty, fabric: e.fabric, style: e.style, fitting: e.fitting, meas: e.meas }); else Object.assign(body, { imei: e.imei, problem: e.problem, accessories: e.accessories, condition: e.condition, tech: e.tech, parts: e.parts });
    try {
      const r = await api('cards', body);
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; btn.textContent = 'Confirm and save'; return; }
      toast((e.no ? 'Saved ' : 'Job card ') + r.no); C.e = null; await load(); view(r.no); KL.refreshCache && KL.refreshCache();
    } catch (x) { toast('Needs internet to save'); btn.disabled = false; btn.textContent = 'Confirm and save'; }
  };

  /* ---------- open a card ---------- */
  ACT.cfOpen = d => view(d.no);
  function view(no) {
    const c = (C.list || []).find(x => x.no === no); if (!c) return; C.v = c;
    const flow = C.flow[c.kind] || C.flow.Repair, log = (c.data.log || []).slice().reverse();
    sheet('<h2>' + esc(c.no) + ' · ' + esc(c.customer) + ' ' + badge(c.status) + '</h2>' +
      '<div class="chips">' + flow.map(s => '<button class="chip ' + (s === c.status ? 'on' : '') + '" data-act="cfSt" data-s="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' +
      ticketHTML(c, false) +
      (c.kind === 'Tailoring' && c.data.meas && Object.keys(c.data.meas).length ? '<details class="card small" style="margin-top:8px"><summary><b>Measurements</b></summary>' + Object.keys(c.data.meas).map(m => '<div class="row between"><span>' + esc(m) + '</span><b>' + esc(c.data.meas[m]) + '</b></div>').join('') + '</details>' : '') +
      (c.data.note ? '<p class="small"><b>Note:</b> ' + esc(c.data.note) + '</p>' : '') +
      '<div style="display:grid;gap:8px;margin-top:12px">' +
      (c.status === 'Ready' ? '<button class="btn primary block" data-act="cfCollect">Customer collected it</button>' : '') +
      (c.phone && c.status === 'Ready' ? '<button class="btn violet block" data-act="cfTell">Tell customer it is ready (WhatsApp)</button>' : '') +
      (c.balance > 0.004 ? '<button class="btn block" data-act="cfPay">Record payment (' + money(c.balance) + ' to pay)</button>' : '') +
      '<div class="row"><button class="btn grow" data-act="cfPrint">Print ticket</button><button class="btn grow" data-act="cfWa">Send ticket</button></div>' +
      '<button class="btn ghost block" data-act="cfEdit">Edit details / price / parts</button>' +
      (S.session.role === 'admin' ? '<button class="btn danger block" data-act="cfDel">Delete</button>' : '') + '</div>' +
      '<h3 style="margin-top:14px">History</h3>' + log.map(l => '<div class="small" style="padding:3px 0;border-bottom:1px solid var(--line)"><b>' + esc(l.s) + '</b> · ' + esc(l.d) + ' · ' + esc(l.by || '') + (l.n ? ' · ' + esc(l.n) : '') + '</div>').join(''));
  }
  async function setStatus(s, extra) {
    try { const r = await api('cards', Object.assign({ op: 'status', no: C.v.no, status: s }, extra || {})); if (!r.ok) { toast(errText(r.error)); return false; } toast(s); await load(); view(C.v.no); return true; } catch (e) { toast('Needs internet'); return false; }
  }
  ACT.cfSt = async d => {
    if (d.s === 'Cannot fix') { sheet('<h2>Cannot fix ' + esc(C.v.item) + '</h2><p class="small">Will you charge anything for checking it?</p><label>Checking fee (GH₵)</label><input id="cff" type="number" inputmode="decimal" value="0"><br><button class="btn primary block" data-act="cfNoFix">Save</button>'); return; }
    if (d.s === 'Collected' && C.v.balance > 0.004) { toast('Take the balance first: ' + money(C.v.balance)); ACT.cfPay(); return; }
    const ok = await setStatus(d.s);
    if (ok && d.s === 'Ready' && C.v.phone) toast('Tap "Tell customer it is ready" to send the message');
  };
  ACT.cfNoFix = () => setStatus('Cannot fix', { fee: +$('#cff').value || 0 });
  ACT.cfCollect = () => ACT.cfSt({ s: 'Collected' });
  ACT.cfPay = () => sheet('<h2>Payment for ' + esc(C.v.no) + '</h2><p class="muted" style="margin:0">' + esc(C.v.customer) + ' owes <b class="red">' + money(C.v.balance) + '</b></p><div class="picker"><div><label>Cash</label><input id="cpc" type="number" inputmode="decimal" placeholder="0"></div><div><label>MoMo</label><input id="cpm" type="number" inputmode="decimal" placeholder="0"></div></div>' +
    '<label style="display:flex;gap:8px;align-items:center;font-weight:600;color:var(--ink)"><input id="cpx" type="checkbox" style="width:auto;min-height:0"' + (C.v.status === 'Ready' ? ' checked' : '') + '> Customer is collecting it now</label><br><button class="btn primary block" data-act="cfPaySave">Save payment</button>');
  ACT.cfPaySave = async (d, btn) => {
    const cash = r2(+$('#cpc').value || 0), momo = r2(+$('#cpm').value || 0), collect = $('#cpx').checked;
    if (cash + momo <= 0) { toast('Enter the amount'); return; } if (cash + momo > C.v.balance + 0.001) { toast('That is more than the balance'); return; }
    btn.disabled = true;
    try {
      const r = await api('cards', { op: 'pay', no: C.v.no, cash, momo });
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
      toast('Payment saved: ' + money(cash + momo)); KL.refreshCache && KL.refreshCache();
      if (collect && r2(C.v.balance - cash - momo) <= 0.004) await setStatus('Collected'); else { await load(); view(C.v.no); }
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  const wa = (p, t) => { let n = String(p || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1); window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(t), '_blank', 'noopener'); };
  ACT.cfTell = () => { const c = C.v; wa(c.phone, 'Hello ' + c.customer + ', your ' + c.item + ' is ready at ' + bizName() + '.' + (c.balance > 0.004 ? ' Balance to pay: ' + money(c.balance) + '.' : '') + ' Ticket number: ' + c.no + '.' + (cfg().location ? '\n' + cfg().location : '') + '\n\n' + POWERED); };
  ACT.cfWa = () => { const c = C.v, d = c.data; wa(c.phone, [bizName() + ' - ' + (c.kind === 'Tailoring' ? 'sewing order' : 'repair ticket') + ' ' + c.no, 'Customer: ' + c.customer, (c.kind === 'Tailoring' ? 'Garment: ' : 'Item: ') + c.item, d.problem ? 'Problem: ' + d.problem : '', d.imei ? 'IMEI/serial: ' + d.imei : '', d.accessories ? 'Left with us: ' + d.accessories : '', 'Ready by: ' + (c.due || 'we will call you'), c.price ? 'Total: ' + money(c.price) + (c.paid ? '\nPaid: ' + money(c.paid) : '') + '\nBalance: ' + money(Math.max(0, c.balance)) : '', '', 'Bring this ticket number when you come.', POWERED].filter(x => x !== '').join('\n')); };
  ACT.cfPrint = () => {
    let host = $('#printdoc'); if (host) host.remove(); host = document.createElement('div'); host.id = 'printdoc'; host.innerHTML = ticketHTML(C.v, false); document.body.appendChild(host);
    if (!$('#printcss')) { const st = document.createElement('style'); st.id = 'printcss'; st.textContent = '#printdoc{display:none}@media print{body>*:not(#printdoc){display:none!important}#printdoc{display:block!important;padding:8mm}#printdoc .paper{border:0!important}@page{size:A5;margin:8mm}}'; document.head.appendChild(st); }
    setTimeout(() => window.print(), 80);
  };
  ACT.cfDel = () => sheet('<h2>Delete ' + esc(C.v.no) + '?</h2><p class="small">Its sale and payments are removed too. A copy is kept in the Deleted log.</p><label>Reason</label><input id="cfr"><br><button class="btn danger block" data-act="cfDelGo">Delete</button>');
  ACT.cfDelGo = async (d, btn) => { const reason = $('#cfr').value.trim(); if (reason.length < 3) { toast('Please give a reason'); return; } btn.disabled = true; try { const r = await api('cards', { op: 'delete', no: C.v.no, reason }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } toast('Deleted'); closeSheet(); await load(); KL.refreshCache && KL.refreshCache(); } catch (e) { toast('Needs internet'); btn.disabled = false; } };
  ACT.cfSet = () => { const c = cfg(); sheet('<h2>Job card settings</h2><label>Job cards for</label><select id="cks"><option value="Both"' + ((c.cardKinds || 'Both') === 'Both' ? ' selected' : '') + '>Repairs and sewing</option><option value="Repair"' + (c.cardKinds === 'Repair' ? ' selected' : '') + '>Repairs only (phones, laptops…)</option><option value="Tailoring"' + (c.cardKinds === 'Tailoring' ? ' selected' : '') + '>Sewing only (tailor, seamstress)</option></select><label>Terms on the ticket</label><textarea id="ckt" rows="4" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(c.cardTerms || '') + '</textarea><br><button class="btn primary block" data-act="cfSetSave">Save</button>'); };
  ACT.cfSetSave = async (d, btn) => { btn.disabled = true; try { const r = await api('admin', { op: 'saveSettings', values: { cardKinds: $('#cks').value, cardTerms: $('#ckt').value } }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } if (S.cache && r.cfg) S.cache.cfg = r.cfg; toast('Saved'); closeSheet(); render(true); } catch (e) { toast('Needs internet'); btn.disabled = false; } };
})();

/* EasySales - Leads: people who ask about work after an advert (WhatsApp, Facebook, TikTok…). Owner only. */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, api, esc, today, toast, sheet, closeSheet, errText, bizName } = KL;
  const render = k => KL.fn('render')(k);
  const L = { list: null, asked: 0, filter: 'open', stages: ['New', 'Talked', 'Site visit', 'Quote sent', 'Won', 'Lost'], sources: ['WhatsApp', 'Facebook', 'TikTok', 'Referral', 'Walk-in', 'Other'] };
  const on = () => S.session && S.session.role === 'admin' && KL.hasMod && KL.hasMod('leads');
  const isOpen = l => l.stage !== 'Won' && l.stage !== 'Lost';
  const due = l => isOpen(l) && l.next && l.next <= today();
  const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const nice = d => { if (!d) return ''; if (d === today()) return 'today'; if (d === addDays(1)) return 'tomorrow'; const x = new Date(d + 'T00:00'); return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const SC = { New: ['#E0F2FE', '#075985'], Talked: ['#EDE9FE', '#5B21B6'], 'Site visit': ['#FEF3C7', '#92400E'], 'Quote sent': ['#FFEDD5', '#B45309'], Won: ['#DCFCE7', '#166534'], Lost: ['#F1F5F9', '#64748B'] };
  const pill = s => '<span style="font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:99px;background:' + (SC[s] || SC.New)[0] + ';color:' + (SC[s] || SC.New)[1] + '">' + esc(s) + '</span>';
  const intl = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '233' + d.slice(1); else if (d.length === 9) d = '233' + d; return d; };
  const inp = 'width:100%;font:inherit;padding:12px;border:1.5px solid var(--line);border-radius:12px;background:#fff';

  ICON.leads = '<svg viewBox="0 0 24 24"><path d="M4 5h16v10H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>';
  const _tabsFor = KL.fn('tabsFor');
  KL.setFn('tabsFor', function () { const t = _tabsFor(); if (on()) t.push(['leads', 'Leads']); return t; });
  const _tab = ACT.tab; ACT.tab = d => { _tab(d); if (d.t === 'leads') load(); };
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    _render(k);
    if (!S.session) return;
    const m = document.querySelector('main.wrap');
    if (m && S.tab === 'leads') m.innerHTML = listHTML();
    if (S.tab === 'dash' && on() && !L.list && !L.asked && navigator.onLine) { L.asked = 1; load(); }
  });
  // Home: leads to follow up today
  const _att = KL.moreAttention;
  KL.moreAttention = () => {
    const base = _att ? _att() : []; if (!on() || !L.list) return base;
    L.list.filter(due).slice(0, 3).forEach(l => base.push({ k: 'leads', i: '✆', bg: '#DCFCE7', fg: '#166534', a: esc(l.name) + (l.wants ? ' · ' + esc(l.wants) : ''), b: 'Follow up ' + (l.next < today() ? '(late, was ' + nice(l.next) + ')' : 'today') + ' · ' + esc(l.source), amt: '', o: 1 }));
    return base;
  };
  KL.leadsInfo = () => on() ? (L.list ? { due: L.list.filter(due).length, open: L.list.filter(isOpen).length } : { due: 0, open: 0, loading: true }) : null;

  async function load() {
    try { const r = await api('leads', { op: 'list' }); if (r.ok) { take(r); KL.kvSet('leads', r.leads).catch(() => {}); } else toast(errText(r.error)); }
    catch (e) { if (!L.list) { try { L.list = await KL.kvGet('leads'); } catch (x) { /* none */ } } }
    if (S.tab === 'leads' || S.tab === 'dash') render(true);
  }
  function take(r) { L.list = r.leads; if (r.stages) L.stages = r.stages; if (r.sources) L.sources = r.sources; }
  async function send(body, msg) {
    if (!navigator.onLine) { toast('Needs internet'); return false; }
    try { const r = await api('leads', body); if (!r.ok) { toast(errText(r.error)); return false; } take(r); KL.kvSet('leads', r.leads).catch(() => {}); if (msg) toast(msg); return true; }
    catch (e) { toast('Needs internet'); return false; }
  }

  function listHTML() {
    if (!L.list) return '<div class="empty">' + (navigator.onLine ? 'Loading…' : 'Leads need internet the first time.') + '</div>';
    const all = L.list, dueN = all.filter(due).length;
    const chips = [['open', 'Open (' + all.filter(isOpen).length + ')'], ['due', 'Follow up (' + dueN + ')']].concat(L.stages.map(s => [s, s + ' (' + all.filter(l => l.stage === s).length + ')']));
    const shown = all.filter(l => L.filter === 'open' ? isOpen(l) : L.filter === 'due' ? due(l) : l.stage === L.filter)
      .sort((a, b) => (a.next || '9999') < (b.next || '9999') ? -1 : 1);
    let h = '<div class="row between" style="margin-top:6px"><h2 style="margin:0">Leads</h2><button class="btn sm primary" data-act="ldEdit" data-id="">+ Add lead</button></div>' +
      '<p class="small muted" style="margin:4px 0 10px">People who asked about work from your adverts. Only you see this.</p>' +
      '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px">' + chips.map(c => '<button class="btn sm' + (L.filter === c[0] ? ' primary' : '') + '" style="white-space:nowrap" data-act="ldFilter" data-f="' + esc(c[0]) + '">' + esc(c[1]) + '</button>').join('') + '</div>';
    h += '<div class="card" style="padding:2px 14px;margin-top:6px">' + (shown.length ? shown.map(l => {
      const late = due(l);
      return '<button class="item" data-act="ldView" data-id="' + esc(l.id) + '" style="width:100%;text-align:left"><span class="grow"><span class="nm">' + esc(l.name) + '</span> ' + pill(l.stage) +
        '<br><span class="small muted">' + esc(l.wants || 'No details yet') + (l.area ? ' · ' + esc(l.area) : '') + ' · ' + esc(l.source) + '</span>' +
        (isOpen(l) && l.next ? '<br><span class="small" style="font-weight:600;color:' + (late ? '#B91C1C' : '#166534') + '">Follow up ' + nice(l.next) + '</span>' : '') + '</span></button>';
    }).join('') : '<div class="empty" style="padding:22px 0">' + (all.length ? 'None here.' : 'No leads yet. Tap + Add lead when someone messages you about work.') + '</div>') + '</div>';
    if (all.length) {
      const by = L.sources.map(s => { const x = all.filter(l => l.source === s); return [s, x.length, x.filter(l => l.stage === 'Won').length]; }).filter(x => x[1]);
      h += '<h2>Where your leads come from</h2><div class="card">' + by.map(x => '<div class="row between" style="padding:6px 0"><span>' + esc(x[0]) + '</span><span class="small"><b>' + x[1] + '</b> lead' + (x[1] === 1 ? '' : 's') + ' · <b style="color:#166534">' + x[2] + '</b> won</span></div>').join('') +
        '<p class="small muted" style="margin:6px 0 0">Spend more on the adverts that bring won jobs.</p></div>';
      const refs = {}; all.forEach(l => { const r = String(l.ref || '').trim(); if (!r) return; const k = r.toLowerCase(); (refs[k] = refs[k] || { name: r, n: 0, won: 0 }).n++; if (l.stage === 'Won') refs[k].won++; });
      const rl = Object.keys(refs).map(k => refs[k]).sort((a, b) => b.won - a.won || b.n - a.n);
      if (rl.length) h += '<h2>Who sent you clients</h2><div class="card">' + rl.map(x => '<div class="row between" style="padding:6px 0"><span>' + esc(x.name) + '</span><span class="small"><b>' + x.n + '</b> sent · <b style="color:#166534">' + x.won + '</b> won' + (x.won ? ' · <b style="color:#B45309">reward due</b>' : '') + '</span></div>').join('') + '<p class="small muted" style="margin:6px 0 0">Give each person their reward (' + esc(KL.cfg().reward || 'your reward') + ') for every won job.</p></div>';
    }
    return h + '<div style="height:90px"></div>';
  }
  ACT.ldFilter = d => { L.filter = d.f; render(true); };

  const find = id => (L.list || []).find(l => l.id === id);
  ACT.ldView = d => {
    const l = find(d.id); if (!l) return;
    const row = (a, b) => b ? '<div class="row between" style="padding:5px 0;border-bottom:1px solid var(--line)"><span class="muted small">' + a + '</span><span style="text-align:right">' + b + '</span></div>' : '';
    sheet('<h2 style="margin-bottom:4px">' + esc(l.name) + '</h2><div style="margin-bottom:10px">' + pill(l.stage) + '</div>' +
      row('Wants', esc(l.wants)) + row('Area', esc(l.area)) + row('Phone', l.phone ? '<a href="tel:' + esc(l.phone) + '">' + esc(l.phone) + '</a>' : '') + row('Came from', esc(l.source)) + row('Referred by', esc(l.ref || '')) +
      row('First contact', nice(l.date)) + row('Last follow-up', l.last ? nice(l.last) : 'Not yet') + row('Next follow-up', isOpen(l) ? (l.next ? nice(l.next) : 'Not set') : '') + row('Notes', esc(l.notes)) +
      '<label style="margin-top:12px">Move to</label><div style="display:flex;flex-wrap:wrap;gap:6px">' + L.stages.map(s => '<button class="btn sm' + (s === l.stage ? ' primary' : '') + '" data-act="ldStage" data-id="' + esc(l.id) + '" data-s="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' +
      (l.phone ? '<button class="btn primary block" style="margin-top:14px;background:#16A34A;border-color:#16A34A" data-act="ldWa" data-id="' + esc(l.id) + '">Follow up on WhatsApp</button>' : '<p class="small muted" style="margin-top:12px">Add a phone number to follow up on WhatsApp.</p>') +
      (KL.hasMod('docs') ? '<button class="btn block" style="margin-top:8px" data-act="ldEst" data-id="' + esc(l.id) + '">Start an estimate for ' + esc(l.name.split(' ')[0]) + '</button>' : '') +
      '<div class="row between" style="margin-top:12px"><button class="btn sm" data-act="ldEdit" data-id="' + esc(l.id) + '">Edit</button><button class="btn sm" style="color:#B91C1C" data-act="ldDel" data-id="' + esc(l.id) + '">Delete</button></div>');
  };
  ACT.ldStage = async d => {
    if (await send({ op: 'stage', id: d.id, stage: d.s }, d.s === 'Won' ? 'Won! Added to your customers.' : 'Moved to ' + d.s)) { closeSheet(); render(true); ACT.ldView({ id: d.id }); }
  };
  ACT.ldEdit = d => {
    const l = d.id ? find(d.id) : null;
    sheet('<h2>' + (l ? 'Edit lead' : 'New lead') + '</h2>' +
      '<label>Name</label><input id="ldn" style="' + inp + '" value="' + esc(l ? l.name : '') + '" placeholder="Example: Ama Mensah">' +
      '<label>Phone (WhatsApp)</label><input id="ldp" type="tel" style="' + inp + '" value="' + esc(l ? l.phone : '') + '" placeholder="024 000 0000">' +
      '<label>Where did they find you?</label><select id="lds" style="' + inp + '">' + L.sources.map(s => '<option' + ((l ? l.source : 'WhatsApp') === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select>' +
      '<label>Referred by (who sent them, optional)</label><input id="ldr" style="' + inp + '" value="' + esc(l ? l.ref : '') + '" placeholder="Example: Ama Mensah">' +
      '<label>What do they want?</label><input id="ldw" style="' + inp + '" value="' + esc(l ? l.wants : '') + '" placeholder="Example: POP ceiling, 3 rooms">' +
      '<label>Area</label><input id="lda" style="' + inp + '" value="' + esc(l ? l.area : '') + '" placeholder="Example: Kasoa, Millennium City">' +
      '<label>Next follow-up</label><input id="ldx" type="date" style="' + inp + '" value="' + esc(l ? l.next : addDays(2)) + '">' +
      '<label>Notes (optional)</label><input id="ldo" style="' + inp + '" value="' + esc(l ? l.notes : '') + '">' +
      '<br><button class="btn primary block" data-act="ldSave" data-id="' + esc(l ? l.id : '') + '">Save</button>');
  };
  ACT.ldSave = async d => {
    const v = id => (document.getElementById(id) || {}).value || '';
    if (!v('ldn').trim()) { toast('Type the name'); return; }
    const l = d.id ? find(d.id) : null;
    if (await send({ op: 'save', id: d.id, name: v('ldn').trim(), phone: v('ldp').trim(), source: v('lds'), wants: v('ldw').trim(), area: v('lda').trim(), next: v('ldx'), notes: v('ldo').trim(), ref: v('ldr').trim(), stage: l ? l.stage : 'New' }, 'Saved')) {
      closeSheet(); if (S.tab !== 'leads') S.tab = 'leads'; render(true);
    }
  };
  ACT.ldDel = async d => {
    const l = find(d.id); if (!l || !confirm('Delete the lead "' + l.name + '"?')) return;
    if (await send({ op: 'delete', id: d.id }, 'Deleted')) { closeSheet(); render(true); }
  };
  ACT.ldWa = d => {
    const l = find(d.id); if (!l) return;
    const first = l.name.split(' ')[0];
    const msg = 'Hello ' + first + ', this is ' + bizName() + '. How far with the ' + (l.wants || 'work') + ' you asked about? We are ready to help whenever you are. Thank you.';
    sheet('<h2>Follow up on WhatsApp</h2><label>Message (you can change it)</label><textarea id="ldm" rows="5" style="' + inp + '">' + esc(msg) + '</textarea>' +
      '<label>Next follow-up</label><input id="ldnx" type="date" style="' + inp + '" value="' + addDays(3) + '">' +
      '<br><button class="btn primary block" style="background:#16A34A;border-color:#16A34A" data-act="ldWaGo" data-id="' + esc(l.id) + '">Open WhatsApp</button>');
  };
  ACT.ldWaGo = d => {
    const l = find(d.id); if (!l) return;
    const m = document.getElementById('ldm').value, nx = document.getElementById('ldnx').value;
    window.open('https://wa.me/' + intl(l.phone) + '?text=' + encodeURIComponent(m), '_blank');
    send({ op: 'touch', id: l.id, next: nx }, 'Noted. Next follow-up ' + nice(nx)).then(() => { closeSheet(); render(true); });
  };
  ACT.ldEst = d => {
    const l = find(d.id); if (!l) return; closeSheet();
    S.tab = 'docs'; if (KL.docs && KL.docs.state) KL.docs.state.type = 'EST'; render();
    Promise.resolve(KL.docs && KL.docs.load ? KL.docs.load() : null).then(() => ACT.dNew({ k: 'EST', pre: { customer: l.name, phone: l.phone, location: l.area, title: l.wants } }));
  };
})();

/* EasySales - Grow: thank-you + rating, video request, payment reminder, estimate follow-up, and flyers customers post on their status. Owner only. */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, esc, money, r2, kk, today, toast, sheet, cfg, bizName } = KL;
  const owner = () => S.session && S.session.role === 'admin';
  const wa = p => { let n = String(p || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1); else if (n.length === 9) n = '233' + n; return n; };
  const fill = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m).replace(/\\n/g, '\n');
  const first = n => String(n || '').trim().split(/\s+/)[0] || 'Sir/Madam';
  const TITLE = { thanks: 'Thank you + rating', words: 'Ask for a few words', video: 'Ask for a video', remind: 'Payment reminder', follow: 'Estimate follow-up', flyer: 'Share our flyer' };
  const KEY = { thanks: 'mThanks', words: 'mWords', video: 'mVideo', remind: 'mRemind', follow: 'mFollow', flyer: 'mFlyer' };
  const inp = 'width:100%;font:inherit;padding:12px;border:1.5px solid var(--line);border-radius:12px;background:#fff';
  const vals = who => { const c = cfg(); return { client: first(who.name), name: who.name || '', business: bizName(), phone: c.phone || '', momo: c.momo || c.phone || '', momoName: c.momoName || bizName(), review: c.review || '(add your review link in Setup)', reward: c.reward || 'a discount', job: who.job || 'work', amount: money(who.amount || 0), for: who.for || '', date: who.date || '' }; };

  /* ---------- message to the client (you can change the words) ---------- */
  function msgSheet(type, who) {
    G.who = who; G.type = type;
    const c = cfg(); let text = fill(c[type === 'words' && who.kind === 'sale' ? 'mWordsSale' : KEY[type]], vals(who));
    const wm = parseFloat(c.warranty) || 0, fd = parseFloat(c.fixDays) || 0;
    if (type === 'thanks' && who.kind !== 'sale' && (wm || fd)) text += '\n\n' + (wm ? 'Our work carries a ' + wm + '-month warranty. ' : '') + (fd ? 'If you notice any problem, please tell us within ' + fd + ' days on ' + (c.phone || 'our number') + ' and we will come and fix it.' : 'Just call us on ' + (c.phone || 'our number') + ' if anything comes up.');
    sheet('<h2>' + TITLE[type] + '</h2><p class="small muted" style="margin-top:0">To ' + esc(who.name) + (who.phone ? ' · ' + esc(who.phone) : ' · no phone saved') + '. You can change the words before sending.</p>' +
      (type === 'thanks' && !c.review ? '<p class="small" style="background:#FEF3C7;color:#92400E;padding:8px 10px;border-radius:10px">Add your Google or Facebook review link in <b>Setup → Customer messages &amp; flyers</b> so clients can rate you with one tap.</p>' : '') +
      '<textarea id="grt" rows="8" style="' + inp + '">' + esc(text) + '</textarea>' +
      '<button class="btn primary block" style="margin-top:10px;background:#16A34A;border-color:#16A34A" data-act="grSend">Send on WhatsApp</button>' +
      (type === 'words' ? '<p class="small muted" style="margin-top:8px">When they reply, use <b>Make review picture</b> to turn their words into a picture for your status.</p>' : '') +
      '<button class="btn ghost block" style="margin-top:8px" data-act="grAll" data-w="' + esc(JSON.stringify(who)) + '">Other messages</button>');
  }
  const G = {};
  ACT.grSend = () => { const t = document.getElementById('grt').value; window.open('https://wa.me/' + wa(G.who.phone) + '?text=' + encodeURIComponent(t), '_blank'); };
  ACT.grFlyer = () => shareFlyer(G.who.kind || 'sale', G.who);
  ACT.grMsg = d => msgSheet(d.t, JSON.parse(d.w));
  const btn = (t, who, cls) => '<button class="btn ' + (cls || '') + ' block" style="margin-top:8px' + (cls === 'primary' ? ';background:#16A34A;border-color:#16A34A' : '') + '" data-act="grMsg" data-t="' + t + '" data-w="' + esc(JSON.stringify(who)) + '">' + TITLE[t] + '</button>';
  const flyBtn = who => '<button class="btn violet block" style="margin-top:8px" data-act="grFly" data-w="' + esc(JSON.stringify(who)) + '">Share flyer for their status</button>';
  ACT.grFly = d => { const w = JSON.parse(d.w); shareFlyer(w.kind || 'sale', w); };

  /* ---------- on a job: reminder while money is owed; thank you, video and flyer when it is completed ---------- */
  const allBtn = who => '<button class="btn block" style="margin-top:8px;border-color:#16A34A;color:#166534" data-act="grAll" data-w="' + esc(JSON.stringify(who)) + '">Client messages</button>';
  KL.growJobBtns = j => {
    if (!owner()) return '';
    const left = r2(Math.max(0, j.value - j.received)), who = { name: j.customer, phone: j.phone, job: j.title || 'work', amount: left, kind: 'job', area: j.site || '' };
    return (j.stage === 'Completed' ? btn('thanks', who, 'primary') + btn('words', who) + flyBtn(who) : '') + allBtn(who);
  };
  // every message for this client, any time
  ACT.grAll = d => {
    const who = JSON.parse(d.w), job = who.kind === 'job';
    sheet('<h2>Client messages</h2><p class="small muted" style="margin-top:0">' + esc(who.name) + (who.phone ? ' · ' + esc(who.phone) : ' · no phone saved') + '</p>' +
      btn('thanks', who, 'primary') + btn('words', who) + (job ? btn('video', who) : '') + flyBtn(who) +
      '<button class="btn violet block" style="margin-top:8px" data-act="grRev" data-w="' + esc(JSON.stringify(who)) + '">Make review picture (from their words)</button>' +
      (who.amount > 0.004 ? btn('remind', who) : ''));
  };
  /* ---------- after a sale: thank you + rating, and the flyer ---------- */
  const _rs = KL.fn('receiptSheet');
  KL.setFn('receiptSheet', function (b, fresh) {
    _rs(b, fresh);
    if (!owner() || !b || !b.customer || kk(b.customer) === kk(KL.WALKIN)) return;
    const cu = KL.derived().customers.find(c => kk(c.name) === kk(b.customer));
    if (!cu || !cu.phone) return;
    const who = { name: cu.name, phone: cu.phone, kind: 'sale', items: (b.items || []).map(i => i.p) };
    const box = document.querySelector('.sheet .sheet-body') || document.querySelector('.sheet');
    if (box) box.insertAdjacentHTML('beforeend', '<div style="margin-top:6px">' + btn('thanks', who) + allBtn(who) + '</div>');
  });
  const _cust = ACT.cust;
  ACT.cust = d => {
    _cust(d);
    if (!owner()) return;
    const cu = KL.derived().customers.find(c => kk(c.name) === kk(d.n)); if (!cu || kk(cu.name) === kk(KL.WALKIN)) return;
    const box = document.querySelector('.sheet');
    if (box) box.insertAdjacentHTML('beforeend', allBtn({ name: cu.name, phone: cu.phone, kind: 'sale', amount: Math.max(0, cu.balance || 0), area: cu.location || '' }));
  };
  /* ---------- an estimate the client has not accepted yet: follow up ---------- */
  const _jb = KL.jobBtn;
  KL.jobBtn = doc => (_jb ? _jb(doc) : '') + (owner() && (doc.type === 'EST' || doc.type === 'PF') && doc.status !== 'Accepted' && doc.phone
    ? btn('follow', { name: doc.customer, phone: doc.phone, amount: doc.total, for: doc.no + (doc.title ? ' (' + doc.title + ')' : ''), date: doc.date }) : '');

  /* ---------- the flyer: a square picture for WhatsApp status ---------- */
  const WORK = ['Flyer work 1', 'Flyer work 2', 'Flyer work 3', 'Flyer work 4'];
  const ph = n => (S.photos && S.photos[n]) || '';
  function loadImg(src) { return new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  function cover(g, img, x, y, w, h, rad) {
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, rad); g.clip();
    if (img) { const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s; g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }
    else { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x, y, w, h); }
    g.restore();
  }
  function wrap(g, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(' '); let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const t = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = words[i]; if (++n >= maxLines - 1) { line = words.slice(i).join(' '); break; } } else line = t;
    }
    g.fillText(line, x, y); return y + lh;
  }
  async function flyerImage(kind, who) {
    const c = cfg(), W = 1080, c1 = c.c1 || '#7A1F3D', cv = document.createElement('canvas'); cv.width = W; cv.height = W;
    const g = cv.getContext('2d'), F = (w, s) => w + ' ' + s + 'px Inter, system-ui, sans-serif';
    g.fillStyle = c1; g.fillRect(0, 0, W, W);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(W - 90, 120, 260, 0, 7); g.fill();
    // header
    const logo = await loadImg(KL.logoSrc()); if (logo) cover(g, logo, 60, 56, 120, 120, 28);
    g.fillStyle = '#fff'; g.font = F('bold', 50); g.textBaseline = 'alphabetic';
    wrap(g, bizName(), 205, 108, W - 270, 56, 2);
    g.font = F('500', 30); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(c.flyerLine || c.tagline || c.location || '', 205, 166);
    // headline
    const head = kind === 'week' ? 'Our latest work' : kind === 'job' ? first(who.name) + ' recommends us' : first(who.name) + ' buys here';
    g.fillStyle = '#fff'; g.font = F('800', 76); wrap(g, head, 60, 300, W - 120, 84, 2);
    g.fillStyle = c.c2 || '#2E9E5B'; g.fillRect(60, 322, 140, 10);
    // pictures
    const top = 380, bh = 470;
    if (kind === 'sale') {
      const all = (S.cache && S.cache.products) || [], pick = [];
      (who.items || []).forEach(n => { const p = all.find(x => kk(x.name) === kk(n)); if (p && pick.indexOf(p) < 0) pick.push(p); });
      all.filter(p => ph(p.name)).forEach(p => { if (pick.length < 4 && pick.indexOf(p) < 0) pick.push(p); });
      all.forEach(p => { if (pick.length < 4 && pick.indexOf(p) < 0) pick.push(p); });
      const cw = (W - 120 - 24) / 2, ch = (bh - 24) / 2;
      for (let i = 0; i < 4; i++) {
        const p = pick[i]; if (!p) continue; const x = 60 + (i % 2) * (cw + 24), y = top + Math.floor(i / 2) * (ch + 24);
        g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x, y, cw, ch, 26); g.fill();
        cover(g, await loadImg(ph(p.name)), x + 14, y + 14, 150, ch - 28, 18);
        g.fillStyle = '#1F2937'; g.font = F('bold', 30); wrap(g, p.name, x + 182, y + 62, cw - 200, 36, 2);
        g.fillStyle = c1; g.font = F('800', 36); g.fillText(money(p.price), x + 182, y + ch - 36);
      }
    } else {
      let pics = WORK.map(ph).filter(Boolean);
      if (!pics.length) pics = ((S.cache && S.cache.products) || []).map(p => ph(p.name)).filter(Boolean).slice(0, 2);
      const imgs = []; for (const s of pics.slice(0, 2)) imgs.push(await loadImg(s));
      if (imgs.length <= 1) cover(g, imgs[0] || null, 60, top, W - 120, bh, 30);
      else { const w2 = (W - 120 - 20) / 2; cover(g, imgs[0], 60, top, w2, bh, 30); cover(g, imgs[1], 60 + w2 + 20, top, w2, bh, 30); }
      if (!imgs.length) { g.fillStyle = c1; g.font = F('bold', 34); g.textAlign = 'center'; g.fillText('Add work photos in Setup → Customer messages & flyers', W / 2, top + bh / 2); g.textAlign = 'left'; }
    }
    // footer: phone + reward
    const fy = 905; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(60, fy, 520, 110, 55); g.fill();
    g.fillStyle = c1; g.font = F('800', 50); g.fillText('☎ ' + (c.phone || ''), 100, fy + 72);
    g.fillStyle = '#fff'; g.font = F('bold', 32); g.textAlign = 'right';
    if (kind !== 'week' && c.reward) {
      g.fillText('Mention ' + first(who.name) + ':', W - 60, fy + 34); g.font = F('800', 40);
      const rw = g.measureText(c.reward).width + 48; g.fillStyle = c.c2 || '#2E9E5B'; g.beginPath(); g.roundRect(W - 60 - rw, fy + 50, rw, 60, 30); g.fill();
      g.fillStyle = '#fff'; g.fillText(c.reward, W - 84, fy + 94);
    }
    else { g.fillText('Call or WhatsApp', W - 60, fy + 44); g.font = F('800', 40); g.fillText('to book', W - 60, fy + 92); }
    g.textAlign = 'left';
    return new Promise(res => cv.toBlob(res, 'image/png'));
  }
  async function shareFlyer(kind, who) {
    toast('Making the flyer…');
    try {
      const blob = await flyerImage(kind, who), file = new File([blob], 'flyer-' + today() + '.png', { type: 'image/png' });
      const text = kind === 'week' ? '' : fill(cfg().mFlyer, vals(who));
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); } catch (e) { if (e && e.name === 'AbortError') return; await navigator.share({ files: [file] }); }
        return;
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      toast('Flyer saved. Attach it in WhatsApp.');
      if (text && who && who.phone) setTimeout(() => window.open('https://wa.me/' + wa(who.phone) + '?text=' + encodeURIComponent(text), '_blank'), 900);
    } catch (e) { toast('Could not make the flyer on this phone'); }
  }

  /* ---------- review picture: the client's own words, for YOUR status / Facebook ---------- */
  const happyCount = () => { const n = ((S.cache && S.cache.customers) || []).length; return n >= 20 ? Math.floor(n / 10) * 10 + '+' : n >= 5 ? String(n) : ''; };
  async function reviewImage(who, words) {
    const c = cfg(), W = 1080, c1 = c.c1 || '#7A1F3D', cv = document.createElement('canvas'); cv.width = W; cv.height = W;
    const g = cv.getContext('2d'), F = (w, s) => w + ' ' + s + 'px Inter, system-ui, sans-serif';
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, W);
    g.fillStyle = c1; g.fillRect(0, 0, W, 150);
    const logo = await loadImg(KL.logoSrc()); if (logo) cover(g, logo, 50, 25, 100, 100, 22);
    g.fillStyle = '#fff'; g.font = F('bold', 44); g.fillText(bizName(), 175, 90);
    g.font = F('500', 26); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('What our clients say', 175, 128);
    // photo on the right
    let pic = who.photo || WORK.map(ph).filter(Boolean)[0] || '';
    if (who.kind === 'sale' && who.items) { const p = (who.items || []).map(ph).filter(Boolean)[0]; if (p) pic = p; }
    const img = await loadImg(pic);
    if (img) cover(g, img, 640, 210, 390, 520, 30);
    const tw = img ? 540 : W - 120;
    g.fillStyle = '#F59E0B'; g.font = F('bold', 64); g.fillText('★★★★★', 60, 270); g.fillStyle = c.c2 || '#2E9E5B'; g.fillRect(0, 150, W, 8);
    g.fillStyle = c1; g.font = F('800', 140); g.fillText('“', 50, 400);
    g.fillStyle = '#1F2937'; g.font = F('600', words.length > 120 ? 40 : words.length > 70 ? 46 : 54);
    const lh = words.length > 120 ? 54 : words.length > 70 ? 60 : 68;
    const end = wrap(g, words, 60, 420, tw, lh, 8);
    g.fillStyle = c1; g.font = F('bold', 40); g.fillText('— ' + first(who.name) + (who.area ? ', ' + who.area : ''), 60, Math.max(end + 30, 760));
    if (who.job) { g.fillStyle = '#6B7280'; g.font = F('500', 30); g.fillText(who.job, 60, Math.max(end + 76, 806)); }
    // footer
    g.fillStyle = c1; g.fillRect(0, 900, W, 180);
    g.fillStyle = '#fff'; g.font = F('800', 52); g.fillText('☎ ' + (c.phone || ''), 60, 1005);
    const hc = happyCount(); g.textAlign = 'right'; g.font = F('bold', 34);
    if (hc) { g.fillText(hc + ' happy clients', W - 60, 975); g.font = F('500', 28); g.fillText(c.location || 'Call or WhatsApp us', W - 60, 1020); }
    else { g.fillText('Call or WhatsApp us', W - 60, 995); }
    g.textAlign = 'left';
    return new Promise(res => cv.toBlob(res, 'image/png'));
  }
  KL.reviewImage = reviewImage; KL.happyCount = happyCount;
  ACT.grRev = d => {
    const who = JSON.parse(d.w); G.rv = who;
    sheet('<h2>Make review picture</h2><p class="small muted" style="margin-top:0">Paste what ' + esc(first(who.name)) + ' wrote to you. Only the first name shows.</p>' +
      '<label>Their words</label><textarea id="rvw" rows="4" style="' + inp + '" placeholder="Neat work, finished on time. I recommend them."></textarea>' +
      '<div class="row" style="gap:8px"><div class="grow"><label>First name</label><input id="rvn" style="' + inp + '" value="' + esc(first(who.name)) + '"></div><div class="grow"><label>Area</label><input id="rva" style="' + inp + '" value="' + esc(who.area || '') + '" placeholder="Kasoa"></div></div>' +
      '<label>Work done (optional)</label><input id="rvj" style="' + inp + '" value="' + esc(who.kind === 'job' ? (who.job || '') : '') + '" placeholder="Plasterboard ceiling, 3 rooms">' +
      '<br><button class="btn primary block" data-act="grRevGo">Make picture</button>');
  };
  ACT.grRevGo = async () => {
    const words = document.getElementById('rvw').value.trim(); if (!words) { toast('Paste their words first'); return; }
    const who = Object.assign({}, G.rv, { name: document.getElementById('rvn').value.trim() || G.rv.name, area: document.getElementById('rva').value.trim(), job: document.getElementById('rvj').value.trim() });
    toast('Making the picture…');
    const blob = await reviewImage(who, words), url = URL.createObjectURL(blob); G.rvBlob = blob;
    sheet('<h2>Review picture</h2><img src="' + url + '" style="width:100%;border-radius:14px"><p class="small muted">Post it on your WhatsApp status, Facebook or TikTok.</p><button class="btn primary block" data-act="grRevShare">Share</button>');
  };
  ACT.grRevShare = async () => {
    const file = new File([G.rvBlob], 'review-' + today() + '.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(G.rvBlob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); toast('Picture saved. Post it from your gallery.');
    } catch (e) { if (e && e.name !== 'AbortError') toast('Could not share on this phone'); }
  };
  KL.shareFlyer = shareFlyer; KL.flyerImage = flyerImage;

  /* ---------- Setup: review link, reward, words, work photos, previews ---------- */
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    _render(k);
    if (S.tab !== 'setup' || !owner() || document.getElementById('xgrow')) return;
    const m = document.querySelector('main.wrap'); if (!m) return;
    m.insertAdjacentHTML('afterbegin', '<button id="xgrow" class="btn block" style="margin-top:6px;border-color:#16A34A;color:#166534" data-act="grSet">Customer messages &amp; flyers</button>');
  });
  ACT.grSet = () => {
    const c = cfg(), ta = (id, v, r) => '<textarea id="' + id + '" rows="' + (r || 4) + '" style="' + inp + '">' + esc(v || '') + '</textarea>';
    sheet('<h2>Customer messages &amp; flyers</h2>' +
      '<label>Review link (Google or Facebook)</label><input id="grv" style="' + inp + '" value="' + esc(c.review || '') + '" placeholder="https://g.page/r/…/review">' +
      '<p class="small muted" style="margin:4px 0 0">Google Business Profile → "Ask for reviews" gives you this link.</p>' +
      '<label>Reward for people who send you clients</label><input id="grw" style="' + inp + '" value="' + esc(c.reward || '') + '" placeholder="5% off">' +
      '<label>Line under your name on flyers</label><input id="grl" style="' + inp + '" value="' + esc(c.flyerLine || '') + '" placeholder="Quality ceilings in Kasoa">' +
      '<label>Work photos for flyers (your best finished jobs)</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      WORK.map((n, i) => '<label style="margin:0;display:block;border:1.5px dashed var(--line);border-radius:12px;height:96px;overflow:hidden;text-align:center;line-height:96px;cursor:pointer;color:var(--muted,#64748b);font-size:13px">' + (ph(n) ? '<img src="' + ph(n) + '" style="width:100%;height:100%;object-fit:cover">' : '+ Photo ' + (i + 1)) + '<input type="file" accept="image/*" data-in="grp" data-n="' + esc(n) + '" style="display:none"></label>').join('') + '</div>' +
      '<label>Thank you + rating</label>' + ta('gm1', c.mThanks) + '<label>Ask for a few words (job)</label>' + ta('gm6', c.mWords) + '<label>Ask for a few words (sale)</label>' + ta('gm7', c.mWordsSale, 3) + '<label>Ask for a video</label>' + ta('gm2', c.mVideo) + '<label>With the flyer</label>' + ta('gm3', c.mFlyer, 3) +
      '<label>Payment reminder</label>' + ta('gm4', c.mRemind) + '<label>Estimate follow-up</label>' + ta('gm5', c.mFollow) +
      '<p class="small muted">Words you can use: {client} {business} {phone} {review} {reward} {job} {amount} {momo} {momoName} {for} {date}</p>' +
      '<button class="btn primary block" data-act="grSave">Save</button>' +
      '<div class="row" style="gap:8px;margin-top:10px"><button class="btn grow" data-act="grPrev" data-k="job">Preview job flyer</button><button class="btn grow" data-act="grPrev" data-k="sale">Preview sale flyer</button></div>' +
      '<button class="btn violet block" style="margin-top:8px" data-act="grWeek">Work-of-the-week flyer for my status</button>');
  };
  document.addEventListener('change', async ev => {
    const el = ev.target; if (!el || el.dataset.in !== 'grp' || !el.files || !el.files[0]) return;
    if (!navigator.onLine) { toast('Needs internet'); return; }
    toast('Saving photo…');
    try {
      const data = await KL.shrinkImage(el.files[0]); const r = await KL.api('admin', { op: 'savePhoto', name: el.dataset.n, data });
      if (!r.ok) { toast(KL.errText(r.error)); return; }
      S.photos = S.photos || {}; S.photos[el.dataset.n] = data; if (KL.loadPhotos) KL.loadPhotos(true);
      toast('Photo saved'); ACT.grSet();
    } catch (e) { toast('Could not save the photo'); }
  });
  ACT.grSave = async (d, b) => {
    const v = id => document.getElementById(id).value;
    b.disabled = true;
    try {
      const r = await KL.api('admin', { op: 'saveSettings', values: { review: v('grv').trim(), reward: v('grw').trim(), flyerLine: v('grl').trim(), mThanks: v('gm1'), mVideo: v('gm2'), mFlyer: v('gm3'), mRemind: v('gm4'), mFollow: v('gm5'), mWords: v('gm6'), mWordsSale: v('gm7') } });
      if (!r.ok) { toast(KL.errText(r.error)); b.disabled = false; return; }
      if (S.cache && r.cfg) S.cache.cfg = r.cfg; KL.kvSet('cache', S.cache).catch(() => {}); toast('Saved'); b.disabled = false;
    } catch (e) { toast('Needs internet'); b.disabled = false; }
  };
  ACT.grPrev = async d => {
    const who = { name: 'Ama Mensah', kind: d.k, items: [] };
    const blob = await flyerImage(d.k, who), url = URL.createObjectURL(blob);
    sheet('<h2>Flyer preview</h2><img src="' + url + '" style="width:100%;border-radius:14px"><p class="small muted">A real flyer uses the customer\'s name' + (d.k === 'sale' ? ' and what they bought' : '') + '.</p><button class="btn block" data-act="grSet">Back</button>');
  };
  ACT.grWeek = () => shareFlyer('week', { name: '' });
})();

/* EasySales - Apprentices: agreement form, progress, 6-monthly reviews, top money. Owner only, with Jobs. */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, api, esc, money, today, toast, sheet, closeSheet, errText, bizName, cfg } = KL;
  const render = k => KL.fn('render')(k);
  const A = { list: null, asked: 0 };
  const on = () => S.session && S.session.role === 'admin' && KL.hasMod && KL.hasMod('jobs');
  const inp = 'width:100%;font:inherit;padding:11px;border:1.5px solid var(--line);border-radius:12px;background:#fff';
  const nice = d => { if (!d) return '—'; const x = new Date(d + 'T00:00'); return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const mo = n => { n = Math.round(n); const y = Math.floor(n / 12), m = n - y * 12; return (y ? y + ' yr' + (y > 1 ? 's' : '') + ' ' : '') + (m || !y ? m + ' month' + (m === 1 ? '' : 's') : ''); };
  const stars = r => r ? '<span style="color:#F59E0B;letter-spacing:1px">' + '★★★★★'.slice(0, Math.round(r)) + '</span><span style="color:#CBD5E1;letter-spacing:1px">' + '★★★★★'.slice(0, 5 - Math.round(r)) + '</span>' : '<span class="muted">not yet</span>';
  const PH = { Training: ['#E0F2FE', '#075985'], Service: ['#EDE9FE', '#5B21B6'], 'Training done': ['#FEF3C7', '#92400E'], Finished: ['#DCFCE7', '#166534'], Left: ['#F1F5F9', '#64748B'] };
  const pill = s => '<span style="font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:99px;background:' + (PH[s] || PH.Training)[0] + ';color:' + (PH[s] || PH.Training)[1] + '">' + esc(s) + '</span>';
  const cnum = (k, d) => { const v = parseFloat(cfg()[k]); return isNaN(v) ? d : v; };

  ICON.appr = '<svg viewBox="0 0 24 24"><path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/></svg>';
  const _tabsFor = KL.fn('tabsFor');
  KL.setFn('tabsFor', function () { const t = _tabsFor(); if (on()) t.push(['appr', 'Apprentices']); return t; });
  const _tab = ACT.tab; ACT.tab = d => { _tab(d); if (d.t === 'appr') load(); };
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    _render(k);
    if (!S.session || !on()) return;
    const m = document.querySelector('main.wrap');
    if (m && S.tab === 'appr') m.innerHTML = listHTML();
    // a chip on the Jobs screen
    if (S.tab === 'jobs' && !document.getElementById('xapchip')) {
      const ch = m && m.querySelector('.chips'); if (ch) ch.insertAdjacentHTML('beforeend', '<button id="xapchip" class="chip" data-act="tab" data-t="appr">Apprentices</button>');
    }
    if (S.tab === 'dash' && !A.list && !A.asked && navigator.onLine) { A.asked = 1; load(); }
  });
  const _att = KL.moreAttention;
  KL.moreAttention = () => {
    const base = _att ? _att() : []; if (!on() || !A.list) return base;
    A.list.filter(a => a.reviewDue).forEach(a => base.push({ k: 'appr', i: '★', bg: '#EDE9FE', fg: '#5B21B6', a: esc(a.name) + ' · ' + esc(a.code), b: a.nextMonth + '-month review is due. Tap to review and set top money.', amt: '', o: 1 }));
    return base;
  };
  async function load() {
    try { const r = await api('appr', { op: 'list' }); if (r.ok) { A.list = r.apprentices; KL.kvSet('appr', r.apprentices).catch(() => {}); } else toast(errText(r.error)); }
    catch (e) { if (!A.list) { try { A.list = await KL.kvGet('appr'); } catch (x) { /* none */ } } }
    if (S.tab === 'appr' || S.tab === 'dash') render(true);
    // a pop-up the first time today that reviews are due
    const due = (A.list || []).filter(a => a.reviewDue);
    if (due.length && S.tab === 'dash' && localStorage.getItem(KL.LS('apnag')) !== today()) {
      localStorage.setItem(KL.LS('apnag'), today());
      sheet('<h2>Apprentice review' + (due.length > 1 ? 's' : '') + ' due</h2><p class="small muted" style="margin-top:0">Every 6 months, check their progress and decide on their top money.</p>' +
        due.map(a => '<button class="item" data-act="apRev" data-c="' + esc(a.code) + '" style="width:100%;text-align:left"><span class="grow"><span class="nm">' + esc(a.name) + '</span> <span class="small muted">' + esc(a.code) + '</span><br><span class="small">' + a.nextMonth + '-month review · top money now ' + money(a.rate) + '/day</span></span></button>').join('') +
        '<button class="btn block" style="margin-top:10px" data-act="close">Later</button>');
    }
  }
  async function send(body, msg) {
    if (!navigator.onLine) { toast('Needs internet'); return false; }
    try { const r = await api('appr', body); if (!r.ok) { toast(errText(r.error)); return false; } A.list = r.apprentices; KL.kvSet('appr', r.apprentices).catch(() => {}); if (msg) toast(msg); return true; }
    catch (e) { toast('Needs internet'); return false; }
  }
  const find = c => (A.list || []).find(a => a.code === c);

  function listHTML() {
    if (!A.list) return '<div class="empty">' + (navigator.onLine ? 'Loading…' : 'Apprentices need internet the first time.') + '</div>';
    const act = A.list.filter(a => a.status === 'Training' || a.status === 'Service'), due = A.list.filter(a => a.reviewDue);
    const st = (l, v, c) => '<div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 12px"><div class="small muted">' + l + '</div><b style="font-size:20px' + (c ? ';color:' + c : '') + '">' + v + '</b></div>';
    let h = '<div class="row between" style="margin-top:6px"><h2 style="margin:0">Apprentices</h2><button class="btn sm primary" data-act="apEdit" data-c="">+ Add apprentice</button></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0">' + st('Learning', act.filter(a => a.phase === 'Training').length) + st('Serving', act.filter(a => a.phase === 'Service' || a.phase === 'Training done').length) + st('Reviews due', due.length, due.length ? '#B91C1C' : '') + '</div>' +
      '<div class="row" style="gap:8px"><button class="btn sm grow" data-act="apBlank">Blank form to print</button><button class="btn sm grow" data-act="apSet">Rules &amp; form settings</button></div>';
    const show = A.list.slice().sort((a, b) => (a.status === 'Left' || a.status === 'Finished') - (b.status === 'Left' || b.status === 'Finished') || (b.reviewDue - a.reviewDue) || (a.start < b.start ? -1 : 1));
    h += show.length ? show.map(a => {
      const last = a.reviews.length ? a.reviews[a.reviews.length - 1] : null;
      return '<button class="card" data-act="apView" data-c="' + esc(a.code) + '" style="display:block;width:100%;text-align:left;margin-top:10px;font:inherit;cursor:pointer">' +
        '<div class="row between"><span><b style="font-size:16px">' + esc(a.name) + '</b> <span class="small muted">' + esc(a.code) + '</span></span>' + pill(a.phase) + '</div>' +
        '<div style="height:8px;background:#EEF2F7;border-radius:99px;margin:10px 0 6px;overflow:hidden"><div style="height:100%;width:' + a.pct + '%;background:' + (a.phase === 'Training' ? '#0077B6' : '#7C3AED') + '"></div></div>' +
        '<div class="row between small"><span>' + mo(a.done) + ' done · ' + mo(a.left) + ' left</span><span>Finishes ' + nice(a.end) + '</span></div>' +
        '<div class="row between small" style="margin-top:4px"><span>Top money <b>' + money(a.rate) + '</b>/day</span><span>' + stars(last && last.rating) + '</span></div>' +
        (a.reviewDue ? '<div class="small" style="margin-top:6px;color:#B91C1C;font-weight:700">' + a.nextMonth + '-month review is due</div>' : a.nextReview ? '<div class="small muted" style="margin-top:6px">Next review ' + nice(a.nextReview) + '</div>' : '') + '</button>';
    }).join('') : '<div class="card empty" style="margin-top:10px">No apprentices yet. Tap <b>+ Add apprentice</b>, or print a blank form for a new person to fill.</div>';
    return h + '<div style="height:90px"></div>';
  }

  ACT.apView = d => {
    const a = find(d.c); if (!a) return;
    const row = (k, v) => v ? '<div class="row between" style="padding:5px 0;border-bottom:1px solid var(--line)"><span class="muted small">' + k + '</span><span style="text-align:right">' + v + '</span></div>' : '';
    sheet('<h2 style="margin-bottom:2px">' + esc(a.name) + '</h2><div class="small muted">' + esc(a.code) + ' · ' + pill(a.phase) + '</div>' +
      '<div style="height:10px;background:#EEF2F7;border-radius:99px;margin:12px 0 6px;overflow:hidden"><div style="height:100%;width:' + a.pct + '%;background:#0077B6"></div></div>' +
      '<div class="row between small"><span>' + mo(a.done) + ' done</span><span>' + mo(a.left) + ' left</span></div>' +
      '<div class="card" style="margin-top:10px;padding:6px 14px">' + row('Started', nice(a.start)) + row('Training ends', nice(a.trainEnd) + ' (' + mo(a.months) + ')') + (a.service ? row('Service ends', nice(a.end) + ' (' + mo(a.service) + ')') : '') +
        row('Top money now', '<b>' + money(a.rate) + '</b> per day') + row('Next review', a.nextReview ? nice(a.nextReview) + (a.reviewDue ? ' <b style="color:#B91C1C">due</b>' : '') : '—') +
        (a.fee ? row('Training fee', money(a.feePaid) + ' paid of ' + money(a.fee)) : '') + row('Phone', a.phone ? '<a href="tel:' + esc(a.phone) + '">' + esc(a.phone) + '</a>' : '') + row('Guardian', esc(a.guardian) + (a.gphone ? ' · <a href="tel:' + esc(a.gphone) + '">' + esc(a.gphone) + '</a>' : '')) + '</div>' +
      '<button class="btn primary block" style="margin-top:10px" data-act="apRev" data-c="' + esc(a.code) + '">' + (a.reviewDue ? a.nextMonth + '-month review (due)' : 'Add a progress review') + '</button>' +
      '<div class="row" style="gap:8px;margin-top:8px"><button class="btn grow" data-act="apRate" data-c="' + esc(a.code) + '">Change top money</button><button class="btn grow" data-act="apForm" data-c="' + esc(a.code) + '">Agreement form</button></div>' +
      '<h3 style="margin:14px 0 4px">Progress reviews</h3>' + (a.reviews.length ? a.reviews.slice().reverse().map(v => '<div class="card" style="padding:10px 12px;margin:6px 0"><div class="row between"><b>Month ' + v.month + '</b><span class="small muted">' + nice(v.date) + '</span></div><div>' + stars(v.rating) + (v.top ? ' <span class="small">· top money ' + money(v.top) + '/day</span>' : '') + '</div>' + (v.skills ? '<div class="small" style="margin-top:4px"><b>Can do:</b> ' + esc(v.skills) + '</div>' : '') + (v.note ? '<div class="small muted">' + esc(v.note) + '</div>' : '') + '</div>').join('') : '<p class="small muted">No reviews yet.</p>') +
      '<h3 style="margin:14px 0 4px">Top money history</h3>' + (a.rates.length ? '<div class="card" style="padding:4px 14px">' + a.rates.slice().reverse().map(x => '<div class="row between" style="padding:5px 0;border-bottom:1px solid var(--line)"><span><b>' + money(x.rate) + '</b>/day<br><span class="small muted">' + esc(x.reason || '') + '</span></span><span class="small">from ' + nice(x.from) + '</span></div>').join('') + '</div>' : '<p class="small muted">Not set yet.</p>') +
      '<div class="row" style="gap:8px;margin-top:14px"><button class="btn sm grow" data-act="apEdit" data-c="' + esc(a.code) + '">Edit details</button><select data-in="apst" data-c="' + esc(a.code) + '" class="grow" style="' + inp + ';padding:8px">' + ['Training', 'Service', 'Finished', 'Left'].map(s => '<option' + (a.status === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>');
  };
  document.addEventListener('change', async ev => {
    const el = ev.target; if (!el || el.dataset.in !== 'apst') return;
    if (!confirm('Change status to "' + el.value + '"?')) { ACT.apView({ c: el.dataset.c }); return; }
    if (await send({ op: 'status', code: el.dataset.c, status: el.value }, 'Status changed')) { render(true); ACT.apView({ c: el.dataset.c }); }
  });

  ACT.apEdit = d => {
    const a = d.c ? find(d.c) : null, v = k => esc(a ? (a[k] === undefined ? '' : a[k]) : '');
    const f = (id, lab, val, ph, ty) => '<label>' + lab + '</label><input id="' + id + '" style="' + inp + '"' + (ty ? ' type="' + ty + '"' : '') + ' value="' + val + '" placeholder="' + (ph || '') + '">';
    sheet('<h2>' + (a ? 'Edit ' + esc(a.code) : 'New apprentice') + '</h2>' +
      f('apn', 'Full name', v('name'), 'Example: Kofi Mensah') + f('app', 'Phone', v('phone'), '024 000 0000', 'tel') +
      '<div class="row" style="gap:8px"><div class="grow">' + f('apd', 'Date of birth', v('dob'), '', 'date') + '</div><div class="grow">' + f('ape', 'Education', v('edu'), 'JHS / SHS') + '</div></div>' +
      f('apt', 'Home town', v('town'), 'Example: Winneba') + f('apa', 'Where he/she lives now', v('address'), 'Example: Kasoa, Millennium City') +
      '<h3 style="margin:14px 0 0">Guardian / witness</h3>' + f('apg', 'Name', v('guardian')) + '<div class="row" style="gap:8px"><div class="grow">' + f('apgp', 'Phone', v('gphone'), '', 'tel') + '</div><div class="grow">' + f('apr', 'Relationship', v('rel'), 'Father / Uncle') + '</div></div>' +
      f('apk', 'Next of kin (name and phone)', v('kin')) +
      '<h3 style="margin:14px 0 0">Training</h3><div class="row" style="gap:8px"><div class="grow">' + f('aps', 'Start date', a ? v('start') : today(), '', 'date') + '</div><div class="grow">' + f('apm', 'Training months', a ? v('months') : cnum('apMonths', 30), '', 'number') + '</div></div>' +
      '<div class="row" style="gap:8px"><div class="grow">' + f('apv', 'Service months after', a ? v('service') : cnum('apService', 6), '', 'number') + '</div><div class="grow">' + (a ? '' : f('apo', 'Starting top money /day', cnum('apTop', 20), '', 'number')) + '</div></div>' +
      '<div class="row" style="gap:8px"><div class="grow">' + f('apf', 'Training fee (GH₵)', a ? v('fee') : (cnum('apFee', 0) || ''), '0', 'number') + '</div><div class="grow">' + f('apfp', 'Fee paid so far', v('feePaid'), '0', 'number') + '</div></div>' +
      f('apx', 'Note (optional)', v('note')) +
      '<br><button class="btn primary block" data-act="apSave" data-c="' + esc(a ? a.code : '') + '">Save</button>');
  };
  ACT.apSave = async (d, b) => {
    const g = id => (document.getElementById(id) || {}).value || '';
    if (!g('apn').trim()) { toast('Type the name'); return; }
    if (!g('aps')) { toast('Choose the start date'); return; }
    const a = d.c ? find(d.c) : null;
    b.disabled = true;
    const ok = await send({ op: 'save', code: d.c, name: g('apn').trim(), phone: g('app').trim(), dob: g('apd'), edu: g('ape').trim(), town: g('apt').trim(), address: g('apa').trim(), guardian: g('apg').trim(), gphone: g('apgp').trim(), rel: g('apr').trim(), kin: g('apk').trim(),
      start: g('aps'), months: g('apm'), service: g('apv'), top: g('apo'), fee: g('apf'), feePaid: g('apfp'), note: g('apx').trim(), status: a ? a.status : 'Training' }, 'Saved');
    b.disabled = false;
    if (ok) { closeSheet(); if (S.tab !== 'appr') S.tab = 'appr'; render(true); const n = a || (A.list || []).slice().sort((x, y) => x.code < y.code ? 1 : -1)[0]; if (n) ACT.apView({ c: n.code }); }
  };
  ACT.apRev = d => {
    const a = find(d.c); if (!a) return;
    const m = a.nextMonth || Math.max(1, Math.round(a.done));
    sheet('<h2>Progress review · ' + esc(a.name) + '</h2><p class="small muted" style="margin-top:0">' + esc(a.code) + ' · ' + mo(a.done) + ' done · top money now ' + money(a.rate) + '/day</p>' +
      '<label>Review for month</label><input id="rvm" type="number" style="' + inp + '" value="' + m + '">' +
      '<label>How is he/she doing? (1 = poor, 5 = excellent)</label><div class="row" style="gap:6px">' + [1, 2, 3, 4, 5].map(n => '<button class="btn grow" data-act="apStar" data-n="' + n + '" id="rs' + n + '">' + n + ' ★</button>').join('') + '</div>' +
      '<label>What can he/she do now?</label><textarea id="rvs" rows="3" style="' + inp + '" placeholder="Example: fixes main channels and boards alone, measures rooms, skims neatly"></textarea>' +
      '<label>Attitude, attendance, notes</label><textarea id="rvn" rows="3" style="' + inp + '" placeholder="Example: always on time, respectful; needs to improve finishing"></textarea>' +
      '<label>New top money per day (leave empty to keep ' + money(a.rate) + ')</label><input id="rvt" type="number" inputmode="decimal" style="' + inp + '" placeholder="' + (a.rate || '') + '">' +
      '<br><button class="btn primary block" data-act="apRevSave" data-c="' + esc(a.code) + '">Save review</button>');
    A.star = 0;
  };
  ACT.apStar = d => { A.star = +d.n; [1, 2, 3, 4, 5].forEach(n => { const b = document.getElementById('rs' + n); if (b) b.className = 'btn grow' + (n <= A.star ? ' primary' : ''); }); };
  ACT.apRevSave = async (d, b) => {
    if (!A.star) { toast('Choose a rating from 1 to 5'); return; }
    const a = find(d.c), top = +document.getElementById('rvt').value || 0;
    if (top && a && top < a.rate && !confirm('This lowers top money from ' + money(a.rate) + ' to ' + money(top) + '. Continue?')) return;
    b.disabled = true;
    const ok = await send({ op: 'review', code: d.c, month: document.getElementById('rvm').value, rating: A.star, skills: document.getElementById('rvs').value.trim(), note: document.getElementById('rvn').value.trim(), top }, 'Review saved' + (top ? '. Top money is now ' + money(top) + '/day' : ''));
    b.disabled = false; if (ok) { render(true); ACT.apView({ c: d.c }); }
  };
  ACT.apRate = d => {
    const a = find(d.c); if (!a) return;
    sheet('<h2>Top money · ' + esc(a.name) + '</h2><p class="small muted" style="margin-top:0">Now ' + money(a.rate) + ' per day. The new amount is used when you pay him/her from a job.</p>' +
      '<label>New amount per day (GH₵)</label><input id="trv" type="number" inputmode="decimal" style="' + inp + '">' +
      '<label>From</label><input id="trd" type="date" style="' + inp + '" value="' + today() + '"><label>Reason</label><input id="trr" style="' + inp + '" placeholder="Example: good progress, now fixes boards alone">' +
      '<br><button class="btn primary block" data-act="apRateSave" data-c="' + esc(a.code) + '">Save</button>');
  };
  ACT.apRateSave = async (d, b) => {
    const v = +document.getElementById('trv').value || 0; if (!(v > 0)) { toast('Enter the amount'); return; }
    b.disabled = true;
    const ok = await send({ op: 'rate', code: d.c, top: v, date: document.getElementById('trd').value, reason: document.getElementById('trr').value.trim() }, 'Top money is now ' + money(v) + '/day');
    b.disabled = false; if (ok) { render(true); ACT.apView({ c: d.c }); }
  };

  /* ---------- the agreement form (A4), filled or blank ---------- */
  const lines = t => String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
  function formHTML(a) {
    const c = cfg(), c1 = c.c1 || '#0077B6', c2 = c.c2 || '#2E9E5B', blank = !a, months = a ? a.months : cnum('apMonths', 30), service = a ? a.service : cnum('apService', 6);
    const top = a ? (a.rates.length ? a.rates[0].rate : a.rate) : cnum('apTop', 20), fee = a ? a.fee : cnum('apFee', 0);
    const val = (x, w) => x ? '<b>' + esc(x) + '</b>' : '<span style="display:inline-block;min-width:' + (w || 160) + 'px;border-bottom:1px dotted #94A3B8">&nbsp;</span>';
    const R = (k, x, k2, x2) => '<tr><td style="padding:5px 6px;color:#5B6B78;width:22%">' + k + '</td><td style="padding:5px 6px;width:28%">' + val(x) + '</td>' + (k2 ? '<td style="padding:5px 6px;color:#5B6B78;width:20%">' + k2 + '</td><td style="padding:5px 6px">' + val(x2) + '</td>' : '<td colspan="2"></td>') + '</tr>';
    const h3 = t => '<div style="margin:12px 0 4px;font-weight:800;color:' + esc(c1) + ';font-size:12px;letter-spacing:.4px;border-bottom:2px solid ' + esc(c1) + ';padding-bottom:2px">' + t + '</div>';
    const ol = arr => '<ol style="margin:4px 0 0;padding-left:20px;line-height:1.5">' + arr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>';
    let h = '<div class="paper" style="background:#fff;padding:16px;font-size:11.5px;color:#1F2933;border:1px solid var(--line);border-radius:12px">' +
      '<div style="display:flex;gap:10px;align-items:center"><img src="' + KL.logoSrc() + '" alt="" style="width:54px;height:54px;object-fit:contain"><div style="flex:1"><b style="font-size:16px;color:' + esc(c1) + '">' + esc(bizName()) + '</b><div style="font-size:10.5px;color:#5B6B78">' + esc([c.location, c.phone].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:14px;font-weight:800;color:' + esc(c1) + '">APPRENTICESHIP<br>AGREEMENT</div><div style="font-size:10.5px;color:#5B6B78">' + (a ? '<b>Code</b> ' + esc(a.code) : 'Code: ____________') + '</div></div></div>' +
      '<div style="height:4px;background:' + esc(c1) + ';margin:8px 0 2px"></div><div style="height:2px;background:' + esc(c2) + ';margin-bottom:6px"></div>' +
      h3('PART A · APPRENTICE DETAILS') + '<div style="display:flex;gap:12px"><table style="flex:1;border-collapse:collapse">' +
      R('Full name', a && a.name, 'Phone', a && a.phone) + R('Date of birth', a && (a.dob ? nice(a.dob) : ''), 'Education', a && a.edu) + R('Home town', a && a.town, 'Lives at', a && a.address) +
      R('Guardian / witness', a && a.guardian, 'Phone', a && a.gphone) + R('Relationship', a && a.rel, 'Next of kin', a && a.kin) + '</table>' +
      '<div style="width:92px;height:112px;border:1.5px dashed #94A3B8;border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;color:#94A3B8;font-size:10px;flex:none">Passport<br>photo</div></div>' +
      h3('PART B · THE TRADE') + '<div style="line-height:1.5">' + esc(c.apTrade || '') + '</div>' +
      h3('DURATION, HOURS AND TOP MONEY') + '<table style="width:100%;border-collapse:collapse">' +
      R('Training', mo(months), 'Start date', a ? nice(a.start) : '') + R('Service after training', service ? mo(service) : 'None', 'Expected finish', a ? nice(a.end) : '') +
      R('Working days and hours', c.apHours || '', '', '') + R('Starting top money', money(top) + ' per day', 'Training fee', fee ? money(fee) : 'None') + '</table>' +
      h3('CODE OF CONDUCT') + ol(lines(c.apRules)) + h3('PENALTIES') + ol(lines(c.apPenalties)) + h3('OTHER TERMS') + ol(lines(c.apTerms)) +
      '<div style="break-inside:avoid;page-break-inside:avoid"><div style="margin-top:12px;padding:8px 10px;background:#F1F5F9;border-radius:6px;line-height:1.5">I, ' + val(a && a.name, 220) + ', have read and understood this agreement, and I agree to keep all the rules above during my training and service with ' + esc(bizName()) + '.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:34px;font-size:10.5px;color:#5B6B78;text-align:center"><div style="border-top:1px solid #999;padding-top:4px">Apprentice (signature &amp; date)</div><div style="border-top:1px solid #999;padding-top:4px">Guardian / witness (signature &amp; date)</div><div style="border-top:1px solid #999;padding-top:4px">For ' + esc(bizName()) + '</div></div></div>' +
      '<div style="margin-top:10px;text-align:center;font-size:9.5px;color:#9AA5B1">Powered by EasySales · 020 320 7240</div></div>';
    return h;
  }
  function printIt(html, title) {
    let host = document.getElementById('printdoc'); if (host) host.remove();
    host = document.createElement('div'); host.id = 'printdoc'; host.innerHTML = html; document.body.appendChild(host);
    host.style.cssText = 'display:block;position:absolute;left:-9999px;top:0;width:194mm';
    const pp = host.querySelector('.paper'); if (pp) { pp.style.padding = '0'; pp.style.border = '0'; }
    const avail = 281 * 96 / 25.4 - 6, hgt = pp ? pp.scrollHeight : 0;
    if (pp && hgt > avail) pp.style.zoom = String(Math.max(0.78, Math.floor(avail / hgt * 100) / 100));
    host.style.cssText = '';
    if (!document.getElementById('printcss2')) { const st = document.createElement('style'); st.id = 'printcss2'; st.textContent = '#printdoc{display:none}@media print{body>*:not(#printdoc){display:none!important}#printdoc{display:block!important;padding:0}#printdoc .paper{border:0!important;border-radius:0!important;padding:0!important}#printdoc .paper *{-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{background:#fff!important}@page{size:A4;margin:8mm}}'; document.head.appendChild(st); }
    const old = document.title; document.title = title; setTimeout(() => { window.print(); document.title = old; }, 80);
    toast('Choose "Save as PDF" to keep a PDF');
  }
  ACT.apForm = d => {
    const a = find(d.c); if (!a) return; A.formFor = a;
    sheet('<h2>Agreement · ' + esc(a.name) + '</h2>' + formHTML(a) + '<div class="row" style="gap:8px;margin-top:12px"><button class="btn primary grow" data-act="apPrint">Print / PDF</button><button class="btn grow" data-act="apWa">WhatsApp</button></div>');
  };
  ACT.apPrint = () => { const a = A.formFor; printIt(formHTML(a), 'Apprenticeship agreement ' + (a ? a.code + ' - ' + a.name : '')); };
  ACT.apBlank = () => { A.formFor = null; sheet('<h2>Blank apprenticeship form</h2><p class="small muted" style="margin-top:0">Print it for a new person to fill and sign. The rules come from Rules &amp; form settings.</p>' + formHTML(null) + '<button class="btn primary block" style="margin-top:12px" data-act="apPrint">Print / PDF</button>'); };
  ACT.apWa = () => {
    const a = A.formFor; if (!a) return; const c = cfg();
    const t = bizName() + ' - Apprenticeship agreement\nName: ' + a.name + '\nCode: ' + a.code + '\nStart: ' + nice(a.start) + '\nTraining: ' + mo(a.months) + (a.service ? ' + ' + mo(a.service) + ' service' : '') + '\nExpected finish: ' + nice(a.end) + '\nHours: ' + (c.apHours || '') + '\nTop money: ' + money(a.rate) + ' per day (reviewed every 6 months)\n\nPlease keep the code of conduct you signed. Welcome to the team!';
    let n = String(a.phone || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1);
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(t), '_blank');
    toast('Tip: print the form as PDF and attach it in WhatsApp too');
  };
  ACT.apSet = () => {
    const c = cfg(), ta = (id, v, r) => '<textarea id="' + id + '" rows="' + (r || 6) + '" style="' + inp + '">' + esc(v || '') + '</textarea>', fi = (id, v, ty) => '<input id="' + id + '" style="' + inp + '"' + (ty ? ' type="' + ty + '"' : '') + ' value="' + esc(v || '') + '">';
    sheet('<h2>Apprentice rules &amp; form</h2><p class="small muted" style="margin-top:0">These go on every agreement form and apply to all apprentices. One rule per line.</p>' +
      '<label>What the trade involves</label>' + ta('ast', c.apTrade, 3) + '<label>Working days and hours</label>' + fi('ash', c.apHours) +
      '<div class="row" style="gap:8px"><div class="grow"><label>Training months</label>' + fi('asm', c.apMonths, 'number') + '</div><div class="grow"><label>Service months</label>' + fi('asv', c.apService, 'number') + '</div></div>' +
      '<div class="row" style="gap:8px"><div class="grow"><label>Starting top money /day</label>' + fi('aso', c.apTop, 'number') + '</div><div class="grow"><label>Training fee (0 = none)</label>' + fi('asf', c.apFee, 'number') + '</div></div>' +
      '<label>Code of conduct</label>' + ta('asr', c.apRules, 10) + '<label>Penalties</label>' + ta('asp', c.apPenalties, 7) + '<label>Other terms</label>' + ta('asx', c.apTerms, 5) +
      '<br><button class="btn primary block" data-act="apSetSave">Save</button>');
  };
  ACT.apSetSave = async (d, b) => {
    const v = id => document.getElementById(id).value;
    b.disabled = true;
    try {
      const r = await api('admin', { op: 'saveSettings', values: { apTrade: v('ast'), apHours: v('ash'), apMonths: v('asm'), apService: v('asv'), apTop: v('aso'), apFee: v('asf'), apRules: v('asr'), apPenalties: v('asp'), apTerms: v('asx') } });
      if (!r.ok) { toast(errText(r.error)); b.disabled = false; return; }
      if (S.cache && r.cfg) S.cache.cfg = r.cfg; KL.kvSet('cache', S.cache).catch(() => {}); toast('Saved'); closeSheet();
    } catch (e) { toast('Needs internet'); b.disabled = false; }
  };
})();

/* EasySales - one-time import from the K-Gabs app (owner only, in Setup) */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, esc, toast, sheet, closeSheet, errText } = KL;
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    _render(k);
    if (S.tab !== 'setup' || !S.session || S.session.role !== 'admin' || document.getElementById('xkgimp')) return;
    const m = document.querySelector('main.wrap'); if (!m) return;
    m.insertAdjacentHTML('beforeend', '<div class="card" id="xkgimp" style="margin:14px 0 90px"><b>Bring records from another app</b><p class="small muted" style="margin:4px 0 8px">For the import file Claude made from your K-Gabs app. Nothing is saved until you confirm.</p><label class="btn block" style="margin:0;text-align:center;cursor:pointer">Choose import file<input type="file" accept=".json,application/json" data-in="kgf" style="display:none"></label></div>');
  });
  let PACK = null;
  document.addEventListener('change', async ev => {
    const el = ev.target; if (!el || el.dataset.in !== 'kgf' || !el.files || !el.files[0]) return;
    try { PACK = JSON.parse(await el.files[0].text()); } catch (e) { toast('That is not an import file'); return; }
    el.value = '';
    if (!navigator.onLine) { toast('Needs internet'); return; }
    toast('Checking the file…');
    try {
      const r = await KL.api('kg', { pack: PACK, dry: true });
      if (!r.ok) { toast(errText(r.error)); return; }
      const s = r.summary, L = (a, b) => '<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>' + a + '</span><b>' + b + '</b></div>';
      const jobs = (PACK.estimates || []).filter(e => e.job), waits = (PACK.estimates || []).filter(e => !e.job);
      sheet('<h2>Import from ' + esc(PACK.from || 'the old app') + '</h2><p class="small muted" style="margin-top:0">This is what will be added. Nothing is saved yet.</p><div class="card" style="padding:4px 14px">' +
        L('Materials (new)', s.products.add) + L('Materials (price updated)', s.products.update) + L('Customers', s.customers) + L('Estimates waiting for an answer', s.estimates - s.jobs) + L('Running jobs (with what was paid before)', s.jobs) + L('Estimator rules', s.rules) + L('Business settings', s.settings) + (s.skipped ? L('Already brought in (skipped)', s.skipped) : '') + '</div>' +
        (jobs.length ? '<h3 style="margin:14px 0 4px">Jobs</h3><div class="card" style="padding:4px 14px">' + jobs.map(e => L(esc(e.customer), KL.money(e.job.paid) + ' paid of ' + KL.money(e.total))).join('') + '</div>' : '') +
        (waits.length ? '<h3 style="margin:14px 0 4px">Estimates</h3><div class="card" style="padding:4px 14px">' + waits.map(e => L(esc(e.customer), KL.money(e.total))).join('') + '</div>' : '') +
        '<br><button class="btn primary block" data-act="kgGo">Import now</button><button class="btn ghost block" style="margin-top:8px" data-act="close">Cancel</button>');
    } catch (e) { toast('Needs internet'); }
  });
  ACT.kgGo = async (d, b) => {
    if (!PACK) return; b.disabled = true; b.textContent = 'Importing… please wait';
    try {
      const r = await KL.api('kg', { pack: PACK, dry: false });
      if (!r.ok) { toast(errText(r.error)); b.disabled = false; b.textContent = 'Import now'; return; }
      const s = r.summary;
      sheet('<h2>Done</h2><p>Added ' + s.products.add + ' materials, ' + s.customers + ' customers, ' + (s.estimates - s.jobs) + ' estimates and ' + s.jobs + ' running jobs. Rules and business settings updated.</p><p class="small muted">Close the app and open it again so everything shows.</p><button class="btn primary block" data-act="close">OK</button>');
      PACK = null;
    } catch (e) { toast('It took too long. Check Jobs and Documents, then try again: nothing is added twice.'); b.disabled = false; b.textContent = 'Import now'; }
  };
})();

/* EasySales - small receipt printer (RawBT), tools register, other income, monthly target, printer/warranty/backup settings */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, api, esc, money, r2, sum, kk, $, today, toast, sheet, closeSheet, errText, cfg, bizName } = KL;
  const render = k => KL.fn('render')(k);
  const owner = () => S.session && S.session.role === 'admin';
  const has = m => KL.hasMod && KL.hasMod(m);
  const inp = 'width:100%;font:inherit;padding:12px;border:1.5px solid var(--line);border-radius:12px;background:#fff';
  Object.assign(KL.ERR, { bad_amount: 'Type an amount above 0.', section_off: 'This section is switched off for this shop.' });

  /* ---------- small receipt printer: plain text sent to the RawBT app (Android) ---------- */
  const W = () => String(cfg().paper || '58').indexOf('80') >= 0 ? 48 : 32;
  const N = x => r2(x).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const clean = t => String(t == null ? '' : t).replace(/₵/g, 'C').replace(/#/g, 'No.').replace(/[^\x20-\x7E\n]/g, '');
  const ctr = t => { const w = W(); return clean(t).split('\n').map(x => { x = x.slice(0, w); return ' '.repeat(Math.max(0, Math.floor((w - x.length) / 2))) + x; }).join('\n'); };
  const lr = (a, b) => { const w = W(); a = clean(a); b = clean(b); if (a.length + b.length + 1 > w) a = a.slice(0, Math.max(1, w - b.length - 1)); return a + ' '.repeat(Math.max(1, w - a.length - b.length)) + b; };
  const wrap = t => { const w = W(), out = []; clean(t).split('\n').forEach(par => { let line = ''; par.split(' ').forEach(word => { if ((line + ' ' + word).trim().length > w) { if (line) out.push(line); line = word.slice(0, w); } else line = (line + ' ' + word).trim(); }); out.push(line); }); return out.join('\n'); };
  const dash = () => '-'.repeat(W());
  function head(title, no, date) {
    const c = cfg(), L = [ctr(bizName().toUpperCase())];
    if (c.tagline) L.push(ctr(c.tagline));
    const ph = [c.phone, c.phone2].filter(Boolean).join(' / '); if (ph) L.push(ctr('Tel: ' + ph));
    if (c.location) L.push(ctr(c.location));
    L.push(dash(), ctr(title), lr(no ? 'No: ' + no : '', date || today()));
    return L;
  }
  function foot(L, inv) {
    const c = cfg();
    if (c.momo) L.push('', wrap('Pay by MoMo: ' + c.momo + (c.momoName ? ' (' + c.momoName + ')' : '')));
    const wm = parseFloat(c.warranty) || 0, fd = parseFloat(c.fixDays) || 0;
    if (inv && (wm || fd)) L.push('', wrap((wm ? 'Warranty: ' + wm + ' month' + (wm === 1 ? '' : 's') + ' on workmanship. ' : '') + (fd ? 'Report problems within ' + fd + ' days.' : '')));
    L.push('', ctr(c.note || 'Thank you for your business'), ctr('Powered by EasySales'), '', '', '');
    return L.join('\n');
  }
  function saleText(b) {
    const L = head('RECEIPT', b.id ? String(b.id).slice(-8) : '', (b.date || today()) + ' ' + String(b.time || '').slice(0, 5));
    L.push('Customer: ' + clean(b.customer).slice(0, W() - 10), dash());
    (b.items || []).forEach(i => { L.push(clean(i.p).slice(0, W())); L.push(lr('  ' + i.q + ' x ' + N(i.u), N(i.q * i.u))); });
    const paid = r2((b.cash || 0) + (b.momo || 0)), bal = r2(b.total - paid);
    L.push(dash(), lr('TOTAL (GHS)', N(b.total)));
    if (b.cash) L.push(lr('Cash', N(b.cash))); if (b.momo) L.push(lr('MoMo', N(b.momo)));
    L.push(bal > 0.004 ? lr('BALANCE OWED', N(bal)) : ctr('*** PAID ***'));
    return foot(L, false);
  }
  function docText(v) {
    const L = head('INVOICE', v.no, v.date), items = (v.data && v.data.items) || [], m = KL.docMoney(items, (v.data && v.data.adj) || {});
    L.push('Client: ' + clean(v.customer).slice(0, W() - 8)); if (v.title) L.push(wrap(v.title)); L.push(dash());
    items.forEach(i => { L.push(clean(i.p).slice(0, W())); L.push(lr('  ' + i.q + (i.un ? ' ' + i.un : '') + ' x ' + N(i.u), N(i.q * i.u))); });
    L.push(dash());
    if (m.trans) L.push(lr('Transport', N(m.trans))); if (m.disc) L.push(lr('Discount', '-' + N(m.disc)));
    m.taxes.forEach(t => L.push(lr(t.n + ' ' + t.r + '%', N(t.a))));
    const paid = r2(v.paid || 0), bal = r2(v.total - paid);
    L.push(lr('TOTAL (GHS)', N(v.total)), lr('Paid', N(paid)), bal > 0.004 ? lr('BALANCE DUE', N(bal)) : ctr('*** PAID IN FULL ***'));
    if (bal > 0.004 && v.until) L.push('Please pay by ' + v.until);
    return foot(L, true);
  }
  function sendToPrinter(text) {
    if (!/android/i.test(navigator.userAgent)) {
      sheet('<h2>Small printer</h2><p class="small">Printing to a small Bluetooth printer works on an <b>Android phone</b> with the free <b>RawBT</b> app from Play Store. On this device you can copy the receipt text below.</p><pre style="font-size:12px;background:#F7F8FA;padding:10px;border-radius:10px;white-space:pre;overflow-x:auto">' + esc(text) + '</pre>');
      return;
    }
    location.href = 'intent:' + encodeURI(text) + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
    toast('Opening RawBT… (if it is not installed, Play Store opens)');
  }
  KL.smallPrint = { sale: b => sendToPrinter(saleText(b)), doc: v => sendToPrinter(docText(v)) };
  ACT.spDoc = () => { const v = KL.docs && KL.docs.state.view; if (v) KL.smallPrint.doc(v); };
  let lastBill = null;
  ACT.spSale = () => { if (lastBill) KL.smallPrint.sale(lastBill); };
  const _rs = KL.fn('receiptSheet');
  KL.setFn('receiptSheet', function (b, fresh) {
    _rs(b, fresh); lastBill = b;
    const sh = document.querySelector('.sheet .sheet-body') || document.querySelector('.sheet'); if (!sh) return;
    const at = sh.querySelector('[data-act="shareimg"]');
    const btn = '<button class="btn block" style="margin-bottom:8px" data-act="spSale">🖨 Small receipt printer</button>';
    if (at) at.insertAdjacentHTML('afterend', btn); else sh.insertAdjacentHTML('beforeend', btn);
  });

  /* ---------- Setup: printer, warranty, follow-ups, target, backup ---------- */
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    _render(k);
    if (!S.session) return;
    const m = document.querySelector('main.wrap'); if (!m) return;
    if (S.tab === 'setup' && owner() && !document.getElementById('xmore')) m.insertAdjacentHTML('afterbegin', '<button id="xmore" class="btn block" style="margin-top:6px" data-act="moSet">Printer, warranty, follow-ups &amp; backup</button>');
    if (S.tab === 'tools' && toolsOn()) m.innerHTML = toolsHTML();
    if (S.tab === 'jobs' && toolsOn() && !document.getElementById('xtlchip')) { const ch = m.querySelector('.chips'); if (ch) ch.insertAdjacentHTML('beforeend', '<button id="xtlchip" class="chip" data-act="tab" data-t="tools">Tools</button>'); }
  });
  const num = (id, label, val, hint) => '<label>' + label + '</label><input id="' + id + '" type="number" inputmode="numeric" min="0" style="' + inp + '" value="' + esc(val) + '">' + (hint ? '<div class="small muted" style="margin:2px 0 6px">' + hint + '</div>' : '');
  ACT.moSet = () => {
    const c = cfg(), paper = String(c.paper || '58').indexOf('80') >= 0 ? '80' : '58';
    sheet('<h2>Printer, warranty, follow-ups &amp; backup</h2>' +
      '<label>Small receipt printer paper</label><select id="mop" style="' + inp + '"><option value="58"' + (paper === '58' ? ' selected' : '') + '>58 mm (small, most common)</option><option value="80"' + (paper === '80' ? ' selected' : '') + '>80 mm (wide)</option></select>' +
      '<div class="small muted" style="margin:2px 0 8px">Needs an Android phone with the free RawBT app, paired to the Bluetooth printer.</div>' +
      num('mow', 'Warranty on your work (months)', c.warranty || '0', '0 = do not show. Shows on invoices and in the thank-you message for jobs.') +
      num('mof', 'Client should report problems within (days)', c.fixDays || '0', '0 = do not show.') +
      (has('docs') ? num('mofu', 'Remind me to follow up estimates after (days)', c.followDays || '3', 'Estimates with no answer show on Home after this many days. 0 = off.') : '') +
      (has('target') ? num('mot', 'Monthly sales target (GH₵)', c.target || '0', 'Shows on Home with how far you have reached.') : '') +
      '<button class="btn primary block" style="margin-top:8px" data-act="moSave">Save</button>' +
      '<div class="card" style="margin-top:14px"><b>Backup</b><p class="small muted" style="margin:4px 0 8px">A full copy of your records is saved in your Google Drive (folder "EasySales backups"). The last 8 copies are kept.</p>' +
      '<div class="small">Last backup: <b>' + esc(c.lastBackup || 'not yet') + '</b></div><button class="btn block" style="margin-top:8px" data-act="moBackup">Back up now</button></div>');
  };
  ACT.moSave = async (d, b) => {
    const v = id => { const e = document.getElementById(id); return e ? String(Math.max(0, parseFloat(e.value) || 0)) : undefined; };
    const values = { paper: $('#mop').value, warranty: v('mow'), fixDays: v('mof') };
    if ($('#mofu')) values.followDays = v('mofu'); if ($('#mot')) values.target = v('mot');
    b.disabled = true;
    try { const r = await api('admin', { op: 'saveSettings', values }); if (!r.ok) { toast(errText(r.error)); b.disabled = false; return; } if (S.cache && r.cfg) S.cache.cfg = r.cfg; toast('Saved'); closeSheet(); render(true); } catch (e) { toast('Needs internet'); b.disabled = false; }
  };
  ACT.moBackup = async (d, b) => {
    b.disabled = true; b.textContent = 'Saving a copy… (can take a minute)';
    try {
      const r = await api('more', { op: 'backup' });
      if (!r.ok) { const e = String(r.error || ''); toast(/auth|permission|DriveApp|access/i.test(e) ? 'Allow backups first: open your Google Sheet → EasySales menu → "Back up this sheet every Sunday".' : errText(e)); b.disabled = false; b.textContent = 'Back up now'; return; }
      if (S.cache && S.cache.cfg) S.cache.cfg.lastBackup = today() + ' (by hand)';
      toast('Backup saved in Google Drive'); ACT.moSet();
    } catch (e) { toast('Needs internet'); b.disabled = false; b.textContent = 'Back up now'; }
  };

  /* ---------- monthly target on Home ---------- */
  KL.targetCard = r => {
    if (!owner() || !has('target')) return '';
    const tg = parseFloat(cfg().target) || 0;
    if (!tg) return '<div class="card" style="margin-top:16px"><div class="row between"><b>Monthly target</b><button class="btn sm" data-act="moSet">Set target</button></div><p class="small muted" style="margin:4px 0 0">Choose how much you want to sell this month.</p></div>';
    const got = r && r.monthTotals ? r.monthTotals.sales : 0, pct = Math.min(100, Math.round(got / tg * 100));
    const now = new Date(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), left = dim - now.getDate() + 1, need = Math.max(0, tg - got);
    const col = pct >= 100 ? '#16A34A' : pct >= (now.getDate() / dim * 100) - 5 ? '#0077B6' : '#D97706';
    return '<div class="card" style="margin-top:16px"><div class="row between"><b>Target this month</b><span class="small muted">' + money(tg) + '</span></div>' +
      '<div style="height:12px;background:#EEF2F6;border-radius:99px;margin:10px 0 6px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + col + ';border-radius:99px"></div></div>' +
      '<div class="row between small"><span><b style="color:' + col + '">' + pct + '%</b> · ' + money(got) + ' sold</span><span class="muted">' + (need > 0 ? money(r2(need / left)) + ' a day for ' + left + ' day' + (left === 1 ? '' : 's') : 'Reached 🎉') + '</span></div></div>';
  };

  /* ---------- other income (Money → Other income) ---------- */
  const KINDS = ['Tool or equipment hire', 'Refund', 'Scrap or offcuts sold', 'Transport charged', 'Commission', 'Other'];
  ACT.incNew = () => {
    sheet('<h2>Add other income</h2><p class="small muted" style="margin-top:0">Money that is not a sale or a job payment.</p>' +
      '<label>What is it?</label><input id="ik" list="ikl" style="' + inp + '" placeholder="Example: Tool hire"><datalist id="ikl">' + KINDS.map(k => '<option>' + esc(k) + '</option>').join('') + '</datalist>' +
      '<div class="picker"><div><label>Amount (GH₵)</label><input id="ia" type="number" inputmode="decimal" style="' + inp + '"></div><div><label>Date</label><input id="id" type="date" style="' + inp + '" value="' + today() + '"></div></div>' +
      '<label>Note (optional)</label><input id="in" style="' + inp + '" placeholder="Example: scaffold hired by Kofi">' +
      '<button class="btn primary block" style="margin-top:10px" data-act="incSave">Save</button>');
  };
  const incList = r => { if (KL.B) { KL.B.inc = r.income; KL.B.profit = null; } };
  ACT.incSave = async (d, b) => {
    const amount = parseFloat($('#ia').value); if (!(amount > 0)) { toast('Type the amount'); return; }
    b.disabled = true;
    try { const r = await api('more', { op: 'incSave', kind: $('#ik').value, amount, date: $('#id').value, note: $('#in').value, month: KL.B ? KL.B.expMonth : '' }); if (!r.ok) { toast(errText(r.error)); b.disabled = false; return; } incList(r); toast('Saved'); closeSheet(); render(true); } catch (e) { toast('Needs internet'); b.disabled = false; }
  };
  ACT.incOpen = d => {
    const x = (KL.B && KL.B.inc || []).find(i => i.id === d.id); if (!x) return;
    sheet('<h2>' + esc(x.kind) + '</h2><div class="card"><div class="row between"><span>Amount</span><b class="green">' + money(x.amount) + '</b></div><div class="row between small"><span>Date</span><span>' + esc(x.date) + '</span></div>' + (x.note ? '<div class="small" style="margin-top:4px">' + esc(x.note) + '</div>' : '') + '<div class="small muted">Added by ' + esc(x.by) + '</div></div>' +
      '<button class="btn danger block" data-act="incDel" data-id="' + esc(x.id) + '">Delete</button>');
  };
  ACT.incDel = async (d, b) => {
    if (!confirm('Delete this income?')) return; b.disabled = true;
    try { const r = await api('more', { op: 'incDelete', id: d.id, month: KL.B ? KL.B.expMonth : '' }); if (!r.ok) { toast(errText(r.error)); b.disabled = false; return; } incList(r); toast('Deleted'); closeSheet(); render(true); } catch (e) { toast('Needs internet'); b.disabled = false; }
  };

  /* ---------- tools register ---------- */
  const T = { list: null, f: 'all', v: null };
  const toolsOn = () => owner() && has('tools');
  const CND = { Good: ['#DCFCE7', '#166534'], 'Needs repair': ['#FEF3C7', '#92400E'], Spoilt: ['#FEE2E2', '#B91C1C'], Lost: ['#F1F5F9', '#64748B'] };
  const pill = s => '<span style="font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:99px;background:' + (CND[s] || CND.Good)[0] + ';color:' + (CND[s] || CND.Good)[1] + '">' + esc(s) + '</span>';
  const inStore = t => kk(t.with) === 'store';
  ICON.tools = '<svg viewBox="0 0 24 24"><path d="M14 6a4 4 0 0 0 5 5l-8 8a2 2 0 0 1-3-3l8-8"/></svg>';
  const _tabsFor = KL.fn('tabsFor');
  KL.setFn('tabsFor', function () { const t = _tabsFor(); if (toolsOn()) t.push(['tools', 'Tools']); return t; });
  const _tab = ACT.tab; ACT.tab = d => { _tab(d); if (d.t === 'tools') loadTools(); };
  async function loadTools() {
    try { const r = await api('more', { op: 'tools' }); if (r.ok) { T.list = r.tools; KL.kvSet('tools', r.tools).catch(() => {}); } else toast(errText(r.error)); }
    catch (e) { if (!T.list) { try { T.list = await KL.kvGet('tools'); } catch (x) { /* none */ } } }
    if (S.tab === 'tools') render(true);
  }
  function toolsHTML() {
    let h = '<div class="row between" style="margin-top:6px"><h2 style="margin:0">Tools</h2><button class="btn sm primary" data-act="tlNew">+ Add tool</button></div>';
    if (!T.list) return h + '<div class="empty">Loading…</div>';
    const L = T.list, out = L.filter(t => !inStore(t) && t.cond !== 'Lost'), bad = L.filter(t => t.cond === 'Needs repair' || t.cond === 'Spoilt'), lost = L.filter(t => t.cond === 'Lost');
    h += '<div class="stats"><div class="stat"><span>In the store</span><b>' + L.filter(t => inStore(t) && t.cond !== 'Lost').length + '</b></div><div class="stat"><span>With people</span><b>' + out.length + '</b></div>' +
      '<div class="stat"><span>Need repair</span><b class="' + (bad.length ? 'amber' : '') + '">' + bad.length + '</b></div><div class="stat"><span>Lost</span><b class="' + (lost.length ? 'red' : '') + '">' + lost.length + '</b></div></div>';
    const F = [['all', 'All'], ['out', 'With people'], ['store', 'In store'], ['bad', 'Need repair']];
    h += '<div class="chips" style="margin:8px 0">' + F.map(x => '<button class="chip ' + (T.f === x[0] ? 'on' : '') + '" data-act="tlF" data-f="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    const show = T.f === 'out' ? out : T.f === 'store' ? L.filter(t => inStore(t) && t.cond !== 'Lost') : T.f === 'bad' ? bad : L;
    if (T.f === 'out' && out.length) {
      const by = {}; out.forEach(t => { (by[t.with] = by[t.with] || []).push(t); });
      return h + Object.keys(by).sort().map(p => '<div class="card" style="padding:6px 14px"><b>' + esc(p) + '</b> <span class="small muted">· ' + by[p].length + ' tool' + (by[p].length > 1 ? 's' : '') + '</span>' + by[p].map(row).join('') + '</div>').join('');
    }
    return h + '<div class="card" style="padding:4px 14px">' + (show.length ? show.map(row).join('') : '<div class="empty">' + (L.length ? 'Nothing here.' : 'Add your tools: drills, ladders, scaffold, cutters, levels…') + '</div>') + '</div>';
  }
  const row = t => '<button class="item" data-act="tlOpen" data-id="' + esc(t.id) + '"><span class="grow"><span class="nm">' + esc(t.name) + (t.mark ? ' <span class="small muted">' + esc(t.mark) + '</span>' : '') + '</span><br><span class="small muted">' + (inStore(t) ? 'In the store' : 'With <b>' + esc(t.with) + '</b>') + (t.since ? ' since ' + esc(t.since) : '') + '</span></span><span class="right">' + pill(t.cond) + '</span></button>';
  ACT.tlF = d => { T.f = d.f; render(true); };
  const people = () => { const n = {}; ((KL.B && KL.B.crew) || []).forEach(c => { if (c.active !== false) n[c.name] = 1; }); ((KL.B && KL.B.crewNames) || []).forEach(c => { const x = typeof c === 'string' ? c : c && c.name; if (x) n[x] = 1; }); (T.list || []).forEach(t => { if (!inStore(t)) n[t.with] = 1; }); return Object.keys(n).sort(); };
  ACT.tlNew = d => {
    const t = d && d.id ? (T.list || []).find(x => x.id === d.id) : null; T.v = t;
    sheet('<h2>' + (t ? 'Edit tool' : 'Add tool') + '</h2><label>Tool</label><input id="tn" style="' + inp + '" value="' + esc(t ? t.name : '') + '" placeholder="Example: Drill machine">' +
      '<div class="picker"><div><label>Number / mark (optional)</label><input id="tm" style="' + inp + '" value="' + esc(t ? t.mark : '') + '" placeholder="Example: KG-D1"></div>' + (t ? '' : '<div><label>How many?</label><input id="tc" type="number" inputmode="numeric" min="1" style="' + inp + '" value="1"></div>') + '</div>' +
      '<label>Condition</label><select id="tcd" style="' + inp + '">' + Object.keys(CND).map(c => '<option' + (t && t.cond === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>' +
      '<label>Note (optional)</label><input id="tno" style="' + inp + '" value="' + esc(t ? t.note : '') + '" placeholder="Example: bought March, GH₵ 850">' +
      '<button class="btn primary block" style="margin-top:10px" data-act="tlSave">Save</button>');
  };
  async function call(body, msg) {
    try { const r = await api('more', body); if (!r.ok) { toast(errText(r.error)); return false; } T.list = r.tools; KL.kvSet('tools', r.tools).catch(() => {}); if (msg) toast(msg); return true; }
    catch (e) { toast('Needs internet'); return false; }
  }
  ACT.tlSave = async (d, b) => {
    const name = $('#tn').value.trim(); if (!name) { toast('Type the tool name'); return; }
    b.disabled = true;
    const ok = await call({ op: 'toolSave', id: T.v ? T.v.id : '', name, mark: $('#tm').value, count: $('#tc') ? $('#tc').value : 1, cond: $('#tcd').value, note: $('#tno').value }, 'Saved');
    if (ok) { closeSheet(); render(true); } else b.disabled = false;
  };
  ACT.tlOpen = d => {
    const t = (T.list || []).find(x => x.id === d.id); if (!t) return; T.v = t;
    const opts = people().filter(p => kk(p) !== kk(t.with)).map(p => '<option>' + esc(p) + '</option>').join('');
    sheet('<h2>' + esc(t.name) + (t.mark ? ' <span class="small muted">' + esc(t.mark) + '</span>' : '') + '</h2>' +
      '<div class="card"><div class="row between"><span>Now</span><b>' + (inStore(t) ? 'In the store' : 'With ' + esc(t.with)) + '</b></div><div class="row between small"><span>Since</span><span>' + esc(t.since || '') + '</span></div><div class="row between small" style="margin-top:4px"><span>Condition</span>' + pill(t.cond) + '</div>' + (t.note ? '<div class="small muted" style="margin-top:4px">' + esc(t.note) + '</div>' : '') + '</div>' +
      '<div class="card"><b>' + (inStore(t) ? 'Give it out' : 'Return it or pass it on') + '</b>' +
      '<label>To</label><input id="tto" list="ttl" style="' + inp + '" value="' + (inStore(t) ? '' : 'Store') + '" placeholder="Name of worker or apprentice"><datalist id="ttl"><option>Store</option>' + opts + '</datalist>' +
      '<label>Condition now</label><select id="tcn" style="' + inp + '">' + Object.keys(CND).map(c => '<option' + (t.cond === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>' +
      '<label>Note (optional)</label><input id="tmn" style="' + inp + '" placeholder="Example: for the Kasoa site">' +
      '<button class="btn primary block" style="margin-top:10px" data-act="tlMove">Save</button></div>' +
      (t.moves.length ? '<div class="card"><b>History</b>' + t.moves.map(m => '<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)">' + esc(m.date) + ' · ' + esc(m.from) + ' → <b>' + esc(m.to) + '</b> · ' + esc(m.cond) + (m.note ? '<br><span class="muted">' + esc(m.note) + '</span>' : '') + '</div>').join('') + '</div>' : '') +
      '<div class="row" style="gap:8px"><button class="btn grow" data-act="tlNew" data-id="' + esc(t.id) + '">Edit</button><button class="btn danger grow" data-act="tlDel">Delete</button></div>');
  };
  ACT.tlMove = async (d, b) => {
    const to = $('#tto').value.trim(); if (!to) { toast('Who gets it? Type a name or Store'); return; }
    b.disabled = true;
    const ok = await call({ op: 'toolMove', id: T.v.id, to: kk(to) === 'store' ? 'Store' : to, cond: $('#tcn').value, note: $('#tmn').value }, kk(to) === 'store' ? 'Returned to the store' : 'Given to ' + to);
    if (ok) { closeSheet(); render(true); } else b.disabled = false;
  };
  ACT.tlDel = async (d, b) => {
    if (!confirm('Delete ' + T.v.name + ' from the register?')) return; b.disabled = true;
    if (await call({ op: 'toolDelete', id: T.v.id }, 'Deleted')) { closeSheet(); render(true); } else b.disabled = false;
  };
  // Home: tools that need repair
  const _att = KL.moreAttention;
  KL.moreAttention = () => {
    const base = _att ? _att() : []; if (!toolsOn() || !T.list) return base;
    const bad = T.list.filter(t => t.cond === 'Needs repair'); if (bad.length) base.push({ k: 'tools', i: '🔧', bg: '#FEF3C7', fg: '#92400E', a: bad.length + (bad.length > 1 ? ' tools need' : ' tool needs') + ' repair', b: bad.slice(0, 3).map(t => esc(t.name)).join(', '), amt: '', o: 4 });
    return base;
  };
  const _r2 = KL.fn('render');
  KL.setFn('render', function (k) { _r2(k); if (S.session && S.tab === 'dash' && toolsOn() && !T.list && !T.asked && navigator.onLine) { T.asked = 1; loadTools(); } });
})();
