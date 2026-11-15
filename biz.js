/* EasySales - demos and licence lock, sections on/off, Jobs, Money (stock, expenses, profit). */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, api, esc, money, r2, sum, kk, $, today, toast, sheet, closeSheet, errText, cfg, bizName } = KL;
  const render = k => KL.fn('render')(k);
  const PHONE = '020 320 7240', WA = '233203207240';
  const B = { jview: 'jobs', crew: null, types: ['Worker', 'Subcontractor', 'Apprentice'], jobs: null, cats: [], stages: [], stock: null, exp: null, expMonth: today().slice(0, 7), profit: null, mtab: 'stock', lic: null };
  const SECTIONS = [['sell', 'Sell & customers'], ['docs', 'Estimates, invoices, waybills'], ['est', 'Estimator (ceilings, POP, partitions)'], ['build', 'Construction extras (labour, transport, client buys materials, payment plan)'], ['jobs', 'Jobs'], ['stock', 'Stock'], ['money', 'Expenses & profit'], ['cash', 'Cash'], ['team', 'Team'], ['cards', 'Job cards (phone & laptop repairs, tailoring)'], ['leads', 'Leads (people from adverts: WhatsApp, Facebook) - owner only']];
  Object.assign(KL.ERR, { already_exists: 'That name is already on your list.', demo_ended: 'This demo has ended. Call ' + PHONE + ' to keep using EasySales.', licence_ended: 'Your EasySales subscription has ended. Your records are safe. Call ' + PHONE + ' to renew.', section_off: 'This section is not switched on for you.', vendor_only: 'Only EasySales can do that.', job_exists: 'A job was already started from this document.', bad_date: 'Check the date and time.' });

  KL.hasMod = m => !S.session || !S.session.mods || S.session.mods.indexOf(m) >= 0;
  KL.homeHas = c => !S.session || !S.session.home || S.session.home.indexOf(c) >= 0;
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
          const was = JSON.stringify([S.session.mods, S.session.ends, S.session.demo, S.session.vendor, S.session.home]);
          Object.assign(S.session, { mods: me.mods, ends: me.ends, demo: me.demo, vendor: me.vendor, paidUntil: me.paidUntil, home: me.home });
          KL.kvSet('session', S.session).catch(() => {});
          if (was !== JSON.stringify([me.mods, me.ends, me.demo, me.vendor, me.home])) render(true);
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


  /* ---------- type the access key every time the app is opened ---------- */
  (function keyGate() {
    let hiddenAt = 0;
    function show() {
      if (!(S.session && S.session.key) || document.getElementById('esgate')) return;
      const d = document.createElement('div'); d.id = 'esgate';
      d.style.cssText = 'position:fixed;inset:0;z-index:210;background:#F3F5F9;display:flex;align-items:center;justify-content:center;padding:24px';
      d.innerHTML = '<form id="esgf" style="width:100%;max-width:360px;text-align:center" autocomplete="off"><div style="font-size:46px">🔒</div><h2 style="margin:6px 0">' + esc(bizName()) + '</h2>' +
        '<p class="muted small" style="margin-top:0">Type your access key to open the app.</p>' +
        '<input id="esgk" type="password" autocomplete="off" placeholder="Access key" style="width:100%;text-align:center;font-size:18px;padding:12px;border:1.5px solid var(--line);border-radius:12px">' +
        '<p id="esge" class="red small" style="min-height:18px"></p><button class="btn primary block" type="submit">Open</button>' +
        '<p class="small muted" style="margin-top:18px">Forgot your key? Ask the shop owner.</p></form>';
      document.body.appendChild(d);
      const inp = d.querySelector('#esgk'); setTimeout(() => inp.focus(), 50);
      d.querySelector('#esgf').addEventListener('submit', async ev => {
        ev.preventDefault();
        const typed = inp.value.trim(), er = d.querySelector('#esge');
        if (typed === String(S.session.key).trim()) { d.remove(); return; }
        // not the key this phone signed in with: if it is a real key (for example a changed key), switch to it
        if (typed.length >= 4 && navigator.onLine) {
          er.textContent = 'Checking…';
          const old = S.session;
          try {
            S.session = { key: typed };
            const r = await KL.api('login');
            if (r.ok) {
              S.session = Object.assign({ key: typed }, r.user);
              await KL.kvSet('session', S.session);
              S.tab = S.session.role === 'admin' ? 'dash' : 'sell';
              d.remove(); KL.fn('render')(); KL.toast('Signed in as ' + (S.session.name || ''));
              try { const bb = await KL.api('bootstrap'); if (bb.ok) { S.cache = bb; KL.kvSet('cache', bb).catch(() => {}); KL.fn('render')(true); } } catch (x) { /* later */ }
              return;
            }
            S.session = old;
          } catch (e) { S.session = old; }
        }
        er.textContent = navigator.onLine ? 'Wrong key. Try again.' : 'Wrong key. (No internet, so only the key this phone signed in with works.)';
        inp.value = ''; inp.focus();
      });
    }
    // when the app starts with someone already signed in
    const t = setInterval(() => { if (!S.booted) return; clearInterval(t); if (!sessionStorage.getItem('es_autok')) show(); }, 50);
    // when the app comes back after being away for 5 minutes or more
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= 5 * 60 * 1000) show();
    });
  })();

  /* ---------- sign in from a link: ...?k=KEY&s=SERVER ---------- */
  (function autoLogin() {
    // the first visit reloads once when the offline copy installs, so the key is kept for this tab until it is used
    const q = new URLSearchParams(location.search);
    if (q.get('k')) { sessionStorage.setItem('es_autok', q.get('k')); if (q.get('s')) sessionStorage.setItem('es_autos', q.get('s')); }
    else if (q.get('s')) {   // link without the key: keep the server link, the person types the key
      const s0 = q.get('s');
      if (/^https:\/\/script\.google(usercontent)?\.com\//.test(s0)) { S.apiUrl = s0.split('?')[0]; localStorage.setItem(KL.LS('api'), S.apiUrl); }
      history.replaceState(null, '', location.pathname);
      const t0 = setInterval(() => { if (!S.booted) return; clearInterval(t0); if (!(S.session && S.session.key)) render(true); }, 100);
      return;
    }
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
    if (S.session && S.tab && !KL.fn('tabsFor')().some(x => x[0] === S.tab) && S.tab !== 'setup' && !['jobs', 'money', 'ctrl', 'leads'].includes(S.tab)) S.tab = isOwner() ? 'dash' : 'sell';
    _render(k);
    if (!S.session) return;
    const m = document.querySelector('main.wrap');
    if (S.session.demo && !document.getElementById('demobar')) {
      const top = document.querySelector('.top'); if (top) top.insertAdjacentHTML('afterend', '<div id="demobar" class="banner"><span>Demo · ends ' + esc(S.session.ends || '') + '</span><a class="btn sm" style="text-decoration:none;background:var(--wine);color:#fff" href="https://wa.me/' + WA + '?text=' + encodeURIComponent('Hello, I tried the EasySales demo and I want it for my business.') + '">Buy</a></div>');
    }
    if (!m) return;
    if (S.tab === 'jobs') m.innerHTML = jobsHTML();
    if (S.tab === 'money') m.innerHTML = moneyHTML();
    if (S.tab === 'setup' && isOwner() && !document.getElementById('xbulk')) m.insertAdjacentHTML('afterbegin', '<button id="xbulk" class="btn violet block" style="margin-top:6px" data-act="bulkOpen">Add many products from a list (with pictures)</button>');
    if (S.tab === 'ctrl') m.innerHTML = ctrlHTML();
    if (S.tab === 'dash' && isOwner() && KL.hasMod('stock') && !B.stock && !B.stockAsked && navigator.onLine) { B.stockAsked = 1; loadStock(); }
    if (S.tab === 'dash' && isOwner() && KL.hasMod('jobs') && KL.homeHas('jobs') && !B.jobs && !B.jobsAsked && navigator.onLine) { B.jobsAsked = 1; loadJobs(); }
  });
  // low stock goes into "Needs your attention" on Home
  KL.moreAttention = () => (B.stock || []).filter(p => p.low).slice(0, 4).map(p => ({ k: 'money', i: '▣', bg: '#FEE2E2', fg: '#B91C1C', a: esc(p.name), b: 'Low stock', amt: p.level + ' left', o: 1 }));

  /* ---------- JOBS ---------- */
  async function loadJobs() {
    try { const r = await api('biz', { op: 'jobs' }); if (r.ok) { B.jobs = r.jobs; B.cats = r.cats; B.stages = r.stages; B.crewNames = r.crew; B.types = r.types || B.types; } else toast(errText(r.error)); } catch (e) { toast('Needs internet'); }
    if (S.tab === 'jobs' || S.tab === 'dash') render(true);
  }
  async function loadCrew() {
    try { const r = await api('biz', { op: 'crew' }); if (r.ok) { B.crew = r.crew; B.types = r.types; } else toast(errText(r.error)); } catch (e) { toast('Needs internet'); }
    if (S.tab === 'jobs') render(true);
  }
  // the Jobs card on Home
  KL.jobsCard = () => {
    if (!KL.hasMod('jobs') || !B.jobs) return '';
    const open = B.jobs.filter(j => j.stage !== 'Completed');
    const collect = sum(B.jobs, j => Math.max(0, j.value - j.received)), owe = sum(B.jobs, j => sum(j.people || [], p => p.balance > 0 ? p.balance : 0));
    return '<div class="card" style="margin-top:16px"><div class="row between"><b>Jobs</b><button class="btn sm ghost" data-act="tab" data-t="jobs">Open</button></div><div class="tri" style="margin-top:6px">' +
      '<div style="background:#EDE9FE;color:#4C1D95"><span>Running</span><b>' + open.length + '</b></div>' +
      '<div style="background:#ECFDF3;color:#14532D"><span>To collect</span><b>' + money(collect) + '</b></div>' +
      '<div style="background:#FEF3C7;color:#78350F"><span>Owed to subs</span><b>' + money(owe) + '</b></div></div>' +
      open.slice(0, 3).map(j => '<button class="att" data-act="jOpenFromHome" data-no="' + esc(j.no) + '"><i style="background:#EDE9FE;color:#5B21B6">⌂</i><span class="grow"><b style="font-size:14px">' + esc(j.customer) + '</b><br><span class="small muted">' + esc(j.stage) + (j.title ? ' · ' + esc(j.title) : '') + '</span></span><b>' + money(j.value) + '</b></button>').join('') + '</div>';
  };
  ACT.jOpenFromHome = d => { S.tab = 'jobs'; render(); jobSheet(d.no); };
  const stageBadge = s => '<span class="badge ' + (s === 'Completed' ? 'green' : s === 'Not started' ? '' : 'amber') + '">' + esc(s) + '</span>';
  ACT.jView = d => { B.jview = d.k; render(true); if (d.k === 'crew') loadCrew(); else loadJobs(); };
  function jobsHTML() {
    let h = '<div class="chips" style="margin-top:6px"><button class="chip ' + (B.jview !== 'crew' ? 'on' : '') + '" data-act="jView" data-k="jobs">Jobs</button><button class="chip ' + (B.jview === 'crew' ? 'on' : '') + '" data-act="jView" data-k="crew">Workers &amp; subcontractors</button></div>';
    if (B.jview === 'crew') return h + crewHTML();
    h += '<button class="btn primary block" data-act="jNew" style="margin-top:6px">+ New job</button><p class="small muted">Tip: open an estimate or invoice and tap <b>Start job</b>.</p>';
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
      '<h3 style="margin-top:14px">Team on this job</h3>' + teamHTML(j) +
      '<div class="row" style="gap:8px;margin-top:6px"><button class="btn primary grow" data-act="pNew" data-job="' + esc(j.no) + '">Pay worker / sub</button><button class="btn grow" data-act="subNew" data-job="' + esc(j.no) + '">+ Subcontract price</button></div>' +
      '<button class="btn block" style="margin-top:8px" data-act="xNew" data-job="' + esc(j.no) + '">+ Other cost (materials, transport…)</button>' +
      (j.list.length ? '<div class="card" style="padding:4px 14px">' + j.list.map(x => '<div class="item"><span class="grow"><span class="nm">' + esc(x.cat) + '</span><br><span class="small muted">' + esc(x.date) + (x.to ? ' · ' + esc(x.to) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</span></span><span class="amt">' + money(x.amount) + '</span></div>').join('') + '</div>' : '') +
      '<h3 style="margin-top:14px">Site notes</h3>' + ((j.data.notes || []).slice().reverse().map(n => '<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)"><b>' + esc(n.d) + '</b> ' + esc(n.t) + '</div>').join('') || '<p class="small muted">No notes yet.</p>') +
      '<div class="row" style="margin-top:6px"><input id="jnote" class="grow" placeholder="Example: boards delivered, structure done"><button class="btn sm" data-act="jNote">Add</button></div>' +
      (j.from ? '<button class="btn ghost block" style="margin-top:10px" data-act="jDoc" data-no="' + esc(j.from) + '">Open ' + esc(j.from) + '</button>' : '') +
      j.invoices.filter(x => x !== j.from).map(x => '<button class="btn ghost block" style="margin-top:6px" data-act="jDoc" data-no="' + esc(x) + '">Open ' + esc(x) + '</button>').join(''));
  }
  ACT.jDoc = d => { closeSheet(); S.tab = 'docs'; render(); KL.docs.load().then(() => KL.docs.open(d.no)); };
  ACT.jStage = async d => { try { const r = await api('biz', { op: 'jobStage', no: B.job.no, stage: d.s }); if (!r.ok) { toast(errText(r.error)); return; } toast(d.s); await loadJobs(); jobSheet(B.job.no); } catch (e) { toast('Needs internet'); } };
  ACT.jNote = async () => { const t = $('#jnote').value.trim(); if (!t) return; try { await api('biz', { op: 'jobNote', no: B.job.no, note: t }); await loadJobs(); jobSheet(B.job.no); } catch (e) { toast('Needs internet'); } };

  /* ---------- workers and subcontractors ---------- */
  const typeBadge = t => '<span class="badge ' + (t === 'Subcontractor' ? 'amber' : t === 'Apprentice' ? '' : 'green') + '">' + esc(t) + '</span>';
  function teamHTML(j) {
    const P = j.people || [];
    if (!P.length) return '<p class="small muted">Nobody yet. Tap <b>Pay worker / sub</b> or <b>+ Subcontract price</b>.</p>';
    return '<div class="card" style="padding:4px 14px">' + P.map(p => '<div class="item" style="display:block"><div class="row between"><span><span class="nm">' + esc(p.name) + '</span> ' + typeBadge(p.type) + '</span><b>' + money(p.paid) + '</b></div>' +
      '<div class="small muted">' + (p.days ? p.days + ' day' + (p.days === 1 ? '' : 's') + ' · ' : '') + p.count + ' payment' + (p.count === 1 ? '' : 's') +
      (p.agreed !== null ? ' · agreed ' + money(p.agreed) + ' · <b class="' + (p.balance > 0.004 ? 'red' : 'green') + '">' + (p.balance > 0.004 ? 'still to pay ' + money(p.balance) : 'fully paid') + '</b>' : '') + '</div>' +
      '<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm grow" data-act="pNew" data-job="' + esc(j.no) + '" data-name="' + esc(p.name) + '">Pay</button>' + (p.type === 'Subcontractor' ? '<button class="btn sm grow" data-act="subNew" data-job="' + esc(j.no) + '" data-name="' + esc(p.name) + '">Agreed price</button>' : '') + '</div></div>').join('') +
      '<div class="row between" style="padding:8px 0"><b>Team total</b><b>' + money(sum(P, p => p.paid)) + '</b></div></div>';
  }
  function crewHTML() {
    let h = '<button class="btn primary block" data-act="cNew" style="margin-top:6px">+ Add worker or subcontractor</button>';
    if (!B.crew) return h + '<div class="empty">Loading…</div>';
    h += '<div class="stats"><div class="stat"><span>Paid to everyone</span><b style="font-size:16px">' + money(sum(B.crew, c => c.paid)) + '</b></div><div class="stat"><span>Still owed to subs</span><b style="font-size:16px" class="red">' + money(sum(B.crew, c => c.owed)) + '</b></div></div>';
    if (!B.crew.length) return h + '<div class="empty">Add the people you use, then pay them from a job.</div>';
    return h + '<div class="card" style="padding:4px 14px">' + B.crew.map(c => '<button class="item" data-act="cOpen" data-n="' + esc(c.name) + '"><span class="grow"><span class="nm">' + esc(c.name) + '</span> ' + typeBadge(c.type) + (c.active ? '' : ' <span class="badge">off</span>') + '<br><span class="small muted">' + esc([c.trade, c.phone].filter(Boolean).join(' · ')) + (c.jobs.length ? ' · ' + c.jobs.length + ' job' + (c.jobs.length === 1 ? '' : 's') : '') + '</span></span><span class="right"><span class="amt">' + money(c.paid) + '</span>' + (c.owed > 0.004 ? '<br><span class="small red">owed ' + money(c.owed) + '</span>' : '') + '</span></button>').join('') + '</div>';
  }
  function crewForm(c) {
    B.cEdit = c || null;
    sheet('<h2>' + (c ? 'Edit ' + esc(c.name) : 'New worker or subcontractor') + '</h2><label>Name</label><input id="cn" value="' + esc(c ? c.name : '') + '">' +
      '<label>Type</label><select id="ct">' + B.types.map(t => '<option' + (c && c.type === t ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>' +
      '<div class="picker"><div><label>Phone</label><input id="cp" inputmode="tel" value="' + esc(c ? c.phone : '') + '"></div><div><label>Daily rate (GH₵)</label><input id="cr" type="number" inputmode="decimal" value="' + esc(c && c.rate ? c.rate : '') + '"></div></div>' +
      '<label>Trade / skill</label><input id="cs" value="' + esc(c ? c.trade : '') + '" placeholder="Example: ceiling fixer, POP, electrician">' +
      (c ? '<label style="display:flex;gap:8px;align-items:center;font-weight:600;color:var(--ink)"><input id="ca" type="checkbox" style="width:auto;min-height:0"' + (c.active ? ' checked' : '') + '> Still working with us</label>' : '') +
      '<br><button class="btn primary block" data-act="cSave">Save</button>');
  }
  ACT.cNew = () => crewForm(null);
  ACT.cEditGo = () => crewForm(B.cView);
  ACT.cSave = async (d, btn) => {
    const name = $('#cn').value.trim(); if (!name) { toast('Enter the name'); return; }
    btn.disabled = true;
    try {
      const r = await api('biz', { op: 'crewSave', old: B.cEdit ? B.cEdit.name : '', name, type: $('#ct').value, phone: $('#cp').value, rate: +$('#cr').value || 0, trade: $('#cs').value, active: $('#ca') ? $('#ca').checked : true });
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
      B.crew = r.crew; B.crewNames = r.crew; toast('Saved'); closeSheet(); render(true);
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.cOpen = d => {
    const c = (B.crew || []).find(x => x.name === d.n); if (!c) return; B.cView = c;
    sheet('<h2>' + esc(c.name) + ' ' + typeBadge(c.type) + '</h2><p class="small muted" style="margin-top:0">' + esc([c.trade, c.phone, c.rate ? 'daily rate ' + money(c.rate) : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="stats"><div class="stat"><span>Paid in total</span><b style="font-size:16px">' + money(c.paid) + '</b></div><div class="stat"><span>' + (c.type === 'Subcontractor' ? 'Still owed' : 'Days worked') + '</span><b style="font-size:16px"' + (c.owed > 0.004 ? ' class="red"' : '') + '>' + (c.type === 'Subcontractor' ? money(c.owed) : c.days) + '</b></div></div>' +
      '<h3>By job</h3><div class="card" style="padding:4px 14px">' + (c.jobs.length ? c.jobs.map(j => '<div class="item" style="display:block"><div class="row between"><span class="nm">' + esc(j.no) + (j.customer ? ' · ' + esc(j.customer) : '') + '</span><b>' + money(j.paid) + '</b></div><div class="small muted">' + (j.title ? esc(j.title) + ' · ' : '') + (j.days ? j.days + ' days · ' : '') + (j.agreed !== null ? 'agreed ' + money(j.agreed) + ' · ' + (j.balance > 0.004 ? '<b class="red">still to pay ' + money(j.balance) + '</b>' : '<b class="green">fully paid</b>') : 'paid') + '</div></div>').join('') : '<div class="empty">Not paid on any job yet.</div>') + '</div>' +
      (c.phone ? '<a class="btn block" style="text-decoration:none;margin-top:8px" href="https://wa.me/' + waNum(c.phone) + '">WhatsApp ' + esc(c.name) + '</a>' : '') +
      '<button class="btn ghost block" style="margin-top:8px" data-act="cEditGo">Edit details</button>');
  };
  const waNum = p => { let n = String(p || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1); return n; };
  async function crewNames() { if (!B.crewNames) { try { const r = await api('biz', { op: 'crew' }); if (r.ok) { B.crewNames = r.crew; B.crew = r.crew; } } catch (e) { /* offline */ } } return (B.crewNames || []).filter(c => c.active !== false); }
  ACT.pNew = async d => {
    const people = await crewNames();
    if (!people.length) { toast('Add your workers first'); B.jview = 'crew'; closeSheet(); render(true); loadCrew(); crewForm(null); return; }
    B.payJob = d.job;
    sheet('<h2>Pay for ' + esc(d.job) + '</h2><label>Who</label><select id="pw">' + people.map(c => '<option value="' + esc(c.name) + '"' + (c.name === d.name ? ' selected' : '') + '>' + esc(c.name) + ' (' + esc(c.type) + ')</option>').join('') + '</select>' +
      '<div class="picker"><div><label>Amount (GH₵)</label><input id="pa" type="number" inputmode="decimal"></div><div><label>Days worked</label><input id="pd" type="number" inputmode="decimal" placeholder="optional"></div></div>' +
      '<div class="picker"><div><label>Date</label><input id="pt" type="date" value="' + today() + '"></div><div><label>Paid by</label><select id="pm"><option>Cash</option><option>MoMo</option><option>Bank</option></select></div></div>' +
      '<label>For (optional)</label><input id="pn" placeholder="Example: structure, 1st part payment"><br><button class="btn primary block" data-act="pSave">Save payment</button>');
    const fill = () => { const c = people.find(x => x.name === $('#pw').value); if (c && c.rate && $('#pd').value) $('#pa').value = r2(c.rate * +$('#pd').value); };
    $('#pd').addEventListener('input', fill); $('#pw').addEventListener('change', fill);
  };
  ACT.pSave = async (d, btn) => {
    const a = +$('#pa').value; if (!(a > 0)) { toast('Enter the amount'); return; }
    const who = (B.crewNames || []).find(x => x.name === $('#pw').value) || { name: $('#pw').value, type: 'Worker' };
    const cat = who.type === 'Subcontractor' ? 'Subcontractor' : who.type === 'Apprentice' ? 'Apprentice allowance' : 'Wages';
    const pay = { id: KL.uid('E'), cat, amount: a, days: +$('#pd').value || 0, date: $('#pt').value, to: who.name, job: B.payJob, note: [$('#pn').value.trim(), 'by ' + $('#pm').value].filter(Boolean).join(' · ') };
    btn.disabled = true;
    try {
      const r = await api('biz', Object.assign({ op: 'expSave' }, pay));
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
      toast('Paid ' + money(a) + ' to ' + who.name); B.crew = null; B.crewNames = null; B.exp = null; B.profit = null;
      await loadJobs(); const j = (B.jobs || []).find(x => x.no === B.payJob); const p = j && (j.people || []).find(x => x.name === who.name);
      voucherSheet(Object.assign({}, pay, { type: who.type, phone: who.phone, method: $('#pm') ? $('#pm').value : '' }), p, j);
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  // payment receipt the worker or subcontractor signs
  function voucherHTML(x, p, j) {
    const c = cfg(), c1 = c.c1 || '#7A1F3D', R = (a, b) => '<tr><td style="padding:6px 8px;color:#5B6B78;width:40%">' + a + '</td><td style="padding:6px 8px">' + b + '</td></tr>';
    return '<div class="paper" style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;font-size:13px;color:#1F2933">' +
      '<div style="display:flex;gap:10px;align-items:center"><img src="' + KL.logoSrc() + '" alt="" style="width:48px;height:48px;object-fit:contain"><div style="flex:1"><b style="color:' + esc(c1) + '">' + esc(bizName()) + '</b><div style="font-size:11px;color:#5B6B78">' + esc([c.location, c.phone].filter(Boolean).join(' · ')) + '</div></div><div style="text-align:right"><b style="color:' + esc(c1) + '">PAYMENT RECEIPT</b><div style="font-size:11px;color:#5B6B78">' + esc(x.date) + '</div></div></div>' +
      '<div style="height:3px;background:' + esc(c1) + ';margin:8px 0"></div><table style="width:100%;border-collapse:collapse">' + R('Paid to', '<b>' + esc(x.to) + '</b> (' + esc(x.type || '') + ')') + R('Job', esc(x.job) + (j ? ' · ' + esc(j.customer) : '')) + (x.days ? R('Days worked', x.days) : '') + (x.note ? R('For', esc(x.note)) : '') + '</table>' +
      '<div style="margin:12px 0 2px;color:#5B6B78">Amount paid</div><div style="font-size:24px;font-weight:800">' + money(x.amount) + '</div>' +
      (p && p.agreed !== null ? '<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px">' + R('Agreed price', money(p.agreed)) + R('Paid so far (with this)', money(p.paid)) + R('<b>Balance still to pay</b>', '<b>' + money(Math.max(0, p.balance)) + '</b>') + '</table>' : p && p.count > 1 ? '<div style="margin-top:8px">Total paid on this job: <b>' + money(p.paid) + '</b>' + (p.days ? ' for ' + p.days + ' days' : '') + '</div>' : '') +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:36px;font-size:11px;color:#5B6B78;text-align:center"><div style="border-top:1px solid #999;padding-top:4px">Received by (signature)</div><div style="border-top:1px solid #999;padding-top:4px">Paid by</div></div></div>';
  }
  function voucherSheet(x, p, j) {
    B.voucher = { x, p, j };
    sheet('<h2>Payment saved</h2>' + voucherHTML(x, p, j) + '<div class="row" style="margin-top:12px"><button class="btn grow" data-act="vPrint">Print / PDF</button><button class="btn grow" data-act="vWa">WhatsApp</button></div><button class="btn ghost block" style="margin-top:8px" data-act="vBack">Back to the job</button>');
  }
  ACT.vBack = () => jobSheet(B.voucher.x.job);
  ACT.vPrint = () => {
    let host = $('#printdoc'); if (host) host.remove(); host = document.createElement('div'); host.id = 'printdoc'; host.innerHTML = voucherHTML(B.voucher.x, B.voucher.p, B.voucher.j); document.body.appendChild(host);
    if (!$('#printcss')) { const st = document.createElement('style'); st.id = 'printcss'; st.textContent = '#printdoc{display:none}@media print{body>*:not(#printdoc){display:none!important}#printdoc{display:block!important;padding:10mm}#printdoc .paper{border:0!important}@page{size:A5;margin:10mm}}'; document.head.appendChild(st); }
    setTimeout(() => window.print(), 80);
  };
  ACT.vWa = () => {
    const { x, p } = B.voucher;
    const t = [bizName() + ' - payment', x.date, 'Paid to: ' + x.to, 'Job: ' + x.job, x.days ? 'Days: ' + x.days : '', 'Amount: ' + money(x.amount), p && p.agreed !== null ? 'Agreed: ' + money(p.agreed) + '\nPaid so far: ' + money(p.paid) + '\nBalance: ' + money(Math.max(0, p.balance)) : ''].filter(Boolean).join('\n');
    window.open('https://wa.me/' + waNum(x.phone) + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
  };
  ACT.subNew = async d => {
    const people = (await crewNames()).filter(c => c.type === 'Subcontractor');
    if (!people.length) { toast('Add a subcontractor first'); B.jview = 'crew'; closeSheet(); render(true); loadCrew(); crewForm({ name: '', type: 'Subcontractor', phone: '', trade: '', rate: 0, active: true }); B.cEdit = null; return; }
    const j = (B.jobs || []).find(x => x.no === d.job), cur = j && (j.people || []).find(p => p.name === d.name);
    B.subJob = d.job;
    sheet('<h2>Subcontract on ' + esc(d.job) + '</h2><p class="small muted" style="margin-top:0">The price you agreed with the subcontractor for this job. Payments are taken off it.</p><label>Subcontractor</label><select id="sw">' + people.map(c => '<option' + (c.name === d.name ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select>' +
      '<label>Agreed price (GH₵)</label><input id="sa" type="number" inputmode="decimal" value="' + esc(cur && cur.agreed !== null ? cur.agreed : '') + '"><label>Note</label><input id="sn" placeholder="Example: structure and boarding">' +
      '<br><button class="btn primary block" data-act="subSave">Save</button>' + (cur && cur.agreed !== null ? '<button class="btn ghost block" style="margin-top:8px" data-act="subSave" data-clear="1">Remove the agreed price</button>' : ''));
  };
  ACT.subSave = async (d, btn) => {
    const amt = d.clear ? '' : $('#sa').value; if (!d.clear && !(+amt > 0)) { toast('Enter the agreed price'); return; }
    btn.disabled = true;
    try { const r = await api('biz', { op: 'subPrice', job: B.subJob, name: $('#sw').value, amount: amt === '' ? '' : +amt, note: $('#sn') ? $('#sn').value : '' }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } toast('Saved'); B.crew = null; await loadJobs(); jobSheet(B.subJob); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };

  /* ---------- PASTE MANY PRODUCTS (+ pictures matched by file name) ---------- */
  const HEAD = { name: /^(name|product|item|items|description|product name)$/, price: /^(price|selling|selling price|sp|unit price|sale price)$/, cost: /^(cost|cost price|cp|buying|buying price)$/, cat: /^(group|category|cat|type|section)$/, qty: /^(qty|quantity|stock|opening|opening stock|in stock|count|pcs)$/ };
  function parseProducts(text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const tab = lines.some(l => l.indexOf('\t') >= 0);
    const split = l => (tab ? l.split('\t') : l.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').split(/\s*[,;|]\s*/)).map(x => x.trim().replace(/^GH₵\s*|^GHS\s*|^₵\s*/i, ''));
    let cols = null, start = 0;
    const first = split(lines[0]).map(x => x.toLowerCase());
    if (first.some(x => HEAD.name.test(x)) && first.some(x => HEAD.price.test(x) || HEAD.qty.test(x))) {
      cols = first.map(x => Object.keys(HEAD).find(k => HEAD[k].test(x)) || ''); start = 1;
    }
    const num = x => { const v = String(x || '').replace(/[^\d.]/g, ''); return v === '' ? '' : +v; };
    return lines.slice(start).map(l => {
      const f = split(l), o = { name: '', price: '', cost: '', cat: '', qty: '' };
      if (cols) cols.forEach((c, i) => { if (!c) return; o[c] = c === 'name' || c === 'cat' ? (f[i] || '') : num(f[i]); });
      else if (f.length === 1) { const m = l.match(/^(.*?)[\s\-:=]+(?:GH₵\s*)?(\d[\d,]*(?:\.\d+)?)\s*$/i); if (m) { o.name = m[1].trim(); o.price = num(m[2]); } else o.name = l; }
      else { o.name = f[0]; const nums = [], txt = []; f.slice(1).forEach(x => { if (/^\d[\d,]*(\.\d+)?$/.test(x.replace(/\s/g, ''))) nums.push(num(x)); else if (x) txt.push(x); }); o.price = nums[0] !== undefined ? nums[0] : ''; o.cost = nums[1] !== undefined ? nums[1] : ''; o.qty = nums[2] !== undefined ? nums[2] : ''; o.cat = txt[0] || ''; }
      o.name = String(o.name).trim(); return o;
    }).filter(o => o.name);
  }
  KL.parseProducts = parseProducts;
  const picKey = f => kk(String(f).replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' '));
  ACT.bulkOpen = () => {
    B.bulk = B.bulk || { text: '', files: [] };
    sheet('<h2>Add many products</h2><p class="small muted" style="margin-top:0">Paste the list from WhatsApp, Excel or Word. One product per line: <b>name, price, cost, group, quantity</b>. Only the name and price are needed.</p>' +
      '<div class="card small" style="line-height:1.7;margin:4px 0">Samsung A15 128GB, 1700, 1450, Phones, 5<br>Sellotape 2 inch, 15, 10, Tapes, 100<br>Charger Type-C - 60<br><span class="muted">From Excel: copy the columns with their headings (Name, Price, Cost, Group, Qty).</span></div>' +
      '<textarea id="bkt" rows="9" style="width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit" placeholder="Paste the list here">' + esc(B.bulk.text) + '</textarea>' +
      '<label>Pictures (optional)</label><p class="small muted" style="margin:0">Name each picture like the product, e.g. <b>Samsung A15 128GB.jpg</b>, then choose them all at once.</p><input id="bkf" type="file" accept="image/*" multiple>' +
      (B.bulk.files.length ? '<p class="small">' + B.bulk.files.length + ' picture' + (B.bulk.files.length === 1 ? '' : 's') + ' chosen</p>' : '') +
      '<br><button class="btn primary block" data-act="bulkPreview">Check the list</button>');
  };
  document.addEventListener('change', ev => { if (ev.target.id === 'bkf' && B.bulk) { B.bulk.text = $('#bkt').value; B.bulk.files = Array.from(ev.target.files || []).map(f => ({ key: picKey(f.name), file: f })); ACT.bulkOpen(); } });
  ACT.bulkPreview = () => {
    if ($('#bkt')) B.bulk.text = $('#bkt').value;
    const list = parseProducts(B.bulk.text);
    if (!list.length && !B.bulk.files.length) { toast('Paste the list first'); return; }
    const have = ((S.lists && S.lists.products) || (S.cache && S.cache.products) || []);
    const known = new Set(have.map(p => kk(p.name)).concat(list.map(p => kk(p.name))));
    const pics = {}; B.bulk.files.forEach(f => { if (known.has(f.key)) pics[f.key] = f; });
    const nopic = B.bulk.files.filter(f => !known.has(f.key)).map(f => f.file.name);
    B.bulk.list = list; B.bulk.pics = pics;
    const isNew = p => !have.some(x => kk(x.name) === kk(p.name)), bad = list.filter(p => p.price === '' && isNew(p));
    const N = x => x === '' ? '<span class="muted">–</span>' : esc(x);
    sheet('<h2>Check before saving</h2><p class="small" style="margin-top:0"><b>' + list.filter(isNew).length + '</b> new · <b>' + list.filter(p => !isNew(p)).length + '</b> already there (will be updated) · <b>' + Object.keys(pics).length + '</b> pictures matched' + (list.some(p => +p.qty > 0) ? ' · <b>' + sum(list, p => +p.qty || 0) + '</b> items into stock' : '') + '</p>' +
      (bad.length ? '<p class="small red">' + bad.length + ' new product' + (bad.length === 1 ? ' has' : 's have') + ' no price. They will be saved at 0: fix them in the list or later in Setup.</p>' : '') +
      (nopic.length ? '<p class="small amber">Pictures with no matching product: ' + nopic.slice(0, 8).map(esc).join(', ') + (nopic.length > 8 ? '…' : '') + '. Rename them like the product.</p>' : '') +
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:var(--lav)"><th style="text-align:left;padding:5px">Product</th><th style="text-align:right;padding:5px">Price</th><th style="text-align:right;padding:5px">Cost</th><th style="text-align:left;padding:5px">Group</th><th style="text-align:right;padding:5px">Qty</th><th style="padding:5px">Pic</th></tr>' +
      list.slice(0, 300).map(p => '<tr style="border-bottom:1px solid var(--line)"><td style="padding:5px">' + esc(p.name) + (isNew(p) ? ' <span class="badge green">new</span>' : '') + '</td><td style="text-align:right;padding:5px' + (p.price === '' && isNew(p) ? ';color:var(--red)' : '') + '">' + N(p.price) + '</td><td style="text-align:right;padding:5px">' + N(p.cost) + '</td><td style="padding:5px">' + N(p.cat) + '</td><td style="text-align:right;padding:5px">' + N(p.qty) + '</td><td style="text-align:center;padding:5px">' + (pics[kk(p.name)] ? '✓' : '') + '</td></tr>').join('') + '</table></div>' +
      (list.length > 300 ? '<p class="small muted">…and ' + (list.length - 300) + ' more</p>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn grow" data-act="bulkOpen">Back</button><button class="btn primary grow" data-act="bulkSave">Confirm and save</button></div><p class="small muted" id="bkprog"></p>');
  };
  ACT.bulkSave = async (d, btn) => {
    const B2 = B.bulk; btn.disabled = true; const prog = t => { const el = $('#bkprog'); if (el) el.textContent = t; };
    try {
      if (B2.list.length) {
        prog('Saving ' + B2.list.length + ' products…');
        const r = await api('biz', { op: 'bulkProducts', items: B2.list });
        if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
        if (r.lists) { S.lists = r.lists; KL.kvSet('lists', r.lists).catch(() => {}); }
        B2.result = r;
      }
      const keys = Object.keys(B2.pics), names = {}; ((S.lists && S.lists.products) || []).forEach(p => { names[kk(p.name)] = p.name; });
      let done = 0, failed = 0;
      for (const k of keys) {
        prog('Pictures: ' + (done + 1) + ' of ' + keys.length + '…');
        try {
          let data = await KL.shrinkImage(B2.pics[k].file, 320); if (data.length > 48000) data = await KL.shrinkImage(B2.pics[k].file, 220);
          const r = await api('admin', { op: 'savePhoto', name: names[k] || B2.pics[k].key, data }); if (!r.ok) failed++;
        } catch (e) { failed++; }
        done++;
      }
      if (keys.length && KL.loadPhotos) await KL.loadPhotos(true);
      KL.refreshCache && KL.refreshCache(); B.stock = null;
      const res = B2.result || {};
      B.bulk = null; closeSheet(); render(true); if (S.tab === 'money') loadMoney();
      toast((res.added || 0) + ' new, ' + (res.updated || 0) + ' updated' + (keys.length ? ', ' + (keys.length - failed) + ' pictures' : '') + (res.stocked ? ', stock added' : '') + (failed ? ' (' + failed + ' pictures failed)' : ''));
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };

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
      h += '<div class="row" style="gap:8px;margin:6px 0"><button class="btn primary grow" data-act="sIn">+ Stock in</button><button class="btn grow" data-act="sCount">Count stock</button></div><button class="btn violet block" data-act="bulkOpen" style="margin-bottom:6px">Add many products from a list</button>';
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
  const HOME = [['today', 'Sales today card'], ['qa', 'Quick actions'], ['jobs', 'Jobs card (running, to collect, owed to subs)'], ['week', 'This week sales chart'], ['att', 'Needs your attention'], ['reports', 'Sales reports (sales persons, months)']];
  const homeTicks = (sel, pre) => '<div class="card" style="padding:4px 12px;margin-top:4px">' + HOME.map(x => '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;font-weight:600;color:var(--ink)"><input type="checkbox" data-' + pre + '="' + x[0] + '" style="width:auto;min-height:0"' + (sel.indexOf(x[0]) >= 0 ? ' checked' : '') + '> ' + x[1] + '</label>').join('') + '</div>';
  const picked = pre => Array.from(document.querySelectorAll('[data-' + pre + ']')).filter(e => e.checked).map(e => e.dataset[pre]);
  const toLocal = s => String(s || '').replace(' ', 'T');
  const appLink = () => location.origin + location.pathname + '?s=' + encodeURIComponent(S.apiUrl);
  function ctrlHTML() {
    const L = B.lic; if (!L) return '<div class="empty">Loading…</div>';
    let h = '<h2 style="margin-top:6px">This shop: ' + esc(bizName()) + '</h2><div class="card">' + ticks(L.mods, 'lm') +
      '<label>Home screen shows</label>' + homeTicks(L.home, 'lh') +
      '<label>Paid until (empty = no limit)</label><input id="lpu" type="datetime-local" value="' + esc(toLocal(L.paidUntil)) + '">' +
      '<p class="small muted">When this time passes, the shop sees "Subscription ended" and the app locks. Their records stay safe.</p><button class="btn primary block" data-act="lSave">Save</button></div>';
    h += '<div class="row between"><h2>Demos</h2><button class="btn sm primary" data-act="dmNew">+ New demo</button></div><p class="small muted" style="margin-top:0">Each demo person gets their own copy of this shop (your products and pictures, no sales). Nobody sees anybody else.</p><div class="card" style="padding:4px 14px">' +
      (L.demos.length ? L.demos.slice().reverse().map(x => { const on = x.active && x.ends > L.now; return '<button class="item" data-act="dmOpen" data-k="' + esc(x.key) + '"><span class="grow"><span class="nm">' + esc(x.name) + '</span><br><span class="small muted">' + esc(x.phone) + ' · ends ' + esc(x.ends) + '</span></span><span class="badge ' + (on ? 'green' : 'red') + '">' + (on ? 'On' : x.active ? 'Ended' : 'Off') + '</span></button>'; }).join('') : '<div class="empty">No demos yet.</div>') + '</div>';
    return h;
  }
  ACT.lSave = async (d, btn) => {
    btn.disabled = true;
    try { const r = await api('biz', { op: 'licSet', mods: picked('lm'), home: picked('lh'), paidUntil: $('#lpu').value }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } B.lic = r; toast('Saved'); render(true); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  function demoSheet(x) {
    const end = new Date(Date.now() + 3 * 864e5); end.setHours(18, 0, 0, 0);
    const def = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0') + 'T18:00';
    B.dm = x || null;
    sheet('<h2>' + (x ? 'Demo: ' + esc(x.name) : 'New demo') + '</h2><label>Name / business</label><input id="dmn" value="' + esc(x ? x.name : '') + '" placeholder="Example: Kofi Tapes, Kasoa"><label>WhatsApp number</label><input id="dmp" inputmode="tel" value="' + esc(x ? x.phone : '') + '">' +
      '<label>What they can see</label>' + ticks(x ? x.mods : ['sell', 'docs', 'cash'], 'dm') +
      '<label>Their Home screen shows</label>' + homeTicks(x ? x.home : ['today', 'qa', 'week', 'att'], 'dh') +
      '<label>Demo ends</label><input id="dme" type="datetime-local" value="' + esc(x ? toLocal(x.ends) : def) + '"><label>Note</label><input id="dmt" value="' + esc(x ? x.note : '') + '">' +
      (x ? '<label style="display:flex;gap:8px;align-items:center;font-weight:600;color:var(--ink)"><input id="dma" type="checkbox" style="width:auto;min-height:0"' + (x.active ? ' checked' : '') + '> Switched on</label>' : '') +
      '<br><button class="btn primary block" data-act="dmSave">' + (x ? 'Save' : 'Create demo') + '</button>' + (x ? '<button class="btn violet block" style="margin-top:8px" data-act="dmShare" data-k="' + esc(x.key) + '">Send link on WhatsApp</button><button class="btn danger block" style="margin-top:8px" data-act="dmDel" data-k="' + esc(x.key) + '">Delete demo and its copy</button>' : '') +
      (x ? '' : '<p class="small muted">Creating a demo makes a copy of this shop. It takes a few seconds.</p>'));
  }
  ACT.dmNew = () => demoSheet(null);
  ACT.dmOpen = d => demoSheet(B.lic.demos.find(x => x.key === d.k));
  ACT.dmSave = async (d, btn) => {
    const name = $('#dmn').value.trim(); if (!name) { toast('Enter the name'); return; }
    btn.disabled = true; btn.textContent = B.dm ? 'Saving…' : 'Making their copy…';
    try {
      const r = await api('biz', { op: 'demoSave', dkey: B.dm ? B.dm.key : '', name, phone: $('#dmp').value, mods: picked('dm'), home: picked('dh'), ends: $('#dme').value, note: $('#dmt').value, active: $('#dma') ? $('#dma').checked : true });
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
      B.lic = r; render(true); toast('Saved'); demoSheet(r.demos.find(x => x.key === r.key));
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.dmDel = async (d, btn) => {
    if (!confirm('Delete this demo and everything they entered?')) return;
    btn.disabled = true;
    try { const r = await api('biz', { op: 'demoDel', dkey: d.k }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } B.lic = r; closeSheet(); render(true); toast(r.trashed ? 'Demo deleted' : 'Demo removed. Delete its copy in Google Drive yourself.'); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.dmShare = d => {
    const x = B.lic.demos.find(y => y.key === d.k); if (!x) return;
    const msg = 'Hello ' + x.name + ', here is your EasySales demo.\n\n1. Open this link in Chrome:\n' + appLink() + '\n\n2. Your access key: ' + x.key + '\nType it to sign in. The app asks for it each time you open it, so keep it safe and private.\n\nThe demo is open until ' + x.ends + '. Add it to your home screen to use it like an app.\n\nEasySales · ' + PHONE;
    let n = String(x.phone || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1);
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  };
})();
