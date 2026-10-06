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

// ─── THE DATE / TIME PICKER (2026-10-06) ─────────────────────────────────────
// The portal's one picker; it replaced seven look-alikes. A date box, and a
// time box beside it where the time matters. Each value sits in its own
// border with a thin chevron above and below it, outside the border.
// The value is the control: click it (or, in a window, hover it) and it
// lights; ↑↓ step the lit one, a day or 15 minutes; ←→ move between boxes.
// Holding a chevron repeats. Nothing has to hold browser focus: one listener
// reads the keys for the picker you last touched, or for a window's picker as
// soon as the window opens (o.keys).
//
// rpmDtpHtml(id, o) → HTML. The values live in hidden inputs id+'Date'
// (yyyy-MM-dd) and id+'Time' (HH:mm) inside it, so code that already read
// hidden inputs keeps reading them.
//   o.date, o.time  start values ('' shows —; the first step starts from today)
//   o.noTime        the date box only
//   o.year          show the year (Travel: a trip can run into the new year)
//   o.min           'today' | 'now': the date never steps back past it
//   o.keys          take the keys as soon as it is drawn (pickers in windows)
//   o.onChange(id)  after every step
//   o.onEnter(id)   Enter, while this picker has the keys
//   o.group         pickers in one group walk into each other with ←→
// rpmDtpGet(id) → { date, time }. rpmDtpSet(id, date, time) sets and redraws.
var _RPM_DTP_DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var _RPM_DTP_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var _rpmDtp = {};            // id → { o, lit }
var _rpmDtpActive = null;    // the id the keys go to

function _dtpPad(n) { return (n < 10 ? '0' : '') + n; }
function rpmDtpParse(ymd) {
  var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function rpmDtpYmd(d) { return d.getFullYear() + '-' + _dtpPad(d.getMonth() + 1) + '-' + _dtpPad(d.getDate()); }
function _dtpMins(hhmm) {
  var m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? (+m[1] * 60 + +m[2]) : null;
}
function _dtpDateLabel(ymd, year) {
  var d = rpmDtpParse(ymd);
  if (!d) return '—';
  return _RPM_DTP_DAY[d.getDay()] + ', ' + _RPM_DTP_MON[d.getMonth()] + ' ' + d.getDate() + (year ? ', ' + d.getFullYear() : '');
}
function _dtpTimeLabel(hhmm) {
  var t = _dtpMins(hhmm);
  if (t === null) return '—';
  var h = Math.floor(t / 60);
  return ((h % 12) || 12) + ':' + _dtpPad(t % 60) + (h < 12 ? ' AM' : ' PM');
}

function rpmDtpHtml(id, o) {
  o = o || {};
  var prev = _rpmDtp[id];
  var parts = o.noTime ? ['Date'] : ['Date', 'Time'];
  var lit = Math.min(prev ? prev.lit : 0, parts.length - 1);
  _rpmDtp[id] = { o: o, lit: lit };
  if (o.keys) _rpmDtpActive = id;
  var on = _rpmDtpActive === id;
  var chev = function (i, dir) {
    return '<button type="button" class="dtp-chev" tabindex="-1" data-dtp-i="' + i + '" data-dtp-dir="' + dir + '" ' +
      'aria-label="' + (dir > 0 ? 'Later' : 'Earlier') + '">' + dtArrow(dir) + '</button>';
  };
  return '<div class="dtp" id="' + id + 'Dtp" data-dtp="' + id + '"' + (o.group ? ' data-dtp-group="' + o.group + '"' : '') + '>' +
    '<input type="hidden" id="' + id + 'Date" value="' + (o.date || '') + '">' +
    (o.noTime ? '' : '<input type="hidden" id="' + id + 'Time" value="' + (o.time || '') + '">') +
    parts.map(function (p, i) {
      var cls = 'dtp-val' + (p === 'Time' ? ' tm' : o.year ? ' yr' : '') + (on && i === lit ? ' on' : '');
      return '<div class="dtp-box">' + chev(i, 1) +
        '<div class="dtp-cell"><button type="button" class="' + cls + '" tabindex="-1" id="' + id + p + 'Lbl" data-dtp-i="' + i + '">' +
          (p === 'Date' ? _dtpDateLabel(o.date, o.year) : _dtpTimeLabel(o.time)) + '</button></div>' +
        chev(i, -1) + '</div>';
    }).join('') + '</div>';
}

// The hidden inputs sit inside the picker, so a picker that is built but not
// on the page yet (the Audit Fix window keeps eight) can still be read.
function _dtpIn(root, id, part) { return root ? root.querySelector('#' + id + part) : null; }
function _dtpRoot(id) { return document.getElementById(id + 'Dtp'); }

function rpmDtpGet(id, root) {
  root = root || _dtpRoot(id);
  var di = _dtpIn(root, id, 'Date'), ti = _dtpIn(root, id, 'Time');
  return { date: di ? di.value : '', time: ti ? ti.value : '' };
}

function rpmDtpPaint(id, root) {
  root = root || _dtpRoot(id);
  var r = _rpmDtp[id];
  if (!root || !r) return;
  var v = rpmDtpGet(id, root);
  var dl = root.querySelector('#' + id + 'DateLbl'), tl = root.querySelector('#' + id + 'TimeLbl');
  if (dl) dl.textContent = _dtpDateLabel(v.date, r.o.year);
  if (tl) tl.textContent = _dtpTimeLabel(v.time);
}

function rpmDtpSet(id, date, time, root) {
  root = root || _dtpRoot(id);
  var di = _dtpIn(root, id, 'Date'), ti = _dtpIn(root, id, 'Time');
  if (di && date != null) di.value = date;
  if (ti && time != null) ti.value = time;
  rpmDtpPaint(id, root);
}

function _rpmDtpStep(id, i, dir) {
  var r = _rpmDtp[id], root = _dtpRoot(id);
  if (!r || !root || root.closest('.rpm-busy, .tb-busy')) return;
  var o = r.o, v = rpmDtpGet(id, root);
  if (i === 0) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var d = rpmDtpParse(v.date);
    if (!d) d = today;                       // blank: the first press lands on today
    else {
      var nd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dir);
      if (dir < 0 && o.min === 'today' && nd < today) return;
      if (dir < 0 && o.min === 'now') {
        var at = new Date(nd); at.setMinutes(_dtpMins(v.time) || 0);
        if (at <= new Date()) return;
      }
      d = nd;
    }
    rpmDtpSet(id, rpmDtpYmd(d), null, root);
  } else {
    // 15-minute steps; an odd time snaps to the quarter. Stays inside the day.
    var t = _dtpMins(v.time);
    t = t === null ? 17 * 60 : Math.round(t / 15) * 15 + dir * 15;
    t = Math.max(0, Math.min(23 * 60 + 45, t));
    rpmDtpSet(id, null, _dtpPad(Math.floor(t / 60)) + ':' + _dtpPad(t % 60), root);
  }
  if (typeof o.onChange === 'function') o.onChange(id);
}

