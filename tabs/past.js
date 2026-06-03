// ─── TABS / PAST.JS ──────────────────────────────────────────────────────────
function renderPastTodayCards() {
  var section = document.getElementById("pastTodaySection");
  if (!section) return;
  if (!todayStudents || !todayStudents.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  var grid = document.getElementById("pastTodayGrid");
  grid.innerHTML = "";
  todayStudents.forEach(function(s) {
    var btn = document.createElement("button");
    btn.className = "today-btn";
    btn.textContent = s.name;
    btn.onclick = function() { selectPast(s.name); };
    grid.appendChild(btn);
  });
}

function selectPast(name) {
  document.querySelectorAll("#pastTodayGrid .today-btn").forEach(function(b) {
    b.classList.toggle("recording", b.textContent.trim() === name);
  });
  document.getElementById("pastHeader").style.display = "none";
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
      document.getElementById("pastList").innerHTML =
        "<div class='empty-state'>❌ Could not load.</div>";
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
      "<div class='past-subject' style='text-align:right'>" + (l.subject || "—") + "</div>" +
      "<div class='past-right'>" +
        "<span class='past-date'>" + (l.date || "—") + "</span>" +
      "</div>";
    c.appendChild(row);
  });
}
