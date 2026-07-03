// ─── TABS / CTRL.JS ─────────────────────────────────────────────────────────
// AUDIT 1: Counter dates that don't exist in Students Import.
// Read-only — reports discrepancies + format warnings, no fix actions.

function initAuditTab() {
  var url = getScriptUrl();
  if (!url) {
    document.getElementById("auditLessonSection").innerHTML = '<div class="empty-state">No script URL set</div>';
    document.getElementById("auditBlockSection").innerHTML  = '<div class="empty-state">No script URL set</div>';
    document.getElementById("auditUnpaidSection").innerHTML = '<div class="empty-state">No script URL set</div>';
    return;
  }
  _runAudit1(url);
  _runAudit2(url);
  _runAudit3(url);
}

function _runAudit1(url) {
  var section = document.getElementById("auditLessonSection");
  section.innerHTML = '<div class="empty-state">Running audit...</div>';
  fetch(url + "?action=auditLessonDates")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Audit error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      renderAuditCards(data.audit || []);
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function _runAudit2(url) {
  var section = document.getElementById("auditBlockSection");
  section.innerHTML = '<div class="empty-state">Running audit...</div>';
  fetch(url + "?action=auditBlockSync")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Audit error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      renderBlockSyncCards(data.audit || []);
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function _runAudit3(url) {
  var section = document.getElementById("auditUnpaidSection");
  section.innerHTML = '<div class="empty-state">Running audit...</div>';
  fetch(url + "?action=auditUnpaid")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Audit error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      renderUnpaidCards(data.audit || []);
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function renderUnpaidCards(audit) {
  var section = document.getElementById("auditUnpaidSection");
  section.innerHTML = "";

  if (!audit.length) {
    section.innerHTML = '<div style="color:var(--green);font-size:11px;text-align:center;padding:20px">All current blocks are paid ✓</div>';
    return;
  }

  audit.forEach(function(s) {
    var card = document.createElement("div");
    card.style.cssText = "padding:12px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;background:var(--panel)";

    var name = document.createElement("div");
    name.style.cssText = "font-weight:600;margin-bottom:6px;font-size:13px";
    name.textContent = s.name;
    card.appendChild(name);

    var current = document.createElement("div");
    current.style.cssText = "font-size:11px;color:var(--muted);margin:4px 0 10px";
    current.innerHTML = "On lesson <b style=\"color:#ffa500\">" + (s.lessonNum != null ? s.lessonNum : "?") + "</b> (<b style=\"color:var(--text)\">" + (s.lessonDate || "?") + "</b>) — <span style=\"color:#ffa500\">unpaid</span>";
    card.appendChild(current);

    if (s.prevBlocks && s.prevBlocks.length) {
      var pbHdr = document.createElement("div");
      pbHdr.style.cssText = "font-size:10px;color:var(--muted);margin:6px 0 2px;text-transform:uppercase;letter-spacing:0.5px";
      pbHdr.textContent = "Past 2 blocks";
      card.appendChild(pbHdr);

      s.prevBlocks.forEach(function(pb, idx) {
        var row = document.createElement("div");
        row.style.cssText = "font-size:11px;color:var(--muted);margin:2px 0";
        var statusColor = pb.paid ? "var(--green)" : "#ffa500";
        var statusMark = pb.paid ? "✓ paid" : "✗ unpaid";
        var dateStr = pb.paymentDate ? " · " + pb.paymentDate : "";
        var noteStr = pb.paymentNote ? " · " + pb.paymentNote : "";
        row.innerHTML = "Block −" + (idx + 1) + ": <b style=\"color:" + statusColor + "\">" + statusMark + "</b>" + dateStr + noteStr;
        card.appendChild(row);
      });
    }

    var lpHdr = document.createElement("div");
    lpHdr.style.cssText = "font-size:10px;color:var(--muted);margin:10px 0 2px;text-transform:uppercase;letter-spacing:0.5px";
    lpHdr.textContent = "Last 2 RPM Payments";
    card.appendChild(lpHdr);

    if (s.lastPayments && s.lastPayments.length) {
      s.lastPayments.forEach(function(p) {
        var row = document.createElement("div");
        row.style.cssText = "font-size:11px;color:var(--muted);margin:2px 0";
        row.innerHTML = "<b style=\"color:var(--text)\">" + (p.amount || "?") + "</b> on <b style=\"color:var(--text)\">" + (p.date || "?") + "</b> via " + (p.method || "?") + (p.notes ? " · " + p.notes : "");
        card.appendChild(row);
      });
    } else {
      var none = document.createElement("div");
      none.style.cssText = "font-size:11px;color:var(--muted);font-style:italic";
      none.textContent = "No payments on file";
      card.appendChild(none);
    }

    // ─── ACTIONS ─────────────────────────────────────────────────────────
    var actionsWrap = document.createElement("div");
    actionsWrap.style.cssText = "margin-top:12px;padding-top:10px;border-top:1px dashed var(--border)";
    card.appendChild(actionsWrap);

    if (s.pendingPayments && s.pendingPayments.length) {
      var ppHdr = document.createElement("div");
      ppHdr.style.cssText = "font-size:10px;color:var(--muted);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px";
      ppHdr.textContent = "Pending — confirm?";
      actionsWrap.appendChild(ppHdr);

      s.pendingPayments.forEach(function(p) {
        var row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;margin:4px 0;font-size:11px;flex-wrap:wrap";
        row.innerHTML =
          "<span style=\"color:var(--text)\"><b>" + (p.amount || "?") + "</b> " + (p.method || "?") + "</span>" +
          "<span style=\"color:var(--muted)\">" + (p.date || "?") + "</span>";

        var confirmBtn = document.createElement("button");
        confirmBtn.textContent = "Confirm →";
        confirmBtn.style.cssText = "padding:4px 10px;font-size:11px;background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4);border-radius:4px;cursor:pointer";
        confirmBtn.onclick = function(ev) {
          ev.stopPropagation();
          if (typeof openIncomingNotePanel === "function") {
            openIncomingNotePanel(p, row);
          } else {
            addLog("auditFeed", "Confirm flow not available — open Payments tab", "error");
          }
        };
        row.appendChild(confirmBtn);
        actionsWrap.appendChild(row);
      });
    } else {
      var reminderRow = document.createElement("div");
      reminderRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px";

      var reminderInfo = document.createElement("div");
      reminderInfo.style.cssText = "font-size:11px;color:var(--muted)";
      reminderInfo.textContent = s.lastReminderAt
        ? "Last reminder sent: " + s.lastReminderAt
        : "No reminder sent yet";
      reminderRow.appendChild(reminderInfo);

      var sendBtn = document.createElement("button");
      sendBtn.textContent = "Send Reminder →";
      sendBtn.style.cssText = "padding:4px 10px;font-size:11px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:4px;cursor:pointer";
      sendBtn.onclick = function(ev) { ev.stopPropagation(); _sendReminder(s, sendBtn, reminderInfo); };
      reminderRow.appendChild(sendBtn);

      actionsWrap.appendChild(reminderRow);
    }

    // ─── CASH button — always available ──────────────────────────────────
    var cashRow = document.createElement("div");
    cashRow.style.cssText = "margin-top:8px;display:flex;justify-content:flex-end";
    var cashBtn = document.createElement("button");
    cashBtn.textContent = "💵 Log Cash";
    cashBtn.style.cssText = "padding:4px 10px;font-size:11px;background:rgba(180,180,180,0.10);color:var(--text);border:1px solid var(--border);border-radius:4px;cursor:pointer";
    cashBtn.onclick = function(ev) {
      ev.stopPropagation();
      _openCashFromAudit(s.name, s.lessonDate);
    };
    cashRow.appendChild(cashBtn);
    actionsWrap.appendChild(cashRow);

    section.appendChild(card);
  });
}

// ─── AUDIT 2 FIX MODAL ──────────────────────────────────────────────────────
var _fixCurrentName = null;

function openAuditFixModal(studentName) {
  _fixCurrentName = studentName;
  document.getElementById("auditFixOverlay").style.display = "flex";
  document.getElementById("auditFixTitle").textContent = "Fix: " + studentName;
  document.getElementById("auditFixBody").innerHTML = '<div class="empty-state" style="padding:24px">Loading...</div>';
  _loadFixData(studentName);
}

function closeAuditFixModal(ev) {
  if (ev && ev.target && ev.target.id !== "auditFixOverlay") return;
  document.getElementById("auditFixOverlay").style.display = "none";
  _fixCurrentName = null;
  // Refresh audit so changes propagate
  if (typeof initAuditTab === "function") initAuditTab();
}

function _loadFixData(studentName) {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getStudentFixData&name=" + encodeURIComponent(studentName))
    .then(function(r) { return r.json(); })
    .then(function(resp) {
      if (!resp.success) {
        document.getElementById("auditFixBody").innerHTML = '<div class="empty-state">Error: ' + (resp.message || "unknown") + '</div>';
        return;
      }
      _renderFixData(resp.data);
    })
    .catch(function() {
      document.getElementById("auditFixBody").innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

// ─── MON/DAY DATE SPINNER (no year) — same feel as the Travel picker ────────
var _FIX_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function _fixParseMonDay(disp) {
  var m = (disp || "").trim().match(/([A-Za-z]{3})[^\d]*(\d{1,2})/);
  if (!m) return null;
  var mon = _FIX_MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1, 3).toLowerCase());
  if (mon < 0) return null;
  return { mon: mon, day: parseInt(m[2], 10) };
}

// Pick the year that lands mon/day nearest today (handles Dec viewed in Jan).
function _fixInferYear(mon, day) {
  var now = new Date(), y = now.getFullYear();
  var cand = new Date(y, mon, day);
  if ((cand - now) > 60 * 24 * 60 * 60 * 1000) y--;
  return y;
}

function _fixDateSeg() {
  var b = document.createElement("button");
  b.type = "button"; b.tabIndex = 0;
  b.style.cssText = "background:transparent;border:none;color:inherit;font-family:inherit;font-size:11px;font-weight:600;padding:2px 5px;cursor:pointer;border-radius:3px;outline:none";
  b.onfocus = function() { b.style.background = "rgba(232,70,58,0.18)"; b.style.color = "var(--accent)"; };
  b.onblur  = function() { b.style.background = "transparent"; b.style.color = "inherit"; };
  b.onclick = function() { b.focus(); };
  return b;
}

// Inline [Mon] [DD] spinner, no year. Click a segment, ↑↓ nudges it.
// Returns { box, getValue }. getValue() → "" if blank, else "MMM d, yyyy"
// (year inferred on save so the cell stays a real date).
function _fixDateSpinner(initialDisp) {
  var p = _fixParseMonDay(initialDisp);
  var state = { mon: p ? p.mon : null, day: p ? p.day : null };

  var box = document.createElement("span");
  box.style.cssText = "display:inline-flex;align-items:center;gap:2px;color:var(--muted)";
  var monSeg = _fixDateSeg(), daySeg = _fixDateSeg();

  function refresh() {
    monSeg.textContent = (state.mon != null) ? _FIX_MONTHS[state.mon] : "—";
    daySeg.textContent = (state.day != null) ? String(state.day) : "—";
  }
  function step(which, dir) {
    if (state.mon == null || state.day == null) {
      var t = new Date(); state.mon = t.getMonth(); state.day = t.getDate(); refresh(); return;
    }
    if (which === "mon") {
      state.mon = (state.mon + dir + 12) % 12;
    } else {
      var max = new Date(2024, state.mon + 1, 0).getDate();
      state.day += dir;
      if (state.day < 1) state.day = max;
      if (state.day > max) state.day = 1;
    }
    var maxNew = new Date(2024, state.mon + 1, 0).getDate();
    if (state.day > maxNew) state.day = maxNew;
    refresh();
  }
  function handler(which) {
    return function(e) {
      if (e.key === "ArrowUp")   { e.preventDefault(); step(which, +1); }
      if (e.key === "ArrowDown") { e.preventDefault(); step(which, -1); }
    };
  }
  monSeg.onkeydown = handler("mon");
  daySeg.onkeydown = handler("day");

  box.appendChild(monSeg); box.appendChild(daySeg);
  refresh();

  return {
    box: box,
    getValue: function() {
      if (state.mon == null || state.day == null) return "";
      return _FIX_MONTHS[state.mon] + " " + state.day + ", " + _fixInferYear(state.mon, state.day);
    },
    clear: function() { state.mon = null; state.day = null; refresh(); }
  };
}

// Single-value keyboard cycler (e.g. Finished 1→2→3→4→1). ↑↓ steps, wraps.
function _fixCycleSpinner(initial, min, max) {
  var val = parseInt(initial, 10);
  if (isNaN(val) || val < min || val > max) val = min;
  var box = document.createElement("span");
  box.style.cssText = "display:inline-flex;align-items:center;color:var(--text)";
  var seg = _fixDateSeg();
  function refresh() { seg.textContent = String(val); }
  function step(dir) { val += dir; if (val > max) val = min; if (val < min) val = max; refresh(); }
  seg.onkeydown = function(e) {
    if (e.key === "ArrowUp")   { e.preventDefault(); step(+1); }
    if (e.key === "ArrowDown") { e.preventDefault(); step(-1); }
  };
  box.appendChild(seg);
  refresh();
  return { box: box, getValue: function() { return String(val); } };
}

function _renderFixData(d) {
  var body = document.getElementById("auditFixBody");
  body.innerHTML = "";

  var counterControls = []; // { col, sp } across both Counter blocks
  var importControls  = []; // { subjIn, sp } for empty Students Import rows

  // Helper to render a Counter block (4 cells with inline date editing)
  function counterBlock(label, cells) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "margin-bottom:10px";
    var lbl = document.createElement("div");
    lbl.style.cssText = "font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px";
    lbl.textContent = label;
    wrap.appendChild(lbl);
    var row = document.createElement("div");
    row.style.cssText = "display:grid;grid-template-columns:repeat(4, 1fr);gap:6px";
    cells.forEach(function(cell, i) {
      var pill = document.createElement("div");
      var isEmpty = cell.empty;
      pill.style.cssText = "display:flex;align-items:center;gap:4px;padding:4px 6px;border:1px dashed " + (isEmpty ? "rgba(255,165,0,0.5)" : "var(--border)") + ";border-radius:4px;font-size:11px;background:" + (isEmpty ? "rgba(255,165,0,0.05)" : "transparent");
      pill.innerHTML = "<span style=\"color:var(--muted);opacity:0.6;flex-shrink:0\">" + (i + 1) + ":</span>";
      var sp = _fixDateSpinner(cell.value);
      sp.box.style.flex = "1";
      pill.appendChild(sp.box);
      counterControls.push({ col: cell.col, sp: sp });
      var clrBtn = document.createElement("button");
      clrBtn.textContent = "✕"; clrBtn.title = "Clear date"; clrBtn.style.cssText = "padding:1px 5px;font-size:10px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:3px;cursor:pointer;flex-shrink:0";
      clrBtn.onclick = function() { sp.clear(); };
      pill.appendChild(clrBtn);
      row.appendChild(pill);
    });
    wrap.appendChild(row);
    return wrap;
  }

  // Helper to render a Students Import block. counterCells (optional) is the
  // matching Counter block's cells — empty Import rows auto-fill their date
  // from the same block position when Counter has a date the Import is missing.
  function importBlock(label, lessons, counterCells) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "margin-bottom:10px";
    var lbl = document.createElement("div");
    lbl.style.cssText = "font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px";
    lbl.textContent = label;
    wrap.appendChild(lbl);
    lessons.forEach(function(l, i) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:8px;align-items:center;margin:3px 0;font-size:11px;padding:3px 0;border-bottom:1px dashed rgba(255,255,255,0.05)";
      var num = (l.lessonNum != null ? l.lessonNum : (i + 1));
      var prefix = "<span style=\"color:var(--muted);opacity:0.6;width:24px;display:inline-block\">" + num + "</span>";
      if (l.empty) {
        var pfx = document.createElement("span");
        pfx.style.cssText = "color:var(--muted);opacity:0.6;width:24px;display:inline-block;flex-shrink:0";
        pfx.textContent = num;
        row.appendChild(pfx);
        var subjIn = document.createElement("input");
        subjIn.type = "text"; subjIn.placeholder = "Subject";
        subjIn.style.cssText = "flex:1;padding:2px 6px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:3px;font-size:11px";
        // Pre-fill the date from the Counter cell at the same block position,
        // when Counter has a date this Import row is missing. Green-tinted so
        // it's clearly auto-filled; still fully editable via the spinner.
        var autoDate = "";
        if (counterCells && counterCells[i] && !counterCells[i].empty) autoDate = counterCells[i].value || "";
        var sp = _fixDateSpinner(autoDate);
        sp.box.style.cssText += ";border:1px solid " + (autoDate ? "rgba(0,200,100,0.5)" : "var(--border)") + ";border-radius:3px;padding:2px 6px;flex-shrink:0";
        row.appendChild(subjIn); row.appendChild(sp.box);
        importControls.push({ subjIn: subjIn, sp: sp });
      } else {
        row.innerHTML = prefix +
          "<span style=\"color:var(--muted);width:60px\">" + (l.date || "—") + "</span>" +
          "<span style=\"flex:1\">" + (l.subject || "<em style=\"color:var(--muted)\">(no subject)</em>") + "</span>";
      }
      wrap.appendChild(row);
    });
    return wrap;
  }

  // ─── COUNTER section title ───────────────────────────────────
  var counterTitle = document.createElement("div");
  counterTitle.style.cssText = "font-size:13px;color:#fff;font-weight:600;margin:0 0 10px;padding-bottom:4px;border-bottom:1px solid var(--border)";
  counterTitle.textContent = "RPM Counter";
  body.appendChild(counterTitle);

  // Counter dates come back oldest→newest: previous block first, current block last.
  // Past block on top, current below (only show Past if there's a prior block).
  var cDates = d.counter.dates || [];
  var counterCurrentCells = cDates.slice(Math.max(0, cDates.length - 4));
  if (cDates.length > 4) body.appendChild(counterBlock("Previous Block", cDates.slice(0, cDates.length - 4)));
  body.appendChild(counterBlock("Current Block", counterCurrentCells));

  // Finished (E): keyboard 1→2→3→4 cycler (↑↓).
  var eRow = document.createElement("div");
  eRow.style.cssText = "display:flex;gap:10px;align-items:center;margin:10px 0 4px";
  eRow.innerHTML = "<span style=\"color:var(--muted);text-transform:uppercase;font-size:10px;letter-spacing:0.5px\">Finished (E):</span>";
  var finishedSp = _fixCycleSpinner(d.counter.finished, 1, 4);
  finishedSp.box.style.cssText += ";border:1px solid var(--border);border-radius:3px;padding:2px 12px;font-size:13px";
  eRow.appendChild(finishedSp.box);
  body.appendChild(eRow);

  // One Log button commits the whole Counter row (all cells + Finished).
  var counterLog = document.createElement("button");
  counterLog.textContent = "Log to Counter";
  counterLog.style.cssText = "margin-top:8px;padding:6px 16px;font-size:12px;background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4);border-radius:4px;cursor:pointer;font-weight:600";
  counterLog.onclick = function() {
    var fields = counterControls.map(function(c) { return { col: c.col, value: c.sp.getValue() }; });
    _saveCounterRow(d.counter.row, fields, finishedSp.getValue(), counterLog);
  };
  body.appendChild(counterLog);

  // ─── STUDENTS IMPORT section title ───────────────────────────
  var importTitle = document.createElement("div");
  importTitle.style.cssText = "font-size:13px;color:#fff;font-weight:600;margin:20px 0 10px;padding-bottom:4px;border-bottom:1px solid var(--border)";
  importTitle.textContent = "Students Import";
  body.appendChild(importTitle);

  if (!d.importLessons.length) {
    var none = document.createElement("div");
    none.style.cssText = "font-style:italic;color:var(--muted);margin-bottom:14px";
    none.textContent = "No lessons logged";
    body.appendChild(none);
  } else {
    // importLessons returned chronologically (oldest first): previous block then current.
    var imp = d.importLessons;
    if (imp.length > 4) body.appendChild(importBlock("Previous Block", imp.slice(0, imp.length - 4), null));
    body.appendChild(importBlock("Current Block", imp.slice(Math.max(0, imp.length - 4)), counterCurrentCells));
  }

  // One Log button commits all filled-in Students Import rows.
  if (importControls.length) {
    var importLog = document.createElement("button");
    importLog.textContent = "Log to Students Import";
    importLog.style.cssText = "margin-top:6px;padding:6px 16px;font-size:12px;background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4);border-radius:4px;cursor:pointer;font-weight:600";
    importLog.onclick = function() { _logImportSection(importControls, importLog); };
    body.appendChild(importLog);
  }

  // ─── CALENDAR section ────────────────────────────────────────
  var calTitle = document.createElement("div");
  calTitle.style.cssText = "font-size:13px;color:#fff;font-weight:600;margin:20px 0 10px;padding-bottom:4px;border-bottom:1px solid var(--border)";
  calTitle.textContent = "Google Calendar — last 8 past events";
  body.appendChild(calTitle);

  var calRow = document.createElement("div");
  calRow.style.cssText = "font-size:11px;color:var(--muted);font-family:monospace";
  calRow.textContent = (d.calendar && d.calendar.length) ? d.calendar.join("  ·  ") : "No past events found";
  body.appendChild(calRow);
}

// Commit the whole Counter row at once: every block cell + Finished (E).
function _saveCounterRow(row, fields, finished, btn) {
  var url = getScriptUrl(); if (!url) return;
  var orig = btn.textContent;
  btn.textContent = "Saving..."; btn.disabled = true;
  callScript(url, "saveCounterRow", {
    row: row,
    finished: finished,
    fields: JSON.stringify(fields)
  }, function(data) {
    if (data && data.success) {
      btn.textContent = "✓ Saved";
      setTimeout(function() { if (_fixCurrentName) _loadFixData(_fixCurrentName); }, 500);
    } else {
      btn.textContent = orig; btn.disabled = false;
      addLog("auditFeed", "❌ " + (data && data.message ? data.message : "Save failed"), "error");
    }
  });
}

// Log every filled-in empty Students Import row (subject + date) in sequence
// via the existing logLesson endpoint. One button, N rows.
function _logImportSection(controls, btn) {
  var pending = controls.filter(function(c) { return c.subjIn.value.trim() && c.sp.getValue(); });
  if (!pending.length) {
    btn.textContent = "Fill subject + date";
    setTimeout(function() { btn.textContent = "Log to Students Import"; btn.disabled = false; }, 1500);
    return;
  }
  var url = getScriptUrl(); if (!url) return;
  btn.textContent = "Logging..."; btn.disabled = true;
  var i = 0, ok = 0;
  function next() {
    if (i >= pending.length) {
      btn.textContent = "✓ Logged " + ok;
      setTimeout(function() { if (_fixCurrentName) _loadFixData(_fixCurrentName); }, 600);
      return;
    }
    var c = pending[i++];
    callScript(url, "logLesson", {
      studentName: _fixCurrentName,
      subject:     (typeof toTitleCase === "function") ? toTitleCase(c.subjIn.value) : c.subjIn.value,
      lessonDate:  c.sp.getValue(),
      trialPaid:   "0"
    }, function(data) {
      if (data && data.success) ok++;
      next();
    });
  }
  next();
}

function _saveCounterField(row, col, value, btn) {
  var url = getScriptUrl(); if (!url) return;
  var orig = btn.textContent;
  btn.textContent = "..."; btn.disabled = true;
  callScript(url, "setCounterField", { row: row, col: col, value: value }, function(data) {
    if (data && data.success) {
      btn.textContent = "✓";
      setTimeout(function() { if (_fixCurrentName) _loadFixData(_fixCurrentName); }, 400);
    } else {
      btn.textContent = orig; btn.disabled = false;
      addLog("auditFeed", "❌ " + (data && data.message ? data.message : "Save failed"), "error");
    }
  });
}

function _logImportRow(subject, date, btn) {
  if (!subject || !date) { btn.textContent = "Subj+Date"; return; }
  var url = getScriptUrl(); if (!url) return;
  btn.textContent = "..."; btn.disabled = true;
  // Reuse existing logLesson endpoint: writes to next empty I row with subject + date
  callScript(url, "logLesson", {
    studentName: _fixCurrentName,
    subject:     toTitleCase ? toTitleCase(subject) : subject,
    lessonDate:  date,
    trialPaid:   "0"
  }, function(data) {
    if (data && data.success) {
      btn.textContent = "✓";
      setTimeout(function() { if (_fixCurrentName) _loadFixData(_fixCurrentName); }, 400);
    } else {
      btn.textContent = "Log"; btn.disabled = false;
      addLog("auditFeed", "❌ " + (data && data.message ? data.message : "Log failed"), "error");
    }
  });
}

// Open the Payments tab's Cash Payment modal with this student preselected
// and the date prefilled with the last lesson date (instead of today).
function _openCashFromAudit(studentName, lessonDate) {
  if (typeof openManualEntryModal !== "function" || typeof openCashLogPanel !== "function") {
    addLog("auditFeed", "Cash payment flow not loaded", "error");
    return;
  }
  openManualEntryModal();
  var tab = (studentName || "").split(" ")[0].toUpperCase();
  openCashLogPanel(studentName, tab, null);
  if (lessonDate) {
    var input = document.getElementById("cashDate");
    if (input) input.value = lessonDate; // normalizePayDate adds current year on submit
  }
}

function _sendReminder(student, btn, infoEl) {
  var url = getScriptUrl();
  if (!url) return;
  btn.textContent = "Sending..."; btn.disabled = true;
  var completed = (student.completedDates || []).join(",");
  callScript(url, "sendPaymentReminder", {
    studentName: student.name,
    lessonNum:   student.lessonNum,
    lessonDate:  student.lessonDate,
    completedDates: completed
  }, function(data) {
    if (data && data.success) {
      btn.textContent = "✓ Sent";
      btn.style.background = "rgba(0,200,100,0.15)";
      btn.style.color = "var(--green)";
      btn.style.borderColor = "rgba(0,200,100,0.4)";
      var nowStr = (new Date()).toLocaleString();
      if (infoEl) infoEl.textContent = "Last reminder sent: just now";
      addLog("auditFeed", "✓ Reminder sent to " + student.name, "success");
    } else {
      btn.textContent = "Send Reminder →"; btn.disabled = false;
      addLog("auditFeed", "❌ " + (data && data.message ? data.message : "Reminder failed"), "error");
    }
  });
}

function renderBlockSyncCards(audit) {
  var section = document.getElementById("auditBlockSection");
  section.innerHTML = "";

  if (!audit.length) {
    section.innerHTML = '<div style="color:var(--green);font-size:11px;text-align:center;padding:20px">Counter and Students Import last lessons are in sync ✓</div>';
    return;
  }

  audit.forEach(function(s) {
    var card = document.createElement("div");
    card.style.cssText = "padding:12px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;background:var(--panel);cursor:pointer";
    card.onclick = function() { openAuditFixModal(s.name); };

    var name = document.createElement("div");
    name.style.cssText = "font-weight:600;margin-bottom:8px;font-size:13px";
    name.textContent = s.name;
    card.appendChild(name);

    var counterLine = document.createElement("div");
    counterLine.style.cssText = "font-size:11px;color:var(--muted);margin:4px 0";
    counterLine.innerHTML = "Counter: lesson <b style=\"color:var(--text)\">" + s.counterLesson + "</b> on <b style=\"color:var(--text)\">" + (s.counterDate || "?") + "</b>";
    card.appendChild(counterLine);

    var importLine = document.createElement("div");
    importLine.style.cssText = "font-size:11px;color:var(--muted);margin:4px 0";
    importLine.innerHTML = "Students Import: lesson <b style=\"color:var(--text)\">" + (s.importLesson != null ? s.importLesson : "?") + "</b> on <b style=\"color:var(--text)\">" + (s.importDate || "?") + "</b>";
    card.appendChild(importLine);

    var diff = document.createElement("div");
    diff.style.cssText = "margin-top:6px";
    if (!s.dateMatch) {
      var b = document.createElement("span");
      b.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:3px;font-size:11px";
      b.textContent = "Date mismatch";
      diff.appendChild(b);
    }
    if (!s.posMatch) {
      var b2 = document.createElement("span");
      b2.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:3px;font-size:11px";
      b2.textContent = "Lesson # mismatch";
      diff.appendChild(b2);
    }
    if (s.countMatch === false) {
      var b3 = document.createElement("span");
      b3.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:3px;font-size:11px";
      b3.textContent = "E vs dates mismatch (" + s.blockDateCount + " dates, E=" + s.counterLesson + ")";
      diff.appendChild(b3);
    }
    card.appendChild(diff);

    section.appendChild(card);
  });
}

// Convert an audit display date like "Jun 19" into a local-noon date string
// that logLesson can parse without any timezone off-by-one. Picks the year
// that lands the date closest to today (handles Dec dates viewed in Jan).
function _auditDateToEventDate(disp) {
  var m = (disp || "").trim().match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (!m) return null;
  var mon = MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase());
  if (mon < 0) return null;
  var day = parseInt(m[2], 10);
  var now = new Date();
  var year = now.getFullYear();
  var cand = new Date(year, mon, day);
  // If the candidate is far in the future, it's really last year's date.
  if ((cand - now) > 60 * 24 * 60 * 60 * 1000) year--;
  var mm = String(mon + 1).length === 1 ? "0" + (mon + 1) : "" + (mon + 1);
  var dd = day < 10 ? "0" + day : "" + day;
  return year + "-" + mm + "-" + dd + "T12:00:00";
}

