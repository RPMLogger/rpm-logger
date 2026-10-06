// ─── TABS / LESSONS.JS ───────────────────────────────────────────────────────
var activeRow = 0;
var rowFinals = [""];

function _logBox() { return document.getElementById("logRows"); }

function closeLogPanel() {
  stopRecordingClean();
  document.getElementById("logPanel").classList.remove("active");
  document.querySelectorAll(".today-btn").forEach(function(b) { b.classList.remove("recording"); });
  activeStudent = null;
  logHw = null;
  window._auditHwActive = false;
  window._imLogActive = null;
  _logHwOnly(false);
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

// opts.hwOnly: the same window asking only the HW question, for a lesson
// already logged without it (Dropbox Today card).
function openLogFresh(student, idx, opts) {
  var hwOnly = !!(opts && opts.hwOnly);
  activeStudent = { student: student, idx: idx, hwOnly: hwOnly };
  _logHwOnly(hwOnly);
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
  logHwOpen(student);
  if (hwOnly) {
    lb.textContent = "Save";
    // Which lesson: "· HW · Oct 3" (Audit can have several waiting).
    var t = panel.querySelector(".settings-title > span > span:last-child");
    if (t && logHw) { var p = logHw.date.split("-"); t.textContent = " · HW · " + MONTHS[parseInt(p[1], 10) - 1] + " " + parseInt(p[2], 10); }
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
  if (activeStudent && activeStudent.hwOnly) { logHwSaveOnly(); return; }
  if (logHw && !logHw.choice) return;

  // Rows join with commas into one sentence (2026-10-06, was " - "): only the
  // first letter capitalised.
  var parts = llValues(_logBox()).filter(function(v) { return v; });
  var subject = parts.length ? toSentenceCase(parts.join(", ")) : "";
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
  if (logHw) {
    params.hw = logHw.choice;
    params.hwFiles = logHw.choice === "sent" ? logHw.files.map(function(f) { return f.path; }).join("\n") : "";
    params.hwSource = logHw.choice === "sent" ? "Auto" : "Manual";
    logHw.locked = true; _logHwRender();
  }

  var q = url + "?action=" + (student.calType === "trial" ? "logTrial" : "logLesson");
  for (var k in params) q += "&" + k + "=" + encodeURIComponent(params[k]);
  function fail(why) {
    rpmBusy(panel, btn, false);
    if (logHw) { logHw.locked = false; _logHwRender(); }
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
      if (data.hwSaved) _logHwSaved(student.name, logHw);
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
      // Logged from the Import tab's Log lesson: redraw that student's list.
      if (window._imLogActive && typeof _imOpenStudent === "function") {
        var _imName = window._imLogActive;
        window._imLogActive = null;
        _imOpenStudent(_imName);
      }
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
      // The lesson saved but its HW didn't: amber half badge, the window stays
      // open so it's seen (the HW can be saved again from the Dropbox card).
      if (data.hwError) { rpmHalf("logPanelStatus", "HW not saved", data.hwError); return; }
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
  var rowsOk = (activeStudent && activeStudent.hwOnly) || llValues(_logBox()).some(function(v) { return v; });
  var hwOk = !logHw || (!!logHw.choice && !logHw.loading);
  document.getElementById("btnLog").disabled = !(rowsOk && hwOk);
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

// Sentence case for lesson logs (2026-10-05, was Title Case): the first
// letter capitalised, a lone "i" made "I", everything else exactly as typed
// or dictated, so a song name typed with capitals keeps them.
function toSentenceCase(str) {
  var t = String(str || "").replace(/\s+/g, " ").trim().replace(/(^|\s)i(?=\s|$|')/g, "$1I");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function toTitleCase(str) {
  var small = ["a","an","and","as","at","but","by","for","in","nor","of","on","or","the","to","up","yet","so","if","off","per","via"];
  var words = str.toLowerCase().split(/\s+/);
  return words.map(function(w, i) {
    if (i !== 0 && i !== words.length - 1 && small.indexOf(w) !== -1) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}

// ─── HW (2026-10-03) ─────────────────────────────────────────────────────────
// Every lesson ends Sent or No HW, asked here and saved with the lesson to the
// HW Log tab (Students Import) (backend RPM_HwLog.gs). The files are what's in the
// student's Dropbox that isn't on an earlier lesson's row yet; finding files
// picks Sent, finding none leaves No HW to press. Log stays locked until one
// is picked. Not asked for trials (their card has Send HW) or for lessons
// before HW_START (starting fresh).
var HW_START = "2026-10-03";
var logHw = null;   // { name, date, files:[{name,path,bytes,modified}], choice, loading, locked, noFolder, seq }
var _logHwSeq = 0;

// The lesson's date as yyyy-MM-dd: eventDate is "2026-10-03T16:00:00" or "2026/10/03".
function _logHwDate(student) {
  var s = String((student && student.eventDate) || "").slice(0, 10).replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (dd < 10 ? "0" + dd : dd);
}

function logHwOpen(student) {
  var box = document.getElementById("logHw");
  if (!box) return;
  var date = _logHwDate(student);
  if (student.calType === "trial" || date < HW_START) { logHw = null; box.style.display = "none"; return; }
  box.style.display = "";
  var rb = document.getElementById("logHwRecheck");
  if (rb && !rb.innerHTML && typeof REFRESH_ICON !== "undefined") rb.innerHTML = REFRESH_ICON;
  logHw = { name: student.name, date: date, files: [], choice: null, loading: true, locked: false };
  logHwCheck();
}

// Ask the backend which files are new for this lesson.
function logHwCheck() {
  if (!logHw || logHw.locked) return;
  var hw = logHw, seq = ++_logHwSeq;
  hw.loading = true; _logHwRender(); updateLogButton();
  fetch(getScriptUrl() + "?action=getHwPending&name=" + encodeURIComponent(hw.name) + "&lessonDate=" + hw.date)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (logHw !== hw || seq !== _logHwSeq) return;
      hw.loading = false;
      if (!d.success) { hw.error = d.message || "Couldn't read Dropbox"; hw.files = []; }
      else {
        hw.error = null;
        hw.noFolder = !!d.noFolder;
        hw.files = d.files || [];
        if (d.existing) {
          // Already answered for this lesson: show that answer, and keep its
          // files listed even if Dropbox has cleaned them out since.
          var have = {};
          hw.files.forEach(function(f) { have[f.path.toLowerCase()] = 1; });
          (d.existing.files || []).forEach(function(p) {
            if (!have[p.toLowerCase()]) hw.files.push({ name: p.split("/").pop(), path: p });
          });
          if (!hw.choice) hw.choice = d.existing.hw === "Sent" ? "sent" : "none";
        }
        if (!hw.choice && hw.files.length) hw.choice = "sent";
        if (hw.choice === "sent" && !hw.files.length) hw.choice = null;
      }
      _logHwRender(); updateLogButton();
    })
    .catch(function() {
      if (logHw !== hw || seq !== _logHwSeq) return;
      hw.loading = false; hw.error = "No answer from Google";
      _logHwRender(); updateLogButton();
    });
}

function logHwPick(c) {
  if (!logHw || logHw.locked || logHw.loading) return;
  if (c === "sent" && !logHw.files.length) return;
  logHw.choice = c;
  _logHwRender(); updateLogButton();
}

function _logHwRender() {
  var hw = logHw;
  var list = document.getElementById("logHwFiles");
  var sent = document.getElementById("logHwSent"), none = document.getElementById("logHwNone");
  if (!hw || !list) return;
  var dim = "<span style='color:var(--muted)'>";
  if (hw.loading) list.innerHTML = dim + "Checking Dropbox…</span>";
  else if (hw.error) list.innerHTML = "<span style='color:var(--warn)'>" + inqEsc(hw.error) + "</span>";
  else if (!hw.files.length) list.innerHTML = dim + (hw.noFolder ? "No Dropbox folder named " + inqEsc(hw.name) : "No new files in their Dropbox") + "</span>";
  else list.innerHTML = _dbDetailsFilesHtml({ items: hw.files });
  list.style.opacity = hw.choice === "none" && hw.files.length ? ".4" : "";   // No HW: the files aren't this lesson's
  var n = hw.files.length;
  sent.querySelector("span").textContent = n ? "Sent · " + n + (n === 1 ? " file" : " files") : "Sent";
  sent.classList.toggle("done", hw.choice === "sent");
  none.classList.toggle("done", hw.choice === "none");
  sent.parentNode.classList.toggle("picked", !!hw.choice);
  sent.disabled = hw.locked || hw.loading || !n;
  none.disabled = hw.locked || hw.loading;
}

// HW-only mode hides the lesson rows; the window title says HW.
function _logHwOnly(on) {
  var panel = document.getElementById("logPanel");
  if (!panel) return;
  panel.classList.toggle("hw-only", !!on);
  var t = panel.querySelector(".settings-title > span > span:last-child");
  if (t) t.textContent = on ? " · HW" : " · Log Lesson";
}

// HW-only Save: the HW row alone (lesson already logged).
function logHwSaveOnly() {
  if (!logHw || !logHw.choice) return;
  var hw = logHw, btn = document.getElementById("btnLog"), panel = document.getElementById("logPanel");
  btn.textContent = "Saving…"; btn.disabled = true;
  rpmBusy(panel, btn, true);
  hw.locked = true; _logHwRender();
  var q = getScriptUrl() + "?action=saveHw&name=" + encodeURIComponent(hw.name) + "&lessonDate=" + hw.date +
    "&hw=" + hw.choice + "&source=" + (hw.choice === "sent" ? "Auto" : "Manual") +
    "&files=" + encodeURIComponent(hw.choice === "sent" ? hw.files.map(function(f) { return f.path; }).join("\n") : "");
  fetch(q).then(function(r) { return r.json(); }).then(function(d) {
    rpmBusy(panel, btn, false);
    if (!d.success) throw new Error(d.message || "Error saving");
    activeStudent.logged = true;
    btn.textContent = "Saved ✓";
    _logHwSaved(hw.name, hw);
    var done = activeStudent;
    setTimeout(function() { if (done && activeStudent === done) closeLogPanel(); }, 1000);
  }).catch(function(e) {
    rpmBusy(panel, btn, false);
    hw.locked = false; _logHwRender();
    btn.textContent = "Save"; btn.disabled = false;
    rpmFail("logPanelStatus", e && e.message && e.message !== "Failed to fetch" ? e.message : "No answer from Google.");
  });
}

// Tell the Dropbox tab (its Today card and the open student page).
function _logHwSaved(name, hw) {
  if (!hw) return;
  // Opened from the Audit tab's Missing HW: reload that list. (A Log lesson
  // from Audit reloads the whole tab, this list included.)
  if (window._auditHwActive && typeof _runHwAudit === "function") {
    window._auditHwActive = false;
    _runHwAudit();
  }
  if (typeof _imHwSaved === "function") _imHwSaved(name);   // Import's Last HW
}
