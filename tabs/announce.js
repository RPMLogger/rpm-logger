// ─── TABS / ANNOUNCE.JS ─────────────────────────────────────────────────────
// Announcements (user, 2026-11-05): one text to many students from the RPM
// line, then a table of who got it and who replied Y, and a Nudge for the ones
// still waiting. Modelled on Trip Summary's confirmations (same rows and status
// words). Reusable: every announcement keeps its own table, newest on top.
// Lives in a window behind an "Announcements" button next to Others on Comms.
// Backend: RPM_Announce.js (getAnnouncements / sendAnnouncement / nudgeAnnouncement).

var ANN_DEFAULT_TEXT =
  "IMPORTANT: ALL LESSON TEXTING IS MOVING HERE\n\n" +
  "Hi [Student]!\n\n" +
  "As my email said, this RPM Notifications number is now our official texting line for anything lesson-related.\n\n" +
  "Photos are fine here, but videos and PDFs don't come through. Please send me a link, or put them in your Dropbox lesson folder and let me know.\n\n" +
  "Please reply Y to confirm.\n\n" +
  "Thanks!\nBilgehan";
var ANN_NUDGE_TEXT = "Hi [Student]! Quick follow-up on my text above. Please reply Y to confirm. Thanks!";

var annData = null;       // last getAnnouncements answer
var annOpenId = null;     // the announcement whose table is open (null = newest)

// The button sits in the Comms title row, left of Others. Comms builds that row
// itself, so this waits for it instead of editing comms.js.
setInterval(function () {
  var oth = document.getElementById("commsOthersBtn");
  if (!oth || document.getElementById("commsAnnBtn")) return;
  var b = document.createElement("button");
  b.className = "link-btn cm-ann-btn";
  b.id = "commsAnnBtn";
  b.textContent = "Announcements";
  b.setAttribute("data-tip", "Opens a window.\nText all students at once, see who confirmed.");
  b.setAttribute("data-tip-wrap", "");
  b.onclick = function () { annOpen(); };
  oth.parentNode.insertBefore(b, oth);
}, 700);

function annEsc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function annFirst(n) { return String(n || "").trim().split(/\s+/)[0] || ""; }

// ── Cost: plain (GSM-7) texts fit 160 characters, 153 per piece when longer;
//    one character outside that alphabet makes the whole text Unicode (70 / 67).
var ANN_GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
var ANN_GSM_EXT = "^{}\\[~]|€";   // allowed, but count as 2
function annCost(text) {
  var bad = [], len = 0;
  Array.from(text).forEach(function (c) {
    if (ANN_GSM.indexOf(c) >= 0) len += 1;
    else if (ANN_GSM_EXT.indexOf(c) >= 0) len += 2;
    else if (bad.indexOf(c) < 0) bad.push(c);
  });
  if (bad.length) { len = Array.from(text).length; return { len: len, pieces: len <= 70 ? 1 : Math.ceil(len / 67), bad: bad }; }
  return { len: len, pieces: len <= 160 ? 1 : Math.ceil(len / 153), bad: [] };
}

// ── The window ───────────────────────────────────────────────────────────────
function annWin() {
  var w = document.getElementById("annOverlay");
  if (w) return w;
  w = document.createElement("div");
  w.className = "im-notes-back cm-win-back";
  w.id = "annOverlay";
  w.onclick = function (e) { if (e.target === w) annClose(); };
  w.innerHTML = '<div class="td-student cm-win ann-win"><div class="settings-title im-title"><span id="annTitle">Announcements</span>' +
    '<span class="cm-oth-acts"><button class="link-btn" id="annNewBtn" onclick="annCompose()">New announcement</button>' +
    '<button class="settings-close" onclick="annClose()">✕</button></span></div><div id="annBody"></div></div>';
  document.body.appendChild(w);
  return w;
}
function annClose() { var w = document.getElementById("annOverlay"); if (w) w.classList.remove("open"); }
document.addEventListener("keydown", function (e) {
  var w = document.getElementById("annOverlay");
  if (e.key === "Escape" && w && w.classList.contains("open") && !document.querySelector(".rpm-dlg-overlay")) annClose();
});

