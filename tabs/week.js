// ─── TABS / WEEK.JS ──────────────────────────────────────────────────────────
function renderWeekTab() {
  var grid = document.getElementById("weekTabGrid");
  grid.innerHTML = "";
  document.getElementById("weekTabHeader").textContent = "";

  if (!weekStudents.length) {
    grid.innerHTML = "<div class='empty-state'>No students this week</div>";
    return;
  }

  var dayOrder = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  var dayShort = { Monday:"MON", Tuesday:"TUE", Wednesday:"WED", Thursday:"THU", Friday:"FRI", Saturday:"SAT", Sunday:"SUN" };
  var groups = {};
  weekStudents.forEach(function(s) {
    var d = s.dayOfWeek || "Unknown";
    if (!groups[d]) groups[d] = [];
    groups[d].push(s);
  });

  var anyShown = false;
  dayOrder.forEach(function(day) {
    if (!groups[day] || !groups[day].length) return;
    var group = document.createElement("div"); group.className = "week-day-group";
    var label = document.createElement("div"); label.className = "week-day-label";
    var firstDate = groups[day][0].eventDate ? formatEventDate(groups[day][0].eventDate) : "";
    if (firstDate) {
      var parts = firstDate.split(" ");
      firstDate = parts[0] + " /" + parts[1];
    }
    label.textContent = dayShort[day] + (firstDate ? "  " + firstDate : "");
    group.appendChild(label);

    var pillRow = document.createElement("div"); pillRow.className = "week-day-pills";
    groups[day].forEach(function(s) {
      if (isLessonLogged(s.name, s.eventDate)) return;
      anyShown = true;
      var btn = document.createElement("button");
      var past = isPastDay(s.eventDate) && !s.isToday;
      btn.className = "week-tab-pill" + (past ? " forgot" : "");
      btn.textContent = s.name;
      btn.onclick = function() { toggleLog(s, undefined); };
      pillRow.appendChild(btn);
    });
    if (pillRow.children.length) { group.appendChild(pillRow); grid.appendChild(group); }
  });

  if (!anyShown) {
    grid.innerHTML = "<div style='color:var(--green);font-size:11px;text-align:center;padding:20px'>All logged this week ✓</div>";
  }
}
