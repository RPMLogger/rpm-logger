// ─── TABS / MAILCENTER.JS ───────────────────────────────────────────────────
// Hub for Gmail label shortcuts. Currently just one — Google Business.

function initMailCenterTab() {
  var section = document.getElementById("mailcenterContent");
  if (!section) return;
  if (section.dataset.built !== "1") {
    section.innerHTML =
      '<button id="gBusinessBtn" onclick="_openGBusinessGmail()" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 16px;background:var(--panel);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text);font-size:13px;font-family:inherit;margin-bottom:8px">' +
        '<span>📧 Google Business</span>' +
        '<span id="gBusinessBadge" style="display:none;background:var(--accent);color:#fff;font-size:11px;border-radius:10px;padding:2px 8px;font-weight:600">0</span>' +
      '</button>' +
      '<button id="trialInqBtn" onclick="_openTrialInquiriesGmail()" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 16px;background:var(--panel);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text);font-size:13px;font-family:inherit">' +
        '<span>📧 Trial Lesson Inquiries</span>' +
        '<span id="trialInqBadge" style="display:none;background:var(--accent);color:#fff;font-size:11px;border-radius:10px;padding:2px 8px;font-weight:600">0</span>' +
      '</button>';
    section.dataset.built = "1";
  }
  fetchGBusinessUnread();
  fetchTrialInquiriesUnread();
}

function _openGBusinessGmail() {
  window.open("https://mail.google.com/mail/u/0/#label/G-Business", "_blank");
}

function _openTrialInquiriesGmail() {
  window.open("https://mail.google.com/mail/u/0/#label/Inquiries", "_blank");
}

function fetchTrialInquiriesUnread() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getTrialInquiriesUnread")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.success) return;
      var n = data.count || 0;
      var btnBadge = document.getElementById("trialInqBadge");
      if (btnBadge) {
        if (n > 0) { btnBadge.textContent = n; btnBadge.style.display = ""; }
        else { btnBadge.style.display = "none"; }
      }
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
