// ─── TABS / EMAILS.JS ───────────────────────────────────────────────────────
// Emails tab (2026-11-02): the redpickmusic@gmail.com inbox, read live from
// Gmail, in four sections (backend RPM_Emails.js, getEmails&section=…):
//   Students         every email from a student since Jan 1, grouped by student,
//                    so a reply to a lesson recap is never missed. Opens with
//                    a reply box; the reply goes back as a Gmail reply.
//   Google Business  the G-Business label (was its own G Business tab).
//   Subscriptions    inbox, last 30 days, Promotions/Updates/Social/Forums.
//   Everything else  inbox, last 30 days, Primary.
// Each section loads on its own. The last two start closed: they are long and
// rarely matter. Texts stay in Comms.
//
// New = unread in Gmail, or (from Nov 2 2026) not yet opened here. The tab
// badge counts new Students + Google Business emails. Opening one marks it
// read in Gmail and seen here.

var EM_SECTIONS = [
  { key: "students",  title: "Students",        open: true  },
  { key: "gbusiness", title: "Google Business", open: true  },
  { key: "subs",      title: "Subscriptions",   open: false },
  { key: "other",     title: "Everything else", open: false }
];
var _emData = {};    // section key → rows (null while loading, {err} on failure)
var _emOpenSec = {};
var _emCur = null;   // the email open in the window

function initEmailsTab() {
  EM_SECTIONS.forEach(function (s) {
    if (!(s.key in _emOpenSec)) _emOpenSec[s.key] = s.open;
    _emData[s.key] = null;
  });
  _emRender();
  var url = getScriptUrl();
  if (!url) return;
  EM_SECTIONS.forEach(function (s) {
    fetch(url + "?action=getEmails&section=" + s.key)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) throw new Error((data && data.message) || "No answer");
        _emData[s.key] = data.emails || [];
        _emRender();
      })
      .catch(function (err) { _emData[s.key] = { err: err.message }; _emRender(); });
  });
}

function _emRender() {
  var body = document.getElementById("emBody");
  if (!body) return;
  body.innerHTML = EM_SECTIONS.map(function (s) {
    var rows = _emData[s.key], open = _emOpenSec[s.key];
    var list = Array.isArray(rows) ? rows : [];
    var fresh = list.filter(function (e) { return e.isNew; }).length;
    var count = Array.isArray(rows)
      ? list.length + (fresh ? " · " + fresh + " new" : "")
      : "";
    return '<div class="em-sec">' +
      '<button class="em-sec-head" onclick="_emToggle(\'' + s.key + '\')">' +
        '<span class="section-label">' + s.title + '</span>' +
        '<span class="em-sec-count">' + count + '</span>' +
        '<span class="em-sec-arrow">' + (open ? "▾" : "▸") + '</span></button>' +
      (open ? '<div class="em-sec-body" id="emSec-' + s.key + '">' + _emSectionHtml(s.key, rows) + '</div>' : "") +
      '</div>';
  }).join("");
  EM_SECTIONS.forEach(function (s) {
    var r = _emData[s.key], el = document.getElementById("emErr-" + s.key);
    if (r && r.err && el) rpmFail(el, r.err, "left");
  });
}

function _emToggle(key) {
  _emOpenSec[key] = !_emOpenSec[key];
  _emRender();
}

function _emSectionHtml(key, rows) {
  if (rows === null) return '<div class="empty-state rpm-loading">Loading</div>';
  if (rows.err) return '<div id="emErr-' + key + '"></div>';
  if (!rows.length) return '<div class="win-note">' +
    (key === "students" ? "No emails from students since Jan 1." :
     key === "gbusiness" ? "No Google Business emails since Jan 1." : "Nothing in the last 30 days.") + '</div>';
  if (key === "students") {
    // Grouped by student, the one who wrote last first.
    var order = [], by = {};
    rows.forEach(function (e, i) {
      if (!by[e.name]) { by[e.name] = []; order.push(e.name); }
      by[e.name].push(i);
    });
    return order.map(function (name) {
      return '<div class="em-who">' + inqEsc(name) + '</div>' +
        by[name].map(function (i) { return _emRowHtml(key, i, rows[i], rows[i].snippet); }).join("");
    }).join("");
  }
  return rows.map(function (e, i) { return _emRowHtml(key, i, e, e.from); }).join("");
}

