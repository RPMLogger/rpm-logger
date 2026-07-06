// ─── CORE / API.JS ───────────────────────────────────────────────────────────
function loadData() {
  var url = getScriptUrl();
  if (!url) return;
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
  fetchCommsSummary(url);
  if (typeof fetchGBusinessUnread === "function") fetchGBusinessUnread();
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
      [renderTodayGrid, renderWeekTab]
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
      if (data.success) {
        renderInquiries(data.inquiries || []);
        updateCommsSummary("email", (data.inquiries || []).length);
      }
      else document.getElementById("inquiriesList").innerHTML = "<div class='inq-empty'>No inquiries found</div>";
    }).catch(function() {
      document.getElementById("inquiriesList").innerHTML = "<div class='inq-empty'>Could not load inquiries</div>";
    });
}
function fetchCommsSummary(url) {
  fetch(url + "?action=getCommsSummary")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        updateCommsSummary("sms", data.sms);
        updateCommsSummary("voicemail", data.voicemail);
        if (data.unresponded > 0) {
          document.getElementById("commsOpen").style.display = "";
          document.getElementById("commsOpenCount").textContent = data.unresponded;
        }
        document.getElementById("commsSummary").style.display = "";
      }
    }).catch(function() {});
}
function updateCommsSummary(type, count) {
  var map = { email: "commsEmailCount", sms: "commsSmsCount", voicemail: "commsVoicemailCount" };
  var el = document.getElementById(map[type]);
  if (el) el.textContent = count;
  var summary = document.getElementById("commsSummary");
  if (summary) summary.style.display = "";
}

// ─── DROPBOX UPLOAD (shared by the student page + Dropbox tab) ───────────────
// Reads each file as base64 and POSTs it one at a time. text/plain body avoids
// a CORS preflight; the Apps Script doPost handles action=uploadDropboxFile.
//   opts.onProgress(filename, index, total) — before each file
//   opts.onDone(ok, fail, total)            — when all files are finished
function uploadFilesToDropbox(folderName, fileList, opts) {
  opts = opts || {};
  var url = getScriptUrl();
  var files = Array.prototype.slice.call(fileList);
  var total = files.length;
  if (!url) { if (opts.onDone) opts.onDone(0, total, total); return; }
  var MAX = 25 * 1024 * 1024; // 25 MB per file (Apps Script payload ceiling)
  var ok = 0, fail = 0;
  function next(i) {
    if (i >= total) { if (opts.onDone) opts.onDone(ok, fail, total); return; }
    var file = files[i];
    if (opts.onProgress) opts.onProgress(file.name, i, total);
    if (file.size > MAX) { fail++; next(i + 1); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var b64 = String(reader.result).split(",")[1] || "";
      fetch(url, {
        method: "post",
        body: JSON.stringify({ action: "uploadDropboxFile", folder: folderName, filename: file.name, dataB64: b64 })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d.success) ok++; else fail++; next(i + 1); })
        .catch(function () { fail++; next(i + 1); });
    };
    reader.onerror = function () { fail++; next(i + 1); };
    reader.readAsDataURL(file);
  }
  next(0);
}

// Stop the browser from opening/navigating to a file dropped outside a drop zone.
// Zone-specific handlers still fire first (this only kills the default fallback).
(function () {
  if (window._dbxDropGuard) return;
  window._dbxDropGuard = true;
  window.addEventListener("dragover", function (e) { e.preventDefault(); }, false);
  window.addEventListener("drop", function (e) { e.preventDefault(); }, false);
})();
