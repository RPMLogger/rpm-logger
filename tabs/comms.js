// ─── TABS / COMMS.JS ─────────────────────────────────────────────────────────
// Comms tab: everything that arrives on the Twilio line and is NOT a known
// student — inbound texts + voicemails (known students route to Student Line
// at intake). Its own tab since 2026-09-22; it used to be a hidden view inside
// Inquiries, which left it invisible once the counts bar was removed there.

var commsMessages = [];
// Comms page icon under the number: hand holding a phone (user, om-12, 2026-11-01; was om-11 phone in a circle).
var COMMS_TEXT_ICON = '<svg class="win-icon" viewBox="0 0 858 907.5" aria-hidden="true"><path fill="currentColor" d="M 451 748.2 L 287.5 780.2 C 280 781.6 275.1 788.9 276.6 796.5 C 277.9 803.1 283.7 807.7 290.2 807.7 C 291.1 807.7 291.9 807.6 292.8 807.4 L 456.3 775.4 C 463.8 774 468.8 766.7 467.3 759.2 C 465.8 751.6 458.5 746.7 451 748.2 Z M 451 748.2"/><path fill="currentColor" d="M 853.8 770.2 C 850.5 739.9 834.5 712.4 809.7 694.8 L 721.6 631.9 C 722 570.9 702.9 527 664.7 501.4 C 663.8 500.5 662.8 499.7 661.6 499 L 533.4 428.1 L 469 66.7 C 465.4 46.3 454 28.5 436.9 16.6 C 419.9 4.8 399.2 0.2 378.8 3.9 L 95.6 55.1 C 53.6 62.6 25.5 103 33 145.1 L 70.7 356.6 L 52.5 355.2 C 27.4 353.5 5.6 372.5 3.9 397.6 L 1.9 427.3 C 0.2 452.3 19.1 474.1 44.1 475.8 L 92.6 479.5 L 93.3 483 C 86.2 484.7 79.7 488.1 74.1 492.9 C 64.9 500.9 59.4 512 58.6 524.2 L 56.6 553.9 C 55.2 573 66 590.2 82.2 598 C 78.4 604.2 76.1 611.3 75.6 618.8 L 73.5 648.6 C 72.2 667.8 83.1 685.1 99.5 692.9 C 95.6 699.2 93.2 706.4 92.6 714.1 L 90.6 743.8 C 88.9 768.8 107.9 790.6 133.1 792.4 L 148.6 793.2 L 150.5 804.3 C 154.2 824.7 165.6 842.5 182.6 854.4 C 195.8 863.5 211.1 868.3 226.8 868.3 C 231.4 868.3 236.1 867.9 240.7 867 L 444.3 830.3 C 444.8 830.4 445.2 830.5 445.7 830.5 L 566.2 845.4 L 614.2 878.2 C 641.4 896.7 673.5 906.5 706.1 906.5 C 712.4 906.5 718.8 906.2 725.1 905.4 C 764.1 900.8 800.2 882.3 826.6 853.2 C 847.1 830.7 857 800.4 853.8 770.2 Z M 46.1 448.2 C 36.3 447.5 28.9 439 29.6 429.2 L 31.6 399.5 C 32.3 389.7 40.8 382.3 50.5 382.9 L 75.8 384.9 L 87.6 451.3 Z M 84.2 555.8 L 86.3 526.1 C 86.6 521.3 88.8 517 92.3 513.9 C 95.9 510.7 100.5 509.2 105.2 509.5 L 165.5 513.7 C 175.3 514.3 182.7 522.9 182 532.6 L 180 562.4 C 179.3 572.1 170.8 579.6 161 578.9 L 100.8 574.7 C 91 574.1 83.6 565.6 84.2 555.8 Z M 101.2 650.5 L 103.3 620.8 C 103.6 616 105.7 611.7 109.3 608.6 C 112.9 605.4 117.5 603.9 122.2 604.2 L 168.4 607.4 C 173.1 607.7 177.5 609.9 180.6 613.5 C 183.7 617.1 185.2 621.6 184.9 626.4 L 182.9 656.1 C 182.2 665.9 173.7 673.3 163.9 672.6 L 117.7 669.4 C 108 668.8 100.6 660.2 101.2 650.5 Z M 118.3 745.7 L 120.3 716 C 120.7 711.2 122.8 706.9 126.4 703.8 C 129.7 700.9 133.7 699.4 138.1 699.4 C 138.6 699.4 139 699.4 139.4 699.4 L 161.4 700.7 C 171.2 701.4 178.6 709.9 177.9 719.7 L 175.9 749.4 C 175.2 759.2 166.7 766.6 157 765.9 C 156.9 765.9 156.8 765.9 156.8 765.9 L 134.8 764.6 C 125 764 117.6 755.5 118.3 745.7 Z M 235.8 839.7 C 222.7 842.1 209.4 839.2 198.5 831.6 C 187.5 823.9 180.2 812.5 177.9 799.4 L 176.2 790 C 191.3 783.4 202.4 768.9 203.6 751.3 L 205.6 721.6 C 206.5 709.3 202.4 697.9 195 689.2 C 203.8 681.5 209.7 670.5 210.6 658 L 212.6 628.3 C 213.4 616.1 209.5 604.4 201.5 595.2 C 200.1 593.6 198.5 592 196.9 590.6 C 203 583.5 207 574.4 207.7 564.3 L 209.7 534.5 C 211.4 509.5 192.4 487.7 167.4 486 L 121.4 482.8 L 60.3 140.2 C 55.5 113.2 73.6 87.3 100.6 82.4 L 101.1 82.3 L 111.7 98.6 C 121.3 113.5 138.9 121.1 156.4 118 L 343.3 84.4 C 360.8 81.3 374.6 68 378.5 50.7 L 382.8 31.4 L 383.8 31.3 C 396.9 28.9 410.1 31.8 421.1 39.4 C 432 47 439.3 58.5 441.7 71.6 L 503.3 417.4 C 495.8 416.3 488.1 416.4 480.6 417.6 L 369.5 435.4 C 359.5 437 351 443.1 346.2 452 C 341.3 461 341 471.4 345.1 480.7 L 352 495.9 C 364.2 523.1 393.3 539.4 422.8 535.5 L 458.3 530.8 C 460.7 530.5 463.2 531.3 464.9 533.1 L 537.3 607.8 L 559.2 730.8 C 564 757.8 546 783.7 519 788.6 Z M 806.1 834.5 C 784.2 858.6 754.2 874 721.9 877.8 C 689.5 881.6 656.8 873.6 629.9 855.2 L 579.1 820.5 C 577.2 819.3 575.1 818.5 572.9 818.2 L 533.9 813.4 C 570.3 801.7 593.4 764.5 586.5 725.9 L 570.3 635.1 C 573.6 634.9 576.8 633.7 579.3 631.2 C 584.8 625.9 584.9 617.1 579.6 611.6 L 560.2 591.6 C 560.2 591.6 560.2 591.6 560.2 591.6 L 484.8 513.8 C 477 505.7 465.7 501.8 454.6 503.3 L 419.2 507.9 C 401.7 510.3 384.5 500.6 377.3 484.6 L 370.4 469.3 C 369.6 467.5 370.2 466 370.6 465.2 C 371 464.5 372 463.2 373.9 462.8 L 485 445 C 493.7 443.6 502.6 444.6 510.8 447.8 C 513.2 450.6 516.6 452.3 520.2 452.5 L 645.6 521.9 C 646.2 522.4 646.7 522.8 647.3 523.2 C 680.3 544.2 695.5 581.9 693.8 638.5 C 693.6 643.1 695.8 647.5 699.6 650.2 L 793.6 717.4 C 811.9 730.4 823.8 750.8 826.2 773.1 C 828.5 795.5 821.2 817.9 806.1 834.5 Z M 806.1 834.5"/></svg>';
var commsStudents = [];       // every roster student {name, number}: Students lists them even before they write
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

  fetch(url + "?action=getCommsInbox")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        // The live Inbox sheet carries a stray uppercase header row at row 2
        // (TIMESTAMP / SOURCE / …) that the backend hands back as a message.
        // Anything without a real date is not a message — drop it.
        commsMessages = (data.messages || []).filter(function (m) {
          return m.timestamp && !isNaN(new Date(m.timestamp).getTime());
        });
        commsStudents = data.students || [];
        renderCommsInbox();
        // An open conversation picks up new texts on the 30-second poll too.
        var win = document.getElementById("commsDetailOverlay");
        if (commsDetail && win && win.classList.contains("open")) renderCommsThread();
      }
    })
    .catch(function() {});
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
      : (msg.source === "out" ? "You: " : "") + (msg.body || "—");
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

