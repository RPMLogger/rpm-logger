// ─── CORE / USAGE.JS ────────────────────────────────────────────────────────
// Silent portal-usage tracking (2026-11-09): which tabs I open, how long I stay
// on each, and every button I press. Nothing shows anywhere; Data ▾ Portal Usage
// (tabs/usage.js) reads it back.
// Time on a tab counts only while the portal is in front and there was a click,
// key press or scroll in the last 3 minutes (the log timer's rule, logtimer.js).
// Events wait in this browser (localStorage rpmUsageQ) and go to the "Portal
// Usage" sheet in batches every 3 minutes and when the portal closes (GET only,
// saveUsage, RPM_Usage.js). Not sent from localhost previews.
// Event = [ms, kind, tab, label, seconds]; kind t = tab opened, T = more time
// on the same visit, b = button.

var US_IDLE = 3 * 60 * 1000;
var US_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
var _us = { tab: null, opened: 0, sent: false, ms: 0, segStart: null, lastAct: Date.now(), sending: false };

function _usQ() { try { return JSON.parse(localStorage.getItem('rpmUsageQ') || '[]'); } catch (e) { return []; } }
function _usPutQ(q) { try { localStorage.setItem('rpmUsageQ', JSON.stringify(q.slice(-3000))); } catch (e) {} }
function _usPush(ev) { var q = _usQ(); q.push(ev); _usPutQ(q); }

// Adds the running stretch to the current tab; stops at the last activity + 3 min.
function _usAdd() {
  if (!_us.tab || !_us.segStart) return;
  var end = Math.min(Date.now(), _us.lastAct + US_IDLE);
  _us.ms += Math.max(0, end - _us.segStart);
  _us.segStart = document.hidden ? null : Date.now();
}

// The time so far goes in the queue: the first row of a visit is the open, later ones more time.
function _usCheckpoint() {
  if (!_us.tab) return;
  _usAdd();
  var s = Math.round(_us.ms / 1000);
  if (_us.sent && s < 1) return;
  _usPush([_us.sent ? Date.now() : _us.opened, _us.sent ? 'T' : 't', _us.tab, '', s]);
  _us.sent = true;
  _us.ms = 0;
}

// switchTab (index.html) calls this with every tab shown.
function rpmUsageTab(tab) {
  if (!tab || tab === _us.tab) return;
  _usCheckpoint();
  _us.tab = tab; _us.opened = Date.now(); _us.sent = false; _us.ms = 0;
  _us.segStart = document.hidden ? null : Date.now();
  _us.lastAct = Date.now();
}

// A button's name: its words, or what it is for when it has none (icon buttons).
function _usLabel(el) {
  var t = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
  if (!t) t = el.getAttribute('title') || '';
  if (!t) { var tip = el.getAttribute('data-tip') || ''; t = tip.split(/\n|&#10;/)[0].replace(/\.$/, ''); }
  if (!t) t = el.dataset.k || el.dataset.tab || el.id || '';
  return t.slice(0, 40);
}

// The window a button sits in, by its title.
function _usWin(el) {
  var w = el.closest('.im-notes-back, .settings-overlay, .rpm-dlg-overlay');
  if (!w) return '';
  var h = w.querySelector('.settings-title, .rpm-dlg-title, .win-title, h2, h3');
  return h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) : 'Window';
}

document.addEventListener('click', function (e) {
  var el = e.target && e.target.closest && e.target.closest('button, a, [role="button"], [onclick]');
  if (!el || el.closest('.tabs') || el.id === '__safeBadge') return;   // tab buttons count as tab opens
  var lab = _usLabel(el);
  if (!lab) return;
  var w = _usWin(el);
  _usPush([Date.now(), 'b', _us.tab || '', (w && w !== lab ? w + ' › ' : '') + lab, 0]);
}, true);

// Sends the queue in pieces short enough for a GET address.
function _usSend(leaving) {
  if (US_LOCAL || _us.sending) return;
  var url = (document.getElementById('scriptUrl') || {}).value || localStorage.getItem('scriptUrl') || '';
  url = url.trim();
  var q = _usQ();
  if (!url || !q.length) return;
  var batch = [], len = 0;
  for (var i = 0; i < q.length; i++) {
    var n = encodeURIComponent(JSON.stringify(q[i])).length + 3;
    if (batch.length && len + n > 1500) break;
    batch.push(q[i]); len += n;
  }
  var src = url + '?action=saveUsage&ev=' + encodeURIComponent(JSON.stringify(batch));
  var drop = function () { var all = _usQ(); all.splice(0, batch.length); _usPutQ(all); };
  if (leaving) { drop(); try { fetch(src, { keepalive: true }).catch(function () {}); } catch (e) {} return; }
  _us.sending = true;
  fetch(src).then(function (r) { return r.json(); }).then(function (d) {
    _us.sending = false;
    if (d && d.success) { drop(); if (_usQ().length) _usSend(); }
  }).catch(function () { _us.sending = false; });   // silent: tries again next round
}

// Activity: after 3+ idle minutes a new stretch starts now.
function _usAct() {
  var now = Date.now();
  if (_us.segStart && now - _us.lastAct > US_IDLE) { _usAdd(); _us.segStart = now; }
  else if (!_us.segStart && !document.hidden) _us.segStart = now;
  _us.lastAct = now;
}
['mousedown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, _usAct, true); });
document.addEventListener('visibilitychange', function () {
  if (document.hidden) _usAdd();
  else { _us.segStart = Date.now(); _us.lastAct = Date.now(); }
});
window.addEventListener('pagehide', function () { _usCheckpoint(); _usSend(true); });
setInterval(function () { _usCheckpoint(); _usSend(); }, US_IDLE);
