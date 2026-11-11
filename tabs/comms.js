// ─── TABS / COMMS.JS ─────────────────────────────────────────────────────────
// Comms tab: everything that arrives on the Twilio line and is NOT a known
// student — inbound texts + voicemails (known students route to Student Line
// at intake). Its own tab since 2026-09-22; it used to be a hidden view inside
// Inquiries, which left it invisible once the counts bar was removed there.

var commsMessages = [];
// Comms page icon under the number: hand holding a phone (user, om-12, 2026-11-01; was om-11 phone in a circle).
var COMMS_TEXT_ICON = '<svg class="win-icon" viewBox="0 0 858 907.5" aria-hidden="true"><path fill="currentColor" d="M 451 748.2 L 287.5 780.2 C 280 781.6 275.1 788.9 276.6 796.5 C 277.9 803.1 283.7 807.7 290.2 807.7 C 291.1 807.7 291.9 807.6 292.8 807.4 L 456.3 775.4 C 463.8 774 468.8 766.7 467.3 759.2 C 465.8 751.6 458.5 746.7 451 748.2 Z M 451 748.2"/><path fill="currentColor" d="M 853.8 770.2 C 850.5 739.9 834.5 712.4 809.7 694.8 L 721.6 631.9 C 722 570.9 702.9 527 664.7 501.4 C 663.8 500.5 662.8 499.7 661.6 499 L 533.4 428.1 L 469 66.7 C 465.4 46.3 454 28.5 436.9 16.6 C 419.9 4.8 399.2 0.2 378.8 3.9 L 95.6 55.1 C 53.6 62.6 25.5 103 33 145.1 L 70.7 356.6 L 52.5 355.2 C 27.4 353.5 5.6 372.5 3.9 397.6 L 1.9 427.3 C 0.2 452.3 19.1 474.1 44.1 475.8 L 92.6 479.5 L 93.3 483 C 86.2 484.7 79.7 488.1 74.1 492.9 C 64.9 500.9 59.4 512 58.6 524.2 L 56.6 553.9 C 55.2 573 66 590.2 82.2 598 C 78.4 604.2 76.1 611.3 75.6 618.8 L 73.5 648.6 C 72.2 667.8 83.1 685.1 99.5 692.9 C 95.6 699.2 93.2 706.4 92.6 714.1 L 90.6 743.8 C 88.9 768.8 107.9 790.6 133.1 792.4 L 148.6 793.2 L 150.5 804.3 C 154.2 824.7 165.6 842.5 182.6 854.4 C 195.8 863.5 211.1 868.3 226.8 868.3 C 231.4 868.3 236.1 867.9 240.7 867 L 444.3 830.3 C 444.8 830.4 445.2 830.5 445.7 830.5 L 566.2 845.4 L 614.2 878.2 C 641.4 896.7 673.5 906.5 706.1 906.5 C 712.4 906.5 718.8 906.2 725.1 905.4 C 764.1 900.8 800.2 882.3 826.6 853.2 C 847.1 830.7 857 800.4 853.8 770.2 Z M 46.1 448.2 C 36.3 447.5 28.9 439 29.6 429.2 L 31.6 399.5 C 32.3 389.7 40.8 382.3 50.5 382.9 L 75.8 384.9 L 87.6 451.3 Z M 84.2 555.8 L 86.3 526.1 C 86.6 521.3 88.8 517 92.3 513.9 C 95.9 510.7 100.5 509.2 105.2 509.5 L 165.5 513.7 C 175.3 514.3 182.7 522.9 182 532.6 L 180 562.4 C 179.3 572.1 170.8 579.6 161 578.9 L 100.8 574.7 C 91 574.1 83.6 565.6 84.2 555.8 Z M 101.2 650.5 L 103.3 620.8 C 103.6 616 105.7 611.7 109.3 608.6 C 112.9 605.4 117.5 603.9 122.2 604.2 L 168.4 607.4 C 173.1 607.7 177.5 609.9 180.6 613.5 C 183.7 617.1 185.2 621.6 184.9 626.4 L 182.9 656.1 C 182.2 665.9 173.7 673.3 163.9 672.6 L 117.7 669.4 C 108 668.8 100.6 660.2 101.2 650.5 Z M 118.3 745.7 L 120.3 716 C 120.7 711.2 122.8 706.9 126.4 703.8 C 129.7 700.9 133.7 699.4 138.1 699.4 C 138.6 699.4 139 699.4 139.4 699.4 L 161.4 700.7 C 171.2 701.4 178.6 709.9 177.9 719.7 L 175.9 749.4 C 175.2 759.2 166.7 766.6 157 765.9 C 156.9 765.9 156.8 765.9 156.8 765.9 L 134.8 764.6 C 125 764 117.6 755.5 118.3 745.7 Z M 235.8 839.7 C 222.7 842.1 209.4 839.2 198.5 831.6 C 187.5 823.9 180.2 812.5 177.9 799.4 L 176.2 790 C 191.3 783.4 202.4 768.9 203.6 751.3 L 205.6 721.6 C 206.5 709.3 202.4 697.9 195 689.2 C 203.8 681.5 209.7 670.5 210.6 658 L 212.6 628.3 C 213.4 616.1 209.5 604.4 201.5 595.2 C 200.1 593.6 198.5 592 196.9 590.6 C 203 583.5 207 574.4 207.7 564.3 L 209.7 534.5 C 211.4 509.5 192.4 487.7 167.4 486 L 121.4 482.8 L 60.3 140.2 C 55.5 113.2 73.6 87.3 100.6 82.4 L 101.1 82.3 L 111.7 98.6 C 121.3 113.5 138.9 121.1 156.4 118 L 343.3 84.4 C 360.8 81.3 374.6 68 378.5 50.7 L 382.8 31.4 L 383.8 31.3 C 396.9 28.9 410.1 31.8 421.1 39.4 C 432 47 439.3 58.5 441.7 71.6 L 503.3 417.4 C 495.8 416.3 488.1 416.4 480.6 417.6 L 369.5 435.4 C 359.5 437 351 443.1 346.2 452 C 341.3 461 341 471.4 345.1 480.7 L 352 495.9 C 364.2 523.1 393.3 539.4 422.8 535.5 L 458.3 530.8 C 460.7 530.5 463.2 531.3 464.9 533.1 L 537.3 607.8 L 559.2 730.8 C 564 757.8 546 783.7 519 788.6 Z M 806.1 834.5 C 784.2 858.6 754.2 874 721.9 877.8 C 689.5 881.6 656.8 873.6 629.9 855.2 L 579.1 820.5 C 577.2 819.3 575.1 818.5 572.9 818.2 L 533.9 813.4 C 570.3 801.7 593.4 764.5 586.5 725.9 L 570.3 635.1 C 573.6 634.9 576.8 633.7 579.3 631.2 C 584.8 625.9 584.9 617.1 579.6 611.6 L 560.2 591.6 C 560.2 591.6 560.2 591.6 560.2 591.6 L 484.8 513.8 C 477 505.7 465.7 501.8 454.6 503.3 L 419.2 507.9 C 401.7 510.3 384.5 500.6 377.3 484.6 L 370.4 469.3 C 369.6 467.5 370.2 466 370.6 465.2 C 371 464.5 372 463.2 373.9 462.8 L 485 445 C 493.7 443.6 502.6 444.6 510.8 447.8 C 513.2 450.6 516.6 452.3 520.2 452.5 L 645.6 521.9 C 646.2 522.4 646.7 522.8 647.3 523.2 C 680.3 544.2 695.5 581.9 693.8 638.5 C 693.6 643.1 695.8 647.5 699.6 650.2 L 793.6 717.4 C 811.9 730.4 823.8 750.8 826.2 773.1 C 828.5 795.5 821.2 817.9 806.1 834.5 Z M 806.1 834.5"/></svg>';
var COMMS_COMPOSE_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.6 8.5 15.5l.9-3.5z"/></svg>';
var COMMS_SEARCH_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/></svg>';
var commsStudents = [];       // every roster student {name, number}: Students lists them even before they write
var commsArchived = [];       // students' archived texts (the Deleted tab): Search finds them under "Archived"
var commsFilter = "all";
var commsDetail = null;
var commsPollTimer = null;
var COMMS_POLL_INTERVAL = 30000;
var commsEditing = false;     // Edit mode: cards tick instead of opening
var commsSelected = {};       // sheet row → true

// ── Entry point (called from switchTab) ─────────────────────────────────────
function initCommsTab() {
  commsEnsureExtras();
  setCommsFilter(commsFilter);   // paint the filter row to match the live filter
  loadCommsInbox();
}

function loadCommsInbox() {
  var url = getScriptUrl();
  if (!url) return;

  commsScopeBusy(true);   // the scope's trace moves while this check runs (user, 2026-11-10)
  fetch(url + "?action=getCommsInbox")
    .then(function(r) { commsScopeBusy(false); return r.json(); })
    .then(function(data) {
      if (data.success) {
        // The live Inbox sheet carries a stray uppercase header row at row 2
        // (TIMESTAMP / SOURCE / …) that the backend hands back as a message.
        // Anything without a real date is not a message — drop it.
        commsMessages = (data.messages || []).filter(function (m) {
          return m.timestamp && !isNaN(new Date(m.timestamp).getTime());
        });
        commsStudents = data.students || [];
        commsArchived = data.archived || [];
        var msgr = document.querySelector(".cm-msgr");
        if (msgr) msgr.classList.remove("cm-loading");
        renderCommsInbox();
        commsCheckNew();   // the COMMS rack button for a new text (on any tab)
        // An open conversation picks up new texts on the 30-second poll too.
        var win = document.getElementById("commsDetailOverlay");
        if (commsDetail && win && win.classList.contains("open")) renderCommsThread();
      }
    })
    .catch(function() { commsScopeBusy(false); });
}

