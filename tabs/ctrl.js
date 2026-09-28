// ─── TABS / CTRL.JS ─────────────────────────────────────────────────────────
// AUDIT 1: Counter dates that don't exist in Students Import.
// Read-only — reports discrepancies + format warnings, no fix actions.

function initAuditTab() {
  var url = getScriptUrl();
  if (!url) {
    document.getElementById("auditLessonSection").innerHTML = '<div class="empty-state">No script URL set</div>';
    document.getElementById("auditUnpaidSection").innerHTML = '<div class="empty-state">No script URL set</div>';
    return;
  }
  _runSyncAudits(url);
  _runAudit3(url);
}

// Audits 1 (lesson dates) + 2 (block sync) fetch in parallel and render as ONE
// merged card list — one card per student, so the same problem never shows up
// twice. Both backend audits stay untouched; only the presentation merges.
function _runSyncAudits(url) {
  var section = document.getElementById("auditLessonSection");
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  var results = { dates: null, sync: null };
  var failed = false;

  function done() {
    if (failed || results.dates === null || results.sync === null) return;
    renderMergedAuditCards(results.dates, results.sync);
  }
  function fail(msg) {
    if (failed) return;
    failed = true;
    _auditSectionFail(section, msg);
  }

  fetch(url + "?action=auditLessonDates")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { fail(data.message || "unknown"); return; }
      results.dates = data.audit || [];
      done();
    })
    .catch(function() { fail("No answer from Google."); });

  fetch(url + "?action=auditBlockSync")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { fail(data.message || "unknown"); return; }
      results.sync = data.audit || [];
      done();
    })
    .catch(function() { fail("No answer from Google."); });
}

function _runAudit3(url) {
  var section = document.getElementById("auditUnpaidSection");
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  fetch(url + "?action=auditUnpaid")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { _auditSectionFail(section, data.message || "unknown"); return; }
      renderUnpaidCards(data.audit || []);
    })
    .catch(function() { _auditSectionFail(section, "No answer from Google."); });
}

// A section that could not load: the Trial tab's red badge, reason in its tooltip.
function _auditSectionFail(section, why) {
  section.innerHTML = '<div class="empty-state" id="' + section.id + 'Fail"></div>';
  rpmFail(section.id + "Fail", why, "center");
}

// ─── UNPAID STUDENTS: Inquiries-style cards (2026-09-27) ─────────────────────
// Who shows up is the shared backend rule (RPM_PayState.js): the NEXT lesson
// has to be paid for. One card per student:
//   name
//   caps line   UNPAID / OWES N BLOCKS · LESSON n · date        (amber)
//               OVERDUE · LESSON 4 DONE date                    (red)
//               DUE AT THIS LESSON · LESSON 4 TODAY             (amber)
//   rows        Block −1, Block −2, Last paid, Reminder
//   pending     each Venmo/Zelle waiting, with Confirm payment ▸
//   buttons     Log cash ▸ (dim, left) · Send reminder (amber, right; only
//               when nothing is pending — a waiting payment is the answer)
function _auDate(d) { return (d || "").toString().replace(/\s*\/\s*/, " ").trim(); }
function _auEsc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function _auStatusLine(s) {
  var owes = s.owes || 0, n = s.lessonNum, d = _auDate(s.lessonDate);
  if (s.status === "Due at this lesson") return { cls: "due", text: "Due at this lesson · Lesson 4 today" };
  if (s.status === "Overdue") {
    return { cls: "over", text: "Overdue" + (owes >= 2 ? " · Owes " + owes + " blocks" : "") + " · Lesson 4 done " + d };
  }
  return { cls: "due", text: (owes >= 2 ? "Owes " + owes + " blocks" : "Unpaid") + " · Lesson " + n + " · " + d };
}

function renderUnpaidCards(audit) {
  var section = document.getElementById("auditUnpaidSection");
  if (!audit.length) { section.innerHTML = '<div class="empty-state">None</div>'; return; }
  window._auUnpaid = audit;
  section.innerHTML = audit.map(_auUnpaidCard).join("");
}

