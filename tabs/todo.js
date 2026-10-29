// ─── TABS / TODO.JS ─────────────────────────────────────────────────────────
// Personal to-do list. + New opens the New to-do window in the Log lesson
// window's look (user, 2026-10-29), shared with Notes (_tdoEntryOpen): one row
// to start, Enter or ＋ adds a row, the mic sits in the row you are in. Rows
// are joined with " - " into one to-do.

var _todoCache    = [];
var _todoDoneShown = false;   // Completed opens hidden each time the tab opens (user, 2026-10-29)

function initTodoTab() {
  var section = document.getElementById("todoContent");
  if (!section) return;
  if (section.dataset.built !== "1") {
    // In Today's box look (user, 2026-10-26): a To-Do box (title, + New top right, icon, count, list) and a Completed box under it.
    section.innerHTML =
      '<div class="td-wk-box tdo-box"><div class="settings-title td-wk-title"><span>To-Do</span>' +
        '<span class="tdo-title-btns"><button id="todoAddBtn" class="link-btn amber opens-window" data-tip="Opens a window.\nNew to-do.">+ New</button></span></div>' +
        '<div class="td-wk-icon">' + TODO_ICON + '</div>' +   // the checklist + pencil (om-131, user 2026-10-28; was om-129; the pen moved to Notes, the checklist to Completed)
      '<div id="todoActive"></div></div>' +
      '<div id="todoDoneWrap"></div>' +
      '<div class="log-feed" id="todoFeed"></div>';
    section.dataset.built = "1";
    document.getElementById("todoAddBtn").onclick = function() {
      _tdoEntryOpen({ title: "New to-do", icon: TODO_ICON, action: "addTodo", key: "task", tip: "Saves the to-do.", onSaved: _loadTodos });
    };
  }
  _todoDoneShown = false;
  // First open: the rolling LOADING in the middle of the box until the list arrives (user, 2026-10-28).
  if (!_todoCache.length) document.getElementById("todoActive").innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  _loadTodos();
}

// ─── NEW TO-DO / NEW NOTE WINDOW ────────────────────────────────────────────
// o: title, icon, action + key (the backend call and its text parameter), tip
// (＋ Log's), onSaved. Title + ✕, the icon, the rows with the mic, ＋, ＋ Log.
var _tdoRec = null;   // the window's dictation
function _tdoBox() { return document.getElementById("tdoEntryRows"); }

function _tdoEntryOpen(o) {
  if (document.getElementById("tdoEntryWin")) return;
  var back = document.createElement("div");
  back.id = "tdoEntryBack";
  back.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px";
  back.onclick = function(e) { if (e.target === back) _tdoEntryClose(); };
  back.innerHTML =
    '<div class="log-panel active" id="tdoEntryWin" style="width:min(460px,94vw);box-sizing:border-box;max-height:90vh;overflow:auto;margin:0">' +
      '<div class="settings-title"><span>' + o.title + '</span>' +
        '<button class="settings-close" onclick="_tdoEntryClose()">✕</button></div>' +
      '<div style="margin:4px 0 18px">' + o.icon + '</div>' +
      '<div class="ll-wrap">' +
        '<div class="ll-rows" id="tdoEntryRows"><input type="text" class="rpm-field ll-row active"></div>' +
        '<button class="link-btn tl-mic" id="tdoEntryMic" data-tip="Starts or stops dictation." data-tip-left onclick="_tdoToggleMic()">' + MIC_ICON + '</button>' +
      '</div>' +
      llAddHtml() +
      '<div class="ll-acts" style="margin-top:16px">' +
        '<span class="ll-state" id="tdoEntryStatus" style="flex:1"></span>' +
        '<button class="link-btn bright" id="tdoEntryLog" data-tip="' + o.tip + '\n⌘ Enter does too." data-tip-left disabled>＋ Log</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(back);
  var box = _tdoBox(), btn = document.getElementById("tdoEntryLog");
  btn.onclick = function() { _tdoEntrySubmit(o); };
  llWire(box, function(i) { llRows(box).forEach(function(el, j) { el.classList.toggle("active", j === i); }); },
    _tdoEntryLogBtn,
    function() { if (!btn.disabled) _tdoEntrySubmit(o); });
  llReset(box);
  llRows(box)[0].focus();
}

function _tdoEntryClose() {
  _tdoMicStop();
  var back = document.getElementById("tdoEntryBack");
  if (back) back.remove();
}

function _tdoMicStop() { if (_tdoRec) { var r = _tdoRec; _tdoRec = null; r.onend = null; r.abort(); } }

// Dictation into the row you are in, like the Log lesson window's.
function _tdoToggleMic() {
  var box = _tdoBox(), mic = document.getElementById("tdoEntryMic");
  if (!box || !mic) return;
  if (_tdoRec) { _tdoRec.stop(); return; }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { _tdoEntryState("Speech not supported. Use Chrome."); return; }
  var row = box.querySelector(".ll-row.active") || llRows(box)[0];
  var r = _tdoRec = new SR(), base = row.value.trim();
  r.lang = "en-US"; r.continuous = true; r.interimResults = true;
  r.onstart = function() { mic.innerHTML = MIC_STOP_ICON; mic.classList.add("rec"); _tdoEntryState("Recording", "var(--accent)"); playBeep(880, 100); };
  r.onresult = function(ev) {
    var fin = "", tmp = "";
    for (var i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) fin += ev.results[i][0].transcript; else tmp += ev.results[i][0].transcript;
    }
    if (fin) base = (base + " " + fin).replace(/\s+/g, " ").trim();
    row.value = (base + " " + tmp).replace(/\s+/g, " ").trim();
    _tdoEntryLogBtn();
  };
  r.onend = function() {
    if (_tdoRec !== r) return;
    _tdoRec = null;
    mic.innerHTML = MIC_ICON; mic.classList.remove("rec");
    _tdoEntryState("");
    playBeep(440, 80, 0.15);
  };
  r.start();
}

