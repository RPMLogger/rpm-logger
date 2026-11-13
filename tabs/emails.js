// ─── TABS / EMAILS.JS ───────────────────────────────────────────────────────
// Emails tab (2026-11-02; two panes 2026-11-12, user): like Comms / Mail —
// Mail's sidebar (the two mailboxes), the list, the open email on the right.
//   Students     the 7 NEWEST emails from students and trial people
//                (user, 2026-11-12; was the last 7 days), new ones first.
//   G Business   the G-Business label, all of 2026.
// Subscriptions + Everything else were dropped (user: Gmail has them).
// A glance only (user, 2026-11-12): plain text, no reply box — Open in Gmail
// to reply there. Backend RPM_Emails.js (getEmails&section=…). Texts stay in Comms.
//
// New = unread in Gmail, or (from Nov 2 2026) not yet opened here. The tab
// badge + Home rack screen count new Student + G Business emails; each mailbox
// shows its own. Re-checked every 10 min while the portal is open.

var EM_SECTIONS = [
  { key: "students",  title: "Students",   note: "Last 7 emails" },
  { key: "gbusiness", title: "G Business", note: "All of 2026" }
];
var _emData = {};          // section key → rows (null while loading, {err} on failure)
var _emKey = "students";   // the switch that's on
var _emCur = null;         // the email open on the right: { key, e }
var _emCounts = { students: 0, gbusiness: 0, names: [] };

function initEmailsTab() {
  _emPlates();
  emShow(_emKey);
}

// Turn a switch on: load that list (fresh each time) and draw it.
function emShow(key) {
  if (_emKey !== key) _emPane(null);
  _emKey = key;
  document.querySelectorAll("#tab-emails .em-box").forEach(function (b) {
    b.classList.toggle("cm-on", b.getAttribute("data-em") === key);
  });
  var s = EM_SECTIONS.filter(function (x) { return x.key === key; })[0];
  document.getElementById("emListTitle").textContent = s ? s.title : "";
  document.getElementById("emListNote").textContent = s ? s.note : "";
  if (!Array.isArray(_emData[key])) _emData[key] = null;
  _emRender();
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getEmails&section=" + key)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) throw new Error((data && data.message) || "No answer");
      var rows = data.emails || [];
      if (key === "students")   // the 7 newest only (the backend sends just that; this keeps it so either way)
        rows = rows.sort(function (a, b) { return b.ts - a.ts; }).slice(0, 7);
      _emData[key] = rows;
      _emRender();
    })
    .catch(function (err) { _emData[key] = { err: err.message }; _emRender(); });
}

function _emRender() {
  var list = document.getElementById("emList");
  if (!list) return;
  var key = _emKey, rows = _emData[key];
  if (rows === null || rows === undefined) { list.innerHTML = '<div class="empty-state rpm-loading">Loading</div>'; return; }
  if (rows.err) { list.innerHTML = '<div id="emErr"></div>'; rpmFail(document.getElementById("emErr"), rows.err, "left"); return; }
  if (!rows.length) {
    list.innerHTML = '<div class="cm-none cm-list-empty">' +
      (key === "students" ? "No emails from students yet." : "No Google Business emails in 2026.") + '</div>';
    return;
  }
  // New ones first, then newest first.
  var order = rows.map(function (e, i) { return i; }).sort(function (a, b) {
    return (_emHot(rows[b]) - _emHot(rows[a])) || (rows[b].ts - rows[a].ts);
  });
  list.innerHTML = order.map(function (i) { return _emRowHtml(key, i, rows[i]); }).join("");
}

function _emHot(e) { return e.isNew || e.unread ? 1 : 0; }

function _emRowHtml(key, i, e) {
  var who = key === "students" ? e.name : e.from;
  var on = _emCur && _emCur.e.id === e.id;
  return '<div class="cm-conv' + (_emHot(e) ? ' cm-wait' : '') + (on ? ' em-on' : '') + '" onclick="_emOpen(\'' + key + '\',' + i + ')">' +
    '<span class="cm-dot"></span>' +
    '<span class="cm-conv-main">' +
      '<span class="cm-conv-top"><span class="cm-conv-name">' + inqEsc(who) + '</span>' +
        '<span class="cm-conv-when">' + inqEsc(key === "students" ? (e.time || e.date) : e.date) + '</span></span>' +
      '<span class="em-subj">' + inqEsc(e.subject) + '</span>' +
      (e.snippet ? '<span class="cm-conv-prev">' + inqEsc(e.snippet) + '</span>' : '') +
    '</span></div>';
}

// The right pane: nothing open (null) → "Pick an email", else the head (with Open in Gmail) + the email.
function _emPane(cur) {
  _emCur = cur;
  var head = document.getElementById("emHead"), read = document.getElementById("emRead");
  if (!head) return;
  if (!cur) {
    head.innerHTML = "";
    read.innerHTML = '<div class="cm-none cm-thread-empty em-pick">Pick an email on the left.</div>';
    return;
  }
  var e = cur.e, student = cur.key === "students";
  var who = student ? e.name : e.from;
  head.innerHTML = '<span class="cm-ava">' + inqEsc(_emInitials(who)) + '</span>' +
    '<span class="em-head-main"><span class="em-head-from">' + inqEsc(who) + '</span>' +
      '<span class="em-head-subj">' + inqEsc(e.subject) + '</span>' +
      '<span class="em-head-to">' + (student ? 'From: ' + inqEsc(e.email) : 'To: redpickmusic@gmail.com') + '</span></span>' +
    '<span class="em-head-side"><span class="em-head-when">' + inqEsc(student && e.time ? e.time + ' · ' + e.date : e.date) + '</span>' +
      '<a class="link-btn em-gmail" href="https://mail.google.com/mail/u/0/#all/' + encodeURIComponent(e.id) + '" target="_blank" rel="noopener" ' +
        'data-tip="Opens elsewhere.\nThis email in Gmail, to reply there." data-tip-left><span>Open in Gmail</span><span data-icon="out">' + OPEN_OUT_ICON + '</span></a></span>';
  read.innerHTML = '<div id="emMsgStatus" class="em-status"></div>';
}