function _auUnpaidCard(s, i) {
  var line = _auStatusLine(s);
  var rows = "";
  (s.prevBlocks || []).forEach(function(pb, idx) {
    var v = (pb.paid ? "Paid" : "Unpaid") + (pb.paymentDate ? " · " + _auDate(pb.paymentDate) : "") + (pb.paymentNote ? " · " + pb.paymentNote : "");
    rows += '<span class="inq-flabel">Block −' + (idx + 1) + '</span><span class="inq-fval">' + _auEsc(v) + '</span>';
  });
  var lp = (s.lastPayments || [])[0];
  rows += '<span class="inq-flabel">Last paid</span><span class="inq-fval">' +
    (lp ? _auEsc([lp.amount, lp.date, lp.method].filter(Boolean).join(" · ")) : "None") + '</span>';
  rows += '<span class="inq-flabel">Reminder</span><span class="inq-fval" id="auRem-' + i + '">' +
    _auEsc(s.lastReminderAt || "None sent yet") + '</span>';

  var pending = s.pendingPayments || [];
  var pendHtml = "";
  if (pending.length) {
    pendHtml = '<hr class="divider" style="margin:18px 0">' +
      '<div class="au-cap">Pending payment</div>' +
      pending.map(function(p, j) {
        return '<div class="au-pend" id="auPend-' + i + '-' + j + '">' +
          '<span class="au-amt">' + _auEsc(p.amount) + '</span>' +
          '<span>' + _auEsc(p.method) + '</span><span>' + _auEsc(p.date) + '</span>' +
          '<button class="inq-db yes opens-window" style="margin-left:auto" onclick="_auConfirm(' + i + ',' + j + ')" ' +
            'data-tip="Opens a note box under this line.\nLogs the payment and ticks their Students Import box.\n(Not in Email list.)" data-tip-wrap data-tip-left>Confirm payment</button>' +
        '</div>';
      }).join("");
  }

  var right = pending.length ? "" :
    '<button class="link-btn amber" id="auRemBtn-' + i + '" onclick="_auRemind(' + i + ')" ' +
      'data-tip="Instant.\nEmails them a payment reminder.\nNo amounts in it." data-tip-wrap data-tip-left>' +
      ENVELOPE_ICON + '<span>Send reminder</span></button>';

  return '<div class="inq-dcard au-card" id="auCard-' + i + '">' +
      '<div class="inq-name-line"><span class="inq-name">' + _auEsc(s.name) + '</span></div>' +
      '<div class="au-sub ' + line.cls + '">' + _auEsc(line.text) + '</div>' +
      '<hr class="divider" style="margin:18px 0">' +
      '<div class="inq-fields">' + rows + '</div>' +
      pendHtml +
      '<hr class="divider" style="margin:18px 0 16px">' +
      '<div class="au-acts">' +
        '<button class="link-btn opens-window" onclick="_auCash(' + i + ')" ' +
          'data-tip="Opens a window.\nLogs a cash payment for them." data-tip-wrap>Log cash</button>' +
        '<span class="au-state" id="auState-' + i + '"></span>' +
        right +
      '</div>' +
    '</div>';
}

function _auCash(i) {
  var s = (window._auUnpaid || [])[i]; if (!s) return;
  _openCashFromAudit(s.name, s.lessonDate);
}

// Confirm opens the Payments tab's note box under the pending line. Once both
// writes land the whole list is checked again: they may be paid up now.
function _auConfirm(i, j) {
  var s = (window._auUnpaid || [])[i]; if (!s) return;
  var p = (s.pendingPayments || [])[j];
  var row = document.getElementById("auPend-" + i + "-" + j);
  if (!p || !row) return;
  if (typeof openIncomingNotePanel !== "function") { rpmToast("fail", "Unsuccessful", "Confirm isn't loaded. Use the Payments tab."); return; }
  openIncomingNotePanel(p, row, function() { var url = getScriptUrl(); if (url) _runAudit3(url); });
}



// ─── AUDIT 2 FIX MODAL ──────────────────────────────────────────────────────
var _fixCurrentName = null;

