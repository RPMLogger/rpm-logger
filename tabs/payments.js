// ─── TABS / PAYMENTS.JS ──────────────────────────────────────────────────────
// Payments tab: student grid, amount + notes panel, cash log to student sheet
// + RPM Payments sheet.

var payMicRecognition = null;
var isPayMicRecording = false;

function renderPaymentStudents(students) {
  var grid = document.getElementById("paymentGrid");
  grid.innerHTML = "";
  students.forEach(function(s, i) {
    var name = typeof s === "string" ? s : s.name;
    var btn  = document.createElement("button");
    btn.className = "pay-btn"; btn.id = "pbtn-" + i;
    btn.onclick = function() { selectPay(name, i); };
    btn.textContent = name;
    grid.appendChild(btn);
  });
}

function selectPay(name, idx) {
  if (isPayMicRecording) stopPayMic();
  activePayStudent = { name: name, idx: idx };

  // Highlight selected button
  document.querySelectorAll(".pay-btn").forEach(function(b) { b.classList.remove("active"); });
  var pb = document.getElementById("pbtn-" + idx);
  if (pb) pb.classList.add("active");

  // Open panel
  document.getElementById("payLogPanel").classList.add("active");
  document.getElementById("payLogName").textContent = name;
  document.getElementById("payLogStatus").textContent = "cash";
  document.getElementById("payAmount").value = "$380";
  document.getElementById("payTranscriptBox").value = "";
  document.getElementById("btnPayLog").className = "btn-log";
  document.getElementById("btnPayLog").textContent = "Log Payment →";
  document.getElementById("payMicBtn").className = "pay-mic-btn";
  document.getElementById("payMicBtn").textContent = "⏺ Record Note";
}

function closePayLogPanel() {
  if (isPayMicRecording) stopPayMic();
  document.getElementById("payLogPanel").classList.remove("active");
  document.querySelectorAll(".pay-btn").forEach(function(b) { b.classList.remove("active"); });
  activePayStudent = null;
}

// ─── MIC TOGGLE ──────────────────────────────────────────────────────────────
function togglePayMic() {
  if (isPayMicRecording) {
    stopPayMic();
  } else {
    startPayMic();
  }
}

function startPayMic() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
  payMicRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  payMicRecognition.lang = "en-US"; payMicRecognition.continuous = true; payMicRecognition.interimResults = true;
  payMicRecognition._finalText = "";
  payMicRecognition.onstart = function() {
    isPayMicRecording = true;
    playBeep(880, 100);
    document.getElementById("payMicBtn").className = "pay-mic-btn recording";
    document.getElementById("payMicBtn").textContent = "⏹ Stop Recording";
  };
  payMicRecognition.onresult = function(event) {
    var interim = "";
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) payMicRecognition._finalText += event.results[i][0].transcript;
      else interim += event.results[i][0].transcript;
    }
    document.getElementById("payTranscriptBox").value = (payMicRecognition._finalText + interim).trim();
  };
  payMicRecognition.onend = function() {
    if (isPayMicRecording) stopPayMic();
  };
  payMicRecognition.onerror = function(e) { if (e.error === "no-speech") return; isPayMicRecording = false; };
  payMicRecognition.start();
}

function stopPayMic() {
  isPayMicRecording = false;
  if (payMicRecognition) payMicRecognition.stop();
  playBeep(440, 80, 0.15);
  document.getElementById("payMicBtn").className = "pay-mic-btn";
  document.getElementById("payMicBtn").textContent = "⏺ Record Note";
}

// ─── SUBMIT PAYMENT ───────────────────────────────────────────────────────────
function submitPayLog() {
  var url = getScriptUrl(); if (!url) return;
  if (!activePayStudent) return;
  if (isPayMicRecording) stopPayMic();

  var name   = activePayStudent.name;
  var amount = document.getElementById("payAmount").value.trim() || "$380";
  var note   = document.getElementById("payTranscriptBox").value.trim();
  // Note written to student sheet: "Cash [amount] [note]"
  var fullNote = "Cash " + amount + (note ? " — " + note : "");

  var btn = document.getElementById("btnPayLog");
  btn.textContent = "Logging..."; btn.disabled = true;

  callScript(url, "logPaymentNote", { studentName: name, note: fullNote }, function(data) {
    if (data.success) {
      // Also log to RPM Payments sheet
      callScript(url, "logPayment", {
        studentName: name,
        method: "Cash",
        amount: amount,
        notes: note
      }, function() {});

      btn.textContent = "✓ Logged!"; btn.className = "btn-log success";
      var pb = document.getElementById("pbtn-" + activePayStudent.idx);
      if (pb) pb.classList.add("logged");

      // Show in feed
      document.getElementById("payDivider").style.display = "block";
      document.getElementById("payHistoryLabel").style.display = "block";
      addLog("paymentFeed", "✓ " + name + " · Cash · " + amount + (note ? " · " + note : ""), "success");

      setTimeout(function() {
        closePayLogPanel();
      }, 1200);
    } else {
      btn.textContent = "Log Payment →"; btn.disabled = false;
      addLog("paymentFeed", "❌ " + (data.message || "Error"), "error");
      document.getElementById("payDivider").style.display = "block";
      document.getElementById("payHistoryLabel").style.display = "block";
    }
  });
}
