// ─── TABS / NOTES.JS ────────────────────────────────────────────────────────
// Personal running notes. + New opens the New note window, To-Do's
// (_tdoEntryOpen, tabs/todo.js): the Log lesson window's look (user, 2026-10-29).
// Rows are joined with " - " into one note.

var _notesCache = [];
var _notesRemovedShown = false;   // Removed opens hidden each time the tab opens (user, 2026-10-29)

function initNotesTab() {
  var section = document.getElementById("notesContent");
  if (!section) return;
  if (section.dataset.built !== "1") {
    // In To-Do's look (user, 2026-10-28): a Notes box (title, + New top right, the pen, the notebook list).
    section.innerHTML =
      '<div class="td-wk-box tdo-box"><div class="settings-title td-wk-title"><span>Notes</span>' +
        '<span class="tdo-title-btns"><button id="notesAddBtn" class="link-btn amber opens-window" data-tip="Opens a window.\nNew note.">+ New</button></span></div>' +
        '<div class="td-wk-icon">' + PEN_ICON + '</div>' +   // the pen (om-127; To-Do's until it got om-129, user 2026-10-28)
      '<div id="notesList"></div></div>' +
      '<div id="notesRemovedWrap"></div>' +
      '<div class="log-feed" id="notesFeed"></div>';
    section.dataset.built = "1";
    document.getElementById("notesAddBtn").onclick = function() {
      _tdoEntryOpen({ title: "New note", icon: PEN_ICON, action: "addNote", key: "note", tip: "Saves the note.", onSaved: _loadNotes });
    };
  }
  _notesRemovedShown = false;
  // First open: the rolling LOADING in the middle of the box until the list arrives (user, 2026-10-28).
  if (!_notesCache.length) document.getElementById("notesList").innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  _loadNotes();
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
  var open    = _notesCache.filter(function(n) { return !n.removed; });
  var removed = _notesCache.filter(function(n) { return  n.removed; });
  var section = document.getElementById("notesList");
  section.innerHTML = "";
  if (!open.length) {
    section.innerHTML = '<div class="empty-state tdo-none">No notes</div>';
  } else {
    // Newest first
    open.slice().reverse().forEach(function(n, i) { section.appendChild(_notesListRow(n, i + 1)); });
  }

  // Removed (user, 2026-10-28): × moves a note here, like To-Do's Completed box;
  // Show / Hide + Clear all top right, rows dimmed and struck, ↩ puts one back.
  var wrap = document.getElementById("notesRemovedWrap");
  wrap.innerHTML = "";
  if (!removed.length) return;
  var box = document.createElement("div");
  box.className = "td-wk-box tdo-box tdo-done";
  box.innerHTML = '<div class="settings-title td-wk-title"><span>Removed</span></div>' +
    '<div class="td-wk-icon">' + TRASH_ICON.replace(/class="[^"]*"/, 'class="win-icon"') + '</div>';
  var clearBtn = document.createElement("button");
  clearBtn.className = "link-btn";
  clearBtn.textContent = "Clear all";
  clearBtn.onclick = function() {
    rpmConfirm({ title: "Delete all removed notes?", confirmLabel: "Delete all", icon: TRASH_ICON, danger: true })
      .then(function (ok) { if (ok) _notesClearRemoved(clearBtn); });
  };
  var hidden = !_notesRemovedShown;
  var showBtn = document.createElement("button");
  showBtn.className = "link-btn";
  var btns = document.createElement("span");
  btns.className = "tdo-title-btns";
  btns.appendChild(showBtn);
  btns.appendChild(clearBtn);
  box.firstChild.appendChild(btns);
  var list = document.createElement("div");
  list.className = "tdo-done-list";
  removed.slice().reverse().forEach(function(n, i) { list.appendChild(_notesListRow(n, i + 1)); });
  box.appendChild(list);
  function paint() {
    list.style.display = hidden ? "none" : "";
    box.classList.toggle("tdo-done-hidden", hidden);
    showBtn.textContent = hidden ? "Show" : "Hide";
  }
  showBtn.onclick = function() {
    hidden = !hidden;
    _notesRemovedShown = !hidden;
    paint();
  };
  paint();
  wrap.appendChild(box);
}

function _notesListRow(n, num) {
  var row = document.createElement("div");
  row.className = "tdo-row";   // To-Do's notebook row, without the circle

  var numEl = document.createElement("div");
  numEl.className = "tdo-num";
  numEl.textContent = (num || "") + ".";
  row.appendChild(numEl);

  var text = document.createElement("div");
  text.className = "tdo-text";
  text.textContent = toSentenceCase(n.text);   // older ones shown in sentence case too
  row.appendChild(text);

  var meta = document.createElement("div");
  meta.className = "tdo-date";
  meta.textContent = _tdoDate(n.removed || n.created);
  row.appendChild(meta);

  // × moves the note to Removed at once (user, 2026-10-28; was a delete with a confirm);
  // on a removed note it's ↩, putting it back.
  var del = document.createElement("button");
  del.className = "tdo-del";
  del.textContent = n.removed ? "↩" : "×";
  del.title = n.removed ? "Put back" : "Remove";
  del.onclick = function() { _notesRemove(n.row, !n.removed, del); };
  row.appendChild(del);

  return row;
}

function _notesRemove(row, removed, btn) {
  var url = getScriptUrl(); if (!url) return;
  btn.disabled = true;
  callScript(url, "removeNote", { row: row, done: removed ? "true" : "false" }, function(data) {
    btn.disabled = false;
    if (data && data.success) {
      _loadNotes();
    } else {
      addLog("notesFeed", "❌ " + (data && data.message ? data.message : "Remove failed"), "error");
    }
  });
}

function _notesClearRemoved(btn) {
  var url = getScriptUrl(); if (!url) return;
  btn.disabled = true; btn.textContent = "...";
  callScript(url, "clearRemovedNotes", {}, function(data) {
    btn.disabled = false; btn.textContent = "Clear all";
    if (data && data.success) {
      _loadNotes();
    } else {
      addLog("notesFeed", "❌ " + (data && data.message ? data.message : "Clear failed"), "error");
    }
  });
}