function annOpen() {
  annWin().classList.add("open");
  annLoad();
}

function annLoad() {
  var body = document.getElementById("annBody"), url = getScriptUrl();
  if (!body || !url) return;
  if (!annData) body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + "?action=getAnnouncements")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { body.innerHTML = '<div class="empty-state">' + annEsc((d && d.message) || "Could not load") + '</div>'; return; }
      annData = d;
      annRenderList();
    })
    .catch(function () { body.innerHTML = '<div class="empty-state">Connection failed</div>'; });
}

// ── The list: newest announcement open, older ones one line each ─────────────
function annWhen(ts) {
  var d = new Date(String(ts).replace(" ", "T"));
  if (isNaN(d)) return String(ts || "");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
         d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function annTag(s) {
  var tag = function (c, t) { return "<span class='ts-tag' style='color:" + c + "'>" + t + "</span>"; };
  if (s.state === "confirmed") return tag("var(--green)", "Confirmed");
  if (s.state === "reply")     return tag("var(--warn)", "Needs reply");
  if (s.state === "failed")    return tag("#ff5a4d", "Not delivered");
  return tag("var(--muted)", "Awaiting");
}
var ANN_RANK = { reply: 0, failed: 1, waiting: 2, confirmed: 3 };

function annRenderList() {
  var body = document.getElementById("annBody");
  document.getElementById("annTitle").textContent = "Announcements";
  document.getElementById("annNewBtn").style.display = "";
  var list = (annData && annData.announcements) || [];
  if (!list.length) { body.innerHTML = '<div class="empty-state">None yet. Press New announcement to text all students.</div>'; return; }
  var open = annOpenId || list[0].id;
  body.innerHTML = "";
  list.forEach(function (a) { body.appendChild(a.id === open ? annCard(a) : annPastRow(a)); });
}

function annPastRow(a) {
  var r = document.createElement("div");
  r.className = "ann-past";
  r.innerHTML = "<span class='ann-past-when'>" + annEsc(annWhen(a.sentAt)) + "</span>" +
    "<span class='ann-past-text'>" + annEsc(String(a.template || "").split("\n")[0]) + "</span>" +
    "<span class='ann-past-n'>" + a.confirmed + " / " + a.students.length + "</span>";
  r.onclick = function () { annOpenId = a.id; annRenderList(); };
  return r;
}

function annCard(a) {
  var wrap = document.createElement("div");
  wrap.className = "ann-card";
  var waiting = a.students.filter(function (s) { return s.state === "waiting"; });
  wrap.innerHTML =
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head'><label class='field-label db-cx-t im-main-t'>Confirmations</label></div>" +
    "<div class='tv-sec-note tv-steps ts-steps'>" +
      "<span><i>1.</i>Sent " + annEsc(annWhen(a.sentAt)) + " to " + a.students.length + " students</span>" +
      "<span class='ts-sub'><i>-</i>A Y back (or a 👍) confirms by itself</span>" +
      "<span class='ts-sub'><i>-</i>Needs reply: they wrote something else, answer it</span>" +
      "<span><i>2.</i>No answer yet: Nudge texts only the ones awaiting</span></div>" +
    "<div class='ann-acts'><button class='link-btn' data-a='text'>Show text</button>" +
      "<button class='link-btn amber' data-a='nudge'" + (waiting.length ? "" : " disabled data-tip='Locked.\nNobody is awaiting.' data-tip-wrap") + ">Nudge " +
      (waiting.length ? waiting.length + " awaiting" : "") + "</button></div>" +
    "<div class='ann-textbox' hidden>" + annEsc(a.template) + "</div>" +
    "<hr class='divider ts-rule'>" +
    "<div class='ts-trip-dates'>" + a.confirmed + " / " + a.students.length + " confirmed</div>";
  var list = document.createElement("div");
  a.students.slice().sort(function (x, y) { return (ANN_RANK[x.state] - ANN_RANK[y.state]) || x.name.localeCompare(y.name); })
    .forEach(function (s) {
      var r = document.createElement("div");
      r.className = "ts-row ann-row " + (s.state === "confirmed" ? "ts-row-ok" : s.state === "reply" ? "ts-row-reply" : s.state === "failed" ? "ann-row-bad" : "ts-row-wait");
      var sub = s.state === "reply" ? "“" + s.reply + "”" : s.state === "confirmed" ? annWhen(s.confirmedAt) : (s.nudges ? "Nudged " + annWhen(s.lastNudge) : "");
      r.innerHTML = "<span class='ann-row-l'><span class='ts-row-name'>" + annEsc(s.name) + "</span>" +
        (sub ? "<span class='ann-row-sub'>" + annEsc(sub) + "</span>" : "") + "</span>" + annTag(s);
      r.setAttribute("data-tip", "Opens their conversation.");
      r.onclick = function () { annOpenConversation(s.name); };
      list.appendChild(r);
    });
  wrap.appendChild(list);
  wrap.querySelector("[data-a='text']").onclick = function () {
    var t = wrap.querySelector(".ann-textbox"); t.hidden = !t.hidden;
    this.textContent = t.hidden ? "Show text" : "Hide text";
  };
  var nb = wrap.querySelector("[data-a='nudge']");
  if (waiting.length) nb.onclick = function () { annCompose({ nudge: a, names: waiting.map(function (s) { return s.name; }) }); };
  return wrap;
}

function annOpenConversation(name) {
  annClose();
  if (typeof commsStudents === "undefined") return;
  var s = commsStudents.filter(function (x) { return x.name === name; })[0];
  if (!s) return;
  var k = commsKey(s.number);
  var last = commsMessages.filter(function (m) { return commsKey(m.fromNumber) === k; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })[0];
  commsPaneOpen(last || { row: 0, source: "sms", fromNumber: s.number, fromName: s.name, student: s.name, responded: true, blank: true });
}

// ── Compose: a new announcement, or a nudge for one ──────────────────────────
// opts.nudge = the announcement being nudged; opts.names = who gets the nudge.
function annCompose(opts) {
  opts = opts || {};
  var body = document.getElementById("annBody");
  var nudge = opts.nudge || null;
  document.getElementById("annTitle").innerHTML = nudge ? "Announcements<span class='win-sub'> · Nudge</span>" : "Announcements<span class='win-sub'> · New</span>";
  document.getElementById("annNewBtn").style.display = "none";
  var everyone = (annData && annData.students) || [];
  var names = nudge ? opts.names : everyone;
  var on = {};
  names.forEach(function (n) { on[n] = !/\(test\)/i.test(n) || !!nudge; });   // the test number starts unticked

  body.innerHTML =
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head'><label class='field-label db-cx-t im-main-t'>" + (nudge ? "Nudge text" : "Text") + "</label></div>" +
    "<div class='tv-sec-note'>[Student] is replaced by each student's first name when it's sent (Hi [Student]! → Hi Antonio!). Plain characters keep it cheap.</div>" +
    "<textarea class='cm-reply ann-text' id='annText' rows='16'></textarea>" +
    "<div class='ann-cost' id='annCost'></div>" +
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head ann-to-head'><label class='field-label db-cx-t im-main-t'>To</label>" +
      "<span class='ann-to-acts'><button class='link-btn' data-all='1'>All</button><button class='link-btn' data-all='0'>None</button></span></div>" +
    "<div class='ann-to' id='annTo'></div>" +
    "<div class='ann-foot'><button class='link-btn' id='annBack'>Back</button>" +
      "<button class='link-btn red' id='annSend'>Send</button></div>";
  var ta = document.getElementById("annText");
  ta.value = nudge ? ANN_NUDGE_TEXT : ANN_DEFAULT_TEXT;
  var to = document.getElementById("annTo");
  to.innerHTML = names.map(function (n, i) {
    return "<span class='db-check" + (on[n] ? " on" : "") + "' data-i='" + i + "' role='checkbox' tabindex='0'><i class='db-box'></i>" + annEsc(n) + "</span>";
  }).join("");
  var count = function () { return names.filter(function (n) { return on[n]; }).length; };
  var paint = function () {
    var c = annCost(ta.value.replace(/\[(Student|First)\]/g, "Christian")), n = count();
    document.getElementById("annCost").innerHTML =
      c.len + " characters · " + c.pieces + " text" + (c.pieces > 1 ? "s" : "") + " each · " + n + " student" + (n === 1 ? "" : "s") +
      " · about $" + (c.pieces * n * 0.011).toFixed(2) +
      (c.bad.length ? "<br><span class='ann-bad'>" + annEsc(c.bad.join(" ")) + " makes it cost about 2.5× more. Use - * ' \" instead.</span>" : "");
    document.getElementById("annSend").textContent = "Send to " + n;
    document.getElementById("annSend").disabled = !n || !ta.value.trim();
  };
  to.querySelectorAll(".db-check").forEach(function (el) {
    var flip = function () { var n = names[+el.dataset.i]; on[n] = !on[n]; el.classList.toggle("on", on[n]); paint(); };
    el.onclick = flip;
    el.onkeydown = function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } };
  });
  body.querySelectorAll("[data-all]").forEach(function (b) {
    b.onclick = function () {
      var v = b.dataset.all === "1";
      names.forEach(function (n) { on[n] = v; });
      to.querySelectorAll(".db-check").forEach(function (el) { el.classList.toggle("on", v); });
      paint();
    };
  });
  ta.oninput = paint;
  document.getElementById("annBack").onclick = function () { annRenderList(); };
  document.getElementById("annSend").onclick = function () { annSend(nudge, names.filter(function (n) { return on[n]; }), ta.value.trim()); };
  paint();
  ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0;   // start at the top, the whole text in view
}