function _tdoEntryState(text, color) {
  var el = document.getElementById("tdoEntryStatus");
  if (el) { el.textContent = text || ""; el.style.color = color || "var(--muted)"; }
}

function _tdoEntryLogBtn() {
  var btn = document.getElementById("tdoEntryLog");
  if (btn) btn.disabled = !llValues(_tdoBox()).some(function(v) { return v; });
}

function _tdoEntrySubmit(o) {
  var url = getScriptUrl(); if (!url) return;
  _tdoMicStop();
  // saved in sentence case (user, 2026-10-26)
  var text = llValues(_tdoBox()).filter(Boolean).map(toSentenceCase).join(" - ");
  if (!text) return;
  var btn = document.getElementById("tdoEntryLog");
  var win = document.getElementById("tdoEntryWin");
  var params = {}; params[o.key] = text;
  rpmBusy(win, btn, true);
  callScript(url, o.action, params, function(data) {
    rpmBusy(win, btn, false);
    if (data && data.success) {
      _tdoEntryClose();
      o.onSaved();
    } else {
      _tdoEntryState("Unsuccessful: " + (data && data.message ? data.message : "add failed"), "var(--accent)");
    }
  });
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

  // Straight into the list: no "5 open" count or line (user, 2026-10-28).
  var act = document.getElementById("todoActive");
  act.innerHTML = "";
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
    box.innerHTML = '<div class="settings-title td-wk-title"><span>Completed</span></div>' +   // no "· 17" count (user, 2026-10-28)
      '<div class="td-wk-icon">' + CHECKLIST_ICON.replace(/class="[^"]*"/, 'class="win-icon"') + '</div>' +   // was the To-Do box's (user, 2026-10-28); no line under it, like To-Do
      '';
    var clearBtn = document.createElement("button");
    clearBtn.className = "link-btn";
    clearBtn.textContent = "Clear all";
    clearBtn.onclick = function() {
      rpmConfirm({ title: "Delete all completed tasks?", confirmLabel: "Delete all", danger: true })
        .then(function (ok) { if (ok) _todoClearCompleted(clearBtn); });
    };
    // Show / Hide beside Clear all: folds the list away (user, 2026-10-28); hidden again next time the tab opens (2026-10-29).
    var hidden = !_todoDoneShown;
    var showBtn = document.createElement("button");
    showBtn.className = "link-btn";
    var btns = document.createElement("span");
    btns.className = "tdo-title-btns";
    btns.appendChild(showBtn);
    btns.appendChild(clearBtn);
    box.firstChild.appendChild(btns);
    var list = document.createElement("div");
    list.className = "tdo-done-list";
    done.forEach(function(t, i) { list.appendChild(_todoListRow(t, i + 1)); });
    box.appendChild(list);
    function paint() {
      list.style.display = hidden ? "none" : "";
      box.classList.toggle("tdo-done-hidden", hidden);
      showBtn.textContent = hidden ? "Show" : "Hide";
    }
    showBtn.onclick = function() {
      hidden = !hidden;
      _todoDoneShown = !hidden;
      paint();
    };
    paint();
    doneWrap.appendChild(box);
  }
}

function _todoListRow(t, num) {
  var row = document.createElement("div");
  row.className = "tdo-row" + (t.done ? " tdo-row-done" : "");
  row.dataset.row = t.row;   // the sheet row, for the magnifier's Completed button

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
  meta.textContent = _tdoDate(t.done ? t.completed : t.created);
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

// ─── MAGNIFIER BUBBLE (user, 2026-10-28) ───────────────────────────────────
// The header magnifier (core/magnifier.js) shows a to-do in this bubble: the
// row's own handwriting and grey, plus an amber Completed button on open ones.
function _todoZoomBubble(row) {
  var text = row.querySelector(".tdo-text");
  if (!text) return null;
  var b = document.createElement("div");
  b.className = "mag-bubble tdo-zoom-bubble";   // completed ones too: open-row grey, no strike, to read them (user, 2026-10-28)
  var big = document.createElement("div");
  big.textContent = text.textContent;
  b.appendChild(big);
  // An open to-do gets an amber Completed button at the bottom: ticks it like the circle (user, 2026-10-28).
  if (!row.classList.contains("tdo-row-done")) {
    var foot = document.createElement("div");
    foot.className = "tdo-zoom-foot";
    var done = document.createElement("button");
    done.className = "link-btn amber";
    done.textContent = "Completed";
    done.onclick = function() { _todoZoomDone(row, b, done); };
    foot.appendChild(done);
    b.appendChild(foot);
  }
  return b;
}

function _todoZoomDone(row, bubble, btn) {
  var url = getScriptUrl(); if (!url) return;
  bubble._busy = true;   // stays open while it saves, even if the pointer leaves
  rpmBusy(bubble, btn, true);
  callScript(url, "toggleTodo", { row: row.dataset.row, done: "true" }, function(data) {
    bubble._busy = false;
    rpmBusy(bubble, btn, false);
    if (data && data.success) {
      magClose();
      _loadTodos();
    } else {
      addLog("todoFeed", "❌ " + (data && data.message ? data.message : "Toggle failed"), "error");
    }
  });
}

// The sheet shows dates as "Jun /20"; the portal writes "Jun 20" (user, 2026-10-28).
// Used by To-Do and Notes.
function _tdoDate(s) {
  return (s || "").replace(/^([A-Za-z]{3})\s*\/\s*(\d{1,2})$/, "$1 $2");
}
