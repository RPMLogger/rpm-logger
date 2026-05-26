// ─── TABS / PAYMENTS.JS ──────────────────────────────────────────────────────
// Payments tab: student grid (cash), incoming Venmo/Zelle auto-detection.

var payMicRecognition = null;
var isPayMicRecording = false;
var allStudentData = []; // { tab, name } for each student

function renderPaymentStudents(students) {
  allStudentData = students; // store for matching
  var grid = document.getElementById("paymentGrid");
  grid.innerHTML = "";
  students.forEach(function(s, i) {
    var name = typeof s === "string" ? s : (s.name || s.tab);
    var btn  = document.createElement("button");
    btn.className = "pay-btn"; btn.id = "pbtn-" + i;
    btn.onclick = function() { selectPay(name, s.tab || name, i); };
    btn.textContent = name;
    grid.appendChild(btn);
  });
  if (typeof populateStudentPicker === "function") populateStudentPicker(students);
}

function selectPay(name, tab, idx) {
  if (isPayMicRecording) stopPayMic();
  activePayStudent = { name: name, tab: tab, idx: idx };
  document.querySelectorAll(".pay-btn").forEach(function(b) { b.classList.remove("active"); });
  var pb = document.getElementById("pbtn-" + idx);
  if (pb) pb.classList.add("active");
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

// ─── MIC ─────────────────────────────────────────────────────────────────────
function togglePayMic() {
  if (isPayMicRecording) stopPayMic(); else startPayMic();
}

function startPayMic() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
  payMicRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  payMicRecognition.lang = "en-US"; payMicRecognition.continuous = true; payMicRecognition.interimResults = true;
  payMicRecognition._finalText = "";
  payMicRecognition.onstart = function() {
    isPayMicRecording = true; playBeep(880, 100);
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
  payMicRecognition.onend = function() { if (isPayMicRecording) stopPayMic(); };
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

// ─── SUBMIT CASH PAYMENT ─────────────────────────────────────────────────────
function submitPayLog() {
  var url = getScriptUrl(); if (!url) return;
  if (!activePayStudent) return;
  if (isPayMicRecording) stopPayMic();
  var name   = activePayStudent.name;
  var amount = document.getElementById("payAmount").value.trim() || "$380";
  var note   = document.getElementById("payTranscriptBox").value.trim();
  var fullNote = "Cash " + amount + (note ? " — " + note : "");
  var btn = document.getElementById("btnPayLog");
  btn.textContent = "Logging..."; btn.disabled = true;
  callScript(url, "logPaymentNote", { studentName: name, note: fullNote }, function(data) {
    if (data.success) {
      callScript(url, "logPayment", { studentName: name, method: "Cash", amount: amount, notes: note }, function() {});
      btn.textContent = "✓ Logged!"; btn.className = "btn-log success";
      var pb = document.getElementById("pbtn-" + activePayStudent.idx);
      if (pb) pb.classList.add("logged");
      document.getElementById("payDivider").style.display = "block";
      document.getElementById("payHistoryLabel").style.display = "block";
      addLog("paymentFeed", "✓ " + name + " · Cash · " + amount + (note ? " · " + note : ""), "success");
      setTimeout(function() { closePayLogPanel(); }, 1200);
    } else {
      btn.textContent = "Log Payment →"; btn.disabled = false;
      addLog("paymentFeed", "❌ " + (data.message || "Error"), "error");
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
        container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No pending Venmo or Zelle payments</div>";
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
            (p.matched ? "" : "<div class='incoming-nomatch'>⚠ Name not matched in student sheets</div>") +
          "</div>" +
          "<div style='display:flex;flex-direction:column;gap:6px;flex-shrink:0'>" +
            "<button class='incoming-confirm'>Confirm →</button>" +
            "<button class='incoming-dismiss' onclick='dismissIncoming(this)'>✕ Dismiss</button>" +
          "</div>";
        card.querySelector(".incoming-confirm").addEventListener("click", function() {
          confirmIncoming(p);
        });
        container.appendChild(card);
      });
    }).catch(function() {
      container.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load</div>";
    });
}

function confirmIncoming(payment) {
  var url = getScriptUrl(); if (!url) return;
  // Log to RPM Payments sheet (always, using payment date not today)
  callScript(url, "logPayment", {
    studentName: payment.name,
    method:      payment.method,
    amount:      payment.amount,
    notes:       payment.date
  }, function() {});

  // If matched to a student sheet, log payment there too
  if (payment.matchedTab) {
    callScript(url, "logPaymentNote", {
      studentName: payment.matchedTab,
      note: payment.method + " " + payment.amount + " — " + payment.date
    }, function() {});
  }

  document.getElementById("payDivider").style.display = "block";
  document.getElementById("payHistoryLabel").style.display = "block";
  var label = payment.matchedTab
    ? "✓ " + payment.name + " · " + payment.method + " · " + payment.amount
    : "✓ " + payment.name + " · " + payment.method + " · " + payment.amount + " (RPM Payments only — no sheet match)";
  addLog("paymentFeed", label, "success");

  // Remove card
  var cards = document.querySelectorAll(".incoming-card");
  cards.forEach(function(c) {
    if (c.querySelector(".incoming-name") && c.querySelector(".incoming-name").textContent === payment.name) {
      c.remove();
    }
  });
  var container = document.getElementById("incomingPayments");
  if (!container.querySelector(".incoming-card")) {
    container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No pending Venmo or Zelle payments</div>";
  }
}

function dismissIncoming(btn) {
  var card = btn.closest(".incoming-card");
  if (card) card.remove();
  var container = document.getElementById("incomingPayments");
  if (!container.querySelector(".incoming-card")) {
    container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No pending Venmo or Zelle payments</div>";
  }
}
