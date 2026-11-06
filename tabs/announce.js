// ─── TABS / ANNOUNCE.JS ─────────────────────────────────────────────────────
// Announcements (user, 2026-11-05): one text to many students from the RPM
// line, then a table of who got it and who replied Y, and a Nudge for the ones
// still waiting. Modelled on Trip Summary's confirmations (same rows and status
// words). Reusable: every announcement keeps its own table, newest on top.
// Lives in a window behind an "Announcements" button next to Others on Comms.
// Backend: RPM_Announce.js (getAnnouncements / sendAnnouncement / nudgeAnnouncement).

var ANN_DEFAULT_TEXT =
  "IMPORTANT: ALL LESSON TEXTING IS MOVING HERE\n\nPLEASE REPLY Y TO CONFIRM.\n\n" +
  "Hi [Student]!\n\n" +
  "As my email said, this RPM Notifications number is now our official texting line for anything lesson-related.\n\n" +
  "Photos are fine here, but videos and PDFs don't come through. Please send me a link, or put them in your Dropbox lesson folder and let me know.\n\n" +
  "Thanks!\nBilgehan";
// The notepad-and-pen under DRAFT (user's own icon, 2026-11-05).
var ANN_DRAFT_ICON = '<svg class="win-icon" viewBox="0 0 907.5 830.25" width="33" height="30" fill="currentColor" aria-hidden="true"><defs><clipPath id="annDr548a"><path d="M 0.160156 0 L 578 0 L 578 829.5 L 0.160156 829.5 Z M 0.160156 0 " clip-rule="nonzero"/></clipPath><clipPath id="annDr7472"><path d="M 398 646 L 578 646 L 578 829.5 L 398 829.5 Z M 398 646 " clip-rule="nonzero"/></clipPath><clipPath id="annDr6e62"><path d="M 495 98 L 906.839844 98 L 906.839844 507 L 495 507 Z M 495 98 " clip-rule="nonzero"/></clipPath></defs><g clip-path="url(#annDr548a)"><path d="M 412.632812 829.5 L 47.558594 829.5 C 21.671875 829.5 0.675781 808.507812 0.675781 782.625 L 0.675781 46.875 C 0.675781 20.992188 21.671875 0 47.558594 0 L 530.449219 0 C 556.335938 0 577.332031 20.992188 577.332031 46.875 L 577.332031 369.914062 C 577.332031 377.453125 571.214844 383.566406 563.675781 383.566406 C 556.132812 383.566406 550.015625 377.453125 550.015625 369.914062 L 550.015625 46.875 C 550.015625 36.074219 541.25 27.515625 530.652344 27.515625 L 47.761719 27.515625 C 37.164062 27.515625 28.398438 36.277344 28.398438 46.875 L 28.398438 782.625 C 28.398438 793.425781 37.164062 801.988281 47.761719 801.988281 L 407.128906 801.988281 L 550.015625 654.429688 L 550.015625 480.375 C 550.015625 472.835938 556.132812 466.722656 563.675781 466.722656 C 571.214844 466.722656 577.332031 472.835938 577.332031 480.375 L 577.332031 659.933594 C 577.332031 663.398438 575.902344 666.863281 573.457031 669.511719 L 422.617188 825.222656 C 419.96875 828.074219 416.300781 829.5 412.632812 829.5 Z M 412.632812 829.5 " fill-opacity="1" fill-rule="evenodd"/></g><g clip-path="url(#annDr7472)"><path d="M 412.632812 829.5 C 405.089844 829.5 398.972656 823.386719 398.972656 815.84375 L 398.972656 659.933594 C 398.972656 652.390625 405.089844 646.277344 412.632812 646.277344 L 563.46875 646.277344 C 571.011719 646.277344 577.128906 652.390625 577.128906 659.933594 C 577.128906 667.472656 571.011719 673.585938 563.46875 673.585938 L 426.492188 673.585938 L 426.492188 815.84375 C 426.289062 823.386719 420.171875 829.5 412.632812 829.5 Z M 412.632812 829.5 " fill-opacity="1" fill-rule="evenodd"/></g><g clip-path="url(#annDr6e62)"><path d="M 545.941406 406.800781 L 528.003906 474.671875 L 602.8125 457.753906 L 868.003906 190.152344 C 875.136719 183.019531 878.804688 173.644531 878.804688 163.660156 C 878.804688 153.671875 874.730469 144.296875 867.59375 137.164062 C 853.121094 122.898438 829.679688 122.898438 815.207031 137.367188 Z M 509.046875 506.667969 C 505.375 506.667969 501.707031 505.242188 499.261719 502.386719 C 496 498.921875 494.574219 494.03125 495.796875 489.34375 L 520.460938 396 C 521.070312 393.757812 522.296875 391.515625 523.925781 389.886719 L 795.84375 117.800781 C 820.914062 92.734375 861.683594 92.527344 886.957031 117.394531 C 899.394531 129.621094 906.121094 145.925781 906.324219 163.25 C 906.527344 180.574219 899.800781 196.878906 887.570312 209.3125 L 619.523438 479.765625 C 617.691406 481.597656 615.246094 483.027344 612.796875 483.433594 L 512.101562 506.464844 C 511.085938 506.667969 510.066406 506.667969 509.046875 506.667969 Z M 509.046875 506.667969 " fill-opacity="1" fill-rule="evenodd"/></g><path d="M 853.734375 237.640625 C 850.269531 237.640625 846.804688 236.417969 844.152344 233.769531 L 770.773438 163.046875 C 765.269531 157.746094 765.066406 149.1875 770.363281 143.683594 C 775.664062 138.183594 784.226562 137.976562 789.730469 143.277344 L 863.109375 214.203125 C 868.613281 219.5 868.816406 228.0625 863.519531 233.566406 C 860.867188 236.214844 857.402344 237.640625 853.734375 237.640625 Z M 853.734375 237.640625 " fill-opacity="1" fill-rule="evenodd"/><path d="M 609.742188 483.839844 C 606.480469 483.839844 603.015625 482.617188 600.363281 480.171875 L 524.332031 409.859375 C 518.828125 404.765625 518.421875 396 523.519531 390.496094 C 528.613281 384.996094 537.378906 384.585938 542.882812 389.683594 L 618.914062 460.199219 C 624.417969 465.292969 624.824219 474.058594 619.730469 479.5625 C 617.078125 482.414062 613.410156 483.839844 609.742188 483.839844 Z M 609.742188 483.839844 " fill-opacity="1" fill-rule="evenodd"/><path d="M 455.234375 139.8125 L 117.476562 139.8125 C 109.933594 139.8125 103.820312 133.699219 103.820312 126.15625 C 103.820312 118.617188 109.933594 112.503906 117.476562 112.503906 L 455.234375 112.503906 C 462.773438 112.503906 468.890625 118.617188 468.890625 126.15625 C 468.890625 133.699219 462.773438 139.8125 455.234375 139.8125 Z M 455.234375 139.8125 " fill-opacity="1" fill-rule="evenodd"/><path d="M 455.234375 240.492188 L 117.476562 240.492188 C 109.933594 240.492188 103.820312 234.378906 103.820312 226.839844 C 103.820312 219.296875 109.933594 213.183594 117.476562 213.183594 L 455.234375 213.183594 C 462.773438 213.183594 468.890625 219.296875 468.890625 226.839844 C 468.890625 234.378906 462.773438 240.492188 455.234375 240.492188 Z M 455.234375 240.492188 " fill-opacity="1" fill-rule="evenodd"/><path d="M 455.234375 337.507812 L 117.476562 337.507812 C 109.933594 337.507812 103.820312 331.394531 103.820312 323.851562 C 103.820312 316.3125 109.933594 310.195312 117.476562 310.195312 L 455.234375 310.195312 C 462.773438 310.195312 468.890625 316.3125 468.890625 323.851562 C 468.890625 331.394531 462.773438 337.507812 455.234375 337.507812 Z M 455.234375 337.507812 " fill-opacity="1" fill-rule="evenodd"/><path d="M 455.234375 438.1875 L 117.476562 438.1875 C 109.933594 438.1875 103.820312 432.074219 103.820312 424.53125 C 103.820312 416.992188 109.933594 410.878906 117.476562 410.878906 L 455.234375 410.878906 C 462.773438 410.878906 468.890625 416.992188 468.890625 424.53125 C 468.890625 432.074219 462.773438 438.1875 455.234375 438.1875 Z M 455.234375 438.1875 " fill-opacity="1" fill-rule="evenodd"/><path d="M 351.683594 538.871094 L 117.476562 538.871094 C 109.933594 538.871094 103.820312 532.753906 103.820312 525.214844 C 103.820312 517.671875 109.933594 511.558594 117.476562 511.558594 L 351.683594 511.558594 C 359.226562 511.558594 365.339844 517.671875 365.339844 525.214844 C 365.339844 532.753906 359.226562 538.871094 351.683594 538.871094 Z M 351.683594 538.871094 " fill-opacity="1" fill-rule="evenodd"/></svg>';
// [Student] is each student's first name (user, 2026-11-05: tried [], [Student] reads clearer). [] works too;
// the backend only knows [Student], so [] is turned into it on send.
var ANN_NAME_RE = /\[\s*(Student|First)?\s*\]/gi;
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
    // No page switch in the title: the rack has its own Announcements and Confirmations buttons (user, 2026-11-06).
    '<span class="cm-oth-acts"><button class="settings-close" onclick="annClose()">✕</button></span></div>' +
    // The portal's window top (user, 2026-11-05): red name · grey part (No show's look); no icon under it.
    '<div id="annBody"></div></div>';
  document.body.appendChild(w);
  return w;
}
function annClose() { var w = document.getElementById("annOverlay"); if (w) w.classList.remove("open"); }
document.addEventListener("keydown", function (e) {
  var w = document.getElementById("annOverlay");
  if (e.key === "Escape" && w && w.classList.contains("open") && !document.querySelector(".rpm-dlg-overlay")) annClose();
});