// Open the same lesson-log modal used on the Lessons tab, pre-set to this
// student + this missing date. LOG IT writes the lesson (date + notes) into
// Students Import via logLesson, exactly like a normal lesson.
function openAuditLessonLog(name, disp) {
  var eventDate = _auditDateToEventDate(disp);
  if (!eventDate) { addLog("auditFeed", "Could not read date: " + disp, "error"); return; }
  window._auditFixActive = true;
  window._auditResolve = { name: name, disp: disp };
  _floatLogPanel();
  openLogFresh({ name: name, eventDate: eventDate, calType: "regular" }, undefined);
}

// ─── OPTIMISTIC REMOVAL ──────────────────────────────────────────────────────
// After a successful log from the audit flow we already know that one date is
// resolved — so drop the chip locally instead of re-running the whole audit.
// The ↻ Refresh button re-verifies against the sheets whenever you want.
function _auditRemoveResolved(name, disp) {
  var section = document.getElementById("auditLessonSection");
  if (!section) return;
  var cards = section.querySelectorAll('[data-audit-student]');
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute("data-audit-student") !== name) continue;
    var card = cards[i];
    var chips = card.querySelectorAll('.audit-missing-chip');
    for (var j = 0; j < chips.length; j++) {
      if (chips[j].getAttribute("data-audit-date") !== disp) continue;
      var chip = chips[j];
      chip.style.background = "rgba(0,200,0,0.18)";
      chip.style.color = "#3ddc84";
      chip.style.borderColor = "rgba(0,200,0,0.5)";
      chip.onclick = null;
      chip.style.cursor = "default";
      setTimeout(function() {
        chip.style.opacity = "0";
        setTimeout(function() { chip.remove(); _auditCollapseIfEmpty(card); }, 300);
      }, 350);
      return;
    }
    _auditCollapseIfEmpty(card);
    return;
  }
}

