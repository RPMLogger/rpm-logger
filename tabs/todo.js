// ─── TABS / TODO.JS ─────────────────────────────────────────────────────────
// Personal to-do list. 3-row recording panel (same pattern as Lessons): tap a
// row to make it active, mic dictates into the active row, LOG IT submits each
// non-empty row as a separate task.

var _todoCache    = [];
var _todoActive   = 0;        // active row index (0/1/2)
var _todoFinals   = ["", "", ""];
var _todoRec      = null;     // SpeechRecognition instance
var _todoIsRec    = false;

function initTodoTab() {
  var section = document.getElementById("todoContent");
  if (!section) return;
  if (section.dataset.built !== "1") {
    section.innerHTML =
      '<div id="todoPanel" style="border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:14px;background:var(--panel)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">New To-Dos</div>' +
          '<div id="todoStatus" style="font-size:11px;color:var(--muted)">tap row to record</div>' +
        '</div>' +
        _todoRowHtml(0, "Tap to start recording...") +
        _todoRowHtml(1, "Row 2 — tap to continue here") +
        _todoRowHtml(2, "Row 3 — tap to continue here") +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button id="todoMic" title="Stop recording" style="display:none;padding:6px 12px;font-size:14px;background:rgba(255,80,80,0.2);border:1px solid rgba(255,80,80,0.5);border-radius:4px;cursor:pointer;color:#ff5050">⏹</button>' +
          '<button id="todoLog" style="flex:1;padding:8px;font-size:13px;background:rgba(180,40,40,0.25);color:#ff6b6b;border:1px solid rgba(180,40,40,0.5);border-radius:4px;cursor:pointer;letter-spacing:0.5px">LOG IT →</button>' +
        '</div>' +
      '</div>' +
      '<div id="todoActive"></div>' +
      '<div id="todoDoneWrap" style="margin-top:18px"></div>' +
      '<div class="log-feed" id="todoFeed"></div>';
    section.dataset.built = "1";

    for (var r = 0; r < 3; r++) {
      (function(idx) {
        var input = document.getElementById("todoRowInput-" + idx);
        var wrap  = document.getElementById("todoRow-" + idx);
        var rowClickHandler = function() {
          var prevActive = _todoActive;
          var wasRec = _todoIsRec;
          _todoSetActive(idx);
          if (wasRec && idx !== prevActive) {
            // Switching mid-recording — stop current recognizer cleanly
            // so any pending audio doesn't bleed into the new row, then
            // start a fresh recognizer for the new row.
            if (_todoRec) { _todoRec._suppressed = true; _todoRec.stop(); }
            _todoIsRec = false;
            _todoStartRec();
          } else if (!_todoIsRec) {
            _todoStartRec();
          }
        };
        wrap.onclick = rowClickHandler;
        input.addEventListener("focus", rowClickHandler);
        input.addEventListener("input", function() {
          _todoFinals[idx] = input.value;
          _todoUpdateLogBtn();
        });
      })(r);
    }

    document.getElementById("todoMic").onclick = _todoToggleMic;
    document.getElementById("todoLog").onclick = _todoSubmitAll;
    _todoSetActive(0);
  }
  _loadTodos();
}

function _todoRowHtml(idx, placeholder) {
  return '<div id="todoRow-' + idx + '" class="todo-rec-row" style="display:flex;align-items:stretch;border:1px solid var(--border);border-left:3px solid transparent;border-radius:4px;margin:4px 0;cursor:pointer">' +
    '<input id="todoRowInput-' + idx + '" type="text" placeholder="' + placeholder + '" style="flex:1;padding:8px 10px;background:transparent;color:var(--text);border:none;font-size:12px;font-family:inherit;outline:none">' +
    '</div>';
}

function _todoSetActive(idx) {
  if (idx === _todoActive) {
    // ensure highlight in case rows were re-styled
    _todoApplyActiveStyle();
    return;
  }
  // preserve current value before switching
  var oldInp = document.getElementById("todoRowInput-" + _todoActive);
  if (oldInp) _todoFinals[_todoActive] = oldInp.value;
  _todoActive = idx;
  _todoApplyActiveStyle();
}

function _todoApplyActiveStyle() {
  for (var r = 0; r < 3; r++) {
    var row = document.getElementById("todoRow-" + r);
    if (!row) continue;
    if (r === _todoActive) {
      row.style.borderLeftColor = _todoIsRec ? "#ff5050" : "var(--green)";
      row.style.background = _todoIsRec ? "rgba(255,80,80,0.05)" : "rgba(0,200,100,0.04)";
    } else {
      row.style.borderLeftColor = "transparent";
      row.style.background = "transparent";
    }
  }
}

