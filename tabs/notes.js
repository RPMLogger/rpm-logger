// ─── TABS / NOTES.JS ────────────────────────────────────────────────────────
// Personal running notes. Same 3-row mic recording pattern as To-Do, joined
// with " - " into one note on submit.

var _notesCache  = [];
var _notesActive = 0;
var _notesFinals = ["", "", ""];
var _notesRec    = null;
var _notesIsRec  = false;

function initNotesTab() {
  var section = document.getElementById("notesContent");
  if (!section) return;
  if (section.dataset.built !== "1") {
    section.innerHTML =
      '<div id="notesPanel" style="display:none;border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:14px;background:var(--panel)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">New Note</div>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<div id="notesStatus" style="font-size:11px;color:var(--muted)">tap row to record</div>' +
            '<button id="notesClose" title="Close" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;line-height:1;padding:0 2px">✕</button>' +
          '</div>' +
        '</div>' +
        _notesRowHtml(0, "Tap to start recording...") +
        _notesRowHtml(1, "Row 2 — tap to continue here") +
        _notesRowHtml(2, "Row 3 — tap to continue here") +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button id="notesMic" title="Toggle mic (captures selection)" style="padding:6px 12px;font-size:14px;background:transparent;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text)">🎤</button>' +
          '<button id="notesLog" style="flex:1;padding:8px;font-size:13px;background:rgba(180,40,40,0.25);color:#ff6b6b;border:1px solid rgba(180,40,40,0.5);border-radius:4px;cursor:pointer;letter-spacing:0.5px">LOG IT →</button>' +
        '</div>' +
      '</div>' +
      '<div id="notesList"></div>' +
      '<div class="log-feed" id="notesFeed"></div>' +
      '<div style="margin-top:14px;display:flex;justify-content:center">' +
        '<button id="notesAddBtn" style="padding:10px 18px;font-size:13px;background:rgba(180,40,40,0.18);color:#ff6b6b;border:1px solid rgba(180,40,40,0.45);border-radius:6px;cursor:pointer;letter-spacing:0.5px">+ New Note</button>' +
      '</div>';
    section.dataset.built = "1";

    for (var r = 0; r < 3; r++) {
      (function(idx) {
        var input = document.getElementById("notesRowInput-" + idx);
        var wrap  = document.getElementById("notesRow-" + idx);
        var rowClickHandler = function() {
          var prevActive = _notesActive;
          var wasRec = _notesIsRec;
          _notesSetActive(idx);
          if (wasRec && idx !== prevActive) {
            if (_notesRec) { _notesRec._suppressed = true; _notesRec.stop(); }
            _notesIsRec = false;
            _notesStartRec();
          } else if (!_notesIsRec) {
            _notesStartRec();
          }
        };
        wrap.onclick = rowClickHandler;
        input.addEventListener("focus", rowClickHandler);
        input.addEventListener("input", function() {
          _notesFinals[idx] = input.value;
          _notesUpdateLogBtn();
        });
      })(r);
    }

    document.getElementById("notesMic").onclick = _notesToggleMic;
    document.getElementById("notesLog").onclick = _notesSubmit;
    document.getElementById("notesAddBtn").onclick = _notesOpenPanel;
    document.getElementById("notesClose").onclick = _notesClosePanel;
    _notesSetActive(0);
  }
  _loadNotes();
}

function _notesOpenPanel() {
  var p = document.getElementById("notesPanel");
  var b = document.getElementById("notesAddBtn");
  if (p) p.style.display = "block";
  if (b) b.style.display = "none";
  var inp = document.getElementById("notesRowInput-0");
  if (inp) inp.focus();
}

function _notesClosePanel() {
  if (_notesIsRec && _notesRec) { _notesRec._suppressed = true; _notesRec.stop(); _notesIsRec = false; }
  _notesResetRows();
  _notesResetMicStyle();
  document.getElementById("notesStatus").textContent = "tap row to record";
  var p = document.getElementById("notesPanel");
  var b = document.getElementById("notesAddBtn");
  if (p) p.style.display = "none";
  if (b) b.style.display = "";
}

