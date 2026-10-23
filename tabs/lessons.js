// ─── TABS / LESSONS.JS ───────────────────────────────────────────────────────
var activeRow = 0;
var rowFinals = [""];

function _logBox() { return document.getElementById("logRows"); }

function closeLogPanel() {
  // What HW still being typed (never left the box) counts as changed.
  var ae = document.activeElement;
  if (ae && ae.closest && ae.closest("#logHwRows") && typeof logHwTextChanged === "function") logHwTextChanged();
  if (typeof _imFlushOnClose === "function") _imFlushOnClose();   // Log lesson window: save what's ticked
  stopRecordingClean();
  if (typeof _hwMicStop === "function") _hwMicStop();
  document.getElementById("logPanel").classList.remove("active");
  document.querySelectorAll(".today-btn").forEach(function(b) { b.classList.remove("recording"); });
  activeStudent = null;
  logHw = null;
  window._imLogActive = null;
  _logHwOnly(false);
  window._auditFixActive = false;
  window._auditResolve = null;
  if (typeof _unfloatLogPanel === "function") _unfloatLogPanel();
  if (typeof _imLogClosed === "function") _imLogClosed();   // Import's docked Log box
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
  if (student.calType === "trial" && !student.trialEmail) {   // the old Home trial log; the Trial card's has no Paid tick
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
  _hwMicStop();   // one mic at a time (What HW has its own, 2026-10-15)
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
// No show (2026-10-11): logs the lesson as "No show" (it counts and is paid)
// and asks logLesson for a row in the Counter's No Show Logs (RPM_NoShow.js).
// HW and Schedule stay open: HW or a video lesson can still go to them.
function logNoShow() {
  var box = _logBox();
  if (!box || !activeStudent || activeStudent.logged || activeStudent.hwOnly) return;
  if (activeStudent.student && activeStudent.student.calType === "trial") return;
  llRows(box).forEach(function(el, i) { el.value = i ? "" : "No show"; });
  submitLog(true);
}

function submitLog(noShow) {
  var url = getScriptUrl(); if (!url) return;
  if (activeStudent && activeStudent.hwOnly) { logHwSaveOnly(); return; }
  if (logHw && !logHw.choice && !window._imDocked) return;   // the docked box asks HW in Finish logging

  // Rows join with commas into one sentence (2026-10-06, was " - "): only the
  // first letter capitalised.
  var parts = llValues(_logBox()).filter(function(v) { return v; });
  var subject = parts.length ? toSentenceCase(parts.join(", ")) : "";
  if (!subject) { addLog("lessonFeed", "Nothing to log!", "error"); return; }
  if (typeof _imRowsPut === "function") _imRowsPut("log", parts.map(function(v, i) { return i ? v : toSentenceCase(v); }));   // each box its own line in the Email window

  stopRecordingClean();
  setRecordingUI(false, activeStudent ? activeStudent.idx : undefined);

  var student = activeStudent.student;
  var trialPaid = false;
  var pe = document.getElementById("trialPaidCheck");
  if (pe) trialPaid = pe.checked;
  var params = { studentName: student.name, subject: subject, trialPaid: trialPaid ? "1" : "0" };
  if (student.eventDate) params.lessonDate = student.eventDate;
  if (noShow === true) params.noShow = "1";
  var action = student.calType === "trial" ? "logTrial" : "logLesson";
  // From the Trial card (2026-10-23): the trial row and HW Tracking, never a Students Import tab.
  if (student.trialEmail) { action = "logTrialLesson"; params.email = student.trialEmail; params.hwText = (logHw && logHw.text) || ""; }

  // The Log lesson window (2026-10-09): Log only ticks; the lesson goes to
  // Google with its HW and Schedule once all three are done (_imSend, import.js).
  if (window._imDocked && typeof _imPendLog === "function") { _imPendLog(student, params, action); return; }

  var btn = document.getElementById("btnLog");
  var panel = document.getElementById("logPanel");
  btn.textContent = "Logging…"; btn.disabled = true;
  _logState("");
  // Trial window feedback: the window dims, the button keeps its dots.
  rpmBusy(panel, btn, true);

  if (logHw && logHw.choice) {
    params.hw = logHw.choice === "sent" && !logHw.filesOn && !logHw.links.length && !logHw.phone && logHw.videoOnly ? "video" : logHw.choice;
    params.hwFiles = logHw.choice === "sent" && logHw.filesOn ? logHw.files.map(function(f) { return f.path; }).join("\n") : "";
    params.hwLinks = logHw.choice === "sent" ? logHw.links.map(function(l) { return l.kind + ": " + l.url; }).join("\n") : "";
    params.hwPhone = logHw.choice === "sent" && logHw.phone ? "1" : "";
    params.hwText = logHw.text || "";
    logHw.locked = true; _logHwRender();
  }

  var q = url + "?action=" + action;
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
      _logLessonDone(student, subject, data, logHw);
      // No success line: the button says Logged ✓, the rows and buttons lock
      // (logged is final), and a second later the window closes by itself
      // (2026-09-28). A failure keeps it open with its Unsuccessful badge.
      if (activeStudent) activeStudent.logged = true;
      btn.textContent = "Logged ✓"; btn.className = "link-btn green";
      var mic = document.getElementById("logMicBtn");
      if (mic) mic.disabled = true;
      llLock(_logBox());
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

// A lesson's log saved (submitLog, or the Log lesson window's _imSend):
// everything else that follows it. hw: its HW, when it went with the log.
function _logLessonDone(student, subject, data, hw) {
  // No client-side memory: the sheet is the source of truth. Flag this
  // student optimistically so the button drops off the Today grid now; the
  // next loadData re-derives alreadyLogged straight from the sheet.
  todayStudents.forEach(function(t) {
    if (t.name === student.name && t.eventDate === student.eventDate) t.alreadyLogged = true;
  });
  if (data.hwSaved && hw) hw.saved = true;
  if (data.hwSaved) _logHwSaved(student.name, hw);
  addLog("lessonFeed", "✓ " + student.name + " — " + subject, "success");
  renderTodayGrid();
  // If this log came from the Home/student page, re-fetch that student's
  // detail so the Past section reflects the lesson just logged. Same hook
  // pattern as the Audit fix flow below.
  // Logged from the Import tab's Log lesson: redraw that student's list.
  // Only redraw their page if it's the one open (2026-10-17): started from a card
  // on the Students list, opening the page closed the Log window mid-save and the
  // Email window came seconds later from the backup path. On the list: redraw the cards.
  if (window._imLogActive && typeof _imOpenStudent === "function") {
    var _imName = window._imLogActive;
    window._imLogActive = null;
    if (_imOpen && _imKey(_imOpen) === _imKey(_imName)) _imOpenStudent(_imOpen);
    else if (!_imOpen && _imRoster && typeof _imRenderCards === "function") _imRenderCards(true);
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
  var ns = document.getElementById("btnNoShow");
  if (ns) {
    ns.disabled = !!(activeStudent && activeStudent.logged);
    ns.hidden = !!(activeStudent && (activeStudent.hwOnly || (activeStudent.student && activeStudent.student.calType === "trial")));
  }
  if (activeStudent && activeStudent.logged) return;
  var rowsOk = (activeStudent && activeStudent.hwOnly) || llValues(_logBox()).some(function(v) { return v; });
  var hwOk = !logHw || (!!logHw.choice && !logHw.loading && !logHw.uploading);
  // Import's docked box: HW can be answered after Log (Finish logging, 2026-10-06).
  // Not while Dropbox uploads either (user, 2026-10-19): Log only ticks here; it all saves once the upload and Finish are done.
  if (window._imDocked && logHw) hwOk = !logHw.loading;
  // One Log for the lesson and its HW (2026-10-18): both need something in them.
  if (window._imDocked && logHw && !(activeStudent && activeStudent.hwOnly)) hwOk = hwOk && !!_hwRowsJoin();
  document.getElementById("btnLog").disabled = !(rowsOk && hwOk);
  if (window._imDocked && typeof _imStepsRender === "function") _imStepsRender();
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
// Every lesson ends Sent, Nothing to send or Video (the sheet's Materials:
// Files / None / Video), asked here and saved with the lesson to the HW Log
// (HW Tracking sheet, backend RPM_HwLog.gs), with the HW given as text
// (What HW box, 2026-10-15; optional). The files are what's in the
// student's Dropbox that isn't on an earlier lesson's row yet; finding files
// picks Sent, finding none leaves No HW to press. Log stays locked until one
// is picked. Not asked for trials (their card has Send HW) or for lessons
// before HW_START (starting fresh).
var HW_START = "2026-10-03";
var logHw = null;   // { name, date, files:[{name,path,bytes,modified}], choice ('none' | 'sent' | null), filesOn, links:[{kind,url}], text, loading, locked, noFolder, seq }
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
  _logHwWireDrop();
  var date = _logHwDate(student);
  // The Trial card's Log lesson (student.trialEmail, 2026-10-23) has HW like a regular lesson.
  if (!student.trialEmail && (student.calType === "trial" || date < HW_START)) { logHw = null; box.style.display = "none"; return; }
  box.style.display = "";
  // mine: names of the files uploaded here this time (2026-10-07). Only those
  // (and a saved answer's files) list in the drop zone, not the rest of their Dropbox.
  logHw = { name: student.name, date: date, files: [], mine: {}, choice: null, filesOn: false, links: [], text: "", loading: true, locked: false };
  if (typeof _imHwLinkClear === "function") _imHwLinkClear();
  _hwMicStop();
  _hwRowsReset();
  var tm = document.getElementById("logHwMic"), ta = document.getElementById("logHwAddRow");
  if (tm) { tm.innerHTML = MIC_ICON; tm.classList.remove("rec"); }
  if (ta && !ta.querySelector("svg")) ta.innerHTML = llAddInner();
  _logHwExisting();
}

// Opening a lesson reads only the HW Tracking sheet (2026-10-07): was this
// lesson answered already? No Dropbox read; Dropbox is read only after files
// are dropped / browsed here (logHwCheck), for their paths.
function _logHwExisting() {
  var hw = logHw, seq = ++_logHwSeq;
  hw.loading = true; _logHwRender(); updateLogButton();
  function done() { if (logHw !== hw || seq !== _logHwSeq) return false; hw.loading = false; return true; }
  fetch(getScriptUrl() + "?action=getHwLog&name=" + encodeURIComponent(hw.name) + "&date=" + hw.date)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!done()) return;
      var ex = d.success && d.rows && d.rows[0];
      if (ex) {
        hw.saved = true;   // answered in the sheet already: show that answer and its files
        var have = {};
        hw.files.forEach(function(f) { have[f.path.toLowerCase()] = 1; });
        (ex.files || []).forEach(function(p) {
          if (!have[p.toLowerCase()]) hw.files.push({ name: p.split("/").pop(), path: p });
        });
        if (!hw.choice) _logHwRestore(hw, ex);
        _logHwTextFill(hw, ex.text);
      }
      _logHwRender(); updateLogButton();
    })
    .catch(function() { if (done()) { _logHwRender(); updateLogButton(); } });
}

// The HW list is a drop area (2026-10-06): files or folders dropped on it,
// or picked with Browse, upload to the student's Dropbox (uploadFilesToDropbox,
// core/api.js, wraps them in HW - OCT 6) and the list is read again, so Sent
// is ready.
function _logHwWireDrop() {
  var list = document.getElementById("logHwFiles");
  if (!list || list._wired) return;
  list._wired = true;
  function can() { return logHw && !logHw.locked && !logHw.noDbx; }   // drops work while the check runs (2026-10-07) and while uploading (queued, 2026-10-11)
  list.ondragover = function(ev) { if (!can()) return; ev.preventDefault(); list.classList.add("lh-drop-on"); };
  list.ondragleave = function() { list.classList.remove("lh-drop-on"); };
  list.ondrop = function(ev) {
    ev.preventDefault();
    list.classList.remove("lh-drop-on");
    if (!can() || !ev.dataTransfer) return;
    // Says so the moment they land (2026-10-17): reading a folder takes a moment.
    var hw = logHw;
    if (!hw.uploading) { hw.upMsg = "Reading files"; _logHwRender(); }
    collectDroppedFiles(ev.dataTransfer, function(files) {
      if (files.length) logHwUpload(files);
      else if (logHw === hw && !hw.uploading) { hw.upMsg = ""; _logHwRender(); }
    });
  };
}

// Clicking the drop zone picks files (not when clicking a listed file's name).
// Chrome's file pickers (2026-10-06) open where you were last time: the `id`
// makes Chrome remember that folder for this site, across restarts. Other
// browsers fall back to the plain file inputs.
var LOG_HW_PICKER = "rpm-hw";
// noDbx (2026-10-23): a trial without its Dropbox folder yet; an upload would make an unshared one.
function _logHwCan() { return logHw && !logHw.locked && !logHw.noDbx; }   // while uploading too: the next pick waits its turn (2026-10-11)
function logHwBrowse(ev) {
  if (!_logHwCan()) return;
  if (ev && ev.target && ev.target.closest && ev.target.closest(".db-file")) return;
  if (!window.showOpenFilePicker) { document.getElementById("logHwInput").click(); return; }
  window.showOpenFilePicker({ id: LOG_HW_PICKER, multiple: true })
    .then(function(handles) { return Promise.all(handles.map(function(h) { return h.getFile(); })); })
    .then(function(files) { if (files.length) logHwUpload(files); })
    .catch(function() {});   // cancelled
}
function logHwBrowseFolder() {
  if (!_logHwCan()) return;
  if (!window.showDirectoryPicker) { document.getElementById("logHwFolder").click(); return; }
  window.showDirectoryPicker({ id: LOG_HW_PICKER })
    .then(function(dir) { return _logHwWalk(dir, dir.name); })
    .then(function(files) { if (files.length) logHwUpload(files); })
    .catch(function() {});   // cancelled
}
// Every file in a picked folder, hidden ones skipped; _rpmPath keeps the
// structure ("Folder/sub/file.pdf"), as a dropped folder does.
function _logHwWalk(dir, prefix) {
  var out = [], subs = [];
  var it = dir.values();
  function next() {
    return it.next().then(function(r) {
      if (r.done) return;
      var h = r.value;
      if (h.name.charAt(0) === ".") return next();
      if (h.kind === "directory") { subs.push(_logHwWalk(h, prefix + "/" + h.name)); return next(); }
      return h.getFile().then(function(f) { f._rpmPath = prefix + "/" + h.name; out.push(f); return next(); });
    });
  }
  return next().then(function() { return Promise.all(subs); })
    .then(function(lists) { lists.forEach(function(l) { out = out.concat(l); }); return out; });
}
function logHwUploadFolder(input) {
  var files = Array.prototype.slice.call(input.files || []).filter(function(f) {
    return !f.webkitRelativePath.split("/").some(function(seg) { return seg.charAt(0) === "."; });
  });
  if (files.length) logHwUpload(files);
}

// A pick or drop while one is uploading waits in hw.queue and goes next
// (2026-10-11): no waiting for each folder before choosing the next.
function logHwUpload(fileList) {
  if (!logHw || logHw.locked || !fileList || !fileList.length) return;
  var hw = logHw;
  Array.prototype.forEach.call(fileList, function(f) { hw.mine[String(f.name).toLowerCase()] = 1; });
  hw.queue = hw.queue || [];
  hw.queue.push(Array.prototype.slice.call(fileList));
  if (!hw.uploading) _logHwUploadNext(hw);
}
function _logHwUploadNext(hw) {
  var files = hw.queue.shift(), list = document.getElementById("logHwFiles");
  hw.uploading = true; hw.upMsg = "Uploading"; _logHwRender(); updateLogButton();
  uploadFilesToDropbox(hw.name, files, {
    day: hw.date,   // the folder is the lesson's day, not the upload day
    onProgress: function(name, i, total) {
      var wait = hw.queue.length ? " · " + hw.queue.length + " more waiting" : "";
      hw.upMsg = "Uploading " + (i + 1) + "/" + total + ": " + name + wait;   // kept on hw: a redraw meanwhile shows it too (2026-10-17)
      if (logHw === hw && list) _logHwRender();
    },
    onDone: function(ok, fail, total) {
      if (logHw !== hw) { hw.uploading = false; return; }
      if (fail) addLog("lessonFeed", "⚠ " + fail + " of " + total + " file(s) didn't upload to " + hw.name + "'s Dropbox", "warn");
      if (hw.queue.length) { _logHwUploadNext(hw); return; }
      hw.uploading = false;
      hw.upMsg = "Checking Dropbox";   // till the new list is in, not "Drag files" again
      logHwCheck();   // the new files list
    }
  });
}

// ── Materials (2026-10-15): files (ticked by Send), video lesson links and
// web links, any mix; or Nothing to send, alone. choice: 'none', 'sent'
// (something goes) or null (not answered). videoOnly: an old "Video lesson"
// row, a video with no link. The sheet's Materials ("Files, Link", "None";
// before 2026-10-15 Sent / No HW / Video lesson) as the window's state:
function _logHwRestore(hw, ex) {
  var m = String((ex && ex.hw) || "");
  if (/^(None|No HW)$/.test(m)) { hw.choice = "none"; return; }
  hw.links = ((ex && ex.links) || []).slice();
  hw.filesOn = /Files|Sent/.test(m) && hw.files.length > 0;
  hw.videoOnly = /Video/.test(m) && !hw.links.some(function(l) { return l.kind === "Video"; });
  hw.phone = /Phone/.test(m);   // recorded on their phone (2026-10-18)
  _logHwRecalc(hw);
}
function _logHwRecalc(hw) {
  if (!hw || hw.choice === "none") return;
  // The Log lesson window has no Send (2026-10-15): files in the zone count.
  if (window._imDocked) hw.filesOn = hw.files.length > 0;
  hw.choice = hw.filesOn || hw.links.length || hw.videoOnly || hw.phone ? "sent" : null;
}
// The HW answer as query params; pre: "" for saveHw, "hw" for logLesson's names (hwFiles…).
function _logHwQuery(hw, pre) {
  var some = hw.choice === "sent";
  var files = some && hw.filesOn ? hw.files.map(function(f) { return f.path; }).join("\n") : "";
  var links = some ? hw.links.map(function(l) { return l.kind + ": " + l.url; }).join("\n") : "";
  var c = some && !files && !links && !hw.phone && hw.videoOnly ? "video" : hw.choice;
  function k(n) { return pre ? pre + n.charAt(0).toUpperCase() + n.slice(1) : n; }
  return "&hw=" + c + "&" + k("files") + "=" + encodeURIComponent(files) + "&" + k("links") + "=" + encodeURIComponent(links) +
    "&" + k("phone") + "=" + (some && hw.phone ? "1" : "") + "&hwText=" + encodeURIComponent(hw.text || "");
}

// ── What HW (2026-10-15): the homework given, rows like the lesson log's ──
// (Enter or ＋ adds one; joined with commas), with their own mic writing into
// the row you're in. Kept in logHw.text as you type; it goes to Google with
// the materials answer. A change, once you leave the rows, after that answer
// was ticked or saved counts as a new answer, so it saves again.
function _hwRowsBox() { return document.getElementById("logHwRows"); }
function _hwRowsJoin() { return llValues(_hwRowsBox()).filter(Boolean).join(", "); }
function _hwRowsReset() {
  var box = _hwRowsBox();
  if (!box) return;
  llWire(box, function(i) { llRows(box).forEach(function(el, j) { el.classList.toggle("active", j === i); }); },
    logHwTextInput, null);
  if (!box._hwOut) {
    box._hwOut = true;
    box.addEventListener("focusout", function(ev) {
      if (ev.relatedTarget && box.contains(ev.relatedTarget)) return;   // still in the rows
      logHwTextChanged();
    });
  }
  llReset(box);
}
function _logHwTextFill(hw, text) {
  var box = _hwRowsBox(), row = box && llRows(box)[0];
  if (!text || hw.text || _hwRowsJoin()) return;   // never over what's typed here
  hw.text = hw.textSaved = text;
  if (row) row.value = text;
}
function logHwTextInput() {
  if (logHw && _hwRowsBox()) logHw.text = _hwRowsJoin();
  if (logHw && _hwRowsBox() && typeof _imRowsPut === "function") _imRowsPut("hw", llValues(_hwRowsBox()));
  if (window._imDocked && activeStudent && !activeStudent.logged) updateLogButton();   // Log waits for HW too
}
// HW is required (2026-10-15): it counts as done once you leave the rows with
// something in them (textSaved), not on each key, so the window can't save
// and close while you're still typing.
function logHwTextChanged() {
  logHwTextInput();
  // Log lesson window (2026-10-18): HW ticks with the lesson when Log is pressed, not on leaving the rows
  // (after a No show it still ticks here).
  if (window._imDocked && activeStudent && !activeStudent.logged) return;
  if (!logHw || (logHw.text || "") === (logHw.textSaved || "")) return;
  logHw.textSaved = logHw.text;
  if (logHw.choice) logHw.dirty = true;   // else it goes with the materials answer when that's picked
  updateLogButton();
  if (window._imDocked && typeof _imStepsRender === "function") _imStepsRender();
}
var _hwRec = null;   // the What HW rows' dictation, apart from the log's
function _hwMicStop() { if (_hwRec) { var r = _hwRec; _hwRec = null; r.onend = null; r.abort(); } }
function toggleHwMic() {
  var box = _hwRowsBox(), mic = document.getElementById("logHwMic");
  if (!box || !mic || !logHw || logHw.locked || logHw.textLocked) return;
  if (_hwRec) { _hwRec.stop(); return; }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { _logState("Speech not supported. Use Chrome.", "var(--muted)"); return; }
  if (isRecording) { stopRecordingClean(); setRecordingUI(false, activeStudent && activeStudent.idx); updateLogButton(); }
  var row = box.querySelector(".ll-row.active") || llRows(box)[0];
  var r = _hwRec = new SR(), base = row.value.trim();
  r.lang = "en-US"; r.continuous = true; r.interimResults = true;
  r.onstart = function() { mic.innerHTML = MIC_STOP_ICON; mic.classList.add("rec"); playBeep(880, 100); };
  r.onresult = function(ev) {
    var fin = "", tmp = "";
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) fin += ev.results[i][0].transcript; else tmp += ev.results[i][0].transcript;
    }
    if (fin) base = (base + " " + fin).replace(/\s+/g, " ").trim();
    row.value = (base + " " + tmp).replace(/\s+/g, " ").trim();
    logHwTextInput();
  };
  r.onend = function() {
    if (_hwRec !== r) return;
    _hwRec = null;
    mic.innerHTML = MIC_ICON; mic.classList.remove("rec");
    playBeep(440, 80, 0.15);
    logHwTextChanged();
  };
  r.start();
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
      if (!hw.uploading) hw.upMsg = "";
      if (!d.success) { hw.error = d.message || "Couldn't read Dropbox"; hw.files = []; }
      else {
        hw.error = null;
        hw.noFolder = !!d.noFolder;
        // Only what was dropped / browsed here (2026-10-07): older files in
        // their Dropbox stay out of the zone, so it starts empty.
        hw.files = (d.files || []).filter(function(f) { return hw.mine[String(f.name || f.path.split("/").pop()).toLowerCase()]; });
        if (d.existing) {
          hw.saved = true;   // answered in the sheet already
          // Already answered for this lesson: show that answer, and keep its
          // files listed even if Dropbox has cleaned them out since.
          var have = {};
          hw.files.forEach(function(f) { have[f.path.toLowerCase()] = 1; });
          (d.existing.files || []).forEach(function(p) {
            if (!have[p.toLowerCase()]) hw.files.push({ name: p.split("/").pop(), path: p });
          });
          if (!hw.choice) _logHwRestore(hw, d.existing);
          _logHwTextFill(hw, d.existing.text);
        }
        // The Log lesson window waits for its Sent press (2026-10-11), so more can go in first.
        if (!hw.choice && hw.files.length && !window._imDocked) hw.filesOn = true;
        if (!hw.files.length) hw.filesOn = false;
        var was = hw.choice;
        _logHwRecalc(hw);
        if (window._imDocked && hw.choice === "sent" && (was !== "sent" || hw.filesOn)) hw.dirty = true;   // new files: save again
      }
      _logHwRender(); updateLogButton();
    })
    .catch(function() {
      if (logHw !== hw || seq !== _logHwSeq) return;
      hw.loading = false; hw.error = "No answer from Google";
      if (!hw.uploading) hw.upMsg = "";
      _logHwRender(); updateLogButton();
    });
}

