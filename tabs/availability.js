// ─── TABS / AVAILABILITY.JS ─────────────────────────────────────────────────
// Student Availability tab. List students; click one to expand; edit
// Availability via text or mic, saved with the Log button.

var _availStudents = [];
var _availOpen = null; // currently expanded student row

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

// Same look as the Week tab: one .load-table panel, a highlighted header row, then
// one thin row per student. Clicking a row opens its edit panel underneath.
function _renderAvailabilityList() {
  var section = document.getElementById("availabilityList");
  section.innerHTML = "";
  section.classList.remove("load-table");
  if (!_availStudents.length) {
    section.innerHTML = '<div class="empty-state">No students found</div>';
    return;
  }
  section.classList.add("load-table");
  section.innerHTML =
    '<div class="load-row highlight"><div class="load-label">STUDENT AVAILABILITY</div>' +
    '<div class="load-label">UPDATED ON</div></div>';
  _availStudents.forEach(function(s) {
    var card = document.createElement("div");
    card.className = "avail-card";

    var header = document.createElement("div");
    header.className = "load-row avail-row";
    header.innerHTML =
      '<div class="avail-name">' + s.name + '</div>' +
      '<div class="load-label">' + (s.dateTaken || "Never") + '</div>';
    header.onclick = function() { _toggleAvailRow(s.row, card); };
    card.appendChild(header);

    section.appendChild(card);
  });
}

function _toggleAvailRow(row, card) {
  // Collapse other open rows
  if (_availOpen && _availOpen !== row) {
    var openCard = document.getElementById("availPanel-" + _availOpen);
    if (openCard) openCard.remove();
    _availOpen = null;
  }

  var existing = document.getElementById("availPanel-" + row);
  if (existing) { existing.remove(); _availOpen = null; return; }

  var s = _availStudents.filter(function(x) { return x.row === row; })[0];
  if (!s) return;

  var panel = document.createElement("div");
  panel.id = "availPanel-" + row;
  panel.style.cssText = "position:relative;padding:10px 12px;border-top:1px solid var(--border);background:rgba(0,0,0,0.2)";

  var availField = _buildAvailField("Availability", "availability", s);
  panel.appendChild(availField.wrap);

  // ✕ closes the panel without saving (stops the mic if it is on).
  var closeBtn = document.createElement("button");
  closeBtn.className = "avail-close";
  closeBtn.title = "Close without saving";
  closeBtn.textContent = "✕";
  closeBtn.onclick = function() {
    var rs = availField.recState;
    if (rs.recognizer && rs.recording) { rs.recognizer._suppressed = true; rs.recognizer.stop(); rs.recording = false; }
    panel.remove();
    _availOpen = null;
  };
  panel.appendChild(closeBtn);

  var logRow = document.createElement("div");
  logRow.style.cssText = "display:flex;justify-content:flex-end;margin-top:10px";
  var logBtn = document.createElement("button");
  logBtn.textContent = "Log";
  logBtn.style.cssText = "padding:6px 18px;font-size:12px;background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4);border-radius:4px;cursor:pointer";
  logBtn.onclick = function() {
    _availLog(s.row, availField.ta.value, logBtn, availField.recState);
  };
  logRow.appendChild(logBtn);
  panel.appendChild(logRow);

  card.appendChild(panel);
  _availOpen = row;
}

function _buildAvailField(label, type, student) {
  var wrap = document.createElement("div");
  wrap.style.cssText = "margin:8px 0";

  var hdr = document.createElement("div");
  hdr.style.cssText = "font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px";
  hdr.textContent = label;
  wrap.appendChild(hdr);

  var row = document.createElement("div");
  row.style.cssText = "display:flex;gap:6px;align-items:flex-start";

  var ta = document.createElement("textarea");
  ta.rows = 3;
  ta.style.cssText = "flex:1;padding:6px 8px;background:var(--bg);color:var(--muted);border:1px solid var(--border);border-radius:4px;font-size:12px;font-family:inherit;resize:vertical";
  ta.value = student[type] || "";
  row.appendChild(ta);

  var micBtn = document.createElement("button");
  micBtn.innerHTML = MIC_ICON;
  micBtn.title = "Dictate";
  micBtn.style.cssText = "padding:6px 10px;font-size:14px;background:transparent;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--muted);flex-shrink:0";
  var recState = { recording: false, recognizer: null };
  micBtn.onclick = function() { _availToggleMic(ta, micBtn, recState); };
  row.appendChild(micBtn);

  wrap.appendChild(row);
  return { wrap: wrap, ta: ta, recState: recState };
}

function _availToggleMic(textarea, btn, state) {
  if (state.recording) {
    if (state.recognizer) { state.recognizer._suppressed = true; state.recognizer.stop(); }
    state.recording = false;
    btn.innerHTML = MIC_ICON; btn.style.background = "transparent";
    return;
  }
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addLog("availFeed", "Speech recognition not supported (use Chrome)", "error");
    return;
  }
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = new Rec();
  rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
  rec._finalText = textarea.value ? (textarea.value + " ") : "";
  rec._suppressed = false;
  rec.onstart = function() {
    state.recording = true;
    btn.innerHTML = MIC_STOP_ICON; btn.style.background = "rgba(255,80,80,0.2)";
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
    btn.innerHTML = MIC_ICON; btn.style.background = "transparent";
  };
  rec.onerror = function(e) {
    if (e.error === "no-speech") return;
    state.recording = false;
    btn.innerHTML = MIC_ICON; btn.style.background = "transparent";
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
  var orig = btn.textContent;
  btn.textContent = "..."; btn.disabled = true;

  callScript(url, "setAvailabilityField", { row: row, type: "availability", value: availability }, function(a) {
    if (!a || !a.success) {
      btn.textContent = orig; btn.disabled = false;
      addLog("availFeed", "❌ availability save failed: " + (a && a.message ? a.message : "?"), "error");
      return;
    }
    btn.textContent = "✓ Logged";
    btn.style.background = "rgba(0,200,100,0.3)";
    addLog("availFeed", "✓ Saved for row " + row + " (" + (a.dateTaken || "now") + ")", "success");
    _availStudents.forEach(function(s) {
      if (s.row === row) {
        s.availability = availability;
        s.dateTaken = a.dateTaken || s.dateTaken;
      }
    });
    setTimeout(function() {
      _availOpen = null;
      _renderAvailabilityList();
    }, 700);
  });
}
