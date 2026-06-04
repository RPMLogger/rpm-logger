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

  // ── Day groups ───────────────────────────────────────────────────────────────
  var dayOrder = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  var dayShort = { Monday:"MON", Tuesday:"TUE", Wednesday:"WED", Thursday:"THU", Friday:"FRI", Saturday:"SAT", Sunday:"SUN" };
  var months   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  var sorted = weekStudents.slice().sort(function(a, b) {
    return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
  });

  var currentDay = null;
  sorted.forEach(function(s) {
    if (s.dayOfWeek !== currentDay) {
      currentDay = s.dayOfWeek;

      var parts = s.eventDate ? s.eventDate.split("T")[0].split("-") : null;
      var dateStr = parts ? months[parseInt(parts[1]) - 1] + " " + parseInt(parts[2]) : "";

      var dayHeader = document.createElement("div");
      dayHeader.className = "pay-history-month";
      dayHeader.textContent = (dayShort[s.dayOfWeek] || s.dayOfWeek) + (dateStr ? " · " + dateStr : "");
      grid.appendChild(dayHeader);
    }

    var row = document.createElement("div");
    row.className = "pay-history-row";
    row.textContent = s.name;
    grid.appendChild(row);
  });
}
