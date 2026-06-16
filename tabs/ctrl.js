// ─── TABS / CTRL.JS ─────────────────────────────────────────────────────────
// Audit — Step 1: Lesson Date Log Audit
// Compares RPM Counter dates (truth) against Students Import logged dates.

function initAuditTab() {
  var section = document.getElementById("auditLessonSection");
  section.innerHTML = '<div class="empty-state">Running audit...</div>';

  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + "?action=auditLessonDates")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Audit error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      renderAuditCards(data.audit || []);
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function renderAuditCards(audit) {
  var section = document.getElementById("auditLessonSection");
  section.innerHTML = "";

  if (!audit.length) {
    section.innerHTML = '<div style="color:var(--green);font-size:11px;text-align:center;padding:20px">All lesson dates in sync ✓</div>';
    return;
  }

  audit.forEach(function(student, si) {
    var card = document.createElement("div");
    card.className = "audit-card";

    var nameEl = document.createElement("div");
    nameEl.className = "audit-card-name";
    nameEl.textContent = student.name;
    card.appendChild(nameEl);

    student.missing.forEach(function(date, di) {
      var row = document.createElement("div");
      row.className = "audit-date-row";
      row.id = "arow-" + si + "-" + di;

      var badge = document.createElement("span");
      badge.className = "audit-date-badge";
      badge.textContent = date;

      var input = document.createElement("input");
      input.type = "text";
      input.className = "audit-input";
      input.id = "ainp-" + si + "-" + di;
      input.value = "Done";
      input.placeholder = "Subject...";

      var btn = document.createElement("button");
      btn.className = "audit-log-btn";
      btn.textContent = "Log";
      btn.onclick = (function(s, d, idxS, idxD) {
        return function() { logAuditDate(idxS, idxD, d, s.name); };
      })(student, date, si, di);

      row.appendChild(badge);
      row.appendChild(input);
      row.appendChild(btn);
      card.appendChild(row);
    });

    section.appendChild(card);
  });
}

function logAuditDate(si, di, counterDate, studentName) {
  var url = getScriptUrl();
  if (!url) return;

  var input = document.getElementById("ainp-" + si + "-" + di);
  var subject = (input.value || "").trim() || "Done";

  var row = document.getElementById("arow-" + si + "-" + di);
  var btn = row.querySelector(".audit-log-btn");
  btn.textContent = "...";
  btn.disabled = true;
  input.disabled = true;

  var isoDate = auditDateToISO(counterDate);

  callScript(url, "logLesson", {
    studentName: studentName,
    subject: toTitleCase(subject),
    lessonDate: isoDate,
    trialPaid: "0"
  }, function(data) {
    if (data.success) {
      row.classList.add("logged");
      btn.textContent = "✓";
      addLog("auditFeed", "✓ " + studentName + " — " + subject + " (" + counterDate + ")", "success");
    } else {
      btn.textContent = "Log";
      btn.disabled = false;
      input.disabled = false;
      addLog("auditFeed", "✗ " + studentName + ": " + (data.message || "Error"), "error");
    }
  });
}

function auditDateToISO(dateStr) {
  var M = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  var parts = dateStr.trim().split(/\s+/);
  var mon = M[parts[0]], day = parseInt(parts[1], 10), yr = new Date().getFullYear();
  if (mon > new Date().getMonth()) yr--;
  return new Date(yr, mon, day, 12, 0, 0).toISOString();
}
