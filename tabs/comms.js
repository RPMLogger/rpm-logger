// ─── TABS / COMMS.JS ─────────────────────────────────────────────────────────
// Comms inbox: Twilio inbound texts + voicemails, integrated into Inquiries tab.

var commsMessages = [];
var commsFilter = "all";
var commsDetail = null;
var commsPollTimer = null;
var COMMS_POLL_INTERVAL = 30000;

function loadCommsInbox() {
  var url = getScriptUrl();
  if (!url) return;

  fetch(url + "?action=getCommsInbox")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        commsMessages = data.messages || [];
        renderCommsInbox();
        document.getElementById("commsFilter").style.display = "";
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
  var filtered = commsMessages.filter(function(m) {
    if (commsFilter === "sms") return m.source === "sms";
    if (commsFilter === "voicemail") return m.source === "voicemail";
    if (commsFilter === "unresponded") return !m.responded;
    return true;
  });

  if (!filtered.length) {
    var label = commsFilter === "all" ? "No messages yet" :
                commsFilter === "unresponded" ? "All caught up" :
                "No " + commsFilter + " messages";
    inbox.innerHTML = '<div class="empty-state">' + label + '</div>';
    return;
  }

  inbox.innerHTML = "";
  filtered.forEach(function(msg) {
    var card = document.createElement("div");
    card.className = "comms-card" + (msg.responded ? " responded" : " unresponded");
    card.onclick = function() { openCommsDetail(msg); };

    var icon = msg.source === "voicemail" ? "📞" : "💬";
    var display = msg.fromName || commsFormatPhone(msg.fromNumber) || "Unknown";
    var preview = msg.source === "voicemail"
      ? (msg.transcript && msg.transcript !== "(transcribing…)" ? msg.transcript : "Voicemail — tap to listen")
      : (msg.body || "—");
    var time = commsFormatTime(msg.timestamp);

    card.innerHTML =
      '<div class="comms-responded-dot"></div>' +
      '<div class="comms-card-top">' +
        '<span class="comms-source">' + icon + '</span>' +
        '<span class="comms-from">' + commsEscape(display) + '</span>' +
        '<span class="comms-time">' + time + '</span>' +
      '</div>' +
      '<div class="comms-preview">' + commsEscape(commsTruncate(preview, 80)) + '</div>';

    inbox.appendChild(card);
  });
}

function setCommsFilter(filter) {
  commsFilter = filter;
  document.querySelectorAll(".comms-filter-btn").forEach(function(btn) {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderCommsInbox();
}

function openCommsDetail(msg) {
  commsDetail = msg;
  var icon = msg.source === "voicemail" ? "📞 Voicemail" : "💬 Text";
  var display = msg.fromName || commsFormatPhone(msg.fromNumber) || "Unknown";

  document.getElementById("commsDetailSource").textContent = icon;
  document.getElementById("commsDetailFrom").textContent = display;
  document.getElementById("commsDetailTime").textContent = commsFormatTimeFull(msg.timestamp);

  var bodyEl = document.getElementById("commsDetailBody");
  var audioSection = document.getElementById("commsDetailAudio");
  var transcriptSection = document.getElementById("commsDetailTranscript");

  if (msg.source === "voicemail") {
    bodyEl.style.display = "none";
    if (msg.audioUrl) {
      audioSection.style.display = "block";
      document.getElementById("commsAudioPlayer").src = msg.audioUrl;
    } else {
      audioSection.style.display = "none";
    }
    transcriptSection.style.display = "block";
    document.getElementById("commsTranscriptText").textContent =
      (msg.transcript && msg.transcript !== "(transcribing…)") ? msg.transcript : (msg.transcript || "Transcript not available");
  } else {
    bodyEl.style.display = "block";
    bodyEl.textContent = msg.body || "—";
    audioSection.style.display = "none";
    transcriptSection.style.display = "none";
  }

  document.getElementById("commsRespondedCheck").checked = msg.responded;
  document.getElementById("commsDetailOverlay").classList.add("open");
}

function closeCommsDetail() {
  document.getElementById("commsDetailOverlay").classList.remove("open");
  var player = document.getElementById("commsAudioPlayer");
  player.pause();
  player.src = "";
  commsDetail = null;
}

function toggleCommsResponded() {
  if (!commsDetail) return;
  var checked = document.getElementById("commsRespondedCheck").checked;
  commsDetail.responded = checked;

  var url = getScriptUrl();
  if (url) {
    fetch(url + "?action=markCommsResponded&row=" + commsDetail.row + "&responded=" + checked)
      .then(function(r) { return r.json(); })
      .catch(function() {});
  }
  renderCommsInbox();
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

function commsFormatTime(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  var now = new Date();
  var diff = now - d;
  if (diff < 60000) return "now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[d.getMonth()] + " " + d.getDate();
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

function commsTruncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "…" : str;
}

function commsEscape(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
