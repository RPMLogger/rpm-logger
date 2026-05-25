// ─── TABS / LESSONS.JS ───────────────────────────────────────────────────────
// Lessons tab: Today grid, Week pills, log panel, mic recording.

function closeLogPanel() {
  if (isRecording) stopRecording();
  document.getElementById("logPanel").classList.remove("active");
  document.querySelectorAll(".today-btn").forEach(function(b) { b.classList.remove("recording"); });
  document.querySelectorAll(".week-pill").forEach(function(b) { b.classList.remove("recording"); });
  activeStudent = null;
}

// ─── RENDER: WEEK BAR ────────────────────────────────────────────────────────
function renderWeekBar() {
  var total  = weekStudents.length;
  var trials = weekStudents.filter(function(s) { return s.calType === "trial"; }).length;
  document.getElementById("weekCounts").innerHTML =
    total + " students" + (trials > 0
      ? " · <span>" + trials + " trial" + (trials > 1 ? "s" : "") + "</span>"
      : "");
  document.getElementById("weekDateRange").textContent = getWeekRange();
  document.getElementById("weekBar").style.display = "flex";
}

// ─── RENDER: WEEK PILLS ──────────────────────────────────────────────────────
function renderWeekPills() {
  var grid = document.getElementById("weekPills");
  grid.innerHTML = "";
  if (!weekStudents.length) {
    grid.innerHTML = "<div style='color:var(--muted);font-size:11px'>No students this week</div>";
    return;
  }
  var anyShown = false;
  weekStudents.forEach(function(s) {
    if (s.isToday) return;                              // today's → Today grid
    if (isLessonLogged(s.name, s.eventDate)) return;   // already logged → hide
    anyShown = true;
    var btn  = document.createElement("button");
    var past = isPastDay(s.eventDate) && !s.isToday;
    btn.className = "week-pill" +
      (s.calType === "trial" ? " trial-pill" : "") +
      (past ? " forgot" : "");
    btn.id = "pill-" + s.name.replace(/\s+/g, "_") + "_" + (s.eventDate || "");
    var dateLabel = s.eventDate
      ? " <span class='pill-date'>" + formatEventDate(s.eventDate) + "</span>"
      : "";
    btn.innerHTML = s.name + dateLabel;
    btn.onclick = function() { openLog(s); };
    grid.appendChild(btn);
  });
  if (!anyShown) {
    grid.innerHTML = "<div style='color:var(--green);font-size:11px'>All logged ✓</div>";
  }
}

// ─── RENDER: TODAY GRID ──────────────────────────────────────────────────────
function renderTodayGrid() {
  var grid = document.getElementById("todayGrid");
  grid.innerHTML = "";
  if (!todayStudents.length) {
    grid.innerHTML = "<div class='empty-state'>No students today</div>";
    return;
  }
  var anyShown = false;
  todayStudents.forEach(function(s, i) {
    if (isLessonLogged(s.name, s.eventDate)) return;
    anyShown = true;
    var btn = document.createElement("button");
    btn.className = "today-btn";
    btn.id = "tbtn-" + i;
    var cnt  = lessonCounts[s.name];
    var badgeHtml = "";
    if (cnt !== undefined) {
      var next = (cnt >= 4 || cnt <= 0) ? 1 : cnt + 1;
      var ord  = next === 1 ? "1st" : next === 2 ? "2nd" : next === 3 ? "3rd" : "4th";
      var payBadge = (next === 4);
      badgeHtml = "<div class='lesson-badge" + (payBadge ? " pay-time" : "") + "'>" +
        ord + " lesson" + (payBadge ? " — payment due" : "") + "</div>";
    }
    btn.innerHTML =
      "<div class='mic-dot'></div>" +
      s.name +
      "<div class='btn-type " + (s.calType === "trial" ? "trial" : "regular") + "'>" +
        (s.calType === "trial" ? "TRIAL" : "LESSON") +
      "</div>" +
      badgeHtml;
    btn.onclick = function() { toggleLog(s, i); };
    grid.appendChild(btn);
  });
  if (!anyShown) {
    grid.innerHTML = "<div style='color:var(--green);font-size:11px;text-align:center;padding:20px'>All logged today ✓</div>";
  }
}

// ─── MIC: TOGGLE ─────────────────────────────────────────────────────────────
function toggleLog(student, idx) {
  if (activeStudent &&
      (activeStudent.student.name !== student.name ||
       activeStudent.student.eventDate !== student.eventDate)) {
    stopRecording();
    openLogFresh(student, idx);
    return;
  }
  if (!activeStudent) { openLogFresh(student, idx); return; }
  if (isRecording) {
    stopRecording();
    setRecordingUI(false, idx);
    document.getElementById("logPanelStatus").textContent = "review & edit";
    document.getElementById("logPanelStatus").classList.add("idle");
  } else {
    document.getElementById("transcriptBox").value = "";
    document.getElementById("btnLog").disabled = true;
    startRecording(idx);
  }
}

