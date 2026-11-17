/* EasySales - new look: home screen, 5-button bar with More, + button, English / Twi switch.
   Customer papers (receipts, invoices, waybills) always stay in English. */
(function () {
  'use strict';
  const KL = window.KL; if (!KL) return;
  const { S, ACT, ICON, esc, money, r2, sum, cfg, bizName, logoSrc, sheet, closeSheet, LS, today } = KL;
  const render = k => KL.fn('render')(k);
  const isOwner = () => S.session && S.session.role === 'admin';
  const has = m => !KL.hasMod || KL.hasMod(m);
  const docsOn = () => (cfg().docs || 'Yes') !== 'No' && KL.docs && has('docs');

  /* ---------- Twi words (Gideon: correct any word here and send it back) ---------- */
  const TWI = {
    'Home': 'Fie', 'Sell': 'Tɔn', 'Docs': 'Nkrataa', 'Customers': 'Adetɔfoɔ', 'More': 'Nkaeɛ', 'Today': 'Ɛnnɛ',
    'History': 'Deɛ atwam', 'Cash': 'Sika', 'Setup': 'Nhyehyɛeɛ', 'Team': 'Adwumayɛfoɔ', 'Dashboard': 'Fie',
    'Sign in': 'Hyɛn mu', 'Save': 'Kora so', 'Edit': 'Sesa', 'Delete': 'Popa', 'Preview': 'Hwɛ kan',
    'Confirm and save': 'Penee so na kora', 'Check before saving': 'Hwɛ ansa na woakora',
    'Paid': 'Wɔatua', 'Part paid': 'Wɔatua bi', 'Unpaid': 'Wɔntuaeɛ', 'Overdue': 'Ɛberɛ atwam',
    'Sales today': 'Deɛ yɛatɔn ɛnnɛ', 'Received': 'Sika a aba', 'On credit': 'Firi', 'Owed to you': 'Ka a wɔde wo',
    'Quick actions': 'Ntɛm adwuma', 'Needs your attention': 'Hwɛ yeinom', 'This week': 'Nnawɔtwe yi',
    'New sale': 'Tɔn foforɔ', 'Receive cash': 'Gye sika', 'Record payment': 'Kyerɛw sika a wɔatua',
    'Reports': 'Akontabuo', 'Refresh': 'Yɛ no foforɔ', 'Language': 'Kasa', 'Sign out': 'Fi mu',
    'Add item': 'Fa adeɛ ka ho', '+ Add item': '+ Fa adeɛ ka ho', 'Customer': 'Adetɔni', 'Phone': 'Fon',
    'Location': 'Beaeɛ', 'Note (optional)': 'Nsɛm (wopɛ a)', 'Items': 'Nneɛma', 'Nobody owes you.': 'Obiara nni wo ka.',
    'What do you want to make?': 'Deɛn na wopɛ sɛ woyɛ?', 'Ceiling estimator': 'Silin estimeta',
    'Good morning': 'Maakye', 'Good afternoon': 'Maaha', 'Good evening': 'Maadwo',
    'Jobs': 'Adwuma', 'Money': 'Sika ho nsɛm', 'Stock': 'Nneɛma a ɛwɔ hɔ', 'Expenses': 'Ka a yɛbɔ', 'Profit': 'Mfasoɔ',
    'Add expense': 'Kyerɛw ka', '+ Add expense': '+ Kyerɛw ka', '+ New job': '+ Adwuma foforɔ', 'New job': 'Adwuma foforɔ', 'Start job': 'Hyɛ adwuma ase',
    'Stock in': 'Nneɛma a aba', '+ Stock in': '+ Nneɛma a aba', 'Count stock': 'Kan nneɛma', 'Running': 'Ɛrekɔ so', 'Completed': 'Awie',
    'Not started': 'Ɛnhyɛɛ aseɛ', 'Low': 'Asua', 'left': 'aka', 'Month': 'Bosome', 'Sales': 'Nneɛma a yɛatɔn', 'Total costs': 'Ka nyinaa',
    'Received from client': 'Sika a adetɔni de aba', 'Agreed price': 'Boɔ a yɛpenee so', 'Still to collect': 'Sika a ɛda so', 'Site notes': 'Adwumabea nsɛm',
    'Add': 'Fa ka ho', 'Price': 'Boɔ', 'Qty': 'Dodoɔ', 'Date': 'Da', 'Amount (GH₵)': 'Sika dodoɔ (GH₵)', 'Total': 'Ne nyinaa',
    'Paid now: cash': 'Sika a wɔatua seesei', 'Paid now: MoMo': 'MoMo a wɔatua seesei', 'Who owes you': 'Wɔn a wɔde wo ka',
    'Labour / workmanship': 'Adwumayɛ ka', 'Discount': 'Te so', 'Transport (GH₵)': 'Lɔre ka (GH₵)', 'Transport, discount and tax': 'Lɔre, te so ne towtua',
    'Reason for deleting': 'Deɛ enti a wopopa', 'Estimator': 'Nsusuiɛ', 'Gross profit': 'Mfasoɔ a edi kan', 'Waybill': 'Waybill', 'Job cards': 'Adwuma nkrataa', 'Job card': 'Adwuma krataa', 'Ready': 'Ayɛ krado', 'Collected': 'Wɔafa', 'Fixing': 'Yɛresiesie', 'Sewing': 'Yɛrepam', 'Working on': 'Yɛreyɛ', 'Customers (': 'Adetɔfoɔ ('
  };
  let lang = localStorage.getItem(LS('lang')) || 'en';
  const t = s => (lang === 'tw' && TWI[s]) || s;
  const SKIP = '.paper,.receipt,#printdoc,input,textarea,select,script,style';
  function tr(root) {
    if (lang !== 'tw' || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; const list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(x => {
      const raw = x.nodeValue, k = raw.trim(); if (!k || !TWI[k]) return;
      const el = x.parentElement; if (el && el.closest(SKIP)) return;
      x.nodeValue = raw.replace(k, TWI[k]);
    });
  }
  new MutationObserver(ms => { if (lang !== 'tw') return; ms.forEach(m => m.addedNodes.forEach(a => { if (a.nodeType === 1) tr(a); else if (a.nodeType === 3 && a.parentElement) tr(a.parentElement); })); })
    .observe(document.body, { childList: true, subtree: true });
  ACT.lang = () => { lang = lang === 'tw' ? 'en' : 'tw'; localStorage.setItem(LS('lang'), lang); closeSheet(); render(true); KL.toast(lang === 'tw' ? 'Twi' : 'English'); };

  /* ---------- look ---------- */
  const css = document.createElement('style');
  css.textContent = `
:root{--bg:#F3F5F9;--ink:#111827;--mute:#4B5563;--line:#E5E7EB;--lav:#EEF2FF;--lav2:#C7D2FE;--r:16px;--tab:68px}
html,body{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.top{padding-bottom:12px}.top img{background:#fff;border-radius:12px;width:38px;height:38px;object-fit:contain;padding:3px}
.card,.stat{border-radius:16px;box-shadow:0 1px 3px rgba(17,24,39,.06)}
.tabs{height:auto;box-shadow:0 -2px 12px rgba(17,24,39,.05)}
.tabs button{font-size:11px;gap:4px}.tabs button.on{color:var(--wine)}
.tabs button.on svg{background:color-mix(in srgb,var(--wine) 12%,#fff);border-radius:10px;padding:3px;width:30px;height:28px}
.chip.on{background:var(--wine);border-color:var(--wine)}
.btn{border-radius:12px}.tile{border-radius:14px;box-shadow:0 1px 3px rgba(17,24,39,.08)}
.lang{border:1px solid rgba(255,255,255,.45);background:transparent;color:#fff;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}
.hero{background:var(--wine);color:#fff;margin:-12px -14px 0;padding:6px 18px 66px}
.hero small{opacity:.85;font-size:13px}.hero h1{font-size:20px;margin:2px 0 0;line-height:1.2}
.sumc{background:#fff;border-radius:18px;margin:-52px 2px 0;padding:16px;box-shadow:0 6px 20px rgba(17,24,39,.08);position:relative}
.sumc .big{font-size:30px;font-weight:800;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.tri{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.tri div{border-radius:12px;padding:9px}.tri span{display:block;font-size:11px;font-weight:600}.tri b{font-size:14px;font-variant-numeric:tabular-nums}
.qa{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.qa button{border:0;background:#fff;border-radius:14px;padding:14px 4px;display:flex;flex-direction:column;align-items:center;gap:8px;box-shadow:0 1px 3px rgba(17,24,39,.06);font-weight:600;font-size:12px;min-height:84px}
.qa i{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:18px;font-weight:800}
.wk{display:flex;align-items:flex-end;gap:8px;height:96px}.wk div{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:11px;color:var(--mute)}
.wk em{display:block;width:100%;border-radius:6px 6px 3px 3px;background:var(--lav2);min-height:3px}.wk em.on{background:var(--wine)}
.att{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #EEF0F4;width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left}
.att:last-child{border-bottom:0}.att i{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;flex:none}
.fab{position:fixed;right:18px;bottom:calc(var(--tab) + 22px + env(safe-area-inset-bottom));z-index:19;width:58px;height:58px;border-radius:50%;border:0;background:var(--wine);color:#fff;font-size:30px;line-height:1;box-shadow:0 8px 20px rgba(17,24,39,.3)}
.secth{display:flex;justify-content:space-between;align-items:baseline;margin:20px 0 8px}.secth b{font-size:15px}`;
  document.head.appendChild(css);
  ICON.more = '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  ICON.home = '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';

  /* ---------- 5-button bar ---------- */
  let hidden = [];
  const _tabsFor = KL.fn('tabsFor');
  KL.setFn('tabsFor', function () {
    let tb = _tabsFor().map(x => x[0] === 'dash' ? ['dash', 'Home'] : x);
    if (tb.length > 5) { hidden = tb.slice(4); tb = tb.slice(0, 4).concat([['more', 'More']]); } else hidden = [];
    return tb;
  });
  const _tab = ACT.tab;
  ACT.tab = d => {
    if (d.t === 'more') { moreSheet(); return; }
    if (document.querySelector('.ov')) closeSheet();
    _tab(d);
  };
  function moreSheet() {
    sheet('<h2>' + t('More') + '</h2><div style="display:grid;gap:8px">' + hidden.map(x => '<button class="btn block" style="text-align:left;display:flex;align-items:center;gap:10px" data-act="tab" data-t="' + x[0] + '">' + (ICON[x[0]] || '').replace('<svg', '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9"') + x[1] + '</button>').join('') +
      '<button class="btn block ghost" data-act="lang">' + t('Language') + ': ' + (lang === 'tw' ? 'Twi → English' : 'English → Twi') + '</button></div>');
  }


  /* ---------- Home: sales persons and charts folded behind two icons ---------- */
  S.hOpen = S.hOpen || {};
  function foldHome(main) {
    const mark = document.getElementById('hrepmark'); if (!mark) return;
    const ppl = document.createElement('div'), rep = document.createElement('div');
    ppl.id = 'hfold-ppl'; rep.id = 'hfold-rep';
    // everything after the "Reports" title goes into the charts box…
    let n = mark.nextSibling; const rest = [];
    while (n) { rest.push(n); n = n.nextSibling; }
    rest.forEach(x => rep.appendChild(x));
    // …except what is about sales persons, which goes into its own box
    const day = rep.querySelector('#xdaycard'); if (day) ppl.appendChild(day);
    rep.querySelectorAll('h2').forEach(h => {
      if (/^Sales persons/.test(h.textContent)) { const c = h.nextElementSibling; ppl.appendChild(h); if (c && c.classList.contains('card')) ppl.appendChild(c); }
    });
    const wk = Array.from(main.querySelectorAll('.card')).find(c => c.querySelector('.wk') && !rep.contains(c));
    if (wk) { wk.style.marginTop = '0'; rep.insertBefore(wk, rep.firstChild); }
    const r = S.rep, dd = KL.dayData ? KL.dayData() : null;
    const act = dd ? dd.people.filter(p => p.bills || p.firstSeen).length : null;
    const pplSub = dd ? act + ' active · ' + money(r2(sum(dd.people, p => p.sales || 0))) + ' today' : (r ? money(r.todayTotals.sales) + ' sold today' : 'Who sold, who holds cash');
    const repSub = r ? money(r.monthTotals.sales) + ' this month' : 'Month, best sellers, debts';
    const SV = d => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
    const IPPL = SV('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.3.1 4.2 1.6 4.8 4.3"/>');
    const li = KL.leadsInfo ? KL.leadsInfo() : null;
    const ILEAD = SV('<path d="M4 5h16v10H8l-4 4z"/><path d="M8 9h8M8 12h5"/>');
    const IREP = SV('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M21 20H3"/>');
    const tile = (k, ic, bg, fg, ttl, sub) => '<button class="htile' + (S.hOpen[k] ? ' on' : '') + '" data-act="hfold" data-k="' + k + '"><i style="background:' + bg + ';color:' + fg + '">' + ic + '</i><b>' + ttl + '</b><span>' + sub + '</span><em>' + (S.hOpen[k] ? 'Close' : 'Open') + '</em></button>';
    mark.outerHTML = '<div class="secth"><b>Reports</b></div><div class="htiles">' +
      tile('ppl', IPPL, '#E0F2FE', '#075985', 'Sales persons', esc(pplSub)) +
      tile('rep', IREP, '#EDE9FE', '#5B21B6', 'Charts & reports', esc(repSub)) +
      (li ? '<button class="htile" data-act="tab" data-t="leads"><i style="background:#DCFCE7;color:#166534">' + ILEAD + '</i><b>Leads</b><span>' + (li.loading ? 'People from your adverts' : (li.due ? '<b style="color:#B91C1C;font-size:12.5px">' + li.due + ' to follow up today</b> · ' : '') + li.open + ' open') + '</span><em>Open</em></button>' : '') + '</div>';
    ppl.style.display = S.hOpen.ppl ? '' : 'none'; rep.style.display = S.hOpen.rep ? '' : 'none';
    main.appendChild(ppl); main.appendChild(rep);
    main.insertAdjacentHTML('beforeend', '<div style="height:90px"></div>');
  }
  ACT.hfold = d => { S.hOpen[d.k] = !S.hOpen[d.k]; render(true); };
  (function () {
    const st = document.createElement('style');
    st.textContent = '.htiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}' +
      '.htile{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;padding:14px;border:1px solid var(--line);border-radius:16px;background:#fff;font:inherit;cursor:pointer}' +
      '.htile.on{border-color:#B45309;box-shadow:0 0 0 2px #FDE7C7}' +
      '.htile i{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:20px;margin-bottom:4px}' +
      '.htile b{font-size:15px}.htile span{font-size:12.5px;color:var(--mute,#64748b);line-height:1.3}.htile em{position:absolute;top:14px;right:14px;font-style:normal;font-size:12px;font-weight:600;color:#B45309}';
    document.head.appendChild(st);
  })();

  /* ---------- after every draw ---------- */
  const _render = KL.fn('render');
  KL.setFn('render', function (k) {
    _render(k);
    if (!S.session) { tr(document.getElementById('app')); return; }
    const top = document.querySelector('.top');
    if (top && !top.querySelector('.lang')) { const b = document.createElement('button'); b.className = 'lang'; b.dataset.act = 'lang'; b.textContent = lang === 'tw' ? 'TW' : 'EN'; b.setAttribute('aria-label', 'Language'); top.insertBefore(b, document.getElementById('syncbtn')); }
    const nav = document.querySelector('nav.tabs');
    if (nav && !nav.querySelector('button.on')) { const m = nav.querySelector('[data-t=more]'); if (m) m.classList.add('on'); }
    if (nav) { const h = nav.querySelector('[data-t=dash]'); if (h) h.innerHTML = ICON.home + 'Home'; }
    const main = document.querySelector('main.wrap');
    if (main && S.tab === 'dash' && isOwner()) {
      const hh = c => !KL.homeHas || KL.homeHas(c);
      if (hh('reports')) { main.insertAdjacentHTML('afterbegin', homeHTML() + '<div class="secth" id="hrepmark"><b>Reports</b></div>'); foldHome(main); }
      else main.innerHTML = homeHTML() + '<div style="height:90px"></div>';
      if (docsOn() && !KL.docs.state.list && navigator.onLine && !KL.docs._asked) { KL.docs._asked = 1; KL.docs.load().then(() => { if (S.tab === 'dash') render(true); }); }
    }
    if (main && (S.tab === 'dash' || S.tab === 'today') && !document.querySelector('.fab')) document.body.insertAdjacentHTML('beforeend', '<button class="fab" data-act="fab" aria-label="New sale or document">+</button>');
    if (S.tab !== 'dash' && S.tab !== 'today') { const f = document.querySelector('.fab'); if (f) f.remove(); }
    tr(document.getElementById('app'));
  });

  /* ---------- home ---------- */
  function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function homeHTML() {
    const r = S.rep, tt = r ? r.todayTotals : { sales: 0, cash: 0, momo: 0 }, got = r2(tt.cash + tt.momo);
    let h = '<div class="hero"><small>' + t(greet()) + ', ' + esc(S.session.name) + '</small><h1>' + esc(bizName()) + '</h1></div>';
    const hh = c => !KL.homeHas || KL.homeHas(c);
    if (!hh('today')) h = h.replace('<div class="hero">', '<div class="hero" style="padding-bottom:18px">');
    if (hh('today')) h += '<div class="sumc"><div class="small muted" style="font-weight:600">' + t('Sales today') + '</div><div class="big">' + money(tt.sales) + '</div><div class="tri">' +
      '<div style="background:#ECFDF3;color:#14532D"><span>' + t('Received') + '</span><b>' + money(got) + '</b></div>' +
      '<div style="background:#FFF7E6;color:#78350F"><span>' + t('On credit') + '</span><b>' + money(Math.max(0, r2(tt.sales - got))) + '</b></div>' +
      '<div style="background:#EEF2FF;color:#312E81"><span>' + t('Owed to you') + '</span><b>' + money(r ? r.owedTotal : 0) + '</b></div></div></div>';
    const acts = [];
    if (has('sell')) acts.push(['sale', '₵', 'New sale', '#E0E7FF', '#3730A3']);
    if (docsOn()) acts.push(['INV', '🧾', 'Invoice', '#ECFDF3', '#166534'], ['EST', '✎', 'Estimate', '#FFF7E6', '#92400E']);
    if (docsOn() && has('est')) acts.push(['calc', '▦', 'Estimator', '#FCE7F3', '#9D174D']);
    if (has('jobs')) acts.push(['jobs', '⌂', 'Jobs', '#EDE9FE', '#5B21B6']);
    if (has('money')) acts.push(['exp', '−', 'Add expense', '#FEE2E2', '#991B1B']);
    if (has('stock')) acts.push(['stock', '▣', 'Stock', '#E0F2FE', '#075985']);
    if (docsOn()) acts.push(['WB', '🚚', 'Waybill', '#F3E8FF', '#6B21A8']);
    if (has('cash')) acts.push(['cash', '⇩', 'Receive cash', '#E0F2FE', '#075985']);
    if (has('sell')) acts.push(['custs', '☺', 'Customers', '#FCE7F3', '#9D174D']);
    if (has('cards')) acts.unshift(['cards', '✚', 'Job card', '#DCFCE7', '#166534']);
    acts.splice(6);
    if (hh('qa')) h += '<div class="secth"><b>' + t('Quick actions') + '</b></div><div class="qa">' + acts.map(a => '<button data-act="qa" data-k="' + a[0] + '"><i style="background:' + a[3] + ';color:' + a[4] + '">' + a[1] + '</i>' + t(a[2]) + '</button>').join('') + '</div>';
    if (KL.targetCard) h += KL.targetCard(r);
    if (hh('jobs') && KL.jobsCard) h += KL.jobsCard();
    if (hh('week') && r && r.days && r.month === new Date().getMonth() + 1) {
      const d0 = new Date().getDate(), from = Math.max(1, d0 - 6), days = r.days.slice(from - 1, d0), mx = Math.max.apply(null, days.map(d => d.sales).concat([1]));
      const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      h += '<div class="card" style="margin-top:16px"><div class="row between"><b>' + t('This week') + '</b><span class="small muted">' + money(sum(days, d => d.sales)) + '</span></div><div class="wk" style="margin-top:10px">' +
        days.map((d, i) => { const dt = new Date(); dt.setDate(from + i); return '<div><em class="' + (from + i === d0 ? 'on' : '') + '" style="height:' + Math.max(3, Math.round(d.sales / mx * 74)) + 'px"></em>' + DN[dt.getDay()] + '</div>'; }).join('') + '</div></div>';
    }
    const att = [];
    if (docsOn() && KL.docs.state.list) KL.docs.state.list.filter(d => d.type === 'INV').forEach(d => { const s = KL.docs.status(d)[0], b = r2(d.total - (d.paid || 0)); if (b > 0.004 && (s === 'Overdue' || s === 'Part paid' || s === 'Unpaid')) att.push({ k: 'doc', no: d.no, i: s === 'Overdue' ? '!' : '₵', bg: s === 'Overdue' ? '#FEE2E2' : '#FFF7E6', fg: s === 'Overdue' ? '#B91C1C' : '#92400E', a: esc(d.customer) + ' · ' + esc(d.no), b: s + (d.until ? ' · due ' + esc(d.until) : ''), amt: money(b), o: s === 'Overdue' ? 0 : 1 }); });
    const fdays = parseFloat(cfg().followDays); if (docsOn() && KL.docs.state.list && fdays > 0) { const cut = new Date(); cut.setDate(cut.getDate() - fdays); const cs = cut.toISOString().slice(0, 10); KL.docs.state.list.filter(d => (d.type === 'EST' || d.type === 'PF') && d.status !== 'Accepted' && d.status !== 'Declined' && d.date && d.date <= cs && !(d.until && d.until < today())).slice(0, 3).forEach(d => att.push({ k: 'doc', no: d.no, i: '↻', bg: '#E0F2FE', fg: '#075985', a: esc(d.customer) + ' · ' + esc(d.no), b: 'Estimate sent ' + esc(d.date) + ' · no answer yet. Tap to follow up', amt: money(d.total), o: 2 })); }
    if (r && r.debtors) r.debtors.slice(0, 4).forEach(p => att.push({ k: 'custs', i: '₵', bg: '#FFF7E6', fg: '#92400E', a: esc(p.name), b: t('Owed to you') + (p.last ? ' · ' + esc(p.last) : ''), amt: money(p.balance), o: 2 }));
    if (r && r.people) r.people.filter(p => p.cashHeld > 0.004).forEach(p => att.push({ k: 'cash', i: '⇩', bg: '#E0F2FE', fg: '#075985', a: esc(p.name) + ' holds cash', b: t('Receive cash'), amt: money(p.cashHeld), o: 3 }));
    if (KL.moreAttention) KL.moreAttention().forEach(x => att.push(x));
    att.sort((x, y) => x.o - y.o);
    if (hh('att')) h += '<div class="secth"><b>' + t('Needs your attention') + '</b></div><div class="card" style="padding:2px 14px">' + (att.length ? att.slice(0, 6).map(x => '<button class="att" data-act="att" data-k="' + x.k + '" data-no="' + esc(x.no || '') + '"><i style="background:' + x.bg + ';color:' + x.fg + '">' + x.i + '</i><span class="grow"><b style="font-size:14px">' + x.a + '</b><br><span class="small muted">' + x.b + '</span></span><b style="color:' + x.fg + '">' + x.amt + '</b></button>').join('') : '<div class="empty">All clear 👍</div>') + '</div>';
    return h;
  }
  async function newDoc(k) { S.tab = 'docs'; if (KL.docs.state) KL.docs.state.type = k; render(); await KL.docs.load(); ACT.dNew({ k: k }); }
  ACT.qa = async d => {
    const k = d.k;
    if (k === 'sale') return ACT.tab({ t: 'sell' });
    if (k === 'cash') return ACT.tab({ t: 'cash' });
    if (k === 'custs') return ACT.tab({ t: 'custs' });
    if (k === 'jobs') return ACT.tab({ t: 'jobs' });
    if (k === 'cards') return ACT.tab({ t: 'cards' });
    if (k === 'stock') return ACT.tab({ t: 'money' });
    if (k === 'exp') return ACT.xNew({ job: '' });
    if (k === 'calc') { await newDoc('EST'); return ACT.dEstimator(); }
    if (k === 'WB') { S.tab = 'docs'; KL.docs.state.type = 'INV'; render(); await KL.docs.load(); KL.toast('Open an invoice, then tap Make waybill'); return; }
    return newDoc(k);
  };
  ACT.att = d => { if (d.k === 'doc') { S.tab = 'docs'; KL.docs.state.type = 'INV'; render(); KL.docs.open(d.no); } else ACT.tab({ t: d.k }); };
  ACT.fab = () => {
    if (!isOwner()) return ACT.tab({ t: 'sell' });
    const o = has('sell') ? [['sale', 'New sale']] : [];
    if (docsOn()) o.push(['EST', 'Estimate'], ['PF', 'Pro forma'], ['INV', 'Invoice']);
    if (docsOn() && has('est')) o.push(['calc', 'Estimator']);
    if (has('money')) o.push(['exp', 'Add expense']);
    sheet('<h2>' + t('What do you want to make?') + '</h2><div style="display:grid;gap:8px">' + o.map(x => '<button class="btn block' + (x[0] === 'sale' ? ' primary' : '') + '" data-act="qa" data-k="' + x[0] + '">' + t(x[1]) + '</button>').join('') + '</div>');
  };
  render(true);
})();
