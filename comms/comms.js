// ─── RPM COMMS — INBOX ────────────────────────────────────────────────────
var messages = [];
var currentFilter = "all";
var currentDetail = null;
var pollTimer = null;
var POLL_INTERVAL = 30000;

// ─── INIT ───────────────────────────────────────────────────────────────────

(function init() {
  var saved = localStorage.getItem("commsScriptUrl") || localStorage.getItem("scriptUrl");
  if (saved) {
    document.getElementById("scriptUrl").value = saved;
    loadInbox();
    startPolling();
  } else {
    openSettings();
  }

  document.querySelectorAll(".filter-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".filter-btn").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderInbox();
    });
  });

  addPollDot();
})();

// ─── DATA ───────────────────────────────────────────────────────────────────

function getUrl() {
  return (localStorage.getItem("commsScriptUrl") || localStorage.getItem("scriptUrl") || "").trim();
}

function loadInbox() {
  var url = getUrl();
  if (!url) { openSettings(); return; }

  flashPoll();
  fetch(url + "?action=getCommsInbox")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        messages = data.messages || [];
        renderInbox();
      } else {
        showEmpty(data.message || "Could not load inbox");
      }
    })
    .catch(function() {
      showEmpty("Connection error — check your Apps Script URL");
    });
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(loadInbox, POLL_INTERVAL);
}

// ─── RENDER ─────────────────────────────────────────────────────────────────

function renderInbox() {
  var inbox = document.getElementById("inbox");
  var filtered = messages.filter(function(m) {
    if (currentFilter === "sms") return m.source === "sms";
    if (currentFilter === "voicemail") return m.source === "voicemail";
    if (currentFilter === "unresponded") return !m.responded;
    return true;
  });

  if (!filtered.length) {
    var label = currentFilter === "all" ? "No messages yet" :
                currentFilter === "unresponded" ? "All caught up" :
                "No " + currentFilter + " messages";
    showEmpty(label);
    return;
  }

  inbox.innerHTML = "";
  filtered.forEach(function(msg) {
    var card = document.createElement("div");
    card.className = "msg-card" + (msg.responded ? " responded" : " unresponded");
    card.onclick = function() { openDetail(msg); };

    var icon = msg.source === "voicemail" ? "📞" : "💬";
    var display = msg.fromName || formatPhone(msg.fromNumber) || "Unknown";
    var preview = msg.source === "voicemail"
      ? (msg.transcript && msg.transcript !== "(transcribing…)" ? msg.transcript : "Voicemail — tap to listen")
      : (msg.body || "—");
    var time = formatTime(msg.timestamp);

    card.innerHTML =
      '<div class="msg-responded-dot"></div>' +
      '<div class="msg-top">' +
        '<span class="msg-source">' + icon + '</span>' +
        '<span class="msg-from">' + escapeHtml(display) + '</span>' +
        '<span class="msg-time">' + time + '</span>' +
      '</div>' +
      '<div class="msg-preview">' + escapeHtml(truncate(preview, 80)) + '</div>';

    inbox.appendChild(card);
  });
}

function showEmpty(text) {
  document.getElementById("inbox").innerHTML = '<div class="empty-state">' + escapeHtml(text) + '</div>';
}

// ─── DETAIL VIEW ────────────────────────────────────────────────────────────

function openDetail(msg) {
  currentDetail = msg;
  var icon = msg.source === "voicemail" ? "📞 Voicemail" : "💬 Text";
  var display = msg.fromName || formatPhone(msg.fromNumber) || "Unknown";

  document.getElementById("detailSource").textContent = icon;
  document.getElementById("detailFrom").textContent = display;
  document.getElementById("detailTime").textContent = formatTimeFull(msg.timestamp);

  var bodyEl = document.getElementById("detailBody");
  var audioSection = document.getElementById("detailAudio");
  var transcriptSection = document.getElementById("detailTranscript");

  if (msg.source === "voicemail") {
    bodyEl.style.display = "none";

    if (msg.audioUrl) {
      audioSection.style.display = "block";
      document.getElementById("audioPlayer").src = msg.audioUrl;
    } else {
      audioSection.style.display = "none";
    }

    if (msg.transcript && msg.transcript !== "(transcribing…)") {
      transcriptSection.style.display = "block";
      document.getElementById("detailTranscriptText").textContent = msg.transcript;
    } else {
      transcriptSection.style.display = "block";
      document.getElementById("detailTranscriptText").textContent = msg.transcript || "Transcript not available";
    }
  } else {
    bodyEl.style.display = "block";
    bodyEl.textContent = msg.body || "—";
    audioSection.style.display = "none";
    transcriptSection.style.display = "none";
  }

  document.getElementById("respondedCheck").checked = msg.responded;
  document.getElementById("detailOverlay").classList.add("open");
}

function closeDetail() {
  document.getElementById("detailOverlay").classList.remove("open");
  var player = document.getElementById("audioPlayer");
  player.pause();
  player.src = "";
  currentDetail = null;
}

function toggleResponded() {
  if (!currentDetail) return;
  var checked = document.getElementById("respondedCheck").checked;
  currentDetail.responded = checked;

  var url = getUrl();
  if (!url) return;

  fetch(url + "?action=markCommsResponded&row=" + currentDetail.row + "&responded=" + checked)
    .then(function(r) { return r.json(); })
    .catch(function() {});

  renderInbox();
}

// ─── SETTINGS ───────────────────────────────────────────────────────────────

function openSettings() {
  document.getElementById("settingsOverlay").classList.add("open");
}
function closeSettings() {
  document.getElementById("settingsOverlay").classList.remove("open");
}
function saveSettings() {
  var url = document.getElementById("scriptUrl").value.trim();
  if (!url) return;
  localStorage.setItem("commsScriptUrl", url);
  closeSettings();
  loadInbox();
  startPolling();
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatPhone(num) {
  if (!num) return "";
  var clean = num.replace(/\D/g, "");
  if (clean.length === 11 && clean.charAt(0) === "1") clean = clean.substring(1);
  if (clean.length === 10) {
    return "(" + clean.substring(0, 3) + ") " + clean.substring(3, 6) + "-" + clean.substring(6);
  }
  return num;
}

function formatTime(ts) {
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

function formatTimeFull(ts) {
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

function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "…" : str;
}

function escapeHtml(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function addPollDot() {
  var dot = document.createElement("div");
  dot.className = "poll-dot";
  dot.id = "pollDot";
  document.body.appendChild(dot);
}

function flashPoll() {
  var dot = document.getElementById("pollDot");
  if (!dot) return;
  dot.classList.add("active");
  setTimeout(function() { dot.classList.remove("active"); }, 1500);
}