function openAuditFixModal(studentName) {
  _fixCurrentName = studentName;
  document.getElementById("auditFixOverlay").style.display = "flex";
  document.getElementById("auditFixTitle").textContent = "Fix: " + studentName;
  document.getElementById("auditFixBody").innerHTML = '<div class="empty-state rpm-loading" style="padding:24px">Loading</div>';
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
function _fixDateSpinner(initialDisp, onChange) {
  var p = _fixParseMonDay(initialDisp);
  var state = { mon: p ? p.mon : null, day: p ? p.day : null };

  var box = document.createElement("span");
  box.style.cssText = "display:inline-flex;align-items:center;gap:2px;color:var(--muted)";
  var monSeg = _fixDateSeg(), daySeg = _fixDateSeg();

  function refresh() {
    monSeg.textContent = (state.mon != null) ? _FIX_MONTHS[state.mon] : "—";
    daySeg.textContent = (state.day != null) ? String(state.day) : "—";
    if (typeof onChange === "function") onChange();
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
  // Up/Down steps the segment, Left/Right walks between month and day - the
  // same split the Payments and Travel date fields use. Left/Right used to do
  // nothing here, which was the only half of the rule this picker was missing.
  function handler(which, other) {
    return function(e) {
      if (e.key === "ArrowUp")   { e.preventDefault(); step(which, +1); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); step(which, -1); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); other.focus(); }
    };
  }
  monSeg.onkeydown = handler("mon", daySeg);
  daySeg.onkeydown = handler("day", monSeg);

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
  return {
    box: box,
    getValue: function() { return String(val); },
    setValue: function(v) {
      var n = parseInt(v, 10);
      if (isNaN(n)) return;
      val = Math.max(0, Math.min(max, n));
      refresh();
    }
  };
}