// When a card has no missing chips AND no format warnings left, fade it out.
// Cards with warnings stay put — those still need a manual look.
function _auditCollapseIfEmpty(card) {
  if (!card) return;
  var missing = card.querySelectorAll('.audit-missing-chip').length;
  var warns   = card.querySelectorAll('.audit-warn-chip').length;
  if (missing > 0 || warns > 0) return;
  card.style.transition = "opacity 0.4s";
  card.style.opacity = "0";
  setTimeout(function() { card.remove(); _auditCheckAllClear(); }, 400);
}

// If every card is gone, show the green all-clear message.
function _auditCheckAllClear() {
  var section = document.getElementById("auditLessonSection");
  if (!section) return;
  if (!section.querySelector('[data-audit-student]')) {
    section.innerHTML = '<div style="color:var(--green);font-size:11px;text-align:center;padding:20px">All Counter dates exist in Students Import ✓</div>';
  }
}

// 📅 Calendar button — open Google Calendar in a new tab.
function openGoogleCalendar() {
  window.open("https://calendar.google.com/calendar/r", "_blank", "noopener");
}

// ↻ Refresh button — re-run all three audits against the live sheets.
function refreshAudit(btn) {
  if (btn) {
    var orig = btn.textContent;
    btn.textContent = "↻ Refreshing...";
    btn.disabled = true;
    setTimeout(function() { btn.textContent = orig; btn.disabled = false; }, 2500);
  }
  if (typeof initAuditTab === "function") initAuditTab();
}

