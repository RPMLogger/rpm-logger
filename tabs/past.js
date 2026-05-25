// ─── TABS / PAST.JS ──────────────────────────────────────────────────────────
// Past tab: student selector grid + last 4 lessons list.

function renderPastGrid() {
  var grid = document.getElementById("pastGrid");
  grid.innerHTML = "";
  // Only show today's students — no fallback to week students
  var students = todayStudents;
  if (!students.length) {
    grid.innerHTML = "<div class='empty-state'>No students today</div>";
    return;
  }
  var seen = {};
  students.forEach(function(s, i) {
    if (seen[s.name]) return;
    seen[s.name] = true;
    var btn = document.createElement("button");
    btn.className = "past-student-btn"; btn.id = "pastbtn-" + i;
    btn.textContent = s.name;
    btn.onclick = function() { selectPast(s.name, i); };
    grid.appendChild(btn);
  });
}

function selectPast(name, idx) {
  document.querySelectorAll(".past-student-btn").forEach(function(b) { b.classList.remove("active-past"); });
  var btn = document.getElementById("pastbtn-" + idx);
  if (btn) btn.classList.add("active-past");
  document.getElementById("pastHeaderName").textContent = name;
  document.getElementById("pastHeader").style.display = "block";
  document.getElementById("pastList").innerHTML = "<div class='empty-state'>Loading...</div>";
  var url = getScriptUrl(); if (!url) return;
  fetch(url + "?action=getPastLessons&studentName=" + encodeURIComponent(name) + "&count=4")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success && data.lessons && data.lessons.length > 0)
        renderPastLessons(data.lessons);
      else
        document.getElementById("pastList").innerHTML =
          "<div class='empty-state'>No lessons found for " + name + "</div>";
    }).catch(function() {
      document.getElementById("pastList").innerHTML = "<div class='empty-state'>❌ Could not load.</div>";
    });
}

function renderPastLessons(lessons) {
  var c = document.getElementById("pastList");
  c.innerHTML = "";
  lessons.forEach(function(l, i) {
    var row = document.createElement("div");
    row.className = "past-row";
    row.innerHTML =
      "<div class='past-num'>" + (i + 1) + ".</div>" +
      "<div class='past-subject'>" + (l.subject || "—") + "</div>" +
      "<div class='past-right'>" +
        (l.paid ? "<span class='past-paid'>✓</span>" : "") +
        "<span class='past-date'>" + (l.date || "—") + "</span>" +
      "</div>";
    c.appendChild(row);
  });
}
