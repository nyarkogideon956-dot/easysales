/* EasySales - demos and licence lock, sections on/off, Jobs, Money (stock, expenses, profit). */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, api, esc, money, r2, sum, $, today, toast, sheet, closeSheet, errText, cfg, bizName } = KL;
  const render = k => KL.fn('render')(k);
  const PHONE = '020 320 7240', WA = '233203207240';
  const B = { jobs: null, cats: [], stages: [], stock: null, exp: null, expMonth: today().slice(0, 7), profit: null, mtab: 'stock', lic: null };
  const SECTIONS = [['sell', 'Sell & customers'], ['docs', 'Estimates, invoices, waybills'], ['est', 'Estimator (ceilings, POP, partitions)'], ['jobs', 'Jobs'], ['stock', 'Stock'], ['money', 'Expenses & profit'], ['cash', 'Cash'], ['team', 'Team']];
  Object.assign(KL.ERR, { demo_ended: 'This demo has ended. Call ' + PHONE + ' to keep using EasySales.', licence_ended: 'Your EasySales subscription has ended. Your records are safe. Call ' + PHONE + ' to renew.', section_off: 'This section is not switched on for you.', vendor_only: 'Only EasySales can do that.', job_exists: 'A job was already started from this document.', bad_date: 'Check the date and time.' });

  KL.hasMod = m => !S.session || !S.session.mods || S.session.mods.indexOf(m) >= 0;
  const isOwner = () => S.session && S.session.role === 'admin';

  /* ---------- keep the session's sections up to date, and lock when time is up ---------- */
  const ofetch = window.fetch.bind(window);
  window.fetch = async function (u, o) {
    const res = await ofetch(u, o);
    if (S.apiUrl && String(u).indexOf(S.apiUrl) === 0) {
      res.clone().json().then(j => {
        if (!j) return;
        if (j.error === 'demo_ended' || j.error === 'licence_ended') lock(j.error);
        const me = j.me || (j.ok && j.user);
        if (me && S.session && S.session.key) {
          const was = JSON.stringify([S.session.mods, S.session.ends, S.session.demo, S.session.vendor]);
          Object.assign(S.session, { mods: me.mods, ends: me.ends, demo: me.demo, vendor: me.vendor, paidUntil: me.paidUntil });
          KL.kvSet('session', S.session).catch(() => {});
          if (was !== JSON.stringify([me.mods, me.ends, me.demo, me.vendor])) render(true);
        }
      }).catch(() => {});
    }
    return res;
  };
  function lock(code) {
    if (document.getElementById('eslock')) return;
    const d = document.createElement('div'); d.id = 'eslock';
    d.style.cssText = 'position:fixed;inset:0;z-index:200;background:#F3F5F9;display:flex;align-items:center;justify-content:center;padding:24px';
    d.innerHTML = '<div style="max-width:380px;text-align:center"><div style="font-size:46px">🔒</div><h2>' + (code === 'demo_ended' ? 'Your demo has ended' : 'Subscription ended') + '</h2><p class="muted">' + esc(KL.ERR[code]) + '</p>' +
      '<a class="btn primary block" style="text-decoration:none;margin-top:10px" href="https://wa.me/' + WA + '?text=' + encodeURIComponent('Hello, I want to continue with EasySales (' + bizName() + ').') + '">WhatsApp ' + PHONE + '</a>' +
      '<a class="btn block" style="text-decoration:none;margin-top:8px" href="tel:0203207240">Call ' + PHONE + '</a><button class="btn ghost block" style="margin-top:8px" data-act="logout">Sign out</button></div>';
    document.body.appendChild(d);
  }
  const _logout = ACT.logout; ACT.logout = d => { const l = document.getElementById('eslock'); if (l) l.remove(); return _logout(d); };

  /* ---------- sign in from a link: ...?k=KEY&s=SERVER ---------- */
  (function autoLogin() {
    // the first visit reloads once when the offline copy installs, so the key is kept for this tab until it is used
    const q = new URLSearchParams(location.search);
    if (q.get('k')) { sessionStorage.setItem('es_autok', q.get('k')); if (q.get('s')) sessionStorage.setItem('es_autos', q.get('s')); }
    const k = sessionStorage.getItem('es_autok'), s = sessionStorage.getItem('es_autos');
    if (!k) return;
    if (s && /^https:\/\/script\.google(usercontent)?\.com\//.test(s)) { S.apiUrl = s.split('?')[0]; localStorage.setItem(KL.LS('api'), S.apiUrl); }
    if (location.search) history.replaceState(null, '', location.pathname);
    let tries = 0, seen = 0;
    const t = setInterval(() => {
      tries++;
      if (!S.booted) return;
      if (S.session && S.session.key) { clearInterval(t); sessionStorage.removeItem('es_autok'); sessionStorage.removeItem('es_autos'); if (S.session.key !== k) toast('You are already signed in. Sign out first to use this link.'); return; }
      const el = $('#lkey');
      seen = el && S.apiUrl && S.booted ? seen + 1 : 0;   // wait until the app has finished starting
      if (seen >= 3) { clearInterval(t); sessionStorage.removeItem('es_autok'); sessionStorage.removeItem('es_autos'); el.value = k; const b = $('#lbtn'); if (b) b.click(); }
      if (tries > 100) clearInterval(t);
    }, 100);
  })();

  /* ---------- tabs ---------- */
  ICON.jobs = '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V10l7-6 7 6v11"/><path d="M9 21v-6h6v6"/></svg>';
  ICON.money = '<svg viewBox="0 0 24 24"><path d="M3 7h18v12H3z"/><path d="M3 11h18M7 15h3"/></svg>';
  ICON.ctrl = '<svg viewBox="0 0 24 24"><path d="M12 2l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1z"/></svg>';
  const MOD_OF = { sell: 'sell', today: 'sell', history: 'sell', custs: 'sell', docs: 'docs', jobs: 'jobs', money: null, cash: 'cash', team: 'team' };
  const _tabsFor = KL.fn('tabsFor');
  KL.setFn('tabsFor', function () {
    let t = _tabsFor();
    if (isOwner()) {
      const at = t.findIndex(x => x[0] === 'team'); const add = [['jobs', 'Jobs'], ['money', 'Money']];
      t.splice(at >= 0 ? at : t.length, 0, ...add);
      if (S.session.vendor) t.push(['ctrl', 'EasySales']);
    }
    return t.filter(x => x[0] === 'money' ? (KL.hasMod('stock') || KL.hasMod('money')) : !MOD_OF[x[0]] || KL.hasMod(MOD_OF[x[0]]));
  });
  const _tab = ACT.tab;
  ACT.tab = d => { _tab(d); if (d.t === 'jobs') loadJobs(); if (d.t === 'money') loadMoney(); if (d.t === 'ctrl') loadLic(); };
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    if (S.session && S.tab && !KL.fn('tabsFor')().some(x => x[0] === S.tab) && S.tab !== 'setup' && !['jobs', 'money', 'ctrl'].includes(S.tab)) S.tab = isOwner() ? 'dash' : 'sell';
    _render(k);
    if (!S.session) return;
    const m = document.querySelector('main.wrap');
    if (S.session.demo && !document.getElementById('demobar')) {
      const top = document.querySelector('.top'); if (top) top.insertAdjacentHTML('afterend', '<div id="demobar" class="banner"><span>Demo · ends ' + esc(S.session.ends || '') + '</span><a class="btn sm" style="text-decoration:none;background:var(--wine);color:#fff" href="https://wa.me/' + WA + '?text=' + encodeURIComponent('Hello, I tried the EasySales demo and I want it for my business.') + '">Buy</a></div>');
    }
    if (!m) return;
    if (S.tab === 'jobs') m.innerHTML = jobsHTML();
    if (S.tab === 'money') m.innerHTML = moneyHTML();
    if (S.tab === 'ctrl') m.innerHTML = ctrlHTML();
    if (S.tab === 'dash' && isOwner() && KL.hasMod('stock') && !B.stock && !B.stockAsked && navigator.onLine) { B.stockAsked = 1; loadStock(); }
  });
  // low stock goes into "Needs your attention" on Home
  KL.moreAttention = () => (B.stock || []).filter(p => p.low).slice(0, 4).map(p => ({ k: 'money', i: '▣', bg: '#FEE2E2', fg: '#B91C1C', a: esc(p.name), b: 'Low stock', amt: p.level + ' left', o: 1 }));

  /* ---------- JOBS ---------- */
  async function loadJobs() {
    try { const r = await api('biz', { op: 'jobs' }); if (r.ok) { B.jobs = r.jobs; B.cats = r.cats; B.stages = r.stages; } else toast(errText(r.error)); } catch (e) { toast('Needs internet'); }
    if (S.tab === 'jobs') render(true);
  }
  const stageBadge = s => '<span class="badge ' + (s === 'Completed' ? 'green' : s === 'Not started' ? '' : 'amber') + '">' + esc(s) + '</span>';
  function jobsHTML() {
    let h = '<button class="btn primary block" data-act="jNew" style="margin-top:6px">+ New job</button><p class="small muted">Tip: open an estimate or invoice and tap <b>Start job</b>.</p>';
    if (!B.jobs) return h + '<div class="empty">' + (navigator.onLine ? 'Loading…' : 'Needs internet.') + '</div>';
    const open = B.jobs.filter(j => j.stage !== 'Completed');
    h += '<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><span>Running</span><b>' + open.length + '</b></div><div class="stat"><span>Value</span><b style="font-size:15px">' + money(sum(open, j => j.value)) + '</b></div><div class="stat"><span>Profit so far</span><b style="font-size:15px" class="green">' + money(sum(B.jobs, j => j.value - j.costTotal)) + '</b></div></div>';
    if (!B.jobs.length) return h + '<div class="empty">No jobs yet.</div>';
    return h + '<div class="card" style="padding:4px 14px">' + B.jobs.map(j => '<button class="item" data-act="jOpen" data-no="' + esc(j.no) + '"><span class="grow"><span class="nm">' + esc(j.customer) + '</span><br><span class="small muted">' + esc(j.no) + (j.title ? ' · ' + esc(j.title) : '') + (j.site ? ' · ' + esc(j.site) : '') + '</span></span><span class="right"><span class="amt">' + money(j.value) + '</span><br>' + stageBadge(j.stage) + '</span></button>').join('') + '</div>';
  }
  ACT.jNew = () => sheet('<h2>New job</h2><label>Customer</label><input id="jc"><label>Phone</label><input id="jp" inputmode="tel"><label>Site / location</label><input id="js"><label>Job</label><input id="jt" placeholder="Example: 3 rooms plasterboard ceiling"><label>Agreed price (GH₵)</label><input id="jv" type="number" inputmode="decimal"><br><button class="btn primary block" data-act="jNewSave">Start job</button>');
  ACT.jNewSave = async (d, btn) => {
    btn.disabled = true;
    try { const r = await api('biz', { op: 'jobStart', customer: $('#jc').value, phone: $('#jp').value, site: $('#js').value, title: $('#jt').value, value: +$('#jv').value || 0 }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } toast('Job ' + r.no + ' started'); await loadJobs(); jobSheet(r.no); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  KL.jobBtn = doc => (KL.hasMod('jobs') && ['EST', 'PF', 'INV'].includes(doc.type)) ? '<button class="btn violet block" data-act="jFromDoc" data-no="' + esc(doc.no) + '">Start job</button>' : '';
  ACT.jFromDoc = async (d, btn) => {
    btn.disabled = true;
    try {
      const r = await api('biz', { op: 'jobStart', from: d.no });
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
      toast('Job ' + r.no + ' started'); S.tab = 'jobs'; render(); await loadJobs(); jobSheet(r.no);
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.jOpen = d => jobSheet(d.no);
  function jobSheet(no) {
    const j = (B.jobs || []).find(x => x.no === no); if (!j) return;
    B.job = j;
    const L = (a, b, c) => '<div class="row between" style="padding:4px 0"><span>' + a + '</span><b' + (c ? ' class="' + c + '"' : '') + '>' + b + '</b></div>';
    sheet('<h2>' + esc(j.no) + ' · ' + esc(j.customer) + '</h2><p class="small muted" style="margin-top:0">' + esc([j.title, j.site, j.phone].filter(Boolean).join(' · ')) + (j.started ? '<br>Started ' + esc(j.started) : '') + (j.finished ? ' · finished ' + esc(j.finished) : '') + '</p>' +
      '<div class="chips">' + B.stages.map(s => '<button class="chip ' + (s === j.stage ? 'on' : '') + '" data-act="jStage" data-s="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' +
      '<div class="card">' + L('Agreed price', money(j.value)) + L('Received from client', money(j.received), 'green') + L('Still to collect', money(Math.max(0, j.value - j.received)), j.value - j.received > 0.004 ? 'red' : '') + '<hr style="border:0;border-top:1px solid var(--line)">' +
      Object.keys(j.costs).map(c => L(esc(c), money(j.costs[c]))).join('') + L('Total costs', money(j.costTotal)) + '<div class="row between" style="padding:6px 0 0;font-size:18px"><b>Profit</b><b class="' + (j.value - j.costTotal >= 0 ? 'green' : 'red') + '">' + money(j.value - j.costTotal) + '</b></div></div>' +
      '<button class="btn primary block" data-act="xNew" data-job="' + esc(j.no) + '">+ Add cost (materials, wages, transport…)</button>' +
      (j.list.length ? '<div class="card" style="padding:4px 14px">' + j.list.map(x => '<div class="item"><span class="grow"><span class="nm">' + esc(x.cat) + '</span><br><span class="small muted">' + esc(x.date) + (x.to ? ' · ' + esc(x.to) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</span></span><span class="amt">' + money(x.amount) + '</span></div>').join('') + '</div>' : '') +
      '<h3 style="margin-top:14px">Site notes</h3>' + ((j.data.notes || []).slice().reverse().map(n => '<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)"><b>' + esc(n.d) + '</b> ' + esc(n.t) + '</div>').join('') || '<p class="small muted">No notes yet.</p>') +
      '<div class="row" style="margin-top:6px"><input id="jnote" class="grow" placeholder="Example: boards delivered, structure done"><button class="btn sm" data-act="jNote">Add</button></div>' +
      (j.from ? '<button class="btn ghost block" style="margin-top:10px" data-act="jDoc" data-no="' + esc(j.from) + '">Open ' + esc(j.from) + '</button>' : '') +
      j.invoices.filter(x => x !== j.from).map(x => '<button class="btn ghost block" style="margin-top:6px" data-act="jDoc" data-no="' + esc(x) + '">Open ' + esc(x) + '</button>').join(''));
  }
  ACT.jDoc = d => { closeSheet(); S.tab = 'docs'; render(); KL.docs.load().then(() => KL.docs.open(d.no)); };
  ACT.jStage = async d => { try { const r = await api('biz', { op: 'jobStage', no: B.job.no, stage: d.s }); if (!r.ok) { toast(errText(r.error)); return; } toast(d.s); await loadJobs(); jobSheet(B.job.no); } catch (e) { toast('Needs internet'); } };
  ACT.jNote = async () => { const t = $('#jnote').value.trim(); if (!t) return; try { await api('biz', { op: 'jobNote', no: B.job.no, note: t }); await loadJobs(); jobSheet(B.job.no); } catch (e) { toast('Needs internet'); } };

  /* ---------- MONEY: stock, expenses, profit ---------- */
  function loadMoney() { if (B.mtab === 'stock') loadStock(); else if (B.mtab === 'exp') loadExp(); else loadProfit(); }
  async function loadStock() { try { const r = await api('biz', { op: 'stock' }); if (r.ok) B.stock = r.list; } catch (e) { /* offline */ } if (S.tab === 'money' || S.tab === 'dash') render(true); }
  async function loadExp() { try { const r = await api('biz', { op: 'expenses', month: B.expMonth }); if (r.ok) { B.exp = r.list; B.cats = r.cats; } } catch (e) { /* offline */ } if (S.tab === 'money') render(true); }
  async function loadProfit() { try { const r = await api('biz', { op: 'profit', month: B.expMonth }); if (r.ok) B.profit = r; else toast(errText(r.error)); } catch (e) { /* offline */ } if (S.tab === 'money') render(true); }
  ACT.mTab = d => { B.mtab = d.k; render(true); loadMoney(); };
  document.addEventListener('change', ev => { if (ev.target.id === 'mmonth') { B.expMonth = ev.target.value || today().slice(0, 7); B.exp = null; B.profit = null; render(true); loadMoney(); } });
  function moneyHTML() {
    const tabs = [['stock', 'Stock', 'stock'], ['exp', 'Expenses', 'money'], ['profit', 'Profit', 'money']].filter(x => KL.hasMod(x[2]));
    if (!tabs.some(x => x[0] === B.mtab)) B.mtab = tabs.length ? tabs[0][0] : 'stock';
    let h = '<div class="chips" style="margin-top:6px">' + tabs.map(x => '<button class="chip ' + (B.mtab === x[0] ? 'on' : '') + '" data-act="mTab" data-k="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    if (B.mtab !== 'stock') h += '<label>Month</label><input id="mmonth" type="month" value="' + esc(B.expMonth) + '">';
    if (B.mtab === 'stock') {
      h += '<div class="row" style="gap:8px;margin:6px 0"><button class="btn primary grow" data-act="sIn">+ Stock in</button><button class="btn grow" data-act="sCount">Count stock</button></div>';
      if (!B.stock) return h + '<div class="empty">Loading…</div>';
      const tr = B.stock.filter(p => p.tracked), un = B.stock.filter(p => !p.tracked);
      h += '<div class="stats"><div class="stat"><span>Stock value (cost)</span><b style="font-size:17px">' + money(sum(tr, p => Math.max(0, p.level) * p.cost)) + '</b></div><div class="stat"><span>Low</span><b class="' + (tr.some(p => p.low) ? 'red' : '') + '">' + tr.filter(p => p.low).length + '</b></div></div>';
      h += '<div class="card" style="padding:4px 14px">' + (tr.length ? tr.map(p => '<div class="item"><span class="grow"><span class="nm">' + esc(p.name) + '</span><br><span class="small muted">in ' + p.in + ' · sold ' + p.sold + (p.adj ? ' · counted ' + (p.adj > 0 ? '+' : '') + p.adj : '') + (p.cost ? ' · cost ' + money(p.cost) : ' · <span class="amber">no cost price</span>') + '</span></span><span class="right"><b class="' + (p.low ? 'red' : '') + '" style="font-size:18px">' + p.level + '</b><br>' + (p.low ? '<span class="badge red">low</span>' : '<span class="small muted">left</span>') + '</span></div>').join('') : '<div class="empty">Tap + Stock in when goods arrive.</div>') + '</div>';
      if (un.length) h += '<p class="small muted">Not counted yet: ' + un.map(p => esc(p.name)).join(', ') + '</p>';
      return h;
    }
    if (B.mtab === 'exp') {
      h += '<button class="btn primary block" data-act="xNew" data-job="" style="margin-top:8px">+ Add expense</button>';
      if (!B.exp) return h + '<div class="empty">Loading…</div>';
      const by = {}; B.exp.forEach(x => { by[x.cat] = r2((by[x.cat] || 0) + x.amount); });
      h += '<div class="card"><div class="row between"><b>Total</b><b>' + money(sum(B.exp, x => x.amount)) + '</b></div>' + Object.keys(by).sort((a, b) => by[b] - by[a]).map(c => '<div class="row between small" style="padding:3px 0"><span>' + esc(c) + '</span><span>' + money(by[c]) + '</span></div>').join('') + '</div>';
      return h + '<div class="card" style="padding:4px 14px">' + (B.exp.length ? B.exp.map(x => '<button class="item" data-act="xOpen" data-id="' + esc(x.id) + '"><span class="grow"><span class="nm">' + esc(x.cat) + '</span><br><span class="small muted">' + esc(x.date) + (x.job ? ' · ' + esc(x.job) : '') + (x.to ? ' · ' + esc(x.to) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</span></span><span class="amt">' + money(x.amount) + '</span></button>').join('') : '<div class="empty">No expenses this month.</div>') + '</div>';
    }
    const p = B.profit; if (!p) return h + '<div class="empty">Loading…</div>';
    const L = (a, b, c, st) => '<div class="row between" style="padding:5px 0' + (st ? ';' + st : '') + '"><span>' + a + '</span><b' + (c ? ' class="' + c + '"' : '') + '>' + b + '</b></div>';
    h += '<div class="card">' + L('Sales', money(p.sales)) + (p.tax ? L('Less tax collected (goes to GRA)', '- ' + money(p.tax), 'muted') : '') + L('Less cost of goods sold', '- ' + money(p.cogs), 'muted') + L('Gross profit', money(p.gross), '', 'border-top:1px solid var(--line)') +
      Object.keys(p.byCat).map(c => L('Less ' + esc(c), '- ' + money(p.byCat[c]), 'muted')).join('') +
      '<div class="row between" style="padding:8px 0 0;font-size:20px;border-top:2px solid var(--ink);margin-top:4px"><b>Profit</b><b class="' + (p.profit >= 0 ? 'green' : 'red') + '">' + money(p.profit) + '</b></div></div>';
    h += '<p class="small muted">Cost of goods uses the cost price of each product (Setup → Products, or the last Stock in). Labour and transport you charge are counted as income. "Stock for the shop" and "Owner drawings" are not counted as expenses here: stock is counted when it is sold.</p>';
    if (p.noCost.length) h += '<p class="small amber">No cost price yet: ' + p.noCost.map(esc).join(', ') + '. Add it so the profit is right.</p>';
    return h;
  }
  const prodOpts = () => ((S.lists && S.lists.products) || (S.cache && S.cache.products) || []).map(p => '<option>' + esc(p.name) + '</option>').join('');
  ACT.sIn = () => sheet('<h2>Stock in</h2><label>Product</label><select id="sp">' + prodOpts() + '</select><div class="picker"><div><label>Quantity</label><input id="sq" type="number" inputmode="decimal"></div><div><label>Cost per unit (GH₵)</label><input id="sc" type="number" inputmode="decimal" placeholder="optional"></div></div><label>Note (supplier, invoice no.)</label><input id="sn"><br><button class="btn primary block" data-act="sSave" data-k="stockIn">Save</button>');
  ACT.sCount = () => sheet('<h2>Count stock</h2><p class="small muted" style="margin-top:0">Type what is really on the shelf. The difference is recorded.</p><label>Product</label><select id="sp">' + prodOpts() + '</select><label>Counted quantity</label><input id="sq" type="number" inputmode="decimal"><label>Note</label><input id="sn" placeholder="optional"><br><button class="btn primary block" data-act="sSave" data-k="stockCount">Save</button>');
  ACT.sSave = async (d, btn) => {
    const q = $('#sq').value; if (q === '') { toast('Enter the quantity'); return; }
    btn.disabled = true;
    try { const r = await api('biz', { op: d.k, id: KL.uid('S'), product: $('#sp').value, qty: +q, cost: $('#sc') ? +$('#sc').value || 0 : 0, note: $('#sn').value }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } B.stock = r.list; toast('Saved'); closeSheet(); render(true); KL.refreshCache && KL.refreshCache(); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.xNew = async d => {
    if (!B.cats.length) { try { const r = await api('biz', { op: 'expenses', month: B.expMonth }); if (r.ok) B.cats = r.cats; } catch (e) { /* offline */ } }
    if (!B.jobs && KL.hasMod('jobs')) { try { const r = await api('biz', { op: 'jobs' }); if (r.ok) { B.jobs = r.jobs; B.stages = r.stages; } } catch (e) { /* offline */ } }
    const jobs = (B.jobs || []).filter(j => j.stage !== 'Completed' || j.no === d.job);
    sheet('<h2>' + (d.job ? 'Cost for ' + esc(d.job) : 'New expense') + '</h2><label>What for</label><select id="xc">' + (B.cats.length ? B.cats : ['Other']).map(c => '<option>' + esc(c) + '</option>').join('') + '</select>' +
      '<div class="picker"><div><label>Amount (GH₵)</label><input id="xa" type="number" inputmode="decimal"></div><div><label>Date</label><input id="xd" type="date" value="' + today() + '"></div></div>' +
      '<label>Paid to (optional)</label><input id="xt" placeholder="Worker, supplier, driver">' +
      (KL.hasMod('jobs') ? '<label>Job (optional)</label><select id="xj"><option value="">No job</option>' + jobs.map(j => '<option value="' + esc(j.no) + '"' + (j.no === d.job ? ' selected' : '') + '>' + esc(j.no + ' · ' + j.customer) + '</option>').join('') + '</select>' : '') +
      '<label>Note</label><input id="xn"><br><button class="btn primary block" data-act="xSave">Save</button>');
  };
  ACT.xSave = async (d, btn) => {
    const a = +$('#xa').value; if (!(a > 0)) { toast('Enter the amount'); return; }
    btn.disabled = true; const job = $('#xj') ? $('#xj').value : '';
    try {
      const r = await api('biz', { op: 'expSave', id: KL.uid('E'), cat: $('#xc').value, amount: a, date: $('#xd').value, to: $('#xt').value, job, note: $('#xn').value });
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
      toast('Saved'); closeSheet(); B.exp = null; B.profit = null;
      if (job) { await loadJobs(); if (S.tab === 'jobs') jobSheet(job); } if (S.tab === 'money') loadMoney();
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.xOpen = d => { const x = (B.exp || []).find(e => e.id === d.id); if (!x) return; B.x = x; sheet('<h2>' + esc(x.cat) + ' · ' + money(x.amount) + '</h2><p class="muted">' + esc([x.date, x.to, x.job, x.note, 'by ' + x.by].filter(Boolean).join(' · ')) + '</p><label>Reason for deleting</label><input id="xr" placeholder="Example: entered twice"><br><button class="btn danger block" data-act="xDel">Delete</button>'); };
  ACT.xDel = async (d, btn) => { const reason = $('#xr').value.trim(); if (reason.length < 3) { toast('Please give a reason'); return; } btn.disabled = true; try { const r = await api('biz', { op: 'expDel', id: B.x.id, reason }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } toast('Deleted'); closeSheet(); B.exp = null; B.profit = null; loadMoney(); } catch (e) { toast('Needs internet'); btn.disabled = false; } };

  /* ---------- EASYSALES CONTROL (vendor only): this shop's licence + demos ---------- */
  async function loadLic() { try { const r = await api('biz', { op: 'lic' }); if (r.ok) B.lic = r; else toast(errText(r.error)); } catch (e) { toast('Needs internet'); } if (S.tab === 'ctrl') render(true); }
  const ticks = (sel, pre) => SECTIONS.map(x => '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;font-weight:600;color:var(--ink)"><input type="checkbox" data-' + pre + '="' + x[0] + '" style="width:auto;min-height:0"' + (sel.indexOf(x[0]) >= 0 ? ' checked' : '') + '> ' + x[1] + '</label>').join('');
  const picked = pre => Array.from(document.querySelectorAll('[data-' + pre + ']')).filter(e => e.checked).map(e => e.dataset[pre]);
  const toLocal = s => String(s || '').replace(' ', 'T');
  const appLink = key => location.origin + location.pathname + '?k=' + encodeURIComponent(key) + '&s=' + encodeURIComponent(S.apiUrl);
  function ctrlHTML() {
    const L = B.lic; if (!L) return '<div class="empty">Loading…</div>';
    let h = '<h2 style="margin-top:6px">This shop: ' + esc(bizName()) + '</h2><div class="card">' + ticks(L.mods, 'lm') +
      '<label>Paid until (empty = no limit)</label><input id="lpu" type="datetime-local" value="' + esc(toLocal(L.paidUntil)) + '">' +
      '<p class="small muted">When this time passes, the shop sees "Subscription ended" and the app locks. Their records stay safe.</p><button class="btn primary block" data-act="lSave">Save</button></div>';
    h += '<div class="row between"><h2>Demos</h2><button class="btn sm primary" data-act="dmNew">+ New demo</button></div><p class="small muted" style="margin-top:0">Demo people use this sheet. Fill it with sample products so it looks real.</p><div class="card" style="padding:4px 14px">' +
      (L.demos.length ? L.demos.slice().reverse().map(x => { const on = x.active && x.ends > L.now; return '<button class="item" data-act="dmOpen" data-k="' + esc(x.key) + '"><span class="grow"><span class="nm">' + esc(x.name) + '</span><br><span class="small muted">' + esc(x.phone) + ' · ends ' + esc(x.ends) + '</span></span><span class="badge ' + (on ? 'green' : 'red') + '">' + (on ? 'On' : x.active ? 'Ended' : 'Off') + '</span></button>'; }).join('') : '<div class="empty">No demos yet.</div>') + '</div>';
    return h;
  }
  ACT.lSave = async (d, btn) => {
    btn.disabled = true;
    try { const r = await api('biz', { op: 'licSet', mods: picked('lm'), paidUntil: $('#lpu').value }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } B.lic = r; toast('Saved'); render(true); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  function demoSheet(x) {
    const end = new Date(Date.now() + 3 * 864e5); end.setHours(18, 0, 0, 0);
    const def = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0') + 'T18:00';
    B.dm = x || null;
    sheet('<h2>' + (x ? 'Demo: ' + esc(x.name) : 'New demo') + '</h2><label>Name / business</label><input id="dmn" value="' + esc(x ? x.name : '') + '" placeholder="Example: Kofi Tapes, Kasoa"><label>WhatsApp number</label><input id="dmp" inputmode="tel" value="' + esc(x ? x.phone : '') + '">' +
      '<label>What they can see</label>' + ticks(x ? x.mods : ['sell', 'docs', 'cash'], 'dm') +
      '<label>Demo ends</label><input id="dme" type="datetime-local" value="' + esc(x ? toLocal(x.ends) : def) + '"><label>Note</label><input id="dmt" value="' + esc(x ? x.note : '') + '">' +
      (x ? '<label style="display:flex;gap:8px;align-items:center;font-weight:600;color:var(--ink)"><input id="dma" type="checkbox" style="width:auto;min-height:0"' + (x.active ? ' checked' : '') + '> Switched on</label>' : '') +
      '<br><button class="btn primary block" data-act="dmSave">' + (x ? 'Save' : 'Create demo') + '</button>' + (x ? '<button class="btn violet block" style="margin-top:8px" data-act="dmShare" data-k="' + esc(x.key) + '">Send link on WhatsApp</button>' : ''));
  }
  ACT.dmNew = () => demoSheet(null);
  ACT.dmOpen = d => demoSheet(B.lic.demos.find(x => x.key === d.k));
  ACT.dmSave = async (d, btn) => {
    const name = $('#dmn').value.trim(); if (!name) { toast('Enter the name'); return; }
    btn.disabled = true;
    try {
      const r = await api('biz', { op: 'demoSave', dkey: B.dm ? B.dm.key : '', name, phone: $('#dmp').value, mods: picked('dm'), ends: $('#dme').value, note: $('#dmt').value, active: $('#dma') ? $('#dma').checked : true });
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
      B.lic = r; render(true); toast('Saved'); demoSheet(r.demos.find(x => x.key === r.key));
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.dmShare = d => {
    const x = B.lic.demos.find(y => y.key === d.k); if (!x) return;
    const msg = 'Hello ' + x.name + ', here is your EasySales demo. Tap the link to open it (no password needed):\n' + appLink(x.key) + '\n\nIt is open until ' + x.ends + '. Add it to your home screen to use it like an app.\n\nEasySales · ' + PHONE;
    let n = String(x.phone || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1);
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  };
})();