function _emInitials(name) {
  var w = String(name || "?").replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  return ((w[0] || "?")[0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}

function _emOpen(key, i) {
  var e = (_emData[key] || [])[i];
  if (!e) return;
  _emPane({ key: key, e: e });
  _emRender();
  rpmSetLoading(document.getElementById("emMsgStatus"), "Opening");
  fetch(getScriptUrl() + "?action=getGBusinessMessage&id=" + encodeURIComponent(e.id))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) throw new Error((data && data.message) || "No answer");
      if (!_emCur || _emCur.e !== e) return;   // another one was picked meanwhile
      var st = document.getElementById("emMsgStatus");
      if (st) st.innerHTML = "";
      _emShowBody(key, e, data.html || "");
      if (_emHot(e)) _emMarkRead(key, e);
    })
    .catch(function (err) {
      var st = document.getElementById("emMsgStatus");
      if (st && _emCur && _emCur.e === e) rpmFail(st, err.message, "left");
    });
}

// The email in the portal's look (user, 2026-11-12: "gray screen and text"):
// plain text on the grey screen, links kept, pictures and the sender's layout
// dropped. A student's: only their own words, the quoted email under a reply cut off.
function _emShowBody(key, e, html) {
  var read = document.getElementById("emRead");
  if (!read) return;
  read.innerHTML = '<div class="em-text">' + (_emPlain(html, key === "students") || "(no text)") + '</div>';
}

// The email's HTML → safe portal HTML: escaped text, line breaks, and its links
// (as underlined words). cutQuote: drop the quoted email under a reply
// (Gmail / Apple Mail / Outlook / Yahoo).
function _emPlain(html, cutQuote) {
  var doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, head, title, img").forEach(function (n) { n.remove(); });
  // Hidden preview text marketing emails carry (display:none, 0 size, invisible).
  doc.querySelectorAll("[style]").forEach(function (n) {
    var st = (n.getAttribute("style") || "").toLowerCase().replace(/\s+/g, "");
    if (/display:none|visibility:hidden|max-height:0|font-size:0|opacity:0|mso-hide:all/.test(st)) n.remove();
  });
  if (cutQuote) doc.querySelectorAll("blockquote, .gmail_quote, .gmail_attr, #appendonsend, [id^=divRplyFwdMsg], .yahoo_quoted").forEach(function (n) { n.remove(); });
  var out = "";
  function nl() { if (out && !/\n$/.test(out)) out += "\n"; }
  (function walk(n) {
    if (n.nodeType === 3) { out += inqEsc(n.nodeValue.replace(/[\u00ad\u034f\u200b-\u200f\u2060\ufeff]/g, "").replace(/\s+/g, " ")); return; }
    if (n.nodeType !== 1) return;
    var tag = n.tagName;
    if (tag === "BR") { out += "\n"; return; }
    var block = /^(DIV|P|TR|LI|H[1-6]|TABLE|UL|OL|CENTER|SECTION)$/.test(tag);
    if (block) nl();
    var href = tag === "A" ? (n.getAttribute("href") || "") : "";
    var link = /^https?:/i.test(href);
    if (link) out += '<a href="' + inqEsc(href) + '" target="_blank" rel="noopener">';
    for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
    if (link) out += '</a>';
    if (block) nl();
  })(doc.body || doc);
  var t = out.split("\n").map(function (l) { return l.trim(); }).join("\n");
  if (cutQuote) {
    var cut = t.search(/\n(On .{0,300}wrote:|-{2,}\s*Original Message|From: .*\nSent: )/i);
    if (cut > 0) t = t.slice(0, cut);
  }
  t = t.replace(/<a [^>]*>\s*<\/a>/g, "");   // links that were only a picture
  // A student's blank lines are theirs; a designed email's come from its tables, so they go.
  return t.replace(cutQuote ? /\n{3,}/g : /\n{2,}/g, cutQuote ? "\n\n" : "\n").trim();
}

function _emMarkRead(key, e) {
  var action = key === "gbusiness" ? "markGBusinessRead" : "markEmailRead";
  fetch(getScriptUrl() + "?action=" + action + "&id=" + encodeURIComponent(e.id))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) return;
      e.unread = false;
      e.isNew = false;
      _emRender();
      fetchEmailsUnread();
    })
    .catch(function () {});
}

// New-email counts: the Emails tab badge (both), each switch, and the Home
// rack screen (students on their own line, with who wrote).
// core/api.js calls it at portal start; it re-checks every 10 min after that.
function fetchEmailsUnread() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getEmailsUnread")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) return;
      var n = data.count || 0, stu = data.students || 0;
      _emCounts = { students: stu, gbusiness: data.gbusiness != null ? data.gbusiness : Math.max(0, n - stu), names: data.names || [] };
      var b = document.getElementById("emNavBadge");
      if (b) {
        if (n > 0) { b.textContent = n; b.style.display = ""; }
        else { b.style.display = "none"; }
      }
      _emPlates();
    })
    .catch(function () {});
}

function _emPlates() {
  var a = document.getElementById("emStuN"), g = document.getElementById("emGbN");
  if (a) a.textContent = _emCounts.students || "";
  if (g) g.textContent = _emCounts.gbusiness || "";
}

setInterval(function () { if (!document.hidden) fetchEmailsUnread(); }, 10 * 60 * 1000);
