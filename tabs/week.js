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

  // ── Counts ──────────────────────────────────────────────────────────────────
  var total    = weekStudents.length;
  var weekly   = weekStudents.filter(function(s){ return s.calType === "weekly"; }).length;
  var biweekly = weekStudents.filter(function(s){ return s.calType === "biweekly"; }).length;

  // ── Stats block ─────────────────────────────────────────────────────────────
  var statsWrap = document.createElement("div");
  statsWrap.className = "load-table";
  statsWrap.style.marginBottom = "20px";

  function makeStatRow(label, value, cls) {
    var row = document.createElement("div"); row.className = "load-row" + (cls ? " " + cls : "");
    var lbl = document.createElement("div"); lbl.className = "load-label"; lbl.textContent = label;
    var val = document.createElement("div"); val.className = "load-value"; val.textContent = value;
    row.appendChild(lbl); row.appendChild(val);
    return row;
  }

  statsWrap.appendChild(makeStatRow("Student #",  total,    "highlight"));
  statsWrap.appendChild(makeStatRow("Weekly #",   weekly,   ""));
  statsWrap.appendChild(makeStatRow("Biweekly #", biweekly, ""));

  header.appendChild(statsWrap);

  // ── Student list ─────────────────────────────────────────────────────────────
  var dayOrder = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  var dayShort = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat", Sunday:"Sun" };
  var months   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  var sorted = weekStudents.slice().sort(function(a, b) {
    return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
  });

  var tableWrap = document.createElement("div");
  tableWrap.className = "load-table";

  var thead = document.createElement("div");
  thead.className = "load-row";
  thead.style.background = "var(--surface2)";
  var thName = document.createElement("div"); thName.className = "load-label"; thName.style.flex = "1"; thName.textContent = "Name";
  var thDay  = document.createElement("div"); thDay.className  = "load-label"; thDay.style.width = "100px"; thDay.style.textAlign = "right"; thDay.textContent = "Lesson";
  thead.appendChild(thName);
  thead.appendChild(thDay);
  tableWrap.appendChild(thead);

  sorted.forEach(function(s) {
    var row = document.createElement("div"); row.className = "load-row";

    var nameEl = document.createElement("div"); nameEl.className = "load-value"; nameEl.style.flex = "1"; nameEl.style.fontSize = "12px"; nameEl.textContent = s.name;

    var dayLabel = "";
    if (s.eventDate) {
      var parts = s.eventDate.split("T")[0].split("-");
      dayLabel = (dayShort[s.dayOfWeek] || s.dayOfWeek) + " · " + months[parseInt(parts[1]) - 1] + " " + parseInt(parts[2]);
    } else {
      dayLabel = dayShort[s.dayOfWeek] || s.dayOfWeek;
    }

    var dayEl = document.createElement("div"); dayEl.className = "load-label"; dayEl.style.width = "100px"; dayEl.style.textAlign = "right"; dayEl.style.color = "var(--accent2)"; dayEl.textContent = dayLabel;

    row.appendChild(nameEl);
    row.appendChild(dayEl);
    tableWrap.appendChild(row);
  });

  grid.appendChild(tableWrap);
}