function logHwPick(c) {
  if (!logHw || logHw.locked || logHw.loading) return;
  if (c === "sent" && !logHw.files.length) return;
  if (c === "none") { logHw.choice = "none"; logHw.filesOn = false; logHw.links = []; logHw.videoOnly = false; logHw.phone = false; }
  else { logHw.choice = null; logHw.filesOn = true; _logHwRecalc(logHw); }
  _logHwRender(); updateLogButton();
}

function _logHwRender() {
  var hw = logHw;
  var list = document.getElementById("logHwFiles");
  var sent = document.getElementById("logHwSent"), none = document.getElementById("logHwNone");
  if (!hw || !list) return;
  var dim = "<span style='color:var(--muted)'>";
  // The zone starts empty (2026-10-07): no "Checking Dropbox…" while it asks
  // whether this lesson was answered already; drops work meanwhile.
  // Reading / uploading / checking (2026-10-17): said in the zone the whole time, files so far above it.
  if (hw.noDbx) list.innerHTML = dim + "No Dropbox folder yet. Make it in step 2, Dropbox.</span>";
  else if (hw.upMsg) list.innerHTML = (hw.files.length ? _dbDetailsFilesHtml({ items: hw.files }) : "") + "<div class='lh-up-line'><span class='rpm-loading'>" + inqEsc(hw.upMsg) + "</span></div>";
  else if (hw.loading && !hw.files.length) list.innerHTML = dim + "⬆ Drag files or folders or browse</span>";
  else if (hw.loading) list.innerHTML = _dbDetailsFilesHtml({ items: hw.files }) + "<div class='lh-drop-more'><span class='link-btn'>⬆ Drop more here</span></div>";
  // Grey like the rest of the zone (2026-10-06, was amber), and says what to do.
  else if (hw.error) list.innerHTML = dim + "Couldn't check their Dropbox.</span>";
  else if (!hw.files.length) list.innerHTML = dim + (hw.noFolder ? "No Dropbox folder named " + inqEsc(hw.name) : "⬆ Drag files or folders or browse") + "</span>";
  else list.innerHTML = _dbDetailsFilesHtml({ items: hw.files }) + "<div class='lh-drop-more'><span class='link-btn'>⬆ Drop more here</span></div>";
  list.classList.toggle("lh-empty", !hw.error && !hw.files.length && !hw.upMsg);
  list.style.opacity = !hw.filesOn && hw.choice && hw.files.length ? ".4" : "";   // the files aren't this lesson's
  var n = hw.files.length;
  sent.querySelector("span").textContent = n ? "Sent · " + n + (n === 1 ? " file" : " files") : "Sent";
  sent.classList.toggle("done", !!hw.filesOn);
  none.classList.toggle("done", hw.choice === "none");
  sent.parentNode.classList.toggle("picked", !!hw.choice);
  sent.disabled = hw.locked || hw.loading || !n;
  none.disabled = hw.locked || hw.loading;
  // Nothing to send stands alone: it waits till nothing else is picked, and the rest wait while it's on.
  var busy = hw.loading || !!hw.uploading || !!hw.saving, none = hw.choice === "none";
  var nb = document.getElementById("logHwNothing");
  if (nb) { nb.classList.toggle("pressed", none); nb.disabled = busy || hw.choice === "sent"; }
  var sb = document.getElementById("logHwSentBtn");
  if (sb) { sb.classList.toggle("pressed", !!hw.filesOn); sb.disabled = busy || none || !n; }
  // A trial with no Dropbox folder yet (2026-10-23): Browse and Open wait too.
  var brb = document.querySelector(".lh-folder-btn"), dbb = document.getElementById("logHwDbxBtn");
  [brb, dbb].forEach(function(el) { if (el) el.disabled = !!hw.noDbx; });
  var pb = document.getElementById("logHwPhoneBtn");   // D. Recorded on their phone (2026-10-18)
  if (pb) { pb.classList.toggle("pressed", !!hw.phone); pb.disabled = busy || none || !!hw.locked; }
  // Video lesson link / Web link: the paste boxes wait while None is on; each list shows its links.
  ["Video", "Link"].forEach(function(kind) {
    var inp = document.getElementById("logHw" + kind + "Input"), add = document.getElementById("logHw" + kind + "AddBtn");
    if (inp) inp.disabled = busy || none || !!hw.locked;
    if (add) add.disabled = busy || none || !!hw.locked;
    var list = document.getElementById("logHw" + kind + "List");
    if (list) list.innerHTML = hw.links.map(function(l, i) {
      if (l.kind !== kind) return "";
      return "<div class='lh-link'><a href='" + inqEsc(l.url) + "' target='_blank' rel='noopener'>" + inqEsc(l.url) + "</a>" +
        (hw.locked ? "" : "<button type='button' class='lh-link-x' onclick='_imHwLinkDel(" + i + ")' aria-label='Remove'>×</button>") + "</div>";
    }).join("") + (kind === "Video" && hw.videoOnly ? "<div class='lh-link'><span class='lh-link-k'>Sent (no link saved)</span></div>" : "");
  });
  llRows(_hwRowsBox()).forEach(function(el) { el.disabled = !!hw.locked; });
  var tm = document.getElementById("logHwMic");
  if (tm) tm.disabled = !!(hw.locked || hw.textLocked);
  if (window._imDocked && typeof _imStepsRender === "function") _imStepsRender();
}

// Open (2026-10-11): today's HW folder (where uploads go, lessonFolderName)
// in the Dropbox app; their own folder while the zone is empty.
function logHwOpenDbx() {
  if (!logHw) return;
  openDropboxLocalFolder(logHw.files.length ? logHw.name + "/" + lessonFolderName(logHw.date) : logHw.name);
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
    _logHwQuery(hw, "");
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
  if (typeof _imHwSaved === "function") _imHwSaved(name);   // Import's Last HW
}
