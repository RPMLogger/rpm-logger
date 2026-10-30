// ─── TABS / COMMS.JS ─────────────────────────────────────────────────────────
// Comms tab: everything that arrives on the Twilio line and is NOT a known
// student — inbound texts + voicemails (known students route to Student Line
// at intake). Its own tab since 2026-09-22; it used to be a hidden view inside
// Inquiries, which left it invisible once the counts bar was removed there.

var commsMessages = [];
var commsFilter = "all";
var commsDetail = null;
var commsPollTimer = null;
var COMMS_POLL_INTERVAL = 30000;
var commsEditing = false;     // Edit mode: cards tick instead of opening
var commsSelected = {};       // sheet row → true

// ── Entry point (called from switchTab) ─────────────────────────────────────
function initCommsTab() {
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
        renderCommsInbox();
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
  if (label) label.textContent = filtered.length + (filtered.length === 1 ? " message" : " messages");

  if (!filtered.length) {
    inbox.innerHTML = '<div class="cm-none">None</div>';
    return;
  }

  // One block per day, newest first, like This Week's day list.
  inbox.innerHTML = "";
  var day = null, block = null;
  filtered.forEach(function(msg) {
    var d = new Date(msg.timestamp), key = d.toDateString();
    if (key !== day) {
      day = key;
      block = document.createElement("div");
      block.className = "cm-day";
      block.innerHTML = '<label class="field-label">' + commsDayLabel(d) + '</label>';
      inbox.appendChild(block);
    }
    var row = document.createElement("div");
    row.className = "cm-row" + (msg.responded ? " cm-done" : "") + (commsSelected[msg.row] ? " selected" : "");
    row.onclick = function() {
      if (!commsEditing) { openCommsDetail(msg); return; }
      if (commsSelected[msg.row]) delete commsSelected[msg.row]; else commsSelected[msg.row] = true;
      row.classList.toggle("selected", !!commsSelected[msg.row]);
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
      '<span class="cm-prev">' + commsEscape(preview) + '</span>';
    block.appendChild(row);
  });
}

// Counts on the filter buttons + the nav badge. Driven by the loaded
// messages, so they stay right after an Answered toggle or a delete.
function updateCommsBadge() {
  var real = commsMessages.filter(function (m) { return !m.scam; });
  var open = real.filter(function (m) { return !m.responded; }).length;
  var badge = document.getElementById("commsNavBadge");
  if (badge) {
    badge.textContent = open;
    badge.style.display = open > 0 ? "" : "none";
  }
  var sms = 0, vm = 0;
  real.forEach(function (m) {
    if (m.source === "voicemail") vm++; else sms++;
  });
  var set = function (id, n) { var el = document.getElementById(id); if (el) el.textContent = n; };
  set("commsOpenCount", open);
  set("commsSmsCount", sms);
  set("commsVoicemailCount", vm);
  set("commsScamCount", commsMessages.length - real.length);
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

function openCommsDetail(msg) {
  commsDetail = msg;
  document.getElementById("commsDetailFrom").textContent = msg.fromName || commsFormatPhone(msg.fromNumber) || "Unknown";
  document.getElementById("commsDetailSource").textContent = msg.source === "voicemail" ? " · Voicemail" : " · Text";
  document.getElementById("commsDetailTime").textContent = commsFormatTimeFull(msg.timestamp);

  var bodyEl = document.getElementById("commsDetailBody");
  var audioSection = document.getElementById("commsDetailAudio");
  var transcriptSection = document.getElementById("commsDetailTranscript");

  if (msg.source === "voicemail") {
    bodyEl.style.display = "none";
    if (msg.audioUrl) {
      audioSection.style.display = "block";
      loadCommsAudio(msg.audioUrl);
    } else {
      audioSection.style.display = "none";
    }
    transcriptSection.style.display = "block";
    document.getElementById("commsTranscriptText").textContent =
      (msg.transcript && msg.transcript !== "(transcribing…)") ? msg.transcript : "Not available";
  } else {
    bodyEl.style.display = "block";
    bodyEl.textContent = msg.body || "—";
    audioSection.style.display = "none";
    transcriptSection.style.display = "none";
  }

  commsPaintResponded();
  document.getElementById("commsDetailOverlay").classList.add("open");
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
