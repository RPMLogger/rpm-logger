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

  // ── Day cards ────────────────────────────────────────────────────────────────
  var dayOrder = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  var dayShort = { Monday:"MON", Tuesday:"TUE", Wednesday:"WED", Thursday:"THU", Friday:"FRI", Saturday:"SAT", Sunday:"SUN" };
  var months   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  var sorted = weekStudents.slice().sort(function(a, b) {
    return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
  });

  var groups = {};
  var groupOrder = [];
  sorted.forEach(function(s) {
    if (!groups[s.dayOfWeek]) {
      groups[s.dayOfWeek] = { students: [], eventDate: s.eventDate };
      groupOrder.push(s.dayOfWeek);
    }
    groups[s.dayOfWeek].students.push(s);
  });

  var cardsWrap = document.createElement("div");
  cardsWrap.style.display = "flex";
  cardsWrap.style.flexDirection = "column";
  cardsWrap.style.gap = "8px";
  cardsWrap.style.marginTop = "4px";

  groupOrder.forEach(function(day) {
    var g = groups[day];
    var parts = g.eventDate ? g.eventDate.split("T")[0].split("-") : null;
    var dateStr = parts ? months[parseInt(parts[1]) - 1] + " " + parseInt(parts[2]) : "";

    var card = document.createElement("div");
    card.style.background = "var(--surface)";
    card.style.border = "1px solid var(--border)";
    card.style.borderRadius = "8px";
    card.style.padding = "12px 16px";

    var dayLabel = document.createElement("div");
    dayLabel.style.fontFamily = "'Bebas Neue', sans-serif";
    dayLabel.style.fontSize = "13px";
    dayLabel.style.letterSpacing = "1.5px";
    dayLabel.style.color = "var(--accent2)";
    dayLabel.style.marginBottom = "8px";
    dayLabel.textContent = (dayShort[day] || day) + (dateStr ? " · " + dateStr : "");
    card.appendChild(dayLabel);

    g.students.forEach(function(s) {
      var nameEl = document.createElement("div");
      nameEl.style.fontFamily = "'DM Mono', monospace";
      nameEl.style.fontSize = "11px";
      nameEl.style.color = "var(--muted)";
      nameEl.style.padding = "4px 0";
      nameEl.style.borderBottom = "1px solid var(--border)";
      nameEl.textContent = s.name;
      card.appendChild(nameEl);
    });

    var lastChild = card.lastChild;
    if (lastChild) lastChild.style.borderBottom = "none";

    cardsWrap.appendChild(card);
  });

  grid.appendChild(cardsWrap);
}
