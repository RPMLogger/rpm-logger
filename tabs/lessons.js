// ─── TABS / LESSONS.JS ───────────────────────────────────────────────────────
var activeRow = 0;
var rowFinals = ["", "", ""];

function closeLogPanel() {
  stopRecordingClean();
  document.getElementById("logPanel").classList.remove("active");
  document.querySelectorAll(".today-btn").forEach(function(b) { b.classList.remove("recording"); });
  activeStudent = null;
  window._auditFixActive = false;
  window._auditResolve = null;
  if (typeof _unfloatLogPanel === "function") _unfloatLogPanel();
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
    if (s.alreadyLogged) return;
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
    stopRecordingClean();
    closeLogPanel();
    openLogFresh(student, idx);
    return;
  }
  if (!activeStudent) {
    openLogFresh(student, idx);
    return;
  }
  if (isRecording) {
    stopRecordingClean();
    setRecordingUI(false, idx);
    document.getElementById("logPanelStatus").textContent = "review & edit";
    document.getElementById("logPanelStatus").classList.add("idle");
    updateLogButton();
  } else {
    resetRows();
    document.getElementById("btnLog").disabled = true;
    startRecording(idx);
  }
}

function openLogFresh(student, idx) {
  activeStudent = { student: student, idx: idx };
  document.getElementById("logPanel").classList.add("active");
  document.getElementById("logPanelName").textContent = student.name;
  resetRows();
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
  if (recording) {
    if (idx !== undefined) {
      var tb = document.getElementById("tbtn-" + idx);
      if (tb) tb.classList.add("recording");
    }
    document.getElementById("logPanelStatus").textContent = "🔴 recording...";
    document.getElementById("logPanelStatus").classList.remove("idle");
  }
}

// ─── MIC: START / STOP ───────────────────────────────────────────────────────
function startRecording(idx) {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addLog("lessonFeed", "Speech not supported. Use Chrome.", "error");
    return;
  }
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US"; recognition.continuous = true; recognition.interimResults = true;
  recognition._suppressed = false;

  recognition.onstart = function() {
    isRecording = true;
    setRecordingUI(true, idx);
    playBeep(880, 100);
  };

  recognition.onresult = function(event) {
    var interim = "";
    var newFinal = "";
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) newFinal += event.results[i][0].transcript;
      else interim += event.results[i][0].transcript;
    }
    if (newFinal) {
      rowFinals[activeRow] = (rowFinals[activeRow] + " " + newFinal).replace(/\s+/g, " ").trim();
    }
    var inp = document.getElementById("rowInput-" + activeRow);
    inp.value = (rowFinals[activeRow] + " " + interim).replace(/\s+/g, " ").trim();
    updateLogButton();
  };

  recognition.onend = function() {
    if (recognition._suppressed) return;
    if (isRecording) {
      isRecording = false;
      setRecordingUI(false, idx);
      playBeep(440, 80, 0.15);
      document.getElementById("logPanelStatus").textContent = "review & edit";
      document.getElementById("logPanelStatus").classList.add("idle");
      updateLogButton();
    }
  };

  recognition.onerror = function(e) {
    if (e.error === "no-speech") return;
    isRecording = false;
    setRecordingUI(false, idx);
  };

  recognition.start();
}

function stopRecordingClean() {
  if (recognition) {
    recognition._suppressed = true;
    recognition.stop();
  }
  isRecording = false;
  playBeep(440, 80, 0.15);
}

function stopRecording() {
  stopRecordingClean();
}

// ─── SUBMIT LESSON LOG ───────────────────────────────────────────────────────
function submitLog() {
  var url = getScriptUrl(); if (!url) return;

  var parts = [];
  for (var r = 0; r < 3; r++) {
    var v = document.getElementById("rowInput-" + r).value.trim();
    if (v) parts.push(toTitleCase(v));
  }
  var subject = parts.join(" - ");
  if (!subject) { addLog("lessonFeed", "Nothing to log!", "error"); return; }

  stopRecordingClean();
  setRecordingUI(false, activeStudent ? activeStudent.idx : undefined);

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
      // No client-side memory: the sheet is the source of truth. Flag this
      // student optimistically so the button drops off the Today grid now; the
      // next loadData re-derives alreadyLogged straight from the sheet.
      todayStudents.forEach(function(t) {
        if (t.name === student.name && t.eventDate === student.eventDate) t.alreadyLogged = true;
      });
      addLog("lessonFeed", "✓ " + student.name + " — " + subject, "success");
      document.getElementById("logPanel").classList.remove("active");
      activeStudent = null;
      renderTodayGrid();
      // If this log came from the Home/student page, re-fetch that student's
      // detail so the Past section reflects the lesson just logged. Same hook
      // pattern as the Audit fix flow below.
      if (window._stLogActive && typeof _stOpenStudent === "function") {
        var _stName = window._stLogActive;
        window._stLogActive = null;
        _stOpenStudent(_stName);
      }
      // If this log came from the Audit tab's fix-1 flow, restore the modal to
      // its home and optimistically drop just the resolved chip — no full
      // re-audit. The ↻ Refresh button re-verifies against the sheets on demand.
      if (window._auditFixActive) {
        window._auditFixActive = false;
        if (typeof _unfloatLogPanel === "function") _unfloatLogPanel();
        var res = window._auditResolve;
        window._auditResolve = null;
        if (res && typeof _auditRemoveResolved === "function") {
          _auditRemoveResolved(res.name, res.disp);
        } else if (typeof initAuditTab === "function") {
          initAuditTab();
        }
      }
    } else {
      btn.textContent = "Log It →"; btn.disabled = false;
      addLog("lessonFeed", "❌ " + (data.message || "Error logging"), "error");
    }
  });
}

// ─── MULTI-ROW HELPERS ───────────────────────────────────────────────────────
function setActiveRow(idx) {
  if (idx === activeRow) return;
  var oldInp = document.getElementById("rowInput-" + activeRow);
  if (oldInp) rowFinals[activeRow] = oldInp.value.trim();
  activeRow = idx;
  document.querySelectorAll(".transcript-row").forEach(function(el, i) {
    el.classList.toggle("active", i === idx);
  });
}

function onRowInput() {
  for (var r = 0; r < 3; r++) {
    rowFinals[r] = document.getElementById("rowInput-" + r).value.trim();
  }
  updateLogButton();
}

function updateLogButton() {
  var any = false;
  for (var r = 0; r < 3; r++) {
    if (document.getElementById("rowInput-" + r).value.trim()) { any = true; break; }
  }
  document.getElementById("btnLog").disabled = !any;
}

function resetRows() {
  rowFinals = ["", "", ""];
  for (var r = 0; r < 3; r++) {
    var el = document.getElementById("rowInput-" + r);
    if (el) el.value = "";
  }
  activeRow = 0;
  document.querySelectorAll(".transcript-row").forEach(function(el, i) {
    el.classList.toggle("active", i === 0);
  });
}

function toTitleCase(str) {
  var small = ["a","an","and","as","at","but","by","for","in","nor","of","on","or","the","to","up","yet","so","if","off","per","via"];
  var words = str.toLowerCase().split(/\s+/);
  return words.map(function(w, i) {
    if (i !== 0 && i !== words.length - 1 && small.indexOf(w) !== -1) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}
