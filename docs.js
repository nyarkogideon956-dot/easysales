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
  const build = () => !KL.hasMod || KL.hasMod('build');   // construction extras: labour, transport, client buys materials, payment plan
  const useTax = () => (cfg().useTax || 'Yes') !== 'No';
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
    if (S.tab === 'setup' && !document.getElementById('xdocset')) {
      // only show these when the shop has estimates / the estimator switched on
      const hm = x => !KL.hasMod || KL.hasMod(x);
      const bt = (hm('est') ? '<button class="btn sm grow" data-act="dRules">Estimator rules</button>' : '') + (hm('docs') ? '<button class="btn sm grow" data-act="dSettings">Document settings</button>' : '');
      if (bt) m.insertAdjacentHTML('afterbegin', '<div id="xdocset" class="row" style="gap:8px;margin-top:6px">' + bt + '</div>');
    }
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

  /* ---------- money: materials + transport + labour - discount, then VAT, NHIL, GETFund on the same base ---------- */
  function docMoney(items, a) {
    a = a || {}; const c = cfg();
    let mat = 0, lab = 0;
    (items || []).forEach(i => { const v = (+i.q || 0) * (+i.u || 0); if (i.l) lab += v; else mat += v; });
    mat = r2(mat); lab = r2(lab);
    const charged = a.clientMat ? 0 : mat, trans = Math.max(0, r2(+a.trans || 0)), before = r2(charged + trans + lab);
    const disc = a.discPct ? r2(before * Math.min(100, Math.max(0, +a.disc || 0)) / 100) : Math.min(before, Math.max(0, r2(+a.disc || 0)));
    const base = r2(before - disc), taxes = [];
    if (a.tax) [['VAT', +(c.taxVat || 15)], ['NHIL', +(c.taxNhil || 2.5)], ['GETFund', +(c.taxGet || 2.5)]].forEach(t => { if (t[1] > 0) taxes.push({ n: t[0], r: t[1], a: r2(base * t[1] / 100) }); });
    const tax = r2(sum(taxes, t => t.a));
    return { mat, lab, charged, trans, disc, base, taxes, tax, total: r2(base + tax) };
  }
  KL.docMoney = docMoney;
  /* ---------- payment plan for each estimate: show or hide it, 1 to 3 payments, own percentages ---------- */
  const PPK = 'es_pplans';
  const ppMap = () => { try { return JSON.parse(localStorage.getItem(PPK) || '{}') || {}; } catch (e) { return {}; } };
  const ppSaveLocal = (no, pp) => { try { const m = ppMap(); if (pp) m[no] = pp; else delete m[no]; localStorage.setItem(PPK, JSON.stringify(m)); } catch (e) { /* ignore */ } };
  function planCustom(doc) {
    const sc = doc && doc.data && doc.data.scope, pp = (sc && sc.pplan) || (doc && doc.no && ppMap()[doc.no]);
    return pp && pp.stages && pp.stages.length ? { show: pp.show !== false, stages: pp.stages.map(x => ({ l: String(x.l || ''), p: +x.p || 0 })), auto: false } : null;
  }
  const ppDefaults = cm => (cm ? [['Before work starts', 50], ['When the job is 70% done', 35], ['After completion and inspection', 15]] : [['Before work starts', 70], ['When 60% of the work is done', 20], ['After completion and inspection', 10]]).map(x => ({ l: x[0], p: x[1] }));
  const ppPreset = n => n === 1 ? [{ l: 'Full payment before work starts', p: 100 }] : n === 2 ? [{ l: 'Before work starts', p: 70 }, { l: 'After completion and inspection', p: 30 }] : ppDefaults(false);
  const ppSumHTML = sm => Math.abs(sm - 100) < 0.01 ? '<span style="color:#1E7B4F">Total 100% ✓</span>' : '<span style="color:#B3261E">Total ' + (Math.round(sm * 100) / 100) + '%. It must add up to 100%.</span>';
  const scopeOut = e => { const keep = e.pplan && !(e.pplan.auto && e.pplan.show); if (!keep) return e.scope || null; return Object.assign({ inc: [], exc: [] }, e.scope || {}, { pplan: { show: e.pplan.show, stages: e.pplan.stages } }); };
  function planCard(e) {
    if (!e.pplan || e.pplan.auto) e.pplan = { show: e.pplan ? e.pplan.show : true, stages: ppDefaults(e.clientMat), auto: true };
    const pp = e.pplan, n = pp.stages.length;
    return '<div class="card" style="padding:12px;margin-top:10px"><label style="margin:0;display:flex;align-items:center;gap:8px;font-weight:700"><input id="dpp-show" type="checkbox" style="width:auto;min-height:0"' + (pp.show ? ' checked' : '') + '> Show payment plan</label>' +
      (pp.show ? '<div class="row" style="margin-top:8px;gap:8px;align-items:center"><span class="small muted">Number of payments</span>' + [1, 2, 3].map(k => '<button class="chip' + (n === k ? ' on' : '') + '" data-act="dPPn" data-n="' + k + '">' + k + '</button>').join('') + '</div>' +
        pp.stages.map((x, k) => '<div class="row" style="margin-top:8px;gap:8px"><div class="grow"><input data-ppl="' + k + '" value="' + esc(x.l) + '"></div><div style="width:84px"><input data-ppp="' + k + '" type="number" inputmode="decimal" value="' + esc(x.p) + '" placeholder="%"></div></div>').join('') +
        '<div id="pp-sum" class="small" style="margin-top:6px">' + ppSumHTML(pp.stages.reduce((a, x) => a + (+x.p || 0), 0)) + '</div>' : '') + '</div>';
  }

  function plan(type, total, clientMat) {
    const std = clientMat ? [['Before work starts', 50], ['When the job is 70% done', 35], ['After completion and inspection', 15]] : [['Before work starts', 70], ['When 60% of the work is done', 20], ['After completion and inspection', 10]];
    return std.map(x => [x[0], x[1], r2(total * x[1] / 100)]);
  }

  /* ---------- the paper: what the customer sees (preview, view, print) ---------- */
  function paperHTML(doc, preview) {
    const c = cfg(), items = doc.data.items || [], wb = doc.type === 'WB', inv = doc.type === 'INV', adj = doc.data.adj || {};
    const m = wb ? null : docMoney(items, adj), total = m ? m.total : 0, paid = inv ? r2(doc.paid || 0) : 0, bal = r2(total - paid);
    const c1 = c.c1 || '#7A1F3D', mute = '#5B6B78', N = x => r2(x).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const st = inv ? (bal <= 0.004 ? ['PAID IN FULL', '#1E7B4F'] : paid > 0 ? ['PART PAID', '#B26A00'] : ['UNPAID', '#B3261E']) : null;
    const th = 'style="text-align:right;padding:4px 6px;font-weight:700"', td = 'style="padding:3px 6px;border-bottom:1px solid #EEF0F4"', tdn = 'style="padding:3px 6px;border-bottom:1px solid #EEF0F4;text-align:right;white-space:nowrap"';
    const h3 = t => '<div style="margin:10px 0 3px;font-weight:800;color:' + esc(c1) + ';font-size:12px;letter-spacing:.4px">' + t + '</div>';
    const table = (rows, qtyHead) => '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><tr style="background:' + esc(c1) + ';color:#fff"><th style="text-align:left;padding:5px 6px">Description</th><th ' + th + '>' + qtyHead + '</th><th style="text-align:left;padding:5px 6px">Unit</th>' + (wb ? '' : '<th ' + th + '>Rate</th><th ' + th + '>Amount</th>') + '</tr>' +
      rows.map(i => '<tr><td ' + td + '>' + esc(i.p) + '</td><td ' + tdn + '>' + i.q + '</td><td ' + td + '>' + esc(i.un || '') + '</td>' + (wb ? '' : '<td ' + tdn + '>' + N(i.u) + '</td><td ' + tdn + '>' + N(i.q * i.u) + '</td>') + '</tr>').join('');
    const mats = items.filter(i => !i.l), labs = items.filter(i => i.l);
    let h = '<div class="paper" style="position:relative;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;font-size:12px;color:#1F2933;overflow:hidden">';
    if (preview) h += '<div style="position:absolute;top:10px;right:-36px;transform:rotate(35deg);background:#FFF0D2;color:#7A4B00;font-weight:800;font-size:11px;padding:3px 42px">PREVIEW</div>';
    if (st && !preview) h += '<div aria-hidden="true" style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%) rotate(-16deg);border:4px solid ' + st[1] + ';color:' + st[1] + ';opacity:.16;font-size:32px;font-weight:800;padding:0 14px;border-radius:10px;white-space:nowrap">' + st[0] + '</div>';
    // header
    const meta = [['No.', doc.no || 'New'], ['Date', doc.date || today()]];
    if (doc.until && !wb) meta.push([inv ? 'Due date' : 'Valid until', doc.until]);
    if (doc.from) meta.push(['Our ref.', doc.from]);
    if (c.tin && adj.tax) meta.push(['TIN', c.tin]);
    h += '<div style="display:flex;gap:10px;align-items:flex-start"><img src="' + logoSrc() + '" alt="" style="width:56px;height:56px;object-fit:contain"><div style="flex:1;min-width:0"><b style="font-size:15px;color:' + esc(c1) + '">' + esc(bizName()) + '</b><div style="font-size:10.5px;color:' + mute + '">' + esc([c.tagline, c.location, [c.phone, c.phone2].filter(Boolean).join(' / '), c.bizEmail].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:15px;font-weight:800;color:' + esc(c1) + '">' + TITLE[doc.type] + '</div><div style="font-size:10.5px;color:' + mute + ';line-height:1.5">' + meta.map(x => '<b>' + x[0] + '</b> ' + esc(x[1])).join('<br>') + '</div></div></div>' +
      '<div style="height:4px;background:' + esc(c1) + ';margin:8px 0 2px;border-radius:2px"></div><div style="height:2px;background:' + esc(c.c2 || '#E07A1F') + ';margin-bottom:10px;border-radius:2px"></div>';
    // client box
    h += '<table style="width:100%;border-collapse:collapse;font-size:11.5px;background:#F7F8FA;border-radius:8px"><tr><td style="padding:5px 8px;color:' + mute + '">' + (wb ? 'Deliver to' : 'Client') + '</td><td style="padding:5px 8px"><b>' + esc(doc.customer) + '</b></td><td style="padding:5px 8px;color:' + mute + '">Phone</td><td style="padding:5px 8px">' + esc(doc.phone || '') + '</td></tr>' +
      '<tr><td style="padding:5px 8px;color:' + mute + '">Site / location</td><td style="padding:5px 8px" colspan="3">' + esc(wb ? (doc.data.dest || doc.location || '') : (doc.location || '')) + '</td></tr></table>';
    // measured areas
    const rooms = doc.data.rooms || [];
    const TY = { PB: 'Plasterboard', AC: 'Acoustic', POP: 'POP', PT: 'Partition wall', PNT: 'Painting only' };
    const rm = r => r.m2 !== undefined ? +r.m2 : (+r.l || 0) * (+r.w || 0), rs = r => r.size || ((+r.l || 0) + ' x ' + (+r.w || 0) + ' m');
    if (!wb && rooms.length && c.showRooms === 'Yes') h += h3('MEASURED AREAS') + '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><tr style="background:#F1F3F6"><th style="text-align:left;padding:5px 6px">Area</th><th style="text-align:left;padding:5px 6px">Type</th><th ' + th + '>Size</th><th ' + th + '>m²</th></tr>' +
      rooms.map(r => '<tr><td ' + td + '>' + esc(r.n || 'Room') + '</td><td ' + td + '>' + (TY[r.t] || 'Plasterboard') + (r.fr === 'wood' ? ' on wood' : '') + (r.c ? ' + cornice' : '') + (pmOf(r) ? ' + painting (' + PM[pmOf(r)].toLowerCase() + ')' : '') + (r.ins ? ' + insulation' : '') + '</td><td ' + tdn + '>' + esc(rs(r)) + '</td><td ' + tdn + '>' + r2(rm(r)) + '</td></tr>').join('') +
      '<tr><td colspan="3" style="padding:5px 6px;text-align:right;font-weight:700">Total area</td><td ' + tdn + '><b>' + r2(sum(rooms, rm)) + '</b></td></tr></table>';
    if (doc.title) h += '<div style="margin:12px 0 0;font-size:15px;font-weight:800;color:' + esc(c1) + ';text-transform:uppercase;letter-spacing:.4px">' + esc(doc.title) + '</div>';
    if (wb) {
      h += h3('ITEMS') + table(items, 'Qty') + '</table>' +
        '<div style="margin-top:10px">Vehicle: <b>' + esc(doc.data.vehicle || '—') + '</b> · Driver: <b>' + esc(doc.data.driver || '—') + '</b></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:28px;font-size:10.5px;color:' + mute + ';text-align:center"><div style="border-top:1px solid #999;padding-top:4px">Dispatched by</div><div style="border-top:1px solid #999;padding-top:4px">Driver</div><div style="border-top:1px solid #999;padding-top:4px">Received by</div></div>';
    } else {
      const sub = t => '<tr><td colspan="5" style="padding:5px 6px 3px;background:#F1F5F9;font-weight:800;color:' + esc(c1) + ';font-size:10.5px;letter-spacing:.4px">' + t + '</td></tr>';
      const rowsOf = list => list.map(i => i.un === 'lump' ? '<tr><td ' + td + '>' + esc(i.p) + '</td><td ' + tdn + '></td><td ' + td + '>Lump sum</td><td ' + tdn + '></td><td ' + tdn + '>' + N(i.q * i.u) + '</td></tr>' : '<tr><td ' + td + '>' + esc(i.p) + '</td><td ' + tdn + '>' + i.q + '</td><td ' + td + '>' + esc(i.un || '') + '</td><td ' + tdn + '>' + N(i.u) + '</td><td ' + tdn + '>' + N(i.q * i.u) + '</td></tr>').join('');
      h += '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px"><tr style="background:' + esc(c1) + ';color:#fff"><th style="text-align:left;padding:4px 6px">Description</th><th ' + th + '>Qty</th><th style="text-align:left;padding:4px 6px">Unit</th><th ' + th + '>Rate</th><th ' + th + '>Amount (GH₵)</th></tr>' +
        (mats.length ? sub('MATERIALS' + (adj.clientMat ? ' (CLIENT BUYS, GUIDE PRICES)' : '')) + rowsOf(mats) : '') + (m.trans ? sub('TRANSPORT') + '<tr><td colspan="4" ' + td + '>Transport / delivery</td><td ' + tdn + '>' + N(m.trans) + '</td></tr>' : '') +
        (labs.length ? sub('LABOUR / WORKMANSHIP') + rowsOf(labs) : '') + '</table>';
      const row = (a, b, st2) => '<tr><td style="padding:4px 8px;' + (st2 || '') + '">' + a + '</td><td style="padding:4px 8px;text-align:right;white-space:nowrap;' + (st2 || '') + '">' + b + '</td></tr>';
      h += '<table style="margin:6px 0 0 auto;border-collapse:collapse;font-size:11.5px;min-width:55%">';
      if (mats.length) h += row(adj.clientMat ? 'Materials (client buys)' : 'Materials', adj.clientMat ? '<s style="color:' + mute + '">' + N(m.mat) + '</s>' : N(m.mat));
      if (m.trans) h += row('Transport', N(m.trans));
      if (labs.length) h += row('Labour / workmanship', N(m.lab));
      if (m.disc) h += row('Discount' + (adj.discPct ? ' (' + (+adj.disc) + '%)' : ''), '- ' + N(m.disc), 'color:#B3261E');
      m.taxes.forEach(t => { h += row(t.n + ' (' + t.r + '%)', N(t.a), 'color:' + mute); });
      h += row('<b>' + (adj.clientMat ? 'TOTAL PAYABLE TO US' : 'GRAND TOTAL') + '</b>', '<b>GH₵ ' + N(total) + '</b>', 'background:' + esc(c1) + ';color:#fff;font-size:15px;padding:6px 8px');
      if (inv) h += row('Paid so far', N(paid), 'color:#1E7B4F') + row('<b>BALANCE DUE</b>', '<b>GH₵ ' + N(Math.max(0, bal)) + '</b>', 'color:' + (bal > 0.004 ? '#B3261E' : '#1E7B4F') + ';font-size:13px');
      h += '</table>';
      if (inv && bal > 0.004 && doc.until) h += '<div style="margin-top:8px"><b>Please pay the balance by ' + esc(doc.until) + '.</b> Use <b>' + esc(doc.no || 'the invoice number') + '</b> as the payment reference.</div>';
      h += '<div class="pp-cols" style="display:block;margin-top:4px"><div>';
      const stageBox = x => '<div style="flex:1;border:1px solid #D5DAE0;border-radius:8px;padding:7px 5px;text-align:center"><div style="font-size:15px;font-weight:800;color:' + esc(c1) + '">' + x[1] + '%</div><div style="font-size:10px;color:' + mute + ';line-height:1.3">' + x[0] + '</div><div style="font-weight:700;margin-top:3px">' + N(x[2]) + '</div></div>';
      const pc = planCustom(doc), stages = pc ? (() => { let left = total; return pc.stages.map((x, k, a) => { const amt = k === a.length - 1 ? r2(left) : r2(total * x.p / 100); left -= amt; return [x.l, x.p, amt]; }); })() : plan(doc.type, total, adj.clientMat);
      if (!inv && total > 0 && build() && (!pc || pc.show)) h += h3('PAYMENT PLAN' + (adj.clientMat ? ' (WORKMANSHIP)' : '')) + '<div style="display:flex;gap:8px">' + stages.map(stageBox).join('') + '</div>';
      if ((c.momo || c.bank) && (!inv || bal > 0.004)) h += '<div style="margin-top:14px;background:#F3F5F8;border-radius:8px;padding:8px 10px;line-height:1.6"><div style="font-weight:800;color:' + esc(c1) + ';font-size:11px;letter-spacing:.4px">HOW TO PAY</div>' +
        (c.momo ? 'Mobile Money: <b>' + esc(c.momo) + '</b>' + (c.momoName ? ' (' + esc(c.momoName) + ')' : '') : '') + (c.momo && c.bank ? '<br>' : '') + (c.bank ? 'Bank: <b>' + esc(c.bank) + '</b>' : '') + '<div style="font-size:10px;color:' + mute + '">Use <b>' + esc(doc.no || 'the document number') + '</b> as the reference and send us a screenshot after paying.</div></div>';
      h += '</div><div>';
    }
    if (doc.data.note) h += '<div style="margin-top:8px"><b>Notes:</b> ' + esc(doc.data.note) + '</div>';
    const sc = doc.data.scope;
    if (sc && !wb && (sc.inc.length || sc.exc.length)) h += '<div style="margin-top:14px;font-size:10.5px;color:' + mute + ';line-height:1.6">' +
      (sc.inc.length ? '<b style="color:#1E7B4F">Included:</b> ' + sc.inc.map(esc).join(', ') : '') + (sc.inc.length && sc.exc.length ? ' &nbsp;·&nbsp; ' : '') +
      (sc.exc.length ? '<b style="color:#B3261E">Not included:</b> ' + sc.exc.map(esc).join(', ') : '') + '</div>';
    const fillT = s => s.replace(/\{(valid|until|date)\}/gi, doc.until || '').replace(/\{days\}/gi, String(c.estDays || 14));
    const terms = fillT(String(doc.data.terms || '')).split(/\n|(?<=\.)\s+(?=[A-Z])/).map(x => x.trim()).filter(Boolean);
    if (terms.length && !wb) h += '<div style="margin-top:10px;font-size:10px;color:' + mute + ';line-height:1.55"><b>Terms</b><br>' + terms.map(x => '&bull; ' + esc(x)).join('<br>') + '</div>';
    const wm = parseFloat(c.warranty) || 0, fd = parseFloat(c.fixDays) || 0;
    if (inv && (wm > 0 || fd > 0)) h += h3('OUR PROMISE') + '<div style="font-size:10.5px;line-height:1.5">' + (wm > 0 ? '<b>Warranty: ' + wm + ' month' + (wm === 1 ? '' : 's') + '</b> on our workmanship from the day the work is finished. ' : '') + (fd > 0 ? 'Please report any problem within <b>' + fd + ' day' + (fd === 1 ? '' : 's') + '</b> of handover so we can fix it quickly.' : '') + '</div>';
    if (!wb) h += '</div></div>';
    if (!inv && !wb) h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:26px;font-size:10.5px;color:' + mute + ';text-align:center"><div style="border-top:1px solid #999;padding-top:4px">Client name, signature &amp; date</div><div style="border-top:1px solid #999;padding-top:4px">For ' + esc(bizName()) + '</div></div>';
    h += '<div style="margin-top:12px;text-align:center;font-size:9.5px;color:#9AA5B1">' + POWERED + '</div></div>';
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
    if (KL.jobBtn) acts += KL.jobBtn(doc);
    const rms = (doc.data.rooms || []);
    const mine = rms.length && cfg().showRooms !== 'Yes' ? '<details class="card small" style="margin:0 0 8px"><summary><b>Your measurements</b> (the client does not see these)</summary>' + rms.map(r => '<div class="row between" style="padding:2px 0"><span>' + esc(r.n || '') + ' · ' + esc(r.t || 'PB') + (r.fr === 'wood' ? ' on wood' : '') + (r.c ? ' + cornice' : '') + '</span><span>' + esc(r.size || '') + ' · <b>' + (r.m2 !== undefined ? r.m2 : r2((+r.l || 0) * (+r.w || 0))) + ' m²</b></span></div>').join('') + '</details>' : '';
    sheet('<h2>' + T[t] + ' ' + esc(doc.no) + ' <span class="badge ' + st[1] + '">' + st[0] + '</span></h2>' + mine + paperHTML(doc, false) +
      '<div style="display:grid;gap:8px;margin-top:12px">' + acts +
      '<button class="btn primary block" style="background:#16A34A;border-color:#16A34A" data-act="dShare">Send PDF on WhatsApp</button>' +
      '<div class="row"><button class="btn grow" data-act="dPrint">Print / PDF</button><button class="btn grow" data-act="dWa">Send as text</button></div>' +
      (t === 'INV' && KL.smallPrint ? '<button class="btn block" style="margin-top:8px" data-act="spDoc">🖨 Small receipt printer</button>' : '') +
      (isOwner() ? '<button class="btn danger block" data-act="dDel">Delete</button>' : '') + '</div>');
    setTimeout(() => { pdfReady(doc).catch(() => {}); }, 500);
  }
  function remaining(inv) {
    const done = inv.delivered || {};
    return (inv.data.items || []).map(i => ({ p: i.p, q: r2(Math.max(0, i.q - (done[i.p] || 0))) }));
  }

  /* ---------- the editor ---------- */
  const scopeList = () => String(cfg().scopeList || 'Ceiling, Skimming, Painting, Electricals, POP').split(',').map(x => x.trim()).filter(Boolean).slice(0, 15);
  function scopeHTML(e) {
    if (e.type === 'WB' || !build()) return '';
    const inc = e.scope ? e.scope.inc : (e.no ? [] : scopeList().slice(0, 2));
    return '<div class="card" style="padding:12px;margin-top:10px"><b>What this price covers</b><p class="small muted" style="margin:2px 0 6px">Ticked = included. Not ticked = printed as not included.</p><div style="display:flex;flex-wrap:wrap;gap:6px 14px">' +
      scopeList().map(s => '<label style="margin:0;display:flex;align-items:center;gap:6px;font-weight:600"><input data-sc="' + esc(s) + '" type="checkbox" style="width:auto;min-height:0"' + (inc.some(x => kk(x) === kk(s)) ? ' checked' : '') + '> ' + esc(s) + '</label>').join('') + '</div></div>';
  }
  function blank(type) {
    const c = cfg();
    return { type, no: '', customer: '', phone: '', location: '', title: '', from: '', items: [], terms: type === 'INV' ? (c.invTerms || '') : type === 'WB' ? '' : (c.estTerms || ''), note: '', vehicle: '', driver: '', dest: '', cash: '', momo: '', rooms: null, trans: '', disc: '', discPct: false, tax: false, clientMat: false };
  }
  ACT.dNew = d => { D.edit = Object.assign(blank(d.k || D.type), d.pre || {}); editSheet(); };
  ACT.dEdit = () => { const v = D.view; D.edit = Object.assign(blank(v.type), { no: v.no, customer: v.customer, phone: v.phone, location: v.location, title: v.title, from: v.from, items: (v.data.items || []).map(i => Object.assign({}, i)), terms: v.data.terms || '', note: v.data.note || '', vehicle: v.data.vehicle || '', driver: v.data.driver || '', dest: v.data.dest || '', rooms: v.data.rooms || null, scope: v.data.scope || null, pplan: planCustom(v) }, adjOf(v)); editSheet(); };
  ACT.dConvert = d => {
    const v = D.view, k = d.k;
    const e = Object.assign(blank(k), { customer: v.customer, phone: v.phone, location: v.location, title: v.title, from: v.no, items: (v.data.items || []).map(i => Object.assign({}, i)), rooms: v.data.rooms || null, scope: v.data.scope || null }, k === 'WB' ? {} : adjOf(v));
    if (k === 'WB') { e.items = remaining(v).filter(i => i.q > 0); e.dest = v.location; }
    else if (k === 'INV' && v.type === 'EST') e.terms = cfg().invTerms || '';
    D.edit = e; editSheet();
  };

  function adjOf(v) { const a = (v.data && v.data.adj) || {}; return { trans: a.trans || '', disc: a.disc || '', discPct: !!a.discPct, tax: !!a.tax, clientMat: !!a.clientMat }; }
  function products() { return ((S.lists && S.lists.products) || (S.cache && S.cache.products) || []); }
  function priceOf(name) { const p = products().find(x => kk(x.name) === kk(name)); return p ? p.price : null; }

  function editSheet() {
    const e = D.edit, wb = e.type === 'WB', showLab = build() && !wb, custs = KL.derived().customers.filter(c => kk(c.name) !== kk(KL.WALKIN));
    sheet('<h2>' + (e.no ? 'Edit ' + esc(e.no) : 'New ' + T[e.type].toLowerCase()) + '</h2>' +
      (e.from ? '<p class="small muted" style="margin:0">From ' + esc(e.from) + '</p>' : '') +
      '<label>Customer</label><input id="dc" list="dcl" value="' + esc(e.customer) + '" autocomplete="off" placeholder="Name"><datalist id="dcl">' + custs.map(c => '<option value="' + esc(c.name) + '">').join('') + '</datalist>' +
      '<div class="picker"><div><label>Phone</label><input id="dp" inputmode="tel" value="' + esc(e.phone) + '"></div><div><label>' + (wb ? 'Deliver to' : 'Location') + '</label><input id="dl" value="' + esc(wb ? (e.dest || e.location) : e.location) + '"></div></div>' +
      (wb ? '' : '<label>Job / title (optional)</label><input id="dt" value="' + esc(e.title) + '" placeholder="Example: 3 rooms plasterboard ceiling">') +
      '<h3 style="margin:14px 0 4px">Items</h3><datalist id="dpl">' + products().map(p => '<option value="' + esc(p.name) + '">').join('') + '</datalist>' +
      (e.items.some(i => !(showLab && i.l)) ? e.items.map((i, n) => (showLab && i.l) ? '' : '<div class="card" style="padding:10px;margin:6px 0"><input data-di="p" data-n="' + n + '" list="dpl" value="' + esc(i.p) + '" placeholder="Item">' +
        '<div class="row" style="margin-top:6px"><div class="grow"><label style="margin:0">Qty</label><input data-di="q" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(i.q) + '"></div>' +
        '<div style="width:72px"><label style="margin:0">Unit</label><input data-di="un" data-n="' + n + '" value="' + esc(i.un || '') + '" placeholder="pcs"></div>' +
        (wb ? '' : '<div class="grow"><label style="margin:0">Price</label><input data-di="u" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(i.u) + '"></div>') +
        '<button class="btn sm danger" data-act="dDelLine" data-n="' + n + '" style="align-self:flex-end" aria-label="Remove line">✕</button></div>' +
        '</div>').join('') : '<p class="small muted">No items yet.</p>') +
      '<div class="row" style="gap:8px"><button class="btn sm grow" data-act="dAddLine">+ Add item</button>' + (wb || (KL.hasMod && !KL.hasMod('est')) ? '' : '<button class="btn sm violet grow" data-act="dEstimator">Estimator</button>') + '</div>' +
      (showLab ? '<div class="card" style="padding:12px;margin-top:10px"><b>Labour / workmanship</b><div id="lab-blk">' + labourInner(e) + '</div></div>' : '') +
      (wb ? '<div class="picker"><div><label>Vehicle number</label><input id="dv" value="' + esc(e.vehicle) + '" placeholder="GT 4512-22"></div><div><label>Driver (name, phone)</label><input id="dd" value="' + esc(e.driver) + '"></div></div>' :
        '<div class="card" style="padding:12px;margin-top:10px"><b>' + (build() ? 'Transport, discount' : 'Discount') + (useTax() ? ' and tax' : '') + '</b>' +
        '<div class="picker">' + (build() ? '<div><label>Transport (GH₵)</label><input id="dtr" type="number" inputmode="decimal" value="' + esc(e.trans) + '" placeholder="0"></div>' : '') +
        '<div><label>Discount</label><div class="row" style="gap:6px"><input id="ddi" type="number" inputmode="decimal" value="' + esc(e.disc) + '" placeholder="0"><select id="ddp" style="width:78px"><option value="">GH₵</option><option value="1"' + (e.discPct ? ' selected' : '') + '>%</option></select></div></div></div>' +
        (!useTax() ? '' : '<label style="display:flex;align-items:center;gap:8px;font-weight:600;margin-top:10px"><input id="dtx" type="checkbox" style="width:auto;min-height:0"' + (e.tax ? ' checked' : '') + '> Add tax (VAT ' + (cfg().taxVat || 15) + '% + NHIL ' + (cfg().taxNhil || 2.5) + '% + GETFund ' + (cfg().taxGet || 2.5) + '%)</label>') +
        (!build() ? '' : '<label style="display:flex;align-items:center;gap:8px;font-weight:600;margin-top:6px"><input id="dcm" type="checkbox" style="width:auto;min-height:0"' + (e.clientMat ? ' checked' : '') + '> Client buys the materials (we charge labour only)</label>') +
        '<div id="dtot" style="margin-top:10px">' + totalsHTML(e) + '</div></div>') +
      (e.type === 'INV' && !e.no ? '<div class="picker"><div><label>Paid now: cash</label><input id="dcash" type="number" inputmode="decimal" value="' + esc(e.cash) + '" placeholder="0"></div><div><label>Paid now: MoMo</label><input id="dmomo" type="number" inputmode="decimal" value="' + esc(e.momo) + '" placeholder="0"></div></div>' : '') +
      (e.type === 'INV' || wb || !build() ? '' : planCard(e)) +
      scopeHTML(e) +
      (wb ? '' : '<label>Terms</label><textarea id="dterms" rows="3" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(e.terms) + '</textarea>') +
      '<label>Note (optional)</label><input id="dnote" value="' + esc(e.note) + '">' +
      '<br><button class="btn primary block" data-act="dPreview">Preview</button>');
    if (showLab && !D.rules && !D.rulesTried) { D.rulesTried = true; getRules().then(() => { if (D.edit && $('#lab-blk')) $('#lab-blk').innerHTML = labourInner(D.edit); }).catch(() => {}); }
  }
  function totalsHTML(e) {
    const m = docMoney(e.items, e), L = (a, b, c) => '<div class="row between small" style="padding:2px 0' + (c ? ';' + c : '') + '"><span>' + a + '</span><b>' + b + '</b></div>';
    return L(e.clientMat ? 'Materials (client buys, not charged)' : 'Materials', money(m.mat), e.clientMat ? 'color:var(--mute)' : '') + (m.trans ? L('Transport', money(m.trans)) : '') + (m.lab || build() ? L('Labour', money(m.lab)) : '') +
      (m.disc ? L('Discount', '- ' + money(m.disc), 'color:var(--red)') : '') + m.taxes.map(t => L(t.n + ' ' + t.r + '%', money(t.a))).join('') +
      '<div class="row between" style="margin-top:6px;font-size:17px"><b>Total</b><b>' + money(m.total) + '</b></div>';
  }
  function readExtras() {
    const e = D.edit; if (!e) return;
    if ($('#dtr')) e.trans = $('#dtr').value; if ($('#ddi')) e.disc = $('#ddi').value; if ($('#ddp')) e.discPct = !!$('#ddp').value;
    if ($('#dtx')) e.tax = $('#dtx').checked; if ($('#dcm')) e.clientMat = $('#dcm').checked;
  }
  function readEdit() {
    const e = D.edit; if (!e || !$('#dc')) return;
    e.customer = $('#dc').value.trim(); e.phone = $('#dp').value.trim();
    if (e.type === 'WB') e.dest = $('#dl').value.trim(); else e.location = $('#dl').value.trim();
    if ($('#dt')) e.title = $('#dt').value.trim();
    if ($('#dv')) e.vehicle = $('#dv').value.trim(); if ($('#dd')) e.driver = $('#dd').value.trim();
    if ($('#dterms')) e.terms = $('#dterms').value; e.note = $('#dnote').value.trim();
    if ($('#dcash')) e.cash = $('#dcash').value; if ($('#dmomo')) e.momo = $('#dmomo').value;
    document.querySelectorAll('[data-di]').forEach(el => { const i = e.items[+el.dataset.n]; if (!i) return; const k = el.dataset.di; i[k] = k === 'l' ? (el.checked ? 1 : 0) : (k === 'p' || k === 'un') ? el.value : el.value === '' ? '' : +el.value; });
    if (document.querySelector('[data-sc]')) { const inc = [], exc = []; document.querySelectorAll('[data-sc]').forEach(el => (el.checked ? inc : exc).push(el.dataset.sc)); e.scope = { inc, exc }; }
    readExtras();
    if ($('#dpp-show')) {
      const show = $('#dpp-show').checked, ls = document.querySelectorAll('[data-ppl]'), ps = document.querySelectorAll('[data-ppp]');
      const stages = ls.length ? Array.from(ls).map((el, k) => ({ l: el.value.trim() || 'Payment ' + (k + 1), p: +ps[k].value || 0 })) : (e.pplan ? e.pplan.stages : ppDefaults(e.clientMat));
      e.pplan = { show, stages, auto: show && JSON.stringify(stages) === JSON.stringify(ppDefaults(e.clientMat)) };
    }
  }
  ACT.dPPn = d => { readEdit(); D.edit.pplan = { show: true, stages: ppPreset(+d.n), auto: false }; editSheet(); };
  document.addEventListener('change', ev => {
    if (!D.edit) return; const id = ev.target.id;
    if (id === 'dpp-show') { readEdit(); editSheet(); }
    else if (id === 'dcm' && D.edit.pplan && D.edit.pplan.auto) { const sh = D.edit.pplan.show; readEdit(); D.edit.pplan = { show: sh, stages: ppDefaults(D.edit.clientMat), auto: true }; editSheet(); }
  });
  document.addEventListener('input', ev => {
    if (D.edit && ev.target.dataset && ev.target.dataset.ppp !== undefined) { const el = $('#pp-sum'); if (el) el.innerHTML = ppSumHTML(Array.from(document.querySelectorAll('[data-ppp]')).reduce((a, x) => a + (+x.value || 0), 0)); }
  });
  const live = () => { const el = $('#dtot'); if (el && D.edit) el.innerHTML = totalsHTML(D.edit); };
  ['input', 'change'].forEach(evn => document.addEventListener(evn, ev => { if (D.edit && ['dtr', 'ddi', 'ddp', 'dtx', 'dcm'].indexOf(ev.target.id) >= 0) { readExtras(); live(); } }));
  document.addEventListener('change', ev => { const t = ev.target; if (D.edit && t.dataset && t.dataset.di === 'l') { const i = D.edit.items[+t.dataset.n]; if (i) i.l = t.checked ? 1 : 0; live(); } });
  document.addEventListener('input', ev => {
    const t = ev.target; if (!t.dataset || t.dataset.di === undefined || t.dataset.di === 'l' || !D.edit) return;
    const i = D.edit.items[+t.dataset.n]; if (!i) return;
    if (t.dataset.di === 'p') { i.p = t.value; const pr = priceOf(t.value); if (pr !== null && D.edit.type !== 'WB') { i.u = pr; const u = document.querySelector('[data-di="u"][data-n="' + t.dataset.n + '"]'); if (u) u.value = pr; } }
    else if (t.dataset.di === 'un') i.un = t.value;
    else i[t.dataset.di] = t.value === '' ? '' : +t.value;
    live();
  });
  /* ---------- the labour section: each kind of labour is its own line, switched on and off with a tick ---------- */
  const LABJ = [['lab_struct', 'Structure works', 'm²'], ['lab_skim', 'Plasterboard skimming', 'm²'], ['lab_gen', 'General labour', 'm²'], ['lab_ac', 'Acoustic ceiling fixing', 'm²'], ['lab_pop', 'POP ceiling', 'm²'], ['lab_popc', 'POP cornice fixing', 'm'], ['lab_cornice', 'Cornice fixing (piece)', 'pcs'], ['lab_pt', 'Partition works', 'm²'], ['lab_paint', 'Painting', 'm²']];
  const labTypes = () => { const R = D.rules || {}; return LABJ.map(x => ({ key: x[0], nm: String(R[x[0] + '_item'] || x[1]), rate: +R[x[0] + '_rate'] || 0, un: x[2] })); };
  function labourInner(e) {
    const types = labTypes(), names = types.map(t => kk(t.nm));
    let h = '<p class="small muted" style="margin:2px 0 6px">Tick the labour you are charging. Each one prints as its own line, apart from the materials and the transport.</p>';
    types.forEach(t => {
      const idx = e.items.findIndex(i => i.l && kk(i.p) === kk(t.nm)), it = idx >= 0 ? e.items[idx] : null;
      h += '<div style="padding:6px 0;border-bottom:1px solid var(--line)"><label style="margin:0;display:flex;align-items:center;gap:8px;font-weight:600"><input data-lb="' + esc(t.key) + '" type="checkbox" style="width:auto;min-height:0"' + (it ? ' checked' : '') + '> ' + esc(t.nm) + '</label>' +
        (it ? '<label style="margin:8px 0 0">How do you charge it?</label><select data-lump="' + esc(t.key) + '"><option value="">Per ' + esc(t.un) + ' (area × rate)</option><option value="1"' + (it.un === 'lump' ? ' selected' : '') + '>One price for the whole job</option></select>' +
          '<div class="row" style="margin-top:6px;gap:8px">' + (it.un === 'lump' ? '' : '<div class="grow"><label style="margin:0">Area / qty (' + esc(it.un || t.un) + ')</label><input data-di="q" data-n="' + idx + '" type="number" inputmode="decimal" value="' + esc(it.q) + '" placeholder="0"></div>') +
          '<div class="grow"><label style="margin:0">' + (it.un === 'lump' ? 'Amount (GH₵)' : 'Rate (GH₵)') + '</label><input data-di="u" data-n="' + idx + '" type="number" inputmode="decimal" value="' + esc(it.u) + '" placeholder="0"></div></div>' : '') + '</div>';
    });
    e.items.forEach((i, n) => {   // other labour lines, for example ones typed by hand
      if (!i.l || names.indexOf(kk(i.p)) >= 0) return;
      h += '<div class="card" style="padding:10px;margin:8px 0 0"><input data-di="p" data-n="' + n + '" value="' + esc(i.p) + '" placeholder="Other labour, for example Painting of doors">' +
        '<div class="row" style="margin-top:6px"><div class="grow"><label style="margin:0">Qty</label><input data-di="q" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(i.q) + '"></div>' +
        '<div style="width:72px"><label style="margin:0">Unit</label><input data-di="un" data-n="' + n + '" value="' + esc(i.un || '') + '" placeholder="m²"></div>' +
        '<div class="grow"><label style="margin:0">Rate</label><input data-di="u" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(i.u) + '"></div>' +
        '<button class="btn sm danger" data-act="dDelLab" data-n="' + n + '" style="align-self:flex-end" aria-label="Remove line">✕</button></div></div>';
    });
    return h + '<button class="btn sm block" data-act="dAddLab" style="margin-top:8px">+ Other labour</button>';
  }
  const labRefresh = () => { const el = $('#lab-blk'); if (el && D.edit) el.innerHTML = labourInner(D.edit); live(); };
  document.addEventListener('change', ev => {
    const t = ev.target; if (!D.edit || !t.dataset) return;
    if (t.dataset.lump !== undefined) {
      readEdit(); const ty2 = labTypes().find(x => x.key === t.dataset.lump); const ix = ty2 ? D.edit.items.findIndex(x => x.l && kk(x.p) === kk(ty2.nm)) : -1;
      if (ix >= 0) { if (t.value === '1') { D.edit.items[ix].un = 'lump'; D.edit.items[ix].q = 1; D.edit.items[ix].u = ''; } else { D.edit.items[ix].un = ty2.un; D.edit.items[ix].q = ''; D.edit.items[ix].u = ty2.rate || ''; } labRefresh(); }
      return;
    }
    if (t.dataset.lb === undefined) return;
    readEdit(); const ty = labTypes().find(x => x.key === t.dataset.lb); if (!ty) return;
    const idx = D.edit.items.findIndex(i => i.l && kk(i.p) === kk(ty.nm));
    if (t.checked && idx < 0) D.edit.items.push({ p: ty.nm, q: '', u: ty.rate || '', un: ty.un, l: 1 });
    else if (!t.checked && idx >= 0) D.edit.items.splice(idx, 1);
    labRefresh();
  });
  ACT.dAddLab = () => { readEdit(); D.edit.items.push({ p: '', q: 1, u: 0, l: 1 }); labRefresh(); };
  ACT.dDelLab = d => { readEdit(); D.edit.items.splice(+d.n, 1); labRefresh(); };
  ACT.dAddLine = () => { readEdit(); D.edit.items.push({ p: '', q: 1, u: 0 }); editSheet(); };
  ACT.dDelLine = d => { readEdit(); D.edit.items.splice(+d.n, 1); editSheet(); };

  /* ---------- preview before saving ---------- */
  ACT.dPreview = () => {
    readEdit(); const e = D.edit;
    if (!e.customer) { toast('Enter the customer'); return; }
    e.items = e.items.filter(i => String(i.p || '').trim());
    if (!e.items.length) { toast('Add at least one item'); editSheet(); return; }
    const bl = e.items.find(i => i.l && !(+i.q > 0)); if (bl) { toast('Type the area for ' + bl.p + ', or untick it'); return; }
    if (e.pplan && e.pplan.show && build() && e.type !== 'INV' && e.type !== 'WB') { const sm = e.pplan.stages.reduce((a, x) => a + (+x.p || 0), 0); if (Math.abs(sm - 100) > 0.01 || e.pplan.stages.some(x => !(+x.p > 0))) { toast('Payment plan: the percentages must add up to 100'); return; } }
    // a new item typed by hand: offer once to keep it in the product list (owner only, with internet)
    if (S.session && S.session.role === 'admin' && navigator.onLine && e.type !== 'WB') {
      const known = products().map(p => kk(p.name)), asked = (D.askedNew = D.askedNew || {});
      const fresh = e.items.filter(i => !i.l && +i.u > 0 && known.indexOf(kk(i.p)) < 0 && !asked[kk(i.p)]);
      if (fresh.length) {
        fresh.forEach(i => { asked[kk(i.p)] = 1; });
        if (confirm('Save ' + (fresh.length === 1 ? '"' + fresh[0].p + '"' : fresh.length + ' new items (' + fresh.map(i => i.p).join(', ') + ')') + ' to your product list, so next time ' + (fresh.length === 1 ? 'it is' : 'they are') + ' there with the price?')) {
          Promise.all(fresh.map(i => api('admin', { op: 'saveProduct', name: String(i.p).trim(), price: +i.u, unit: i.un || '' }).catch(() => null)))
            .then(rs => { const last = rs.filter(r => r && r.ok && r.lists).pop(); if (last) { S.lists = last.lists; KL.kvSet('lists', last.lists).catch(() => {}); } toast('Saved to your product list'); });
        }
      }
    }
    if (e.items.some(i => !(+i.q > 0) || (e.type !== 'WB' && !(+i.u >= 0)))) { toast('Check quantities and prices'); editSheet(); return; }
    const total = e.type === 'WB' ? 0 : docMoney(e.items, e).total, paid = r2((+e.cash || 0) + (+e.momo || 0));
    if (e.type === 'INV' && paid > total + 0.001) { toast('Paid is more than the total'); editSheet(); return; }
    const doc = { type: e.type, no: e.no || 'New', date: today(), customer: e.customer, phone: e.phone, location: e.location, title: e.title, from: e.from, paid, data: { items: e.items, terms: e.terms, note: e.note, vehicle: e.vehicle, driver: e.driver, dest: e.dest, rooms: e.rooms, scope: scopeOut(e), adj: { trans: +e.trans || 0, disc: +e.disc || 0, discPct: e.discPct, tax: e.tax, clientMat: e.clientMat } } };
    sheet('<h2>Check before saving</h2><p class="small muted" style="margin-top:0">This is exactly what your customer will see.</p>' + paperHTML(doc, true) +
      '<div class="row" style="margin-top:12px"><button class="btn grow" data-act="dBack">Edit</button><button class="btn primary grow" data-act="dSave">Confirm and save</button></div>');
  };
  ACT.dBack = () => editSheet();
  ACT.dSave = async (d, btn) => {
    const e = D.edit; if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    let iv; const t0 = Date.now();
    try {
      if (btn) iv = setInterval(() => { btn.textContent = 'Saving… ' + Math.round((Date.now() - t0) / 1000) + 's'; }, 1000);
      const r = await api('docs', { op: 'save', type: e.type, no: e.no, customer: e.customer, phone: e.phone, location: e.location, title: e.title, from: e.from, items: e.items, terms: e.terms, note: e.note, vehicle: e.vehicle, driver: e.driver, dest: e.dest, rooms: e.rooms, scope: scopeOut(e), cash: +e.cash || 0, momo: +e.momo || 0, trans: +e.trans || 0, disc: +e.disc || 0, discPct: e.discPct, tax: e.tax, clientMat: e.clientMat });
      clearInterval(iv);
      if (!r.ok) { toast(errText(r.error)); if (btn) { btn.disabled = false; btn.textContent = 'Confirm and save'; } return; }
      { const so = scopeOut(e); ppSaveLocal(r.doc.no, so && so.pplan ? so.pplan : null); }
      toast(T[e.type] + ' ' + r.doc.no + ' saved' + (Date.now() - t0 > 5000 ? ' (server took ' + Math.round((Date.now() - t0) / 1000) + 's)' : '')); D.edit = null; D.type = r.doc.type;
      D.list = (D.list || []).filter(x => x.no !== r.doc.no); D.list.unshift(r.doc);   // show the saved document at once; the list refreshes behind it
      viewSheet(r.doc); loadDocs().catch(() => {});
      if (e.type === 'INV') KL.refreshCache();
    } catch (err) { clearInterval(iv); toast('Needs internet to save'); if (btn) { btn.disabled = false; btn.textContent = 'Confirm and save'; } }
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

  /* ---------- a real PDF made inside the app, shared straight to WhatsApp (no print screen, no saving first) ---------- */
  function pdfFromJpegs(pages) {
    const A4W = 595.28, A4H = 841.89, enc = s => new TextEncoder().encode(s), parts = [], offs = []; let len = 0;
    const put = d => { const b = typeof d === 'string' ? enc(d) : d; parts.push(b); len += b.length; };
    const obj = (n, d) => { offs[n] = len; put(n + ' 0 obj\n' + d + '\nendobj\n'); };
    const strm = (n, dict, bytes) => { offs[n] = len; put(n + ' 0 obj\n<< ' + dict + ' /Length ' + bytes.length + ' >>\nstream\n'); put(bytes); put('\nendstream\nendobj\n'); };
    put('%PDF-1.4\n');
    const kids = pages.map((_, k) => (3 + k * 3) + ' 0 R').join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>');
    pages.forEach((pg, k) => {
      const pid = 3 + k * 3, cid = pid + 1, iid = pid + 2, s = Math.min(A4W / pg.w, A4H / pg.h), w = pg.w * s, h = pg.h * s, x = (A4W - w) / 2, y = A4H - h;
      obj(pid, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4W + ' ' + A4H + '] /Resources << /XObject << /Im' + k + ' ' + iid + ' 0 R >> >> /Contents ' + cid + ' 0 R >>');
      const c = 'q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im' + k + ' Do Q';
      strm(cid, '', enc(c));
      strm(iid, '/Type /XObject /Subtype /Image /Width ' + pg.w + ' /Height ' + pg.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode', pg.bytes);
    });
    const N = 2 + pages.length * 3, xr = len;
    put('xref\n0 ' + (N + 1) + '\n0000000000 65535 f \n');
    for (let n = 1; n <= N; n++) put(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
    put('trailer\n<< /Size ' + (N + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF');
    return new Blob(parts, { type: 'application/pdf' });
  }
  async function paperCanvas(doc) {
    const W = 760, host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + W + 'px;background:#fff';
    host.innerHTML = paperHTML(doc, false); document.body.appendChild(host);
    try {
      const pp = host.querySelector('.paper'); pp.style.border = '0'; pp.style.borderRadius = '0'; pp.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
      const H = Math.ceil(pp.scrollHeight) + 4, xml = new XMLSerializer().serializeToString(pp);
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><foreignObject width="100%" height="100%">' + xml + '</foreignObject></svg>';
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
      const sc = 2, cv = document.createElement('canvas'); cv.width = W * sc; cv.height = H * sc;
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.scale(sc, sc); g.drawImage(img, 0, 0);
      return cv;
    } finally { host.remove(); }
  }
  async function makePdfFile(doc) {
    const cv = await paperCanvas(doc), pageH = Math.round(cv.width * 841.89 / 595.28), slices = [];
    if (cv.height <= pageH * 1.12) slices.push([0, cv.height]);
    else for (let y = 0; y < cv.height; y += pageH) slices.push([y, Math.min(pageH, cv.height - y)]);
    const pages = [];
    for (const [y, h] of slices) {
      const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = h; const g = c2.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c2.width, h); g.drawImage(cv, 0, y, cv.width, h, 0, 0, cv.width, h);
      const blob = await new Promise(r => c2.toBlob(r, 'image/jpeg', 0.88));
      pages.push({ bytes: new Uint8Array(await blob.arrayBuffer()), w: c2.width, h });
    }
    const name = (T[doc.type] || 'Document') + '-' + doc.no + '-' + String(doc.customer || '').replace(/[^A-Za-z0-9]+/g, '-').slice(0, 24) + '.pdf';
    return new File([pdfFromJpegs(pages)], name, { type: 'application/pdf' });
  }
  const pdfKey = v => [v.type, v.no, v.total, v.paid || 0, v.status || '', JSON.stringify(v.data || {}).length].join('|');
  function pdfReady(v) {
    const k = pdfKey(v); D.pdf = D.pdf || {};
    if (D.pdf.key === k && D.pdf.p) return D.pdf.p;
    D.pdf = { key: k, p: makePdfFile(v) }; D.pdf.p.catch(() => { if (D.pdf && D.pdf.key === k) D.pdf = null; });
    return D.pdf.p;
  }
  ACT.dShare = async (d, btn) => {
    const v = D.view; if (!v) return;
    const lab = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = 'Preparing PDF…'; }
    try {
      const file = await pdfReady(v);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: bizName() + ' ' + (T[v.type] || '') + ' ' + v.no }); }
        catch (e) { if (e && e.name === 'AbortError') return; if (e && e.name === 'NotAllowedError') { toast('PDF is ready. Tap the button again to send it.'); return; } throw e; }
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
        toast('PDF downloaded. Attach it in WhatsApp.');
        let n = String(v.phone || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1);
        if (n) setTimeout(() => window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(bizName() + ' - ' + (T[v.type] || '') + ' ' + v.no), '_blank', 'noopener'), 900);
      }
    } catch (e) { toast('Could not make the PDF on this device. Use Print / PDF.'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = lab; } }
  };


  /* ---------- print / PDF and WhatsApp ---------- */
  ACT.dPrint = () => {
    const v = D.view; let host = $('#printdoc'); if (host) host.remove();
    host = document.createElement('div'); host.id = 'printdoc'; host.innerHTML = paperHTML(v, false); document.body.appendChild(host);
    host.style.cssText = 'display:block;position:absolute;left:-9999px;top:0;width:194mm';
    const pp = host.querySelector('.paper'); if (pp) pp.style.zoom = '';
    const avail = 281 * 96 / 25.4 - 4, hgt = pp ? pp.scrollHeight : 0;
    if (pp && hgt > avail && v.type !== 'WB') pp.style.zoom = String(Math.max(0.72, Math.floor(avail / hgt * 100) / 100));
    host.style.cssText = '';
    if (!$('#printcss2')) { const st = document.createElement('style'); st.id = 'printcss2'; st.textContent = '#printdoc{display:none}@media print{body>*:not(#printdoc){display:none!important}#printdoc{display:block!important;padding:0}#printdoc .paper{border:0!important;border-radius:0!important;padding:0!important}#printdoc .paper *{-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{background:#fff!important}@page{size:A4;margin:8mm}}'; document.head.appendChild(st); }
    document.title = T[v.type] + ' ' + v.no + ' - ' + v.customer;
    setTimeout(() => { window.print(); document.title = bizName(); }, 80);
    toast('Choose "Save as PDF" to keep a PDF');
  };
  ACT.dWa = () => {
    const v = D.view, items = v.data.items || [], wb = v.type === 'WB';
    const lines = [bizName() + ' - ' + T[v.type] + ' ' + v.no, v.date, (wb ? 'Deliver to: ' : 'Customer: ') + v.customer, ''].concat(items.map(i => '- ' + i.q + ' x ' + i.p + (wb ? '' : ' @ ' + r2(i.u).toFixed(2) + ' = ' + r2(i.q * i.u).toFixed(2))));
    if (!wb) { const mm = docMoney(items, v.data.adj); if (mm.trans) lines.push('Transport: ' + money(mm.trans)); if (mm.disc) lines.push('Discount: -' + money(mm.disc)); mm.taxes.forEach(t => lines.push(t.n + ' ' + t.r + '%: ' + money(t.a))); lines.push('', 'Total: ' + money(v.total)); if (v.type === 'INV') { lines.push('Paid: ' + money(v.paid || 0)); const b = r2(v.total - (v.paid || 0)); lines.push(b > 0.004 ? 'Balance: ' + money(b) : 'Fully paid'); } if (cfg().momo) lines.push('', 'Pay by MoMo: ' + cfg().momo + (cfg().momoName ? ' (' + cfg().momoName + ')' : '')); }
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
  KL.docs = { state: D, load: loadDocs, status: status, open: no => { const d = findDoc(no); if (d) viewSheet(d); } };
  // a room or wall: rectangle, L-shape (minus the cut-out corner) or your own m²; partitions are walls (length x height, minus doors)
  function areaOf(r) { return r.t === 'PT' ? 0 : geom(r).area; }
  const ceilOf = r => r.t === 'PT' || r.t === 'PNT' ? 0 : geom(r).area;
  function perimOf(r) { if (r.t === 'PT') return 0; return r.s === 'X' ? 4 * Math.sqrt(Math.max(0, +r.a || 0)) : 2 * ((+r.l || 0) + (+r.w || 0)); }
  function wallOf(r, R) { const h = +r.h || +R.pt_height || 3; return Math.max(0, (+r.l || 0) * h - (Math.round(+r.d || 0)) * (+R.pt_door_w || 0.9) * (+R.pt_door_h || 2.1)); }
  function sizeText(r, R) {
    if (r.t === 'PT') return (+r.l || 0) + ' x ' + (+r.h || +R.pt_height || 3) + ' m' + (+r.d ? ', ' + r.d + ' door' + (+r.d === 1 ? '' : 's') : '');
    if (r.s === 'X') return 'own m²';
    return (+r.l || 0) + ' x ' + (+r.w || 0) + ' m' + (r.s === 'L' ? ' less ' + (+r.cl || 0) + ' x ' + (+r.cw || 0) : '');
  }
  const TYPE = { PB: 'Plasterboard', AC: 'Acoustic', POP: 'POP', PT: 'Partition wall', PNT: 'Painting only' };
  // painting on a room: '' none, C ceiling, W walls, CW ceiling + walls (old estimates used p: true = ceiling)
  const pmOf = r => r.pm !== undefined ? r.pm : r.p ? 'C' : (r.t === 'PNT' ? 'CW' : '');
  const PM = { '': 'No painting', C: 'Ceiling only', W: 'Walls only', CW: 'Ceiling + walls' };
  function paintOf(r, R) {
    const m = pmOf(r); if (!m || r.t === 'PT') return { ceil: 0, wall: 0 };
    const g = geom(r), h = +r.wh || +R.paint_wall_h || 3;
    const wall = m.indexOf('W') >= 0 ? Math.max(0, g.walls * h - (Math.round(+r.dr || 0)) * (+R.paint_door || 2) - (Math.round(+r.wn || 0)) * (+R.paint_window || 1.5)) : 0;
    return { ceil: m.indexOf('C') >= 0 ? g.area : 0, wall };
  }
  KL.estArea = areaOf;
  // the K-Gabs estimator: ceilings counted room by room; plasterboard on a metal structure or on wood noggings
  function geom(r) {
    const a1 = +r.l || 0, b1 = +r.w || 0; let L = Math.max(a1, b1), W = Math.min(a1, b1), area, walls, fill = 1;
    if (r.s === 'X') { area = Math.max(0, +r.a || 0); L = W = Math.sqrt(area); walls = 4 * L; }
    else if (r.s === 'L') { const cut = Math.min((+r.cl || 0) * (+r.cw || 0), L * W); area = L * W - cut; walls = 2 * (L + W); fill = L * W ? area / (L * W) : 1; }
    else { area = L * W; walls = 2 * (L + W); }
    return { L, W, area: Math.max(0, area), walls: Math.max(0, walls), fill };
  }
  const frameOf = (r, f) => (r.fr || f) === 'wood' ? 'wood' : 'metal';
  function calc(rooms, R, wastePb, wasteAc, lab, frame) {
    const n = k => +R[k] || 0, nn = (k, d) => (R[k] === undefined || R[k] === '' ? d : +R[k]);
    const ceil = x => Math.ceil(r2(x) - 1e-9), out = [];
    const wP = (wastePb === undefined ? n('pb_waste') : +wastePb) / 100, wA = (wasteAc === undefined ? n('ac_waste') : +wasteAc) / 100, wM = n('metal_waste') / 100;
    const sheetA = n('pb_board_m2') || 2.88, sides = Math.max(1, Math.min(2, Math.round(n('pt_sides')) || 2));
    const t = { pb: 0, wood: 0, ac: 0, pop: 0, popCorn: 0, pbMain: 0, pbOmega: 0, pbAngle: 0, pbHang: 0, acMain: 0, acAngle: 0, acHang: 0, angleWalls: 0, corn: 0, paint: 0, paintC: 0, paintW: 0, ptArea: 0, ptBoard: 0, ptStuds: 0, ptTrack: 0, ptIns: 0 };
    (rooms || []).forEach(r => {
      const ty = r.t || 'PB';
      if (ty === 'PT') {
        const L = +r.l || 0; if (!L) return;
        const H = +r.h || n('pt_height') || 3, d = Math.max(0, Math.round(+r.d || 0)), gross = L * H, net = Math.max(0, gross - Math.min(gross, d * (n('pt_door_w') || 0.9) * (n('pt_door_h') || 2.1)));
        const studs = Math.floor(L / (n('pt_stud_space') || 0.6) + 1e-9) + 1 + d * n('pt_door_studs');
        t.ptStuds += studs * Math.max(1, Math.ceil(H / (n('pt_stud_len') || 3) - 1e-9));
        t.ptArea += net; t.ptBoard += net * sides; t.ptTrack += 2 * L; if (r.ins) t.ptIns += net;
        return;
      }
      const g = geom(r); if (!g.area) return;
      { const pa = paintOf(r, R); t.paint += pa.ceil + pa.wall; t.paintC += pa.ceil; t.paintW += pa.wall; }
      if (ty === 'PNT') return;   // painting only: no ceiling materials
      if (ty === 'POP') { t.pop += g.area; if (r.c) t.popCorn += g.walls; return; }
      if (ty === 'PB' && frameOf(r, frame) === 'wood') { t.pb += g.area; t.wood += g.area; }
      else if (ty === 'PB') {
        const lines = Math.max(1, Math.ceil(g.W / (n('pb_main_space') || 1.2)));
        t.pb += g.area; t.pbMain += lines * g.L * g.fill; t.pbOmega += g.area / (n('pb_omega_space') || 0.6);
        t.pbAngle += Math.ceil(g.walls / (n('pb_angle_len') || 3) - 1e-9); t.pbHang += Math.ceil(lines * (Math.ceil(g.L / (n('pb_hanger_space') || 1.2)) + 1) * g.fill); t.angleWalls += g.walls;
      } else {
        const lines = Math.max(1, Math.ceil(g.W / (n('ac_main_space') || 1.2)));
        t.ac += g.area; t.acMain += lines * g.L * g.fill; t.acAngle += Math.ceil(g.walls / (n('ac_angle_len') || 3) - 1e-9);
        t.acHang += Math.ceil(lines * (Math.ceil(g.L / (n('ac_hanger_space') || 1.2)) + 1) * g.fill); t.angleWalls += g.walls;
      }
      if (r.c) t.corn += Math.ceil(g.walls / (n('cornice_len') || 2.4) - 1e-9);
    });
    const add = (item, q, un) => { q = ceil(q); if (q > 0) out.push({ p: String(R[item] || item), q, un: un || 'pcs' }); };
    let sheets = 0;
    if (t.pb) { const q = ceil(t.pb / sheetA * (1 + wP)); sheets += q; add('pb_board_item', q); }
    if (t.ptBoard) { const q = ceil(t.ptBoard / sheetA * (1 + wP)); sheets += q; add('pt_sheet_item', q); }
    if (t.ptArea) { add('pt_stud_item', t.ptStuds * (1 + wM)); add('pt_track_item', t.ptTrack * (1 + wM) / (n('pt_track_len') || 3)); if (t.ptIns) add('pt_ins_item', t.ptIns / (n('pt_ins_cover') || 9.5), 'rolls'); }
    const boardArea = t.pb + t.ptBoard;
    if (boardArea) {
      if (n('pb_screws_per_sheet') && n('pb_screws_per_box')) add('pb_screw_item', sheets * n('pb_screws_per_sheet') / n('pb_screws_per_box'), 'boxes');
      if (n('pb_tape_per_m2') && n('pb_tape_roll')) add('pb_tape_item', boardArea * n('pb_tape_per_m2') / n('pb_tape_roll'), 'rolls');
      add('pb_comp_item', boardArea * n('pb_comp_per_m2') / (n('pb_comp_bag') || 25), 'bags');
    }
    const pbMetal = t.pb - t.wood, pbHang = String(R.pb_hangers || '').toLowerCase() === 'yes';
    const tap = pbMetal * nn('pb_tap_per_m2', 0) + t.ptArea * n('pt_tap_per_m2');
    if (tap > 0 && n('pb_tap_per_box') > 0) add('pb_tap_item', tap / n('pb_tap_per_box'), 'boxes');
    if (pbMetal > 0.001) {
      add('pb_main_item', t.pbMain * (1 + wM) / (n('pb_main_len') || 3));
      add('pb_omega_item', t.pbOmega * (1 + wM) / (n('pb_omega_len') || 3));
      add('pb_angle_item', t.pbAngle);
      if (pbHang) add('pb_hanger_item', t.pbHang);
    }
    if (t.ac) {
      const cell = (n('ac_main_space') || 1.2) * Math.sqrt(n('ac_tile_m2') || 0.36);
      add('ac_tile_item', t.ac / (n('ac_tile_m2') || 0.36) * (1 + wA));
      add('ac_main_item', t.acMain * (1 + wM) / (n('ac_main_len') || 3.6));
      add('ac_ct12_item', t.ac / cell * (1 + wM)); add('ac_ct06_item', t.ac / cell * (1 + wM));
      add('ac_angle_item', t.acAngle);
    }
    if (t.corn) add('cornice_item', t.corn);
    if (t.paint) {
      const waste = 1 + (n('paint_waste') || 0) / 100;
      add('paint_item', t.paint * (n('paint_coats') || 2) / (n('paint_cover') || 10) * waste / (n('paint_bucket') || 18), 'buckets');
      if (!(lab && lab.noPrimer)) add('primer_item', t.paint * (n('primer_coats') || 1) / (n('primer_cover') || 8) * waste / (n('primer_bucket') || 18), 'buckets');
    }
    if (t.pop) { add('pop_item', t.pop * n('pop_kg_m2') / (n('pop_bag') || 25), 'bags'); add('pop_sisal_item', t.pop * n('pop_sisal_m2'), 'kg'); add('pop_wire_item', t.pop * n('pop_wire_m2'), 'kg'); if (t.popCorn) add('pop_corn_item', t.popCorn, 'm'); }
    const hang = (pbHang ? t.pbHang : 0) + t.acHang;
    if (hang && n('wire_per_hanger') > 0) add('wire_item', hang * n('wire_per_hanger'), 'm');
    const fixM = t.angleWalls + t.ptTrack;
    if (fixM && n('fix_per_m') > 0 && n('fix_per_box') > 0) add('fix_item', fixM * n('fix_per_m') / n('fix_per_box'), 'boxes');
    // the same product used twice (for example boards on ceilings and partitions) becomes one line
    const merged = []; out.forEach(l => { const m = merged.find(x => kk(x.p) === kk(l.p)); if (m) m.q += l.q; else merged.push(l); });
    lab = lab || {};
    const rt = k => lab[k] !== undefined && lab[k] !== '' ? +lab[k] : n(k);
    const L = (item, q, rate, un) => { if (q > 0 && rate > 0) merged.push({ p: String(R[item] || item), q: r2(q), u: rate, un: un || 'm²', l: 1, labour: true }); };
    L('lab_struct_item', pbMetal + t.ac, rt('lab_struct_rate'));      // structure works: metal plasterboard and acoustic (not wood: the client fixes the wood)
    L('lab_skim_item', t.pb, rt('lab_skim_rate'));
    L('lab_ac_item', t.ac, rt('lab_ac_rate'));
    L('lab_gen_item', t.pb + t.ac + t.pop, rt('lab_gen_rate'));
    if (t.corn) L('lab_cornice_item', t.corn, rt('lab_cornice_rate'), 'pcs');
    L('lab_pop_item', t.pop, rt('lab_pop_rate'));
    if (t.popCorn) L('lab_popc_item', ceil(t.popCorn), rt('lab_popc_rate'), 'm');
    L('lab_pt_item', t.ptArea, rt('lab_pt_rate'));
    if (t.paint && lab.paintBy === 'm2') L('lab_paint_item', t.paint, rt('lab_paint_rate'));
    else if (t.paint && +lab.paintJob > 0) merged.push({ p: String(R.lab_paint_item || 'Painting'), q: 1, u: +lab.paintJob, un: 'job', l: 1, labour: true });
    return { lines: merged, areaPb: r2(t.pb), areaWood: r2(t.wood), areaAc: r2(t.ac), areaPop: r2(t.pop), areaPt: r2(t.ptArea), areaPaint: r2(t.paint), areaPaintC: r2(t.paintC), areaPaintW: r2(t.paintW), area: r2(t.pb + t.ac + t.pop) };
  }
  KL.estimate = calc;
  const LABK = ['lab_struct_rate', 'lab_skim_rate', 'lab_ac_rate', 'lab_gen_rate', 'lab_cornice_rate', 'lab_pop_rate', 'lab_popc_rate', 'lab_pt_rate', 'lab_paint_rate'];
  ACT.dEstimator = async () => {
    readEdit();
    const R = await getRules(); if (!R) { toast('Connect to the internet once to load the estimator rules'); return; }
    const lab = {}; LABK.forEach(k => { lab[k] = R[k]; });
    D.est = D.est || { rooms: (D.edit.rooms && D.edit.rooms.length ? D.edit.rooms.map(r => Object.assign({}, r)) : [newRoom(1, 'PB')]), wp: R.pb_waste, wa: R.ac_waste, trans: D.edit.trans || '', lab, frame: D.edit.frame || 'metal' };
    estSheet();
  };
  function newRoom(i, t) { return { n: (t === 'PT' ? 'Wall ' : 'Room ') + i, t: t || 'PB', s: 'R', l: '', w: '', cl: '', cw: '', a: '', h: '', d: '', c: false, ins: false }; }
  function readEst() {
    if (!D.est || !$('#ewp')) return;
    D.est.wp = $('#ewp').value; D.est.wa = $('#ewa').value; D.est.trans = $('#etr').value;
    document.querySelectorAll('[data-el]').forEach(el => { D.est.lab[el.dataset.el] = el.value; });
    document.querySelectorAll('[data-el2=noPrimer]').forEach(el => { D.est.lab.noPrimer = !el.checked; });
    document.querySelectorAll('[data-er]').forEach(el => { const r = D.est.rooms[+el.dataset.n]; if (!r) return; const k = el.dataset.er; r[k] = (k === 'c' || k === 'ins') ? el.checked : el.value; if (k === 'pm') delete r.p; });
  }
  document.addEventListener('change', ev => { const t = ev.target; if (D.est && t.dataset && (t.dataset.er === 't' || t.dataset.er === 's' || t.dataset.er === 'pm' || t.dataset.el === 'paintBy' || t.dataset.el2 === 'noPrimer')) { readEst(); estSheet(); } });
  function roomHTML(r, n) {
    const f = (k, lab, ph) => '<div class="grow"><label style="margin:0">' + lab + '</label><input data-er="' + k + '" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(r[k] == null ? '' : r[k]) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></div>';
    const pt = r.t === 'PT';
    let h = '<div class="card" style="padding:10px;margin:6px 0"><div class="row"><input data-er="n" data-n="' + n + '" value="' + esc(r.n) + '" class="grow" placeholder="Name"><button class="btn sm danger" data-act="eDel" data-n="' + n + '" aria-label="Remove">✕</button></div>' +
      '<div class="row" style="margin-top:6px"><select data-er="t" data-n="' + n + '" class="grow">' + Object.keys(TYPE).map(k => '<option value="' + k + '"' + ((r.t || 'PB') === k ? ' selected' : '') + '>' + TYPE[k] + '</option>').join('') + '</select>' +
      (pt ? '' : '<select data-er="s" data-n="' + n + '" style="width:120px"><option value="R"' + (r.s !== 'L' && r.s !== 'X' ? ' selected' : '') + '>Rectangle</option><option value="L"' + (r.s === 'L' ? ' selected' : '') + '>L-shape</option><option value="X"' + (r.s === 'X' ? ' selected' : '') + '>Own m²</option></select>') + '</div>';
    if (pt) h += '<div class="row" style="margin-top:6px">' + f('l', 'Length (m)') + f('h', 'Height (m)', String(D.rules.pt_height || 3)) + f('d', 'Doors') + '</div><label style="margin:6px 0 0;display:flex;align-items:center;gap:6px"><input data-er="ins" data-n="' + n + '" type="checkbox" style="width:auto;min-height:0"' + (r.ins ? ' checked' : '') + '> Insulation</label>';
    else if (r.s === 'X') h += '<div class="row" style="margin-top:6px">' + f('a', 'Area (m²)') + '</div>';
    else h += '<div class="row" style="margin-top:6px">' + f('l', 'Length (m)') + f('w', 'Width (m)') + '</div>' + (r.s === 'L' ? '<p class="small muted" style="margin:6px 0 0">Cut-out corner (the part that is not ceiling):</p><div class="row">' + f('cl', 'Cut length') + f('cw', 'Cut width') + '</div>' : '');
    if ((r.t || 'PB') === 'PB') { const f = frameOf(r, D.est.frame); h += '<div class="chips" style="margin-top:6px"><button class="chip ' + (f === 'metal' ? 'on' : '') + '" data-act="eRoomFrame" data-n="' + n + '" data-v="metal">Metal</button><button class="chip ' + (f === 'wood' ? 'on' : '') + '" data-act="eRoomFrame" data-n="' + n + '" data-v="wood">Wood noggings</button></div>'; }
    if (!pt && r.t !== 'PNT') h += '<label style="margin:6px 0 0;display:flex;align-items:center;gap:6px"><input data-er="c" data-n="' + n + '" type="checkbox" style="width:auto;min-height:0"' + (r.c ? ' checked' : '') + '> Cornice</label>';
    if (!pt) { const m = pmOf(r); h += '<div class="row" style="margin-top:6px;gap:8px"><select data-er="pm" data-n="' + n + '" class="grow">' + Object.keys(PM).map(k => '<option value="' + k + '"' + (m === k ? ' selected' : '') + '>' + PM[k] + '</option>').join('') + '</select></div>' +
      (m.indexOf('W') >= 0 ? '<div class="row" style="margin-top:6px">' + f('wh', 'Wall height (m)', String(D.rules.paint_wall_h || 3)) + f('dr', 'Doors') + f('wn', 'Windows') + '</div>' : ''); }
    const pa = paintOf(r, D.rules);
    return h + (r.t === 'PNT' ? '<div class="small muted" style="text-align:right">' + r2(pa.ceil + pa.wall) + ' m² to paint</div>' : areaOf(r) ? '<div class="small muted" style="text-align:right">' + r2(areaOf(r)) + ' m²' + (pa.wall ? ' · walls ' + r2(pa.wall) + ' m²' : '') + '</div>' : pt && wallOf(r, D.rules) ? '<div class="small muted" style="text-align:right">' + r2(wallOf(r, D.rules)) + ' m² wall</div>' : '') + '</div>';
  }
  function estSheet() {
    const E = D.est, R = D.rules, res = calc(E.rooms, R, E.wp, E.wa, E.lab, E.frame);
    const LB = [['lab_struct_rate', 'Structure works /m²'], ['lab_skim_rate', 'Skimming /m²'], ['lab_ac_rate', 'Acoustic fixing /m²'], ['lab_gen_rate', 'General labour /m²'], ['lab_cornice_rate', 'Cornice labour /piece'], ['lab_pop_rate', 'POP ceiling /m²'], ['lab_popc_rate', 'POP cornice /m'], ['lab_pt_rate', 'Partition works /m²']];
    const used = t => E.rooms.some(r => (r.t || 'PB') === t);
    const show = LB.filter(x => (x[0] === 'lab_pop_rate' || x[0] === 'lab_popc_rate') ? used('POP') : x[0] === 'lab_pt_rate' ? used('PT') : x[0] === 'lab_paint_rate' ? E.rooms.some(r => r.p) : x[0] === 'lab_ac_rate' ? used('AC') : x[0] === 'lab_skim_rate' ? used('PB') : true);
    const parts = [[r2(res.areaPb - res.areaWood), 'plasterboard (metal)'], [res.areaWood, 'plasterboard on wood'], [res.areaAc, 'acoustic'], [res.areaPop, 'POP'], [res.areaPt, 'partition wall']].filter(x => x[0] > 0).map(x => x[0] + ' m² ' + x[1]);
    const hasPb = E.rooms.some(r => (r.t || 'PB') === 'PB');
    sheet('<h2>Estimator</h2><p class="small muted" style="margin-top:0">Ceilings, POP, partitions and painting. Rules come from Setup → Estimator rules.</p>' +
      (hasPb ? '<div class="card" style="padding:10px 12px;margin:6px 0"><b>Plasterboard is fixed on</b><div class="chips" style="margin-top:6px"><button class="chip ' + (E.frame !== 'wood' ? 'on' : '') + '" data-act="eFrame" data-v="metal">Metal structure</button><button class="chip ' + (E.frame === 'wood' ? 'on' : '') + '" data-act="eFrame" data-v="wood">Wood noggings</button></div><p class="small muted" style="margin:4px 0 0">' + (E.frame === 'wood' ? 'Wood noggings: boards, screws, tape and compound only. No main channel, Omega, wall angle, tapping screws or wall fixings, and no Structure works labour (the client fixes the wood).' : 'Metal: main channel, Omega, wall angle and the rest. A room can be changed to wood below.') + '</p></div>' : '') +
      E.rooms.map(roomHTML).join('') +
      '<div class="row" style="gap:8px"><button class="btn sm grow" data-act="eAdd" data-t="">+ Add room</button><button class="btn sm grow" data-act="eAdd" data-t="PT">+ Add wall</button><button class="btn sm violet grow" data-act="ePaste">Paste sizes</button></div>' +
      (E.rooms.every(r => r.t === 'PNT') ? '' : '<div class="picker"><div><label>Board waste %</label><input id="ewp" type="number" inputmode="decimal" value="' + esc(E.wp) + '"></div><div><label>Tile waste %</label><input id="ewa" type="number" inputmode="decimal" value="' + esc(E.wa) + '"></div></div>') +
      (E.rooms.some(r => pmOf(r)) ? '<div class="card" style="padding:10px 12px;margin:10px 0 0"><b>Painting' + (res.areaPaint ? ' · ' + res.areaPaint + ' m²' + (res.areaPaintW ? ' (ceiling ' + res.areaPaintC + ', walls ' + res.areaPaintW + ')' : '') : '') + '</b>' +
        '<div class="row" style="gap:8px;margin-top:6px"><div class="grow"><label style="margin:0">Painting charge (GH₵)</label><input data-el="' + (E.lab.paintBy === 'm2' ? 'lab_paint_rate' : 'paintJob') + '" type="number" inputmode="decimal" value="' + esc(E.lab.paintBy === 'm2' ? E.lab.lab_paint_rate : E.lab.paintJob) + '" placeholder="0"></div>' +
        '<div style="width:130px"><label style="margin:0">Charged</label><select data-el="paintBy"><option value="job"' + (E.lab.paintBy !== 'm2' ? ' selected' : '') + '>for the job</option><option value="m2"' + (E.lab.paintBy === 'm2' ? ' selected' : '') + '>per m²</option></select></div></div>' +
        '<label style="margin:8px 0 0;display:flex;align-items:center;gap:6px"><input data-el2="noPrimer" type="checkbox" style="width:auto;min-height:0"' + (E.lab.noPrimer ? '' : ' checked') + '> Add primer</label></div>' : '') +
      '<h3 style="margin:14px 0 0">Labour rates for this job</h3><p class="small muted" style="margin:2px 0 0">0 means no line. Defaults come from Setup.</p><div class="picker">' + show.map(x => '<div><label>' + x[1] + '</label><input data-el="' + x[0] + '" type="number" inputmode="decimal" value="' + esc(E.lab[x[0]]) + '"></div>').join('') + '<div><label>Transport (GH₵)</label><input id="etr" type="number" inputmode="decimal" value="' + esc(E.trans) + '"></div></div>' +
      '<button class="btn block" data-act="eCalc" style="margin-top:8px">Work it out</button>' +
      '<div class="card" style="margin-top:8px"><h3>Materials' + (parts.length ? ' · ' + parts.join(' · ') : '') + '</h3>' +
      (res.lines.length ? res.lines.map(i => { const pr = i.u !== undefined ? i.u : priceOf(i.p); return '<div class="row between small" style="padding:4px 0"><span>' + (i.l ? '<span class="badge">labour</span> ' : '') + esc(i.p) + '</span><span><b>' + i.q + '</b> ' + esc(i.un || '') + (pr === null ? ' <span class="badge amber">no price</span>' : '') + '</span></div>'; }).join('') : '<p class="small muted">Enter sizes, then tap Work it out.</p>') + '</div>' +
      '<br><button class="btn primary block" data-act="eUse"' + (res.lines.length ? '' : ' disabled') + '>Add these to the ' + T[D.edit.type].toLowerCase() + '</button>');
  }
  /* paste many sizes at once, one per line, e.g.
     Living room 5 x 4 cornice | Kitchen 3x3 acoustic | Hall 6x5 L 2x2 | Bedroom 16m2 POP | Wall 4 x 3 partition 1 door insulation */
  function parseSizes(text) {
    const out = [];
    String(text || '').split(/\n|;/).forEach(raw => {
      let line = raw.replace(/(\d),(\d)/g, '$1.$2').trim(); if (!line) return;
      const lo = line.toLowerCase(), num = '(\\d+(?:\\.\\d+)?)';
      const t = /\bpop\b/.test(lo) ? 'POP' : /\b(ac|acoustic|t-?grid|tiles?)\b/.test(lo) ? 'AC' : /\b(pt|partition|wall|drywall)\b/.test(lo) ? 'PT' : 'PB';
      const pairs = [...lo.matchAll(new RegExp(num + '\\s*(?:x|×|\\*|by)\\s*' + num, 'g'))].map(m => [+m[1], +m[2]]);
      const m2 = lo.match(new RegExp(num + '\\s*(?:m2|m²|sqm|sq\\.?\\s*m|square)'));
      const dm = lo.match(/(\d+)\s*doors?/), hm = lo.match(new RegExp('(?:\\bh|height)\\s*' + num));
      const name = line.split(/\d/)[0].replace(/\b(pop|ac|acoustic|t-?grid|tiles?|pt|partition|drywall|pb|plasterboard|plaster|board|ceiling|cornice|paint|painting|painted|with|and|on|l-?shape|wood|wooden|noggings?|noggins?|metal)\b/gi, '').trim().replace(/[\s\-:,]+$/, '').trim();
      const r = newRoom(1, t); r.c = /cornice|\bcorn\b|\+\s*c\b/.test(lo); if (/paint/.test(lo)) r.pm = /paint\s*(only)?\s*(walls?\s*(and|&|\+)\s*ceiling|ceiling\s*(and|&|\+)\s*walls?|all|whole|room|everything)/.test(lo) ? 'CW' : /paint\s*walls?/.test(lo) ? 'W' : 'C'; r.ins = /insul|\bins\b/.test(lo);
      if (t === 'PB' && /\b(wood|wooden|noggings?|noggins?)\b/.test(lo)) r.fr = 'wood'; else if (t === 'PB' && /\bmetal\b/.test(lo)) r.fr = 'metal';
      if (t === 'PT') {
        if (pairs.length) { r.l = pairs[0][0]; r.h = pairs[0][1]; } else { const one = lo.match(new RegExp(num)); if (one) r.l = +one[1]; }
        if (hm) r.h = +hm[1];
        r.d = dm ? +dm[1] : /\bdoor\b/.test(lo) ? 1 : '';
      } else if (pairs.length) {
        r.l = pairs[0][0]; r.w = pairs[0][1];
        if (pairs.length > 1 && /\bl\b|l-?shape|cut|less|minus/.test(lo)) { r.s = 'L'; r.cl = pairs[1][0]; r.cw = pairs[1][1]; }
      } else if (m2) { r.s = 'X'; r.a = +m2[1]; } else return;
      r.n = name || '';
      out.push(r);
    });
    return out;
  }
  KL.parseSizes = parseSizes;
  ACT.ePaste = () => { readEst(); sheet('<h2>Paste sizes</h2><p class="small muted" style="margin-top:0">One room or wall per line. Write it the way you write in your notebook. Examples:</p>' +
    '<div class="card small" style="line-height:1.7;margin:4px 0">Living room 5 x 4 cornice<br>Store 3 x 3 wood <span class="muted">(on wood noggings)</span><br>Kitchen 3x3 acoustic<br>Hall 6x5 L 2x2 <span class="muted">(L-shape, cut corner 2x2)</span><br>Bedroom 16m2 POP cornice<br>Wall 4 x 3 partition 1 door insulation</div>' +
    '<textarea id="epaste" rows="8" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit" placeholder="Paste or type here"></textarea>' +
    '<p class="small muted">No type word = plasterboard. Words that work: acoustic, POP, partition, cornice, paint, wood (noggings), metal, L, door, insulation, m2.</p>' +
    '<div class="row"><button class="btn grow" data-act="ePasteBack">Back</button><button class="btn primary grow" data-act="ePasteGo">Add these</button></div>'); };
  ACT.ePasteBack = () => estSheet();
  ACT.ePasteGo = () => {
    const list = parseSizes($('#epaste').value); if (!list.length) { toast('No sizes found. Check the examples.'); return; }
    const E = D.est, blank = r => !+r.l && !+r.w && !+r.a;
    E.rooms = E.rooms.filter(r => !blank(r));
    let ci = E.rooms.filter(r => r.t !== 'PT').length, wi = E.rooms.filter(r => r.t === 'PT').length;
    list.forEach(r => { if (!r.n) r.n = r.t === 'PT' ? 'Wall ' + (++wi) : 'Room ' + (++ci); else if (r.t === 'PT') wi++; else ci++; E.rooms.push(r); });
    estSheet(); toast(list.length + ' added. Check them, then tap Work it out.');
  };
  ACT.eFrame = d => { readEst(); D.est.frame = d.v; D.est.rooms.forEach(r => { delete r.fr; }); estSheet(); };
  ACT.eRoomFrame = d => { readEst(); const r = D.est.rooms[+d.n]; if (r) r.fr = d.v === D.est.frame ? undefined : d.v; estSheet(); };
  ACT.eAdd = d => { readEst(); const last = D.est.rooms[D.est.rooms.length - 1], t = d.t || (last && last.t !== 'PT' ? last.t : 'PB'); D.est.rooms.push(newRoom(D.est.rooms.filter(r => (r.t === 'PT') === (t === 'PT')).length + 1, t)); estSheet(); };
  ACT.eDel = d => { readEst(); D.est.rooms.splice(+d.n, 1); if (!D.est.rooms.length) D.est.rooms.push(newRoom(1, 'PB')); estSheet(); };
  ACT.eCalc = () => { readEst(); estSheet(); };
  ACT.eUse = () => {
    readEst(); const res = calc(D.est.rooms, D.rules, D.est.wp, D.est.wa, D.est.lab, D.est.frame), e = D.edit; e.frame = D.est.frame;
    res.lines.forEach(l => {
      const u = l.u !== undefined ? l.u : (priceOf(l.p) || 0), ex = e.items.find(i => kk(i.p) === kk(l.p));
      if (ex) { ex.q = l.q; if (l.l) ex.u = u; ex.l = l.l ? 1 : 0; ex.un = l.un; } else e.items.push({ p: l.p, q: l.q, u, un: l.un, l: l.l ? 1 : 0 });
    });
    e.items.sort((a, b) => (a.l ? 1 : 0) - (b.l ? 1 : 0));
    if (D.est.trans !== '') e.trans = D.est.trans;
    e.rooms = D.est.rooms.map(r => { const o = { n: r.n, t: r.t || 'PB', s: r.s || 'R', c: !!r.c }; { const m = pmOf(r); if (m && r.t !== 'PT') { o.pm = m; ['wh', 'dr', 'wn'].forEach(k => { if (+r[k]) o[k] = +r[k]; }); } } if ((r.t || 'PB') === 'PB' && frameOf(r, D.est.frame) === 'wood') o.fr = 'wood'; ['l', 'w', 'cl', 'cw', 'a', 'h', 'd'].forEach(k => { if (+r[k]) o[k] = +r[k]; }); if (r.ins) o.ins = true; o.m2 = r2(r.t === 'PT' ? wallOf(r, D.rules) : areaOf(r)); o.size = sizeText(r, D.rules); return o; });
    if (!e.title && e.rooms.length && e.rooms.every(r => r.t === 'PNT')) e.title = 'Painting · ' + e.rooms.length + ' room' + (e.rooms.length > 1 ? 's' : '');
    if (!e.title) { const rc = e.rooms.filter(r => r.t !== 'PT' && r.t !== 'PNT').length; const sa = cfg().showRooms === 'Yes'; e.title = rc ? rc + ' room' + (rc > 1 ? 's' : '') + ' ceiling' + (sa ? ' · ' + res.area + ' m²' : '') : 'Partition walls' + (sa ? ' · ' + res.areaPt + ' m²' : ''); }
    if (res.areaPaint > 0) { const pl = scopeList().find(s => /paint/i.test(s)); if (pl) { const sc = e.scope || { inc: e.no ? [] : scopeList().slice(0, 2), exc: [] }; if (!sc.inc.some(x => kk(x) === kk(pl))) sc.inc.push(pl); sc.exc = scopeList().filter(s => !sc.inc.some(x => kk(x) === kk(s))); e.scope = sc; } }
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
      (build() ? '<label>Work you do (for "What this price covers" on estimates)</label><input id="ssc" value="' + esc(scopeList().join(', ')) + '" placeholder="Ceiling, Skimming, Painting, Electricals, POP"><p class="small muted" style="margin:2px 0 0">Separate with commas. The first two are ticked on every new estimate.</p>' : '') +
      '<label>Show measured areas (room sizes) to the client?</label><select id="ssr"><option value="No"' + (c.showRooms !== 'Yes' ? ' selected' : '') + '>No, keep them for me only</option><option value="Yes"' + (c.showRooms === 'Yes' ? ' selected' : '') + '>Yes, print them</option></select>' +
      '<div class="picker"><div><label>Estimate valid (days)</label><input id="sed" type="number" value="' + esc(c.estDays || 14) + '"></div><div><label>Invoice due (days)</label><input id="sid" type="number" value="' + esc(c.invDays || 7) + '"></div></div>' +
      '<label>Estimate and pro forma terms</label><textarea id="set" rows="4" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(c.estTerms || '') + '</textarea>' +
      '<label>Use tax on documents?</label><select id="sut"><option value="Yes"' + (useTax() ? ' selected' : '') + '>Yes (VAT registered)</option><option value="No"' + (!useTax() ? ' selected' : '') + '>No, hide tax</option></select>' +
      '<div class="picker"><div><label>VAT %</label><input id="stv" type="number" inputmode="decimal" value="' + esc(c.taxVat || 15) + '"></div><div><label>NHIL %</label><input id="stn" type="number" inputmode="decimal" value="' + esc(c.taxNhil || 2.5) + '"></div><div><label>GETFund %</label><input id="stg" type="number" inputmode="decimal" value="' + esc(c.taxGet || 2.5) + '"></div><div><label>Your TIN</label><input id="sti" value="' + esc(c.tin || '') + '"></div></div>' +
      '<p class="small muted" style="margin:4px 0 0">Ghana from 1 Jan 2026: VAT 15% + NHIL 2.5% + GETFund 2.5% on the same amount. Only add tax if you are VAT registered.</p>' +
      '<label>Invoice terms</label><textarea id="sit" rows="3" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(c.invTerms || '') + '</textarea>' +
      '<br><button class="btn primary block" data-act="dSettingsSave">Save</button>');
  };
  ACT.dSettingsSave = async (d, btn) => {
    const values = { scopeList: $('#ssc') ? $('#ssc').value : undefined, useTax: $('#sut').value, showRooms: $('#ssr').value, docs: $('#sdocs').value, estDays: $('#sed').value, invDays: $('#sid').value, estTerms: $('#set').value, invTerms: $('#sit').value, taxVat: $('#stv').value, taxNhil: $('#stn').value, taxGet: $('#stg').value, tin: $('#sti').value };
    btn.disabled = true;
    try { const r = await api('admin', { op: 'saveSettings', values }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } if (S.cache && r.cfg) S.cache.cfg = r.cfg; toast('Saved'); closeSheet(); render(); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
})();
