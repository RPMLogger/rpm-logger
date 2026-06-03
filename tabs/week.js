// ─── TABS / WEEK.JS ──────────────────────────────────────────────────────────
function renderWeekTab() {
  var grid = document.getElementById("weekTabGrid");
  var header = document.getElementById("weekTabHeader");
  grid.innerHTML = "";
  header.innerHTML = "";
  if (!weekStudents.length) {
    grid.innerHTML = "<div class='empty-state'>No students this week</div>";
    return;
  }
  // ── Counts ──────────────────────────────────────────────────────────────────
  var total = weekStudents.length;

  // ── Header block ────────────────────────────────────────────────────────────
  var hw = document.createElement("div"); hw.className = "wtab-header-wrap";

  var lThisWeek = document.createElement("div");
  lThisWeek.className = "wtab-this-week";
  lThisWeek.textContent = "THIS WEEK";

  var lTotal = document.createElement("div");
  lTotal.className = "wtab-total";
  lTotal.textContent = total;

  var lRange = document.createElement("div");
  lRange.className = "wtab-date-range";
  lRange.textContent = getWeekRange();

  var lDivider = document.createElement("hr");
  lDivider.className = "wtab-divider";


  hw.appendChild(lRange);
  hw.appendChild(lDivider);
  header.appendChild(hw);

  // ── Day groups ──────────────────────────────────────────────────────────────
  var dayOrder = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  var dayFull  = {
    Monday:"MONDAY", Tuesday:"TUESDAY", Wednesday:"WEDNESDAY",
    Thursday:"THURSDAY", Friday:"FRIDAY", Saturday:"SATURDAY", Sunday:"SUNDAY"
  };
  var groups = {};
  weekStudents.forEach(function(s) {
    var d = s.dayOfWeek || "Unknown";
    if (!groups[d]) groups[d] = [];
    groups[d].push(s);
  });
  dayOrder.forEach(function(day) {
    if (!groups[day] || !groups[day].length) return;
    var names = groups[day].map(function(s){ return s.name; }).join(", ");
    var row = document.createElement("div"); row.className = "wtab-day-row";
    var lDay = document.createElement("span"); lDay.className = "wtab-day-name"; lDay.textContent = dayFull[day] + ":";
    var lNames = document.createElement("span"); lNames.className = "wtab-day-names"; lNames.textContent = " " + names;
    row.appendChild(lDay);
    row.appendChild(lNames);
    grid.appendChild(row);
  });
}
