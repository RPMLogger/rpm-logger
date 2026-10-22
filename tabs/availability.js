// ─── TABS / AVAILABILITY.JS ─────────────────────────────────────────────────
// Student Availability tab. List students; click one to expand; edit
// Availability via text or mic, saved with the Log button.

var _availStudents = [];

function initAvailabilityTab() {
  var section = document.getElementById("availabilityList");
  if (!section) return;
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + "?action=getAvailability")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      _availStudents = data.students || [];
      _renderAvailabilityList();
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

// Terminate's card look (2026-10-22): one card per student, name left, the
// date it was last updated right. Clicking a card opens it in place with the
// Availability box and Save under it; one card open at a time (user 2026-10-22).
function _renderAvailabilityList() {
  var section = document.getElementById("availabilityList");
  section.classList.remove("load-table");
  if (!_availStudents.length) {
    section.innerHTML = '<div class="empty-state">None</div>';
    return;
  }
  section.innerHTML = _availStudents.map(function(s) {
    return '<div class="en-card" id="avC-' + s.row + '">' +
      '<div class="en-card-head" onclick="_toggleAvailRow(' + s.row + ')">' +
        '<span class="en-card-n">' + s.name + '</span>' +
        '<span class="en-card-r"><span class="en-card-a' + (s.dateTaken ? '' : ' av-never') + '">' + (s.dateTaken || "Never") + '</span>' +
        '<span class="en-card-a" id="avA-' + s.row + '">▾</span></span>' +
      '</div>' +
      '<div class="en-card-body" id="avB-' + s.row + '" style="display:none"></div>' +
    '</div>';
  }).join('');
}

function _toggleAvailRow(row) {
  var card = document.getElementById("avC-" + row), box = document.getElementById("avB-" + row), arrow = document.getElementById("avA-" + row);
  if (!card || !box) return;
  var open = box.style.display === "none";
  // Opening one closes whichever other card is open.
  if (open) document.querySelectorAll("#availabilityList .en-card.open").forEach(function(c) {
    if (c !== card) _toggleAvailRow(+c.id.slice(4));
  });
  box.style.display = open ? "block" : "none";
  card.classList.toggle("open", open);
  if (arrow) arrow.textContent = open ? "▴" : "▾";
  if (!open) {
    // Closing stops the mic if it is on; the text stays until the tab reloads.
    var rs = box._recState;
    if (rs && rs.recognizer && rs.recording) { rs.recognizer._suppressed = true; rs.recognizer.stop(); rs.recording = false; }
    return;
  }
  if (box.innerHTML) return;

  var s = _availStudents.filter(function(x) { return x.row === row; })[0];
  if (!s) return;

  var availField = _buildAvailField("Availability", "availability", s);
  box.appendChild(availField.wrap);
  box._recState = availField.recState;

  // The Log lesson window's look: the field with the mic inside it, then a
  // plain Save under it on the right (user 2026-10-22).
  var foot = document.createElement("div");
  foot.className = "av-foot";
  foot.innerHTML = '<span class="av-status"></span>';
  var saveBtn = document.createElement("button");
  saveBtn.className = "link-btn bright";
  saveBtn.textContent = "Save";
  saveBtn.setAttribute("data-tip", "Saves to the sheet with today's date.");
  saveBtn.setAttribute("data-tip-left", "");
  saveBtn.onclick = function() {
    availField.ta.value = _avSentence(availField.ta.value);
    _availLog(s.row, availField.ta.value, saveBtn, availField.recState);
  };
  foot.appendChild(saveBtn);
  box.appendChild(foot);
}

