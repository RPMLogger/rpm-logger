// ─── TABS / PAYMENTS.JS ──────────────────────────────────────────────────────
// Payments tab: student grid, mic recording, payment log submission.

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
  if (isPayRecording) stopPayRecording();
  activePayStudent = { name: name, idx: idx };
  document.getElementById("payLogPanel").classList.add("active");
  document.getElementById("payLogName").textContent = name;
  document.getElementById("payTranscriptBox").value = "";
  document.getElementById("btnPayLog").disabled = true;
  document.getElementById("btnPayLog").className = "btn-log";
  document.getElementById("btnPayLog").textContent = "Log Payment →";
  document.querySelectorAll(".pay-btn").forEach(function(b) { b.classList.remove("recording"); });
  document.getElementById("pbtn-" + idx).classList.add("recording");
  document.getElementById("payLogStatus").textContent = "🔴 recording...";
  startPayRecording(idx);
}

function startPayRecording(idx) {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
  payRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  payRecognition.lang = "en-US"; payRecognition.continuous = true; payRecognition.interimResults = true;
  payRecognition.onstart = function() { isPayRecording = true; playBeep(880, 100); };
  payRecognition.onresult = function(event) {
    var interim = "";
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        if (!payRecognition._finalText) payRecognition._finalText = "";
        payRecognition._finalText += event.results[i][0].transcript;
      } else { interim += event.results[i][0].transcript; }
    }
    document.getElementById("payTranscriptBox").value =
      ((payRecognition._finalText || "") + interim).trim();
    if (payRecognition._finalText && payRecognition._finalText.trim())
      document.getElementById("btnPayLog").disabled = false;
  };
  payRecognition.onend = function() {
    if (isPayRecording) {
      isPayRecording = false;
      playBeep(440, 80, 0.15);
      document.getElementById("payLogStatus").textContent = "review & edit";
      var pb = document.getElementById("pbtn-" + idx);
      if (pb) pb.classList.remove("recording");
      if (document.getElementById("payTranscriptBox").value.trim())
        document.getElementById("btnPayLog").disabled = false;
    }
  };
  payRecognition.onerror = function(e) { if (e.error === "no-speech") return; isPayRecording = false; };
  payRecognition._finalText = "";
  payRecognition.start();
}

function stopPayRecording() {
  isPayRecording = false;
  if (payRecognition) payRecognition.stop();
  playBeep(440, 80, 0.15);
}

function submitPayLog() {
  var url = getScriptUrl(); if (!url) return;
  var note = document.getElementById("payTranscriptBox").value.trim();
  if (!note) { addLog("paymentFeed", "Nothing to log!", "error"); return; }
  stopPayRecording();
  var name = activePayStudent.name;
  var btn  = document.getElementById("btnPayLog");
  btn.textContent = "Logging..."; btn.disabled = true;
  callScript(url, "logPaymentNote", { studentName: name, note: note }, function(data) {
    if (data.success) {
      btn.textContent = "✓ Logged!"; btn.className = "btn-log success";
      var pb = document.getElementById("pbtn-" + activePayStudent.idx);
      if (pb) pb.classList.add("logged");
      addLog("paymentFeed", "✓ " + name + " — " + note, "success");
      setTimeout(function() {
        document.getElementById("payLogPanel").classList.remove("active");
        activePayStudent = null;
      }, 1200);
    } else {
      btn.textContent = "Log Payment →"; btn.disabled = false;
      addLog("paymentFeed", "❌ " + (data.message || "Error"), "error");
    }
  });
}
