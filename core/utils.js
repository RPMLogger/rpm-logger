// ─── CORE / UTILS.JS ────────────────────────────────────────────────────────
// Pure helpers. No DOM dependencies except addLog.

var EXCL = ["mother's day","mothers day","father's day","fathers day","christmas",
  "thanksgiving","new year","easter","halloween","memorial day","labor day",
  "independence day","mlk day","presidents day","veterans day","columbus day",
  "holiday","vacation","day off","closed","break"];

function isReal(n) {
  if (!n || !n.trim()) return false;
  var l = n.toLowerCase().trim();
  for (var i = 0; i < EXCL.length; i++) if (l.indexOf(EXCL[i]) !== -1) return false;
  return true;
}

var DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatEventDate(dateStr) {
  if (!dateStr) return "";
  var d = new Date(dateStr);
  return MONTHS[d.getMonth()] + " " + d.getDate();
}

function isPastDay(eventDateStr) {
  if (!eventDateStr) return false;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var d = new Date(eventDateStr); d.setHours(0, 0, 0, 0);
  return d < today;
}

function getWeekRange() {
  var d = new Date(), day = d.getDay(), diff = (day === 0) ? -6 : 1 - day;
  var mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  var sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  return MONTHS[mon.getMonth()] + " " + mon.getDate() + " – " + MONTHS[sun.getMonth()] + " " + sun.getDate();
}

// Open a student's Dropbox folder in the local Finder/Dropbox app. Copies the
// name to the clipboard and fires the "Open Student Folder" macOS Shortcut,
// which reads the clipboard and opens that folder. Shared by the student page
// and the Dropbox tab.
function openDropboxLocalFolder(name) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(name);
    } else {
      var ta = document.createElement('textarea');
      ta.value = name;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  } catch (e) {}
  window.location.href = 'shortcuts://run-shortcut?name=Open%20Student%20Folder';
}

function addLog(feedId, message, type) {
  var feed = document.getElementById(feedId);
  if (!feed) return;
  var entry = document.createElement("div");
  entry.className = "log-entry " + (type || "info");
  entry.textContent = message;
  var x = document.createElement("span");
  x.textContent = "×";
  x.style.cssText = "float:right;cursor:pointer;opacity:0.5;margin-left:12px;font-size:16px;line-height:1";
  x.onclick = function() { entry.remove(); };
  entry.appendChild(x);
  feed.appendChild(entry);
}

function playBeep(freq, duration, vol) {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq || 880; osc.type = "sine";
    gain.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 120) / 1000);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + (duration || 120) / 1000);
  } catch(e) {}
}

function callScript(url, action, params, cb) {
  var q = url + "?action=" + action;
  for (var k in params) q += "&" + k + "=" + encodeURIComponent(params[k]);
  fetch(q)
    .then(function(r) { return r.json(); })
    .then(cb)
    .catch(function() { addLog("lessonFeed", "❌ Connection error.", "error"); });
}
