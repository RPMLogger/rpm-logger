// ─── TABS / STUDENTLINE.JS ──────────────────────────────────────────────────
// RPM Student Line: inbound texts from KNOWN students (routed here at intake
// instead of Inquiries). A clean "Y" on an active trip never appears — it auto-
// confirms and vanishes. Each open item gets two actions:
//   ✓ Handle    — you dealt with it → dismiss.
//   ⚠ Misplaced — they texted the wrong line (the Home-card warning is Phase 3).

var studentLineItems = [];

function initStudentLineTab() { loadStudentLine(); }

function loadStudentLine() {
  var url = getScriptUrl();
  if (!url) return;
  var body = document.getElementById("studentLineBody");
  if (body && !studentLineItems.length) body.innerHTML = "<div class='empty-state'>Loading…</div>";
  fetch(url + "?action=getStudentLine")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      studentLineItems = (d.success && d.messages) ? d.messages : [];
      renderStudentLine();
      updateStudentLineBadge();
    })
    .catch(function () {});
}

function renderStudentLine() {
  var body = document.getElementById("studentLineBody");
  if (!body) return;
  var open = studentLineItems.filter(function (m) { return (m.status || "open") === "open"; });

  if (!open.length) {
    body.innerHTML = "<div class='empty-state'>All caught up — no open student texts</div>";
    return;
  }

  body.innerHTML = "";
  open.forEach(function (m) {
    var card = document.createElement("div");
    card.style.cssText = "background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:12px 14px;margin-bottom:8px";
    card.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px'>" +
        "<span style='font-weight:600;color:var(--text);font-size:13px'>" + slEsc(m.student || "Unknown") + "</span>" +
        "<span style='font-size:10px;color:var(--muted)'>" + slTime(m.timestamp) + "</span>" +
      "</div>" +
      "<div style='font-size:13px;color:var(--text);margin-bottom:10px;white-space:pre-wrap'>" + slEsc(m.body || "—") + "</div>" +
      "<div style='display:flex;gap:8px'>" +
        "<button onclick=\"slSetStatus(" + m.row + ",'handled')\" style='flex:1;padding:8px;background:rgba(80,200,120,0.12);border:1px solid rgba(80,200,120,0.4);color:#4ec27a;border-radius:5px;font-family:inherit;font-size:12px;cursor:pointer'>✓ Handle</button>" +
        "<button onclick=\"slSetStatus(" + m.row + ",'misplaced')\" style='flex:1;padding:8px;background:rgba(255,120,60,0.12);border:1px solid rgba(255,120,60,0.4);color:#ff7a3c;border-radius:5px;font-family:inherit;font-size:12px;cursor:pointer'>⚠ Misplaced</button>" +
      "</div>";
    body.appendChild(card);
  });
}

function slSetStatus(row, status) {
  var url = getScriptUrl();
  if (!url) return;
  // Optimistic: drop it from the open list immediately, then persist.
  studentLineItems = studentLineItems.map(function (m) {
    if (m.row === row) m.status = status;
    return m;
  });
  renderStudentLine();
  updateStudentLineBadge();
  fetch(url + "?action=setStudentLineStatus&row=" + row + "&status=" + status)
    .then(function (r) { return r.json(); })
    .catch(function () {});
}

function updateStudentLineBadge() {
  var n = studentLineItems.filter(function (m) { return (m.status || "open") === "open"; }).length;
  var badge = document.getElementById("slNavBadge");
  if (!badge) return;
  if (n > 0) { badge.textContent = n; badge.style.display = ""; }
  else { badge.style.display = "none"; }
}

// Called from loadData at startup so the nav badge shows without opening the tab.
function fetchStudentLineBadge() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getStudentLine")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.success && d.messages) studentLineItems = d.messages;
      updateStudentLineBadge();
    })
    .catch(function () {});
}

function slEsc(s) { if (!s) return ""; var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

function slTime(ts) {
  if (!ts) return "";
  var dt = new Date(ts), diff = new Date() - dt;
  if (diff < 60000) return "now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
  var M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return M[dt.getMonth()] + " " + dt.getDate();
}
