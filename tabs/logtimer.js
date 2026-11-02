// ─── TABS / LOGTIMER.JS ─────────────────────────────────────────────────────
// Silent log timer (2026-11-02): how long logging a lesson takes, from the Log
// window opening to the recap email going out. Nothing shows in the window.
// Counts only while the window is open, the portal tab is in front, and there
// was a click or key press in the last 3 minutes; split per page (1 Log,
// 2 Materials, 3 Schedule, 4 Email). A lesson closed half done keeps its time
// in this browser (localStorage logTimes) and adds to it when reopened. When
// the email is sent the row goes to "Log Times" (saveLogTime, RPM_LogTimes.js).

var LT_IDLE = 3 * 60 * 1000;
var _lt = null;   // { key, name, day, trial, page, segStart, lastAct }

function _ltAll() { try { return JSON.parse(localStorage.getItem('logTimes') || '{}'); } catch (e) { return {}; } }
function _ltPut(all) { try { localStorage.setItem('logTimes', JSON.stringify(all)); } catch (e) {} }

// Adds the running stretch to the current page; stops at the last activity + 3 min.
function _ltFlush() {
  if (!_lt || !_lt.segStart) return;
  var end = Math.min(Date.now(), _lt.lastAct + LT_IDLE), ms = Math.max(0, end - _lt.segStart);
  _lt.segStart = document.hidden ? null : Date.now();
  if (!ms) return;
  var all = _ltAll(), r = all[_lt.key] || (all[_lt.key] = { name: _lt.name, day: _lt.day, trial: _lt.trial, at: Date.now(), ms: {}, sittings: 0 });
  r.ms[_lt.page] = (r.ms[_lt.page] || 0) + ms;
  r.at = Date.now();
  _ltPut(all);
}

function ltStart(name, day, trial) {
  if (_lt) ltStop();
  var key = name + '|' + day, all = _ltAll();
  // Lessons left unfinished for over 2 weeks are dropped.
  Object.keys(all).forEach(function (k) { if (Date.now() - all[k].at > 14 * 864e5) delete all[k]; });
  var r = all[key] || (all[key] = { name: name, day: day, trial: !!trial, at: Date.now(), ms: {}, sittings: 0 });
  r.sittings++;
  _ltPut(all);
  _lt = { key: key, name: name, day: day, trial: !!trial, page: 1, segStart: document.hidden ? null : Date.now(), lastAct: Date.now() };
}

// The window turned to another page.
function ltPage(p) {
  if (!_lt || !p || _lt.page === p) return;
  _ltFlush();
  _lt.page = p;
}

function ltStop() { _ltFlush(); _lt = null; }

// The recap email went out: the lesson's row goes to Log Times.
function ltFinish(name, day) {
  if (_lt && _lt.key === name + '|' + day) { _ltFlush(); _lt = null; }   // done: the window closing adds nothing more
  var key = name + '|' + day, all = _ltAll(), r = all[key];
  if (!r) return;
  delete all[key];
  _ltPut(all);
  var s = function (p) { return Math.round((r.ms[p] || 0) / 1000); };
  var total = s(1) + s(2) + s(3) + s(4);
  if (!total) return;
  var q = '&name=' + encodeURIComponent(name) + '&day=' + day + '&total=' + total + '&p1=' + s(1) + '&p2=' + s(2) + '&p3=' + s(3) + '&p4=' + s(4) +
          '&sittings=' + (r.sittings || 1) + (r.trial ? '&trial=1' : '');
  var url = getScriptUrl();
  if (url) fetch(url + '?action=saveLogTime' + q).catch(function () {});   // silent: a lost row is not worth a warning
}

// Activity: after 3+ idle minutes a new stretch starts now.
function _ltAct() {
  if (!_lt) return;
  var now = Date.now();
  if (_lt.segStart && now - _lt.lastAct > LT_IDLE) { _ltFlush(); _lt.segStart = now; }
  else if (!_lt.segStart && !document.hidden) _lt.segStart = now;
  _lt.lastAct = now;
}
['mousedown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, _ltAct, true); });
document.addEventListener('visibilitychange', function () {
  if (!_lt) return;
  if (document.hidden) _ltFlush();
  else { _lt.segStart = Date.now(); _lt.lastAct = Date.now(); }
});
window.addEventListener('pagehide', function () { if (_lt) _ltFlush(); });
