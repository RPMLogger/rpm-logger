// ─── TABS / GBUSINESS.JS ────────────────────────────────────────────────────
// G Business tab (2026-10-21): every email under the G-Business Gmail label
// since Jan 1 2026, newest first, read live from Gmail (no sheet). Backend:
// getGBusinessMail / getGBusinessMessage / markGBusinessRead (RPM_GBuisiness.js).
//
// It was the Mail Center tab, a hub with one button that opened the label in
// Gmail; the list lands on the tab itself now. Click an email and it opens in
// its own window as Gmail would show it, in a sandboxed frame: no scripts,
// links open in a new tab.
//
// New (2026-10-21): an email is New until it is opened HERE, whatever Gmail
// says; the backend keeps the opened ids. New rows carry the Inquiries "New"
// tag and the tab badge counts them. Opening one also marks it read in Gmail.
//
// A "Trial Lesson Inquiries" row used to sit in Mail Center counting
// `label:Inquiries is:unread`. Removed 2026-09-01: that counts whether an email
// has been OPENED in Gmail, which says nothing about whether the inquiry was
// handled. The Inquiries tab's own badge, driven by undecided cards, is the
// real signal.

var _gbMail = null;

function initGBusinessTab() {
  _gbRenderList();
  _gbLoad();
}

function _gbLoad() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getGBusinessMail")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.success) throw new Error((data && data.message) || "No answer");
      _gbMail = data.emails || [];
      _gbRenderList();
    })
    .catch(function(err) {
      var st = document.getElementById("gbStatus");
      if (st && !_gbMail) rpmFail(st, err.message, "left");
    });
}

function _gbRenderList() {
  var body = document.getElementById("gbBody");
  if (!body) return;
  if (!_gbMail) {
    body.innerHTML = '<div id="gbStatus"><div class="empty-state rpm-loading">Loading</div></div>';
    return;
  }
  var fresh = _gbMail.filter(function(e) { return e.isNew; }).length;
  body.innerHTML =
    '<div class="win-note">' + _gbMail.length + ' email' + (_gbMail.length === 1 ? '' : 's') +
      (fresh ? ' · ' + fresh + ' new' : '') + '</div>' +
    (_gbMail.length
      ? _gbMail.map(function(e, i) {
          return '<div class="win-row opens' + (e.isNew ? ' gb-unread' : '') + '" onclick="_gbOpen(' + i + ')">' +
            '<span class="win-row-main">' + (e.isNew ? '<b>' + inqEsc(e.subject) + '</b>' : inqEsc(e.subject)) + '</span>' +
            (e.isNew ? '<span class="inq-new gb-new">New</span>' : '') +
            '<span class="win-row-side">' + inqEsc(e.date) + '</span></div>';
        }).join("")
      : '<div class="win-note">No emails under the G-Business label since Jan 1.</div>');
}

function _gbClose() {
  var ov = document.getElementById("gbOverlay");
  if (ov) ov.classList.remove("open");
}

function _gbOpen(i) {
  var e = (_gbMail || [])[i];
  if (!e) return;
  var ov = document.getElementById("gbOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.className = "settings-overlay";
    ov.id = "gbOverlay";
    ov.innerHTML = '<div class="settings-modal" id="gbModal" style="max-width:620px"></div>';
    ov.addEventListener("click", function(ev) { if (ev.target === ov) _gbClose(); });
    document.body.appendChild(ov);
  }
  document.getElementById("gbModal").innerHTML =
    '<div class="settings-title"><span>G Business<span class="win-sub"> · ' + inqEsc(e.date) + '</span></span>' +
      '<button class="settings-close" onclick="_gbClose()">✕</button></div>' +
    '<div class="win-row"><span class="win-row-main"><b>' + inqEsc(e.subject) + '</b></span></div>' +
    '<div class="win-note">' + inqEsc(e.from) + '</div>' +
    '<div id="gbMsgStatus"></div>' +
    '<iframe id="gbFrame" class="gb-frame" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>';
  ov.classList.add("open");
  rpmSetLoading(document.getElementById("gbMsgStatus"), "Opening…");
  fetch(getScriptUrl() + "?action=getGBusinessMessage&id=" + encodeURIComponent(e.id))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.success) throw new Error((data && data.message) || "No answer");
      var st = document.getElementById("gbMsgStatus"), fr = document.getElementById("gbFrame");
      if (st) st.innerHTML = "";
      if (fr) fr.srcdoc = '<base target="_blank"><style>body{margin:0;padding:16px;background:#fff}</style>' + data.html;
      if (e.isNew || e.unread) _gbMarkRead(e);
    })
    .catch(function(err) {
      var st = document.getElementById("gbMsgStatus");
      if (st) rpmFail(st, err.message, "left");
    });
}

function _gbMarkRead(e) {
  fetch(getScriptUrl() + "?action=markGBusinessRead&id=" + encodeURIComponent(e.id))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.success) return;
      e.unread = false;
      e.isNew = false;
      _gbRenderList();
      fetchGBusinessUnread();
    })
    .catch(function() {});
}

// New-email count for the badge on the G Business tab button. core/api.js calls
// it at portal start.
function fetchGBusinessUnread() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getGBusinessUnread")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.success) return;
      var n = data.count || 0;
      var navBadge = document.getElementById("gbNavBadge");
      if (navBadge) {
        if (n > 0) { navBadge.textContent = n; navBadge.style.display = ""; }
        else { navBadge.style.display = "none"; }
      }
    })
    .catch(function() {});
}