// Students column (2026-11-01): every roster student. Waiting for my reply
// first (red dot, newest first), then the rest A–Z with their last message or
// "No messages yet". Clicking one opens the conversation.
function renderCommsStudents() {
  var list = document.getElementById("commsStuList");
  if (!list) return;
  var byKey = {};
  commsStudents.forEach(function (s) {
    byKey[commsKey(s.number)] = { name: s.name, number: s.number, msgs: [] };
  });
  commsMessages.forEach(function (m) {
    if (!m.student || m.scam) return;
    var k = commsKey(m.fromNumber);
    if (!byKey[k]) byKey[k] = { name: m.student, number: m.fromNumber, msgs: [] };
    byKey[k].msgs.push(m);
  });
  var all = Object.keys(byKey).map(function (k) {
    var p = byKey[k];
    p.msgs.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    p.latest = p.msgs[0] || null;
    p.waiting = p.msgs.some(function (m) { return m.source !== "out" && !m.responded; });
    return p;
  });
  var waiting = all.filter(function (p) { return p.waiting; })
    .sort(function (a, b) { return new Date(b.latest.timestamp) - new Date(a.latest.timestamp); });
  var rest = all.filter(function (p) { return !p.waiting; })
    .sort(function (a, b) { return a.name.localeCompare(b.name); });

  var lbl = document.getElementById("commsStuLabel");
  if (lbl) lbl.textContent = waiting.length ? waiting.length + " waiting" : "None waiting";   // no student total (user, 2026-11-01)

  list.innerHTML = "";
  var block = function (title, people) {
    if (!people.length) return;
    var b = document.createElement("div");
    b.className = "cm-day";
    b.innerHTML = '<label class="field-label">' + title + '</label>';
    people.forEach(function (p) {
      var m = p.latest, row = document.createElement("div");
      row.className = "cm-row cm-srow" + (p.waiting ? " cm-wait" : " cm-done") + (m ? "" : " cm-blank");
      row.onclick = function () {
        openCommsDetail(m || { row: 0, source: "sms", fromNumber: p.number, fromName: p.name, student: p.name, responded: true, blank: true });
      };
      var prev = !m ? "No messages yet"
        : m.source === "voicemail" ? "Voicemail" + (m.transcript && m.transcript !== "(transcribing…)" && m.transcript !== "(no transcript)" ? ": " + m.transcript : "")
        : (m.source === "out" ? "You: " : "") + (m.body || "—");
      var when = "";
      if (m) { var d = new Date(m.timestamp); when = commsDayLabel(d) === "Today" ? commsClock(d) : commsDayLabel(d).replace(/^\w+, /, ""); }
      row.innerHTML =
        '<span class="cm-dot"></span>' +
        '<span class="cm-name">' + commsEscape(p.name) + '</span>' +
        '<span class="cm-prev">' + commsEscape(prev) + '</span>' +
        '<span class="td-mini-t cm-when">' + when + '</span>';
      b.appendChild(row);
    });
    list.appendChild(b);
  };
  block("Waiting for you", waiting);
  block(waiting.length ? "Everyone else" : "All students", rest);
}