function annSend(nudge, picked, text) {
  if (!picked.length || !text) return;
  var c = annCost(text.replace(/\[(Student|First)\]/g, "Christian"));
  rpmConfirm({
    title: "Warning!",
    subtitle: "Upon activation:",
    message: "→ " + picked.length + " student" + (picked.length === 1 ? "" : "s") + " get this text from the RPM line, one each (no group chat).\n" +
             "→ [Student] becomes each first name.\n" +
             "→ " + c.pieces + " text" + (c.pieces > 1 ? "s" : "") + " each, about $" + (c.pieces * picked.length * 0.011).toFixed(2) + " in all.\n" +
             "→ Sent texts can't be taken back.",
    confirmLabel: nudge ? "Nudge" : "Send",
    icon: typeof WARN_ICON !== "undefined" ? WARN_ICON : undefined,
    danger: true,
    className: "tv-golive-dlg"
  }).then(function (ok) {
    if (!ok) return;
    var url = getScriptUrl(); if (!url) return;
    var win = document.querySelector("#annOverlay .ann-win"), btn = document.getElementById("annSend");
    rpmBusy(win, btn, true, "Sending");
    var q = url + "?action=" + (nudge ? "nudgeAnnouncement" : "sendAnnouncement") +
      "&text=" + encodeURIComponent(text) + "&students=" + encodeURIComponent(picked.join("|")) +
      (nudge ? "&id=" + encodeURIComponent(nudge.id) : "");
    // Not callScript: its catch never calls back, and the window would stay dimmed.
    fetch(q).then(function (r) { return r.json(); }).catch(function () { return { success: false, message: "Connection error. Check the table before sending again." }; }).then(function (d) {
      rpmBusy(win, btn, false);
      if (!d || !d.success) { rpmAlert({ title: "Not sent", message: (d && d.message) || "Connection error" }); return; }
      if (d.failed && d.failed.length) rpmAlert({ title: "Some texts didn't go out", message: d.failed.join("\n") });
      annOpenId = nudge ? nudge.id : (d.id || null);
      annData = null;
      annLoad();
      if (typeof loadCommsInbox === "function") loadCommsInbox();   // the texts show in each conversation
    });
  });
}
