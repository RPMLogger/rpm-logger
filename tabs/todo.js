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
    // In Today's box look (user, 2026-10-26): a To-Do box (title, + New top right, icon, count, list) and a Completed box under it.
    section.innerHTML =
      '<div class="td-wk-box tdo-box"><div class="settings-title td-wk-title"><span>To-Do</span>' +
        '<button id="todoAddBtn" class="link-btn red opens-window" data-tip="Instant.\nOpens the New To-Do rows.">+ New</button></div>' +
        '<div class="td-wk-icon">' + CHECKLIST_ICON.replace(/class="[^"]*"/, 'class="win-icon"') + '</div>' +
      '<div id="todoPanel" style="display:none;border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:22px;background:var(--panel)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">New To-Dos</div>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<div id="todoStatus" style="font-size:11px;color:var(--muted)">tap row to record</div>' +
            '<button id="todoClose" data-tip="Closes To-Do." style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;line-height:1;padding:0 2px">✕</button>' +
          '</div>' +
        '</div>' +
        _todoRowHtml(0, "Tap to start recording...") +
        _todoRowHtml(1, "Row 2 — tap to continue here") +
        _todoRowHtml(2, "Row 3 — tap to continue here") +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button id="todoMic" data-tip="Starts or stops dictation.\nReplaces highlighted text if any." style="padding:6px 12px;font-size:14px;background:transparent;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text)">' + MIC_ICON + '</button>' +
          '<button id="todoLog" style="flex:1;padding:8px;font-size:13px;background:rgba(180,40,40,0.25);color:#ff6b6b;border:1px solid rgba(180,40,40,0.5);border-radius:4px;cursor:pointer;letter-spacing:0.5px">LOG IT →</button>' +
        '</div>' +
      '</div>' +
      '<div id="todoActive"></div></div>' +
      '<div id="todoDoneWrap"></div>' +
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
    document.getElementById("todoAddBtn").onclick = _todoOpenPanel;
    document.getElementById("todoClose").onclick = _todoClosePanel;
    _todoSetActive(0);
  }
  _loadTodos();
}

function _todoOpenPanel() {
  var p = document.getElementById("todoPanel");
  var b = document.getElementById("todoAddBtn");
  if (p) p.style.display = "block";
  if (b) b.style.display = "none";
  var inp = document.getElementById("todoRowInput-0");
  if (inp) inp.focus();
}

function _todoClosePanel() {
  if (_todoIsRec && _todoRec) { _todoRec._suppressed = true; _todoRec.stop(); _todoIsRec = false; }
  _todoResetRows();
  _todoResetMicStyle();
  var s = document.getElementById("todoStatus");
  if (s) s.textContent = "tap row to record";
  var p = document.getElementById("todoPanel");
  var b = document.getElementById("todoAddBtn");
  if (p) p.style.display = "none";
  if (b) b.style.display = "";
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
    var mic = document.getElementById("todoMic");
    mic.innerHTML = MIC_STOP_ICON;
    mic.style.background = "rgba(255,80,80,0.2)";
    mic.style.borderColor = "rgba(255,80,80,0.5)";
    mic.style.color = "#ff5050";
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
    _todoResetMicStyle();
    _todoApplyActiveStyle();
  };
  rec.onerror = function(e) {
    if (e.error === "no-speech") return;
    _todoIsRec = false;
    _todoResetMicStyle();
    _todoApplyActiveStyle();
  };
  _todoRec = rec;
  rec.start();
}

function _todoResetMicStyle() {
  var mic = document.getElementById("todoMic");
  if (!mic) return;
  mic.innerHTML = MIC_ICON;
  mic.style.background = "transparent";
  mic.style.borderColor = "var(--border)";
  mic.style.color = "var(--text)";
}

function _todoToggleMic() {
  if (_todoIsRec) {
    if (_todoRec) { _todoRec._suppressed = true; _todoRec.stop(); }
    _todoIsRec = false;
    document.getElementById("todoStatus").textContent = "tap a row to record";
    _todoResetMicStyle();
    _todoApplyActiveStyle();
  } else {
    // Start mic — selection on the currently active input will be captured
    // inside _todoStartRec, enabling highlight-to-replace.
    _todoStartRec();
  }
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
    if (v) parts.push(toSentenceCase(v));   // saved in sentence case (user, 2026-10-26)
  }
  var task = parts.join(" - ");
  if (!task) return;

  var btn = document.getElementById("todoLog");
  var orig = btn.textContent;
  var panel = document.getElementById("todoPanel");
  btn.textContent = "Logging…"; btn.disabled = true;
  rpmBusy(panel, btn, true);

  callScript(url, "addTodo", { task: task }, function(data) {
    rpmBusy(panel, btn, false);
    btn.textContent = orig; btn.disabled = false;
    if (data && data.success) {
      _todoClosePanel();
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

  // Count → line → list, like Today's "3 students".
  var act = document.getElementById("todoActive");
  act.innerHTML = '<div class="db-cx-head im-sec-head td-wk-head"><label class="field-label db-cx-t">' + active.length + ' open</label></div>' +
    '<hr class="divider td-wk-rule">';
  if (!active.length) {
    act.insertAdjacentHTML("beforeend", '<div class="empty-state tdo-none">Nothing to do</div>');
  } else {
    active.forEach(function(t, i) { act.appendChild(_todoListRow(t, i + 1)); });
  }

  // Completed: its own box under, title + Clear all top right, rows dimmed.
  var doneWrap = document.getElementById("todoDoneWrap");
  doneWrap.innerHTML = "";
  if (done.length) {
    var box = document.createElement("div");
    box.className = "td-wk-box tdo-box tdo-done";
    box.innerHTML = '<div class="settings-title td-wk-title"><span>Completed<span class="win-sub"> · ' + done.length + '</span></span></div>' +
      '<hr class="divider td-wk-rule">';
    var clearBtn = document.createElement("button");
    clearBtn.className = "link-btn";
    clearBtn.textContent = "Clear all";
    clearBtn.onclick = function() {
      rpmConfirm({ title: "Delete all completed tasks?", confirmLabel: "Delete all", danger: true })
        .then(function (ok) { if (ok) _todoClearCompleted(clearBtn); });
    };
    box.firstChild.appendChild(clearBtn);
    done.forEach(function(t, i) { box.appendChild(_todoListRow(t, i + 1)); });
    doneWrap.appendChild(box);
  }
}

function _todoListRow(t, num) {
  var row = document.createElement("div");
  row.className = "tdo-row" + (t.done ? " tdo-row-done" : "");

  var numEl = document.createElement("div");
  numEl.className = "tdo-num";
  numEl.textContent = (num || "") + ".";
  row.appendChild(numEl);

  var cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = "tdo-cb";
  cb.checked = !!t.done;
  cb.onchange = function() { _todoToggle(t.row, cb.checked, cb); };
  row.appendChild(cb);

  var text = document.createElement("div");
  text.className = "tdo-text";
  text.textContent = toSentenceCase(t.task);   // older ones shown in sentence case too
  row.appendChild(text);

  var meta = document.createElement("div");
  meta.className = "tdo-date";
  meta.textContent = t.done ? (t.completed || "") : (t.created || "");
  row.appendChild(meta);

  var del = document.createElement("button");
  del.className = "tdo-del";
  del.textContent = "×";
  del.title = "Delete";
  del.onclick = function() {
    rpmConfirm({ title: "Delete this task?", confirmLabel: "Delete", danger: true })
      .then(function (ok) { if (ok) _todoDelete(t.row); });
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