function startCommsPolling() {
  stopCommsPolling();
  commsPollTimer = setInterval(loadCommsInbox, COMMS_POLL_INTERVAL);
}

function stopCommsPolling() {
  if (commsPollTimer) { clearInterval(commsPollTimer); commsPollTimer = null; }
}

function renderCommsInbox() {
  var inbox = document.getElementById("commsInbox");
  if (!inbox) return;
  updateCommsBadge();
  var filtered = commsMessages.filter(function(m) {
    // Scams (Google listing robocall, flagged by the backend) only show under
    // their own Scam filter: never in All / Text / Voicemail / Unanswered.
    if (m.source === "out") return false;   // my replies live in the conversation, not the list
    if (m.student) return false;            // students have their own column (2026-11-01)
    if (commsFilter === "scam") return m.scam;
    if (m.scam) return false;
    if (commsFilter === "sms") return m.source === "sms";
    if (commsFilter === "voicemail") return m.source === "voicemail";
    if (commsFilter === "unresponded") return !m.responded;
    return true;
  });

  inbox.classList.toggle("comms-editing", commsEditing);
  commsShown = filtered;
  updateCommsSelection();
  var label = document.getElementById("commsListLabel");
  renderCommsStudents();
  if (!filtered.length) {
    if (label) label.textContent = "0 conversations";
    inbox.innerHTML = '<div class="cm-none">None</div>';
    return;
  }

  // One line per person (2026-10-31): their newest message, newest person
  // first, in day blocks like This Week. Clicking opens the conversation.
  var people = [], byKey = {};
  filtered.slice().sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
    .forEach(function (m) {
      var k = commsKey(m.fromNumber) || ("row" + m.row);
      if (!byKey[k]) { byKey[k] = { latest: m, msgs: [] }; people.push(byKey[k]); }
      byKey[k].msgs.push(m);
    });
  if (label) label.textContent = people.length + (people.length === 1 ? " conversation" : " conversations");

  inbox.innerHTML = "";
  var day = null, block = null;
  people.forEach(function(p) {
    var msg = p.latest, d = new Date(msg.timestamp), key = d.toDateString();
    if (key !== day) {
      day = key;
      block = document.createElement("div");
      block.className = "cm-day";
      block.innerHTML = '<label class="field-label">' + commsDayLabel(d) + '</label>';
      inbox.appendChild(block);
    }
    var open = p.msgs.some(function (m) { return !m.responded; });
    var picked = function () { return p.msgs.every(function (m) { return commsSelected[m.row]; }); };
    var row = document.createElement("div");
    row.className = "cm-row" + (open ? "" : " cm-done") + (picked() ? " selected" : "");
    row.onclick = function() {
      if (!commsEditing) { openCommsDetail(msg); return; }
      var on = !picked();
      p.msgs.forEach(function (m) { if (on) commsSelected[m.row] = true; else delete commsSelected[m.row]; });
      row.classList.toggle("selected", on);
      updateCommsSelection();
    };
    var display = msg.fromName || commsFormatPhone(msg.fromNumber) || "Unknown";
    var preview = msg.source === "voicemail"
      ? (msg.transcript && msg.transcript !== "(transcribing…)" && msg.transcript !== "(no transcript)" ? msg.transcript : "Voicemail, no transcript")
      : (msg.body || "—");
    row.innerHTML =
      '<span class="cm-check"></span>' +
      '<span class="td-mini-t">' + commsClock(d) + '</span>' +
      '<span class="cm-ico">' + (msg.source === "voicemail" ? "📞" : "💬") + '</span>' +
      '<span class="cm-name">' + commsEscape(display) + '</span>' +
      '<span class="cm-prev">' + commsEscape(preview) + '</span>' +
      (p.msgs.length > 1 ? '<span class="cm-cnt">' + p.msgs.length + '</span>' : '');
    block.appendChild(row);
  });
}

// Students, set up like the Messages app (user, 2026-11-01): conversations on
// the left (newest first, initials, name + time, two lines of the last message,
// red dot while they wait for me, a search box), the open one on the right
// with bubbles and a text box. New text reaches any roster student.
var commsPaneDetail = null;   // whose conversation the right pane shows

function commsStudentPeople(archived) {
  var byKey = {};
  (archived ? commsArchived : commsMessages).forEach(function (m) {
    if (!m.student || m.scam) return;
    var k = commsKey(m.fromNumber);
    if (!byKey[k]) byKey[k] = { key: k, name: m.student, number: m.fromNumber, msgs: [] };
    byKey[k].msgs.push(m);
  });
  return Object.keys(byKey).map(function (k) {
    var p = byKey[k];
    p.msgs.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    p.latest = p.msgs[0];
    p.waiting = p.msgs.some(function (m) { return m.source !== "out" && !m.responded && !commsReaction(m); });   // a 👍 needs no answer
    return p;
  }).sort(function (a, b) { return new Date(b.latest.timestamp) - new Date(a.latest.timestamp); });
}

function renderCommsStudents() {
  var list = document.getElementById("commsStuList");
  if (!list) return;
  commsPaintNewText();
  var people = commsStudentPeople();
  if (!commsPaneDetail && people.length) commsPaneDetail = people[0].latest;   // open the newest, like Messages

  var q = ((document.getElementById("cmSearch") || {}).value || "").trim().toLowerCase();
  var shown = people.filter(function (p) {
    return !q || p.name.toLowerCase().indexOf(q) >= 0 ||
      p.msgs.some(function (m) { return String(m.body || m.transcript || "").toLowerCase().indexOf(q) >= 0; });
  });
  // Searching a student I haven't texted yet still finds them (a new conversation).
  if (q) commsStudents.forEach(function (s) {
    var k = commsKey(s.number);
    if (s.name.toLowerCase().indexOf(q) >= 0 && !people.some(function (p) { return p.key === k; }))
      shown.push({ key: k, name: s.name, number: s.number, msgs: [], latest: null, waiting: false });
  });

  // Archived conversations only come up in a search, in their own section below.
  var arch = q ? commsStudentPeople(true).filter(function (p) {
    return p.name.toLowerCase().indexOf(q) >= 0 ||
      p.msgs.some(function (m) { return String(m.body || m.transcript || "").toLowerCase().indexOf(q) >= 0; });
  }) : [];
  arch.forEach(function (p) { p.archived = true; });
  if (arch.length) shown = shown.concat([{ header: "Archived" }], arch);

  var openKey = commsPaneDetail ? commsKey(commsPaneDetail.fromNumber) : "", openArch = !!(commsPaneDetail && commsPaneDetail.archived);
  list.innerHTML = shown.length ? "" : '<div class="cm-none cm-list-empty">' + (q ? "No match" : "No conversations yet. Start one with New text.") + '</div>';
  shown.forEach(function (p) {
    if (p.header) { list.insertAdjacentHTML("beforeend", '<div class="field-label cm-arch-h">' + p.header + '</div>'); return; }
    var m = p.latest, row = document.createElement("div");
    row.className = "cm-conv" + (p.waiting ? " cm-wait" : "") + (p.archived ? " cm-arch" : "") +
      (p.key === openKey && !!p.archived === openArch ? " cm-sel" : "");
    row.onclick = function () {
      commsPaneOpen(m || { row: 0, source: "sms", fromNumber: p.number, fromName: p.name, student: p.name, responded: true, blank: true });
    };
    if (m && !p.archived) row.oncontextmenu = function (e) { e.preventDefault(); commsConvMenu(e, p); };
    var prev = "No messages yet", when = "";
    if (m) {
      var d = new Date(m.timestamp), day = commsDayLabel(d);
      var rx = commsReaction(m);
      prev = rx ? "Reacted " + rx.emoji + " to your message"
        : m.source === "voicemail"
        ? "Voicemail" + (m.transcript && m.transcript !== "(transcribing…)" && m.transcript !== "(no transcript)" ? ": " + m.transcript : "")
        : (commsImageOf(m) && !String(m.body || "").trim() ? "📷 Picture" : commsFileOf(m) && !String(m.body || "").trim() ? "📄 " + commsFileOf(m).name : commsText(m));
      when = day === "Today" ? commsClock(d) : day === "Yesterday" ? day : day.replace(/^\w+, /, "");
    }
    var ini = p.name.split(/\s+/).map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
    row.innerHTML =
      '<span class="cm-dot"></span>' +
      '<span class="cm-ava">' + commsEscape(ini) + '</span>' +
      '<span class="cm-conv-main">' +
        '<span class="cm-conv-top"><span class="cm-conv-name">' + commsEscape(p.name) + '</span>' +
        '<span class="cm-conv-when">' + when + '</span></span>' +
        '<span class="cm-conv-prev">' + commsDimEmoji(commsEscape(prev)) + '</span>' +
      '</span>';
    list.appendChild(row);
  });
  commsPaintPane(false);
}

// Right-click a conversation, like Messages (user, 2026-11-04): Mark answered
// (while they wait) and Delete, which moves all its rows to the Deleted tab.
function commsConvMenu(e, p) {
  commsCloseConvMenu();
  var menu = document.createElement("div");
  menu.className = "cm-new-list cm-ctx";
  menu.id = "cmCtx";
  menu.innerHTML = (p.waiting ? '<button type="button" class="cm-new-opt" data-a="mark">Mark answered</button>' : "") +
    '<button type="button" class="cm-new-opt cm-ctx-del" data-a="del">Archive</button>';   // no "…": the portal turns a trailing … into loading dots
  menu.style.left = e.clientX + "px";
  menu.style.top = e.clientY + "px";
  document.body.appendChild(menu);
  menu.onclick = function (ev) {
    var b = ev.target.closest("[data-a]"), a = b && b.getAttribute("data-a");
    commsCloseConvMenu();
    if (a === "mark") { var keep = commsPaneDetail; commsPaneDetail = p.latest; commsPaneMark(); commsPaneDetail = keep; renderCommsStudents(); }
    if (a === "del") commsDeleteConv(p);
  };
}
function commsCloseConvMenu() { var m = document.getElementById("cmCtx"); if (m) m.remove(); }
document.addEventListener("click", function (e) { if (!e.target.closest("#cmCtx")) commsCloseConvMenu(); });
document.addEventListener("scroll", commsCloseConvMenu, true);
document.addEventListener("keydown", function (e) { if (e.key === "Escape") commsCloseConvMenu(); });

