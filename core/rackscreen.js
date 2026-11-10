// THE RACK SCREEN (user, 2026-11-08): the amber screen in the middle of the Home rack.
// One warning at a time, most urgent first: new texts, new emails, new inquiries,
// Initiate replies, the two audits (Lessons, Payments), then holidays coming up (the Today pop-up's 15-day window).
// The audits come from their saved results (tabs/ctrl.js _auCache, import.js _ck): the portal runs them
// ONCE in the background ~10s after it opens (_rsAuditRun), one after another, never on a timer.
// Until that run is back the screen reads LOADING / CHECKING AUDITS (no old saved counts).
// ‹ › step through them, clicking the screen opens that tab. Nothing waiting = the day + date.
// No auto-cycling: it stays on what it shows until you press an arrow or that warning clears.
// The 3-second redraw reads only what the portal already has (badges, commsAlertList, saved audits, _tdHolNear); it fetches nothing.
// Trial forms: no "new" signal exists yet, so they're not here.
var _rsKey = null;   // the warning on screen, kept across refreshes
var _rsReady = false;   // false until the opening audit run is back: the screen reads LOADING, never old saved counts (user, 2026-11-08)

function _rsBadge(id) {
  var b = document.getElementById(id);
  if (!b || b.style.display === 'none') return 0;
  return parseInt(b.textContent, 10) || 0;
}

function _rsItems() {
  var out = [], add = function (k, n, one, many, tab) {
    if (n > 0) out.push({ k: k, n: n, top: n + ' ' + (n === 1 ? one : many), tab: tab });
  };
  add('texts', typeof commsAlertList !== 'undefined' ? commsAlertList.length : 0, 'new text', 'new texts', 'comms');
  add('emails', _rsBadge('emNavBadge'), 'new email', 'new emails', 'emails');
  add('inq', _rsBadge('inqBadge'), 'new inquiry', 'new inquiries', 'inquiries');
  add('init', _rsBadge('initNavBadge'), 'Initiate reply', 'Initiate replies', 'initiate');
  var lessons = _rsLessonsAudit();
  if (lessons) out.push({ k: 'au-lessons', n: lessons, top: lessons + ' in Lessons audit', fn: 'lessons' });
  var owe = (typeof _auCache !== 'undefined' && _auCache.unpaid && _auCache.unpaid.list) ? _auCache.unpaid.list.length : 0;
  add('au-pay', owe, 'payment due', 'payments due', null);
  if (owe) out[out.length - 1].fn = 'payments';
  if (typeof _tdHolNear === 'function') {
    var t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    _tdHolNear().forEach(function (e) {
      if (typeof _tdHolPersonal === 'function' && _tdHolPersonal(e)) return;   // no lessons affected, like the Today pop-up
      var d = Math.round((e.d - today) / 864e5);
      var when = d <= 0 ? (e.last >= today ? 'now' : '') : d === 1 ? 'tomorrow' : 'in ' + d + ' days';
      out.push({ k: 'hol|' + e.i.n + '|' + e.d.getTime(), top: e.i.n, sub: when, tab: 'holidays' });
    });
  }
  return out;
}

// Students on the Lessons audit page: the sync cards (dates, block sync, calendar) plus
// the checklist's lessons still open from before today. One per student, like the page.
function _rsLessonsAudit() {
  var names = {};
  var c = typeof _auCache !== 'undefined' && _auCache.sync;
  if (c && c.dates) [c.dates, c.sync, c.cal || []].forEach(function (l) { (l || []).forEach(function (x) { names[x.name] = 1; }); });
  if (typeof _ck !== 'undefined' && (_ck.loaded || (typeof _ckFromCache === 'function' && _ckFromCache()))) {
    var t = _tdYmd();
    (_ck.audit || []).forEach(function (a) { if ((a.lessons || []).some(function (l) { return l.date < t; })) names[a.name] = 1; });
  }
  return Object.keys(names).length;
}

// The one background run: Lessons audit, then Payments, then the checklist (if nothing read it yet).
function _rsAuditRun() {
  var url = typeof getScriptUrl === 'function' && getScriptUrl();
  if (!url || typeof _auFetchSync !== 'function') { _rsReady = true; _rsRender(); return; }
  _auFetchSync(url, function () {
    _auFetchUnpaid(url, function () {
      if (typeof _ck !== 'undefined' && !_ck.loaded && !_ck.busy && typeof _ckLoad === 'function') _ckLoad();
      _rsReady = true;   // a failed run ends the wait too: the screen then shows what it has
      _rsRender();
    });
  });
}

// THE TO-DO METER (user, 2026-11-09): the Calendar's VU meter moved to the Home rack (was the grille). The needle = everything waiting
// on the screen added up (texts, emails, inquiries, Initiate replies, Lessons audit, payments due; not holidays). 0 = nothing to do;
// the 0 mark = 10 things; past it, the red. The screen beside it says what they are, so no hover.
var HR_VU_FULL = 10, _hrVuLast = null;
function _hrVuRender() {
  var el = document.getElementById('hrVu');
  if (!el || typeof _calVuSvg !== 'function') return;
  // waits for the audits like the screen does: the needle stays at rest until the real total is in (user, 2026-11-09: "show reality")
  var total = _rsReady ? _rsItems().reduce(function (a, it) { return a + (it.n || 0); }, 0) : null;
  if (total === _hrVuLast && el.firstChild) return;
  _hrVuLast = total;
  el.innerHTML = _calVuSvg(total == null ? null : total / HR_VU_FULL);
}