function _todoStartRec() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addLog("todoFeed", "Speech recognition not supported (use Chrome)", "error");
    return;
  }
  if (_todoRec) { try { _todoRec._suppressed = true; _todoRec.stop(); } catch (e) {} }
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = new Rec();
  rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true;
  rec._suppressed = false;

  // Capture current selection on the active row's input. If the user has
  // highlighted text, new audio will REPLACE that range instead of appending.
  var activeInput = document.getElementById("todoRowInput-" + _todoActive);
  var selStart = activeInput ? activeInput.selectionStart : 0;
  var selEnd   = activeInput ? activeInput.selectionEnd   : 0;
  var hasSelection = activeInput && (selStart !== selEnd);
  var beforeSel = hasSelection ? activeInput.value.substring(0, selStart) : "";
  var afterSel  = hasSelection ? activeInput.value.substring(selEnd) : "";
  rec._spliced = "";

  rec.onstart = function() {
    _todoIsRec = true;
    document.getElementById("todoStatus").innerHTML = '<span style="color:#ff5050">● RECORDING...</span>';
    document.getElementById("todoMic").style.display = "inline-block";
    _todoApplyActiveStyle();
  };
  rec.onresult = function(ev) {
    var newFinal = "", interim = "";
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) newFinal += ev.results[i][0].transcript;
      else interim += ev.results[i][0].transcript;
    }
    var inp = document.getElementById("todoRowInput-" + _todoActive);
    if (!inp) return;

    if (hasSelection) {
      if (newFinal) rec._spliced = (rec._spliced + " " + newFinal).replace(/\s+/g, " ").trim();
      var middle = (rec._spliced + " " + interim).replace(/\s+/g, " ").trim();
      inp.value = (beforeSel + (beforeSel && middle ? " " : "") + middle + (afterSel && middle ? " " : "") + afterSel).replace(/\s+/g, " ").trimRight();
      _todoFinals[_todoActive] = inp.value;
    } else {
      if (newFinal) {
        _todoFinals[_todoActive] = (_todoFinals[_todoActive] + " " + newFinal).replace(/\s+/g, " ").trim();
      }
      inp.value = (_todoFinals[_todoActive] + " " + interim).replace(/\s+/g, " ").trim();
    }
    _todoUpdateLogBtn();
  };
  rec.onend = function() {
    if (rec._suppressed) return;
    _todoIsRec = false;
    document.getElementById("todoStatus").textContent = "tap a row to record";
    document.getElementById("todoMic").style.display = "none";
    _todoApplyActiveStyle();
  };
  rec.onerror = function(e) {
    if (e.error === "no-speech") return;
    _todoIsRec = false;
    document.getElementById("todoMic").style.display = "none";
    _todoApplyActiveStyle();
  };
  _todoRec = rec;
  rec.start();
}

function _todoToggleMic() {
  // Button is only visible while recording, so it always means STOP.
  if (_todoRec) { _todoRec._suppressed = true; _todoRec.stop(); }
  _todoIsRec = false;
  document.getElementById("todoStatus").textContent = "tap a row to record";
  document.getElementById("todoMic").style.display = "none";
  _todoApplyActiveStyle();
}

function _todoUpdateLogBtn() {
  var any = false;
  for (var r = 0; r < 3; r++) {
    var inp = document.getElementById("todoRowInput-" + r);
    if (inp && inp.value.trim()) { any = true; break; }
  }
  document.getElementById("todoLog").disabled = !any;
  document.getElementById("todoLog").style.opacity = any ? "1" : "0.5";
}

function _todoSubmitAll() {
  var url = getScriptUrl(); if (!url) return;
  if (_todoIsRec && _todoRec) { _todoRec._suppressed = true; _todoRec.stop(); _todoIsRec = false; }

  var parts = [];
  for (var r = 0; r < 3; r++) {
    var v = document.getElementById("todoRowInput-" + r).value.trim();
    if (v) parts.push(v);
  }
  var task = parts.join(" - ");
  if (!task) return;

  var btn = document.getElementById("todoLog");
  var orig = btn.textContent;
  btn.textContent = "Logging..."; btn.disabled = true;

  callScript(url, "addTodo", { task: task }, function(data) {
    btn.textContent = orig; btn.disabled = false;
    if (data && data.success) {
      _todoResetRows();
      _loadTodos();
    } else {
      addLog("todoFeed", "❌ " + (data && data.message ? data.message : "Add failed"), "error");
    }
  });
}

function _todoResetRows() {
  _todoFinals = ["", "", ""];
  for (var r = 0; r < 3; r++) {
    var inp = document.getElementById("todoRowInput-" + r);
    if (inp) inp.value = "";
  }
  _todoActive = 0;
  _todoApplyActiveStyle();
  _todoUpdateLogBtn();
}