// Counts on the filter buttons + the nav badge. Driven by the loaded
// messages, so they stay right after an Answered toggle or a delete.
function updateCommsBadge() {
  var real = commsMessages.filter(function (m) { return !m.scam && m.source !== "out"; });
  var open = real.filter(function (m) { return !m.responded; }).length;
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
    var box = document.querySelector("#commsBody .cm-box"), btn = document.getElementById("commsDeleteBtn");
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
  document.querySelectorAll("#commsBody .cm-f").forEach(function(btn) {
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

function renderCommsThread() {
  var el = document.getElementById("cmThread");
  if (!el || !commsDetail) return;
  var key = commsKey(commsDetail.fromNumber);
  var thread = commsMessages.filter(function (m) { return key && commsKey(m.fromNumber) === key; })
    .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
  if (!thread.length && commsDetail.blank) {
    el.innerHTML = '<div class="cm-none">No messages yet. Your first text goes from the RPM number.</div>';
    return;
  }
  if (!thread.length) thread = [commsDetail];
  el.innerHTML = thread.map(function (m) {
    var d = new Date(m.timestamp);
    var text = m.source === "voicemail"
      ? "📞 Voicemail" + (m.transcript && m.transcript !== "(transcribing…)" && m.transcript !== "(no transcript)" ? ": " + m.transcript : ", no transcript")
      : (m.body || "—");
    return '<div class="cm-msg ' + (m.source === "out" ? "out" : "in") + '">' +
      '<div class="cm-msg-t">' + commsEscape(text) + '</div>' +
      '<div class="cm-msg-d">' + commsDayLabel(d) + ", " + commsClock(d) + '</div></div>';
  }).join("");
  el.scrollTop = el.scrollHeight;
}

// Bits added from here rather than index.html (a parallel session's commit
// sweeps index.html): the Students filter and the window's thread + reply box.
function commsEnsureExtras() {
  // Title reads "Comms · Twilio", without "line" (user, 2026-11-01).
  var sub = document.querySelector("#commsBody .td-wk-title .win-sub");
  if (sub) sub.textContent = " \u00b7 Twilio";
  // Unanswered sits last in the filter row (user, 2026-10-31).
  var unans = document.querySelector('#commsBody .cm-f[data-filter="unresponded"]');
  if (unans && unans.nextElementSibling) unans.parentNode.appendChild(unans);
  if (!document.getElementById("cmLineNo")) {
    var filters = document.querySelector("#commsBody .cm-filters");
    if (filters) filters.insertAdjacentHTML("beforebegin",
      '<div class="cm-line-no" id="cmLineNo">(201) 904-4937</div><div class="cm-page-icon">' + COMMS_TEXT_ICON + '</div>');
  }
  // Two columns (user, 2026-11-01): Students on the left (the real page),
  // Others on the right (unknown numbers, applicants, voicemails, scams) with
  // the filters, count and list moved into it.
  if (!document.getElementById("commsStuList")) {
    var box = document.querySelector("#commsBody .cm-box"), inbox = document.getElementById("commsInbox");
    if (box && inbox) {
      var cols = document.createElement("div");
      cols.className = "cm-cols";
      cols.innerHTML =
        '<div class="cm-col cm-col-stu"><div class="cm-col-t">Students</div>' +
          '<div class="db-cx-head im-sec-head td-count cm-count-row"><label class="field-label db-cx-t" id="commsStuLabel">&nbsp;</label></div>' +
          '<hr class="divider td-rule td-rule-top"><div id="commsStuList"></div></div>' +
        '<div class="cm-col cm-col-oth"><div class="cm-col-t">Others</div></div>';
      var oth = cols.lastChild;
      [box.querySelector(".cm-filters"), document.getElementById("commsEditBar"),
       box.querySelector("hr.td-rule-top"), inbox].forEach(function (n) { if (n) oth.appendChild(n); });
      box.appendChild(cols);
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

function commsSendReply() {
  if (!commsDetail) return;
  var box = document.getElementById("cmReply"), body = box.value.trim();
  if (!body) { box.focus(); return; }
  var win = document.querySelector("#commsDetailOverlay .cm-win"), btn = document.getElementById("cmSendBtn");
  var to = commsDetail.fromNumber, key = commsKey(to);
  rpmBusy(win, btn, true, "Sending");
  fetch(getScriptUrl() + "?action=sendCommsReply&to=" + encodeURIComponent(to) + "&body=" + encodeURIComponent(body))
    .then(function (r) { return r.json(); })
    .then(function (res) {
      rpmBusy(win, btn, false);
      if (!res.success) { rpmAlert({ title: "Not sent", message: res.message || "Something went wrong." }); return; }
      commsMessages.push({ row: 0, timestamp: new Date().toISOString(), source: "out", fromNumber: to,
        fromName: commsDetail.fromName || "", student: commsDetail.student || "", body: body, responded: true });
      commsMessages.forEach(function (m) { if (commsKey(m.fromNumber) === key) m.responded = true; });
      box.value = "";
      renderCommsThread();
      commsPaintResponded();
      renderCommsInbox();
    })
    .catch(function () {
      rpmBusy(win, btn, false);
      rpmAlert({ title: "Not sent", message: "Couldn't reach the server." });
    });
}

function commsPaintResponded() {
  var b = document.getElementById("commsRespondedBtn");
  if (b && commsDetail) b.textContent = commsDetail.responded ? "Answered ✓" : "Mark answered";
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
  if (!commsDetail) return;
  commsDetail.responded = !commsDetail.responded;
  commsPaintResponded();

  var url = getScriptUrl();
  if (url) {
    fetch(url + "?action=markCommsResponded&row=" + commsDetail.row + "&responded=" + commsDetail.responded)
      .then(function(r) { return r.json(); })
      .catch(function() {});
  }
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