// THE NEEDLE FLUTTERS WHILE THE PORTAL WORKS (user, 2026-11-10): while anything loads, refreshes or saves (any visible rolling ring,
// or the screen still checking audits) the needle wiggles a few degrees around where it is, like a real VU with signal, and settles
// back when it's done. Small on purpose: a wide swing would read as the to-do count changing. Pivot = the SVG's (40,74).
var _vuWig = { a: 0, v: 0, target: 0, next: 0, raf: 0 };
function _vuBusyNow() {
  if (typeof _rsReady !== 'undefined' && !_rsReady) return true;
  var rings = document.querySelectorAll('.rpm-loading');
  for (var i = 0; i < rings.length; i++) if (rings[i].getClientRects().length) return true;
  return false;
}
function _vuWigStep(t) {
  var w = _vuWig, busy = _vuBusyNow();
  if (busy && t > w.next) { w.target = (Math.random() * 2 - 1) * 3.5; w.next = t + 90 + Math.random() * 160; }   // ±3.5°, a new kick every 90–250ms
  if (!busy) w.target = 0;
  w.v = (w.v + (w.target - w.a) * 0.12) * 0.82;   // a damped spring: the needle overshoots a touch and settles, like the real thing
  w.a += w.v;
  var line = document.querySelector('#hrVu .cr-needle');
  if (line) line.setAttribute('transform', Math.abs(w.a) < 0.02 ? '' : 'rotate(' + w.a.toFixed(2) + ' 40 74)');
  if (!busy && Math.abs(w.a) < 0.02 && Math.abs(w.v) < 0.02) { w.a = w.v = 0; w.raf = 0; return; }   // at rest: stop until the next check
  w.raf = requestAnimationFrame(_vuWigStep);
}
setInterval(function () { if (!_vuWig.raf && !document.hidden && _vuBusyNow()) _vuWig.raf = requestAnimationFrame(_vuWigStep); }, 200);

function _rsRender() {
  _hrVuRender();
  var lcd = document.getElementById('hrLcd');
  if (!lcd) return;
  if (!_rsReady) {
    var wait = 'LOADING<small>CHECKING AUDITS</small>';
    if (lcd.innerHTML !== wait) lcd.innerHTML = wait;
    lcd.classList.remove('go'); lcd.dataset.tab = ''; lcd.dataset.fn = '';
    document.querySelectorAll('.home-rack .hr-arw').forEach(function (b) { b.disabled = true; });
    return;
  }
  _rsKnobGlow();
  var items = _rsItems(), i = 0;
  items.forEach(function (it, n) { if (it.k === _rsKey) i = n; });
  var it = items[i];
  _rsKey = it ? it.k : null;
  var top, sub;
  if (!it) {
    var d = new Date();
    top = d.toLocaleDateString('en-US', { weekday: 'long' });
    sub = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    top = it.top;
    sub = [it.sub, items.length > 1 ? (i + 1) + ' of ' + items.length : ''].filter(Boolean).join(' · ');
  }
  var html = _rsEsc(top.toUpperCase()) + (sub ? '<small>' + _rsEsc(sub.toUpperCase()) + '</small>' : '');
  if (lcd.innerHTML !== html) lcd.innerHTML = html;
  lcd.classList.toggle('go', !!it);
  lcd.dataset.tab = it ? (it.tab || '') : '';
  lcd.dataset.fn = it ? (it.fn || '') : '';
  document.querySelectorAll('.home-rack .hr-arw').forEach(function (b) { b.disabled = items.length < 2; });
}

// The Audit + Payments amp knobs glow gold like Comms while their audit has something (user, 2026-11-08):
// Audit = students on the Lessons audit, Payments = payments due. Only once the fresh audits are in.
function _rsKnobGlow() {
  var owe = (typeof _auCache !== 'undefined' && _auCache.unpaid && _auCache.unpaid.list) ? _auCache.unpaid.list.length : 0;
  var on = { audit: _rsReady && _rsLessonsAudit() > 0, payments: _rsReady && owe > 0 };
  Object.keys(on).forEach(function (k) {
    var b = document.querySelector('.amp-knob[data-k="' + k + '"]');
    if (b) b.classList.toggle('rpm-alert', on[k]);
  });
}

function _rsEsc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function rackScreenStep(dir) {
  var items = _rsItems();
  if (items.length < 2) return;
  var i = 0;
  items.forEach(function (it, n) { if (it.k === _rsKey) i = n; });
  _rsKey = items[(i + dir + items.length) % items.length].k;
  _rsRender();
}

function rackScreenOpen() {
  var lcd = document.getElementById('hrLcd');
  if (!lcd) return;
  if (lcd.dataset.fn === 'lessons') { openLessonAudit(); return; }
  if (lcd.dataset.fn === 'payments') { switchTab('audit'); openPayAudit(); return; }
  if (lcd.dataset.tab) switchTab(lcd.dataset.tab);
}

(function () {
  function start() { _rsRender(); setInterval(_rsRender, 3000); setTimeout(_rsAuditRun, 10000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
