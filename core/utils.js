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

// ─── DATE / TIME PICKER ARROWS ───────────────────────────────────────────────
// A thin chevron, not a filled triangle and not the ▲▼ glyph. The glyph
// collapses into an unreadable speck at hint size; a solid triangle reads, but
// it is a block of ink sitting next to a value it is supposed to defer to. A
// chevron is the same gesture drawn as a line - it points without shouting.
// It fills with currentColor, so it follows whatever state the field it
// belongs to is in - muted at rest, lit on hover.
// The arrows are a reminder that the value moves. The VALUE is the control:
// hover it, click it, then Up/Down. Horizontal keys move between fields.
function dtArrow(dir) {
  return '<svg class="dt-ico" viewBox="0 0 695 384" aria-hidden="true">' +
    '<path d="' + (dir > 0
      ? 'M 9.3 374.2 C 3.5 368.5 0 360.6 0 351.9 C 0 343.1 3.5 335.2 9.3 329.5 L 325.3 13.4 C 331 7.6 338.9 4.1 347.6 4.1 C 356.4 4.1 364.3 7.6 370 13.4 L 686 329.5 C 691.7 335.2 695.2 343.1 695.2 351.9 C 695.2 369.3 681.1 383.5 663.6 383.5 C 654.9 383.5 646.9 380 641.2 374.2 L 347.6 80.4 L 54 374.2 C 48.3 380 40.4 383.5 31.7 383.5 C 22.9 383.5 15 380 9.3 374.2 Z'
      : 'M 9.3 54.2 L 325.3 370.3 C 331 376 338.9 379.6 347.6 379.6 C 356.4 379.6 364.3 376 370 370.3 L 686 54.2 C 691.7 48.5 695.2 40.5 695.2 31.8 C 695.2 14.3 681.1 0.2 663.6 0.2 C 654.9 0.2 646.9 3.7 641.2 9.4 L 347.6 303.2 L 54 9.4 C 48.3 3.7 40.4 0.2 31.7 0.2 C 14.2 0.2 0 14.3 0 31.8 C 0 40.5 3.6 48.5 9.3 54.2 Z') +
    '"/></svg>';
}

// ─── Moving dots on a waiting button (2026-09-24) ───────────────────────────
// Any button whose words end in "…" (Sending back…, Booking…, Moving…) gets
// the user's three dots lighting up in turn while Google works. Nothing at the call
// sites changes: this watches for the label and wraps its "…" in a span that
// draws the moving dots over it. The "…" itself stays in the text, so code
// that reads a label back (e.g. === "Saving…") still sees it.
// The user's three round dots (om-33.svg), fill stripped so they take the
// button colour; CSS lights them one after another.
var _RPM_DOTS_SVG =
  '<svg class="rpm-dots-svg" viewBox="110 715 1595 385" width="14" height="3.4" fill="currentColor" aria-hidden="true">' +
  '<path class="rpm-dot" d="M 302.378906 1088.621094 C 402.585938 1088.621094 483.804688 1007.402344 483.804688 907.195312 C 483.804688 806.988281 402.585938 725.769531 302.378906 725.769531 C 202.171875 725.769531 120.953125 806.988281 120.953125 907.195312 C 120.953125 1007.402344 202.171875 1088.621094 302.378906 1088.621094 Z M 302.378906 1088.621094 "/><path class="rpm-dot" d="M 907.136719 1088.621094 C 1007.34375 1088.621094 1088.5625 1007.402344 1088.5625 907.195312 C 1088.5625 806.988281 1007.34375 725.769531 907.136719 725.769531 C 806.925781 725.769531 725.707031 806.988281 725.707031 907.195312 C 725.707031 1007.402344 806.925781 1088.621094 907.136719 1088.621094 Z M 907.136719 1088.621094 "/><path class="rpm-dot" d="M 1511.890625 1088.621094 C 1612.101562 1088.621094 1693.320312 1007.402344 1693.320312 907.195312 C 1693.320312 806.988281 1612.101562 725.769531 1511.890625 725.769531 C 1411.683594 725.769531 1330.464844 806.988281 1330.464844 907.195312 C 1330.464844 1007.402344 1411.683594 1088.621094 1511.890625 1088.621094 Z M 1511.890625 1088.621094 "/>' +
  '</svg>';

(function () {
  function wrap(btn) {
    if (btn.querySelector('.rpm-dots')) return;
    var walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
    var n, last = null;
    while ((n = walker.nextNode())) { if (n.nodeValue.trim()) last = n; }
    if (!last || !/…\s*$/.test(last.nodeValue)) return;
    var i = last.nodeValue.lastIndexOf('…');
    var tail = last.splitText(i);            // tail = "…" (+ any trailing space)
    var dots = document.createElement('span');
    dots.className = 'rpm-dots';
    dots.innerHTML = '<span class="rpm-dots-t"></span>' + _RPM_DOTS_SVG;
    dots.firstChild.textContent = tail.nodeValue;
    tail.parentNode.replaceChild(dots, tail);
  }
  function scan(root) {
    if (!root || root.nodeType !== 1) root = root && root.parentElement;
    if (!root) return;
    var b = root.closest('button');
    if (b) { wrap(b); return; }
    root.querySelectorAll && root.querySelectorAll('button').forEach(wrap);
  }
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      scan(m.target);
      m.addedNodes && m.addedNodes.forEach(function (a) { scan(a); });
    });
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
})();

