// ─── TABS / LESSONS.JS ───────────────────────────────────────────────────────
var activeRow = 0;
var rowFinals = [""];

function _logBox() { return document.getElementById("logRows"); }

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
    grid.innerHTML = "<div class='empty-state'>None</div>";
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
  toggleLogMic();
}

// The mic button. Recording is never automatic: opening the window only opens it.
function toggleLogMic() {
  if (!activeStudent || activeStudent.logged) return;
  if (isRecording) {
    stopRecordingClean();
    setRecordingUI(false, activeStudent.idx);
    updateLogButton();
  } else {
    startRecording(activeStudent.idx);
  }
}

function _logState(text, color) {
  var el = document.getElementById("logPanelStatus");
  if (el) { el.textContent = text || ""; el.style.color = color || "var(--muted)"; }
}

function openLogFresh(student, idx) {
  activeStudent = { student: student, idx: idx };
  var panel = document.getElementById("logPanel");
  panel.classList.add("active");
  // A window everywhere, like the Trial card's (was inline on the Today grid).
  if (typeof _floatLogPanel === "function") _floatLogPanel();
  var ic = document.getElementById("logPanelIcon");
  if (ic && !ic.innerHTML) ic.innerHTML = LOG_ICON;
  var add = document.getElementById("logAddRow");
  if (add) add.innerHTML = llAddInner();
  document.getElementById("logPanelName").textContent = student.name;
  var mic0 = document.getElementById("logMicBtn");
  if (mic0 && !mic0.innerHTML) mic0.innerHTML = MIC_ICON;
  resetRows();
  rpmBusy(panel, null, false);
  var lb = document.getElementById("btnLog");
  lb.disabled = true; lb.textContent = "Log"; lb.className = "link-btn bright";
  var mic = document.getElementById("logMicBtn");
  if (mic) { mic.innerHTML = MIC_ICON; mic.classList.remove("rec"); mic.disabled = false; }
  _logState("");

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
}