// Light box i of picker id and give it the keys. Only one picker is ever lit.
// take: a click, which also pulls focus out of a text box (Safari leaves it
// there), or the keys would keep going to the box.
function _rpmDtpLight(id, i, take) {
  var r = _rpmDtp[id];
  if (!r) return;
  r.lit = i;
  _rpmDtpActive = id;
  document.querySelectorAll('.dtp-val.on').forEach(function (el) { el.classList.remove('on'); });
  var root = _dtpRoot(id);
  if (!root) return;
  root.querySelectorAll('.dtp-val').forEach(function (el) {
    var me = +el.getAttribute('data-dtp-i') === i;
    el.classList.toggle('on', me);
    if (me && take) el.focus({ preventScroll: true });
  });
}

function _rpmDtpLetGo() {
  _rpmDtpActive = null;
  document.querySelectorAll('.dtp-val.on').forEach(function (el) { el.classList.remove('on'); });
}

(function () {
  var hold = null, lastXY = '';
  function stopHold() { if (hold) { clearTimeout(hold); hold = null; } }

  // A chevron steps on press and repeats while held. The repeat goes by id,
  // not by element: some windows redraw on every step.
  document.addEventListener('pointerdown', function (e) {
    var c = e.target.closest && e.target.closest('.dtp-chev');
    var root = e.target.closest && e.target.closest('.dtp');
    // An inline picker lets go of the keys when you click anywhere else;
    // a window's picker keeps them until the window goes.
    if (_rpmDtpActive && !root) {
      var r0 = _rpmDtp[_rpmDtpActive];
      if (!r0 || !r0.o.keys) _rpmDtpLetGo();
    }
    if (!c || e.button !== 0) return;
    e.preventDefault();
    var id = root.getAttribute('data-dtp'), i = +c.getAttribute('data-dtp-i'), dir = +c.getAttribute('data-dtp-dir');
    _rpmDtpLight(id, i, true);
    _rpmDtpStep(id, i, dir);
    stopHold();
    var wait = 420;
    (function again() {
      hold = setTimeout(function () { _rpmDtpStep(id, i, dir); wait = Math.max(60, wait * 0.7); again(); }, wait);
    })();
  });
  document.addEventListener('pointerup', stopHold);
  document.addEventListener('pointercancel', stopHold);
  window.addEventListener('blur', stopHold);

  document.addEventListener('click', function (e) {
    var v = e.target.closest && e.target.closest('.dtp-val');
    if (!v) return;
    _rpmDtpLight(v.closest('.dtp').getAttribute('data-dtp'), +v.getAttribute('data-dtp-i'), true);
  });

  // In a window, the mouse lights a box just by moving onto it. Only a mouse
  // that actually moved counts: a redraw under a still mouse is not a choice.
  document.addEventListener('mousemove', function (e) {
    var v = e.target.closest && e.target.closest('.dtp-val');
    if (!v) return;
    var xy = e.screenX + ',' + e.screenY;
    if (xy === lastXY) return;
    lastXY = xy;
    var id = v.closest('.dtp').getAttribute('data-dtp'), r = _rpmDtp[id], i = +v.getAttribute('data-dtp-i');
    if (r && r.o.keys && (_rpmDtpActive !== id || r.lit !== i)) _rpmDtpLight(id, i);
  });

  // On window, so a tab's own listener (a dropdown walking its list) goes first
  // and can claim the key.
  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var id = _rpmDtpActive, r = id && _rpmDtp[id];
    if (!r) return;
    var root = _dtpRoot(id);
    if (!root || !root.getClientRects().length) return;   // gone, or hidden
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    var n = root.querySelectorAll('.dtp-val').length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      _rpmDtpStep(id, r.lit, e.key === 'ArrowUp' ? 1 : -1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      var to = r.lit + (e.key === 'ArrowRight' ? 1 : -1);
      if (to >= 0 && to < n) { _rpmDtpLight(id, to); return; }
      if (!r.o.group) return;
      var all = Array.prototype.slice.call(document.querySelectorAll('[data-dtp-group="' + r.o.group + '"]'));
      var next = all[all.indexOf(root) + (to < 0 ? -1 : 1)];
      if (next) _rpmDtpLight(next.getAttribute('data-dtp'), to < 0 ? next.querySelectorAll('.dtp-val').length - 1 : 0);
    } else if (e.key === 'Enter' && typeof r.o.onEnter === 'function') {
      // A focused button outside the picker (Book, after the first Enter) is pressed as usual.
      if ((tag === 'BUTTON' || tag === 'A') && !root.contains(t)) return;
      e.preventDefault();
      r.o.onEnter(id);
    }
  });
})();

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
var LL_ADD_TIP = 'Instant.\nAdds a row. Enter does too.\nEach row becomes one part of the log.\nRows are joined with &quot; - &quot; when you log.';
var LL_LOG_TIP = 'Saves the lesson log.\n⌘ Enter does too.';
function llRowHtml() { return '<input type="text" class="rpm-field ll-row">'; }
function llAddInner() { return (typeof ROW_ADD_ICON === 'string' ? ROW_ADD_ICON : '＋'); }
function llAddHtml() {
  return '<button type="button" class="ll-add" data-tip="' + LL_ADD_TIP + '" ' +
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

// onSubmit: ⌘ Enter (Ctrl Enter elsewhere) logs from any row.
function llWire(box, onFocus, onChange, onSubmit) {
  if (!box || box._llWired) return;
  box._llWired = true;
  box._llFocus = onFocus; box._llChange = onChange; box._llSubmit = onSubmit;
  box.addEventListener('focusin', function (ev) {
    var i = llRows(box).indexOf(ev.target);
    if (i >= 0 && box._llFocus) box._llFocus(i);
    llPlaceMic(box);
  });
  box.addEventListener('input', function () { if (box._llChange) box._llChange(); });
  box.addEventListener('keydown', function (ev) {
    var el = ev.target, rows = llRows(box), i = rows.indexOf(el);
    if (i < 0 || el.readOnly || ev.isComposing) return;
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      if (box._llSubmit) box._llSubmit();
    } else if (ev.key === 'Enter') {
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