function _notesRowHtml(idx, placeholder) {
  return '<div id="notesRow-' + idx + '" style="display:flex;align-items:stretch;border:1px solid var(--border);border-left:3px solid transparent;border-radius:4px;margin:4px 0;cursor:pointer">' +
    '<input id="notesRowInput-' + idx + '" type="text" placeholder="' + placeholder + '" style="flex:1;padding:8px 10px;background:transparent;color:var(--text);border:none;font-size:12px;font-family:inherit;outline:none">' +
    '</div>';
}

function _notesSetActive(idx) {
  if (idx === _notesActive) { _notesApplyActiveStyle(); return; }
  var oldInp = document.getElementById("notesRowInput-" + _notesActive);
  if (oldInp) _notesFinals[_notesActive] = oldInp.value;
  _notesActive = idx;
  _notesApplyActiveStyle();
}

function _notesApplyActiveStyle() {
  for (var r = 0; r < 3; r++) {
    var row = document.getElementById("notesRow-" + r);
    if (!row) continue;
    if (r === _notesActive) {
      row.style.borderLeftColor = _notesIsRec ? "#ff5050" : "var(--green)";
      row.style.background = _notesIsRec ? "rgba(255,80,80,0.05)" : "rgba(0,200,100,0.04)";
    } else {
      row.style.borderLeftColor = "transparent";
      row.style.background = "transparent";
    }
  }
}

function _notesResetMicStyle() {
  var mic = document.getElementById("notesMic");
  if (!mic) return;
  mic.textContent = "🎤";
  mic.style.background = "transparent";
  mic.style.borderColor = "var(--border)";
  mic.style.color = "var(--text)";
}

function _notesStartRec() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addLog("notesFeed", "Speech recognition not supported (use Chrome)", "error");
    return;
  }
  if (_notesRec) { try { _notesRec._suppressed = true; _notesRec.stop(); } catch (e) {} }
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = new Rec();
  rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
  rec._suppressed = false;

  var activeInput = document.getElementById("notesRowInput-" + _notesActive);
  var selStart = activeInput ? activeInput.selectionStart : 0;
  var selEnd   = activeInput ? activeInput.selectionEnd   : 0;
  var hasSelection = activeInput && (selStart !== selEnd);
  var beforeSel = hasSelection ? activeInput.value.substring(0, selStart) : "";
  var afterSel  = hasSelection ? activeInput.value.substring(selEnd) : "";
  rec._spliced = "";

  rec.onstart = function() {
    _notesIsRec = true;
    document.getElementById("notesStatus").innerHTML = '<span style="color:#ff5050">● RECORDING...</span>';
    var mic = document.getElementById("notesMic");
    mic.textContent = "⏹";
    mic.style.background = "rgba(255,80,80,0.2)";
    mic.style.borderColor = "rgba(255,80,80,0.5)";
    mic.style.color = "#ff5050";
    _notesApplyActiveStyle();
  };
  rec.onresult = function(ev) {
    var newFinal = "", interim = "";
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) newFinal += ev.results[i][0].transcript;
      else interim += ev.results[i][0].transcript;
    }
    var inp = document.getElementById("notesRowInput-" + _notesActive);
    if (!inp) return;
    if (hasSelection) {
      if (newFinal) rec._spliced = (rec._spliced + " " + newFinal).replace(/\s+/g, " ").trim();
      var middle = (rec._spliced + " " + interim).replace(/\s+/g, " ").trim();
      inp.value = (beforeSel + (beforeSel && middle ? " " : "") + middle + (afterSel && middle ? " " : "") + afterSel).replace(/\s+/g, " ").trimRight();
      _notesFinals[_notesActive] = inp.value;
    } else {
      if (newFinal) _notesFinals[_notesActive] = (_notesFinals[_notesActive] + " " + newFinal).replace(/\s+/g, " ").trim();
      inp.value = (_notesFinals[_notesActive] + " " + interim).replace(/\s+/g, " ").trim();
    }
    _notesUpdateLogBtn();
  };
  rec.onend = function() {
    if (rec._suppressed) return;
    _notesIsRec = false;
    document.getElementById("notesStatus").textContent = "tap a row to record";
    _notesResetMicStyle();
    _notesApplyActiveStyle();
  };
  rec.onerror = function(e) {
    if (e.error === "no-speech") return;
    _notesIsRec = false;
    _notesResetMicStyle();
    _notesApplyActiveStyle();
  };
  _notesRec = rec;
  rec.start();
}

