// ─── TABS / USAGE.JS ────────────────────────────────────────────────────────
// Data ▾ Portal Usage (2026-11-09): how I use the portal, in the Dashboard look.
//   Logging a lesson  averages from the Log Times sheet (logtimer.js), first
//   By week           the last 8 weeks of logging
//   Tabs              time + opens per tab; Never opened
//   Buttons           most pressed; Pressed once
// Tabs and buttons come from core/usage.js (Portal Usage sheet). One backend
// read, getPortalUsage (RPM_Usage.js). Last 30 days / All time picks the range.

var _usData = null, _usView = 'month';

function initUsageTab() {
  try { _usView = localStorage.getItem('usageView') || 'month'; } catch (e) {}
  var body = document.getElementById('usageBody');
  if (!_usData) body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  else _usRender();
  var url = (document.getElementById('scriptUrl') || {}).value || localStorage.getItem('scriptUrl') || '';
  if (!url) { if (!_usData) body.innerHTML = '<div class="empty-state">No script address in Settings.</div>'; return; }
  fetch(url.trim() + '?action=getPortalUsage').then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.success) throw new Error(d && d.message || 'No answer');
    _usData = d; _usRender();
  }).catch(function () {
    if (!_usData) body.innerHTML = '<div class="empty-state">Couldn\'t load the usage numbers.</div>';
  });
}

function _usSetView(v) {
  _usView = v;
  try { localStorage.setItem('usageView', v); } catch (e) {}
  _usRender();
}

// Minutes with one decimal ("4.5 min"); time on a tab as "2h 15m" / "12m" / "40s".
function _usMin(m) { return (Math.round(m * 10) / 10).toFixed(1) + ' min'; }
function _usDur(s) {
  if (s < 60) return Math.round(s) + 's';
  var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  if (m === 60) { h++; m = 0; }
  return h ? h + 'h ' + m + 'm' : m + 'm';
}
function _usAvg(rows, i) { return rows.length ? rows.reduce(function (a, r) { return a + r[i]; }, 0) / rows.length : 0; }
function _usEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _usTabName(t) {
  var b = document.querySelector('.tabs .tab-btn[data-tab="' + t + '"]');
  if (!b) return t;
  var c = b.cloneNode(true);
  c.querySelectorAll('.inq-badge, span:not(:only-child)').forEach(function (x) { if (/^\s*[\d!]*\s*$/.test(x.textContent)) x.remove(); });   // red-dot counts (Comms 16)
  return c.textContent.replace(/\s+/g, ' ').trim() || t;
}

function _usRow(l, v, sub, lead) {
  return '<div class="ld-row' + (lead ? ' lead' : '') + '"><span class="ld-l">' + l + '</span>' +
         '<span class="ld-v">' + v + (sub ? '<span class="us-note"> · ' + sub + '</span>' : '') + '</span></div>';
}
function _usCard(title, rows) {
  return '<div class="inq-dcard ld-card"><div class="ld-title">' + title + '</div>' + rows + '</div>';
}
function _usNone(t) { return '<div class="ld-note">' + t + '</div>'; }