function commsDeleteConv(p) {
  var rows = p.msgs.map(function (m) { return m.row; }).filter(function (r) { return r >= 2; });
  if (!rows.length) return;
  // The Warning! box, like Terminate's and Slot change's (user, 2026-11-04).
  rpmConfirm({
    title: "Warning!",
    subtitle: "Upon activation:",
    message: "→ The conversation with " + p.name + " is archived: all " + rows.length + " message" + (rows.length === 1 ? "" : "s") + ".\n\n" +
      "→ It leaves the list. Search still finds it, under Archived.\n\n" +
      "→ A new text from " + p.name.split(" ")[0] + " starts a fresh conversation.",
    confirmLabel: "Archive",
    icon: WARN_ICON,
    danger: true,
    className: "tv-golive-dlg"
  }).then(function (ok) {
    if (!ok) return;
    var box = document.querySelector(".cm-msgr");
    rpmBusy(box, null, true, "Archiving");
    fetch(getScriptUrl() + "?action=deleteCommsRows&rows=" + rows.join(","))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        rpmBusy(box, null, false);
        if (!res.success) { rpmAlert({ title: "Not archived", message: res.message || "Something went wrong." }); return; }
        commsMessages = commsMessages.filter(function (m) { return rows.indexOf(m.row) < 0; });
        if (commsPaneDetail && commsKey(commsPaneDetail.fromNumber) === p.key) commsPaneDetail = null;
        renderCommsInbox();
        loadCommsInbox();   // fresh row numbers from the sheet
      })
      .catch(function () {
        rpmBusy(box, null, false);
        rpmAlert({ title: "Not archived", message: "Couldn't reach the sheet." });
      });
  });
}

function commsPaneOpen(detail) {
  commsPaneDetail = detail;
  renderCommsStudents();
  commsPaintPane(true);
  var box = document.getElementById("cmPaneReply");
  if (box) { box.value = ""; box.focus(); }
}

// The right pane. jump = scroll to the newest bubble (on open / send, not on
// every 30-second refresh while I may be reading higher up).
function commsPaintPane(jump) {
  commsWireDrop();
  var to = document.getElementById("cmPaneTo"), th = document.getElementById("cmPaneThread");
  var mark = document.getElementById("cmPaneMark"), input = document.querySelector(".cm-msgr-input");
  if (!to || !th) return;
  var d = commsPaneDetail;
  to.textContent = d ? (d.student || d.fromName || commsFormatPhone(d.fromNumber)) : "";
  // An archived conversation is read-only: no text box, no Mark answered.
  if (input) input.style.visibility = d && !d.archived ? "" : "hidden";
  if (mark) mark.style.display = d && !d.archived && commsOpenInThread(d).length ? "" : "none";
  if (d && d.archived) to.textContent += " · Archived";
  if (!d) { th.innerHTML = '<div class="cm-none cm-thread-empty">Pick a conversation, or start one with New text.</div>'; return; }
  var atBottom = th.scrollHeight - th.scrollTop - th.clientHeight < 40;
  th.innerHTML = commsThreadHtml(d);
  if (jump || atBottom) commsStickBottom(th);
  commsLoadPhotos(th);
}

// A picture waiting to go with the next text: { dataUrl, b64, mime, name }.
var commsPaneImage = null;

// Shrink big screenshots before sending (picture messages top out around 5 MB
// and carriers squeeze them further): longest side 1600 px, JPEG.
function commsPickImage(file) {
  if (file && file.type === "application/pdf") { commsPickPdf(file); return; }
  if (!file || !/^image\//.test(file.type)) return;
  var reader = new FileReader();
  reader.onload = function () {
    var im = new Image();
    im.onload = function () {
      var scale = Math.min(1, 1600 / Math.max(im.width, im.height));
      var c = document.createElement("canvas");
      c.width = Math.round(im.width * scale); c.height = Math.round(im.height * scale);
      var g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);   // transparent PNGs get a white page, not black
      g.drawImage(im, 0, 0, c.width, c.height);
      var dataUrl = c.toDataURL("image/jpeg", 0.86);
      commsPaneImage = { dataUrl: dataUrl, b64: dataUrl.split(",")[1], mime: "image/jpeg", name: (file.name || "screenshot").replace(/\.\w+$/, "") + ".jpg" };
      commsPaintChip();
      var box = document.getElementById("cmPaneReply"); if (box) box.focus();
    };
    im.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// A PDF goes as a link (user, 2026-11-01): saved to Drive, the text carries
// "name.pdf: <link>". Up to 20 MB (the upload has to fit one request).
function commsPickPdf(file) {
  if (file.size > 20 * 1024 * 1024) { rpmAlert({ title: "Too big", message: "PDFs up to 20 MB. Share bigger ones with a Dropbox link." }); return; }
  var reader = new FileReader();
  reader.onload = function () {
    commsPaneImage = { pdf: true, b64: String(reader.result).split(",")[1], mime: "application/pdf", name: file.name || "file.pdf", size: file.size };
    commsPaintChip();
    var box = document.getElementById("cmPaneReply"); if (box) box.focus();
  };
  reader.readAsDataURL(file);
}

function commsSizeLabel(n) {
  return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
}

// A PDF I texted: "file|name|link" in the row. { name, link } or null.
function commsFileOf(m) {
  var x = String(m.audioUrl || "").match(/^file\|([^|]*)\|(.*)$/);
  return x ? { name: x[1], link: x[2] } : null;
}

function commsFileCard(f) {
  var inner = '<span class="cm-file-ico">PDF</span><span class="cm-file-name">' + commsEscape(f.name) + '</span>';
  return f.link ? '<a class="cm-file" href="' + commsEscape(f.link) + '" target="_blank" rel="noopener">' + inner + '</a>'
                : '<span class="cm-file">' + inner + '</span>';
}

function commsPasteImage(e) {
  var items = (e.clipboardData && e.clipboardData.items) || [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].kind === "file" && (/^image\//.test(items[i].type) || items[i].type === "application/pdf")) { e.preventDefault(); commsPickImage(items[i].getAsFile()); return; }
  }
}

function commsPaintChip() {
  var chip = document.getElementById("cmPaneChip");
  if (!chip) return;
  chip.hidden = !commsPaneImage;
  chip.innerHTML = !commsPaneImage ? "" :
    (commsPaneImage.pdf ? commsFileCard({ name: commsPaneImage.name + " · " + commsSizeLabel(commsPaneImage.size) }) : '<img src="' + commsPaneImage.dataUrl + '" alt="">') +
    '<button data-tip="Instant.\nRemoves the attachment." onclick="commsPaneImage = null; commsPaintChip()">✕</button>';
}

// Drop a picture anywhere on the conversation side.
function commsWireDrop() {
  var conv = document.querySelector(".cm-msgr-conv");
  if (!conv || conv._drop) return;
  conv._drop = true;
  conv.addEventListener("dragover", function (e) { if (commsPaneDetail) { e.preventDefault(); conv.classList.add("cm-drop"); } });
  conv.addEventListener("dragleave", function (e) { if (!conv.contains(e.relatedTarget)) conv.classList.remove("cm-drop"); });
  conv.addEventListener("drop", function (e) {
    conv.classList.remove("cm-drop");
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) { e.preventDefault(); commsPickImage(f); }
  });
}

// Sending from the pane (user, 2026-11-01): no dimmed overlay; the bubble
// appears at once with a small "Sending…" under it, like Messages. A picture
// goes as a POST (too big for a link), the same way Dropbox uploads do.
function commsPaneSend() {
  var d = commsPaneDetail, box = document.getElementById("cmPaneReply"), btn = document.getElementById("cmPaneSend");
  if (!d || !box) return;
  var body = box.value.trim(), pic = commsPaneImage;
  if (!body && !pic) { box.focus(); return; }
  var to = d.fromNumber, key = commsKey(to);
  var msg = { row: 0, timestamp: new Date().toISOString(), source: "out", fromNumber: to,
    audioUrl: pic ? (pic.pdf ? "file|" + pic.name + "|" : pic.dataUrl) : "",
    fromName: d.fromName || "", student: d.student || "", body: body, responded: true, _pending: true };
  commsMessages.push(msg);
  box.value = "";
  commsPaneImage = null; commsPaintChip();
  if (btn) btn.disabled = true;
  commsPaintPane(true);
  var req = pic
    ? fetch(getScriptUrl(), { method: "post", body: JSON.stringify({ action: pic.pdf ? "sendCommsFile" : "sendCommsImage", to: to, body: body, filename: pic.name, mime: pic.mime, dataB64: pic.b64 }) })
    : fetch(getScriptUrl() + "?action=sendCommsReply&to=" + encodeURIComponent(to) + "&body=" + encodeURIComponent(body));
  req.then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.success) throw new Error(res.message || "Something went wrong.");
      delete msg._pending;
      msg.status = "sent";
      if (res.image) msg.audioUrl = res.image;
      if (res.file) msg.audioUrl = res.file;
      commsMessages.forEach(function (m) { if (commsKey(m.fromNumber) === key) m.responded = true; });
      commsPaneDetail = Object.assign({}, d, { blank: false });
    })
    .catch(function (err) {
      commsMessages.splice(commsMessages.indexOf(msg), 1);
      if (!box.value) box.value = body;   // nothing typed is lost
      if (pic && !commsPaneImage) { commsPaneImage = pic; commsPaintChip(); }
      rpmAlert({ title: "Not sent", message: err && err.message && err.message !== "Failed to fetch" ? err.message : "Couldn't reach the server." });
    })
    .then(function () {
      if (btn) btn.disabled = false;
      renderCommsInbox();
      commsPaintPane(true);
    });
}

