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
  // Also populate the student picker overlay
  if (typeof populateStudentPicker === "function") populateStudentPicker(students);
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

// ─── INCOMING PAYMENTS (Venmo / Zelle) ───────────────────────────────────────
function loadIncomingPayments() {
  var url = getScriptUrl(); if (!url) return;
  var container = document.getElementById("incomingPayments");
  container.innerHTML = "<div style='color:var(--muted);font-size:11px'>Loading...</div>";

  fetch(url + "?action=getIncomingPayments")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      container.innerHTML = "";
      if (!data.success || !data.payments || !data.payments.length) {
        container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No recent Venmo or Zelle payments</div>";
        return;
      }
      data.payments.forEach(function(p) {
        var card = document.createElement("div");
        card.className = "incoming-card";
        card.innerHTML =
          "<div class='incoming-left'>" +
            "<div class='incoming-name'>" + p.name + "</div>" +
            "<div class='incoming-meta'>" +
              "<span class='incoming-method " + p.method.toLowerCase() + "'>" + p.method + "</span>" +
              "<span class='incoming-amount'>" + p.amount + "</span>" +
              "<span class='incoming-date'>" + p.date + "</span>" +
            "</div>" +
          "</div>" +
          "<button class='incoming-confirm' onclick='confirmIncoming(" + JSON.stringify(p) + ")'>Confirm →</button>";
        container.appendChild(card);
      });
    }).catch(function() {
      container.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load</div>";
    });
}

function confirmIncoming(payment) {
  // Open student picker overlay
  var overlay = document.getElementById("studentPickerOverlay");
  document.getElementById("pickerPayment").textContent = payment.name + " · " + payment.amount + " · " + payment.method;
  overlay.classList.add("open");
  overlay._payment = payment;
}

function closeStudentPicker() {
  document.getElementById("studentPickerOverlay").classList.remove("open");
}

function pickStudentForPayment(studentName) {
  var overlay = document.getElementById("studentPickerOverlay");
  var payment = overlay._payment;
  overlay.classList.remove("open");

  var url = getScriptUrl(); if (!url) return;

  // Log to student sheet
  callScript(url, "logPaymentNote", {
    studentName: studentName,
    note: payment.method + " " + payment.amount + " — " + payment.date
  }, function() {});

  // Log to RPM Payments sheet
  callScript(url, "logPayment", {
    studentName: studentName,
    method: payment.method,
    amount: payment.amount,
    notes: payment.date
  }, function(data) {
    document.getElementById("payDivider").style.display = "block";
    document.getElementById("payHistoryLabel").style.display = "block";
    addLog("paymentFeed", "✓ " + studentName + " · " + payment.method + " · " + payment.amount, "success");
  });
}
