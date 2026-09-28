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
  // Unpaid Students moved to the Payments tab (2026-09-28); it loads there.
}

// Audits 1 (lesson dates) + 2 (block sync) fetch in parallel and render as ONE
// merged card list — one card per student, so the same problem never shows up
// twice. Both backend audits stay untouched; only the presentation merges.
function _runSyncAudits(url) {
  var section = document.getElementById("auditLessonSection");
  section.innerHTML = '<div class="empty-state rpm-loading">Loading</div>';
  var results = { dates: null, sync: null, cal: null };
  var failed = false;

  function done() {
    if (failed || results.dates === null || results.sync === null || results.cal === null) return;
    renderMergedAuditCards(results.dates, results.sync, results.cal);
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

  // Calendar vs Counter (the logging gate). If it can't load, cards still
  // show, just ungated (results.cal = false).
  fetch(url + "?action=auditCalendarSync")
    .then(function(r) { return r.json(); })
    .then(function(data) { results.cal = (data && data.success) ? (data.audit || []) : false; done(); })
    .catch(function() { results.cal = false; done(); });

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

  // A Venmo / Zelle already waiting is confirmed in Incoming, at the top of
  // this tab; the card only points at it, so there is one place to confirm.
  var pending = s.pendingPayments || [];
  var pendHtml = "";
  if (pending.length) {
    pendHtml = '<hr class="divider" style="margin:18px 0">' +
      '<div class="au-cap">Pending payment</div>' +
      pending.map(function(p) {
        return '<div class="au-pend">' +
          '<span class="au-amt">' + _auEsc(p.amount) + '</span>' +
          '<span>' + _auEsc(p.method) + '</span><span>' + _auEsc(p.date) + '</span>' +
          '<span style="margin-left:auto">Waiting in Incoming above</span>' +
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




// ─── AUDIT 2 FIX MODAL ──────────────────────────────────────────────────────
var _fixCurrentName = null;

function openAuditFixModal(studentName) {
  _fixCurrentName = studentName;
  document.getElementById("auditFixOverlay").style.display = "flex";
  document.getElementById("auditFixTitle").textContent = studentName;
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

function _fixLoadFail(why) {
  var b = document.getElementById("auditFixBody");
  b.innerHTML = '<div class="empty-state" id="fxLoadFail"></div>';
  rpmFail("fxLoadFail", why, "center");
}

// A section's heading: the Trial windows' small grey caps field label.
function _fxHead(text, first) {
  var h = document.createElement("div");
  if (!first) { var hr = document.createElement("hr"); hr.className = "divider"; hr.style.margin = "20px 0"; h.appendChild(hr); }
  var l = document.createElement("div"); l.className = "field-label"; l.textContent = text; h.appendChild(l);
  return h;
}
// Bottom-right action row with a place for the Unsuccessful badge.
function _fxActs(btn) {
  var row = document.createElement("div"); row.className = "fx-acts";
  var st = document.createElement("span"); st.className = "fx-state"; row.appendChild(st);
  row.appendChild(btn);
  btn._fxState = st;
  return row;
}
function _fxBtn(label) {
  var b = document.createElement("button"); b.className = "link-btn bright";
  b.innerHTML = "<span>" + label + "</span>"; return b;
}
function _fxX(title) {
  var b = document.createElement("button"); b.className = "fx-x"; b.textContent = "✕"; b.setAttribute("data-tip", title); b.setAttribute("data-tip-left", "");
  return b;
}

function _loadFixData(studentName) {
  var url = getScriptUrl();
  if (!url) return;
  fetch(url + "?action=getStudentFixData&name=" + encodeURIComponent(studentName))
    .then(function(r) { return r.json(); })
    .then(function(resp) {
      if (!resp.success) {
        _fixLoadFail(resp.message || "unknown");
        return;
      }
      _renderFixData(resp.data);
    })
    .catch(function() {
      _fixLoadFail("No answer from Google.");
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
  b.className = "fx-seg";
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

// ─── DETAILS WINDOW (was Fix), 2026-09-28 ────────────────────────────────────
// The card's grid again, with more in it: CALENDAR over COUNTER over IMPORT
// for the Counter's last two blocks, then every lesson in that span with its
// subject. Click a cell to change it in that sheet (the editor opens under
// the grid). Data: getStudentFixData (Counter cells with columns, Import rows
// with row numbers + subjects, the last 8 past calendar events with ids).
var _dx = null;   // { d, slots, cal, extras, counterSp[], editing }

function _dxN(disp) {
  var p = _fixParseMonDay(disp);
  return p ? p.mon + "-" + p.day : "";
}
function _dxShort(disp) {
  var p = _fixParseMonDay(disp);
  return p ? _FIX_MONTHS[p.mon] + " " + p.day : (disp || "");
}

function _renderFixData(d) {
  var body = document.getElementById("auditFixBody");

  // 8 slots: previous block 1-4, current block 1-4. With only one Counter
  // block, it sits in the second half and the first half stays empty.
  var cDates = d.counter.dates || [];
  var imp    = d.importLessons || [];
  var slots  = [];
  for (var k = 0; k < 8; k++) slots.push({ k: k, counter: null, imp: null });
  var cOff = cDates.length > 4 ? 0 : 4;
  cDates.forEach(function(c, i) { if (slots[cOff + i]) slots[cOff + i].counter = c; });
  // Import is matched to the Counter by DATE, not by position: the backend's
  // Import window moves on a block once Import's block is complete, so by
  // position it could sit a whole block off (Antonio, 2026-09-28).
  var impBy = {}, impFirst = null;
  imp.forEach(function(l) {
    if (!l || l.empty || !l.date) return;
    impBy[_dxN(l.date)] = l;
    var p = _fixParseMonDay(l.date);
    if (p) { var dd = new Date(_fixInferYear(p.mon, p.day), p.mon, p.day); if (!impFirst || dd < impFirst) impFirst = dd; }
  });
  var used = {};
  slots.forEach(function(sl) {
    if (!sl.counter || sl.counter.empty) return;
    var key = _dxN(sl.counter.value);
    if (impBy[key]) { sl.imp = impBy[key]; used[key] = true; return; }
    // Older than every Import row the backend sent: can't tell, so it isn't
    // called missing (the card, which reads Import properly, is the judge).
    var p = _fixParseMonDay(sl.counter.value);
    if (p && impFirst && new Date(_fixInferYear(p.mon, p.day), p.mon, p.day) < impFirst) sl.impUnknown = true;
  });
  // Import lessons in the span that match no Counter date.
  var impExtras = [];
  imp.forEach(function(l) { if (l && !l.empty && l.date && !used[_dxN(l.date)]) impExtras.push(l); });

  // Calendar events land on the slot whose Counter date they match. Any
  // other event inside the grid's span is an extra (on the calendar, not
  // counted); older ones are outside the picture and left out.
  var byDate = {};
  slots.forEach(function(s) { if (s.counter && !s.counter.empty) byDate[_dxN(s.counter.value)] = s; });
  var firstDate = null;
  slots.forEach(function(s) { if (!firstDate && s.counter && !s.counter.empty) firstDate = _fixParseMonDay(s.counter.value); });
  var extras = [];
  (d.calendar || []).forEach(function(ev) {
    var key = _dxN(ev.date);
    if (byDate[key] && !byDate[key].cal) { byDate[key].cal = ev; return; }
    var p = _fixParseMonDay(ev.date);
    if (!p || !firstDate) return;
    var y = _fixInferYear(p.mon, p.day), fy = _fixInferYear(firstDate.mon, firstDate.day);
    if (new Date(y, p.mon, p.day) >= new Date(fy, firstDate.mon, firstDate.day)) extras.push(ev);
  });

  // Counter spinners for every slot: the editor shows one at a time, Save
  // sends them all (the old window's saveCounterRow, unchanged).
  var counterSp = slots.map(function(s) {
    return s.counter ? _fixDateSpinner(s.counter.value) : null;
  });
  _dx = { d: d, slots: slots, extras: extras, counterSp: counterSp, cOff: cOff };

  body.innerHTML = "";
  // The window icon under the title, as in the Trial windows: om-56, gear + wrench.
  var ic = document.createElement("div"); ic.style.margin = "4px 0 18px";
  ic.innerHTML = FIX_ICON;
  body.appendChild(ic);
  var gl = document.createElement("div"); gl.className = "field-label"; gl.textContent = "Last two blocks";
  body.appendChild(gl);
  body.appendChild(_dxGrid());
  if (extras.length) {
    var ex = document.createElement("div"); ex.className = "dx-extra";
    ex.innerHTML = "On the calendar, not in the Counter: " + extras.map(function(e, i) {
      return '<span class="dx-exchip" onclick="_dxEdit(\'extra\',' + i + ')">' + _auEsc(_dxShort(e.date)) + ' ▸</span>';
    }).join(" ");
    body.appendChild(ex);
  }
  // Only Import lessons dated inside the grid's span count as extras.
  var fp = firstDate ? new Date(_fixInferYear(firstDate.mon, firstDate.day), firstDate.mon, firstDate.day) : null;
  impExtras = impExtras.filter(function(l) {
    var p = _fixParseMonDay(l.date); if (!p || !fp) return false;
    return new Date(_fixInferYear(p.mon, p.day), p.mon, p.day) >= fp;
  });
  if (impExtras.length) {
    var ix = document.createElement("div"); ix.className = "dx-extra";
    ix.textContent = "In Import, not in the Counter: " + impExtras.map(function(l) { return _dxShort(l.date); }).join(", ");
    body.appendChild(ix);
  }
  var ed = document.createElement("div"); ed.id = "dxEditor"; body.appendChild(ed);

  var hr = document.createElement("hr"); hr.className = "divider"; hr.style.margin = "20px 0"; body.appendChild(hr);
  var ll = document.createElement("div"); ll.className = "field-label"; ll.textContent = "Lessons"; body.appendChild(ll);
  body.appendChild(_dxLessons());
}

function _dxGrid() {
  var s = _dx.slots;
  function head() {
    var h = '<th></th>';
    for (var k = 0; k < 8; k++) h += (k === 4 ? '<th class="gap"></th>' : '') + '<th>' + (k % 4 + 1) + '</th>';
    return '<tr>' + h + '</tr>';
  }
  function row(label, cell) {
    var h = '<td class="lbl">' + label + '</td>';
    for (var k = 0; k < 8; k++) h += (k === 4 ? '<td class="gap"></td>' : '') + cell(s[k], k);
    return '<tr>' + h + '</tr>';
  }
  function td(cls, text, which, k, tip) {
    return '<td class="' + cls + ' dx-c" onclick="_dxEdit(\'' + which + '\',' + k + ')"' +
      (tip ? ' data-tip="' + tip + '"' : '') + '>' + _auEsc(text) + '</td>';
  }
  var cal = row("Calendar", function(sl, k) {
    var has = sl.counter && !sl.counter.empty;
    if (sl.cal) return td("", _dxShort(sl.cal.date), "cal", k);
    if (has) return '<td class="warn" data-tip="Counted, but no calendar event on this day.">—</td>';
    return '<td class="empty"></td>';
  });
  var cnt = row("Counter", function(sl, k) {
    if (!sl.counter) return '<td class="empty"></td>';
    if (sl.counter.empty) return td("empty", "", "counter", k, "Adds a date here.");
    return td("", _dxShort(sl.counter.value), "counter", k);
  });
  var firstMiss = -1;
  s.forEach(function(sl, k) {
    var has = sl.counter && !sl.counter.empty;
    var logged = sl.imp && !sl.imp.empty;
    if (firstMiss < 0 && has && !logged && !sl.impUnknown) firstMiss = k;
  });
  _dx.firstMiss = firstMiss;
  var imp = row("Import", function(sl, k) {
    var has = sl.counter && !sl.counter.empty;
    var logged = sl.imp && !sl.imp.empty;
    if (logged) {
      var off = has && _dxN(sl.imp.date) !== _dxN(sl.counter.value);
      return td(off ? "miss" : "", _dxShort(sl.imp.date), "imp", k, off ? "Import has a different date than the Counter here." : "");
    }
    if (has && sl.impUnknown) return '<td class="empty" data-tip="Older than what Import sent here.\nSee the sheet.">·</td>';
    if (has) return td("miss" + (k === firstMiss ? " go" : ""), _dxShort(sl.counter.value), "imp", k,
      k === firstMiss ? "Logs this lesson into Students Import." : "Log the earlier date first.\nImport fills its rows in order.");
    return '<td class="empty"></td>';
  });
  var t = document.createElement("div");
  t.innerHTML = '<table class="au-grid dx-grid">' + head() + cal + cnt + imp + '</table>';
  return t.firstChild;
}

function _dxLessons() {
  var wrap = document.createElement("div");
  _dx.slots.forEach(function(sl, k) {
    var has = sl.counter && !sl.counter.empty;
    var logged = sl.imp && !sl.imp.empty;
    if (!has && !logged) return;
    if (!logged && sl.impUnknown) return;
    var row = document.createElement("div");
    row.className = "fx-row" + (logged ? "" : " dx-miss");
    var date = logged ? sl.imp.date : sl.counter.value;
    row.innerHTML = '<span class="fx-n">' + (k % 4 + 1) + '</span>' +
      '<span class="fx-d">' + _auEsc(_dxShort(date)) + '</span>' +
      '<span class="fx-s">' + (logged ? (sl.imp.subject ? _auEsc(sl.imp.subject) : '<em>(no subject)</em>') : 'Not logged') + '</span>';
    wrap.appendChild(row);
  });
  return wrap;
}

// The editor under the grid, for the clicked cell. One at a time; clicking
// the same cell again closes it.
function _dxEdit(which, k) {
  var ed = document.getElementById("dxEditor");
  if (!ed || !_dx) return;
  var key = which + k;
  document.querySelectorAll(".dx-grid td.sel").forEach(function(t) { t.classList.remove("sel"); });
  if (_dx.editing === key) { _dx.editing = null; ed.innerHTML = ""; return; }
  _dx.editing = key;
  var sl = _dx.slots[k];
  var cells = document.querySelectorAll(".dx-grid td.dx-c");
  Array.prototype.forEach.call(cells, function(t) { if ((t.getAttribute("onclick") || "").indexOf("'" + which + "'," + k + ")") >= 0) t.classList.add("sel"); });

  ed.innerHTML = "";
  var box = document.createElement("div"); box.className = "dx-ed";
  var title = document.createElement("div"); title.className = "fx-sub";
  var line = document.createElement("div"); line.className = "dx-line";
  var st = document.createElement("span"); st.className = "fx-state";
  box.appendChild(title); box.appendChild(line);

  if (which === "counter") {
    title.textContent = "Counter · " + (k < 4 ? "previous" : "current") + " block, lesson " + (k % 4 + 1);
    var sp = _dx.counterSp[k];
    sp.box.className = "fx-date"; line.appendChild(sp.box);
    var clr = _fxX("Clears this date.\nNothing saves until Save."); clr.onclick = function() { sp.clear(); }; line.appendChild(clr);
    line.appendChild(st);
    var save = _fxBtn("Save"); save._fxState = st; line.appendChild(save);
    save.onclick = function() {
      var fields = [], cur = 0;
      _dx.slots.forEach(function(s2, j) {
        if (!s2.counter) return;
        var v = _dx.counterSp[j].getValue();
        fields.push({ col: s2.counter.col, value: v });
        if (j >= 4 && v) cur++;
      });
      _saveCounterRow(_dx.d.counter.row, fields, String(cur || 1), save, "Save");
    };
  } else if (which === "imp") {
    var logged = sl.imp && !sl.imp.empty;
    if (logged) {
      title.textContent = "Students Import · " + _dxShort(sl.imp.date);
      var s1 = document.createElement("span"); s1.className = "fx-s"; s1.textContent = sl.imp.subject || "(no subject)"; line.appendChild(s1);
      line.appendChild(st);
      var rm = _fxBtn("Remove line"); rm._fxState = st; line.appendChild(rm);
      rm.onclick = function() { _clearImportLesson(sl.imp.row, (sl.imp.date || "") + " " + (sl.imp.subject || ""), rm); };
    } else if (k === _dx.firstMiss) {
      title.textContent = "Students Import · not logged";
      var subj = document.createElement("input"); subj.type = "text"; subj.placeholder = "Subject"; subj.className = "rpm-field fx-subj";
      var dsp = _fixDateSpinner(sl.counter.value); dsp.box.className = "fx-date auto";
      line.appendChild(subj); line.appendChild(dsp.box); line.appendChild(st);
      var lg = _fxBtn("Log"); lg._fxState = st; line.appendChild(lg);
      lg.onclick = function() { _logImportSection([{ subjIn: subj, sp: dsp }], lg, "Log"); };
      setTimeout(function() { subj.focus(); }, 0);
    } else {
      title.textContent = "Students Import · not logged";
      line.innerHTML = '<span class="fx-hint">Log the earlier date first. Import fills its rows in order.</span>';
    }
  } else if (which === "cal" || which === "extra") {
    var ev = which === "cal" ? sl.cal : _dx.extras[k];
    title.textContent = "Google Calendar · " + ev.date;
    line.appendChild(st);
    var del = _fxBtn("Delete event"); del._fxState = st; line.appendChild(del);
    var armed = false;
    del.onclick = function() {
      if (!armed) { armed = true; _trSetLabel(del, "Delete? Press again"); setTimeout(function() { if (armed) { armed = false; _trSetLabel(del, "Delete event"); } }, 3000); return; }
      armed = false;
      _deleteCalEvent(ev.calId, ev.id, ev.date, null, del);
    };
  }
  ed.appendChild(box);
}

// Fix window feedback, the Trial windows' rule: the window dims with the
// moving dots on the pressed button; success says nothing (the window reloads
// with the new state); failure is the red Unsuccessful badge by the button,
// reason in its tooltip. A ✕ with no action row fails as a toast.
function _fxBusy(btn, on) { rpmBusy(document.getElementById("auditFixContent"), btn, on); }
function _fxCall(action, params) {
  var url = getScriptUrl();
  var q = url + "?action=" + action;
  for (var k in params) q += "&" + k + "=" + encodeURIComponent(params[k]);
  return fetch(q).then(function(r) { return r.json(); })
    .then(function(d) { return { ok: !!(d && d.success), why: (d && d.message) || "" }; })
    .catch(function() { return { ok: false, why: "No answer from Google." }; });
}

// Delete one calendar event (2nd tap of the delete control confirmed it).
function _deleteCalEvent(calId, eventId, dateText, lineEl, btn) {
  var label = btn._fxState ? "Delete event" : "✕";
  if (btn._fxState) { btn._fxState.innerHTML = ""; _trSetLabel(btn, "Deleting…"); _fxBusy(btn, true); } else btn.textContent = "…";
  btn.disabled = true;
  _fxCall("deleteCalendarEvent", { calId: calId, eventId: eventId }).then(function(r) {
    if (btn._fxState) _fxBusy(btn, false);
    if (r.ok) {
      if (lineEl) { lineEl.style.transition = "opacity 0.3s"; lineEl.style.opacity = "0"; setTimeout(function() { lineEl.remove(); }, 300); }
      else if (_fixCurrentName) _loadFixData(_fixCurrentName);
    } else {
      btn.disabled = false;
      if (btn._fxState) { _trSetLabel(btn, label); rpmFail(btn._fxState, r.why || "Delete failed"); }
      else { btn.textContent = label; btn.classList.remove("armed"); rpmToast("fail", "Unsuccessful", r.why || "Delete failed"); }
    }
  });
}

// Commit the whole Counter row at once: every block cell + Finished (E).
function _saveCounterRow(row, fields, finished, btn, label) {
  label = label || "Save Counter";
  if (btn._fxState) btn._fxState.innerHTML = "";
  btn.disabled = true; _trSetLabel(btn, "Saving…"); _fxBusy(btn, true);
  _fxCall("saveCounterRow", { row: row, finished: finished, fields: JSON.stringify(fields) }).then(function(r) {
    _fxBusy(btn, false);
    if (r.ok) { _trSetLabel(btn, "Saved ✓"); setTimeout(function() { if (_fixCurrentName) _loadFixData(_fixCurrentName); }, 500); }
    else { btn.disabled = false; _trSetLabel(btn, label); rpmFail(btn._fxState, r.why || "Save failed"); }
  });
}

// Remove a single already-logged Students Import line (the ✕ on a filled row).
// Confirms first, then clears that row's subject + date and reloads the window.
function _clearImportLesson(row, label, btn) {
  if (!window.confirm("Remove this logged line?\n\n" + (label || "").trim())) return;
  var was = btn._fxState ? "Remove line" : "✕";
  if (btn._fxState) { _trSetLabel(btn, "Removing…"); _fxBusy(btn, true); } else btn.textContent = "…";
  btn.disabled = true;
  _fxCall("clearImportLesson", { name: _fixCurrentName, row: row }).then(function(r) {
    if (r.ok) { if (_fixCurrentName) _loadFixData(_fixCurrentName); }
    else {
      btn.disabled = false;
      if (btn._fxState) { _fxBusy(btn, false); _trSetLabel(btn, was); rpmFail(btn._fxState, r.why || "Remove failed"); }
      else { btn.textContent = was; rpmToast("fail", "Unsuccessful", r.why || "Remove failed"); }
    }
  });
}

// Log every filled-in empty Students Import row (subject + date) in order,
// via logLesson. One button, N rows. Stops at the first failure so Import
// never gets a later date before an earlier one.
function _logImportSection(controls, btn, label) {
  label = label || "Log to Import";
  if (btn._fxState) btn._fxState.innerHTML = "";
  var pending = controls.filter(function(c) { return c.subjIn.value.trim() && c.sp.getValue(); });
  if (!pending.length) { rpmHalf(btn._fxState, "Fill a subject and date"); return; }
  btn.disabled = true; _trSetLabel(btn, "Logging…"); _fxBusy(btn, true);
  var i = 0;
  function next() {
    if (i >= pending.length) {
      _fxBusy(btn, false); _trSetLabel(btn, "Logged ✓");
      setTimeout(function() { if (_fixCurrentName) _loadFixData(_fixCurrentName); }, 600);
      return;
    }
    var c = pending[i++];
    _fxCall("logLesson", {
      studentName: _fixCurrentName,
      subject:     (typeof toTitleCase === "function") ? toTitleCase(c.subjIn.value) : c.subjIn.value,
      lessonDate:  c.sp.getValue(),
      trialPaid:   "0"
    }).then(function(r) {
      if (r.ok) { next(); return; }
      _fxBusy(btn, false); btn.disabled = false; _trSetLabel(btn, label);
      rpmFail(btn._fxState, (i - 1 ? (i - 1) + " logged, then: " : "") + (r.why || "Log failed"));
    });
  }
  next();
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
function renderMergedAuditCards(dateAudit, syncAudit, calAudit) {
  var section = document.getElementById("auditLessonSection");

  // Merge by student name — date-audit students first, then sync-only ones.
  var byName = {}, order = [];
  dateAudit.forEach(function(s) {
    byName[s.name] = { name: s.name, missing: s.missing || [], warnings: s.warnings || [], grid: s.grid || null, sync: null };
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

  (calAudit || []).forEach(function(c) {
    if (!byName[c.name]) {
      byName[c.name] = { name: c.name, missing: [], warnings: [], grid: c.grid || null, sync: null };
      order.push(c.name);
    }
    byName[c.name].cal = c;
    if (!byName[c.name].grid) byName[c.name].grid = c.grid || null;
  });

  if (!order.length) { section.innerHTML = '<div class="empty-state">None</div>'; return; }
  window._auSync = byName;
  section.innerHTML = order.map(function(nm) { return _auSyncCard(byName[nm]); }).join("");
}

// Title: UNLOGGED (· 2 LESSONS). The lesson itself sits over the Log lesson
// button (_auMissingLines), oldest on top: the one that button logs. Its lesson
// number is known when it is the Counter's latest date (the usual case).
// Just "IMPORT MISSING": the red grid cells show how many (2026-09-28).
function _auUnloggedTitle(dates) {
  return "Import missing";
}
// One amber line per missing lesson, oldest on top (the one Log lesson logs
// first): "LESSON 1 · SEP 18". Lesson numbers come from the Counter when the
// missing dates are its newest ones (the usual case: Import just hasn't caught
// up); otherwise just the date.
function _auMissingLines(dates, s) {
  var n = dates.length;
  var know = s && n && _psNormD(dates[n - 1]) === _psNormD(s.counterDate) && Number(s.counterLesson) >= 1;
  return dates.map(function(d, k) {
    if (!know) return _auDate(d);
    var num = ((Number(s.counterLesson) - (n - 1 - k) - 1) % 4 + 4) % 4 + 1;
    return "Lesson " + num + " · " + _auDate(d);
  });
}
// The 1234 1234 grid (2026-09-28): the Counter's last two blocks over the
// same slots in Import. A slot the Counter has but Import doesn't is amber;
// the oldest one is outlined and logs on click (Import fills rows in order).
function _auGridHtml(grid, missing, nmArg, locked, noCal) {
  var noEv = {};
  (noCal || []).forEach(function(d) { noEv[_psNormD(d)] = true; });
  var miss = {};
  missing.forEach(function(d) { miss[_psNormD(d)] = true; });
  var first = missing.length ? _psNormD(missing[0]) : "";
  function head() {
    var h = '<th></th>';
    for (var k = 0; k < 8; k++) h += (k === 4 ? '<th class="gap"></th>' : '') + '<th>' + (k % 4 + 1) + '</th>';
    return '<tr>' + h + '</tr>';
  }
  function row(label, cell) {
    var h = '<td class="lbl">' + label + '</td>';
    for (var k = 0; k < 8; k++) h += (k === 4 ? '<td class="gap"></td>' : '') + cell(grid[k] || "");
    return '<tr>' + h + '</tr>';
  }
  var counter = row("Counter", function(d) {
    if (!d) return '<td class="empty"></td>';
    return noEv[_psNormD(d)] ? '<td class="nocal" data-tip="Counted, but no calendar event on this day.">' + _auEsc(d) + '</td>' : '<td>' + _auEsc(d) + '</td>';
  });
  var imp = row("Import", function(d) {
    if (!d) return '<td class="empty"></td>';
    var n = _psNormD(d);
    if (!miss[n]) return '<td>' + _auEsc(d) + '</td>';
    var go = n === first && !locked;
    return '<td class="miss au-gcell' + (go ? ' go' : '') + '" data-d="' + _auEsc(d) + '"' +
      (go ? ' onclick="_auGridLog(this,' + nmArg + ')" data-tip="Opens the Log lesson window.\nLogs ' + _auEsc(d) + ' into Students Import."'
          : ' data-tip="' + (locked ? 'Calendar and Counter disagree.\nFix that first with Mismatch.' : 'Log the earlier date first.\nImport fills its rows in order.') + '"') + '>' + _auEsc(d) + '</td>';
  });
  return '<table class="au-grid">' + head() + counter + imp + '</table>';
}
function _auInGrid(grid, d) {
  var n = _psNormD(d);
  return (grid || []).some(function(g) { return _psNormD(g) === n; });
}
function _auGridLog(td, name) {
  if (!td.classList.contains("go")) return;
  var card = td.closest("[data-audit-student]");
  var chip = card && card.querySelector(".audit-missing-chip");
  if (chip) openAuditLessonLog(name, chip.getAttribute("data-audit-date"));
}

function _auMissingHtml(dates, s) {
  return _auMissingLines(dates, s).map(function(t) {
    return '<div class="au-sub due" style="margin:0 0 4px">' + _auEsc(t) + '</div>';
  }).join("");
}
function _psNormD(v) { return (v || "").toString().replace(/\s+/g, ""); }

// Log lesson: always the OLDEST unlogged date. Import writes into its next
// empty row whatever the date, so logging a later one first would put the
// dates (and column M's lesson numbers) out of order.
function _auLogNext(btn) {
  var card = btn.closest("[data-audit-student]");
  var chip = card && card.querySelector(".audit-missing-chip");
  if (!chip) return;
  openAuditLessonLog(card.getAttribute("data-audit-student"), chip.getAttribute("data-audit-date"));
}

// After a date is logged (its hidden marker leaves): the line and the
// button's tooltip move on to the next one.
function _auChipsNext(card) {
  if (!card) return;
  var left = Array.prototype.map.call(card.querySelectorAll(".audit-missing-chip"), function(c) { return c.getAttribute("data-audit-date"); });
  var st = (window._auSync || {})[card.getAttribute("data-audit-student")] || {};
  var line = card.querySelector(".au-sub");
  if (line && left.length) {
    line.textContent = _auUnloggedTitle(left);
  }
  var next = card.querySelector(".au-next");
  if (next && left.length) next.innerHTML = _auMissingHtml(left, st.sync);
  // The oldest is back inside the grid: its outlined cell takes over, so the
  // off-grid note and Log lesson go. Still outside: the note names the new oldest.
  var og = card.querySelector(".au-offgrid");
  if (st.grid && left.length && _auInGrid(st.grid, left[0])) {
    if (og) og.remove();
    var lb = card.querySelector(".au-logbtn"); if (lb) lb.remove();
  } else if (og && left.length) {
    og.textContent = "Oldest first: " + _auDate(left[0]) + ", before these blocks";
  }
  // Grid: logged slots turn plain, the next oldest gets the outline.
  var want = {}; left.forEach(function(d) { want[_psNormD(d)] = true; });
  var firstLeft = left.length ? _psNormD(left[0]) : "";
  Array.prototype.forEach.call(card.querySelectorAll(".au-gcell"), function(td) {
    var n = _psNormD(td.getAttribute("data-d"));
    if (!want[n]) { td.className = ""; td.removeAttribute("data-tip"); td.onclick = null; td.removeAttribute("onclick"); return; }
    if (n === firstLeft) {
      td.classList.add("go");
      td.setAttribute("onclick", "_auGridLog(this," + JSON.stringify(card.getAttribute("data-audit-student")) + ")");
      td.setAttribute("data-tip", "Opens the Log lesson window.\nLogs " + td.getAttribute("data-d") + " into Students Import.");
    }
  });
  var b = card.querySelector(".au-logbtn");
  if (b && left.length) b.setAttribute("data-tip", "Opens a window.\nLogs " + _auDate(left[0]) + " into Students Import." + (left.length > 1 ? "\n(Oldest first.)" : ""));
}

function _auSyncCard(st) {
  var s = st.sync, nm = _auEsc(st.name), nmArg = _auEsc(JSON.stringify(st.name));
  // Mismatch: the Calendar and the Counter disagree (so the Counter itself may
  // be wrong), or the sheets disagree without a lesson simply missing. Then
  // logging is locked and the Mismatch button turns red.
  var calBad = !!(st.cal && (st.cal.counterOnly.length || st.cal.calOnly.length));
  var mismatch = calBad || (!st.missing.length && s && (!s.dateMatch || !s.posMatch)) || (s && s.countMatch === false);
  var bits = [];
  if (calBad) bits.push("Calendar mismatch");
  if (st.missing.length) bits.push(_auUnloggedTitle(st.missing));
  var offGrid = !!(st.grid && st.missing.length && !_auInGrid(st.grid, st.missing[0]));
  // Missing lessons already explain why the sheets differ; "Sheets
  // disagree" only when nothing is missing (a real mismatch for Fix).
  if (!st.missing.length && s && (!s.dateMatch || !s.posMatch)) bits.push("Sheets disagree");
  if (s && s.countMatch === false) bits.push("Counter count off");
  if (st.warnings.length) bits.push(st.warnings.length + " to check by hand");

  var counterRow = s ? '<span class="inq-flabel au-caps">Counter</span><span class="inq-fval au-caps">Lesson ' + _auEsc(s.counterLesson) + ' · ' + _auEsc(_auDate(s.counterDate || "?")) + '</span>' : '';
  var rows = "";
  if (st.grid && (st.missing.length || calBad)) {
    // The grid says it all: Counter's last two blocks over Import's.
    rows = '<hr class="divider" style="margin:18px 0">' +
      _auGridHtml(st.grid, st.missing, nmArg, mismatch, calBad ? st.cal.counterOnly : null) +
      (calBad && st.cal.calOnly.length
        ? '<div class="au-calonly">On the calendar, not in the Counter: ' + st.cal.calOnly.map(_auEsc).join(", ") + '</div>' : '');
  } else if (s) {
    rows = '<hr class="divider" style="margin:18px 0">' +
      '<div class="au-cap">Last logged</div>' +
      '<div class="inq-fields">' +
        // Import first, Counter under it: the Counter is always the later date.
        '<span class="inq-flabel au-caps">Import</span><span class="inq-fval au-caps">Lesson ' + _auEsc(s.importLesson != null ? s.importLesson : "?") + ' · ' + _auEsc(_auDate(s.importDate || "?")) + '</span>' +
        counterRow +
        (s.countMatch === false
          ? '<span class="inq-flabel au-caps">Counter E</span><span class="inq-fval au-caps">E = ' + _auEsc(s.counterLesson) + ' · ' + _auEsc(s.blockDateCount) + ' dates in the block</span>'
          : '') +
      '</div>';
  }

  // The unlogged dates ride along as hidden markers: Log lesson reads the
  // oldest, and a successful log removes it (_auditRemoveResolved).
  var chips = "";
  if (st.missing.length) {
    chips += '<div hidden>' + st.missing.map(function(d) {
      return '<span class="audit-missing-chip" data-audit-date="' + _auEsc(d) + '"></span>';
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
      // Lessons to log: amber, however many (the red grid cells show them).
      // Anything else wrong (sheets disagree, count off): red.
      '<div class="au-sub ' + (st.missing.length && !mismatch ? 'due' : 'over') + '">' + _auEsc(bits.join(" · ")) + '</div>' +
      rows + chips +
      // Same foot as the Unpaid cards: rule, dim action left, Fix right.
      '<hr class="divider" style="margin:18px 0 16px">' +
      // Every missing lesson, amber, right over the button; Log lesson logs
      // the top (oldest) one.
      (st.missing.length && !st.grid ? '<div class="au-next" style="margin:0 0 12px">' + _auMissingHtml(st.missing, s) + '</div>' : '') +
      // The grid's outlined cell logs the oldest. Only when the oldest missing
      // date is older than the grid's two blocks (too many behind) does the
      // card need a note and the Log lesson button to reach it.
      (offGrid ? '<div class="au-sub due au-offgrid" style="margin:0 0 12px">Oldest first: ' + _auEsc(_auDate(st.missing[0])) + ', before these blocks</div>' : '') +
      '<div class="au-acts">' +
        (st.missing.length && !mismatch && (!st.grid || offGrid)
          ? '<button class="link-btn bright opens-window au-logbtn" onclick="_auLogNext(this)" ' +
              'data-tip="Opens a window.\nLogs ' + _auEsc(_auDate(st.missing[0])) + ' into Students Import.' + (st.missing.length > 1 ? '\n(Oldest first.)' : '') + '" data-tip-wrap>Log lesson</button>'
          : '') +
        '<span class="au-state"></span>' +
        // Mismatch: dim when Calendar and Counter agree, red when they don't.
        '<button class="link-btn opens-window' + (mismatch ? ' red' : '') + '" onclick="openAuditFixModal(' + nmArg + ')" ' +
          'data-tip="' + (mismatch
            ? 'Opens a window.\nCalendar and Counter disagree: fix that first.\nLogging is locked until then.'
            : 'Opens a window.\nShows Calendar, Counter and Import side by side.\nNothing mismatched right now.') + '" data-tip-wrap data-tip-left>Mismatch</button>' +
      '</div>' +
    '</div>';
}