// ─── LIST RENDERING ────────────────────────────────────────────────────────
function _loadTodos() {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getTodos")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        document.getElementById("todoActive").innerHTML = '<div class="empty-state">Error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      _todoCache = data.todos || [];
      _renderTodos();
    })
    .catch(function() {
      document.getElementById("todoActive").innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function _renderTodos() {
  var active = _todoCache.filter(function(t) { return !t.done; });
  var done   = _todoCache.filter(function(t) { return  t.done; });

  var act = document.getElementById("todoActive");
  act.innerHTML = "";
  if (!active.length) {
    act.innerHTML = '<div class="empty-state" style="padding:12px">No active tasks</div>';
  } else {
    active.forEach(function(t, i) { act.appendChild(_todoListRow(t, i + 1)); });
  }

  var doneWrap = document.getElementById("todoDoneWrap");
  doneWrap.innerHTML = "";
  if (done.length) {
    var header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;padding-top:10px;border-top:1px solid var(--border)";
    header.innerHTML = "<span>Completed (" + done.length + ")</span>";
    var clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear all";
    clearBtn.style.cssText = "padding:3px 10px;font-size:10px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:3px;cursor:pointer";
    clearBtn.onclick = function() {
      if (!confirm("Delete all completed tasks?")) return;
      _todoClearCompleted(clearBtn);
    };
    header.appendChild(clearBtn);
    doneWrap.appendChild(header);
    done.forEach(function(t, i) { doneWrap.appendChild(_todoListRow(t, i + 1)); });
  }
}

function _todoListRow(t, num) {
  var row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:flex-start;gap:8px;padding:6px 4px;border-bottom:1px dashed rgba(255,255,255,0.05)";

  var numEl = document.createElement("div");
  numEl.style.cssText = "font-size:11px;color:var(--muted);min-width:22px;flex-shrink:0;text-align:right";
  numEl.textContent = (num || "") + ".";
  row.appendChild(numEl);

  var cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!t.done;
  cb.style.cssText = "margin-top:3px;flex-shrink:0;cursor:pointer";
  cb.onchange = function() { _todoToggle(t.row, cb.checked, cb); };
  row.appendChild(cb);

  var text = document.createElement("div");
  text.style.cssText = "flex:1;font-size:12px;color:" + (t.done ? "var(--muted)" : "var(--text)") + ";text-decoration:" + (t.done ? "line-through" : "none") + ";white-space:pre-wrap;word-break:break-word";
  text.textContent = t.task;
  row.appendChild(text);

  var meta = document.createElement("div");
  meta.style.cssText = "font-size:10px;color:var(--muted);flex-shrink:0;text-align:right;min-width:120px";
  meta.textContent = t.done ? (t.completed || "") : (t.created || "");
  row.appendChild(meta);

  var del = document.createElement("button");
  del.textContent = "×";
  del.title = "Delete";
  del.style.cssText = "padding:0 8px;font-size:14px;background:transparent;color:var(--muted);border:none;cursor:pointer;flex-shrink:0";
  del.onclick = function() {
    if (!confirm("Delete this task?")) return;
    _todoDelete(t.row);
  };
  row.appendChild(del);

  return row;
}

function _todoToggle(row, done, cb) {
  cb.disabled = true;
  var url = getScriptUrl(); if (!url) return;
  callScript(url, "toggleTodo", { row: row, done: done ? "true" : "false" }, function(data) {
    cb.disabled = false;
    if (data && data.success) {
      _loadTodos();
    } else {
      cb.checked = !done;
      addLog("todoFeed", "❌ " + (data && data.message ? data.message : "Toggle failed"), "error");
    }
  });
}

function _todoDelete(row) {
  var url = getScriptUrl(); if (!url) return;
  callScript(url, "deleteTodo", { row: row }, function(data) {
    if (data && data.success) {
      _loadTodos();
    } else {
      addLog("todoFeed", "❌ " + (data && data.message ? data.message : "Delete failed"), "error");
    }
  });
}

function _todoClearCompleted(btn) {
  var url = getScriptUrl(); if (!url) return;
  btn.disabled = true; btn.textContent = "...";
  callScript(url, "clearCompletedTodos", {}, function(data) {
    btn.disabled = false; btn.textContent = "Clear all";
    if (data && data.success) {
      addLog("todoFeed", "✓ Cleared " + (data.deleted || 0) + " completed tasks", "success");
      _loadTodos();
    } else {
      addLog("todoFeed", "❌ " + (data && data.message ? data.message : "Clear failed"), "error");
    }
  });
}
