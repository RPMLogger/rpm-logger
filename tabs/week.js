// ─── TABS / WEEK.JS ──────────────────────────────────────────────────────────
function renderWeekTab() {
  var grid   = document.getElementById("weekTabGrid");
  var header = document.getElementById("weekTabHeader");
  grid.innerHTML   = "";
  header.innerHTML = "";

  if (!weekStudents.length) {
    grid.innerHTML = "<div class='empty-state'>No students this week</div>";
    return;
  }

  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // ── Counts ──────────────────────────────────────────────────────────────────
  var weekly   = weekStudents.filter(function(s){ return s.calType === "weekly";   }).length;
  var biweekly = weekStudents.filter(function(s){ return s.calType === "biweekly"; }).length;
  var trial    = weekStudents.filter(function(s){ return s.calType === "trial";    }).length;
  var total    = weekStudents.length;            // full weekly load — includes trials

  // ── Week date range (Mon–Sun), derived from the lesson dates (TZ-safe) ───────
  function weekRangeLabel() {
    var anchor = null;
    for (var i = 0; i < weekStudents.length; i++) {
      if (weekStudents[i].eventDate) { anchor = weekStudents[i].eventDate; break; }
    }
    var d;
    if (anchor) {
      var p = anchor.split("T")[0].split("-");
      d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    } else {
      var n = new Date(); d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    }
    var dow = (d.getDay() + 6) % 7;                  // 0 = Monday
    var mon = new Date(d); mon.setDate(d.getDate() - dow);
    var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return months[mon.getMonth()] + " " + mon.getDate() + " - " + months[sun.getMonth()] + " " + sun.getDate();
  }

  // ── Stats block (mirrors the General tab "Student Load" card) ────────────────
  var secLabel = document.createElement("div");
  secLabel.className = "section-label";
  secLabel.textContent = "This Week";
  header.appendChild(secLabel);

  var statsWrap = document.createElement("div");
  statsWrap.className = "load-table";
  statsWrap.style.marginBottom = "20px";

  function makeStatRow(label, value, cls, mutedValue) {
    var row = document.createElement("div"); row.className = "load-row" + (cls ? " " + cls : "");
    var lbl = document.createElement("div"); lbl.className = "load-label"; lbl.textContent = label;
    var val = document.createElement("div"); val.className = "load-value"; val.textContent = value;
    if (mutedValue) val.style.color = "var(--muted)";
    row.appendChild(lbl); row.appendChild(val);
    return row;
  }

  statsWrap.appendChild(makeStatRow("Student #",      total,    "highlight"));
  statsWrap.appendChild(makeStatRow("Weekly #",       weekly,   "", true));
  statsWrap.appendChild(makeStatRow("Biweekly #",     biweekly, "", true));
  statsWrap.appendChild(makeStatRow("Trial Students", trial,    "", true));

  header.appendChild(statsWrap);

  // ── Student list ─────────────────────────────────────────────────────────────
  var dayOrder = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  var sorted = weekStudents.slice().sort(function(a, b) {
    return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
  });

  var tableWrap = document.createElement("div");
  tableWrap.className = "load-table";

  // Rows grouped by day: a gray day-header row before each day's students
  var prevDay = null;
  sorted.forEach(function(s) {
    if (s.dayOfWeek !== prevDay) {
      prevDay = s.dayOfWeek;
      var dayRow = document.createElement("div");
      dayRow.className = "load-row";
      dayRow.style.background = "rgba(46,204,113,0.05)";
      var dayCell = document.createElement("div");
      dayCell.className = "load-label";
      dayCell.style.flex = "1";
      dayCell.style.color = "var(--green)";
      dayCell.textContent = (s.dayOfWeek || "").toUpperCase();
      dayRow.appendChild(dayCell);
      tableWrap.appendChild(dayRow);
    }

    var row = document.createElement("div"); row.className = "load-row";
    var nameEl = document.createElement("div"); nameEl.className = "load-value"; nameEl.style.flex = "1"; nameEl.style.fontSize = "10px"; nameEl.style.color = "var(--muted)"; nameEl.textContent = s.name;
    row.appendChild(nameEl);
    tableWrap.appendChild(row);
  });

  var listLabel = document.createElement("div");
  listLabel.className = "section-label";
  listLabel.style.letterSpacing = "1px";
  listLabel.textContent = weekRangeLabel();
  grid.appendChild(listLabel);

  grid.appendChild(tableWrap);
}
