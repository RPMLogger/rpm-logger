// ─── TABS / AVAILABILITY.JS ─────────────────────────────────────────────────
// Student Availability tab. List students; click one to expand; edit
// Availability + Notes via text or mic; each field has its own Log button.

var _availStudents = [];
var _availOpen = null; // currently expanded student row

function initAvailabilityTab() {
  var section = document.getElementById("availabilityList");
  if (!section) return;
  section.innerHTML = '<div class="empty-state">Loading...</div>';
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

function _renderAvailabilityList() {
  var section = document.getElementById("availabilityList");
  section.innerHTML = "";
  if (!_availStudents.length) {
    section.innerHTML = '<div class="empty-state">No students found</div>';
    return;
  }
  _availStudents.forEach(function(s) {
    var card = document.createElement("div");
    card.style.cssText = "border:1px solid var(--border);border-radius:6px;margin-bottom:6px;background:var(--panel);overflow:hidden";

    var header = document.createElement("div");
    header.style.cssText = "padding:10px 12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center";
    header.innerHTML =
      "<span style=\"font-weight:600;font-size:13px\">" + s.name + "</span>" +
      "<span style=\"font-size:10px;color:var(--muted)\">" + (s.dateTaken ? "Updated " + s.dateTaken : "Never updated") + "</span>";
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
  panel.style.cssText = "padding:10px 12px;border-top:1px solid var(--border);background:rgba(0,0,0,0.2)";

  panel.appendChild(_buildAvailField("Availability", "availability", s));
  panel.appendChild(_buildAvailField("Notes", "notes", s));

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
  ta.style.cssText = "flex:1;padding:6px 8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:12px;font-family:inherit;resize:vertical";
  ta.value = student[type] || "";
  row.appendChild(ta);

  var micBtn = document.createElement("button");
  micBtn.textContent = "🎤";
  micBtn.title = "Dictate";
  micBtn.style.cssText = "padding:6px 10px;font-size:14px;background:transparent;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text);flex-shrink:0";
  var recState = { recording: false, recognizer: null };
  micBtn.onclick = function() { _availToggleMic(ta, micBtn, recState); };
  row.appendChild(micBtn);

  var logBtn = document.createElement("button");
  logBtn.textContent = "Log";
  logBtn.style.cssText = "padding:6px 14px;font-size:12px;background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4);border-radius:4px;cursor:pointer;flex-shrink:0";
  logBtn.onclick = function() { _availLog(student.row, type, ta.value, logBtn, recState); };
  row.appendChild(logBtn);

  wrap.appendChild(row);
  return wrap;
}

function _availToggleMic(textarea, btn, state) {
  if (state.recording) {
    if (state.recognizer) { state.recognizer._suppressed = true; state.recognizer.stop(); }
    state.recording = false;
    btn.textContent = "🎤"; btn.style.background = "transparent";
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
    btn.textContent = "⏹"; btn.style.background = "rgba(255,80,80,0.2)";
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
    btn.textContent = "🎤"; btn.style.background = "transparent";
  };
  rec.onerror = function(e) {
    if (e.error === "no-speech") return;
    state.recording = false;
    btn.textContent = "🎤"; btn.style.background = "transparent";
  };
  state.recognizer = rec;
  rec.start();
}

function _availLog(row, type, value, btn, recState) {
  if (recState && recState.recognizer && recState.recording) {
    recState.recognizer._suppressed = true; recState.recognizer.stop();
    recState.recording = false;
  }
  var url = getScriptUrl(); if (!url) return;
  var orig = btn.textContent;
  btn.textContent = "..."; btn.disabled = true;
  callScript(url, "setAvailabilityField", {
    row: row, type: type, value: value
  }, function(data) {
    if (data && data.success) {
      btn.textContent = "✓ Logged";
      btn.style.background = "rgba(0,200,100,0.3)";
      addLog("availFeed", "✓ " + type + " saved for row " + row + " (" + (data.dateTaken || "now") + ")", "success");
      // Update local cache so future toggles show fresh data
      _availStudents.forEach(function(s) {
        if (s.row === row) { s[type] = value; s.dateTaken = data.dateTaken || s.dateTaken; }
      });
      // Update the header timestamp without re-rendering whole list
      setTimeout(function() {
        btn.textContent = orig; btn.disabled = false;
        btn.style.background = "rgba(0,200,100,0.15)";
        _renderAvailabilityList();
        // Re-expand the same row so user can keep editing
        var stillThere = _availStudents.filter(function(x) { return x.row === row; })[0];
        if (stillThere) {
          var card = document.getElementById("availabilityList").querySelectorAll("div")[
            _availStudents.indexOf(stillThere) * 1 // pick the card by index
          ];
          // simpler: re-find and toggle
          var cards = document.getElementById("availabilityList").children;
          var idx = _availStudents.indexOf(stillThere);
          if (cards[idx]) _toggleAvailRow(row, cards[idx]);
        }
      }, 800);
    } else {
      btn.textContent = orig; btn.disabled = false;
      addLog("availFeed", "❌ " + (data && data.message ? data.message : "Save failed"), "error");
    }
  });
}