function _notesToggleMic() {
  if (_notesIsRec) {
    if (_notesRec) { _notesRec._suppressed = true; _notesRec.stop(); }
    _notesIsRec = false;
    document.getElementById("notesStatus").textContent = "tap a row to record";
    _notesResetMicStyle();
    _notesApplyActiveStyle();
  } else {
    _notesStartRec();
  }
}

function _notesUpdateLogBtn() {
  var any = false;
  for (var r = 0; r < 3; r++) {
    var inp = document.getElementById("notesRowInput-" + r);
    if (inp && inp.value.trim()) { any = true; break; }
  }
  document.getElementById("notesLog").disabled = !any;
  document.getElementById("notesLog").style.opacity = any ? "1" : "0.5";
}

function _notesSubmit() {
  var url = getScriptUrl(); if (!url) return;
  if (_notesIsRec && _notesRec) { _notesRec._suppressed = true; _notesRec.stop(); _notesIsRec = false; }

  var parts = [];
  for (var r = 0; r < 3; r++) {
    var v = document.getElementById("notesRowInput-" + r).value.trim();
    if (v) parts.push(v);
  }
  var note = parts.join(" - ");
  if (!note) return;

  var btn = document.getElementById("notesLog");
  var orig = btn.textContent;
  btn.textContent = "Logging..."; btn.disabled = true;

  callScript(url, "addNote", { note: note }, function(data) {
    btn.textContent = orig; btn.disabled = false;
    if (data && data.success) {
      _notesClosePanel();
      _loadNotes();
    } else {
      addLog("notesFeed", "❌ " + (data && data.message ? data.message : "Add failed"), "error");
    }
  });
}

function _notesResetRows() {
  _notesFinals = ["", "", ""];
  for (var r = 0; r < 3; r++) {
    var inp = document.getElementById("notesRowInput-" + r);
    if (inp) inp.value = "";
  }
  _notesActive = 0;
  _notesApplyActiveStyle();
  _notesUpdateLogBtn();
}

// ─── LIST RENDERING ────────────────────────────────────────────────────────
function _loadNotes() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getNotes")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        document.getElementById("notesList").innerHTML = '<div class="empty-state">Error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      _notesCache = data.notes || [];
      _renderNotes();
    })
    .catch(function() {
      document.getElementById("notesList").innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function _renderNotes() {
  var section = document.getElementById("notesList");
  section.innerHTML = "";
  if (!_notesCache.length) {
    section.innerHTML = '<div class="empty-state" style="padding:12px">No notes yet</div>';
    return;
  }
  // Newest first
  var sorted = _notesCache.slice().reverse();
  sorted.forEach(function(n, i) { section.appendChild(_notesListRow(n, i + 1)); });
}

function _notesListRow(n, num) {
  var row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:flex-start;gap:8px;padding:6px 4px;border-bottom:1px dashed rgba(255,255,255,0.05)";

  var numEl = document.createElement("div");
  numEl.style.cssText = "font-size:11px;color:var(--muted);min-width:22px;flex-shrink:0;text-align:right";
  numEl.textContent = (num || "") + ".";
  row.appendChild(numEl);

  var text = document.createElement("div");
  text.style.cssText = "flex:1;font-size:12px;color:var(--text);white-space:pre-wrap;word-break:break-word";
  text.textContent = n.text;
  row.appendChild(text);

  var meta = document.createElement("div");
  meta.style.cssText = "font-size:10px;color:var(--muted);flex-shrink:0;text-align:right;min-width:80px";
  meta.textContent = n.created || "";
  row.appendChild(meta);

  var del = document.createElement("button");
  del.textContent = "×";
  del.title = "Delete";
  del.style.cssText = "padding:0 8px;font-size:14px;background:transparent;color:var(--muted);border:none;cursor:pointer;flex-shrink:0";
  del.onclick = function() {
    if (!confirm("Delete this note?")) return;
    _notesDelete(n.row);
  };
  row.appendChild(del);

  return row;
}

function _notesDelete(row) {
  var url = getScriptUrl(); if (!url) return;
  callScript(url, "deleteNote", { row: row }, function(data) {
    if (data && data.success) {
      _loadNotes();
    } else {
      addLog("notesFeed", "❌ " + (data && data.message ? data.message : "Delete failed"), "error");
    }
  });
}
