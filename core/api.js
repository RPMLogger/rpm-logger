// ─── CORE / API.JS ───────────────────────────────────────────────────────────
function loadData() {
  var url = getScriptUrl();
  if (!url) return;
  document.getElementById("todayGrid").innerHTML     = "<div class='empty-state rpm-loading'>Loading</div>";
  document.getElementById("weekTabGrid").innerHTML   = "<div class='empty-state rpm-loading'>Loading</div>";
  document.getElementById("inquiriesList").innerHTML = "<div class='inq-empty rpm-loading'>Loading</div>";
  ["loadTotal","loadNorm","loadWeekly","loadBiweekly","loadIncome","loadGregorian"].forEach(function(id){
    document.getElementById(id).textContent = "—";
  });
  fetchWeekStudents(url);
  fetchAllStudents(url);
  fetchStudentLoad(url);
  fetchInquiries(url);
  fetchCommsSummary(url);
  if (typeof fetchGBusinessUnread === "function") fetchGBusinessUnread();
  if (typeof fetchStudentLineBadge === "function") fetchStudentLineBadge();
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
      // A failure here now means a student could not be priced, which used to
      // be papered over with a house rate. Silently leaving dashes would hide
      // the very thing removing that fallback was meant to reveal.
      var warn = document.getElementById("loadWarning");
      if (warn) warn.innerHTML = (data && data.success) ? "" : _apiRateWarning(data);
      if (data.success) {
        document.getElementById("loadTotal").textContent     = data.totalStudents;
        document.getElementById("loadNorm").textContent      = data.normalized;
        document.getElementById("loadWeekly").textContent    = data.weeklyCount;
        document.getElementById("loadBiweekly").textContent  = data.biweeklyCount;
        document.getElementById("loadIncome").textContent    = "$" + data.totalIncome.toLocaleString();
        document.getElementById("loadGregorian").textContent = "$" + data.gregorian.toLocaleString();
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
        // Runs at startup, before the Comms tab has ever been opened — so the
        // nav badge and the strip are right without going there first.
        var open = document.getElementById("commsOpen"), openCount = document.getElementById("commsOpenCount");
        if (data.unresponded > 0 && open && openCount) {
          open.style.display = "";
          openCount.textContent = data.unresponded;
        }
        var badge = document.getElementById("commsNavBadge");
        if (badge) {
          badge.textContent = data.unresponded;
          badge.style.display = data.unresponded > 0 ? "" : "none";
        }
        var bar = document.getElementById("commsSummary");
        if (bar) bar.style.display = "";
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
// A file may carry `_rpmPath` (or webkitRelativePath from a folder picker): its
// path inside the student folder, e.g. "Lesson 5/tab.pdf". Subfolders are kept.
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
    var relPath = file._rpmPath || file.webkitRelativePath || file.name;
    if (opts.onProgress) opts.onProgress(relPath, i, total);
    if (file.size > MAX) { fail++; next(i + 1); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var b64 = String(reader.result).split(",")[1] || "";
      fetch(url, {
        method: "post",
        body: JSON.stringify({ action: "uploadDropboxFile", folder: folderName, filename: relPath, dataB64: b64 })
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

// Everything dropped on a zone, folders included, as a flat list of files. Each
// file from inside a dropped folder gets `_rpmPath` = "Folder/sub/file.pdf".
// Hidden files (.DS_Store and friends) are skipped. Calls done(files).
function collectDroppedFiles(dataTransfer, done) {
  var items = dataTransfer && dataTransfer.items;
  var canWalk = items && items.length && typeof items[0].webkitGetAsEntry === "function";
  if (!canWalk) {
    done(Array.prototype.slice.call((dataTransfer && dataTransfer.files) || []).filter(function (f) { return f.name.charAt(0) !== "."; }));
    return;
  }
  var entries = [];
  for (var i = 0; i < items.length; i++) {
    var en = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry();
    if (en) entries.push(en);
  }
  var out = [], pending = 0;
  function finish() { if (pending === 0) done(out); }
  function walk(entry, prefix) {
    if (entry.name.charAt(0) === ".") return;
    pending++;
    if (entry.isFile) {
      entry.file(function (f) {
        if (prefix) { try { f._rpmPath = prefix + f.name; } catch (e) {} }
        out.push(f); pending--; finish();
      }, function () { pending--; finish(); });
    } else if (entry.isDirectory) {
      var reader = entry.createReader();
      var readBatch = function () {
        reader.readEntries(function (batch) {
          if (!batch.length) { pending--; finish(); return; }
          batch.forEach(function (child) { walk(child, prefix + entry.name + "/"); });
          readBatch();                       // readEntries returns in chunks
        }, function () { pending--; finish(); });
      };
      readBatch();
    } else { pending--; }
  }
  entries.forEach(function (en) { walk(en, ""); });
  finish();
}

// Stop the browser from opening/navigating to a file dropped outside a drop zone.
// Zone-specific handlers still fire first (this only kills the default fallback).
(function () {
  if (window._dbxDropGuard) return;
  window._dbxDropGuard = true;
  window.addEventListener("dragover", function (e) { e.preventDefault(); }, false);
  window.addEventListener("drop", function (e) { e.preventDefault(); }, false);
})();


// Shown wherever a rate could not be resolved. The backend message names the
// student, so it is repeated as-is rather than summarised into "an error".
function _apiRateWarning(data) {
  var msg = (data && (data.message || data.error)) || "Could not reach the portal.";
  return '<div style="border:1px solid var(--accent);border-radius:10px;padding:11px;margin-bottom:10px">' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:9px;letter-spacing:1px;' +
        'text-transform:uppercase;color:var(--accent);margin-bottom:5px">Rates need a look</div>' +
      '<div style="font-size:12px;line-height:1.5">' + msg + '</div>' +
    '</div>';
}