function setRecordingUI(recording, idx) {
  document.querySelectorAll(".today-btn").forEach(function(b) { b.classList.remove("recording"); });
  var mic = document.getElementById("logMicBtn");
  if (mic) { mic.innerHTML = recording ? MIC_STOP_ICON : MIC_ICON; mic.classList.toggle("rec", !!recording); }
  if (recording) {
    if (idx !== undefined) {
      var tb = document.getElementById("tbtn-" + idx);
      if (tb) tb.classList.add("recording");
    }
    _logState("Recording", "var(--accent)");
  } else if (!(activeStudent && activeStudent.logged)) {
    _logState("");
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
      rowFinals[activeRow] = ((rowFinals[activeRow] || "") + " " + newFinal).replace(/\s+/g, " ").trim();
    }
    var inp = llRows(_logBox())[activeRow];
    if (inp) inp.value = ((rowFinals[activeRow] || "") + " " + interim).replace(/\s+/g, " ").trim();
    updateLogButton();
  };

  recognition.onend = function() {
    if (recognition._suppressed) return;
    if (isRecording) {
      isRecording = false;
      setRecordingUI(false, idx);
      playBeep(440, 80, 0.15);
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
  // Beep only when something was actually recording: closing a window you
  // typed into should be silent.
  if (isRecording) playBeep(440, 80, 0.15);
  isRecording = false;
}

function stopRecording() {
  stopRecordingClean();
}

// ─── SUBMIT LESSON LOG ───────────────────────────────────────────────────────
function submitLog() {
  var url = getScriptUrl(); if (!url) return;

  var parts = llValues(_logBox()).filter(function(v) { return v; }).map(toTitleCase);
  var subject = parts.join(" - ");
  if (!subject) { addLog("lessonFeed", "Nothing to log!", "error"); return; }

  stopRecordingClean();
  setRecordingUI(false, activeStudent ? activeStudent.idx : undefined);

  var student = activeStudent.student;
  var btn = document.getElementById("btnLog");
  var panel = document.getElementById("logPanel");
  btn.textContent = "Logging…"; btn.disabled = true;
  _logState("");
  // Trial window feedback: the window dims, the button keeps its dots.
  rpmBusy(panel, btn, true);

  var trialPaid = false;
  var pe = document.getElementById("trialPaidCheck");
  if (pe) trialPaid = pe.checked;

  var params = { studentName: student.name, subject: subject, trialPaid: trialPaid ? "1" : "0" };
  if (student.eventDate) params.lessonDate = student.eventDate;

  var q = url + "?action=" + (student.calType === "trial" ? "logTrial" : "logLesson");
  for (var k in params) q += "&" + k + "=" + encodeURIComponent(params[k]);
  function fail(why) {
    rpmBusy(panel, btn, false);
    btn.textContent = "Log"; btn.disabled = false;
    rpmFail("logPanelStatus", why);
  }
  fetch(q).then(function(r) { return r.json(); }).then(function(data) {
    rpmBusy(panel, btn, false);
    if (data.success) {
      // No client-side memory: the sheet is the source of truth. Flag this
      // student optimistically so the button drops off the Today grid now; the
      // next loadData re-derives alreadyLogged straight from the sheet.
      todayStudents.forEach(function(t) {
        if (t.name === student.name && t.eventDate === student.eventDate) t.alreadyLogged = true;
      });
      addLog("lessonFeed", "✓ " + student.name + " — " + subject, "success");
      // No success line: the button says Logged ✓, the rows and buttons lock
      // (logged is final), and a second later the window closes by itself
      // (2026-09-28). A failure keeps it open with its Unsuccessful badge.
      if (activeStudent) activeStudent.logged = true;
      btn.textContent = "Logged ✓"; btn.className = "link-btn green";
      var mic = document.getElementById("logMicBtn");
      if (mic) mic.disabled = true;
      llLock(_logBox());
      renderTodayGrid();
      // If this log came from the Home/student page, re-fetch that student's
      // detail so the Past section reflects the lesson just logged. Same hook
      // pattern as the Audit fix flow below.
      if (window._stLogActive && typeof _stOpenStudent === "function") {
        var _stName = window._stLogActive;
        window._stLogActive = null;
        _stOpenStudent(_stName);
      }
      // If this log came from the Audit tab, reload the whole Audit list so
      // the grids show the new lesson (user, 2026-09-29: the old optimistic
      // chip removal left the red cell on the card). The panel stays floated
      // until Done: closeLogPanel puts it back.
      if (window._auditFixActive) {
        window._auditFixActive = false;
        window._auditResolve = null;
        if (typeof initAuditTab === "function") initAuditTab();
      }
      // Only if it's still this lesson's window (not one opened since).
      var done = activeStudent;
      setTimeout(function() { if (done && activeStudent === done) closeLogPanel(); }, 1000);
    } else {
      fail(data.message || "Error logging");
    }
  }).catch(function() { fail("No answer from Google. Check the sheet before trying again."); });
}

// ─── MULTI-ROW HELPERS ───────────────────────────────────────────────────────
// Rows come and go (Enter / ＋ row / Backspace), so everything goes by index
// into llRows() and rowFinals is re-read from the boxes on every change.
function setActiveRow(idx) {
  var rows = llRows(_logBox());
  if (idx !== activeRow && rows[activeRow]) rowFinals[activeRow] = rows[activeRow].value.trim();
  activeRow = idx;
  rows.forEach(function(el, i) { el.classList.toggle("active", i === idx); });
}

function onRowInput() {
  rowFinals = llValues(_logBox());
  updateLogButton();
}

function updateLogButton() {
  if (activeStudent && activeStudent.logged) return;
  document.getElementById("btnLog").disabled = !llValues(_logBox()).some(function(v) { return v; });
}

function resetRows() {
  var box = _logBox();
  llWire(box, setActiveRow, onRowInput, function() {
    var b = document.getElementById("btnLog");
    if (b && !b.disabled) submitLog();
  });
  llReset(box);
  rowFinals = [""];
  activeRow = 0;
}

function toTitleCase(str) {
  var small = ["a","an","and","as","at","but","by","for","in","nor","of","on","or","the","to","up","yet","so","if","off","per","via"];
  var words = str.toLowerCase().split(/\s+/);
  return words.map(function(w, i) {
    if (i !== 0 && i !== words.length - 1 && small.indexOf(w) !== -1) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}