function _renderFixData(d) {
  var body = document.getElementById("auditFixBody");
  body.innerHTML = "";

  var counterControls = []; // { col, sp } across both Counter blocks
  var importControls  = []; // { subjIn, sp } for empty Students Import rows

  // Dates already logged in Students Import, as normalized "mon-day" keys. The
  // current-block auto-fill uses this so it only SUGGESTS Counter dates that are
  // genuinely missing from Import — never ones already logged. When Import is
  // caught up with Counter, every current-block box stays blank ("you decide");
  // if only 1 date is missing, only 1 box pre-fills, and so on.
  var _importDateKeys = {};
  (d.importLessons || []).forEach(function(l) {
    if (l && !l.empty && l.date) {
      var p = _fixParseMonDay(l.date);
      if (p) _importDateKeys[p.mon + "-" + p.day] = true;
    }
  });

  // Helper to render a Counter block (4 cells with inline date editing).
  // Current-block cells get an onChange hook so Finished (E) auto-tracks the
  // number of filled dates.
  function counterBlock(label, cells, isCurrent, onCellChange) {
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
      var sp = _fixDateSpinner(cell.value, isCurrent ? onCellChange : null);
      sp.box.style.flex = "1";
      pill.appendChild(sp.box);
      counterControls.push({ col: cell.col, sp: sp, current: !!isCurrent });
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
        if (counterCells && counterCells[i] && !counterCells[i].empty) {
          var cd = counterCells[i].value || "";
          var cp = _fixParseMonDay(cd);
          // Only pre-fill when this Counter date is NOT already logged in Import.
          if (cp && !_importDateKeys[cp.mon + "-" + cp.day]) autoDate = cd;
        }
        var sp = _fixDateSpinner(autoDate);
        sp.box.style.cssText += ";border:1px solid " + (autoDate ? "rgba(0,200,100,0.5)" : "var(--border)") + ";border-radius:3px;padding:2px 6px;flex-shrink:0";
        row.appendChild(subjIn); row.appendChild(sp.box);
        importControls.push({ subjIn: subjIn, sp: sp });
      } else {
        var pfx2 = document.createElement("span");
        pfx2.style.cssText = "color:var(--muted);opacity:0.6;width:24px;display:inline-block;flex-shrink:0";
        pfx2.textContent = num;
        var dateSpan = document.createElement("span");
        dateSpan.style.cssText = "color:var(--muted);width:60px;flex-shrink:0";
        dateSpan.textContent = l.date || "—";
        var subjSpan = document.createElement("span");
        subjSpan.style.cssText = "flex:1";
        subjSpan.innerHTML = l.subject || "<em style=\"color:var(--muted)\">(no subject)</em>";
        row.appendChild(pfx2); row.appendChild(dateSpan); row.appendChild(subjSpan);
        // ✕ removes this logged line from Students Import (undo a mistaken/dup log).
        if (l.row) {
          var del = document.createElement("button");
          del.textContent = "✕";
          del.title = "Remove this logged line from Students Import";
          del.style.cssText = "flex-shrink:0;padding:1px 7px;font-size:11px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:3px;cursor:pointer";
          (function(rowNum, label, btn) {
            btn.onclick = function() { _clearImportLesson(rowNum, label, btn); };
          })(l.row, (l.date || "") + " " + (l.subject || ""), del);
          row.appendChild(del);
        }
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

  // Finished (E) auto-tracks the count of filled current-block dates. Declared
  // here (reassigned once finishedSp exists) so current-block cells can call it.
  var recomputeFinished = function() {};
  function onCurrentCellChange() { recomputeFinished(); }

  // Counter dates come back oldest→newest: previous block first, current block last.
  // Past block on top, current below (only show Past if there's a prior block).
  var cDates = d.counter.dates || [];
  var counterCurrentCells = cDates.slice(Math.max(0, cDates.length - 4));
  if (cDates.length > 4) body.appendChild(counterBlock("Previous Block", cDates.slice(0, cDates.length - 4), false, null));
  body.appendChild(counterBlock("Current Block", counterCurrentCells, true, onCurrentCellChange));

  // Count filled current-block dates from the live spinners.
  function countFilledCurrent() {
    var n = 0;
    counterControls.forEach(function(c) { if (c.current && c.sp.getValue()) n++; });
    return n;
  }

  // Finished (E): auto-set to the current-block date count; still cyclable (↑↓).
  var eRow = document.createElement("div");
  eRow.style.cssText = "display:flex;gap:10px;align-items:center;margin:10px 0 4px";
  eRow.innerHTML = "<span style=\"color:var(--muted);text-transform:uppercase;font-size:10px;letter-spacing:0.5px\">Finished (E):</span>";
  var finishedSp = _fixCycleSpinner(countFilledCurrent(), 1, 4);
  finishedSp.box.style.cssText += ";border:1px solid var(--border);border-radius:3px;padding:2px 12px;font-size:13px";
  eRow.appendChild(finishedSp.box);
  var eHint = document.createElement("span");
  eHint.style.cssText = "font-size:9px;color:var(--muted);opacity:0.7";
  eHint.textContent = "auto from dates";
  eRow.appendChild(eHint);
  body.appendChild(eRow);

  // Now that finishedSp exists, live-sync it whenever a current date changes.
  recomputeFinished = function() { finishedSp.setValue(countFilledCurrent()); };

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
    none.textContent = "None";
    body.appendChild(none);
  } else {
    // importLessons returned chronologically (oldest first): previous block then current.
    // Import comes back anchored to Counter: exactly 2 blocks that line up with
    // Counter's Previous/Current. Label them the same way and auto-fill the
    // block aligned with Counter's current block from the Counter dates.
    var imp = d.importLessons;
    var hasPrev = cDates.length > 4;
    var block0 = imp.slice(0, 4);
    var block1 = imp.slice(4, 8);
    if (hasPrev) {
      if (block0.length) body.appendChild(importBlock("Previous Block", block0, null));
      if (block1.length) body.appendChild(importBlock("Current Block", block1, counterCurrentCells));
    } else {
      // No previous block in Counter → block0 is the current block.
      if (block0.length) body.appendChild(importBlock("Current Block", block0, counterCurrentCells));
      if (block1.length && !block1.every(function(l) { return l.empty; })) {
        body.appendChild(importBlock("Next Block", block1, null));
      }
    }
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

  if (!d.calendar || !d.calendar.length) {
    var calNone = document.createElement("div");
    calNone.style.cssText = "font-size:11px;color:var(--muted);font-family:monospace";
    calNone.textContent = "None";
    body.appendChild(calNone);
  } else {
    // Vertical list — one date per line, unnumbered (a calendar date isn't
    // tied to a lesson number). Each has a 2-tap delete that removes ONLY that
    // event from Google Calendar (for clearing a forgotten event).
    d.calendar.forEach(function(ev) {
      var isObj = (ev && typeof ev === "object");
      var dateText = isObj ? ev.date : ev;

      var line = document.createElement("div");
      line.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;color:var(--muted);font-family:monospace;padding:4px 0;border-bottom:1px dashed rgba(255,255,255,0.05)";

      var dateEl = document.createElement("span");
      dateEl.textContent = dateText;
      line.appendChild(dateEl);

      // Only offer delete when we have the event id + calendar id.
      if (isObj && ev.id && ev.calId) {
        var delBtn = document.createElement("button");
        delBtn.textContent = "✕";
        delBtn.title = "Delete this event from Google Calendar";
        delBtn.style.cssText = "padding:1px 8px;font-size:10px;background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:3px;cursor:pointer;flex-shrink:0";
        var armed = false;
        delBtn.onclick = function() {
          if (!armed) {
            armed = true;
            delBtn.textContent = "Delete?";
            delBtn.style.color = "#ff6b6b";
            delBtn.style.borderColor = "rgba(255,107,107,0.5)";
            setTimeout(function() {
              if (!armed) return;
              armed = false;
              delBtn.textContent = "✕";
              delBtn.style.color = "var(--muted)";
              delBtn.style.borderColor = "var(--border)";
            }, 3000);
            return;
          }
          _deleteCalEvent(ev.calId, ev.id, dateText, line, delBtn);
        };
        line.appendChild(delBtn);
      }

      body.appendChild(line);
    });
  }
}

// Delete one calendar event (2nd tap of the delete control confirmed it).
function _deleteCalEvent(calId, eventId, dateText, lineEl, btn) {
  var url = getScriptUrl(); if (!url) return;
  btn.textContent = "..."; btn.disabled = true;
  callScript(url, "deleteCalendarEvent", { calId: calId, eventId: eventId }, function(data) {
    if (data && data.success) {
      addLog("auditFeed", "✓ Deleted calendar event " + dateText, "success");
      lineEl.style.transition = "opacity 0.3s";
      lineEl.style.opacity = "0";
      setTimeout(function() { lineEl.remove(); }, 300);
    } else {
      btn.textContent = "✕"; btn.disabled = false;
      btn.style.color = "var(--muted)"; btn.style.borderColor = "var(--border)";
      addLog("auditFeed", "❌ " + (data && data.message ? data.message : "Delete failed"), "error");
    }
  });
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

// Remove a single already-logged Students Import line (the ✕ on a filled row).
// Confirms first, then clears that row's subject + date and reloads the modal.
function _clearImportLesson(row, label, btn) {
  if (!window.confirm("Remove this logged line?\n\n" + (label || "").trim())) return;
  var url = getScriptUrl(); if (!url) return;
  btn.textContent = "…"; btn.disabled = true;
  callScript(url, "clearImportLesson", { name: _fixCurrentName, row: row }, function(data) {
    if (data && data.success) {
      addLog("auditFeed", "🗑 Removed Students Import line: " + (label || "").trim(), "success");
      if (_fixCurrentName) _loadFixData(_fixCurrentName);
    } else {
      btn.textContent = "✕"; btn.disabled = false;
      addLog("auditFeed", "❌ " + (data && data.message ? data.message : "Remove failed"), "error");
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
  if (lessonDate) setCashDate(lessonDate); // spinner infers the year on submit
}

// Send reminder: the backend works out which email (mid-block, next block
// due, or 2+ blocks owed) from the same rule the card used. Trial feedback:
// the card dims with the moving dots, success only changes the words, a
// failure is the red badge beside the button, reason in its tooltip.
function _auRemind(i) {
  var url = getScriptUrl(); if (!url) return;
  var s = (window._auUnpaid || [])[i]; if (!s) return;
  var card = document.getElementById("auCard-" + i);
  var btn  = document.getElementById("auRemBtn-" + i);
  var st   = document.getElementById("auState-" + i);
  if (!btn || btn.disabled) return;
  if (st) st.innerHTML = "";
  btn.disabled = true; _trSetLabel(btn, "Sending…");
  rpmBusy(card, btn, true);
  fetch(url + "?action=sendPaymentReminder&studentName=" + encodeURIComponent(s.name))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      rpmBusy(card, btn, false);
      if (d && d.success) {
        _trSetLabel(btn, "Sent ✓");
        var rem = document.getElementById("auRem-" + i);
        if (rem) rem.textContent = "Just now";
      } else {
        btn.disabled = false; _trSetLabel(btn, "Send reminder");
        rpmFail(st, (d && d.message) || "Reminder failed");
      }
    })
    .catch(function() {
      rpmBusy(card, btn, false);
      btn.disabled = false; _trSetLabel(btn, "Send reminder");
      rpmFail(st, "No answer from Google. Check Sent mail before trying again.");
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
      chip.onclick = null;
      chip.style.cursor = "default";
      setTimeout(function() {
        chip.style.opacity = "0";
        setTimeout(function() { chip.remove(); _auChipsNext(card); _auditCollapseIfEmpty(card); }, 300);
      }, 350);
      return;
    }
    _auditCollapseIfEmpty(card);
    return;
  }
}

// When a card has no missing chips AND no format warnings left, fade it out.
// Cards with warnings stay put — those still need a manual look. Block-sync
// chips don't block the fade: logging the missing date is what fixes the sync,
// so the leftover mismatch info is stale — ↻ Refresh re-verifies for real.
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
    section.innerHTML = '<div class="empty-state">None</div>';
  }
}

// 📊 Counter / Students Import buttons — open the two source sheets in a new tab.
function openCounterSheet() {
  window.open("https://docs.google.com/spreadsheets/d/1n-vZaaIgbs1nBCwrE-dAUNyz3q8LWjkB4uO0BSKTCQc/edit", "_blank", "noopener");
}
function openImportSheet() {
  window.open("https://docs.google.com/spreadsheets/d/1GJB4BGETT4zeG1M7AKk48rhLaQw5ZqlImIDBC4ZepW4/edit", "_blank", "noopener");
}

// 📅 Calendar button — open Google Calendar in a new tab.
function openGoogleCalendar() {
  window.open("https://calendar.google.com/calendar/r", "_blank", "noopener");
}

// Re-runs all three audits against the live sheets. The Refresh button that
// used to call this is gone; Run Audit at the bottom of the tab does the same.
function refreshAudit(btn) {
  if (btn) {
    var orig = btn.textContent;
    btn.textContent = "↻ Refreshing...";
    btn.disabled = true;
    setTimeout(function() { btn.textContent = orig; btn.disabled = false; }, 2500);
  }
  if (typeof initAuditTab === "function") initAuditTab();
}

// The log modal lives inside the Home tab (display:none when another tab is
// active). Every opener (Today grid, student page, Audit) lifts it into a
// floating overlay on <body>, then restores it to its original spot when it
// closes. Sized like the Trial windows (460 wide).
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
  panel.style.cssText = "width:min(460px,94vw);box-sizing:border-box;max-height:90vh;overflow:auto;margin:0;z-index:9999";
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

// ─── LESSON SYNC: Inquiries-style cards (2026-09-27) ─────────────────────────
// Audits 1 (Counter dates missing from Students Import) + 2 (block sync)
// merged into one card per student, same card as Unpaid Students:
//   name
//   caps line   what is wrong, amber: "2 missing from Import · Sheets disagree"
//   rows        Counter / Import: lesson in block · latest date (when audit 2 ran)
//   chips       Missing from Import: a date ▸ opens the Log lesson window for it
//               Format check: cells to fix by hand
//   button      Fix ▸ (bright, right): Counter + Import + Calendar side by side
function renderMergedAuditCards(dateAudit, syncAudit) {
  var section = document.getElementById("auditLessonSection");

  // Merge by student name — date-audit students first, then sync-only ones.
  var byName = {}, order = [];
  dateAudit.forEach(function(s) {
    byName[s.name] = { name: s.name, missing: s.missing || [], warnings: s.warnings || [], sync: null };
    order.push(s.name);
  });
  syncAudit.forEach(function(s) {
    if (!byName[s.name]) {
      byName[s.name] = { name: s.name, missing: [], warnings: [], sync: s };
      order.push(s.name);
    } else {
      byName[s.name].sync = s;
    }
  });

  if (!order.length) { section.innerHTML = '<div class="empty-state">None</div>'; return; }
  window._auSync = byName;
  section.innerHTML = order.map(function(nm) { return _auSyncCard(byName[nm]); }).join("");
}

// Only the first chip still on the card opens the log window.
function _auLogChip(chip, name, d) {
  if (!chip.classList.contains("go")) return;
  openAuditLessonLog(name, d);
}

// After a date is logged and its chip leaves, the next one becomes the one
// you can click.
function _auChipsNext(card) {
  var chips = card ? card.querySelectorAll(".audit-missing-chip") : [];
  for (var c = 0; c < chips.length; c++) {
    chips[c].classList.toggle("go", c === 0);
    chips[c].classList.toggle("wait", c !== 0);
    if (c === 0) chips[c].setAttribute("data-tip", "Opens a window.\nLogs this lesson into Students Import.");
  }
}

function _auSyncCard(st) {
  var s = st.sync, nm = _auEsc(st.name), nmArg = _auEsc(JSON.stringify(st.name));
  var bits = [];
  if (st.missing.length) bits.push(st.missing.length + " missing from Import");
  // Missing lessons already explain why the sheets differ; "Sheets
  // disagree" only when nothing is missing (a real mismatch for Fix).
  if (!st.missing.length && s && (!s.dateMatch || !s.posMatch)) bits.push("Sheets disagree");
  if (s && s.countMatch === false) bits.push("Counter count off");
  if (st.warnings.length) bits.push(st.warnings.length + " to check by hand");

  var rows = "";
  if (s) {
    rows = '<hr class="divider" style="margin:18px 0">' +
      '<div class="inq-fields">' +
        // Import first, Counter under it: the Counter is always the later date.
        '<span class="inq-flabel au-caps">Import</span><span class="inq-fval au-caps">Lesson ' + _auEsc(s.importLesson != null ? s.importLesson : "?") + ' · ' + _auEsc(_auDate(s.importDate || "?")) + '</span>' +
        '<span class="inq-flabel au-caps">Counter</span><span class="inq-fval au-caps">Lesson ' + _auEsc(s.counterLesson) + ' · ' + _auEsc(_auDate(s.counterDate || "?")) + '</span>' +
        (s.countMatch === false
          ? '<span class="inq-flabel au-caps">Counter E</span><span class="inq-fval au-caps">E = ' + _auEsc(s.counterLesson) + ' · ' + _auEsc(s.blockDateCount) + ' dates in the block</span>'
          : '') +
      '</div>';
  }

  var chips = "";
  if (st.missing.length) {
    // Oldest first, and only the oldest can be logged: Import writes into its
    // next empty row whatever the date, so logging a later one first would
    // put the dates (and column M's lesson numbers) out of order.
    // Its own section under a rule, like Pending payment on the Unpaid cards.
    chips += '<hr class="divider" style="margin:18px 0">' +
      '<div class="au-cap">Not logged yet</div><div>' +
      st.missing.map(function(d, k) {
        return '<span class="au-chip audit-missing-chip ' + (k ? 'wait' : 'go') + '" data-audit-date="' + _auEsc(d) + '" ' +
          'onclick="_auLogChip(this,' + nmArg + ',' + _auEsc(JSON.stringify(d)) + ')" ' +
          'data-tip="' + (k ? 'Log the earlier date first.\nImport fills its rows in order.' : 'Opens a window.\nLogs this lesson into Students Import.') + '">' +
          _auEsc(d) + ' ▸</span>';
      }).join("") + '</div>';
  }
  if (st.warnings.length) {
    chips += '<hr class="divider" style="margin:18px 0">' +
      '<div class="au-cap">Check by hand</div><div>' +
      st.warnings.map(function(w) {
        return '<span class="au-chip audit-warn-chip">' + _auEsc(w.sheet + " " + w.cell + ": “" + (w.value || "") + "”") + '</span>';
      }).join("") + '</div>';
  }

  return '<div class="inq-dcard au-card" data-audit-student="' + nm + '">' +
      '<div class="inq-name-line"><span class="inq-name">' + nm + '</span></div>' +
      // Red, like OVERDUE on the Unpaid cards: something needs doing.
      '<div class="au-sub over">' + _auEsc(bits.join(" · ")) + '</div>' +
      rows + chips +
      '<hr class="divider" style="margin:18px 0 16px">' +
      '<div class="au-acts"><span class="au-state"></span>' +
        '<button class="link-btn bright opens-window" onclick="openAuditFixModal(' + nmArg + ')" ' +
          'data-tip="Opens a window.\nCounter, Students Import and Calendar side by side." data-tip-wrap data-tip-left>Fix</button>' +
      '</div>' +
    '</div>';
}