function _emRowHtml(key, i, e, sub) {
  var hot = e.isNew || e.unread;
  return '<div class="win-row opens' + (hot ? ' gb-unread' : '') + '" onclick="_emOpen(\'' + key + '\',' + i + ')">' +
    '<span class="win-row-main">' + (hot ? '<b>' + inqEsc(e.subject) + '</b>' : inqEsc(e.subject)) +
      (sub ? '<span class="em-sub"> · ' + inqEsc(sub) + '</span>' : '') + '</span>' +
    (e.isNew ? '<span class="inq-new gb-new">New</span>' : '') +
    '<span class="win-row-side">' + inqEsc(e.date) + '</span></div>';
}

function _emClose() {
  var ov = document.getElementById("emOverlay");
  if (ov) ov.classList.remove("open");
  _emCur = null;
}

function _emOpen(key, i) {
  var e = (_emData[key] || [])[i];
  if (!e) return;
  _emCur = { key: key, e: e };
  var ov = document.getElementById("emOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.className = "settings-overlay";
    ov.id = "emOverlay";
    ov.innerHTML = '<div class="settings-modal" id="emModal" style="max-width:620px"></div>';
    ov.addEventListener("click", function (ev) { if (ev.target === ov) _emClose(); });
    document.body.appendChild(ov);
  }
  var student = key === "students";
  var title = student ? e.name : (EM_SECTIONS.filter(function (s) { return s.key === key; })[0] || {}).title;
  document.getElementById("emModal").innerHTML =
    '<div class="settings-title"><span>' + inqEsc(title) + '<span class="win-sub"> · ' + inqEsc(e.date) + '</span></span>' +
      '<button class="settings-close" onclick="_emClose()">✕</button></div>' +
    '<div class="win-row"><span class="win-row-main"><b>' + inqEsc(e.subject) + '</b></span></div>' +
    '<div class="win-note">' + inqEsc(student ? e.email : e.from) + '</div>' +
    '<div id="emMsgStatus"></div>' +
    '<iframe id="emFrame" class="gb-frame' + (student ? ' em-frame-short' : '') + '" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>' +
    (student
      ? '<textarea class="cm-reply em-reply" id="emReply" rows="4" placeholder="Reply by email to ' + inqEsc(e.name) + '…" ' +
          'onkeydown="if ((event.metaKey || event.ctrlKey) && event.key === \'Enter\') _emSend()"></textarea>' +
        '<div class="em-foot"><button class="link-btn cm-send" id="emSendBtn" onclick="_emSend()">Send</button></div>'
      : '');
  ov.classList.add("open");
  rpmSetLoading(document.getElementById("emMsgStatus"), "Opening");
  fetch(getScriptUrl() + "?action=getGBusinessMessage&id=" + encodeURIComponent(e.id))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) throw new Error((data && data.message) || "No answer");
      var st = document.getElementById("emMsgStatus"), fr = document.getElementById("emFrame");
      if (st) st.innerHTML = "";
      if (fr) fr.srcdoc = '<base target="_blank"><style>body{margin:0;padding:16px;background:#fff}</style>' + data.html;
      if (e.isNew || e.unread) _emMarkRead(key, e);
    })
    .catch(function (err) {
      var st = document.getElementById("emMsgStatus");
      if (st) rpmFail(st, err.message, "left");
    });
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

function _emSend() {
  if (!_emCur || _emCur.key !== "students") return;
  var box = document.getElementById("emReply"), btn = document.getElementById("emSendBtn");
  var body = box.value.trim();
  if (!body) { box.focus(); return; }
  var e = _emCur.e;
  rpmBusy(document.getElementById("emModal"), btn, true, "Sending");
  fetch(getScriptUrl() + "?action=replyStudentEmail&id=" + encodeURIComponent(e.id) + "&body=" + encodeURIComponent(body))
    .then(function (r) { return r.json(); })
    .then(function (res) {
      rpmBusy(document.getElementById("emModal"), btn, false);
      if (!res || !res.success) { rpmAlert({ title: "Not sent", message: (res && res.message) || "Something went wrong." }); return; }
      box.value = "";
      e.isNew = false;
      e.unread = false;
      _emRender();
      fetchEmailsUnread();
      _emClose();
    })
    .catch(function () {
      rpmBusy(document.getElementById("emModal"), btn, false);
      rpmAlert({ title: "Not sent", message: "Couldn't reach the server." });
    });
}

// New-email count for the badge on the Emails tab button. core/api.js calls it
// at portal start.
function fetchEmailsUnread() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getEmailsUnread")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.success) return;
      var n = data.count || 0, b = document.getElementById("emNavBadge");
      if (b) {
        if (n > 0) { b.textContent = n; b.style.display = ""; }
        else { b.style.display = "none"; }
      }
    })
    .catch(function () {});
}