// The log modal lives inside the Lessons tab (display:none when another tab is
// active). To use it from the Audit tab, lift it into a floating overlay on
// <body>, then restore it to its original spot when it closes.
function _floatLogPanel() {
  var panel = document.getElementById("logPanel");
  if (!panel || window._logPanelHome) return; // already floated
  window._logPanelHome = {
    parent: panel.parentNode,
    next:   panel.nextSibling,
    css:    panel.style.cssText
  };
  var back = document.createElement("div");
  back.id = "auditLogBackdrop";
  back.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px";
  back.onclick = function(e) { if (e.target === back) closeLogPanel(); };
  document.body.appendChild(back);
  back.appendChild(panel);
  panel.style.cssText = "width:min(560px,94vw);max-height:88vh;overflow:auto;margin:0;z-index:9999";
}

function _unfloatLogPanel() {
  var home = window._logPanelHome;
  if (!home) return;
  var panel = document.getElementById("logPanel");
  panel.style.cssText = home.css;
  home.parent.insertBefore(panel, home.next);
  var back = document.getElementById("auditLogBackdrop");
  if (back) back.remove();
  window._logPanelHome = null;
}

function renderAuditCards(audit) {
  var section = document.getElementById("auditLessonSection");
  section.innerHTML = "";

  if (!audit.length) {
    section.innerHTML = '<div style="color:var(--green);font-size:11px;text-align:center;padding:20px">All Counter dates exist in Students Import ✓</div>';
    return;
  }

  audit.forEach(function(student) {
    var card = document.createElement("div");
    card.className = "audit-card";
    card.setAttribute("data-audit-student", student.name);
    card.style.cssText = "padding:12px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;background:var(--panel)";

    var nameEl = document.createElement("div");
    nameEl.style.cssText = "font-weight:600;margin-bottom:8px;font-size:13px";
    nameEl.textContent = student.name;
    if (student.missing && student.missing.length) {
      nameEl.style.cursor = "pointer";
      nameEl.title = "Log " + student.missing[0] + " into Students Import";
      nameEl.onclick = function() { openAuditLessonLog(student.name, student.missing[0]); };
    }
    card.appendChild(nameEl);

    if (student.missing && student.missing.length) {
      var hdr = document.createElement("div");
      hdr.style.cssText = "font-size:10px;color:var(--muted);margin:6px 0 4px;text-transform:uppercase;letter-spacing:0.5px";
      hdr.textContent = "In Counter, missing from Students Import — tap a date to log it";
      card.appendChild(hdr);

      student.missing.forEach(function(d) {
        var b = document.createElement("span");
        b.className = "audit-missing-chip";
        b.setAttribute("data-audit-date", d);
        b.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:3px;font-size:11px;font-weight:500;cursor:pointer;transition:opacity 0.3s,background 0.3s,color 0.3s";
        b.textContent = d;
        b.title = "Log " + d + " into Students Import";
        b.onclick = function() { openAuditLessonLog(student.name, d); };
        card.appendChild(b);
      });
    }

    if (student.warnings && student.warnings.length) {
      var whdr = document.createElement("div");
      whdr.style.cssText = "font-size:10px;color:var(--muted);margin:10px 0 4px;text-transform:uppercase;letter-spacing:0.5px";
      whdr.textContent = "⚠ Format warnings — manual check needed";
      card.appendChild(whdr);

      student.warnings.forEach(function(w) {
        var b = document.createElement("div");
        b.className = "audit-warn-chip";
        b.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,220,0,0.12);color:#d4a800;border:1px solid rgba(255,220,0,0.4);border-radius:3px;font-size:11px";
        b.textContent = w.sheet + " " + w.cell + ": \"" + (w.value || "") + "\"";
        card.appendChild(b);
      });
    }

    section.appendChild(card);
  });
}
