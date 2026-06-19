// ─── TABS / TODO.JS ─────────────────────────────────────────────────────────
// Personal to-do list. Active tasks on top, completed at the bottom,
// 3-line textarea + mic for input.

var _todoCache = [];

function initTodoTab() {
  var section = document.getElementById("todoContent");
  if (!section) return;
  if (section.dataset.built !== "1") {
    section.innerHTML =
      '<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:10px">' +
        '<textarea id="todoInput" rows="3" placeholder="New task..." style="flex:1;padding:6px 8px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:12px;font-family:inherit;resize:vertical"></textarea>' +
        '<button id="todoMic" title="Dictate" style="padding:6px 10px;font-size:14px;background:transparent;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text);flex-shrink:0">🎤</button>' +
        '<button id="todoAdd" style="padding:6px 14px;font-size:12px;background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4);border-radius:4px;cursor:pointer;flex-shrink:0">Add</button>' +
      '</div>' +
      '<div id="todoActive"></div>' +
      '<div id="todoDoneWrap" style="margin-top:18px"></div>' +
      '<div class="log-feed" id="todoFeed"></div>';
    section.dataset.built = "1";

    document.getElementById("todoAdd").onclick = _todoAdd;
    var micState = { recording: false, recognizer: null };
    document.getElementById("todoMic").onclick = function() {
      _todoToggleMic(document.getElementById("todoInput"), document.getElementById("todoMic"), micState);
    };
    document.getElementById("todoInput").addEventListener("keydown", function(e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); _todoAdd(); }
    });
  }
  _loadTodos();
}

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
    active.forEach(function(t) { act.appendChild(_todoRow(t)); });
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
    done.forEach(function(t) { doneWrap.appendChild(_todoRow(t)); });
  }
}

function _todoRow(t) {
  var row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:flex-start;gap:8px;padding:6px 4px;border-bottom:1px dashed rgba(255,255,255,0.05)";

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

function _todoAdd() {
  var input = document.getElementById("todoInput");
  var btn   = document.getElementById("todoAdd");
  var task  = (input.value || "").trim();
  if (!task) return;
  var orig = btn.textContent;
  btn.textContent = "..."; btn.disabled = true;
  var url = getScriptUrl(); if (!url) return;
  callScript(url, "addTodo", { task: task }, function(data) {
    btn.textContent = orig; btn.disabled = false;
    if (data && data.success) {
      input.value = "";
      addLog("todoFeed", "✓ Added: " + task, "success");
      _loadTodos();
    } else {
      addLog("todoFeed", "❌ " + (data && data.message ? data.message : "Add failed"), "error");
    }
  });
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

function _todoToggleMic(textarea, btn, state) {
  if (state.recording) {
    if (state.recognizer) { state.recognizer._suppressed = true; state.recognizer.stop(); }
    state.recording = false;
    btn.textContent = "🎤"; btn.style.background = "transparent";
    return;
  }
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addLog("todoFeed", "Speech recognition not supported (use Chrome)", "error");
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