function openLogFresh(student, idx) {
  activeStudent = { student: student, idx: idx };
  document.getElementById("logPanel").classList.add("active");
  document.getElementById("logPanelName").textContent = student.name;
  document.getElementById("transcriptBox").value = "";
  document.getElementById("btnLog").disabled = true;
  document.getElementById("btnLog").className = "btn-log";
  document.getElementById("btnLog").textContent = "Log It →";
  var ex = document.getElementById("trialPaidToggle");
  if (ex) ex.remove();
  if (student.calType === "trial") {
    var tog = document.createElement("label");
    tog.className = "trial-paid"; tog.id = "trialPaidToggle";
    tog.innerHTML = "<input type='checkbox' id='trialPaidCheck'> ✓ Trial Paid";
    tog.onclick = function() {
      setTimeout(function() {
        tog.classList.toggle("checked", document.getElementById("trialPaidCheck").checked);
      }, 0);
    };
    document.getElementById("logActions").insertBefore(tog, document.getElementById("btnLog"));
  }
  startRecording(idx);
}

function setRecordingUI(recording, idx) {
  document.querySelectorAll(".today-btn").forEach(function(b) { b.classList.remove("recording"); });
  document.querySelectorAll(".week-pill").forEach(function(b) { b.classList.remove("recording"); });
  if (recording) {
    if (idx !== undefined) {
      var tb = document.getElementById("tbtn-" + idx);
      if (tb) tb.classList.add("recording");
    }
    if (activeStudent) {
      var key = activeStudent.student.name.replace(/\s+/g, "_") + "_" + (activeStudent.student.eventDate || "");
      var wp  = document.getElementById("pill-" + key);
      if (wp) wp.classList.add("recording");
    }
    document.getElementById("logPanelStatus").textContent = "🔴 recording...";
    document.getElementById("logPanelStatus").classList.remove("idle");
  }
}

function openLog(student) {
  if (isRecording) stopRecording();
  var idx;
  todayStudents.forEach(function(s, i) {
    if (s.name === student.name && s.eventDate === student.eventDate) idx = i;
  });
  openLogFresh(student, idx);
}

// ─── MIC: START / STOP ───────────────────────────────────────────────────────
function startRecording(idx) {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addLog("lessonFeed", "Speech not supported. Use Chrome.", "error");
    return;
  }
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US"; recognition.continuous = true; recognition.interimResults = true;
  recognition.onstart = function() { isRecording = true; setRecordingUI(true, idx); playBeep(880, 100); };
  recognition.onresult = function(event) {
    var interim = "";
    if (!recognition._finalText) recognition._finalText = "";
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) recognition._finalText += event.results[i][0].transcript;
      else interim += event.results[i][0].transcript;
    }
    var box = document.getElementById("transcriptBox");
    box.value = (recognition._finalText + interim).trim();
    if (recognition._finalText.trim()) document.getElementById("btnLog").disabled = false;
  };
  recognition.onend = function() {
    if (isRecording) {
      isRecording = false;
      setRecordingUI(false, idx);
      playBeep(440, 80, 0.15);
      document.getElementById("logPanelStatus").textContent = "review & edit";
      document.getElementById("logPanelStatus").classList.add("idle");
      var box = document.getElementById("transcriptBox");
      if (box.value.trim()) document.getElementById("btnLog").disabled = false;
    }
  };
  recognition.onerror = function(e) { if (e.error === "no-speech") return; isRecording = false; };
  recognition._finalText = "";
  recognition.start();
}

function stopRecording() {
  isRecording = false;
  if (recognition) recognition.stop();
  playBeep(440, 80, 0.15);
}

// ─── SUBMIT LESSON LOG ───────────────────────────────────────────────────────
function submitLog() {
  var url = getScriptUrl(); if (!url) return;
  var subject = document.getElementById("transcriptBox").value.trim();
  if (!subject) { addLog("lessonFeed", "Nothing to log!", "error"); return; }
  stopRecording();
  var student = activeStudent.student;
  var btn = document.getElementById("btnLog");
  btn.textContent = "Logging..."; btn.disabled = true;
  var trialPaid = false;
  var pe = document.getElementById("trialPaidCheck");
  if (pe) trialPaid = pe.checked;
  var params = { studentName: student.name, subject: subject, trialPaid: trialPaid ? "1" : "0" };
  if (student.eventDate) params.lessonDate = student.eventDate;
  callScript(url, student.calType === "trial" ? "logTrial" : "logLesson", params, function(data) {
    if (data.success) {
      btn.textContent = "✓ Logged!"; btn.className = "btn-log success";
      markLessonLogged(student.name, student.eventDate);
      addLog("lessonFeed", "✓ " + student.name + " — " + subject, "success");
      renderWeekPills(); renderTodayGrid(); renderWeekTab();
      setTimeout(function() {
        document.getElementById("logPanel").classList.remove("active");
        activeStudent = null;
      }, 1200);
    } else {
      btn.textContent = "Log It →"; btn.disabled = false;
      addLog("lessonFeed", "❌ " + (data.message || "Error logging"), "error");
    }
  });
}