function commsPaneMark() {
  var url = getScriptUrl();
  commsOpenInThread(commsPaneDetail).forEach(function (m) {
    m.responded = true;
    if (url) fetch(url + "?action=markCommsResponded&row=" + m.row + "&responded=true").catch(function () {});
  });
  renderCommsInbox();
}

// New text: a dropdown of every roster student, A–Z (portal-styled, not a
// native select). Picking one opens their conversation, or an empty one.
function commsPaintNewText() {
  var menu = document.getElementById("cmNewList");
  if (!menu) return;
  menu.innerHTML = commsStudents.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
    .map(function (s, i) { return '<button type="button" class="cm-new-opt" data-i="' + i + '">' + commsEscape(s.name) + '</button>'; }).join("");
  var sorted = commsStudents.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  menu.querySelectorAll(".cm-new-opt").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      menu.hidden = true;
      var s = sorted[+b.dataset.i], k = commsKey(s.number);
      var last = commsMessages.filter(function (m) { return commsKey(m.fromNumber) === k; })
        .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })[0];
      commsPaneOpen(last || { row: 0, source: "sms", fromNumber: s.number, fromName: s.name, student: s.name, responded: true, blank: true });
    };
  });
}

function commsShowOthers(on) {
  var w = document.getElementById("commsOthersOverlay");
  if (w) w.classList.toggle("open", on);
}

function commsToggleNewText(e) {
  if (e) e.stopPropagation();
  var menu = document.getElementById("cmNewList");
  if (menu) menu.hidden = !menu.hidden;
}
document.addEventListener("click", function (e) {
  var menu = document.getElementById("cmNewList");
  if (menu && !menu.hidden && !e.target.closest(".cm-new")) menu.hidden = true;
});

// Counts on the filter buttons + the nav badge. Driven by the loaded
// messages, so they stay right after an Answered toggle or a delete.
function updateCommsBadge() {
  var real = commsMessages.filter(function (m) { return !m.scam && m.source !== "out"; });
  var open = real.filter(function (m) { return !m.responded && !commsReaction(m); }).length;   // a 👍 needs no answer
  var badge = document.getElementById("commsNavBadge");
  if (badge) {
    badge.textContent = open;
    badge.style.display = open > 0 ? "" : "none";
  }
  // The filter counts are for the Others column; the nav badge above counts everyone.
  var others = real.filter(function (m) { return !m.student; });
  var sms = 0, vm = 0;
  others.forEach(function (m) {
    if (m.source === "voicemail") vm++; else sms++;
  });
  var set = function (id, n) { var el = document.getElementById(id); if (el) el.textContent = n; };
  set("commsOpenCount", others.filter(function (m) { return !m.responded; }).length);
  set("commsOthersCount", others.filter(function (m) { return !m.responded; }).length);
  var ob = document.getElementById("commsOthersBtn"); if (ob) ob.classList.toggle("lit", others.some(function (m) { return !m.responded; }));   // the rack button lights while one waits
  set("commsSmsCount", sms);
  set("commsVoicemailCount", vm);
  set("commsScamCount", commsMessages.filter(function (m) { return m.scam; }).length);
}

// ── Edit mode: select + delete ──────────────────────────────────────────────
var commsShown = [];   // the rows on screen now (Select all ticks only these)

function commsToggleEdit() {
  commsEditing = !commsEditing;
  commsSelected = {};
  document.getElementById("commsEditBar").classList.toggle("editing", commsEditing);
  document.getElementById("commsEditToggle").textContent = commsEditing ? "Done" : "Edit";
  if (commsEditing) stopCommsPolling(); else startCommsPolling();   // no reshuffle under a half-made selection
  renderCommsInbox();
}

function commsToggleSelectAll() {
  var all = commsShown.length && commsShown.every(function (m) { return commsSelected[m.row]; });
  commsSelected = {};
  if (!all) commsShown.forEach(function (m) { commsSelected[m.row] = true; });
  renderCommsInbox();
}

function updateCommsSelection() {
  var n = Object.keys(commsSelected).length;
  var del = document.getElementById("commsDeleteBtn"), all = document.getElementById("commsSelectAll");
  if (del) { del.disabled = !n; del.textContent = n ? "Delete " + n : "Delete"; }
  if (all) all.textContent = commsShown.length && commsShown.every(function (m) { return commsSelected[m.row]; })
    ? "Select none" : "Select all";
}

function commsDeleteSelected() {
  var rows = Object.keys(commsSelected);
  if (!rows.length) return;
  rpmConfirm({
    title: "Delete " + rows.length + " message" + (rows.length === 1 ? "" : "s") + "?",
    message: "They leave Comms and move to the Deleted tab in the RPM Comms sheet.",
    confirmLabel: "Delete",
    danger: true
  }).then(function (ok) {
    if (!ok) return;
    var box = document.querySelector(".cm-oth-win"), btn = document.getElementById("commsDeleteBtn");
    rpmBusy(box, btn, true, "Deleting");
    fetch(getScriptUrl() + "?action=deleteCommsRows&rows=" + rows.join(","))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        rpmBusy(box, btn, false);
        if (!res.success) { rpmAlert({ title: "Not deleted", message: res.message || "Something went wrong." }); return; }
        commsMessages = commsMessages.filter(function (m) { return !commsSelected[m.row]; });
        commsToggleEdit();       // back to normal; reloads from the sheet with fresh row numbers
        loadCommsInbox();
      })
      .catch(function () {
        rpmBusy(box, btn, false);
        rpmAlert({ title: "Not deleted", message: "Couldn't reach the sheet." });
      });
  });
}

function setCommsFilter(filter) {
  commsFilter = filter;
  document.querySelectorAll(".cm-f").forEach(function(btn) {
    btn.classList.toggle("cm-on", btn.dataset.filter === filter);
  });
  renderCommsInbox();
}

// The window is the whole conversation with that number (their texts, voicemails
// and my replies, oldest first) with a reply box under it (2026-10-31).
function openCommsDetail(msg) {
  commsDetail = msg;
  commsEnsureExtras();
  document.getElementById("commsDetailFrom").textContent = msg.fromName || commsFormatPhone(msg.fromNumber) || "Unknown";
  document.getElementById("commsDetailSource").textContent = msg.student ? " · Student" : (msg.fromName ? " · " + commsFormatPhone(msg.fromNumber) : "");

  var audioSection = document.getElementById("commsDetailAudio");
  if (msg.source === "voicemail" && msg.audioUrl) {
    audioSection.style.display = "block";
    loadCommsAudio(msg.audioUrl);
  } else {
    audioSection.style.display = "none";
  }
  renderCommsThread();
  var box = document.getElementById("cmReply");
  box.value = "";
  commsPaintResponded();
  document.getElementById("commsDetailOverlay").classList.add("open");
  box.focus();
}

