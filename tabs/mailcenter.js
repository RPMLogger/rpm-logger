// ─── TABS / MAILCENTER.JS ───────────────────────────────────────────────────
// Hub for Gmail label shortcuts. Just one: Google Business.
//
// A "Trial Lesson Inquiries" row used to sit here counting `label:Inquiries
// is:unread`. Removed 2026-09-01: that counts whether an email has been OPENED
// in Gmail, which says nothing about whether the inquiry was handled. Every one
// of them was already decided in the portal while the badge still read 2. The
// Inquiries tab's own badge, driven by undecided cards, is the real signal.

function initMailCenterTab() {
  var section = document.getElementById("mailcenterContent");
  if (!section) return;
  if (section.dataset.built !== "1") {
    section.innerHTML =
      '<button id="gBusinessBtn" onclick="_openGBusinessGmail()" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 16px;background:var(--panel);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text);font-size:13px;font-family:inherit;margin-bottom:8px">' +
        '<span>📧 Google Business</span>' +
        '<span id="gBusinessBadge" style="display:none;background:var(--accent);color:#fff;font-size:11px;border-radius:10px;padding:2px 8px;font-weight:600">0</span>' +
      '</button>' +
      '</button>';
    section.dataset.built = "1";
  }
  fetchGBusinessUnread();
}

// ── G-Business window (2026-10-21) ──────────────────────────────────────────
// The button used to open the label in Gmail. It opens a window here now:
// every G-Business email since Jan 1 2026, newest first, read live from Gmail
// (no sheet). Click one and the same window shows it as Gmail would, in a
// sandboxed frame: no scripts, links open in a new tab. Opening it marks it
// read in Gmail, so the badge goes down.
var _gbMail = null;

function _openGBusinessGmail() {
  var ov = document.getElementById("gbOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.className = "settings-overlay";
    ov.id = "gbOverlay";
    ov.innerHTML = '<div class="settings-modal" id="gbModal" style="max-width:620px"></div>';
    ov.addEventListener("click", function(e) { if (e.target === ov) _gbClose(); });
    document.body.appendChild(ov);
  }
  ov.classList.add("open");
  _gbRenderList();
  _gbLoad();
}

function _gbClose() {
  var ov = document.getElementById("gbOverlay");
  if (ov) ov.classList.remove("open");
}

function _gbTitle(sub) {
  return '<div class="settings-title"><span>Google Business<span class="win-sub"> · ' + inqEsc(sub) + '</span></span>' +
    '<button class="settings-close" onclick="_gbClose()">✕</button></div>';
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
      _gbMail = null;
      var st = document.getElementById("gbStatus");
      if (st) rpmFail(st, err.message, "left");
    });
}

function _gbRenderList() {
  var m = document.getElementById("gbModal");
  if (!m) return;
  if (!_gbMail) {
    m.innerHTML = _gbTitle("Since Jan 1") + '<div id="gbStatus"></div>';
    rpmSetLoading(document.getElementById("gbStatus"), "Loading emails…");
    return;
  }
  var unread = _gbMail.filter(function(e) { return e.unread; }).length;
  m.innerHTML = _gbTitle("Since Jan 1") +
    '<div class="win-note">' + _gbMail.length + ' email' + (_gbMail.length === 1 ? '' : 's') +
      (unread ? ' · ' + unread + ' unread' : '') + '</div>' +
    (_gbMail.length
      ? _gbMail.map(function(e, i) {
          return '<div class="win-row opens' + (e.unread ? ' gb-unread' : '') + '" onclick="_gbOpen(' + i + ')">' +
            '<span class="win-row-main">' + (e.unread ? '<b>' + inqEsc(e.subject) + '</b>' : inqEsc(e.subject)) + '</span>' +
            '<span class="win-row-side">' + inqEsc(e.date) + '</span></div>';
        }).join("")
      : '<div class="win-note">No emails under the G-Business label since Jan 1.</div>');
}

function _gbOpen(i) {
  var e = (_gbMail || [])[i];
  var m = document.getElementById("gbModal");
  if (!e || !m) return;
  m.innerHTML = _gbTitle(e.date) +
    '<div class="win-row"><span class="win-row-main"><b>' + inqEsc(e.subject) + '</b></span></div>' +
    '<div class="win-note">' + inqEsc(e.from) + '</div>' +
    '<div id="gbStatus"></div>' +
    '<iframe id="gbFrame" class="gb-frame" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>' +
    _tlActs('<button class="link-btn" onclick="_gbRenderList()">‹ All emails</button>');
  rpmSetLoading(document.getElementById("gbStatus"), "Opening…");
  var url = getScriptUrl();
  fetch(url + "?action=getGBusinessMessage&id=" + encodeURIComponent(e.id))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.success) throw new Error((data && data.message) || "No answer");
      var st = document.getElementById("gbStatus"), fr = document.getElementById("gbFrame");
      if (st) st.innerHTML = "";
      if (fr) fr.srcdoc = '<base target="_blank"><style>body{margin:0;padding:16px;background:#fff}</style>' + data.html;
      if (e.unread) _gbMarkRead(e);
    })
    .catch(function(err) {
      var st = document.getElementById("gbStatus");
      if (st) rpmFail(st, err.message, "left");
    });
}

function _gbMarkRead(e) {
  fetch(getScriptUrl() + "?action=markGBusinessRead&id=" + encodeURIComponent(e.id))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.success) return;
      e.unread = false;
      fetchGBusinessUnread();
    })
    .catch(function() {});
}

function fetchGBusinessUnread() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getGBusinessUnread")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.success) return;
      var n = data.count || 0;
      // Update badge inside the Mail Center tab
      var btnBadge = document.getElementById("gBusinessBadge");
      if (btnBadge) {
        if (n > 0) { btnBadge.textContent = n; btnBadge.style.display = ""; }
        else { btnBadge.style.display = "none"; }
      }
      // Update badge on the tab nav button itself
      var navBadge = document.getElementById("gbNavBadge");
      if (navBadge) {
        if (n > 0) { navBadge.textContent = n; navBadge.style.display = ""; }
        else { navBadge.style.display = "none"; }
      }
    })
    .catch(function() {});
}