// Opens on New announcement; Confirmations is its own button (user, 2026-11-05).
var annView = "new";
function annOpen() {
  annWin().classList.add("open");
  annView = "new";
  annData = null;   // fresh roster + table each time; LOADING until it lands
  annLoad();
}
// Confirmations button on the rack: the same window, straight on the table (user, 2026-11-06).
function annOpenConf() {
  annWin().classList.add("open");
  annView = "list";
  annOpenId = null;
  annData = null;
  annLoad();
}
function annHeadBtns() {}   // the title row used to switch pages; the rack does it now

function annLoad() {
  var body = document.getElementById("annBody"), url = getScriptUrl();
  if (!body || !url) return;
  if (!annData) body.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + "?action=getAnnouncements")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) { body.innerHTML = '<div class="empty-state">' + annEsc((d && d.message) || "Could not load") + '</div>'; return; }
      annData = d;
      if (annView === "new") { annView = ""; annCompose(); }
      else annRenderList();
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
  document.getElementById("annTitle").innerHTML = "Announcements<span class='win-sub'> · Confirmations</span>";
  annHeadBtns(true);
  var list = (annData && annData.announcements) || [];
  if (!list.length) { body.innerHTML = '<div class="empty-state">None</div>'; return; }
  var open = annOpenId || list[0].id;
  body.innerHTML = "";
  var cur = list.filter(function (a) { return a.id === open; })[0] || list[0];
  var card = annCard(cur);
  // The others sit under the buttons, above the student rows, so they're seen without scrolling (user, 2026-11-05).
  var others = list.filter(function (a) { return a !== cur; });
  if (others.length) {
    var slot = card.querySelector(".ann-others");
    slot.innerHTML = "<div class='ann-others-t'>Other announcements</div>";
    others.forEach(function (a) { slot.appendChild(annPastRow(a)); });
    slot.hidden = false;
  }
  body.appendChild(card);
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
    "<div class='ann-textbox' hidden>" + annEsc(String(a.template || "").replace(ANN_NAME_RE, "[Student]")) + "</div>" +
    "<div class='ann-others' hidden></div>" +
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
  document.getElementById("annTitle").innerHTML = nudge ? "Announcements<span class='win-sub'> · Nudge</span>" : "Announcements<span class='win-sub'> · Send text</span>";
  annHeadBtns(false);
  var everyone = (annData && annData.students) || [];
  var names = nudge ? opts.names : everyone;
  var on = {};
  names.forEach(function (n) { on[n] = !/\(test\)/i.test(n) || !!nudge; });   // the test number starts unticked

  body.innerHTML =
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head'><label class='field-label db-cx-t im-main-t'>" + (nudge ? "Nudge draft" : "Draft") + "</label></div>" +
    "<div class='ts-th-icon ann-draft-icon'>" + ANN_DRAFT_ICON.replace('class="win-icon"', 'class="ts-lbl-icon"') + "</div>" +
    "<div class='tv-sec-note'>Draft your message</div>" +
    // [Student] lit amber (user, 2026-11-05): a layer behind the box draws the marks, the box itself is see-through.
    "<div class='ann-hl-wrap'><div class='ann-hl' id='annHl' aria-hidden='true'></div>" +
    "<textarea class='cm-reply ann-text' id='annText' rows='16'></textarea></div>" +
    // Under the box, above the cost line (user, 2026-11-05; was under DRAFT).
    "<div class='ann-name-note'><mark class='ann-mark'>[Student]</mark> turns into each student's first name</div>" +
    "<div class='ann-cost' id='annCost'></div>" +
    // As it will look on their phone, the real name in place: Travel's text bubble (user, 2026-11-05).
    // SEND TEXT in DRAFT's format: red heading, icon under, note (user, 2026-11-05; was a TEXT MESSAGE label under the icon).
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head'><label class='field-label db-cx-t im-main-t'>Preview</label></div>" +
    // Each heading has its icon under it, like DRAFT (user, 2026-11-05).
    "<div class='ts-th-icon ann-draft-icon'>" + (typeof PHONE_ICON !== "undefined" ? PHONE_ICON.replace('class="win-icon"', 'class="ts-lbl-icon"') : "") + "</div>" +
    "<div class='tv-sec-note' id='annPrevWho'></div>" +
    "<div class='ts-thread tv-rv-thread ann-prev'><div class='ts-bub tv-rv-bub' id='annPrev'></div></div>" +
    "<div class='db-cx-head im-sec-head im-main-head tv-sec-head ts-sec-head ann-to-head'><label class='field-label db-cx-t im-main-t'>To</label>" +
      "<span class='ann-to-acts'><button class='link-btn' data-all='1'>All</button><button class='link-btn' data-all='0'>None</button></span></div>" +
    "<div class='ts-th-icon ann-draft-icon'>" + (typeof STUDENTS_ICON !== "undefined" ? STUDENTS_ICON.replace('class="students-icon"', 'class="ts-lbl-icon ann-to-icon"') : "") + "</div>" +
    "<div class='tv-sec-note'>Pick who gets it</div>" +
    "<div class='ann-to' id='annTo'></div>" +
    "<div class='ann-foot'>" + (nudge ? "<button class='link-btn' id='annBack'>Back</button>" : "<span></span>") +
      "<button class='link-btn red' id='annSend'>Send</button></div>";
  var ta = document.getElementById("annText");
  // Once the default text has gone out, the next announcement starts blank (user, 2026-11-05).
  var annNorm = function (t) { return String(t || "").replace(ANN_NAME_RE, "[Student]").trim(); };
  var defaultSent = ((annData && annData.announcements) || []).some(function (a) { return annNorm(a.template) === annNorm(ANN_DEFAULT_TEXT); });
  ta.value = nudge ? ANN_NUDGE_TEXT : (defaultSent ? "" : ANN_DEFAULT_TEXT);
  var to = document.getElementById("annTo");
  to.innerHTML = names.map(function (n, i) {
    return "<span class='db-check" + (on[n] ? " on" : "") + "' data-i='" + i + "' role='checkbox' tabindex='0'><i class='db-box'></i>" + annEsc(n) + "</span>";
  }).join("");
  var count = function () { return names.filter(function (n) { return on[n]; }).length; };
  var hl = document.getElementById("annHl");
  var paintHl = function () {
    hl.innerHTML = annEsc(ta.value).replace(ANN_NAME_RE, function (m) { return "<mark>" + m + "</mark>"; }) + "\n";
    hl.scrollTop = ta.scrollTop;
  };
  ta.addEventListener("scroll", function () { hl.scrollTop = ta.scrollTop; });
  var paint = function () {
    paintHl();
    var c = annCost(ta.value.replace(ANN_NAME_RE, "Christian")), n = count();
    document.getElementById("annCost").innerHTML =
      c.len + " characters · " + c.pieces + " text" + (c.pieces > 1 ? "s" : "") + " each · " + n + " student" + (n === 1 ? "" : "s") +
      " · about $" + (c.pieces * n * 0.011).toFixed(2) +
      (c.bad.length ? "<br><span class='ann-bad'>" + annEsc(c.bad.join(" ")) + " makes it cost about 2.5× more. Use - * ' \" instead.</span>" : "");
    var first = names.filter(function (x) { return on[x] && !/\(test\)/i.test(x); })[0] || names.filter(function (x) { return on[x]; })[0] || "";
    var empty = !ta.value.trim();
    document.getElementById("annPrevWho").textContent = empty ? "Your text shows here as you type" : first ? "This is how " + first + " gets it" : "Nobody picked";
    document.getElementById("annPrev").textContent = ta.value.replace(ANN_NAME_RE, annFirst(first) || "[Student]");
    document.querySelector("#annBody .ann-prev").classList.toggle("ann-prev-empty", empty);   // no empty blue blob (user, 2026-11-05)
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
  if (nudge) document.getElementById("annBack").onclick = function () { annRenderList(); };
  document.getElementById("annSend").onclick = function () { annSend(nudge, names.filter(function (n) { return on[n]; }), ta.value.trim()); };
  paint();
  ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0;   // start at the top, the whole text in view
}

function annSend(nudge, picked, text) {
  if (!picked.length || !text) return;
  var c = annCost(text.replace(ANN_NAME_RE, "Christian"));
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
      "&text=" + encodeURIComponent(text.replace(ANN_NAME_RE, "[Student]")) + "&students=" + encodeURIComponent(picked.join("|")) +
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