function commsKey(num) {
  var d = String(num || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

// A tapback sent as a text (user, 2026-11-01). iPhone: Liked “…” / Loved /
// Laughed at / Emphasized / Questioned / Disliked, or Reacted 😂 to “…”;
// Android: 👍 to “…”. Returns { emoji, quote } or null.
var COMMS_TAPBACKS = { "liked": "👍", "loved": "❤️", "disliked": "👎", "laughed at": "😂", "emphasized": "‼️", "questioned": "❓" };
function commsReaction(m) {
  if (!m || m.source !== "sms") return null;
  var b = String(m.body || "").trim(), x;
  if ((x = b.match(/^(Liked|Loved|Disliked|Laughed at|Emphasized|Questioned)\s+[“"]([\s\S]+)[”"]$/i)))
    return { emoji: COMMS_TAPBACKS[x[1].toLowerCase()], quote: x[2] };
  if ((x = b.match(/^(?:Reacted\s+)?(\S{1,8})\s+to\s+[“"]([\s\S]+)[”"]$/i)) && !/[a-z0-9]/i.test(x[1]))
    return { emoji: x[1], quote: x[2] };
  // iPhone on a picture: Reacted 😂 to an image / Liked an image (nothing to quote).
  if ((x = b.match(/^Reacted\s+(\S{1,8})\s+to\s+(an? (?:image|photo|video|attachment|audio message))$/i)))
    return { emoji: x[1], quote: x[2], media: true };
  if ((x = b.match(/^(Liked|Loved|Disliked|Laughed at|Emphasized|Questioned)\s+(an? (?:image|photo|video|attachment|audio message))$/i)))
    return { emoji: COMMS_TAPBACKS[x[1].toLowerCase()], quote: x[2], media: true };
  return null;
}

// "Delivered" / "Not delivered" / "Sent" under one of my texts. Plain SMS has
// no read receipts; Twilio only knows whether it reached the phone.
function commsDeliveryHtml(m, isLast) {
  if (m.source !== "out") return "";
  // The line's own answer to a file a student texted (user, 2026-11-01), not something I typed.
  var auto = m.audioUrl === "auto" ? "Auto-reply" : "";
  var st = String(m.status || ""), word = "";
  if (st === "undelivered" || st === "failed") return '<div class="cm-sending cm-fail">' + (auto ? auto + " · " : "") + 'Not delivered</div>';
  if (isLast) word = st === "delivered" || st === "read" ? "Delivered" : st === "unknown" ? "" : "Sent";
  var line = [auto, word].filter(Boolean).join(" · ");
  return line ? '<div class="cm-sending">' + line + '</div>' : "";
}

// A picture I texted: the Drive thumbnail saved in the row (or, while it is
// still sending, the local copy). { src, full } or null.
function commsImageOf(m) {
  var u = String(m.audioUrl || "");
  if (/^data:image\//.test(u)) return { src: u, full: u };
  var x = u.match(/drive\.google\.com\/thumbnail\?id=([\w-]+)/);
  // Straight to Google's image host (the thumbnail link is a redirect that sometimes came back blank).
  return x ? { src: "https://lh3.googleusercontent.com/d/" + x[1] + "=w1000", full: "https://drive.google.com/file/d/" + x[1] + "/view" } : null;
}

// Photos a student texted (user, 2026-11-03): F holds "media|<Twilio URL>" per
// photo; each is fetched once through getCommsMedia and kept here for the visit.
var commsPhotoCache = {};   // Twilio URL → data URI, or "loading" / "fail"
function commsInPhotos(m) {
  if (m.source === "out") return [];
  return String(m.audioUrl || "").split("\n").filter(function (l) { return l.indexOf("media|") === 0; })
    .map(function (l) { return l.slice(6); });
}
function commsPhotoHtml(u) {
  var d = commsPhotoCache[u], ok = d && d !== "loading" && d !== "fail";
  return '<img class="cm-img' + (ok ? "" : " cm-img-wait") + '" data-media="' + commsEscape(u) + '"' +
    (ok ? ' src="' + d + '"' : "") + ' alt="' + (d === "fail" ? "Photo didn't load" : "Photo") + '" onclick="commsOpenPhoto(this)">';
}
function commsLoadPhotos(root) {
  var url = getScriptUrl();
  if (!url || !root) return;
  root.querySelectorAll("img[data-media]").forEach(function (im) {
    var u = im.getAttribute("data-media");
    if (commsPhotoCache[u]) return;
    commsPhotoCache[u] = "loading";
    fetch(url + "?action=getCommsMedia&url=" + encodeURIComponent(u))
      .then(function (r) { return r.json(); })
      .then(function (res) { commsPhotoCache[u] = res.success && res.dataUri ? res.dataUri : "fail"; })
      .catch(function () { commsPhotoCache[u] = "fail"; })
      .then(function () {
        document.querySelectorAll("img[data-media]").forEach(function (el) {
          if (el.getAttribute("data-media") !== u) return;
          var sc = el.closest("#cmPaneThread, #cmThread");
          var atBottom = sc && sc.scrollHeight - sc.scrollTop - sc.clientHeight < 40;
          el.outerHTML = commsPhotoHtml(u);
          if (atBottom) sc.scrollTop = sc.scrollHeight;
        });
      });
  });
}
// Scroll to the newest bubble, again once each picture has its real height.
function commsStickBottom(el) {
  el.scrollTop = el.scrollHeight;
  el.querySelectorAll("img").forEach(function (im) {
    if (!im.complete) im.addEventListener("load", function () { el.scrollTop = el.scrollHeight; }, { once: true });
  });
}
// Full size in a new tab (a data: link can't be opened directly).
function commsOpenPhoto(im) {
  var d = commsPhotoCache[im.getAttribute("data-media")];
  if (!d || d.indexOf("data:") !== 0) return;
  fetch(d).then(function (r) { return r.blob(); }).then(function (b) { window.open(URL.createObjectURL(b), "_blank"); });
}

// Links in a text are clickable, like in Messages (user, 2026-11-01).
function commsLinkify(html) {
  return html.replace(/\b(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

// What a message says on screen; old rows still read "Sent a audio clip".
function commsText(m) {
  if (m.source === "voicemail")
    return "📞 Voicemail" + (m.transcript && m.transcript !== "(transcribing…)" && m.transcript !== "(no transcript)" ? ": " + m.transcript : ", no transcript");
  return String(m.body || "—").replace(/^📎 Sent a (?=[aeiou])/im, "📎 Sent an ").replace(/ \(ask for a Dropbox link\)/g, "");   // old rows
}

// The conversation as bubbles, oldest first, Messages style (user, 2026-11-01):
// a centred day + time over the first bubble and after any gap of an hour.
function commsThreadHtml(detail) {
  var key = commsKey(detail.fromNumber);
  var thread = (detail.archived ? commsArchived : commsMessages).filter(function (m) { return key && commsKey(m.fromNumber) === key; })
    .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
  if (!thread.length && detail.blank) return '<div class="cm-none cm-thread-empty">No messages yet. Your first text goes from the RPM number.</div>';
  if (!thread.length) thread = [detail];
  // Reactions become a small tag on the bubble they quote, not a bubble of their own.
  var tags = new Map(), loose = [];
  thread.forEach(function (m, i) {
    var r = commsReaction(m);
    if (!r) return;
    var q = r.quote.replace(/…$/, "").trim(), hit = null;
    for (var j = i - 1; j >= 0 && !hit; j--) {
      var b = String(thread[j].body || "").trim();
      if (r.media) { if (commsImageOf(thread[j])) hit = thread[j]; continue; }   // the latest picture before it
      if (!commsReaction(thread[j]) && b && (b === q || b.indexOf(q) === 0)) hit = thread[j];
    }
    if (hit) { var t = tags.get(hit) || []; t.push(r.emoji); tags.set(hit, t); } else loose.push(m);
    m._reaction = r;
  });
  // Delivery under my newest text, like Messages; "Not delivered" stays under
  // any text that failed (user, 2026-11-01).
  var lastOut = null;
  thread.forEach(function (m) { if (m.source === "out" && !m._pending) lastOut = m; });
  var last = 0;
  return thread.map(function (m) {
    if (m._reaction && loose.indexOf(m) < 0) return "";
    var d = new Date(m.timestamp), stamp = "";
    if (d - last > 3600000) stamp = '<div class="cm-stamp">' + commsDayLabel(d) + " " + commsClock(d) + '</div>';
    last = d;
    if (m._reaction) return stamp + '<div class="cm-react-note">' + m._reaction.emoji + " to " +
      (m._reaction.media ? commsEscape(m._reaction.quote) : "“" + commsEscape(m._reaction.quote) + "”") + '</div>';
    var t = tags.get(m);
    var img = commsImageOf(m), file = commsFileOf(m), txt = (img || file) && !String(m.body || "").trim() ? "" : commsText(m);
    var photos = commsInPhotos(m);
    // Their photo shows itself, so the "📎 Sent a photo" line goes; any words stay.
    if (photos.length) txt = /^📎 Sent (a photo|\d+ attachments \(photo\))$/m.test(txt) ? txt.replace(/\n?📎 Sent .*$/m, "").trim() : txt;
    var noteable = m.source !== "out" && txt;   // their texts with words: right-click → Add to notes (user, 2026-11-10; was a hover icon)
    return stamp + '<div class="cm-msg ' + (m.source === "out" ? "out" : "in") + (t ? " cm-has-tag" : "") + (img || file || photos.length ? " cm-has-img" : "") + '"' +
      (noteable ? ' data-note="' + commsEscape(txt) + '" data-when="' + d.getTime() + '"' : '') + '>' +
      (img ? '<a href="' + commsEscape(img.full) + '" target="_blank" rel="noopener"><img class="cm-img" src="' + commsEscape(img.src) + '" alt="Picture" referrerpolicy="no-referrer"></a>' : "") +
      photos.map(commsPhotoHtml).join("") +
      (file ? commsFileCard(file) : "") +
      (txt ? '<div class="cm-msg-t">' + commsLinkify(commsEscape(txt)) + '</div>' : "") +
      (t ? '<span class="cm-tag">' + t.join("") + '</span>' : "") +
      '</div>' +
      (m._pending ? '<div class="cm-sending cm-pend">Sending…</div>' : commsDeliveryHtml(m, m === lastOut));
  }).join("");
}

function renderCommsThread() {
  var el = document.getElementById("cmThread");
  if (!el || !commsDetail) return;
  el.innerHTML = commsThreadHtml(commsDetail);
  commsStickBottom(el);
  commsLoadPhotos(el);
}

// Bits added from here rather than index.html (a parallel session's commit
// sweeps index.html): the Students filter and the window's thread + reply box.
function commsEnsureExtras() {
  // One plain title like Today / Notes / To-Do (user, 2026-11-01): "Student
  // Phone Line", no grey "· …" part (was "Comms · Twilio line").
  var sub = document.querySelector("#commsBody .td-wk-title .win-sub");
  // 2026-11-10: "Twilio" (was "Student Phone Line") with the number beside it in
  // the grey engraved .win-sub, like every other title (was a line under it).
  if (sub) {
    if (sub.previousSibling && sub.previousSibling.nodeType === 3) sub.previousSibling.textContent = "Twilio";
    sub.innerHTML = '<span class="cm-title-icon">' + COMMS_TEXT_ICON + '</span>';   // the phone icon beside TWILIO instead of the number (user, 2026-11-10)
  }
  // Unanswered sits last in the filter row (user, 2026-10-31).
  var unans = document.querySelector('.cm-f[data-filter="unresponded"]');
  if (unans && unans.nextElementSibling) unans.parentNode.appendChild(unans);
  if (!document.getElementById("cmLineNo")) {
    var filters = document.querySelector("#commsBody .cm-filters");
    if (filters) filters.insertAdjacentHTML("beforebegin",
      '<div class="cm-page-icon" id="cmLineNo">' + COMMS_TEXT_ICON + '</div>');   // number moved into the title (2026-11-10)
  }
  // Students fill the page (user, 2026-11-01); Others (unknown numbers,
  // applicants, voicemails, scams) live in their own window behind a button in
  // the title row, with the filters, Edit, count and list moved into it.
  if (!document.getElementById("commsStuList")) {
    var box = document.querySelector("#commsBody .cm-box"), inbox = document.getElementById("commsInbox");
    var detail = document.getElementById("commsDetailOverlay");
    if (box && inbox && detail) {
      var stu = document.createElement("div");
      stu.className = "cm-stu";
      stu.innerHTML =
        // Hidden until the first load lands, so it never says "No conversations" while loading (user, 2026-11-04).
        '<div class="cm-msgr cm-loading">' +
          '<div class="rpm-loading cm-loadmsg">Loading</div>' +   // the ring + LOADING... until the first load (user, 2026-11-05)
          // Top of the list like Messages (user, 2026-11-01): the compose button
          // (New text) alone at the right, then a full-width search with a magnifier.
          '<div class="cm-msgr-list"><div class="cm-list-top">' +
            '<span class="cm-new"><button class="cm-compose" data-tip="Opens a window.\nNew text." aria-label="New text" onclick="commsToggleNewText(event)">' + COMMS_COMPOSE_ICON + '</button>' +
            '<div class="cm-new-list" id="cmNewList" hidden></div></span></div>' +
            '<label class="cm-search-wrap">' + COMMS_SEARCH_ICON +
            '<input class="cm-search" id="cmSearch" type="search" placeholder="Search" oninput="renderCommsStudents()"></label>' +
            '<div id="commsStuList"></div></div>' +
          '<div class="cm-msgr-conv">' +
            '<div class="cm-msgr-head"><span class="cm-to">To: <span id="cmPaneTo"></span></span>' +
              '<button class="link-btn" id="cmPaneMark" onclick="commsPaneMark()" style="display:none">Mark answered</button></div>' +
            '<div class="cm-pane-thread" id="cmPaneThread"></div>' +
            '<div class="cm-attach-chip" id="cmPaneChip" hidden></div>' +
            '<div class="cm-msgr-input">' +
              // Screenshots (user, 2026-11-01): +, paste (⌘V) or drop a picture on the conversation.
              '<button class="cm-attach" data-tip="Opens elsewhere.\nPick a picture or PDF to send." aria-label="Add a picture or PDF" onclick="document.getElementById(\'cmPaneFile\').click()">+</button>' +
              '<input type="file" id="cmPaneFile" accept="image/*,application/pdf" hidden onchange="commsPickImage(this.files[0]); this.value=\'\'">' +
              '<textarea class="cm-reply" id="cmPaneReply" rows="1" placeholder="Text message · RPM number" ' +
              'onpaste="commsPasteImage(event)" ' +
              'onkeydown="if (event.key === \'Enter\' && !event.shiftKey) { event.preventDefault(); commsPaneSend(); }"></textarea>' +
              '<button class="link-btn cm-send" id="cmPaneSend" onclick="commsPaneSend()">Send</button></div>' +
          '</div></div>';
      var win = document.createElement("div");
      win.className = "im-notes-back cm-win-back";
      win.id = "commsOthersOverlay";
      win.onclick = function (e) { if (e.target === win) commsShowOthers(false); };
      win.innerHTML = '<div class="td-student cm-win cm-oth-win"><div class="settings-title im-title"><span>Others</span>' +
        '<span class="cm-oth-acts"></span></div></div>';
      var body = win.firstChild, acts = body.querySelector(".cm-oth-acts");
      var edit = document.getElementById("commsEditToggle");
      if (edit) acts.appendChild(edit);
      acts.insertAdjacentHTML("beforeend", '<button class="settings-close" onclick="commsShowOthers(false)">✕</button>');
      [box.querySelector(".cm-filters"), document.getElementById("commsEditBar"),
       box.querySelector("hr.td-rule-top"), inbox].forEach(function (n) { if (n) body.appendChild(n); });
      // Templates (menu: Zoom lesson, No show, Optional schedule), Announcements (tabs/announce.js,
      // when loaded), Confirmations, Others (lit while one is unanswered).
      // The buttons moved into the box, top right beside the title, as plain portal buttons (user, 2026-11-08); the rack is gone.
      // 2026-11-10: the caption under each (user: "this is a special window"). Templates and
      // Announcements = the amp's knobs (they never light); Others = a square push button that lights red.
      var col = function (id, cap, click, tip, extra, wrapId, knob) {
        var btn = "<button class='" + (knob ? "cm-knob" : "cm-pb") + "' id='" + id + "' onclick='" + click + "' data-tip='" + tip + "'>" + (knob ? commsKnobSvg() : "") + "</button>";
        var b = "<span class='cm-pcol'>" + btn +
                "<span class='cm-pcap'>" + cap + "</span></span>";
        return extra ? "<span class='tt-menu' id='" + (wrapId || "cmTplWrap") + "'>" + b + extra + "</span>" : b;
      };
      var rack = document.createElement("div");
      rack.className = "cm-box-btns";
      rack.innerHTML =
            col("cmTplBtn", "Templates", "_ttMenu(event)", "Text templates: Zoom lesson,&#10;No show, Optional schedule.", "<span class='cash-dd-list' id='cmTplList' hidden></span>", "cmTplWrap", true) +
            // One Announcements button, menu: New / Confirmations (user, 2026-11-10; were two buttons).
            col("commsAnnBtn", "Announcements", "commsAnnMenu(event)", "New: text all students at once.&#10;Confirmations: who confirmed, Nudge the rest.", "<span class='cash-dd-list' hidden></span>", "cmAnnWrap", true) +
            col("commsOthersBtn", "Others <span id='commsOthersCount'>0</span>", "commsShowOthers(true)", "Opens a window.&#10;Unknown numbers, applicants,&#10;voicemails, scams.", null, null, true);   // a knob too (user, 2026-11-10); glows gold while one waits, like the amp knobs
      box.appendChild(rack);
      box.insertAdjacentHTML("beforeend", commsScopeSvg());   // the green phase scope, VU-meter size (user, 2026-11-10)
      box.appendChild(stu);
      // Two boxes (user, 2026-11-10; was one box with a line across): the title, icon, scope and
      // knobs in their own box on top, the rack's gap, then the box with the two panes.
      var head = document.createElement("div");
      head.className = "td-wk-box cm-headbox";
      head.innerHTML = '<span class="hr-bolt" style="left:10px"></span><span class="hr-bolt" style="right:10px"></span>';   // the rack's screws: one each side, centred (user, 2026-11-10)
      [box.querySelector(".td-wk-title"), document.getElementById("cmLineNo"), rack, box.querySelector(".cm-scope")].forEach(function (n) { if (n) head.appendChild(n); });
      box.parentNode.insertBefore(head, box);
      // A ⋯ button where EDIT was (user, 2026-11-10): press it for a menu (Edit, Others). EDIT shows again only as Done while editing.
      var lt = stu.querySelector(".cm-list-top");
      if (lt) lt.insertAdjacentHTML("afterbegin", '<span class="tt-menu cm-more" id="cmMoreWrap"><button type="button" class="cm-more-btn" onclick="commsMoreMenu(event)" aria-label="More">\u22ef</button><span class="cash-dd-list" hidden></span></span>');
      detail.parentNode.insertBefore(win, detail);   // the conversation window opens on top of it
    }
  }
  if (commsFilter === "students") commsFilter = "all";
  if (!document.getElementById("cmThread")) {
    ["commsDetailTime", "commsDetailBody", "commsDetailTranscript"].forEach(function (id) {
      var x = document.getElementById(id); if (x) x.style.display = "none";
    });
    var foot = document.querySelector("#commsDetailOverlay .cm-win-foot");
    if (foot) {
      foot.insertAdjacentHTML("beforebegin",
        '<div class="cm-thread" id="cmThread"></div>' +
        '<textarea class="cm-reply" id="cmReply" rows="3" placeholder="Reply from the RPM number…" ' +
          'onkeydown="if ((event.metaKey || event.ctrlKey) && event.key === \'Enter\') commsSendReply()"></textarea>');
      foot.insertAdjacentHTML("beforeend", '<button class="link-btn cm-send" id="cmSendBtn" onclick="commsSendReply()">Send</button>');
    }
  }
}

// Emojis in the list previews a bit dimmer (user, 2026-11-10): wraps each in .cm-emo.
function commsDimEmoji(html) {
  return html.replace(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)/gu, '<span class="cm-emo">$1</span>');
}

// A small green phase scope (goniometer) in the Comms title row, the VU meter's
// size and frame (#0c0c0c, #333 edge, 76x48 window; user 2026-11-10), scan lines, + and X grid, L / R, and
// a glowing trace (user's picture, 2026-11-10). The trace moves only while the
// 30-second Comms check runs (at least 1.5s so it shows), flat the rest of the time.
function commsScopeSvg() {
  // Round, like an old panel meter (user, 2026-11-10 picture): black bezel with four screws, round green screen.
  var screws = "";
  [[30, 4.2], [4.2, 30], [55.8, 30], [30, 55.8]].forEach(function (c, k) {
    screws += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="2.3" fill="url(#cmScScrew)" stroke="#000" stroke-width=".4"/>' +
      '<line x1="' + (c[0] - 1.5) + '" y1="' + c[1] + '" x2="' + (c[0] + 1.5) + '" y2="' + c[1] + '" stroke="#0a0a0a" stroke-width=".6" transform="rotate(' + (25 + k * 40) + ' ' + c[0] + ' ' + c[1] + ')"/>';
  });
  return '<span class="cm-scope" aria-hidden="true"><svg viewBox="0 0 60 60" width="58" height="58">' +
    '<defs>' +
      '<radialGradient id="cmScBez" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#2e2e2e"/><stop offset=".6" stop-color="#141414"/><stop offset="1" stop-color="#060606"/></radialGradient>' +
      '<radialGradient id="cmScScrew" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#6a6a6a"/><stop offset=".6" stop-color="#262626"/><stop offset="1" stop-color="#0c0c0c"/></radialGradient>' +
      '<radialGradient id="cmScGlass" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#0d2a12"/><stop offset=".7" stop-color="#061a0a"/><stop offset="1" stop-color="#020904"/></radialGradient>' +
      '<pattern id="cmScLines" width="2" height="1.2" patternUnits="userSpaceOnUse"><rect width="2" height=".5" fill="rgba(0,0,0,.38)"/></pattern>' +
      '<filter id="cmScGlow" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation=".8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<clipPath id="cmScClip"><circle cx="30" cy="30" r="20.5"/></clipPath>' +
    '</defs>' +
    '<circle cx="30" cy="30" r="29.3" fill="url(#cmScBez)" stroke="#000" stroke-width=".7"/>' +
    '<circle cx="30" cy="30" r="22.6" fill="#030303" stroke="#2a2a2a" stroke-width=".7"/>' + screws +
    '<g clip-path="url(#cmScClip)">' +
      '<circle cx="30" cy="30" r="20.5" fill="url(#cmScGlass)"/>' +
      '<g stroke="#3ccf55" stroke-opacity=".5" stroke-width=".4" fill="none">' +
        '<line x1="30" y1="12" x2="30" y2="48"/><line x1="12" y1="30" x2="48" y2="30"/>' +
        '<line x1="17.5" y1="17.5" x2="42.5" y2="42.5"/><line x1="42.5" y1="17.5" x2="17.5" y2="42.5"/>' +
      '</g>' +
      '<text x="19" y="22" font-family="Arial, sans-serif" font-size="4.2" fill="#7fe48d" fill-opacity=".85">L</text>' +
      '<text x="38.6" y="22" font-family="Arial, sans-serif" font-size="4.2" fill="#7fe48d" fill-opacity=".85">R</text>' +
      '<path id="cmScTrace" d="M13 30 L47 30" stroke="#c8ffc8" stroke-width=".7" fill="none" stroke-linecap="round" filter="url(#cmScGlow)"/>' +
      '<rect x="9" y="9" width="42" height="42" fill="url(#cmScLines)"/>' +
      '<ellipse cx="25" cy="19" rx="12" ry="5" fill="#fff" fill-opacity=".05"/>' +
    '</g>' +
  '</svg></span>';
}
var _cmScopeBusy = false, _cmScopeUntil = 0, _cmScopeFlat = false;
function commsScopeBusy(on) {
  if (on) { _cmScopeBusy = true; _cmScopeUntil = Date.now() + 1500; }
  else _cmScopeBusy = false;
}
// The trace's jitter: a new jagged line every 140ms, only while a check runs and the scope is on screen.
setInterval(function () {
  var t = document.getElementById("cmScTrace");
  if (!t || !t.closest(".cm-scope").offsetParent) return;
  if (!_cmScopeBusy && Date.now() > _cmScopeUntil) {
    if (!_cmScopeFlat) { t.setAttribute("d", "M13 30 L47 30"); _cmScopeFlat = true; }
    return;
  }
  _cmScopeFlat = false;
  var d = "M13 30";
  for (var x = 14; x <= 47; x += 1) {
    var amp = 1.4 * Math.sin(Math.PI * (x - 13) / 34);
    d += " L" + x + " " + (30 + (Math.random() - .5) * 2 * amp).toFixed(2);
  }
  t.setAttribute("d", d);
}, 140);

// The Comms knob (user's picture, 2026-11-10): a glossy black gear-shaped knob with a pointer fin and a light
// line, sitting in a dark ring that catches warm light on the left and cool on the right. .cm-kg turns while
// its menu is open.
function commsKnobSvg() {
  // body: round, four big scallops cut at +-55 / +-125 deg, a tall fin up top (past the ring) and a tail down the bottom
  return '<svg viewBox="0 0 40 42" width="30" height="31.5" aria-hidden="true"><defs>' +
      '<linearGradient id="cmKRing" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a6634"/><stop offset=".22" stop-color="#3a2a1c"/><stop offset=".5" stop-color="#0d0d0e"/><stop offset=".78" stop-color="#1d2a3a"/><stop offset="1" stop-color="#5a7aa0"/></linearGradient>' +
      '<radialGradient id="cmKBody" cx="50%" cy="32%" r="75%"><stop offset="0" stop-color="#3a3a3c"/><stop offset=".5" stop-color="#151516"/><stop offset="1" stop-color="#050505"/></radialGradient>' +
      '<linearGradient id="cmKShine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c08040" stop-opacity=".55"/><stop offset=".3" stop-color="#c08040" stop-opacity="0"/><stop offset=".7" stop-color="#6a8ab8" stop-opacity="0"/><stop offset="1" stop-color="#6a8ab8" stop-opacity=".55"/></linearGradient>' +
      '<linearGradient id="cmKFin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a4a4c"/><stop offset=".45" stop-color="#121213"/><stop offset="1" stop-color="#3a4250"/></linearGradient>' +
    '</defs>' +
    '<circle cx="20" cy="22" r="18" fill="url(#cmKRing)" stroke="#000" stroke-width=".7"/>' +
    '<circle cx="20" cy="22" r="14.6" fill="#050505"/>' +
    '<g class="cm-kg">' +
      // tail (bottom) and fin (top) first, the body over them
      '<path d="M16.6 30 L15.2 39.6 Q20 41 24.8 39.6 L23.4 30 Z" fill="url(#cmKFin)" stroke="#000" stroke-width=".4"/>' +
      '<path d="M18 1.2 Q20 0.4 22 1.2 L23.6 14 L16.4 14 Z" fill="url(#cmKFin)" stroke="#000" stroke-width=".4"/>' +
      '<path d="M20 9.4 A12.6 12.6 0 0 1 28.9 13.1 A3.4 3.4 0 0 0 31.6 18.3 A12.6 12.6 0 0 1 31.6 25.7 A3.4 3.4 0 0 0 28.9 30.9 ' +
        'A12.6 12.6 0 0 1 11.1 30.9 A3.4 3.4 0 0 0 8.4 25.7 A12.6 12.6 0 0 1 8.4 18.3 A3.4 3.4 0 0 0 11.1 13.1 A12.6 12.6 0 0 1 20 9.4 Z" ' +
        'fill="url(#cmKBody)" stroke="#000" stroke-width=".5"/>' +
      '<path d="M20 9.4 A12.6 12.6 0 0 1 28.9 13.1 A3.4 3.4 0 0 0 31.6 18.3 A12.6 12.6 0 0 1 31.6 25.7 A3.4 3.4 0 0 0 28.9 30.9 ' +
        'A12.6 12.6 0 0 1 11.1 30.9 A3.4 3.4 0 0 0 8.4 25.7 A12.6 12.6 0 0 1 8.4 18.3 A3.4 3.4 0 0 0 11.1 13.1 A12.6 12.6 0 0 1 20 9.4 Z" ' +
        'fill="url(#cmKShine)"/>' +
      '<rect x="19.3" y="2" width="1.4" height="14.5" rx=".7" fill="#dcdcdc"/>' +
    '</g></svg>';
}

// The list's ⋯ menu (user, 2026-11-10). Same open/close as the Templates menu.
function commsMoreMenu(e) {
  if (e) e.stopPropagation();
  var w = document.getElementById("cmMoreWrap"), list = w ? w.querySelector(".cash-dd-list") : null;
  if (!list) return;
  if (!list.hidden) { _ttMenuClose(); return; }
  _ttMenuClose();
  _ttWrap = w;
  list.innerHTML =
    (typeof commsStuToggleEdit === "function" ? "<button type='button' class='cash-dd-opt' onclick='_ttMenuClose();commsStuToggleEdit()'>Edit</button>" : "") +
    "<button type='button' class='cash-dd-opt' onclick='_ttMenuClose();commsShowOthers(true)'>Others</button>";
  list.hidden = false;
  setTimeout(function () { document.addEventListener("mousedown", _ttMenuOut); }, 0);
}

// A text worth remembering → Student Notes (user, 2026-11-10/11): right-click a text → Add to notes, saved straight away.
// Right-click one of their texts → a one-line menu, Add to notes (the conversation list's menu look).
document.addEventListener("contextmenu", function (e) {
  var bub = e.target.closest && e.target.closest(".cm-msg[data-note]");
  if (!bub || !bub.closest("#commsBody, #commsDetailOverlay")) return;
  e.preventDefault();
  commsCloseConvMenu();
  var menu = document.createElement("div");
  menu.className = "cm-new-list cm-ctx";
  menu.id = "cmCtx";
  menu.innerHTML = '<button type="button" class="cm-new-opt"><span class="cm-ctx-arw">\u2192</span> Student Note</button>';
  menu.style.left = e.clientX + "px";
  menu.style.top = e.clientY + "px";
  document.body.appendChild(menu);
  menu.onclick = function () { commsCloseConvMenu(); commsNoteFrom(bub, e.clientX, e.clientY); };
});
function commsNoteFrom(bub, x, y) {
  // Saved straight to Student Notes, no window (user, 2026-11-11): "(from text) <their text> · Nov 7" under their name.
  var d = commsPaneDetail || commsDetail || {};
  var name = d.student || d.fromName || commsFormatPhone(d.fromNumber || "");
  var when = new Date(+bub.dataset.when).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  var note = "(from text) " + bub.dataset.note + " \u00b7 " + when;
  var flash = function (msg) {
    var f = document.createElement("div");
    f.className = "cm-new-list cm-ctx cm-note-flash";
    f.textContent = msg;
    f.style.left = x + "px"; f.style.top = y + "px";
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 1400);
  };
  var url = getScriptUrl();
  if (!url) { flash("Not saved: no portal link"); return; }
  fetch(url + "?action=addSchedNote&name=" + encodeURIComponent(name) + "&note=" + encodeURIComponent(note) + "&week=&picks=&from=comms")
    .then(function (r) { return r.json(); })
    .then(function (r) {
      if (!r.success) throw new Error(r.message || "not saved");
      if (typeof _snNotes !== "undefined" && _snNotes) _snNotes.push({ row: r.row || -Date.now(), name: name, note: note, week: "", picks: "", created: "", from: "comms", closed: "", how: "" });
      flash("Added to notes");
    })
    .catch(function (e) { flash("Not saved: " + ((e && e.message) || "no answer")); });
}

// Announcements ▾ menu: New / Confirmations. Reuses the Templates menu's
// open/close (tabs/texttemplates.js _ttWrap, _ttMenuOut, _ttMenuClose).
function commsAnnMenu(e) {
  if (e) e.stopPropagation();
  var w = document.getElementById("cmAnnWrap"), list = w ? w.querySelector(".cash-dd-list") : null;
  if (!list) return;
  if (!list.hidden) { _ttMenuClose(); return; }
  _ttMenuClose();
  _ttWrap = w;
  list.innerHTML =
    "<button type='button' class='cash-dd-opt' onclick='_ttMenuClose();annOpen()'>New</button>" +
    "<button type='button' class='cash-dd-opt' onclick='_ttMenuClose();annOpenConf()'>Confirmations</button>";
  list.hidden = false;
  setTimeout(function () { document.addEventListener("mousedown", _ttMenuOut); }, 0);
}

// Texts from the RPM number and adds the "out" bubble locally. Used by the
// window (commsSendReply) and the Students pane (commsPaneSend).
function commsSendTo(detail, box, btn, busyEl, done) {
  var body = box.value.trim();
  if (!body) { box.focus(); return; }
  var to = detail.fromNumber, key = commsKey(to);
  rpmBusy(busyEl, btn, true, "Sending");
  fetch(getScriptUrl() + "?action=sendCommsReply&to=" + encodeURIComponent(to) + "&body=" + encodeURIComponent(body))
    .then(function (r) { return r.json(); })
    .then(function (res) {
      rpmBusy(busyEl, btn, false);
      if (!res.success) { rpmAlert({ title: "Not sent", message: res.message || "Something went wrong." }); return; }
      commsMessages.push({ row: 0, timestamp: new Date().toISOString(), source: "out", fromNumber: to,
        fromName: detail.fromName || "", student: detail.student || "", body: body, responded: true });
      commsMessages.forEach(function (m) { if (commsKey(m.fromNumber) === key) m.responded = true; });
      box.value = "";
      done();
    })
    .catch(function () {
      rpmBusy(busyEl, btn, false);
      rpmAlert({ title: "Not sent", message: "Couldn't reach the server." });
    });
}

function commsSendReply() {
  if (!commsDetail) return;
  commsSendTo(commsDetail, document.getElementById("cmReply"), document.getElementById("cmSendBtn"),
    document.querySelector("#commsDetailOverlay .cm-win"), function () {
      renderCommsThread(); commsPaintResponded(); renderCommsInbox();
    });
}

// "Mark answered" shows only while that person has texts waiting for me
// (user, 2026-11-01): nothing to mark on a first text or an answered thread.
function commsOpenInThread(detail) {
  detail = detail || commsDetail;
  if (!detail) return [];
  var key = commsKey(detail.fromNumber);
  return commsMessages.filter(function (m) {
    return key && commsKey(m.fromNumber) === key && m.source !== "out" && !m.responded && m.row && !commsReaction(m);
  });
}

function commsPaintResponded() {
  var b = document.getElementById("commsRespondedBtn");
  if (!b) return;
  b.textContent = "Mark answered";
  b.style.display = commsOpenInThread().length ? "" : "none";
}

// Twilio recording URLs need Basic Auth, so we can't point <audio> at them
// directly (browser shows a Twilio login prompt). Fetch the mp3 through the
// Apps Script proxy, which authenticates server-side and returns a data URI.
function loadCommsAudio(audioUrl) {
  var player = document.getElementById("commsAudioPlayer");
  player.removeAttribute("src");
  player.load();

  var url = getScriptUrl();
  if (!url) return;

  fetch(url + "?action=getRecordingAudio&url=" + encodeURIComponent(audioUrl))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // Guard against a stale response after the user closed/switched cards.
      if (!commsDetail || commsDetail.audioUrl !== audioUrl) return;
      if (data.success && data.dataUri) {
        player.src = data.dataUri;
        player.load();
      }
    })
    .catch(function() {});
}

function closeCommsDetail() {
  document.getElementById("commsDetailOverlay").classList.remove("open");
  var player = document.getElementById("commsAudioPlayer");
  player.pause();
  player.removeAttribute("src");
  commsDetail = null;
}

function toggleCommsResponded() {
  var open = commsOpenInThread(), url = getScriptUrl();
  open.forEach(function (m) {
    m.responded = true;
    if (url) fetch(url + "?action=markCommsResponded&row=" + m.row + "&responded=true").catch(function () {});
  });
  if (commsDetail) commsDetail.responded = true;
  commsPaintResponded();
  renderCommsInbox();
}

// "Today" / "Yesterday" / "Thu, Oct 30" (+ year when not this year).
function commsDayLabel(d) {
  var t = new Date(); t.setHours(0, 0, 0, 0);
  var x = new Date(d); x.setHours(0, 0, 0, 0);
  var diff = Math.round((t - x) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() +
    (d.getFullYear() !== t.getFullYear() ? ", " + d.getFullYear() : "");
}

function commsClock(d) {
  var h = d.getHours(), ampm = h >= 12 ? "PM" : "AM";
  return (h % 12 || 12) + ":" + String(d.getMinutes()).padStart(2, "0") + " " + ampm;
}

function commsFormatPhone(num) {
  if (!num) return "";
  var clean = num.replace(/\D/g, "");
  if (clean.length === 11 && clean.charAt(0) === "1") clean = clean.substring(1);
  if (clean.length === 10) {
    return "(" + clean.substring(0, 3) + ") " + clean.substring(3, 6) + "-" + clean.substring(6);
  }
  return num;
}

function commsFormatTimeFull(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var h = d.getHours();
  var ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  var min = String(d.getMinutes()).padStart(2, "0");
  return days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() + " at " + h + ":" + min + " " + ampm;
}

function commsEscape(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── New-text warning (user, 2026-11-06: "i got a text message, the comms tab should warn me") ──
// Every minute, on every tab, the inbox is read again. A real text or voicemail that came in
// after the last one I saw lights the COMMS button on Home's rack + the ☰ Comms row, until I open Comms.
// Not a warning: my own texts, scams, a 👍 reaction, a bare "Y" (that's an announcement
// confirm, it shows in Confirmations) and anything already marked answered.
// "Seen" = the newest inbound time I was shown, kept in localStorage per browser.
var COMMS_WATCH_INTERVAL = 60000;
var commsWatchTimer = null;
var commsAlertList = [];   // the new messages lighting the button, oldest first

function commsSeenTime() {
  try { return +localStorage.getItem("rpmCommsSeen") || 0; } catch (e) { return 0; }
}
function commsSetSeen(t) {
  try { if (t > commsSeenTime()) localStorage.setItem("rpmCommsSeen", String(t)); } catch (e) {}
}
function commsIsInbound(m) {
  return m && !m.scam && (m.source === "sms" || m.source === "voicemail");
}
function commsWorthWarning(m) {
  if (!commsIsInbound(m) || m.responded === true || m.responded === "TRUE") return false;
  if (commsReaction(m)) return false;
  if (m.source === "sms" && /^\s*["“]?\s*y(?![\w'’])[\s!.]*$/i.test(String(m.body || ""))) return false;   // bare Y = confirm
  return true;
}
function commsOnTab() {
  var t = document.getElementById("tab-comms");
  return !!(t && t.classList.contains("active"));
}

// Called after every inbox load (the Comms tab's own 30s poll and the background one).
function commsCheckNew() {
  var inbound = commsMessages.filter(commsIsInbound);
  var newest = inbound.reduce(function (t, m) { return Math.max(t, new Date(m.timestamp).getTime()); }, 0);
  var seen = commsSeenTime();
  if (!seen) { commsSetSeen(newest); return; }   // first time in this browser: start from now, no backlog
  if (commsOnTab()) { commsSetSeen(newest); commsHideAlert(); return; }   // looking at it already
  commsAlertList = inbound.filter(function (m) {
    return new Date(m.timestamp).getTime() > seen && commsWorthWarning(m);
  }).sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
  if (commsAlertList.length) commsShowAlert(); else commsHideAlert();
}

// No pop-up (user, 2026-11-06: "on the comms tab ... i was looking at the tabs"): the COMMS
// button on Home's rack (2026-11-07; a red rocker switch in the header was tried first) and
// the Comms row in the ☰ list light up until Comms is opened.
function commsShowAlert() { commsKnobLit(true); }
function commsHideAlert() { commsKnobLit(false); }
function commsKnobLit(on) {
  var k = document.getElementById("hrCommsBtn");
  if (k) k.classList.toggle("lit", on);
  // the rack's amber NEW TEXTS counter (user, 2026-11-08): how many new texts since Comms was last opened; dim at 0
  var c = document.getElementById("hrTextCount");
  if (c) { var n = on ? commsAlertList.length : 0; c.textContent = n; c.classList.toggle("on", n > 0); }
  var t = document.querySelector('.tabs .tab-btn[data-tab="comms"]');
  if (t) t.classList.toggle("cm-new", on);
}
function commsAlertSeenAll() {
  var t = commsMessages.filter(commsIsInbound).reduce(function (t, m) { return Math.max(t, new Date(m.timestamp).getTime()); }, 0);
  commsSetSeen(t);
}
function commsWatchTick() {
  if (document.hidden) return;   // a background browser tab doesn't need to ask Google
  if (commsOnTab()) return;      // the Comms tab polls every 30s itself
  loadCommsInbox();
}
(function commsWatchStart() {
  if (commsWatchTimer) return;
  setTimeout(commsWatchTick, 8000);   // after the startup loads
  commsWatchTimer = setInterval(commsWatchTick, COMMS_WATCH_INTERVAL);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) commsWatchTick(); });
})();
