/* EasySales - demos and licence lock, sections on/off, Jobs, Money (stock, expenses, profit). */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, api, esc, money, r2, sum, kk, $, today, toast, sheet, closeSheet, errText, cfg, bizName } = KL;
  const render = k => KL.fn('render')(k);
  const PHONE = '020 320 7240', WA = '233203207240';
  const B = { jview: 'jobs', crew: null, types: ['Worker', 'Subcontractor', 'Apprentice'], jobs: null, cats: [], stages: [], stock: null, exp: null, expMonth: today().slice(0, 7), profit: null, mtab: 'stock', lic: null };
  const SECTIONS = [['sell', 'Sell & customers'], ['docs', 'Estimates, invoices, waybills'], ['est', 'Estimator (ceilings, POP, partitions)'], ['build', 'Construction extras (labour, transport, client buys materials, payment plan)'], ['jobs', 'Jobs'], ['stock', 'Stock'], ['money', 'Expenses & profit'], ['cash', 'Cash'], ['team', 'Team'], ['cards', 'Job cards (phone & laptop repairs, tailoring)'], ['leads', 'Leads (people from adverts: WhatsApp, Facebook) - owner only'], ['tools', 'Tools register (who has which tool)'], ['income', 'Other income (money that is not a sale)'], ['target', 'Monthly sales target on Home']];
  Object.assign(KL.ERR, { already_exists: 'That name is already on your list.', demo_ended: 'This demo has ended. Call ' + PHONE + ' to keep using EasySales.', licence_ended: 'Your EasySales subscription has ended. Your records are safe. Call ' + PHONE + ' to renew.', section_off: 'This section is not switched on for you.', vendor_only: 'Only EasySales can do that.', job_exists: 'A job was already started from this document.', bad_date: 'Check the date and time.' });

  KL.hasMod = m => !S.session || !S.session.mods || S.session.mods.indexOf(m) >= 0;
  // the sales cards on Home never show when the Sell section is off
  KL.homeHas = c => !S.session || (['today', 'week', 'reports', 'att'].indexOf(c) >= 0 && !KL.hasMod('sell') ? false : (!S.session.home || S.session.home.indexOf(c) >= 0));
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
    const KEEP = 'es_keep_' + (location.pathname.split('/').filter(Boolean)[0] || 'app');
    const kept = () => { try { return !!(S.session && S.session.key && localStorage.getItem(KEEP) === String(S.session.key)); } catch (e) { return false; } };
    const keep = on => { try { if (on) localStorage.setItem(KEEP, String(S.session.key)); else localStorage.removeItem(KEEP); } catch (e) { /* private window */ } };
    KL.keepSignedIn = { on: kept, set: keep };
    function show() {
      if (!(S.session && S.session.key) || document.getElementById('esgate') || kept()) return;
      const d = document.createElement('div'); d.id = 'esgate';
      d.style.cssText = 'position:fixed;inset:0;z-index:210;background:#F3F5F9;display:flex;align-items:center;justify-content:center;padding:24px';
      d.innerHTML = '<form id="esgf" style="width:100%;max-width:360px;text-align:center" autocomplete="off"><div style="font-size:46px">🔒</div><h2 style="margin:6px 0">' + esc(bizName()) + '</h2>' +
        '<p class="muted small" style="margin-top:0">Type your access key to open the app.</p>' +
        '<input id="esgk" type="password" autocomplete="off" placeholder="Access key" style="width:100%;text-align:center;font-size:18px;padding:12px;border:1.5px solid var(--line);border-radius:12px">' +
        '<label style="display:flex;gap:8px;align-items:center;justify-content:center;margin-top:10px;font-weight:600;color:var(--ink)"><input id="esgkeep" type="checkbox" style="width:20px;height:20px;min-height:0"> Keep me signed in on this phone</label>' +
        '<p class="small muted" style="margin:2px 0 0">Only on your own phone or laptop.</p>' +
        '<p id="esge" class="red small" style="min-height:18px"></p><button class="btn primary block" type="submit">Open</button>' +
        '<p class="small muted" style="margin-top:18px">Forgot your key? Ask the shop owner.</p></form>';
      document.body.appendChild(d);
      const inp = d.querySelector('#esgk'); setTimeout(() => inp.focus(), 50);
      d.querySelector('#esgf').addEventListener('submit', async ev => {
        ev.preventDefault();
        const typed = inp.value.trim(), er = d.querySelector('#esge');
        const wantKeep = d.querySelector('#esgkeep').checked;
        if (typed === String(S.session.key).trim()) { keep(wantKeep); d.remove(); return; }
        // not the key this phone signed in with: if it is a real key (for example a changed key), switch to it
        if (typed.length >= 4 && navigator.onLine) {
          er.textContent = 'Checking…';
          const old = S.session;
          try {
            S.session = { key: typed };
            const r = await KL.api('login');
            if (r.ok) {
              S.session = Object.assign({ key: typed }, r.user);
              await KL.kvSet('session', S.session); keep(wantKeep);
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
    if (S.session && S.tab && !KL.fn('tabsFor')().some(x => x[0] === S.tab) && S.tab !== 'setup' && !['jobs', 'money', 'ctrl', 'leads', 'appr', 'tools'].includes(S.tab)) S.tab = isOwner() ? 'dash' : 'sell';
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
    if (S.tab === 'dash' && isOwner() && !B.loans && !B.loansAsked) { B.loansAsked = 1; if (navigator.onLine) loadLoans(); else KL.kvGet('loans').then(c => { if (c) { B.loans = c; render(true); } }).catch(() => {}); }
  });
  // low stock goes into "Needs your attention" on Home
  KL.moreAttention = () => (B.stock || []).filter(p => p.low).slice(0, 4).map(p => ({ k: 'money', i: '▣', bg: '#FEE2E2', fg: '#B91C1C', a: esc(p.name), b: 'Low stock', amt: p.level + ' left', o: 1 })).concat(isOwner() ? (B.loans || []).filter(x => x.balance > 0.004 && x.due && x.due <= dueSoon()).slice(0, 4).map(x => ({ k: 'money', i: '₵', bg: '#FFF7ED', fg: '#9A3412', a: esc(x.person), b: (x.dir === 'gave' ? 'Should pay me' : 'I must pay') + ' · ' + (x.due < today() ? 'late since ' : 'due ') + esc(x.due), amt: money(x.balance), o: 1 })) : []);

  /* ---------- JOBS ---------- */
  async function jobsFromCopy() {
    try { const c = await KL.kvGet('jobs'); if (c && c.jobs && !B.jobs) { B.jobs = c.jobs; B.cats = c.cats || B.cats; B.stages = c.stages || B.stages; B.crewNames = c.crew || B.crewNames; B.types = c.types || B.types; B.jobsAt = c.at || 0; } } catch (e) { /* none */ }
  }
  async function loadJobs() {
    try { const r = await api('biz', { op: 'jobs' }); if (r.ok) { B.jobs = r.jobs; B.cats = r.cats; B.stages = r.stages; B.crewNames = r.crew; B.types = r.types || B.types; B.jobsAt = Date.now(); KL.kvSet('jobs', { jobs: r.jobs, cats: r.cats, stages: r.stages, crew: r.crew, types: r.types, at: B.jobsAt }).catch(() => {}); } else toast(errText(r.error)); } catch (e) { if (!B.jobs) await jobsFromCopy(); if (!B.jobs) toast('No saved copy yet. Open Jobs once with internet.'); }
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
    if (!B.jobs && !B.jobsTried) { B.jobsTried = 1; jobsFromCopy().then(() => { if (B.jobs && S.tab === 'jobs') render(true); }); }
    if (!B.jobs) return h + '<div class="empty">' + (navigator.onLine ? 'Loading…' : 'No saved copy yet. Open Jobs once with internet.') + '</div>';
    if (!navigator.onLine && B.jobsAt) h += '<p class="small muted" style="margin:4px 0">No internet. Showing the copy saved at ' + new Date(B.jobsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.</p>';
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
  /* ---------- fast saves: the change shows at once, Google is updated in the background ---------- */
  const TEAMCAT = ['Wages', 'Subcontractor', 'Apprentice allowance'];
  let refreshT = null;
  const sheetJob = () => { const h = document.querySelector('[data-jobno]'); return h ? h.dataset.jobno : ''; };
  function quietRefresh() {
    clearTimeout(refreshT);
    refreshT = setTimeout(async () => {
      try { const r = await api('biz', { op: 'jobs' }); if (!r.ok) return; B.jobs = r.jobs; B.cats = r.cats || B.cats; B.stages = r.stages || B.stages; B.crewNames = r.crew || B.crewNames; } catch (e) { return; }
      const open = sheetJob(); if (open) jobSheet(open, true); else if (S.tab === 'jobs' || S.tab === 'dash') render(true);
    }, 1500);
  }
  KL.bgSaves = 0;
  function bgSend(body, label, retry) {
    KL.bgSaves++; if (KL.paintSave) KL.paintSave();
    const go = n => api('biz', body).then(r => { if (!r.ok) toast(label + ' was NOT saved: ' + errText(r.error)); return r; })
      .catch(e => { if (retry && n < 3) return new Promise(res => setTimeout(res, 3000 * (n + 1))).then(() => go(n + 1)); toast(label + ' was NOT saved (no internet). Please enter it again.'); });
    return go(0).finally(() => { KL.bgSaves--; if (KL.paintSave) KL.paintSave(); quietRefresh(); });
  }
  const fast = () => navigator.onLine;
  const J = no => (B.jobs || []).find(x => x.no === no);
  function addCostLocal(j, x, type) {
    j.list = [x].concat(j.list || []); j.costs = j.costs || {}; j.costs[x.cat] = r2((j.costs[x.cat] || 0) + x.amount);
    j.costTotal = r2(j.costTotal + x.amount); j.profit = r2(j.value - j.costTotal); j.cashProfit = r2((j.cashProfit || 0) - x.amount);
    if (x.to && (TEAMCAT.includes(x.cat) || type)) {
      let p = (j.people || []).find(q => kk(q.name) === kk(x.to));
      if (!p) { p = { name: x.to, type: type || 'Worker', phone: '', days: 0, paid: 0, count: 0, agreed: null, changes: [] }; j.people = (j.people || []).concat([p]); }
      p.paid = r2(p.paid + x.amount); p.count++; p.days = r2((p.days || 0) + (x.days || 0)); if (p.agreed !== null) p.balance = r2(p.agreed - p.paid);
      return p;
    }
    return null;
  }

  /* ---------- the job: 4 small tabs ---------- */
  const isTeam = (j, x) => x.to && TEAMCAT.includes(x.cat) || (j.people || []).some(p => x.to && kk(p.name) === kk(x.to));
  function jobSheet(no, keep) {
    const j = J(no); if (!j) return;
    if (!B.job || B.job.no !== no) B.jtab = 'sum';
    B.job = j; const t = B.jtab || 'sum';
    const L = (a, b, c, st) => '<div class="row between" style="padding:5px 0' + (st ? ';' + st : '') + '"><span>' + a + '</span><b' + (c ? ' class="' + c + '"' : '') + '>' + b + '</b></div>';
    const left = r2(Math.max(0, j.value - j.received)), P = j.people || [], owed = sum(P, p => p.balance > 0.004 ? p.balance : 0);
    const tabs = [['sum', 'Summary'], ['client', 'Client'], ['team', 'Team' + (P.length ? ' ' + P.length : '')], ['costs', 'Costs']];
    let h = '<div data-jobno="' + esc(j.no) + '"></div><h2 style="margin-bottom:2px">' + esc(j.no) + ' · ' + esc(j.customer) + '</h2><p class="small muted" style="margin-top:0">' + esc([j.title, j.site, j.phone].filter(Boolean).join(' · ')) + (j.started ? '<br>Started ' + esc(j.started) : '') + (j.finished ? ' · finished ' + esc(j.finished) : '') + '</p>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;background:#EEF2F6;padding:4px;border-radius:12px;margin-bottom:10px">' + tabs.map(x => '<button data-act="jTab" data-t="' + x[0] + '" style="border:0;border-radius:9px;padding:9px 2px;font:inherit;font-size:13.5px;font-weight:700;' + (t === x[0] ? 'background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)' : 'background:transparent;color:var(--mute)') + '">' + x[1] + '</button>').join('') + '</div>';
    if (t === 'sum') {
      h += '<div class="chips">' + B.stages.map(s => '<button class="chip ' + (s === j.stage ? 'on' : '') + '" data-act="jStage" data-s="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' +
        '<div class="card">' + L('Agreed price', money(j.value)) + L('Received from client', money(j.received), 'green') + L('Still to collect', money(left), left > 0.004 ? 'red' : '') + L('Total costs', money(j.costTotal)) + (owed ? L('Still owed to subcontractors', money(owed), 'red') : '') +
        '<div class="row between" style="padding:8px 0 0;margin-top:4px;border-top:1px solid var(--line);font-size:17px"><b>Profit if fully paid</b><b class="' + (j.value - j.costTotal >= 0 ? 'green' : 'red') + '">' + money(j.value - j.costTotal) + '</b></div>' +
        '<div class="row between small" style="padding-top:2px"><span class="muted">Cash profit so far (received − spent)</span><b class="' + ((j.cashProfit || 0) >= 0 ? 'green' : 'red') + '">' + money(j.cashProfit || 0) + '</b></div></div>' +
        '<button class="btn primary block" data-act="jAdd" data-no="' + esc(j.no) + '">＋ Add (payment, worker, cost…)</button>' +
        '<h3 style="margin-top:14px">Site notes</h3>' + ((j.data.notes || []).slice().reverse().slice(0, 4).map(n => '<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)"><b>' + esc(n.d) + '</b> ' + esc(n.t) + '</div>').join('') || '<p class="small muted">No notes yet.</p>') +
        '<div class="row" style="margin-top:6px"><input id="jnote" class="grow" placeholder="Example: boards delivered, structure done"><button class="btn sm" data-act="jNote">Add</button></div>' +
        (j.from ? '<button class="btn ghost block" style="margin-top:10px" data-act="jDoc" data-no="' + esc(j.from) + '">Open ' + esc(j.from) + '</button>' : '') +
        j.invoices.filter(x => x !== j.from).map(x => '<button class="btn ghost block" style="margin-top:6px" data-act="jDoc" data-no="' + esc(x) + '">Open ' + esc(x) + '</button>').join('');
    } else if (t === 'client') {
      h += '<div class="card">' + L('Agreed price', money(j.value)) + chgHTML(j, '') + L('Received', money(j.received), 'green') + L('Still to collect', money(left), left > 0.004 ? 'red' : '') + '</div>' +
        '<div class="row" style="gap:8px"><button class="btn primary grow" style="background:#16A34A;border-color:#16A34A" data-act="jPay" data-no="' + esc(j.no) + '">Client paid</button><button class="btn grow" data-act="pcNew" data-no="' + esc(j.no) + '" data-who="">Change price</button></div>' +
        (KL.growJobBtns ? KL.growJobBtns(j) : '') +
        '<h3 style="margin-top:14px">Payments from the client</h3>' + ((j.pays || []).length ? '<div class="card" style="padding:2px 14px">' + j.pays.slice().reverse().map(x => '<div class="item"><span class="grow"><span class="small muted">' + esc(x.date || 'before') + ' · ' + (x.cash && x.momo ? 'cash + MoMo' : x.momo ? 'MoMo' : 'cash') + (x.ref !== j.no ? ' · ' + esc(x.ref) : '') + '</span></span><b class="green">' + money(x.cash + x.momo) + '</b></div>').join('') + '</div>' : '<p class="small muted">Nothing paid yet.</p>');
    } else if (t === 'team') {
      h += '<div class="row" style="gap:8px"><button class="btn primary grow" data-act="pNew" data-job="' + esc(j.no) + '">Pay worker / sub</button><button class="btn grow" data-act="subNew" data-job="' + esc(j.no) + '">Agreed price</button></div>' +
        (P.length ? '<div class="card" style="padding:2px 14px;margin-top:10px">' + P.map(p => '<button class="item" data-act="jPerson" data-n="' + esc(p.name) + '"><span class="grow"><span class="nm">' + esc(p.name) + '</span> ' + typeBadge(p.type) + '<br><span class="small ' + (p.agreed !== null && p.balance > 0.004 ? 'red' : 'muted') + '">' +
          (p.agreed !== null ? (p.balance > 0.004 ? 'still to pay ' + money(p.balance) + ' of ' + money(p.agreed) : 'fully paid · ' + money(p.agreed)) : (p.days ? p.days + ' day' + (p.days === 1 ? '' : 's') + ' · ' : '') + p.count + ' payment' + (p.count === 1 ? '' : 's')) + '</span></span><b>' + money(p.paid) + '</b></button>').join('') +
          '<div class="row between" style="padding:8px 0"><b>Team total</b><b>' + money(sum(P, p => p.paid)) + '</b></div></div><p class="small muted">Tap a name to see each payment, pay again or change the price.</p>' : '<p class="small muted" style="margin-top:10px">Nobody yet.</p>');
    } else {
      const own = (j.list || []).filter(x => !isTeam(j, x)), teamSum = sum((j.list || []).filter(x => isTeam(j, x)), x => x.amount), G = {};
      own.forEach(x => { (G[x.cat] = G[x.cat] || []).push(x); });
      h += '<div class="row" style="gap:8px"><button class="btn primary grow" data-act="xNew" data-job="' + esc(j.no) + '">+ Other cost</button>' + (KL.hasMod('stock') ? '<button class="btn grow" data-act="jStk" data-no="' + esc(j.no) + '">+ From my stock</button>' : '') + '</div>' +
        '<div class="card" style="padding:2px 14px;margin-top:10px">' +
        (teamSum ? '<button class="item" data-act="jTab" data-t="team"><span class="grow"><span class="nm">Workers &amp; subcontractors</span><br><span class="small muted">see the Team tab</span></span><b>' + money(teamSum) + '</b></button>' : '') +
        Object.keys(G).sort((a, b) => sum(G[b], x => x.amount) - sum(G[a], x => x.amount)).map(c => '<details style="border-bottom:1px solid var(--line)"><summary class="row between" style="padding:11px 0;cursor:pointer;list-style:none"><span><span class="nm">' + esc(c) + '</span> <span class="small muted">· ' + G[c].length + '</span></span><b>' + money(sum(G[c], x => x.amount)) + ' ▾</b></summary>' +
          G[c].map(x => '<div class="row between small" style="padding:5px 0 5px 10px"><span class="muted">' + esc(x.date) + (x.to ? ' · ' + esc(x.to) : '') + (x.note ? ' · ' + esc(x.note) : '') + '</span><span>' + money(x.amount) + '</span></div>').join('') + '</details>').join('') +
        (!teamSum && !own.length ? '<div class="empty">No costs yet.</div>' : '') +
        '<div class="row between" style="padding:10px 0"><b>Total costs</b><b>' + money(j.costTotal) + '</b></div></div>';
    }
    sheet(h);
  }
  ACT.jAgree = d => {
    const j = B.job, p = j && (j.people || []).find(q => q.name === d.n); if (!p || p.agreed === null) return;
    const x = { to: p.name, job: j.no, amount: p.agreed, date: today(), note: p.note || (j.subNotes && j.subNotes[p.name]) || '' };
    B.voucher = { x, p, j, agree: true };
    sheet('<h2>Agreed price · ' + esc(p.name) + '</h2><p class="small muted" style="margin-top:0">Send this to ' + esc(p.name) + ' so you both have the amount in writing before the work starts.</p>' +
      '<div class="card"><div class="row between"><span>Job</span><b>' + esc(j.no) + ' · ' + esc(j.customer) + '</b></div><div class="row between" style="margin-top:4px"><span>Agreed price</span><b style="font-size:20px">' + money(p.agreed) + '</b></div>' + (p.paid ? '<div class="row between small" style="margin-top:4px"><span>Already paid</span><b>' + money(p.paid) + '</b></div>' : '') + '</div>' +
      '<button class="btn primary block" style="background:#16A34A;border-color:#16A34A" data-act="vPic">Send agreed price picture (WhatsApp)</button>' +
      '<button class="btn ghost block" style="margin-top:8px" data-act="jPerson" data-n="' + esc(p.name) + '">Back</button>');
  };
  ACT.jSlip = d => {
    const j = B.job, p = j && (j.people || []).find(q => q.name === d.n), x = j && (j.list || []).find(e => e.id === d.id); if (!x || !p) return;
    const m = String(x.note || '').match(/by (Cash|MoMo|Bank)/i), note = String(x.note || '').replace(/\s*·?\s*by (Cash|MoMo|Bank)\s*/i, '').trim();
    voucherSheet(Object.assign({}, x, { job: j.no, type: p.type, phone: p.phone, method: m ? m[1] : '', note }), p, j);
  };
  ACT.jTab = d => { B.jtab = d.t; if (B.job) jobSheet(B.job.no, true); };
  ACT.jAdd = d => {
    const j = J(d.no); if (!j) return;
    const it = (act, icon, title, sub, extra) => '<button class="item" data-act="' + act + '" ' + extra + '><span style="font-size:22px;width:34px">' + icon + '</span><span class="grow"><span class="nm">' + title + '</span><br><span class="small muted">' + sub + '</span></span><span class="muted">›</span></button>';
    const no = 'data-no="' + esc(j.no) + '" data-job="' + esc(j.no) + '"';
    sheet('<h2>Add to ' + esc(j.no) + '</h2><div class="card" style="padding:2px 14px">' +
      it('jPay', '💵', 'Client paid', 'Money from ' + esc(j.customer), no) + it('pNew', '👷', 'Pay worker / subcontractor', 'Wages, subcontract part-payment', no) +
      it('xNew', '🧾', 'Other cost', 'Transport, materials, food…', no) + (KL.hasMod('stock') ? it('jStk', '📦', 'From my stock', 'Materials you already had', no) : '') +
      it('subNew', '🤝', 'Agreed price with a subcontractor', 'What you will pay them for this job', no) + it('pcNew', '✏️', 'Change the client\'s price', 'Additional works or a reduction', no + ' data-who=""') + '</div>' +
      '<button class="btn ghost block" style="margin-top:8px" data-act="jOpen" data-no="' + esc(j.no) + '">Back to the job</button>');
  };
  ACT.jPerson = d => {
    const j = B.job, p = j && (j.people || []).find(x => x.name === d.n); if (!p) return;
    const pays = (j.list || []).filter(x => x.to && kk(x.to) === kk(p.name));
    sheet('<h2>' + esc(p.name) + ' ' + typeBadge(p.type) + '</h2><p class="small muted" style="margin-top:0">' + esc(j.no) + ' · ' + esc(j.customer) + '</p>' +
      '<div class="card">' + (p.agreed !== null ? '<div class="row between" style="padding:4px 0"><span>Agreed price</span><b>' + money(p.agreed) + '</b></div>' + chgHTML(j, p.name) : '') +
      '<div class="row between" style="padding:4px 0"><span>Paid</span><b>' + money(p.paid) + '</b></div>' + (p.days ? '<div class="row between" style="padding:4px 0"><span>Days</span><b>' + p.days + '</b></div>' : '') +
      (p.agreed !== null ? '<div class="row between" style="padding:4px 0"><span>Still to pay</span><b class="' + (p.balance > 0.004 ? 'red' : 'green') + '">' + (p.balance > 0.004 ? money(p.balance) : 'fully paid') + '</b></div>' : '') + '</div>' +
      '<div class="row" style="gap:8px"><button class="btn primary grow" data-act="pNew" data-job="' + esc(j.no) + '" data-name="' + esc(p.name) + '">Pay</button>' + (p.type === 'Subcontractor' ? (p.agreed !== null ? '<button class="btn grow" data-act="pcNew" data-no="' + esc(j.no) + '" data-who="' + esc(p.name) + '">Change price</button>' : '<button class="btn grow" data-act="subNew" data-job="' + esc(j.no) + '" data-name="' + esc(p.name) + '">Agreed price</button>') : '') + '</div>' +
      (p.agreed !== null ? '<button class="btn block" style="margin-top:8px" data-act="jAgree" data-n="' + esc(p.name) + '">📄 Send the agreed price to ' + esc(p.name) + '</button>' : '') +
      '<h3 style="margin-top:14px">Payments</h3><div class="card" style="padding:2px 14px">' + (pays.length ? pays.map(x => (p.type === 'Apprentice' ? '<div class="item">' : '<button class="item" data-act="jSlip" data-id="' + esc(x.id) + '" data-n="' + esc(p.name) + '">') + '<span class="grow"><span class="small muted">' + esc(x.date) + (x.days ? ' · ' + x.days + ' days' : '') + (x.note ? ' · ' + esc(x.note) : '') + '</span></span><b>' + money(x.amount) + '</b>' + (p.type === 'Apprentice' ? '</div>' : ' <span class="muted">🧾</span></button>')).join('') + (p.type === 'Apprentice' ? '' : '<p class="small muted" style="margin:6px 0">Tap a payment to send its slip.</p>') : '<div class="empty">None yet.</div>') + '</div>' +
      '<button class="btn ghost block" style="margin-top:8px" data-act="jTab" data-t="team">Back to the team</button>');
  };

  /* ---------- client pays on a job ---------- */
  /* ---------- REQUEST MATERIALS on the company letterhead (typed list -> picture / message for the supplier) ---------- */
  function parseReq(text) {
    return String(text || '').split(/\r?\n/).map(l => l.trim().replace(/^(?:[-•*]|\d+[.)])\s+/, '')).filter(Boolean).map(l => {
      const m = l.match(/^(.+)\s*(?:,|:|=|\s[-–]\s|\s[x×]\s)\s*([^,:=]+)$/i);
      return m ? { name: m[1].trim(), qty: m[2].trim() } : { name: l, qty: '' };
    });
  }
  const niceDate = v => { const d = new Date(v + 'T00:00:00'); return isNaN(d) ? String(v || '') : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  async function reqCanvas(R) {
    const c = cfg(), c1 = c.c1 || '#0077B6', W = 720, pad = 44, F = (z, w) => (w || '') + ' ' + z + 'px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    const items = R.items.map(it => ({ n: wrapText(it.name, 382, F(21)), q: wrapText(it.qty || '', 170, F(21, 'bold')) }));
    const info = [['To', R.to], ['Needed by', R.by ? niceDate(R.by) : ''], ['Deliver to', R.site]].filter(r => r[1]);
    const infoL = info.map(r => wrapText(r[1], 422, F(21, 'bold')));
    const noteL = R.note ? wrapText(R.note, W - pad * 2, F(20)) : [];
    const rowH = it => Math.max(it.n.length, it.q.length) * 27 + 20;
    const H = 250 + infoL.reduce((t, a) => t + 46 + (a.length - 1) * 28, 0) + 30 + 44 + items.reduce((t, it) => t + rowH(it), 0) + (noteL.length ? 50 + noteL.length * 27 : 0) + 190;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    let im = null; try { im = new Image(); im.src = KL.logoSrc(); await new Promise(r => { im.onload = r; im.onerror = r; setTimeout(r, 1500); }); if (!im.naturalWidth) im = null; } catch (e) { im = null; }
    if (im) { const ws = Math.min(440, W - pad * 2) / Math.max(im.naturalWidth, im.naturalHeight), ww = im.naturalWidth * ws, wh = im.naturalHeight * ws; g.save(); g.globalAlpha = 0.07; g.drawImage(im, (W - ww) / 2, 230 + (H - 230 - wh) / 2, ww, wh); g.restore(); }   // faint logo watermark behind the list
    g.fillStyle = c1; g.fillRect(0, 0, W, 12);
    if (im) g.drawImage(im, pad, 40, 84, 84);
    let size = 32; g.font = F(size, 'bold'); while (g.measureText(bizName()).width > W - pad * 2 - 110 && size > 20) { size--; g.font = F(size, 'bold'); }
    g.fillStyle = c1; g.fillText(bizName(), pad + 104, 76);
    g.fillStyle = '#5B6B78'; g.font = F(19); g.fillText([c.location, [c.phone, c.phone2].filter(Boolean).join(' / ')].filter(Boolean).join('  ·  ').slice(0, 60), pad + 104, 108);
    g.fillStyle = '#1F2933'; g.font = F(26, 'bold'); g.fillText('MATERIAL REQUEST', pad, 186);
    g.textAlign = 'right'; g.font = F(19); g.fillStyle = '#5B6B78'; g.fillText(R.date + '  ·  ' + R.ref, W - pad, 186); g.textAlign = 'left';
    g.fillStyle = c1; g.fillRect(pad, 204, W - pad * 2, 3);
    let y = 252;
    info.forEach((r, i) => { g.fillStyle = '#5B6B78'; g.font = F(21); g.fillText(r[0], pad, y); g.fillStyle = '#1F2933'; g.font = F(21, 'bold'); infoL[i].forEach((t, k) => g.fillText(t, pad + 210, y + k * 28)); y += 46 + (infoL[i].length - 1) * 28; });
    y += 4; g.fillStyle = '#1F2933'; g.font = F(21); g.fillText('Please supply us with the following:', pad, y); y += 26;
    g.fillStyle = '#F1F7FB'; g.fillRect(pad, y, W - pad * 2, 40); g.fillStyle = '#5B6B78'; g.font = F(18, 'bold');
    g.fillText('No.', pad + 12, y + 27); g.fillText('Item', pad + 64, y + 27); g.textAlign = 'right'; g.fillText('Quantity', W - pad - 12, y + 27); g.textAlign = 'left'; y += 40;
    items.forEach((it, i) => {
      const h = rowH(it); g.fillStyle = '#5B6B78'; g.font = F(21); g.fillText(String(i + 1), pad + 12, y + 32);
      g.fillStyle = '#1F2933'; it.n.forEach((t, k) => g.fillText(t, pad + 64, y + 32 + k * 27));
      g.font = F(21, 'bold'); g.textAlign = 'right'; it.q.forEach((t, k) => g.fillText(t, W - pad - 12, y + 32 + k * 27)); g.textAlign = 'left';
      y += h; g.strokeStyle = '#E5E7EB'; g.lineWidth = 1; g.beginPath(); g.moveTo(pad, y); g.lineTo(W - pad, y); g.stroke();
    });
    if (noteL.length) { y += 36; g.fillStyle = '#5B6B78'; g.font = F(18, 'bold'); g.fillText('Note', pad, y); g.fillStyle = '#1F2933'; g.font = F(20); noteL.forEach((t, k) => g.fillText(t, pad, y + 28 + k * 27)); y += 28 + (noteL.length - 1) * 27; }
    y += 70; g.strokeStyle = '#9AA5B1'; g.lineWidth = 2; g.beginPath(); g.moveTo(pad, y); g.lineTo(W / 2 - 24, y); g.moveTo(W / 2 + 24, y); g.lineTo(W - pad, y); g.stroke();
    g.fillStyle = '#5B6B78'; g.font = F(17); g.textAlign = 'center'; g.fillText('Requested by (signature)', (pad + W / 2 - 24) / 2, y + 26); g.fillText('Received by supplier', (W / 2 + 24 + W - pad) / 2, y + 26);
    g.font = F(15); g.fillStyle = '#9AA5B1'; g.fillText('Powered by EasySales · 020 320 7240', W / 2, H - 22); g.textAlign = 'left';
    return cv;
  }
  ACT.reqOpen = async () => {
    const L = await sups(), R = B.req = B.req || { sup: '', typed: '', text: '', by: '', site: '', note: '' };
    const inp = 'width:100%;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit';
    sheet('<h2>Request materials</h2><p class="small muted" style="margin-top:0">Type what you need, one item per line, like <b>Plasterboard 12mm, 20 sheets</b>. It is made on your company letterhead so you can send it to the supplier.</p>' +
      '<label>Supplier</label><select id="rqs"><option value="">Choose…</option>' + L.map(x => '<option' + (x.name === R.sup ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' +
      '<input id="rqt" placeholder="Or type the company name" value="' + esc(R.typed) + '" style="margin-top:6px">' +
      '<label>What you need</label><textarea id="rql" rows="8" style="' + inp + '" placeholder="Plasterboard 12mm, 20 sheets&#10;Metal stud 3m, 50 pieces&#10;Screws 25mm, 5 boxes">' + esc(R.text) + '</textarea>' +
      '<label>Needed by (optional)</label><input id="rqb" type="date" value="' + esc(R.by) + '"><label>Deliver to (optional)</label><input id="rqd" value="' + esc(R.site) + '" placeholder="Example: Site at Kasoa, near the market">' +
      '<label>Note (optional)</label><input id="rqn" value="' + esc(R.note) + '" placeholder="Example: Please call before delivery">' +
      '<br><button class="btn primary block" data-act="reqMake">Make the request</button>');
  };
  ACT.reqMake = async (d, btn) => {
    const R = B.req = B.req || {}; R.sup = $('#rqs').value; R.typed = $('#rqt').value.trim(); R.text = $('#rql').value; R.by = $('#rqb').value; R.site = $('#rqd').value.trim(); R.note = $('#rqn').value.trim();
    const items = parseReq(R.text); if (!items.length) { toast('Type what you need first'); return; }
    btn.disabled = true;
    try {
      const to = R.typed || R.sup, date = today();
      R.out = { items, to, by: R.by, site: R.site, note: R.note, date, ref: 'MR-' + date.replace(/-/g, '') };
      const cv = await reqCanvas(R.out); B.reqCv = cv;
      sheet('<h2>Check your request</h2><img src="' + cv.toDataURL('image/png') + '" alt="" style="width:100%;border:1px solid var(--line);border-radius:12px">' +
        '<button class="btn primary block" style="margin-top:12px;background:#16A34A;border-color:#16A34A" data-act="reqPic">Send picture (WhatsApp)</button>' +
        '<button class="btn block" style="margin-top:8px" data-act="reqWa">Send as a message instead</button>' +
        '<button class="btn ghost block" style="margin-top:8px" data-act="reqOpen">Change the list</button>');
    } catch (e) { toast('Could not make the request on this phone'); btn.disabled = false; }
  };
  ACT.reqPic = async (d, btn) => {
    const R = B.req && B.req.out; if (!R || !B.reqCv) return; if (btn) btn.disabled = true;
    try {
      const blob = await new Promise(res => B.reqCv.toBlob(res, 'image/png')), file = new File([blob], 'material-request-' + R.date + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: bizName() + ' material request' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); toast('Picture saved. Attach it in WhatsApp.'); }
    } catch (e) { if (e && e.name !== 'AbortError') toast('Could not make the picture on this phone'); }
    if (btn) btn.disabled = false;
  };
  ACT.reqWa = async () => {
    const R = B.req && B.req.out; if (!R) return; const sp = (await sups()).find(x => x.name === R.to), c = cfg();
    const t = 'Hello' + (R.to ? ' ' + R.to : '') + ',\nPlease supply ' + bizName() + ' with:\n' + R.items.map(x => '• ' + x.name + (x.qty ? ': ' + x.qty : '')).join('\n') + (R.by ? '\n\nNeeded by: ' + niceDate(R.by) : '') + (R.site ? '\nDeliver to: ' + R.site : '') + (R.note ? '\n' + R.note : '') + '\n\nThank you.' + (c.phone ? '\n' + bizName() + ' · ' + c.phone : '');
    window.open('https://wa.me/' + (sp && sp.phone ? waN(sp.phone) : '') + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
  };
  ACT.jPay = d => {
    const j = (B.jobs || []).find(x => x.no === d.no); if (!j) return;
    const left = r2(Math.max(0, j.value - j.received));
    sheet('<h2>Client paid · ' + esc(j.no) + '</h2><p class="small muted" style="margin-top:0">' + esc(j.customer) + (j.value ? ' · still to collect ' + money(left) : '') + '</p>' +
      '<label>Cash (GH₵)</label><input id="jpc" type="number" inputmode="decimal" placeholder="0">' +
      '<label>MoMo (GH₵)</label><input id="jpm" type="number" inputmode="decimal" placeholder="0">' +
      '<br><button class="btn primary block" data-act="jPaySave" data-no="' + esc(j.no) + '">Save payment</button>');
  };
  ACT.jPaySave = async (d, btn) => {
    const cash = +$('#jpc').value || 0, momo = +$('#jpm').value || 0;
    if (cash + momo <= 0) { toast('Enter the amount'); return; }
    const j = (B.jobs || []).find(x => x.no === d.no);
    if (!confirm('Record ' + money(cash + momo) + ' from ' + (j ? j.customer : 'the client') + '?')) return;
    if (j && j.value && cash + momo > r2(j.value - j.received) + 0.004) { toast('That is more than the client still owes on this job'); return; }
    btn.disabled = true;
    try {
      let nj;
      if (fast() && j) {
        j.pays = (j.pays || []).concat([{ id: 'new', date: today(), cash, momo, ref: j.no }]); j.received = r2(j.received + cash + momo); j.cashProfit = r2((j.cashProfit || 0) + cash + momo); nj = j;
        bgSend({ op: 'jobPay', no: d.no, cash, momo }, 'The client payment');
      } else {
        const r = await api('biz', { op: 'jobPay', no: d.no, cash, momo });
        if (!r.ok) { toast(r.error === 'more_than_owed' ? 'That is more than the client still owes on this job' : errText(r.error)); btn.disabled = false; return; }
        B.jobs = r.jobs; nj = r.jobs.find(x => x.no === d.no) || j;
      }
      B.jtab = 'client';
      const left = r2(Math.max(0, nj.value - nj.received));
      const msg = bizName() + ' - payment received\n' + today() + '\nFrom: ' + nj.customer + '\nJob: ' + nj.no + (nj.title ? ' (' + nj.title + ')' : '') + '\nAmount: ' + money(cash + momo) + (cash && momo ? ' (cash ' + money(cash) + ', MoMo ' + money(momo) + ')' : momo ? ' (MoMo)' : ' (cash)') +
        '\nPaid so far: ' + money(nj.received) + (nj.value ? '\nStill to pay: ' + money(left) : '') + '\nThank you.';
      let n = String(nj.phone || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1);
      sheet('<h2>Payment saved</h2><p>' + money(cash + momo) + ' from ' + esc(nj.customer) + '.<br>Still to collect: <b>' + money(left) + '</b></p>' +
        '<a class="btn primary block" style="background:#16A34A;border-color:#16A34A;text-decoration:none" target="_blank" href="https://wa.me/' + n + '?text=' + encodeURIComponent(msg) + '">Send receipt on WhatsApp</a>' +
        '<button class="btn block" style="margin-top:8px" data-act="jOpen" data-no="' + esc(nj.no) + '">Back to the job</button>');
      render(true);
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  /* ---------- materials from my own stock used on a job ---------- */
  ACT.jStk = async d => {
    if (!B.stock) { toast('Loading stock…'); await loadStock(); }
    const list = (B.stock || []).filter(p => p.level > 0);
    if (!list.length) { toast('No stock to use. Add stock in Money → Stock first.'); return; }
    sheet('<h2>From my stock · ' + esc(d.no) + '</h2><p class="small muted" style="margin-top:0">Stock goes down. The job\'s cost goes up at your cost price.</p>' +
      '<label>Item</label><select id="jsp">' + list.map(p => '<option value="' + esc(p.name) + '">' + esc(p.name) + ' (' + p.level + ' left' + (p.cost ? ', cost ' + money(p.cost) : '') + ')</option>').join('') + '</select>' +
      '<label>How many</label><input id="jsq" type="number" inputmode="decimal" placeholder="0"><label>Note (optional)</label><input id="jsn">' +
      '<br><button class="btn primary block" data-act="jStkSave" data-no="' + esc(d.no) + '">Save</button>');
  };
  ACT.jStkSave = async (d, btn) => {
    const name = $('#jsp').value, q = +$('#jsq').value || 0, p = (B.stock || []).find(x => x.name === name);
    if (!(q > 0)) { toast('Enter how many'); return; }
    if (p && q > p.level && !confirm('Only ' + p.level + ' left in stock. Use ' + q + ' anyway?')) return;
    btn.disabled = true;
    try {
      const r = await api('biz', { op: 'jobStock', no: d.no, product: name, qty: q, note: $('#jsn').value.trim() });
      if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
      B.jobs = r.jobs; B.stock = null; toast('Added to ' + d.no + (p && !p.cost ? '. Tip: add a cost price for ' + name + ' so the job cost is right.' : '')); jobSheet(d.no); loadStock();
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };

  /* ---------- price changes (extra work / less work) ---------- */
  function chgHTML(j, who) {
    const list = (j.changes || []).filter(c => (c.who || '') === who); if (!list.length) return '';
    const start = r2(j.value - list.reduce((s, c) => s + c.amount, 0));
    return '<div class="small muted" style="padding:0 0 6px">Started at ' + money(start) + list.map(c => ' · <span style="color:' + (c.amount > 0 ? '#166534' : '#B91C1C') + '">' + (c.amount > 0 ? '+' : '−') + money(Math.abs(c.amount)) + '</span> ' + esc(c.reason) + ' (' + esc(c.date) + ')').join('') + '</div>';
  }
  ACT.pcNew = d => {
    const j = (B.jobs || []).find(x => x.no === d.no); if (!j) return;
    const sub = d.who ? (j.people || []).find(p => p.name === d.who) : null, now = sub ? sub.agreed : j.value;
    B.pc = { no: d.no, who: d.who || '', sign: 1 };
    sheet('<h2>Change price · ' + esc(sub ? d.who : j.customer) + '</h2><p class="small muted" style="margin-top:0">' + esc(j.no) + ' · agreed now <b>' + money(now) + '</b>. The old price and every change are kept.</p>' +
      '<div class="row" style="gap:8px"><button class="btn primary grow" id="pcA" data-act="pcSign" data-s="1">+ Extra work</button><button class="btn grow" id="pcR" data-act="pcSign" data-s="-1">− Less work</button></div>' +
      '<label>Amount (GH₵)</label><input id="pca" type="number" inputmode="decimal">' +
      '<label>Reason</label><input id="pcr" placeholder="' + (sub ? 'Example: extra room added' : 'Example: client added the store room') + '">' +
      (sub ? '' : '<label style="display:flex;align-items:center;gap:8px;margin-top:12px"><input id="pcd" type="checkbox" checked style="width:auto;min-height:0"> <span id="pcdl">Also make an "Additional works" estimate to send the client</span></label>') +
      '<br><button class="btn primary block" data-act="pcSave">Save change</button>');
  };
  ACT.pcSign = d => {
    B.pc.sign = +d.s; $('#pcA').className = 'btn grow' + (B.pc.sign > 0 ? ' primary' : ''); $('#pcR').className = 'btn grow' + (B.pc.sign < 0 ? ' primary' : '');
    if ($('#pcdl')) $('#pcdl').textContent = B.pc.sign > 0 ? 'Also make an "Additional works" estimate to send the client' : 'Also make a revised quote to send the client';
  };
  ACT.pcSave = async (d, btn) => {
    const a = +$('#pca').value || 0, reason = $('#pcr').value.trim();
    if (!(a > 0)) { toast('Enter the amount'); return; }
    if (!reason) { toast('Write the reason, so everyone knows why the price changed'); return; }
    const pc = B.pc, amt = pc.sign * a, doc = $('#pcd') && $('#pcd').checked;
    if (!confirm((amt > 0 ? 'Add ' : 'Reduce ') + money(a) + (pc.who ? ' on ' + pc.who + '\'s price' : ' on the client\'s price') + '?')) return;
    btn.disabled = true;
    try {
      const r = await api('biz', { op: 'priceChange', no: pc.no, who: pc.who, amount: amt, reason });
      if (!r.ok) { toast(r.error === 'bad_amount' ? 'The price cannot go below zero' : r.error === 'no_agreed' ? 'Set the agreed price first' : errText(r.error)); btn.disabled = false; return; }
      B.jobs = r.jobs; toast('Price changed');
      const j = r.jobs.find(x => x.no === pc.no);
      if (doc && j && KL.hasMod('docs')) {
        // a new estimate for the client: the extra work, or the revised total
        closeSheet(); S.tab = 'docs'; if (KL.docs && KL.docs.state) KL.docs.state.type = 'EST'; render();
        const pre = amt > 0
          ? { customer: j.customer, phone: j.phone || '', location: j.site || '', title: 'Additional works · ' + j.no + (j.title ? ' (' + j.title + ')' : ''), items: [{ p: reason, q: 1, un: 'job', u: a, l: 1 }] }
          : { customer: j.customer, phone: j.phone || '', location: j.site || '', title: 'Revised quote · ' + j.no + (j.title ? ' (' + j.title + ')' : ''), items: [{ p: (j.title || 'Work as agreed') + ' (revised: ' + reason + ')', q: 1, un: 'job', u: j.value, l: 1 }] };
        Promise.resolve(KL.docs && KL.docs.load ? KL.docs.load() : null).then(() => ACT.dNew({ k: 'EST', pre }));
      } else jobSheet(pc.no);
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  ACT.jDoc = d => { closeSheet(); S.tab = 'docs'; render(); KL.docs.load().then(() => KL.docs.open(d.no)); };
  ACT.jStage = async d => { if (fast() && B.job) { const j = B.job; j.stage = d.s; if (d.s === 'Completed' && !j.finished) j.finished = today(); jobSheet(j.no, true); toast(d.s); bgSend({ op: 'jobStage', no: j.no, stage: d.s }, 'The stage', true); return; } try { const r = await api('biz', { op: 'jobStage', no: B.job.no, stage: d.s }); if (!r.ok) { toast(errText(r.error)); return; } toast(d.s); await loadJobs(); jobSheet(B.job.no); } catch (e) { toast('Needs internet'); } };
  ACT.jNote = async () => { const t = $('#jnote').value.trim(); if (!t) return; if (fast() && B.job) { const j = B.job; j.data.notes = (j.data.notes || []).concat([{ d: today(), t }]); jobSheet(j.no, true); bgSend({ op: 'jobNote', no: j.no, note: t }, 'The note'); return; } try { await api('biz', { op: 'jobNote', no: B.job.no, note: t }); await loadJobs(); jobSheet(B.job.no); } catch (e) { toast('Needs internet'); } };

  /* ---------- workers and subcontractors ---------- */
  const typeBadge = t => '<span class="badge ' + (t === 'Subcontractor' ? 'amber' : t === 'Apprentice' ? '' : 'green') + '">' + esc(t) + '</span>';
  function teamHTML(j) {
    const P = j.people || [];
    if (!P.length) return '<p class="small muted">Nobody yet. Tap <b>Pay worker / sub</b> or <b>+ Subcontract price</b>.</p>';
    return '<div class="card" style="padding:4px 14px">' + P.map(p => '<div class="item" style="display:block"><div class="row between"><span><span class="nm">' + esc(p.name) + '</span> ' + typeBadge(p.type) + '</span><b>' + money(p.paid) + '</b></div>' +
      '<div class="small muted">' + (p.days ? p.days + ' day' + (p.days === 1 ? '' : 's') + ' · ' : '') + p.count + ' payment' + (p.count === 1 ? '' : 's') +
      (p.agreed !== null ? ' · agreed ' + money(p.agreed) + ((p.changes || []).length ? ' <span class="small muted">(' + p.changes.map(c => (c.amount > 0 ? '+' : '−') + money(Math.abs(c.amount)) + ' ' + esc(c.reason)).join(', ') + ')</span>' : '') + ' · <b class="' + (p.balance > 0.004 ? 'red' : 'green') + '">' + (p.balance > 0.004 ? 'still to pay ' + money(p.balance) : 'fully paid') + '</b>' : '') + '</div>' +
      '<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm grow" data-act="pNew" data-job="' + esc(j.no) + '" data-name="' + esc(p.name) + '">Pay</button>' + (p.type === 'Subcontractor' ? (p.agreed !== null ? '<button class="btn sm grow" data-act="pcNew" data-no="' + esc(j.no) + '" data-who="' + esc(p.name) + '">Change price</button>' : '<button class="btn sm grow" data-act="subNew" data-job="' + esc(j.no) + '" data-name="' + esc(p.name) + '">Agreed price</button>') : '') + '</div></div>').join('') +
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
    const method = $('#pm') ? $('#pm').value : '';
    try {
      let j, p;
      if (fast() && J(B.payJob)) {
        j = J(B.payJob); p = addCostLocal(j, Object.assign({}, pay), who.type);
        bgSend(Object.assign({ op: 'expSave' }, pay), 'The payment to ' + who.name, true);
        toast('Paid ' + money(a) + ' to ' + who.name); B.crew = null; B.exp = null; B.profit = null; B.jtab = 'team';
      } else {
        const r = await api('biz', Object.assign({ op: 'expSave' }, pay));
        if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; }
        toast('Paid ' + money(a) + ' to ' + who.name); B.crew = null; B.crewNames = null; B.exp = null; B.profit = null; B.jtab = 'team';
        await loadJobs(); j = (B.jobs || []).find(x => x.no === B.payJob); p = j && (j.people || []).find(x => x.name === who.name);
      }
      if (who.type === 'Apprentice') { if (j) jobSheet(j.no); else closeSheet(); }   // apprentices: no payment slip
      else voucherSheet(Object.assign({}, pay, { type: who.type, phone: who.phone, method }), p, j);
    } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };
  // payment receipt the worker or subcontractor signs
  function voucherHTML(x, p, j) {
    const sc = (p && p.note) || (j && j.subNotes && j.subNotes[x.to]) || '';
    const c = cfg(), c1 = c.c1 || '#7A1F3D', R = (a, b) => '<tr><td style="padding:6px 8px;color:#5B6B78;width:40%">' + a + '</td><td style="padding:6px 8px">' + b + '</td></tr>';
    return '<div class="paper" style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;font-size:13px;color:#1F2933">' +
      '<div style="display:flex;gap:10px;align-items:center"><img src="' + KL.logoSrc() + '" alt="" style="width:48px;height:48px;object-fit:contain"><div style="flex:1"><b style="color:' + esc(c1) + '">' + esc(bizName()) + '</b><div style="font-size:11px;color:#5B6B78">' + esc([c.location, c.phone].filter(Boolean).join(' · ')) + '</div></div><div style="text-align:right"><b style="color:' + esc(c1) + '">PAYMENT RECEIPT</b><div style="font-size:11px;color:#5B6B78">' + esc(x.date) + '</div></div></div>' +
      '<div style="height:3px;background:' + esc(c1) + ';margin:8px 0"></div><table style="width:100%;border-collapse:collapse">' + R('Paid to', '<b>' + esc(x.to) + '</b> (' + esc(x.type || '') + ')') + R('Job', esc(x.job) + (j ? ' · ' + esc(j.customer) : '')) + (j && j.title ? R('Work', esc(j.title)) : '') + (j && j.site ? R('Site', esc(j.site)) : '') + (sc && sc !== x.note ? R('Agreed work', esc(sc)) : '') + (x.days ? R('Days worked', x.days) : '') + (x.note ? R('For', esc(x.note)) : '') + '</table>' +
      '<div style="margin:12px 0 2px;color:#5B6B78">Amount paid</div><div style="font-size:24px;font-weight:800">' + money(x.amount) + '</div>' +
      (p && p.agreed !== null ? '<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px">' + (p.changes && p.changes.length ? R('First agreed', money(r2(p.agreed - p.changes.reduce((s, c) => s + c.amount, 0)))) + p.changes.map(c => R((c.amount > 0 ? 'Added: ' : 'Reduced: ') + esc(c.reason), (c.amount > 0 ? '+ ' : '− ') + money(Math.abs(c.amount)))).join('') : '') + R(p.changes && p.changes.length ? '<b>Agreed price now</b>' : 'Agreed price', money(p.agreed)) + R('Paid so far (with this)', money(p.paid)) + R('<b>Balance still to pay</b>', '<b>' + money(Math.max(0, p.balance)) + '</b>') + '</table>' : p && p.count > 1 ? '<div style="margin-top:8px">Total paid on this job: <b>' + money(p.paid) + '</b>' + (p.days ? ' for ' + p.days + ' days' : '') + '</div>' : '') +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:36px;font-size:11px;color:#5B6B78;text-align:center"><div style="border-top:1px solid #999;padding-top:4px">Received by (signature)</div><div style="border-top:1px solid #999;padding-top:4px">Paid by</div></div></div>';
  }
  function voucherSheet(x, p, j) {
    B.voucher = { x, p, j };
    sheet('<h2>Payment saved</h2>' + voucherHTML(x, p, j) + '<button class="btn primary block" style="margin-top:12px;background:#16A34A;border-color:#16A34A" data-act="vPic">Send slip picture (WhatsApp)</button><div class="row" style="margin-top:8px"><button class="btn grow" data-act="vPrint">Print / PDF</button><button class="btn grow" data-act="vWa">Send as text</button></div><button class="btn ghost block" style="margin-top:8px" data-act="vBack">Back to the job</button>');
  }
  ACT.vBack = () => jobSheet(B.voucher.x.job);
  ACT.vPrint = () => {
    let host = $('#printdoc'); if (host) host.remove(); host = document.createElement('div'); host.id = 'printdoc'; host.innerHTML = voucherHTML(B.voucher.x, B.voucher.p, B.voucher.j); document.body.appendChild(host);
    if (!$('#printcss')) { const st = document.createElement('style'); st.id = 'printcss'; st.textContent = '#printdoc{display:none}@media print{body>*:not(#printdoc){display:none!important}#printdoc{display:block!important;padding:10mm}#printdoc .paper{border:0!important}@page{size:A5;margin:10mm}}'; document.head.appendChild(st); }
    setTimeout(() => window.print(), 80);
  };
  // splits text into lines that fit a width (for pictures made on a canvas)
  function wrapText(t, w, font) {
    const m = document.createElement('canvas').getContext('2d'); m.font = font; const out = []; let line = '';
    String(t).split(/\s+/).forEach(wd => { const tt = line ? line + ' ' + wd : wd; if (line && m.measureText(tt).width > w) { out.push(line); line = wd; } else line = tt; });
    if (line) out.push(line); return out.length ? out : [''];
  }
  // the payment slip as a picture, like a sales receipt
  async function voucherImage(x, p, j, agree) {
    const c = cfg(), c1 = c.c1 || '#0077B6', W = 720, pad = 44, F = (z, w) => (w || '') + ' ' + z + 'px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    const rows = [[agree ? 'Subcontractor' : 'Paid to', x.to + (x.type && !agree ? ' (' + x.type + ')' : '')], ['Job', x.job + (j ? ' · ' + j.customer : '')]];
    if (j && j.title) rows.push(['Work', j.title]); if (j && j.site) rows.push(['Site', j.site]); if (x.days) rows.push(['Days worked', String(x.days)]); if (x.note) rows.push([agree ? 'Covers' : 'For', x.note]); const scope = !agree && ((p && p.note) || (j && j.subNotes && j.subNotes[x.to])); if (scope && scope !== x.note) rows.push(['Agreed work', scope]); if (x.method) rows.push(['Paid by', x.method]);
    const ag = agree ? (p && p.paid ? [['Already paid', money(p.paid)], ['Still to pay', money(Math.max(0, p.balance || 0))]] : []) : p && p.agreed !== null && p.agreed !== undefined ? [['Agreed price', money(p.agreed)], ['Paid so far', money(p.paid)], [p.balance > 0.004 ? 'Still to pay' : 'Balance', p.balance > 0.004 ? money(p.balance) : 'Fully paid']] : [];
    const wl = rows.map(r => wrapText(String(r[1]), 422, F(21, 'bold'))), extra = wl.reduce((t, a) => t + (a.length - 1) * 28, 0);
    const H = 250 + extra + rows.length * 46 + 150 + (ag.length ? ag.length * 42 + 30 : 0) + 190;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = c1; g.fillRect(0, 0, W, 12);
    try { const im = new Image(); im.src = KL.logoSrc(); await new Promise(r => { im.onload = r; im.onerror = r; setTimeout(r, 1500); }); if (im.naturalWidth) g.drawImage(im, pad, 40, 84, 84); } catch (e) { /* no logo */ }
    let size = 32; g.font = F(size, 'bold'); while (g.measureText(bizName()).width > W - pad * 2 - 110 && size > 20) { size--; g.font = F(size, 'bold'); }
    g.fillStyle = c1; g.fillText(bizName(), pad + 104, 76);
    g.fillStyle = '#5B6B78'; g.font = F(19); g.fillText([c.location, [c.phone, c.phone2].filter(Boolean).join(' / ')].filter(Boolean).join('  ·  ').slice(0, 60), pad + 104, 108);
    g.fillStyle = '#1F2933'; g.font = F(26, 'bold'); g.fillText(agree ? 'AGREED PRICE FOR THE WORK' : 'PAYMENT SLIP', pad, 186);
    g.textAlign = 'right'; g.font = F(19); g.fillStyle = '#5B6B78'; g.fillText((x.date || today()) + (x.id ? '  ·  No. ' + String(x.id).slice(-6).toUpperCase() : ''), W - pad, 186); g.textAlign = 'left';
    g.fillStyle = c1; g.fillRect(pad, 204, W - pad * 2, 3);
    let y = 252; g.font = F(21);
    rows.forEach((r, i) => { g.fillStyle = '#5B6B78'; g.fillText(r[0], pad, y); g.fillStyle = '#1F2933'; g.font = F(21, 'bold'); wl[i].forEach((t, k) => g.fillText(t, pad + 210, y + k * 28)); g.font = F(21); y += 46 + (wl[i].length - 1) * 28; });
    y += 14; g.fillStyle = '#F1F7FB'; g.fillRect(pad, y, W - pad * 2, 110); g.fillStyle = '#5B6B78'; g.font = F(20); g.fillText(agree ? 'Agreed price (paid in parts as the work goes on)' : 'Amount paid', pad + 22, y + 38);
    g.fillStyle = '#1F2933'; g.font = F(46, 'bold'); g.fillText(money(x.amount), pad + 22, y + 92); y += 140;
    if (ag.length) { ag.forEach((r, i) => { g.fillStyle = '#5B6B78'; g.font = F(20); g.fillText(r[0], pad, y); g.textAlign = 'right'; g.fillStyle = i === ag.length - 1 && ag.length > 1 ? (p.balance > 0.004 ? '#B91C1C' : '#15803D') : '#1F2933'; g.font = F(21, 'bold'); g.fillText(r[1], W - pad, y); g.textAlign = 'left'; y += 42; }); y += 20; }
    y += 50; g.strokeStyle = '#9AA5B1'; g.lineWidth = 2; g.beginPath(); g.moveTo(pad, y); g.lineTo(W / 2 - 24, y); g.moveTo(W / 2 + 24, y); g.lineTo(W - pad, y); g.stroke();
    g.fillStyle = '#5B6B78'; g.font = F(17); g.textAlign = 'center'; g.fillText(agree ? 'Subcontractor (signature)' : 'Received by (signature)', (pad + W / 2 - 24) / 2, y + 26); g.fillText(agree ? 'For ' + bizName().slice(0, 28) : 'Paid by', (W / 2 + 24 + W - pad) / 2, y + 26);
    g.font = F(15); g.fillStyle = '#9AA5B1'; g.fillText('Powered by EasySales · 020 320 7240', W / 2, H - 22); g.textAlign = 'left';
    return new Promise(res => cv.toBlob(res, 'image/png'));
  }
  ACT.vPic = async (d, btn) => {
    const { x, p, j, agree } = B.voucher; if (btn) btn.disabled = true;
    try {
      const blob = await voucherImage(x, p, j, agree), file = new File([blob], (agree ? 'agreed-price-' : 'payment-') + String(x.to).replace(/[^\w]+/g, '-') + '-' + (x.date || today()) + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: bizName() + ' payment slip' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); toast('Picture saved. Attach it in WhatsApp.'); }
    } catch (e) { if (e && e.name !== 'AbortError') toast('Could not make the picture on this phone'); }
    if (btn) btn.disabled = false;
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
    const nm = $('#sw').value, body = { op: 'subPrice', job: B.subJob, name: nm, amount: amt === '' ? '' : +amt, note: $('#sn') ? $('#sn').value : '' }, j = J(B.subJob);
    if (fast() && j) {
      let p = (j.people || []).find(q => kk(q.name) === kk(nm));
      if (!p) { p = { name: nm, type: 'Subcontractor', phone: '', days: 0, paid: 0, count: 0, agreed: null, changes: [] }; j.people = (j.people || []).concat([p]); }
      p.agreed = amt === '' ? null : r2(+amt); if (p.agreed !== null) p.balance = r2(p.agreed - p.paid); else delete p.balance;
      B.jtab = 'team'; toast('Saved'); B.crew = null; B.job = j; j.subNotes = j.subNotes || {}; j.subNotes[nm] = body.note || ''; bgSend(body, 'The agreed price', true); if (p.agreed !== null) ACT.jAgree({ n: p.name }); else jobSheet(j.no, true); return;
    }
    try { const r = await api('biz', body); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } toast('Saved'); B.crew = null; await loadJobs(); jobSheet(B.subJob); } catch (e) { toast('Needs internet'); btn.disabled = false; }
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
  function loadMoney() { if (B.mtab === 'loans') loadLoans(); else if (B.mtab === 'stock') loadStock(); else if (B.mtab === 'exp') loadExp(); else if (B.mtab === 'inc') loadInc(); else loadProfit(); }
  async function loadInc() { try { const r = await api('more', { op: 'inc', month: B.expMonth }); if (r.ok) B.inc = r.income; } catch (e) { /* offline */ } if (S.tab === 'money') render(true); }
  KL.B = B;
  KL.reloadMoney = () => { B.inc = null; B.profit = null; loadMoney(); };
  async function loadStock() { try { const r = await api('biz', { op: 'stock' }); if (r.ok) B.stock = r.list; } catch (e) { /* offline */ } if (S.tab === 'money' || S.tab === 'dash') render(true); }
  async function loadExp() { try { const r = await api('biz', { op: 'expenses', month: B.expMonth }); if (r.ok) { B.exp = r.list; B.cats = r.cats; } } catch (e) { /* offline */ } if (S.tab === 'money') render(true); }
  async function loadProfit() { try { const r = await api('biz', { op: 'profit', month: B.expMonth }); if (r.ok) B.profit = r; else toast(errText(r.error)); } catch (e) { /* offline */ } if (S.tab === 'money') render(true); }
  ACT.mTab = d => { B.mtab = d.k; render(true); loadMoney(); };
  document.addEventListener('change', ev => { if (ev.target.id === 'mmonth') { B.expMonth = ev.target.value || today().slice(0, 7); B.exp = null; B.inc = null; B.profit = null; render(true); loadMoney(); } });
  /* ---------- MONEY GIVEN OUT OR BORROWED (owner only) ---------- */
  async function loadLoans() {
    try { const r = await api('loans', { op: 'list' }); if (r.ok) { B.loans = r.loans; B.loansAt = Date.now(); KL.kvSet('loans', r.loans).catch(() => {}); } else toast(errText(r.error)); }
    catch (e) { if (!B.loans) { try { B.loans = await KL.kvGet('loans'); } catch (x) { /* none */ } } }
    if (S.tab === 'money' || S.tab === 'dash') render(true);
  }
  const dueSoon = () => new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  function loansHTML() {
    if (!B.loans && !B.loansAsked) { B.loansAsked = 1; loadLoans(); }
    let h = '<button class="btn primary block" data-act="lnNew" style="margin:8px 0">+ Money given or borrowed</button>';
    const l = B.loans; if (!l) return h + '<div class="empty">' + (navigator.onLine ? 'Loading…' : 'Open this once with internet.') + '</div>';
    const open = l.filter(x => x.balance > 0.004).sort((a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1), gave = open.filter(x => x.dir === 'gave'), bor = open.filter(x => x.dir === 'borrowed');
    h += '<div class="row" style="gap:8px;margin-bottom:8px"><div class="card grow"><div class="small muted">People owe me</div><b>' + money(sum(gave, x => x.balance)) + '</b></div><div class="card grow"><div class="small muted">I owe</div><b>' + money(sum(bor, x => x.balance)) + '</b></div></div>';
    if (!open.length) return h + '<div class="empty">Nothing outstanding.</div>';
    return h + open.map(x => '<button class="card" style="display:block;width:100%;text-align:left;margin-bottom:6px" data-act="lnOpen" data-id="' + esc(x.id) + '"><div class="row between"><b>' + esc(x.person) + '</b><b class="' + (x.dir === 'gave' ? '' : 'red') + '">' + money(x.balance) + '</b></div><div class="small muted">' + (x.dir === 'gave' ? 'I gave' : 'I borrowed') + ' · ' + (x.due ? 'due ' + esc(x.due) : 'no date set') + (x.due && x.due < today() ? ' <span class="red"><b>LATE</b></span>' : '') + '</div></button>').join('');
  }
  ACT.lnNew = () => lnForm({ dir: 'gave', person: '', phone: '', amount: '', date: today(), due: '', note: '' });
  ACT.lnEdit = d => { const x = (B.loans || []).find(y => y.id === d.id); if (x) lnForm(x); };
  function lnForm(x) {
    B.lnE = x;
    sheet('<h2>' + (x.id ? 'Edit' : 'New') + ' · money given or borrowed</h2><div class="seg"><button class="' + (x.dir === 'gave' ? 'on' : '') + '" data-act="lnDir" data-d="gave">I gave</button><button class="' + (x.dir === 'borrowed' ? 'on' : '') + '" data-act="lnDir" data-d="borrowed">I borrowed</button></div>' +
      '<label>Person</label><input id="lnp" value="' + esc(x.person) + '" autocomplete="off"><label>Phone</label><input id="lnph" type="tel" value="' + esc(x.phone) + '">' +
      '<div class="picker"><div><label>Amount (GH₵)</label><input id="lna" type="number" inputmode="decimal" value="' + esc(x.amount) + '"></div><div><label>Date</label><input id="lnd" type="date" value="' + esc(x.date) + '"></div></div>' +
      '<label>Promised to pay on</label><input id="lndue" type="date" value="' + esc(x.due) + '"><label>Note</label><input id="lnn" value="' + esc(x.note) + '" placeholder="Example: school fees, small help"><br>' +
      '<button class="btn primary block" data-act="lnSave">Save</button><button class="btn block" style="margin-top:6px" data-act="close">Cancel</button>');
  }
  const lnRead = () => { const x = B.lnE, g = id => ($('#' + id) || {}).value; x.person = (g('lnp') || '').trim(); x.phone = (g('lnph') || '').trim(); x.amount = g('lna'); x.date = g('lnd') || today(); x.due = g('lndue') || ''; x.note = (g('lnn') || '').trim(); return x; };
  ACT.lnDir = d => { lnRead(); B.lnE.dir = d.d; lnForm(B.lnE); };
  ACT.lnSave = async (d, btn) => {
    const x = lnRead(); if (!x.person) { toast('Type the person\'s name'); return; } if (!(+x.amount > 0)) { toast('Type the amount'); return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try { const r = await api('loans', { op: 'save', id: x.id, person: x.person, phone: x.phone, dir: x.dir, amount: +x.amount, date: x.date, due: x.due, note: x.note, today: today() }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; btn.textContent = 'Save'; return; } B.loans = r.loans; KL.kvSet('loans', r.loans).catch(() => {}); closeSheet(); toast('Saved'); render(true); }
    catch (e) { toast('Needs internet to save'); btn.disabled = false; btn.textContent = 'Save'; }
  };
  ACT.lnOpen = d => {
    const x = (B.loans || []).find(y => y.id === d.id); if (!x) return; B.lnV = x;
    sheet('<h2>' + esc(x.person) + '</h2><p class="muted" style="margin:0">' + (x.dir === 'gave' ? 'I gave ' : 'I borrowed ') + money(x.amount) + ' on ' + esc(x.date) + (x.due ? ' · due ' + esc(x.due) : '') + '</p>' +
      '<p style="font-size:20px;font-weight:800;margin:8px 0">' + (x.balance > 0.004 ? 'Balance ' + money(x.balance) : 'Fully paid') + '</p>' + (x.note ? '<p class="small">' + esc(x.note) + '</p>' : '') +
      (x.pays.length ? '<h3 style="margin:10px 0 4px">Payments</h3>' + x.pays.map(p => '<div class="row between small" style="padding:3px 0;border-bottom:1px solid var(--line)"><span>' + esc(p.date) + (p.note ? ' · ' + esc(p.note) : '') + '</span><b>' + money(p.amount) + '</b></div>').join('') : '') +
      '<div style="display:grid;gap:8px;margin-top:12px">' + (x.balance > 0.004 ? '<button class="btn primary block" data-act="lnPay">Add a payment</button>' : '') +
      (x.dir === 'gave' && x.phone && x.balance > 0.004 ? '<button class="btn block" style="border-color:#16A34A;color:#16A34A" data-act="lnRemind">Remind on WhatsApp</button>' : '') +
      '<div class="row" style="gap:8px"><button class="btn grow" data-act="lnEdit" data-id="' + esc(x.id) + '">Edit</button><button class="btn danger grow" data-act="lnDel">Delete</button></div><button class="btn block" data-act="close">Close</button></div>');
  };
  ACT.lnPay = () => { const x = B.lnV; sheet('<h2>Payment from ' + esc(x.person) + '</h2><p class="muted" style="margin:0">Balance ' + money(x.balance) + '</p><label>Amount (GH₵)</label><input id="lpa" type="number" inputmode="decimal"><label>Date</label><input id="lpd" type="date" value="' + today() + '"><label>Note</label><input id="lpn"><br><button class="btn primary block" data-act="lnPaySave">Save payment</button><button class="btn block" style="margin-top:6px" data-act="close">Cancel</button>'); };
  ACT.lnPaySave = async (d, btn) => {
    const a = +$('#lpa').value; if (!(a > 0)) { toast('Type the amount'); return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try { const r = await api('loans', { op: 'pay', id: B.lnV.id, amount: a, date: $('#lpd').value || today(), note: $('#lpn').value.trim(), today: today() }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; btn.textContent = 'Save payment'; return; } B.loans = r.loans; KL.kvSet('loans', r.loans).catch(() => {}); closeSheet(); toast('Payment saved'); render(true); }
    catch (e) { toast('Needs internet to save'); btn.disabled = false; btn.textContent = 'Save payment'; }
  };
  ACT.lnRemind = () => { const x = B.lnV; window.open(KL.waLink(x.phone, 'Hello ' + x.person + ', a gentle reminder about the ' + money(x.balance) + ' balance' + (x.due ? ' we agreed to be paid by ' + x.due : '') + '. Thank you.'), '_blank', 'noopener'); };
  ACT.lnDel = () => sheet('<h2>Delete this record?</h2><p class="small">' + esc(B.lnV.person) + ' · ' + money(B.lnV.amount) + '. Its payments are removed too.</p><button class="btn danger block" data-act="lnDelGo">Yes, delete</button><button class="btn block" style="margin-top:6px" data-act="close">Cancel</button>');
  ACT.lnDelGo = async (d, btn) => { btn.disabled = true; try { const r = await api('loans', { op: 'delete', id: B.lnV.id }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } B.loans = r.loans; KL.kvSet('loans', r.loans).catch(() => {}); closeSheet(); toast('Deleted'); render(true); } catch (e) { toast('Needs internet'); btn.disabled = false; } };

  function moneyHTML() {
    const tabs = [['stock', 'Stock', 'stock'], ['exp', 'Expenses', 'money'], ['inc', 'Other income', 'income'], ['profit', 'Profit', 'money'], ['loans', 'Money given', 'owner']].filter(x => x[2] === 'owner' ? isOwner() : KL.hasMod(x[2]));
    if (!tabs.some(x => x[0] === B.mtab)) B.mtab = tabs.length ? tabs[0][0] : 'stock';
    let h = '<div class="chips" style="margin-top:6px">' + tabs.map(x => '<button class="chip ' + (B.mtab === x[0] ? 'on' : '') + '" data-act="mTab" data-k="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    if (B.mtab === 'loans') return h + loansHTML();
    if (B.mtab !== 'stock') h += '<label>Month</label><input id="mmonth" type="month" value="' + esc(B.expMonth) + '">';
    if (B.mtab === 'stock') {
      h += '<div class="row" style="gap:8px;margin:6px 0"><button class="btn primary grow" data-act="sIn">+ Stock in</button><button class="btn grow" data-act="sCount">Count stock</button></div>' +
        '<div class="row" style="gap:8px;margin:0 0 6px"><button class="btn grow" style="background:#FFF7ED;border-color:#FDBA74;color:#9A3412" data-act="toBuy">🛒 To buy' + (B.stock ? ' (' + B.stock.filter(p => p.tracked && (p.low || p.level <= 0)).length + ')' : '') + '</button><button class="btn grow" data-act="supList">Suppliers</button></div>' +
        '<button class="btn block" data-act="reqOpen" style="margin-bottom:6px;background:#EEF6FF;border-color:#93C5FD;color:#1E3A8A">📝 Request materials (company letterhead)</button>' +
        '<button class="btn violet block" data-act="bulkOpen" style="margin-bottom:6px">Add many products from a list</button>';
      if (!B.stock) return h + '<div class="empty">Loading…</div>';
      const tr = B.stock.filter(p => p.tracked), un = B.stock.filter(p => !p.tracked);
      h += '<div class="stats"><div class="stat"><span>Stock value (cost)</span><b style="font-size:17px">' + money(sum(tr, p => Math.max(0, p.level) * p.cost)) + '</b></div><div class="stat"><span>Low</span><b class="' + (tr.some(p => p.low) ? 'red' : '') + '">' + tr.filter(p => p.low).length + '</b></div></div>';
      h += '<div class="card" style="padding:4px 14px">' + (tr.length ? tr.map(p => '<div class="item"><span class="grow"><span class="nm">' + esc(p.name) + '</span><br><span class="small muted">in ' + fq(p.in, p) + ' · sold ' + fq(p.sold, p) + (p.adj ? ' · counted ' + (p.adj > 0 ? '+' : '') + p.adj : '') + (p.cost ? ' · cost ' + money(p.cost) : ' · <span class="amber">no cost price</span>') + '</span></span><span class="right"><b class="' + (p.low || p.level <= 0 ? 'red' : '') + '" style="font-size:' + (p.per ? 15 : 18) + 'px">' + fq(p.level, p) + '</b><br>' + (p.level <= 0 ? '<span class="badge red">out</span>' : p.low ? '<span class="badge red">low</span>' : '<span class="small muted">left</span>') + '</span></div>').join('') : '<div class="empty">Tap + Stock in when goods arrive.</div>') + '</div>';
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
    if (B.mtab === 'inc') {
      h += '<button class="btn primary block" data-act="incNew" style="margin-top:8px">+ Add other income</button>';
      if (!B.inc) return h + '<div class="empty">Loading…</div>';
      h += '<div class="card"><div class="row between"><b>Total this month</b><b class="green">' + money(sum(B.inc, x => x.amount)) + '</b></div><p class="small muted" style="margin:4px 0 0">Money that is not a sale or a job payment, for example hiring out a tool, a refund, or selling scrap. It is added to your profit.</p></div>';
      return h + '<div class="card" style="padding:4px 14px">' + (B.inc.length ? B.inc.map(x => '<button class="item" data-act="incOpen" data-id="' + esc(x.id) + '"><span class="grow"><span class="nm">' + esc(x.kind) + '</span><br><span class="small muted">' + esc(x.date) + (x.note ? ' · ' + esc(x.note) : '') + '</span></span><span class="amt green">' + money(x.amount) + '</span></button>').join('') : '<div class="empty">No other income this month.</div>') + '</div>';
    }
    const p = B.profit; if (!p) return h + '<div class="empty">Loading…</div>';
    const L = (a, b, c, st) => '<div class="row between" style="padding:5px 0' + (st ? ';' + st : '') + '"><span>' + a + '</span><b' + (c ? ' class="' + c + '"' : '') + '>' + b + '</b></div>';
    h += '<div class="card">' + L('Sales', money(p.sales)) + (p.tax ? L('Less tax collected (goes to GRA)', '- ' + money(p.tax), 'muted') : '') + L('Less cost of goods sold', '- ' + money(p.cogs), 'muted') + L('Gross profit', money(p.gross), '', 'border-top:1px solid var(--line)') + (p.other ? L('Plus other income', '+ ' + money(p.other), 'green') : '') +
      Object.keys(p.byCat).map(c => L('Less ' + esc(c), '- ' + money(p.byCat[c]), 'muted')).join('') +
      '<div class="row between" style="padding:8px 0 0;font-size:20px;border-top:2px solid var(--ink);margin-top:4px"><b>Profit</b><b class="' + (p.profit >= 0 ? 'green' : 'red') + '">' + money(p.profit) + '</b></div></div>';
    h += '<p class="small muted">Cost of goods uses the cost price of each product (Setup → Products, or the last Stock in). Labour and transport you charge are counted as income. "Stock for the shop" and "Owner drawings" are not counted as expenses here: stock is counted when it is sold.</p>';
    if (p.noCost.length) h += '<p class="small amber">No cost price yet: ' + p.noCost.map(esc).join(', ') + '. Add it so the profit is right.</p>';
    return h;
  }
  const prodOpts = () => ((S.lists && S.lists.products) || (S.cache && S.cache.products) || []).map(p => '<option>' + esc(p.name) + '</option>').join('');
  // quantities: cartons / packs and pieces
  const UNS = { Carton: 'ctn', Pack: 'pack', Dozen: 'dozen', Box: 'box', Roll: 'roll', Bundle: 'bundle', Bag: 'bag' };
  const uns = u => UNS[u] || String(u || 'ctn').toLowerCase();
  const pinfo = n => { const a = (S.lists && S.lists.products) || [], b = (S.cache && S.cache.products) || [], c = B.stock || []; return a.find(x => x.name === n) || c.find(x => x.name === n) || b.find(x => x.name === n) || {}; };
  function fq(v, p) {
    if (!p || !(p.per > 1)) return String(v);
    const neg = v < 0, a = Math.abs(v), c = Math.floor(a / p.per), r = r2(a - c * p.per);
    return (neg ? '−' : '') + ([c ? c + ' ' + uns(p.un) : '', r ? r + ' pcs' : ''].filter(Boolean).join(' + ') || '0');
  }
  KL.fq = fq;
  const qtyBox = (p, label) => (p.per > 1 ? '<div class="picker"><div><label>' + esc(p.un || 'Carton') + 's (' + p.per + ' each)</label><input id="sqc" type="number" inputmode="decimal" placeholder="0"></div><div><label>Loose pieces</label><input id="sq" type="number" inputmode="decimal" placeholder="0"></div></div>' : '<label>' + label + '</label><input id="sq" type="number" inputmode="decimal">');
  function stockForm(k, name) {
    const all = (S.lists && S.lists.products) || (S.cache && S.cache.products) || [];
    if (!name && all.length) name = all[0].name;
    const p = pinfo(name) || {}, inn = k === 'stockIn';
    sheet('<h2>' + (inn ? 'Stock in' : 'Count stock') + '</h2>' + (inn ? '' : '<p class="small muted" style="margin-top:0">Type what is really on the shelf. The difference is recorded.</p>') +
      '<label>Product</label><select id="sp">' + all.map(x => '<option' + (x.name === name ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' +
      qtyBox(p, inn ? 'Quantity' : 'Counted quantity') +
      (inn ? (p.per > 1 ? '<div class="picker"><div><label>Cost per ' + uns(p.un) + ' (GH₵)</label><input id="scc" type="number" inputmode="decimal" placeholder="optional"></div><div><label>or cost per piece</label><input id="sc" type="number" inputmode="decimal" placeholder="optional"></div></div>' : '<label>Cost per unit (GH₵)</label><input id="sc" type="number" inputmode="decimal" placeholder="optional">') + '<label>Note (supplier, invoice no.)</label><input id="sn" value="' + esc(p.sup || '') + '">' : '<label>Note</label><input id="sn" placeholder="optional">') +
      '<br><button class="btn primary block" data-act="sSave" data-k="' + k + '">Save</button>');
    const sel = $('#sp'); if (sel) sel.addEventListener('change', () => stockForm(k, sel.value));
  }
  ACT.sIn = d => stockForm('stockIn', d && d.p);
  ACT.sCount = d => stockForm('stockCount', d && d.p);
  ACT.sSave = async (d, btn) => {
    const name = $('#sp').value, p = pinfo(name), c = $('#sqc') ? +$('#sqc').value || 0 : 0, pc = $('#sq').value;
    if (c === 0 && pc === '') { toast('Enter the quantity'); return; }
    const qty = r2(c * (p.per > 1 ? p.per : 1) + (+pc || 0));
    let cost = $('#sc') ? +$('#sc').value || 0 : 0; if (!cost && $('#scc') && +$('#scc').value > 0 && p.per > 1) cost = Math.round(+$('#scc').value / p.per * 10000) / 10000;
    btn.disabled = true;
    try { const r = await api('biz', { op: d.k, id: KL.uid('S'), product: name, qty, cost, note: $('#sn').value }); if (!r.ok) { toast(errText(r.error)); btn.disabled = false; return; } B.stock = r.list; toast('Saved'); closeSheet(); render(true); KL.refreshCache && KL.refreshCache(); } catch (e) { toast('Needs internet'); btn.disabled = false; }
  };

  /* ---------- suppliers and the "To buy" list ---------- */
  async function sups(force) {
    if (S.lists && S.lists.suppliers && !force) return S.lists.suppliers;
    try { const r = await api('admin', { op: 'lists' }); if (r.ok) { S.lists = r; KL.kvSet('lists', r).catch(() => {}); } } catch (e) { /* offline */ }
    return (S.lists && S.lists.suppliers) || [];
  }
  const waN = p => { let n = String(p || '').replace(/[^\d]/g, ''); if (n.startsWith('0')) n = '233' + n.slice(1); return n; };
  const plural = (u, q) => q === 1 ? u : u === 'box' ? 'boxes' : u === 'pcs' ? 'pcs' : u + 's';
  ACT.toBuy = async () => {
    if (!B.stock) await loadStock();
    const list = (B.stock || []).filter(p => p.tracked && (p.low || p.level <= 0));
    const S2 = await sups(), by = {};
    list.forEach(p => { const k = p.sup || ''; (by[k] = by[k] || []).push(p); });
    const sugg = p => { const tgt = Math.max(p.lowAt * 2, p.lowAt + (p.per || 1)), need = Math.max(tgt - Math.max(p.level, 0), p.per || 1); return p.per > 1 ? Math.ceil(need / p.per) : Math.ceil(need); };
    B.buy = list.map(p => ({ name: p.name, sup: p.sup || '', per: p.per, un: p.un, q: sugg(p), level: p.level }));
    sheet('<h2>🛒 To buy</h2><p class="small muted" style="margin-top:0">Products that are low or finished, with how many to order. Change the numbers if you like, then send the list to the supplier.</p>' +
      (list.length ? Object.keys(by).sort().map(k => { const sp = S2.find(x => x.name === k);
        return '<div class="card" style="padding:8px 14px"><div class="row between"><b>' + (k ? esc(k) : 'No supplier set') + '</b>' + (sp && sp.phone ? '<span class="small muted">' + esc(sp.phone) + '</span>' : '') + '</div>' +
          by[k].map(p => { const i = B.buy.findIndex(x => x.name === p.name); return '<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line);gap:8px"><span class="grow"><span class="nm">' + esc(p.name) + '</span><br><span class="small ' + (p.level <= 0 ? 'red' : 'amber') + '">' + (p.level <= 0 ? 'Finished' : 'Left: ' + fq(p.level, p)) + '</span></span><input data-bq="' + i + '" type="number" inputmode="numeric" value="' + B.buy[i].q + '" style="width:64px;text-align:center"><span class="small" style="width:44px">' + (p.per > 1 ? uns(p.un) : 'pcs') + '</span></div>'; }).join('') +
          '<button class="btn primary block" style="margin-top:8px;background:#16A34A;border-color:#16A34A" data-act="buySend" data-s="' + esc(k) + '">Send to ' + (k ? esc(k) : 'supplier') + ' on WhatsApp</button></div>'; }).join('') : '<div class="empty">Nothing is low. 👍</div>') +
      '<p class="small muted">Set each product\'s supplier and “warn me when below” in Setup → Products.</p>');
  };
  ACT.buySend = async d => {
    document.querySelectorAll('[data-bq]').forEach(e => { const it = B.buy[+e.dataset.bq]; if (it) it.q = +e.value || 0; });
    const items = B.buy.filter(x => x.sup === d.s && x.q > 0); if (!items.length) { toast('Nothing to order'); return; }
    const sp = (await sups()).find(x => x.name === d.s), c = cfg();
    const t = 'Hello' + (d.s ? ' ' + d.s : '') + ',\nPlease supply ' + bizName() + ' with:\n' + items.map(x => '• ' + x.name + ': ' + x.q + ' ' + plural(x.per > 1 ? uns(x.un) : 'pcs', x.q)).join('\n') + '\n\nThank you.' + (c.phone ? '\n' + bizName() + ' · ' + c.phone : '');
    window.open('https://wa.me/' + (sp && sp.phone ? waN(sp.phone) : '') + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
  };
  ACT.supList = async () => {
    const L = await sups(true), P = (S.lists && S.lists.products) || [];
    sheet('<h2>Suppliers</h2><button class="btn primary block" data-act="supEdit" data-n="">+ Add supplier</button>' +
      '<div class="card" style="padding:4px 14px;margin-top:10px">' + (L.length ? L.map(x => { const ps = P.filter(p => kk(p.sup) === kk(x.name)); return '<button class="item" data-act="supEdit" data-n="' + esc(x.name) + '"><span class="grow"><span class="nm">' + esc(x.name) + '</span><br><span class="small muted">' + esc([x.phone, x.note].filter(Boolean).join(' · ')) + '<br>' + (ps.length ? ps.length + ' product' + (ps.length > 1 ? 's' : '') + ': ' + esc(ps.slice(0, 4).map(p => p.name).join(', ')) + (ps.length > 4 ? '…' : '') : 'No products linked yet') + '</span></span><span class="muted">›</span></button>'; }).join('') : '<div class="empty">Add the people you buy from. Then link products to them in Setup → Products.</div>') + '</div>');
  };
  ACT.supEdit = async d => {
    const x = d.n ? ((await sups()).find(s => s.name === d.n) || null) : null; B.supOld = x ? x.name : '';
    sheet('<h2>' + (x ? 'Edit supplier' : 'New supplier') + '</h2><label>Name</label><input id="sun" value="' + esc(x ? x.name : '') + '" placeholder="Example: Kofi Wholesale, Accra"><label>Phone (WhatsApp)</label><input id="sup" inputmode="tel" value="' + esc(x ? x.phone : '') + '"><label>What they supply / note</label><input id="sunote" value="' + esc(x ? x.note : '') + '" placeholder="Example: plasterboard, screws, angles">' +
      '<br><button class="btn primary block" data-act="supSave">Save</button>' + (x ? '<button class="btn danger block" style="margin-top:8px" data-act="supDel">Delete</button>' : '') + '<button class="btn ghost block" style="margin-top:8px" data-act="supList">Back</button>');
  };
  ACT.supSave = async (d, b) => {
    const name = $('#sun').value.trim(); if (!name) { toast('Type the name'); return; } b.disabled = true;
    try { const r = await api('more', { op: 'supSave', old: B.supOld, name, phone: $('#sup').value, note: $('#sunote').value }); if (!r.ok) { toast(errText(r.error)); b.disabled = false; return; } if (S.lists) S.lists.suppliers = r.suppliers; toast('Saved'); B.stock = null; ACT.supList(); } catch (e) { toast('Needs internet'); b.disabled = false; }
  };
  ACT.supDel = async (d, b) => {
    if (!confirm('Delete ' + B.supOld + '?')) return; b.disabled = true;
    try { const r = await api('more', { op: 'supDel', name: B.supOld }); if (r.ok && S.lists) S.lists.suppliers = r.suppliers; ACT.supList(); } catch (e) { toast('Needs internet'); b.disabled = false; }
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
    const body = { op: 'expSave', id: KL.uid('E'), cat: $('#xc').value, amount: a, date: $('#xd').value, to: $('#xt').value, job, note: $('#xn').value };
    if (fast()) {
      const j = job && J(job); if (j) addCostLocal(j, { id: body.id, date: body.date, cat: body.cat, amount: a, note: body.note, to: body.to, days: 0 });
      toast('Saved'); B.exp = null; B.profit = null;
      if (j && S.tab === 'jobs') { B.jtab = 'costs'; jobSheet(j.no, true); } else closeSheet();
      bgSend(body, 'The cost', true).then(() => { if (S.tab === 'money') loadMoney(); });
      return;
    }
    try {
      const r = await api('biz', body);
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
      '<label>What they can see</label><button class="btn sm" data-act="dmEst" style="margin:2px 0 6px">Estimates + labour (one tap)</button>' + ticks(x ? x.mods : ['sell', 'docs', 'cash'], 'dm') +
      '<label>Their Home screen shows</label>' + homeTicks(x ? x.home : ['today', 'qa', 'week', 'att'], 'dh') +
      '<label>Demo ends (at the end of this day)</label><input id="dme" type="date" value="' + esc(x ? String(x.ends || '').slice(0, 10) : def.slice(0, 10)) + '"><div class="row" style="gap:6px;margin:6px 0"><button class="btn sm grow" data-act="dmEnd" data-d="7">+1 week</button><button class="btn sm grow" data-act="dmEnd" data-d="30">+1 month</button><button class="btn sm grow" data-act="dmEnd" data-d="90">+3 months</button></div><p id="dmed" class="small muted" style="margin:0 0 6px"></p><label>Note</label><input id="dmt" value="' + esc(x ? x.note : '') + '">' +
      (x ? '<label style="display:flex;gap:8px;align-items:center;font-weight:600;color:var(--ink)"><input id="dma" type="checkbox" style="width:auto;min-height:0"' + (x.active ? ' checked' : '') + '> Switched on</label>' : '') +
      '<br><button class="btn primary block" data-act="dmSave">' + (x ? 'Save' : 'Create demo') + '</button>' + (x ? '<button class="btn violet block" style="margin-top:8px" data-act="dmShare" data-k="' + esc(x.key) + '">Send link on WhatsApp</button><button class="btn danger block" style="margin-top:8px" data-act="dmDel" data-k="' + esc(x.key) + '">Delete demo and its copy</button>' : '') +
      (x ? '' : '<p class="small muted">Creating a demo makes a copy of this shop. It takes a few seconds.</p>'));
    setTimeout(showEnd, 0);
  }
  const showEnd = () => { const v = $('#dme') && $('#dme').value, p = document.getElementById('dmed'); if (p) p.textContent = v ? 'Ends on ' + new Date(v + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ', at the end of the day.' : 'Choose the end date.'; };
  document.addEventListener('change', ev => { if (ev.target && ev.target.id === 'dme') showEnd(); });
  ACT.dmEnd = d => { const e = new Date(Date.now() + (+d.d) * 864e5); $('#dme').value = e.getFullYear() + '-' + String(e.getMonth() + 1).padStart(2, '0') + '-' + String(e.getDate()).padStart(2, '0'); showEnd(); };
  ACT.dmNew = () => demoSheet(null);
  ACT.dmEst = () => {
    document.querySelectorAll('[data-dm]').forEach(e => { e.checked = ['docs', 'est', 'build'].indexOf(e.dataset.dm) >= 0; });
    document.querySelectorAll('[data-dh]').forEach(e => { e.checked = e.dataset.dh === 'qa'; });
    toast('Ticked: Estimates, Estimator and Construction extras (labour, transport). Tap Save.');
  };
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
