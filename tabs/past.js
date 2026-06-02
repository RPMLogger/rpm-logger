// ─── TABS / PAST.JS ──────────────────────────────────────────────────────────
var pastStudents = [];
var pastCurrentIdx = -1;

function pastShortName(name) {
  var parts = (name || '').trim().split(' ');
  if (parts.length === 1) return parts[0];
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.';
}

function renderPastGrid() {
  var url = getScriptUrl(); if (!url) return;

  // Render today's cards immediately from shared state
  renderPastTodayCards();

  var grid = document.getElementById("pastGrid");
  grid.innerHTML = "<div style='color:var(--muted);font-size:11px'>Loading...</div>";
  fetch(url + "?action=getAllStudents")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success || !data.students) return;
      var excluded = ['BLANK','LOAD','APPLICANTS','ZAM','FINANCIAL','CON','CONCERT','EXPENSES','REVIEW'];
      pastStudents = data.students
        .map(function(s) { return s.name; })
        .filter(function(n) {
          if (!n || !n.trim()) return false;
          var upper = n.trim().toUpperCase();
          for (var i = 0; i < excluded.length; i++) {
            if (upper.indexOf(excluded[i]) !== -1) return false;
          }
          if (n.indexOf('---') !== -1) return false;
          return true;
        })
        .sort();
      grid.innerHTML = "";
      pastStudents.forEach(function(name, i) {
        var btn = document.createElement("button");
        btn.className = "week-pill";
        btn.id = "pastbtn-" + i;
        btn.textContent = pastShortName(name);
        btn.onclick = function() { selectPast(name, i); };
        grid.appendChild(btn);
      });
    });
}

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
    btn.innerHTML = "<div class='mic-dot'></div>" + s.name;
    btn.onclick = function() {
      var idx = pastStudents.indexOf(s.name);
      if (idx === -1) idx = 0;
      selectPast(s.name, idx);
    };
    grid.appendChild(btn);
  });
}

function selectPast(name, idx) {
  var realIdx = pastStudents.indexOf(name);
  if (realIdx !== -1) idx = realIdx;

  pastCurrentIdx = idx;
  document.querySelectorAll("#pastGrid .week-pill").forEach(function(b) { b.classList.remove("recording"); });
  var btn = document.getElementById("pastbtn-" + idx);
  if (btn) btn.classList.add("recording");
  document.getElementById("pastHeaderName").textContent = name;
  document.getElementById("pastHeader").style.display = "block";
  document.getElementById("pastNavPrev").disabled = (idx <= 0);
  document.getElementById("pastNavNext").disabled = (idx >= pastStudents.length - 1);
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

function pastNavPrev() {
  if (pastCurrentIdx > 0) selectPast(pastStudents[pastCurrentIdx - 1], pastCurrentIdx - 1);
}

function pastNavNext() {
  if (pastCurrentIdx < pastStudents.length - 1) selectPast(pastStudents[pastCurrentIdx + 1], pastCurrentIdx + 1);
}

function renderPastLessons(lessons) {
  var c = document.getElementById("pastList");
  c.innerHTML = "";

  // Check paid — handle boolean true, string "TRUE", string "true"
  var isPaid = lessons[0] && (
    lessons[0].paid === true ||
    (typeof lessons[0].paid === 'string' && lessons[0].paid.toUpperCase() === 'TRUE')
  );

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
