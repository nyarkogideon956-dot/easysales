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
  function plan(type, total, clientMat) {
    const std = clientMat ? [['Before work starts', 50], ['When the job is 70% done', 35], ['After completion and inspection', 15]] : [['Before work starts', 85], ['After completion and inspection', 15]];
    return std.map(x => [x[0], x[1], r2(total * x[1] / 100)]);
  }

  /* ---------- the paper: what the customer sees (preview, view, print) ---------- */
  function paperHTML(doc, preview) {
    const c = cfg(), items = doc.data.items || [], wb = doc.type === 'WB', inv = doc.type === 'INV', adj = doc.data.adj || {};
    const m = wb ? null : docMoney(items, adj), total = m ? m.total : 0, paid = inv ? r2(doc.paid || 0) : 0, bal = r2(total - paid);
    const c1 = c.c1 || '#7A1F3D', mute = '#5B6B78', N = x => r2(x).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const st = inv ? (bal <= 0.004 ? ['PAID IN FULL', '#1E7B4F'] : paid > 0 ? ['PART PAID', '#B26A00'] : ['UNPAID', '#B3261E']) : null;
    const th = 'style="text-align:right;padding:5px 6px;font-weight:700"', td = 'style="padding:5px 6px;border-bottom:1px solid #EEF0F4"', tdn = 'style="padding:5px 6px;border-bottom:1px solid #EEF0F4;text-align:right;white-space:nowrap"';
    const h3 = t => '<div style="margin:12px 0 4px;font-weight:800;color:' + esc(c1) + ';font-size:12px;letter-spacing:.4px">' + t + '</div>';
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
    h += '<div style="display:flex;gap:10px;align-items:flex-start"><img src="' + logoSrc() + '" alt="" style="width:56px;height:56px;object-fit:contain"><div style="flex:1;min-width:0"><b style="font-size:15px;color:' + esc(c1) + '">' + esc(bizName()) + '</b><div style="font-size:10.5px;color:' + mute + '">' + esc([c.tagline, c.location, c.phone].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:15px;font-weight:800;color:' + esc(c1) + '">' + TITLE[doc.type] + '</div><div style="font-size:10.5px;color:' + mute + ';line-height:1.5">' + meta.map(x => '<b>' + x[0] + '</b> ' + esc(x[1])).join('<br>') + '</div></div></div>' +
      '<div style="height:4px;background:' + esc(c1) + ';margin:8px 0 2px;border-radius:2px"></div><div style="height:2px;background:' + esc(c.c2 || '#E07A1F') + ';margin-bottom:10px;border-radius:2px"></div>';
    // client box
    h += '<table style="width:100%;border-collapse:collapse;font-size:11.5px;background:#F7F8FA;border-radius:8px"><tr><td style="padding:5px 8px;color:' + mute + '">' + (wb ? 'Deliver to' : 'Client') + '</td><td style="padding:5px 8px"><b>' + esc(doc.customer) + '</b></td><td style="padding:5px 8px;color:' + mute + '">Phone</td><td style="padding:5px 8px">' + esc(doc.phone || '') + '</td></tr>' +
      '<tr><td style="padding:5px 8px;color:' + mute + '">Site / location</td><td style="padding:5px 8px" colspan="3">' + esc(wb ? (doc.data.dest || doc.location || '') : (doc.location || '')) + '</td></tr></table>';
    // measured areas
    const rooms = doc.data.rooms || [];
    if (!wb && rooms.length) h += h3('MEASURED AREAS') + '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><tr style="background:#F1F3F6"><th style="text-align:left;padding:5px 6px">Area</th><th style="text-align:left;padding:5px 6px">Type</th><th ' + th + '>Size</th><th ' + th + '>m²</th></tr>' +
      rooms.map(r => '<tr><td ' + td + '>' + esc(r.n || 'Room') + '</td><td ' + td + '>' + (r.t === 'AC' ? 'Acoustic' : 'Plasterboard') + (r.c ? ' + cornice' : '') + '</td><td ' + tdn + '>' + (+r.l || 0) + ' x ' + (+r.w || 0) + ' m</td><td ' + tdn + '>' + r2((+r.l || 0) * (+r.w || 0)) + '</td></tr>').join('') +
      '<tr><td colspan="3" style="padding:5px 6px;text-align:right;font-weight:700">Total area</td><td ' + tdn + '><b>' + r2(sum(rooms, r => (+r.l || 0) * (+r.w || 0))) + '</b></td></tr></table>';
    if (doc.title) h += '<div style="margin:12px 0 0;font-size:15px;font-weight:800;color:' + esc(c1) + ';text-transform:uppercase;letter-spacing:.4px">' + esc(doc.title) + '</div>';
    if (wb) {
      h += h3('ITEMS') + table(items, 'Qty') + '</table>' +
        '<div style="margin-top:10px">Vehicle: <b>' + esc(doc.data.vehicle || '—') + '</b> · Driver: <b>' + esc(doc.data.driver || '—') + '</b></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:28px;font-size:10.5px;color:' + mute + ';text-align:center"><div style="border-top:1px solid #999;padding-top:4px">Dispatched by</div><div style="border-top:1px solid #999;padding-top:4px">Driver</div><div style="border-top:1px solid #999;padding-top:4px">Received by</div></div>';
    } else {
      if (mats.length) h += h3('MATERIALS' + (adj.clientMat ? ' (TO BE BOUGHT BY CLIENT, GUIDE PRICES)' : '')) + table(mats, 'Qty') + (m.trans ? '<tr><td colspan="4" ' + td + '>Transport</td><td ' + tdn + '>' + N(m.trans) + '</td></tr>' : '') + '</table>';
      if (labs.length) h += h3('LABOUR / WORKMANSHIP') + table(labs, 'Qty') + '</table>';
      if (!mats.length && m.trans) h += '<div style="text-align:right;margin-top:6px">Transport ' + N(m.trans) + '</div>';
      const row = (a, b, st2) => '<tr><td style="padding:4px 8px;' + (st2 || '') + '">' + a + '</td><td style="padding:4px 8px;text-align:right;white-space:nowrap;' + (st2 || '') + '">' + b + '</td></tr>';
      h += '<table style="margin:10px 0 0 auto;border-collapse:collapse;font-size:12px;min-width:62%">';
      if (mats.length) h += row(adj.clientMat ? 'Materials (client buys)' : 'Materials &amp; transport', adj.clientMat ? '<s style="color:' + mute + '">' + N(m.mat) + '</s>' + (m.trans ? ' + ' + N(m.trans) : '') : N(m.mat + m.trans));
      if (labs.length) h += row('Labour', N(m.lab));
      if (m.disc) h += row('Discount' + (adj.discPct ? ' (' + (+adj.disc) + '%)' : ''), '- ' + N(m.disc), 'color:#B3261E');
      m.taxes.forEach(t => { h += row(t.n + ' (' + t.r + '%)', N(t.a), 'color:' + mute); });
      h += row('<b>' + (adj.clientMat ? 'TOTAL PAYABLE TO US' : 'GRAND TOTAL') + '</b>', '<b>GH₵ ' + N(total) + '</b>', 'background:' + esc(c1) + ';color:#fff;font-size:14px');
      if (inv) h += row('Paid so far', N(paid), 'color:#1E7B4F') + row('<b>BALANCE DUE</b>', '<b>GH₵ ' + N(Math.max(0, bal)) + '</b>', 'color:' + (bal > 0.004 ? '#B3261E' : '#1E7B4F') + ';font-size:13px');
      h += '</table>';
      if (inv && bal > 0.004 && doc.until) h += '<div style="margin-top:8px"><b>Please pay the balance by ' + esc(doc.until) + '.</b> Use <b>' + esc(doc.no || 'the invoice number') + '</b> as the payment reference.</div>';
      if (!inv && total > 0) h += h3('PAYMENT PLAN' + (adj.clientMat ? ' (WORKMANSHIP)' : '')) + '<table style="width:100%;border-collapse:collapse;font-size:11.5px">' + plan(doc.type, total, adj.clientMat).map(x => '<tr><td ' + td + '>' + x[0] + '</td><td ' + tdn + '>' + x[1] + '%</td><td ' + tdn + '><b>' + N(x[2]) + '</b></td></tr>').join('') + '</table>';
      if ((c.momo || c.bank) && (!inv || bal > 0.004)) h += '<div style="margin-top:12px;border:1.5px solid ' + esc(c1) + ';border-radius:8px;overflow:hidden"><div style="background:' + esc(c1) + ';color:#fff;font-weight:800;padding:4px 10px;font-size:11px;letter-spacing:.5px">HOW TO PAY</div><div style="padding:6px 10px;line-height:1.6">' +
        (c.momo ? 'Mobile Money: <b>' + esc(c.momo) + '</b>' + (c.momoName ? ' (' + esc(c.momoName) + ')' : '') : '') + (c.momo && c.bank ? '<br>' : '') + (c.bank ? 'Bank: <b>' + esc(c.bank) + '</b>' : '') + '<div style="font-size:10.5px;color:' + mute + '">Use <b>' + esc(doc.no || 'the document number') + '</b> as the reference and send us a screenshot after paying.</div></div></div>';
    }
    if (doc.data.note) h += '<div style="margin-top:8px"><b>Notes:</b> ' + esc(doc.data.note) + '</div>';
    const terms = String(doc.data.terms || '').split(/\n|(?<=\.)\s+(?=[A-Z])/).map(x => x.trim()).filter(Boolean);
    if (terms.length && !wb) h += h3('TERMS &amp; CONDITIONS') + '<ul style="margin:0;padding-left:18px;font-size:11px;line-height:1.5">' + terms.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
    if (!inv && !wb) h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:30px;font-size:10.5px;color:' + mute + ';text-align:center"><div style="border-top:1px solid #999;padding-top:4px">Client name, signature &amp; date</div><div style="border-top:1px solid #999;padding-top:4px">For ' + esc(bizName()) + '</div></div>';
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
    return { type, no: '', customer: '', phone: '', location: '', title: '', from: '', items: [], terms: type === 'INV' ? (c.invTerms || '') : type === 'WB' ? '' : (c.estTerms || ''), note: '', vehicle: '', driver: '', dest: '', cash: '', momo: '', rooms: null, trans: '', disc: '', discPct: false, tax: false, clientMat: false };
  }
  ACT.dNew = d => { D.edit = blank(d.k || D.type); editSheet(); };
  ACT.dEdit = () => { const v = D.view; D.edit = Object.assign(blank(v.type), { no: v.no, customer: v.customer, phone: v.phone, location: v.location, title: v.title, from: v.from, items: (v.data.items || []).map(i => Object.assign({}, i)), terms: v.data.terms || '', note: v.data.note || '', vehicle: v.data.vehicle || '', driver: v.data.driver || '', dest: v.data.dest || '', rooms: v.data.rooms || null }, adjOf(v)); editSheet(); };
  ACT.dConvert = d => {
    const v = D.view, k = d.k;
    const e = Object.assign(blank(k), { customer: v.customer, phone: v.phone, location: v.location, title: v.title, from: v.no, items: (v.data.items || []).map(i => Object.assign({}, i)), rooms: v.data.rooms || null }, k === 'WB' ? {} : adjOf(v));
    if (k === 'WB') { e.items = remaining(v).filter(i => i.q > 0); e.dest = v.location; }
    else if (k === 'INV' && v.type === 'EST') e.terms = cfg().invTerms || '';
    D.edit = e; editSheet();
  };

  function adjOf(v) { const a = (v.data && v.data.adj) || {}; return { trans: a.trans || '', disc: a.disc || '', discPct: !!a.discPct, tax: !!a.tax, clientMat: !!a.clientMat }; }
  function products() { return ((S.lists && S.lists.products) || (S.cache && S.cache.products) || []); }
  function priceOf(name) { const p = products().find(x => kk(x.name) === kk(name)); return p ? p.price : null; }

  function editSheet() {
    const e = D.edit, wb = e.type === 'WB', custs = KL.derived().customers.filter(c => kk(c.name) !== kk(KL.WALKIN));
    sheet('<h2>' + (e.no ? 'Edit ' + esc(e.no) : 'New ' + T[e.type].toLowerCase()) + '</h2>' +
      (e.from ? '<p class="small muted" style="margin:0">From ' + esc(e.from) + '</p>' : '') +
      '<label>Customer</label><input id="dc" list="dcl" value="' + esc(e.customer) + '" autocomplete="off" placeholder="Name"><datalist id="dcl">' + custs.map(c => '<option value="' + esc(c.name) + '">').join('') + '</datalist>' +
      '<div class="picker"><div><label>Phone</label><input id="dp" inputmode="tel" value="' + esc(e.phone) + '"></div><div><label>' + (wb ? 'Deliver to' : 'Location') + '</label><input id="dl" value="' + esc(wb ? (e.dest || e.location) : e.location) + '"></div></div>' +
      (wb ? '' : '<label>Job / title (optional)</label><input id="dt" value="' + esc(e.title) + '" placeholder="Example: 3 rooms plasterboard ceiling">') +
      '<h3 style="margin:14px 0 4px">Items</h3><datalist id="dpl">' + products().map(p => '<option value="' + esc(p.name) + '">').join('') + '</datalist>' +
      (e.items.length ? e.items.map((i, n) => '<div class="card" style="padding:10px;margin:6px 0"><input data-di="p" data-n="' + n + '" list="dpl" value="' + esc(i.p) + '" placeholder="Item">' +
        '<div class="row" style="margin-top:6px"><div class="grow"><label style="margin:0">Qty</label><input data-di="q" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(i.q) + '"></div>' +
        '<div style="width:72px"><label style="margin:0">Unit</label><input data-di="un" data-n="' + n + '" value="' + esc(i.un || '') + '" placeholder="pcs"></div>' +
        (wb ? '' : '<div class="grow"><label style="margin:0">Price</label><input data-di="u" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(i.u) + '"></div>') +
        '<button class="btn sm danger" data-act="dDelLine" data-n="' + n + '" style="align-self:flex-end" aria-label="Remove line">✕</button></div>' +
        (wb ? '' : '<label style="margin:6px 0 0;display:flex;align-items:center;gap:8px;font-weight:600"><input data-di="l" data-n="' + n + '" type="checkbox" style="width:auto;min-height:0"' + (i.l ? ' checked' : '') + '> Labour / workmanship</label>') + '</div>').join('') : '<p class="small muted">No items yet.</p>') +
      '<div class="row" style="gap:8px"><button class="btn sm grow" data-act="dAddLine">+ Add item</button>' + (wb ? '' : '<button class="btn sm violet grow" data-act="dEstimator">Ceiling estimator</button>') + '</div>' +
      (wb ? '<div class="picker"><div><label>Vehicle number</label><input id="dv" value="' + esc(e.vehicle) + '" placeholder="GT 4512-22"></div><div><label>Driver (name, phone)</label><input id="dd" value="' + esc(e.driver) + '"></div></div>' :
        '<div class="card" style="padding:12px;margin-top:10px"><b>Transport, discount and tax</b>' +
        '<div class="picker"><div><label>Transport (GH₵)</label><input id="dtr" type="number" inputmode="decimal" value="' + esc(e.trans) + '" placeholder="0"></div>' +
        '<div><label>Discount</label><div class="row" style="gap:6px"><input id="ddi" type="number" inputmode="decimal" value="' + esc(e.disc) + '" placeholder="0"><select id="ddp" style="width:78px"><option value="">GH₵</option><option value="1"' + (e.discPct ? ' selected' : '') + '>%</option></select></div></div></div>' +
        '<label style="display:flex;align-items:center;gap:8px;font-weight:600;margin-top:10px"><input id="dtx" type="checkbox" style="width:auto;min-height:0"' + (e.tax ? ' checked' : '') + '> Add tax (VAT ' + (cfg().taxVat || 15) + '% + NHIL ' + (cfg().taxNhil || 2.5) + '% + GETFund ' + (cfg().taxGet || 2.5) + '%)</label>' +
        '<label style="display:flex;align-items:center;gap:8px;font-weight:600;margin-top:6px"><input id="dcm" type="checkbox" style="width:auto;min-height:0"' + (e.clientMat ? ' checked' : '') + '> Client buys the materials (we charge labour only)</label>' +
        '<div id="dtot" style="margin-top:10px">' + totalsHTML(e) + '</div></div>') +
      (e.type === 'INV' && !e.no ? '<div class="picker"><div><label>Paid now: cash</label><input id="dcash" type="number" inputmode="decimal" value="' + esc(e.cash) + '" placeholder="0"></div><div><label>Paid now: MoMo</label><input id="dmomo" type="number" inputmode="decimal" value="' + esc(e.momo) + '" placeholder="0"></div></div>' : '') +
      (wb ? '' : '<label>Terms</label><textarea id="dterms" rows="3" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(e.terms) + '</textarea>') +
      '<label>Note (optional)</label><input id="dnote" value="' + esc(e.note) + '">' +
      '<br><button class="btn primary block" data-act="dPreview">Preview</button>');
  }
  function totalsHTML(e) {
    const m = docMoney(e.items, e), L = (a, b, c) => '<div class="row between small" style="padding:2px 0' + (c ? ';' + c : '') + '"><span>' + a + '</span><b>' + b + '</b></div>';
    return L(e.clientMat ? 'Materials (client buys, not charged)' : 'Materials', money(m.mat), e.clientMat ? 'color:var(--mute)' : '') + (m.trans ? L('Transport', money(m.trans)) : '') + L('Labour', money(m.lab)) +
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
    readExtras();
  }
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
  ACT.dAddLine = () => { readEdit(); D.edit.items.push({ p: '', q: 1, u: 0 }); editSheet(); };
  ACT.dDelLine = d => { readEdit(); D.edit.items.splice(+d.n, 1); editSheet(); };

  /* ---------- preview before saving ---------- */
  ACT.dPreview = () => {
    readEdit(); const e = D.edit;
    if (!e.customer) { toast('Enter the customer'); return; }
    e.items = e.items.filter(i => String(i.p || '').trim());
    if (!e.items.length) { toast('Add at least one item'); editSheet(); return; }
    if (e.items.some(i => !(+i.q > 0) || (e.type !== 'WB' && !(+i.u >= 0)))) { toast('Check quantities and prices'); editSheet(); return; }
    const total = e.type === 'WB' ? 0 : docMoney(e.items, e).total, paid = r2((+e.cash || 0) + (+e.momo || 0));
    if (e.type === 'INV' && paid > total + 0.001) { toast('Paid is more than the total'); editSheet(); return; }
    const doc = { type: e.type, no: e.no || 'New', date: today(), customer: e.customer, phone: e.phone, location: e.location, title: e.title, from: e.from, paid, data: { items: e.items, terms: e.terms, note: e.note, vehicle: e.vehicle, driver: e.driver, dest: e.dest, rooms: e.rooms, adj: { trans: +e.trans || 0, disc: +e.disc || 0, discPct: e.discPct, tax: e.tax, clientMat: e.clientMat } } };
    sheet('<h2>Check before saving</h2><p class="small muted" style="margin-top:0">This is exactly what your customer will see.</p>' + paperHTML(doc, true) +
      '<div class="row" style="margin-top:12px"><button class="btn grow" data-act="dBack">Edit</button><button class="btn primary grow" data-act="dSave">Confirm and save</button></div>');
  };
  ACT.dBack = () => editSheet();
  ACT.dSave = async (d, btn) => {
    const e = D.edit; if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const r = await api('docs', { op: 'save', type: e.type, no: e.no, customer: e.customer, phone: e.phone, location: e.location, title: e.title, from: e.from, items: e.items, terms: e.terms, note: e.note, vehicle: e.vehicle, driver: e.driver, dest: e.dest, rooms: e.rooms, cash: +e.cash || 0, momo: +e.momo || 0, trans: +e.trans || 0, disc: +e.disc || 0, discPct: e.discPct, tax: e.tax, clientMat: e.clientMat });
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
  KL.estimate = calc; // for testing
  KL.docs = { state: D, load: loadDocs, status: status, open: no => { const d = findDoc(no); if (d) viewSheet(d); } };
  function calc(rooms, R, wastePb, wasteAc, lab) {
    const n = k => +R[k] || 0, out = [], add = (item, q, un) => { if (q > 0) out.push({ p: String(R[item] || item), q, un: un || 'pcs' }); };
    const L = (item, q, rate, un) => { if (q > 0 && rate > 0) out.push({ p: String(R[item] || item), q: r2(q), u: rate, un: un || 'm²', l: 1, labour: true }); };
    lab = lab || {};
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
      add('pb_comp_item', ceil(aPb * n('pb_comp_per_m2') / (n('pb_comp_bag') || 25)), 'bags');
    }
    if (corn > 0) add('cornice_item', ceil(corn / (n('cornice_len') || 2.4)));
    if (aAc > 0) {
      add('ac_tile_item', ceil(aAc * (1 + wa) / (n('ac_tile_m2') || 0.36)));
      add('ac_main_item', ceil(aAc / (n('ac_main_space') || 1.2) / (n('ac_main_len') || 3.6)));
      add('ac_ct12_item', ceil(aAc * n('ac_ct12_per_m2')));
      add('ac_ct06_item', ceil(aAc * n('ac_ct06_per_m2')));
      add('ac_angle_item', ceil(pAc / (n('ac_angle_len') || 3)));
    }
    const rt = k => lab[k] !== undefined && lab[k] !== '' ? +lab[k] : n(k);
    L('lab_struct_item', aPb + aAc, rt('lab_struct_rate'));
    L('lab_skim_item', aPb, rt('lab_skim_rate'));
    L('lab_ac_item', aAc, rt('lab_ac_rate'));
    L('lab_gen_item', aPb + aAc, rt('lab_gen_rate'));
    if (corn > 0) L('lab_cornice_item', ceil(corn / (n('cornice_len') || 2.4)), rt('lab_cornice_rate'), 'pcs');
    return { lines: out, areaPb: r2(aPb), areaAc: r2(aAc) };
  }
  ACT.dEstimator = async () => {
    readEdit();
    const R = await getRules(); if (!R) { toast('Connect to the internet once to load the estimator rules'); return; }
    D.est = D.est || { rooms: (D.edit.rooms && D.edit.rooms.length ? D.edit.rooms : [{ n: 'Room 1', l: '', w: '', t: 'PB', c: false }]), wp: R.pb_waste, wa: R.ac_waste, trans: D.edit.trans || '', lab: { lab_struct_rate: R.lab_struct_rate, lab_skim_rate: R.lab_skim_rate, lab_ac_rate: R.lab_ac_rate, lab_gen_rate: R.lab_gen_rate, lab_cornice_rate: R.lab_cornice_rate } };
    estSheet();
  };
  function readEst() {
    if (!D.est || !$('#ewp')) return;
    D.est.wp = $('#ewp').value; D.est.wa = $('#ewa').value; D.est.trans = $('#etr').value;
    document.querySelectorAll('[data-el]').forEach(el => { D.est.lab[el.dataset.el] = el.value; });
    document.querySelectorAll('[data-er]').forEach(el => { const r = D.est.rooms[+el.dataset.n]; if (!r) return; const k = el.dataset.er; r[k] = k === 'c' ? el.checked : el.value; });
  }
  function estSheet() {
    const E = D.est, R = D.rules, res = calc(E.rooms, R, E.wp, E.wa, E.lab);
    const LB = [['lab_struct_rate', 'Structure works /m²'], ['lab_skim_rate', 'Skimming /m²'], ['lab_ac_rate', 'Acoustic fixing /m²'], ['lab_gen_rate', 'General labour /m²'], ['lab_cornice_rate', 'Cornice labour /piece']];
    sheet('<h2>Ceiling estimator</h2><p class="small muted" style="margin-top:0">Rules come from Setup → Estimator rules.</p>' +
      E.rooms.map((r, n) => '<div class="card" style="padding:10px;margin:6px 0"><div class="row"><input data-er="n" data-n="' + n + '" value="' + esc(r.n) + '" class="grow" placeholder="Room name"><button class="btn sm danger" data-act="eDel" data-n="' + n + '" aria-label="Remove room">✕</button></div>' +
        '<div class="row" style="margin-top:6px"><div class="grow"><label style="margin:0">Length (m)</label><input data-er="l" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(r.l) + '"></div><div class="grow"><label style="margin:0">Width (m)</label><input data-er="w" data-n="' + n + '" type="number" inputmode="decimal" value="' + esc(r.w) + '"></div></div>' +
        '<div class="row" style="margin-top:6px"><select data-er="t" data-n="' + n + '" class="grow"><option value="PB"' + (r.t !== 'AC' ? ' selected' : '') + '>Plasterboard</option><option value="AC"' + (r.t === 'AC' ? ' selected' : '') + '>Acoustic</option></select>' +
        '<label style="margin:0;display:flex;align-items:center;gap:6px;white-space:nowrap"><input data-er="c" data-n="' + n + '" type="checkbox" style="width:auto;min-height:0"' + (r.c ? ' checked' : '') + '> Cornice</label></div></div>').join('') +
      '<button class="btn sm block" data-act="eAdd">+ Add room</button>' +
      '<div class="picker"><div><label>Board waste %</label><input id="ewp" type="number" inputmode="decimal" value="' + esc(E.wp) + '"></div><div><label>Tile waste %</label><input id="ewa" type="number" inputmode="decimal" value="' + esc(E.wa) + '"></div></div>' +
      '<h3 style="margin:14px 0 0">Labour rates for this job</h3><p class="small muted" style="margin:2px 0 0">0 means no line. Defaults come from Setup.</p><div class="picker">' + LB.map(x => '<div><label>' + x[1] + '</label><input data-el="' + x[0] + '" type="number" inputmode="decimal" value="' + esc(E.lab[x[0]]) + '"></div>').join('') + '<div><label>Transport (GH₵)</label><input id="etr" type="number" inputmode="decimal" value="' + esc(E.trans) + '"></div></div>' +
      '<button class="btn block" data-act="eCalc" style="margin-top:8px">Work it out</button>' +
      '<div class="card" style="margin-top:8px"><h3>Materials · ' + res.areaPb + ' m² plasterboard' + (res.areaAc ? ' · ' + res.areaAc + ' m² acoustic' : '') + '</h3>' +
      (res.lines.length ? res.lines.map(i => { const pr = i.u !== undefined ? i.u : priceOf(i.p); return '<div class="row between small" style="padding:4px 0"><span>' + (i.l ? '<span class="badge">labour</span> ' : '') + esc(i.p) + '</span><span><b>' + i.q + '</b> ' + esc(i.un || '') + (pr === null ? ' <span class="badge amber">no price</span>' : '') + '</span></div>'; }).join('') : '<p class="small muted">Enter room sizes, then tap Work it out.</p>') + '</div>' +
      '<br><button class="btn primary block" data-act="eUse"' + (res.lines.length ? '' : ' disabled') + '>Add these to the ' + T[D.edit.type].toLowerCase() + '</button>');
  }
  ACT.eAdd = () => { readEst(); D.est.rooms.push({ n: 'Room ' + (D.est.rooms.length + 1), l: '', w: '', t: D.est.rooms.length ? D.est.rooms[D.est.rooms.length - 1].t : 'PB', c: false }); estSheet(); };
  ACT.eDel = d => { readEst(); D.est.rooms.splice(+d.n, 1); if (!D.est.rooms.length) D.est.rooms.push({ n: 'Room 1', l: '', w: '', t: 'PB', c: false }); estSheet(); };
  ACT.eCalc = () => { readEst(); estSheet(); };
  ACT.eUse = () => {
    readEst(); const res = calc(D.est.rooms, D.rules, D.est.wp, D.est.wa, D.est.lab), e = D.edit;
    res.lines.forEach(l => {
      const u = l.u !== undefined ? l.u : (priceOf(l.p) || 0), ex = e.items.find(i => kk(i.p) === kk(l.p));
      if (ex) { ex.q = l.q; if (l.l) ex.u = u; ex.l = l.l ? 1 : 0; ex.un = l.un; } else e.items.push({ p: l.p, q: l.q, u, un: l.un, l: l.l ? 1 : 0 });
    });
    e.items.sort((a, b) => (a.l ? 1 : 0) - (b.l ? 1 : 0));
    if (D.est.trans !== '') e.trans = D.est.trans;
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
      '<div class="picker"><div><label>VAT %</label><input id="stv" type="number" inputmode="decimal" value="' + esc(c.taxVat || 15) + '"></div><div><label>NHIL %</label><input id="stn" type="number" inputmode="decimal" value="' + esc(c.taxNhil || 2.5) + '"></div><div><label>GETFund %</label><input id="stg" type="number" inputmode="decimal" value="' + esc(c.taxGet || 2.5) + '"></div><div><label>Your TIN</label><input id="sti" value="' + esc(c.tin || '') + '"></div></div>' +
      '<p class="small muted" style="margin:4px 0 0">Ghana from 1 Jan 2026: VAT 15% + NHIL 2.5% + GETFund 2.5% on the same amount. Only add tax if you are VAT registered.</p>' +
      '<label>Invoice terms</label><textarea id="sit" rows="3" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit">' + esc(c.invTerms || '') + '</textarea>' +
      '<br><button class="btn primary block" data-act="dSettingsSave">Save</button>');
  };
  ACT.dSettingsSave = async (d, btn) => {
    const values = { docs: $('#sdocs').value, estDays: $('#sed').value, invDays: $('#sid').value, estTerms: $('#set').value, invTerms: $('#sit').value, taxVat: $('#stv').value, taxNhil: $('#stn').value, taxGet: $('#stg').value, tin: $('#sti').value };
    btn.disabled = true;
    try { const r = await api('admin', { op: 'saveSettings', values }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } if (S.cache && r.cfg) S.cache.cfg = r.cfg; toast('Saved'); closeSheet(); render(); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
})();
