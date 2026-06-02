// ─── TABS / PAST.JS ──────────────────────────────────────────────────────────
// Past tab: all students as pills (alphabetical), nav arrows, last 4 lessons + paid status.

var pastStudents = [];
var pastCurrentIdx = -1;

function renderPastGrid() {
  var url = getScriptUrl(); if (!url) return;
  fetch(url + "?action=getAllStudents")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success || !data.students) return;
      pastStudents = data.students
        .map(function(s) { return s.name; })
        .filter(function(n) { return n && n.trim(); })
        .sort();
      renderPastPills();
    });
}

function renderPastPills() {
  var wrap = document.getElementById("pastGrid");
  wrap.innerHTML = "";
  pastStudents.forEach(function(name, i) {
    var btn = document.createElement("button");
    btn.className = "past-student-btn";
    btn.id = "pastbtn-" + i;
    btn.textContent = name;
    btn.onclick = function() { selectPast(name, i); };
    wrap.appendChild(btn);
  });
}

function selectPast(name, idx) {
  pastCurrentIdx = idx;

  // Highlight active pill
  document.querySelectorAll(".past-student-btn").forEach(function(b) { b.classList.remove("active-past"); });
  var btn = document.getElementById("pastbtn-" + idx);
  if (btn) btn.classList.add("active-past");

  // Show header with name and nav arrows
  document.getElementById("pastHeaderName").textContent = name;
  document.getElementById("pastHeader").style.display = "block";

  // Update arrow states
  document.getElementById("pastNavPrev").disabled = (idx === 0);
  document.getElementById("pastNavNext").disabled = (idx === pastStudents.length - 1);

  // Load lessons
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

function pastNavPrev() {
  if (pastCurrentIdx > 0) selectPast(pastStudents[pastCurrentIdx - 1], pastCurrentIdx - 1);
}

function pastNavNext() {
  if (pastCurrentIdx < pastStudents.length - 1) selectPast(pastStudents[pastCurrentIdx + 1], pastCurrentIdx + 1);
}

function renderPastLessons(lessons) {
  var c = document.getElementById("pastList");
  c.innerHTML = "";

  // Paid status based on most recent lesson (index 0, already reversed)
  var isPaid = lessons[0] && lessons[0].paid === true;
  var payStatus = document.createElement("div");
  payStatus.className = "past-pay-status " + (isPaid ? "paid" : "unpaid");
  payStatus.textContent = isPaid ? "✓ Paid" : "✗ Not Paid";
  c.appendChild(payStatus);

  lessons.forEach(function(l, i) {
    var row = document.createElement("div");
    row.className = "past-row";
    row.innerHTML =
      "<div class='past-num'>" + (i + 1) + ".</div>" +
      "<div class='past-subject'>" + (l.subject || "—") + "</div>" +
      "<div class='past-right'>" +
        "<span class='past-date'>" + (l.date || "—") + "</span>" +
      "</div>";
    c.appendChild(row);
  });
}
