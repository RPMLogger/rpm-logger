// ─── TABS / CTRL.JS ─────────────────────────────────────────────────────────
// AUDIT 1: Counter dates that don't exist in Students Import.
// Read-only — reports discrepancies + format warnings, no fix actions.

function initAuditTab() {
  var url = getScriptUrl();
  if (!url) {
    document.getElementById("auditLessonSection").innerHTML = '<div class="empty-state">No script URL set</div>';
    document.getElementById("auditBlockSection").innerHTML  = '<div class="empty-state">No script URL set</div>';
    return;
  }
  _runAudit1(url);
  _runAudit2(url);
}

function _runAudit1(url) {
  var section = document.getElementById("auditLessonSection");
  section.innerHTML = '<div class="empty-state">Running audit...</div>';
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

function _runAudit2(url) {
  var section = document.getElementById("auditBlockSection");
  section.innerHTML = '<div class="empty-state">Running audit...</div>';
  fetch(url + "?action=auditBlockSync")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Audit error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      renderBlockSyncCards(data.audit || []);
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function renderBlockSyncCards(audit) {
  var section = document.getElementById("auditBlockSection");
  section.innerHTML = "";

  if (!audit.length) {
    section.innerHTML = '<div style="color:var(--green);font-size:11px;text-align:center;padding:20px">Counter and Students Import last lessons are in sync ✓</div>';
    return;
  }

  audit.forEach(function(s) {
    var card = document.createElement("div");
    card.style.cssText = "padding:12px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;background:var(--panel)";

    var name = document.createElement("div");
    name.style.cssText = "font-weight:600;margin-bottom:8px;font-size:13px";
    name.textContent = s.name;
    card.appendChild(name);

    var counterLine = document.createElement("div");
    counterLine.style.cssText = "font-size:11px;color:var(--muted);margin:4px 0";
    counterLine.innerHTML = "Counter: lesson <b style=\"color:var(--text)\">" + s.counterLesson + "</b> on <b style=\"color:var(--text)\">" + (s.counterDate || "?") + "</b>";
    card.appendChild(counterLine);

    var importLine = document.createElement("div");
    importLine.style.cssText = "font-size:11px;color:var(--muted);margin:4px 0";
    importLine.innerHTML = "Students Import: lesson <b style=\"color:var(--text)\">" + (s.importLesson != null ? s.importLesson : "?") + "</b> on <b style=\"color:var(--text)\">" + (s.importDate || "?") + "</b>";
    card.appendChild(importLine);

    var diff = document.createElement("div");
    diff.style.cssText = "margin-top:6px";
    if (!s.dateMatch) {
      var b = document.createElement("span");
      b.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:3px;font-size:11px";
      b.textContent = "Date mismatch";
      diff.appendChild(b);
    }
    if (!s.posMatch) {
      var b2 = document.createElement("span");
      b2.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:3px;font-size:11px";
      b2.textContent = "Lesson # mismatch";
      diff.appendChild(b2);
    }
    card.appendChild(diff);

    section.appendChild(card);
  });
}

function renderAuditCards(audit) {
  var section = document.getElementById("auditLessonSection");
  section.innerHTML = "";

  if (!audit.length) {
    section.innerHTML = '<div style="color:var(--green);font-size:11px;text-align:center;padding:20px">All Counter dates exist in Students Import ✓</div>';
    return;
  }

  audit.forEach(function(student) {
    var card = document.createElement("div");
    card.style.cssText = "padding:12px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;background:var(--panel)";

    var nameEl = document.createElement("div");
    nameEl.style.cssText = "font-weight:600;margin-bottom:8px;font-size:13px";
    nameEl.textContent = student.name;
    card.appendChild(nameEl);

    if (student.missing && student.missing.length) {
      var hdr = document.createElement("div");
      hdr.style.cssText = "font-size:10px;color:var(--muted);margin:6px 0 4px;text-transform:uppercase;letter-spacing:0.5px";
      hdr.textContent = "In Counter, missing from Students Import";
      card.appendChild(hdr);

      student.missing.forEach(function(d) {
        var b = document.createElement("span");
        b.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:3px;font-size:11px;font-weight:500";
        b.textContent = d;
        card.appendChild(b);
      });
    }

    if (student.warnings && student.warnings.length) {
      var whdr = document.createElement("div");
      whdr.style.cssText = "font-size:10px;color:var(--muted);margin:10px 0 4px;text-transform:uppercase;letter-spacing:0.5px";
      whdr.textContent = "⚠ Format warnings — manual check needed";
      card.appendChild(whdr);

      student.warnings.forEach(function(w) {
        var b = document.createElement("div");
        b.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,220,0,0.12);color:#d4a800;border:1px solid rgba(255,220,0,0.4);border-radius:3px;font-size:11px";
        b.textContent = w.sheet + " " + w.cell + ": \"" + (w.value || "") + "\"";
        card.appendChild(b);
      });
    }

    section.appendChild(card);
  });
}
