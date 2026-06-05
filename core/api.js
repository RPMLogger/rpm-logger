// ─── CORE / API.JS ───────────────────────────────────────────────────────────
function loadData() {
  var url = getScriptUrl();
  if (!url) return;
  document.getElementById("weekPills").innerHTML     = "<div style='color:var(--muted);font-size:11px'>Loading...</div>";
  document.getElementById("todayGrid").innerHTML     = "<div class='empty-state'>Loading...</div>";
  document.getElementById("weekTabGrid").innerHTML   = "<div class='empty-state'>Loading...</div>";
  document.getElementById("inquiriesList").innerHTML = "<div class='inq-empty'>Loading...</div>";
  ["loadTotal","loadNorm","loadWeekly","loadBiweekly","loadIncome","loadGregorian"].forEach(function(id){
    document.getElementById(id).textContent = "—";
  });
  document.getElementById("studentListTable").style.display = "none";
  fetchWeekStudents(url);
  fetchAllStudents(url);
  fetchStudentLoad(url);
  fetchInquiries(url);
}
function fetchWeekStudents(url) {
  fetch(url + "?action=getWeekStudents")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!(data.success && data.students)) {
        addLog("lessonFeed", data.message || "No students found", "error");
        return;
      }
      var f = data.students.filter(function(s) { return isReal(s.name); });
      f.sort(function(a, b) {
        var da = a.eventDate ? new Date(a.eventDate) : new Date(0);
        var db = b.eventDate ? new Date(b.eventDate) : new Date(0);
        return da - db;
      });
      weekStudents  = f;
      todayStudents = f.filter(function(s) { return s.isToday; });

      // Render each section independently — a failure in one is reported
      // but no longer aborts the others.
      [renderWeekPills, renderTodayGrid, renderPastTodayCards, renderWeekTab, renderGeneral]
        .forEach(function(fn) {
          try { fn(); }
          catch (err) { addLog("lessonFeed", "⚠ Render error: " + (err && err.message ? err.message : err), "error"); }
        });

      fetch(url + "?action=getCycleCounters")
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.success && d.counters) {
            lessonCounts = d.counters;
            try { renderTodayGrid(); } catch (e) {}
          }
        })
        .catch(function() {});
    })
    .catch(function() {
      addLog("lessonFeed", "❌ Could not connect.", "error");
    });
}
function fetchAllStudents(url) {
  fetch(url + "?action=getAllStudents")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success && data.students) renderPaymentStudents(data.students);
    }).catch(function() {});
}
function fetchStudentLoad(url) {
  fetch(url + "?action=getStudentLoad")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        document.getElementById("loadTotal").textContent     = data.totalStudents;
        document.getElementById("loadNorm").textContent      = data.normalized;
        document.getElementById("loadWeekly").textContent    = data.weeklyCount;
        document.getElementById("loadBiweekly").textContent  = data.biweeklyCount;
        document.getElementById("loadIncome").textContent    = "$" + data.totalIncome.toLocaleString();
        document.getElementById("loadGregorian").textContent = "$" + data.gregorian.toLocaleString();
        renderStudentList(data);
      }
    }).catch(function() {});
}
function fetchInquiries(url) {
  fetch(url + "?action=getInquiries")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) renderInquiries(data.inquiries || []);
      else document.getElementById("inquiriesList").innerHTML = "<div class='inq-empty'>No inquiries found</div>";
    }).catch(function() {
      document.getElementById("inquiriesList").innerHTML = "<div class='inq-empty'>Could not load inquiries</div>";
    });
}