function _buildAvailField(label, type, student) {
  var wrap = document.createElement("div");
  wrap.className = "ll-wrap av-field";

  var ta = document.createElement("textarea");
  ta.rows = 2;
  ta.className = "rpm-field av-ta";
  ta.placeholder = label;
  ta.value = _avSentence(student[type]);
  wrap.appendChild(ta);

  var micBtn = document.createElement("button");
  micBtn.type = "button";
  micBtn.className = "link-btn tl-mic";
  micBtn.innerHTML = MIC_ICON;
  micBtn.setAttribute("data-tip", "Starts or stops dictation.");
  micBtn.setAttribute("data-tip-left", "");
  var recState = { recording: false, recognizer: null };
  micBtn.onclick = function() { _availToggleMic(ta, micBtn, recState); };
  wrap.appendChild(micBtn);

  return { wrap: wrap, ta: ta, recState: recState };
}

// Sentence case (user 2026-10-22: the sheet's Title Case read weird): all
// lower case, day names capitalised, then the lesson logs' toSentenceCase.
function _avSentence(str) {
  var t = String(str || "").toLowerCase().replace(/\b(mon|tues|wednes|thurs|fri|satur|sun)(day)?s?\b/g, function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  return toSentenceCase(t);
}

function _availToggleMic(textarea, btn, state) {
  if (state.recording) {
    if (state.recognizer) { state.recognizer._suppressed = true; state.recognizer.stop(); }
    state.recording = false;
    btn.innerHTML = MIC_ICON; btn.classList.remove("rec");
    return;
  }
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addLog("availFeed", "Speech recognition not supported (use Chrome)", "error");
    return;
  }
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = new Rec();
  rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
  // Dictation starts a fresh entry: the mic clears the box (user 2026-10-22).
  rec._finalText = "";
  textarea.value = "";
  rec._suppressed = false;
  rec.onstart = function() {
    state.recording = true;
    btn.innerHTML = MIC_STOP_ICON; btn.classList.add("rec");
  };
  rec.onresult = function(ev) {
    var interim = "";
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) rec._finalText += ev.results[i][0].transcript;
      else interim += ev.results[i][0].transcript;
    }
    textarea.value = (rec._finalText + interim).trim();
  };
  rec.onend = function() {
    if (rec._suppressed) return;
    state.recording = false;
    btn.innerHTML = MIC_ICON; btn.classList.remove("rec");
  };
  rec.onerror = function(e) {
    if (e.error === "no-speech") return;
    state.recording = false;
    btn.innerHTML = MIC_ICON; btn.classList.remove("rec");
  };
  state.recognizer = rec;
  rec.start();
}

// Saves Availability only. The sheet's Notes column (D) is no longer edited from
// the portal; whatever is already there is left alone.
function _availLog(row, availability, btn, recState) {
  if (recState && recState.recognizer && recState.recording) {
    recState.recognizer._suppressed = true; recState.recognizer.stop(); recState.recording = false;
  }
  var url = getScriptUrl(); if (!url) return;
  // Saving (user 2026-10-22): the whole page dims, Save too, and the
  // portal's spinning ring says Saving in the middle of the screen.
  // Success says nothing more than "✓ Saved".
  var panel = document.getElementById("tab-availability");
  var status = btn.parentNode.querySelector(".av-status");
  var orig = btn.textContent;
  if (status) status.innerHTML = "";
  btn.disabled = true;
  if (panel) {
    panel.classList.add("av-saving");
    var msg = document.createElement("div");
    msg.className = "av-saving-msg";
    msg.innerHTML = '<span class="rpm-loading">Saving</span>';
    panel.appendChild(msg);
  }

  callScript(url, "setAvailabilityField", { row: row, type: "availability", value: availability }, function(a) {
    if (panel) {
      panel.classList.remove("av-saving");
      var m = panel.querySelector(".av-saving-msg");
      if (m) m.remove();
    }
    if (!a || !a.success) {
      btn.textContent = orig; btn.disabled = false;
      if (status) rpmFail(status, (a && a.message) || "Could not reach the portal.", "left");
      return;
    }
    btn.textContent = "✓ Saved";
    _availStudents.forEach(function(s) {
      if (s.row === row) {
        s.availability = availability;
        s.dateTaken = a.dateTaken || s.dateTaken;
      }
    });
    setTimeout(function() { _renderAvailabilityList(); }, 700);
  });
}
