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
