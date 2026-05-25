// ─── CORE / STORAGE.JS ──────────────────────────────────────────────────────
// All localStorage logic lives here.
// Week key resets every Monday — clean slate each week.

function getWeekKey() {
  var d = new Date();
  var day = d.getDay();
  var diff = (day === 0) ? -6 : 1 - day;
  var mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  var y  = mon.getFullYear();
  var m  = String(mon.getMonth() + 1).padStart(2, '0');
  var dd = String(mon.getDate()).padStart(2, '0');
  return 'logged_' + y + '-' + m + '-' + dd;
}

function loadLoggedSet() {
  try {
    var raw = localStorage.getItem(getWeekKey());
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function saveLoggedSet() {
  try { localStorage.setItem(getWeekKey(), JSON.stringify(loggedKeys)); } catch(e) {}
}

// loggedKeys: keyed by "name||YYYY-MM-DD"
var loggedKeys = loadLoggedSet();

function getLessonKey(name, eventDate) {
  var dateStr = eventDate ? new Date(eventDate).toISOString().slice(0, 10) : 'nodate';
  return name + '||' + dateStr;
}

function isLessonLogged(name, eventDate) {
  return !!loggedKeys[getLessonKey(name, eventDate)];
}

function markLessonLogged(name, eventDate) {
  loggedKeys[getLessonKey(name, eventDate)] = true;
  saveLoggedSet();
}

// Script URL
function getScriptUrl() {
  var url = document.getElementById('scriptUrl').value.trim();
  if (!url) { openSettings(); return null; }
  localStorage.setItem('scriptUrl', url);
  return url;
}