// ─── Save / send feedback, one rule (2026-09-26) ────────────────────────────
// Trial, Initiate and Inquiries. While Google works the window dims and the
// pressed button keeps its moving dots. Success says nothing: the window
// closes, the card moves, or the button's words change. Failure is one red
// "Unsuccessful" badge with the reason in its tooltip. A half-success (it went
// out, but the sheet did not record it) is an amber badge, never "try again".
function _rpmAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// root: the window (or card); btn: the button that was pressed.
function rpmBusy(root, btn, on) {
  if (!root) return;
  root.classList.toggle('rpm-busy', !!on);
  if (!btn) return;
  var row = btn;
  while (row.parentElement && row.parentElement !== root) row = row.parentElement;
  if (row.parentElement === root) row.classList.toggle('rpm-keep', !!on);
  btn.classList.toggle('rpm-acting', !!on);
}

function _rpmBadge(el, cls, text, tip, align) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  el.style.color = ''; el.style.textAlign = align || 'right';
  el.innerHTML = '<span class="' + cls + '"' + (tip ? ' data-tip="' + _rpmAttr(tip) + '" data-tip-wrap' +
    (align === 'left' ? '' : ' data-tip-left') : '') + '>' + _rpmAttr(text) + '</span>';
}
function rpmFail(el, why, align)       { _rpmBadge(el, 'tl-fail', 'Unsuccessful', why, align); }
function rpmHalf(el, text, tip, align) { _rpmBadge(el, 'tl-half', text, tip, align); }

// For actions with no window (a card button): the same badges as a toast.
// A toast vanishes before anyone could hover it, so the reason is written out.
function rpmToast(kind, text, why) {
  var t = document.createElement('div');
  t.className = 'rpm-toast';
  t.innerHTML = '<span class="' + (kind === 'half' ? 'tl-half' : 'tl-fail') + '">' + _rpmAttr(text || 'Unsuccessful') + '</span>' +
    (why ? '<span class="rpm-toast-why">' + _rpmAttr(why) + '</span>' : '');
  document.body.appendChild(t);
  setTimeout(function () { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 400); }, 5000);
}

// ─── LOG LESSON ROWS (Home #logPanel and the Trial card's step 8) ───────────
// One row to start. Enter adds a row under the one you are in; Backspace in an
// empty row (not the first) removes it; the dim add-row icon under the list
// adds one at the end. The box is a .ll-rows div inside a .ll-wrap, which also
// holds the mic: it sits inside the right end of the row you are in and moves
// with you (llPlaceMic). llWire hooks the box up once and calls
// onFocus(index) / onChange() so each window keeps its own mic and Log state.
function llRowHtml() { return '<input type="text" class="rpm-field ll-row">'; }
function llAddInner() { return (typeof ROW_ADD_ICON === 'string' ? ROW_ADD_ICON : '＋'); }
function llAddHtml() {
  return '<button type="button" class="ll-add" data-tip="Adds a row.\nEnter does too." ' +
    'onclick="llAddRow(this.parentNode.querySelector(\'.ll-rows\'))">' + llAddInner() + '</button>';
}
function llPlaceMic(box) {
  if (!box || !box.parentNode) return;
  var mic = box.parentNode.querySelector('.tl-mic');
  var row = box.querySelector('.ll-row.active') || llRows(box)[0];
  if (!mic || !row) return;
  mic.style.top = (row.offsetTop + (row.offsetHeight - mic.offsetHeight) / 2) + 'px';
}
function llRows(box) { return box ? Array.prototype.slice.call(box.querySelectorAll('.ll-row')) : []; }
function llValues(box) { return llRows(box).map(function (el) { return el.value.trim(); }); }

function llWire(box, onFocus, onChange) {
  if (!box || box._llWired) return;
  box._llWired = true;
  box._llFocus = onFocus; box._llChange = onChange;
  box.addEventListener('focusin', function (ev) {
    var i = llRows(box).indexOf(ev.target);
    if (i >= 0 && box._llFocus) box._llFocus(i);
    llPlaceMic(box);
  });
  box.addEventListener('input', function () { if (box._llChange) box._llChange(); });
  box.addEventListener('keydown', function (ev) {
    var el = ev.target, rows = llRows(box), i = rows.indexOf(el);
    if (i < 0 || el.readOnly || ev.isComposing) return;
    if (ev.key === 'Enter') {
      ev.preventDefault();
      llAddRow(box, i);
    } else if (ev.key === 'Backspace' && !el.value && i > 0) {
      ev.preventDefault();
      el.remove();
      if (box._llChange) box._llChange();
      llPlaceMic(box);
      var prev = rows[i - 1];
      prev.focus();
      prev.setSelectionRange(prev.value.length, prev.value.length);
    }
  });
}

// after: index to insert below; left out = at the end.
function llAddRow(box, after) {
  if (!box || box.classList.contains('locked')) return;
  var rows = llRows(box);
  if (after === undefined || after >= rows.length) after = rows.length - 1;
  var tmp = document.createElement('div');
  tmp.innerHTML = llRowHtml();
  var el = tmp.firstChild;
  if (rows[after]) rows[after].after(el); else box.appendChild(el);
  if (box._llChange) box._llChange();
  el.focus();
}

// Back to one empty row, unlocked.
function llReset(box) {
  if (!box) return;
  box.classList.remove('locked');
  box.innerHTML = llRowHtml();
  llRows(box)[0].classList.add('active');
  llPlaceMic(box);
}

function llLock(box) {
  if (!box) return;
  box.classList.add('locked');
  llRows(box).forEach(function (el) { el.readOnly = true; });
}
