// ─── TABS / CTRL.JS ─────────────────────────────────────────────────────────
// Audit STEP 1: read-only bidirectional date diff. No fix actions yet.

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

  audit.forEach(function(student) {
    var card = document.createElement("div");
    card.className = "audit-card";
    card.style.cssText = "padding:12px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;background:var(--panel)";

    var nameEl = document.createElement("div");
    nameEl.style.cssText = "font-weight:600;margin-bottom:8px;font-size:13px";
    nameEl.textContent = student.name;
    card.appendChild(nameEl);

    if (student.onlyInCounter && student.onlyInCounter.length) {
      card.appendChild(_auditSection(
        "In Counter — missing from Students Import",
        student.onlyInCounter,
        "rgba(255,165,0,0.15)",
        "#ffa500",
        "rgba(255,165,0,0.4)"
      ));
    }

    if (student.onlyInImport && student.onlyInImport.length) {
      card.appendChild(_auditSection(
        "In Students Import — missing from Counter",
        student.onlyInImport,
        "rgba(80,150,255,0.15)",
        "#5096ff",
        "rgba(80,150,255,0.4)"
      ));
    }

    section.appendChild(card);
  });
}

function _auditSection(label, dates, bg, fg, border) {
  var wrap = document.createElement("div");
  wrap.style.cssText = "margin-top:6px";

  var hdr = document.createElement("div");
  hdr.style.cssText = "font-size:10px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px";
  hdr.textContent = label;
  wrap.appendChild(hdr);

  dates.forEach(function(d) {
    var b = document.createElement("span");
    b.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:" + bg + ";color:" + fg + ";border:1px solid " + border + ";border-radius:3px;font-size:11px;font-weight:500";
    b.textContent = d;
    wrap.appendChild(b);
  });

  return wrap;
}