function _usRender() {
  var body = document.getElementById('usageBody'), d = _usData;
  if (!body || !d) return;
  document.querySelectorAll('#usageViews .link-btn').forEach(function (b) { b.classList.toggle('lit', b.dataset.view === _usView); });
  var cut = _usView === 'month' ? Date.now() - 30 * 864e5 : 0;
  var html = '';

  // Logging a lesson. Row = [finished ms, total, log, materials, schedule, email, upload, sittings, trial]
  var log = d.log.filter(function (r) { return r[0] >= cut; });
  if (!log.length) html += _usCard('Logging a lesson', _usNone('No lessons logged in this range yet'));
  else {
    var reg = log.filter(function (r) { return !r[8]; }), tri = log.filter(function (r) { return r[8]; });
    var up = log.filter(function (r) { return r[6] > 0; });
    var tot = log.map(function (r) { return r[1]; }).sort(function (a, b) { return a - b; });
    var rows = _usRow('Average', _usMin(_usAvg(log, 1)), log.length + (log.length === 1 ? ' lesson' : ' lessons'), true) +
      _usRow('1 · Log', _usMin(_usAvg(log, 2))) +
      _usRow('2 · Materials', _usMin(_usAvg(log, 3)), up.length ? 'uploads ' + _usMin(_usAvg(up, 6)) + ' (' + up.length + (up.length === 1 ? ' lesson)' : ' lessons)') : '') +
      _usRow('3 · Schedule', _usMin(_usAvg(log, 4))) +
      _usRow('4 · Email', _usMin(_usAvg(log, 5))) +
      '<hr class="ld-rule">' +
      (reg.length ? _usRow('Regular lessons', _usMin(_usAvg(reg, 1)), reg.length + (reg.length === 1 ? ' lesson' : ' lessons')) : '') +
      (tri.length ? _usRow('Trials', _usMin(_usAvg(tri, 1)), tri.length + (tri.length === 1 ? ' trial' : ' trials')) : '') +
      _usRow('Fastest', _usMin(tot[0])) +
      _usRow('Slowest', _usMin(tot[tot.length - 1])) +
      _usRow('In one sitting', Math.round(100 * log.filter(function (r) { return r[7] <= 1; }).length / log.length) + '%');
    html += _usCard('Logging a lesson', rows);
  }

  // By week: the last 8 weeks (Mon–Sun), newest first; the range picker doesn't apply.
  var mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var wk = '';
  for (var i = 0; i < 8; i++) {
    var a = new Date(mon); a.setDate(mon.getDate() - 7 * i);
    var b = new Date(a); b.setDate(a.getDate() + 7);
    var inWk = d.log.filter(function (r) { return r[0] >= a.getTime() && r[0] < b.getTime(); });
    if (inWk.length) wk += _usRow('Week of ' + MO[a.getMonth()] + ' ' + a.getDate(), _usMin(_usAvg(inWk, 1)), inWk.length + (inWk.length === 1 ? ' lesson' : ' lessons'));
  }
  html += _usCard('Logging · by week', wk || _usNone('Nothing logged in the last 8 weeks'));

  // Tabs. Row = [tab, opens, seconds]
  var since = d.since ? new Date(d.since) : null;
  var started = since ? 'Tracking since ' + MO[since.getMonth()] + ' ' + since.getDate() + ', ' + since.getFullYear() : '';
  var tabs = (d.tabs[_usView] || []).slice().sort(function (x, y) { return y[2] - x[2] || y[1] - x[1]; });
  var tabRows = tabs.map(function (t) {
    return _usRow(_usEsc(_usTabName(t[0])), _usDur(t[2]), t[1] + (t[1] === 1 ? ' open' : ' opens'));
  }).join('');
  html += _usCard('Tabs · time spent', (tabRows || _usNone('No tab visits yet')) + (started ? _usNone(started) : ''));

  var seen = {};
  tabs.forEach(function (t) { seen[t[0]] = 1; });
  var never = [];
  document.querySelectorAll('.tabs .tab-btn[data-tab]').forEach(function (b) {
    if (b.closest('.sb-soon')) return;   // Coming Soon tabs aren't built
    var t = b.dataset.tab;
    if (!seen[t] && never.indexOf(t) < 0) never.push(t);
  });
  html += _usCard('Tabs · never opened', since
    ? (never.length ? '<div class="us-list">' + never.map(function (t) { return _usEsc(_usTabName(t)); }).join(' · ') + '</div>' : _usNone('Every tab was opened'))
    : _usNone('Waiting for the first visits'));

  // Buttons. Row = [tab, label, count]
  var btn = (d.buttons[_usView] || []).slice().sort(function (x, y) { return y[2] - x[2]; });
  var top = btn.slice(0, 30).map(function (x) {
    return _usRow(_usEsc(x[1]), x[2] + (x[2] === 1 ? ' press' : ' presses'), x[0] ? _usEsc(_usTabName(x[0])) : '');
  }).join('');
  html += _usCard('Buttons · most pressed', top || _usNone('No buttons pressed yet'));
  var once = btn.filter(function (x) { return x[2] === 1; });
  if (once.length) html += _usCard('Buttons · pressed once', once.slice(0, 40).map(function (x) {
    return _usRow(_usEsc(x[1]), x[0] ? _usEsc(_usTabName(x[0])) : '—');
  }).join('') + (once.length > 40 ? _usNone('+ ' + (once.length - 40) + ' more') : ''));

  body.innerHTML = '<div class="ld-cards">' + html + '</div>';
}
