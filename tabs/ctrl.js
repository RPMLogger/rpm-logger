// ─── TABS / CTRL.JS ─────────────────────────────────────────────────────────
// AUDIT 1: Counter dates that don't exist in Students Import.
// Read-only — reports discrepancies + format warnings, no fix actions.

function initAuditTab() {
  var url = getScriptUrl();
  if (!url) {
    document.getElementById("auditLessonSection").innerHTML = '<div class="empty-state">No script URL set</div>';
    document.getElementById("auditBlockSection").innerHTML  = '<div class="empty-state">No script URL set</div>';
    document.getElementById("auditUnpaidSection").innerHTML = '<div class="empty-state">No script URL set</div>';
    return;
  }
  _runAudit1(url);
  _runAudit2(url);
  _runAudit3(url);
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

function _runAudit3(url) {
  var section = document.getElementById("auditUnpaidSection");
  section.innerHTML = '<div class="empty-state">Running audit...</div>';
  fetch(url + "?action=auditUnpaid")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Audit error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      renderUnpaidCards(data.audit || []);
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function renderUnpaidCards(audit) {
  var section = document.getElementById("auditUnpaidSection");
  section.innerHTML = "";

  if (!audit.length) {
    section.innerHTML = '<div style="color:var(--green);font-size:11px;text-align:center;padding:20px">All current blocks are paid ✓</div>';
    return;
  }

  audit.forEach(function(s) {
    var card = document.createElement("div");
    card.style.cssText = "padding:12px;border:1px solid var(--border);border-radius:6px;margin-bottom:10px;background:var(--panel)";

    var name = document.createElement("div");
    name.style.cssText = "font-weight:600;margin-bottom:6px;font-size:13px";
    name.textContent = s.name;
    card.appendChild(name);

    var current = document.createElement("div");
    current.style.cssText = "font-size:11px;color:var(--muted);margin:4px 0 10px";
    current.innerHTML = "On lesson <b style=\"color:#ffa500\">" + (s.lessonNum != null ? s.lessonNum : "?") + "</b> (<b style=\"color:var(--text)\">" + (s.lessonDate || "?") + "</b>) — <span style=\"color:#ffa500\">unpaid</span>";
    card.appendChild(current);

    if (s.prevBlocks && s.prevBlocks.length) {
      var pbHdr = document.createElement("div");
      pbHdr.style.cssText = "font-size:10px;color:var(--muted);margin:6px 0 2px;text-transform:uppercase;letter-spacing:0.5px";
      pbHdr.textContent = "Past 2 blocks";
      card.appendChild(pbHdr);

      s.prevBlocks.forEach(function(pb, idx) {
        var row = document.createElement("div");
        row.style.cssText = "font-size:11px;color:var(--muted);margin:2px 0";
        var statusColor = pb.paid ? "var(--green)" : "#ffa500";
        var statusMark = pb.paid ? "✓ paid" : "✗ unpaid";
        var dateStr = pb.paymentDate ? " · " + pb.paymentDate : "";
        var noteStr = pb.paymentNote ? " · " + pb.paymentNote : "";
        row.innerHTML = "Block −" + (idx + 1) + ": <b style=\"color:" + statusColor + "\">" + statusMark + "</b>" + dateStr + noteStr;
        card.appendChild(row);
      });
    }

    var lpHdr = document.createElement("div");
    lpHdr.style.cssText = "font-size:10px;color:var(--muted);margin:10px 0 2px;text-transform:uppercase;letter-spacing:0.5px";
    lpHdr.textContent = "Last 2 RPM Payments";
    card.appendChild(lpHdr);

    if (s.lastPayments && s.lastPayments.length) {
      s.lastPayments.forEach(function(p) {
        var row = document.createElement("div");
        row.style.cssText = "font-size:11px;color:var(--muted);margin:2px 0";
        row.innerHTML = "<b style=\"color:var(--text)\">" + (p.amount || "?") + "</b> on <b style=\"color:var(--text)\">" + (p.date || "?") + "</b> via " + (p.method || "?") + (p.notes ? " · " + p.notes : "");
        card.appendChild(row);
      });
    } else {
      var none = document.createElement("div");
      none.style.cssText = "font-size:11px;color:var(--muted);font-style:italic";
      none.textContent = "No payments on file";
      card.appendChild(none);
    }

    // ─── ACTIONS ─────────────────────────────────────────────────────────
    var actionsWrap = document.createElement("div");
    actionsWrap.style.cssText = "margin-top:12px;padding-top:10px;border-top:1px dashed var(--border)";
    card.appendChild(actionsWrap);

    if (s.pendingPayments && s.pendingPayments.length) {
      var ppHdr = document.createElement("div");
      ppHdr.style.cssText = "font-size:10px;color:var(--muted);margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px";
      ppHdr.textContent = "Pending — confirm?";
      actionsWrap.appendChild(ppHdr);

      s.pendingPayments.forEach(function(p) {
        var row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;margin:4px 0;font-size:11px;flex-wrap:wrap";
        row.innerHTML =
          "<span style=\"color:var(--text)\"><b>" + (p.amount || "?") + "</b> " + (p.method || "?") + "</span>" +
          "<span style=\"color:var(--muted)\">" + (p.date || "?") + "</span>";

        var confirmBtn = document.createElement("button");
        confirmBtn.textContent = "Confirm →";
        confirmBtn.style.cssText = "padding:4px 10px;font-size:11px;background:rgba(0,200,100,0.15);color:var(--green);border:1px solid rgba(0,200,100,0.4);border-radius:4px;cursor:pointer";
        confirmBtn.onclick = function() {
          if (typeof openIncomingNotePanel === "function") {
            openIncomingNotePanel(p, row);
          } else {
            addLog("auditFeed", "Confirm flow not available — open Payments tab", "error");
          }
        };
        row.appendChild(confirmBtn);
        actionsWrap.appendChild(row);
      });
    } else {
      var reminderRow = document.createElement("div");
      reminderRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px";

      var reminderInfo = document.createElement("div");
      reminderInfo.style.cssText = "font-size:11px;color:var(--muted)";
      reminderInfo.textContent = s.lastReminderAt
        ? "Last reminder sent: " + s.lastReminderAt
        : "No reminder sent yet";
      reminderRow.appendChild(reminderInfo);

      var sendBtn = document.createElement("button");
      sendBtn.textContent = "Send Reminder →";
      sendBtn.style.cssText = "padding:4px 10px;font-size:11px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:4px;cursor:pointer";
      sendBtn.onclick = function() { _sendReminder(s, sendBtn, reminderInfo); };
      reminderRow.appendChild(sendBtn);

      actionsWrap.appendChild(reminderRow);
    }

    section.appendChild(card);
  });
}

function _sendReminder(student, btn, infoEl) {
  var url = getScriptUrl();
  if (!url) return;
  btn.textContent = "Sending..."; btn.disabled = true;
  var completed = (student.completedDates || []).join(",");
  callScript(url, "sendPaymentReminder", {
    studentName: student.name,
    lessonNum:   student.lessonNum,
    lessonDate:  student.lessonDate,
    completedDates: completed
  }, function(data) {
    if (data && data.success) {
      btn.textContent = "✓ Sent";
      btn.style.background = "rgba(0,200,100,0.15)";
      btn.style.color = "var(--green)";
      btn.style.borderColor = "rgba(0,200,100,0.4)";
      var nowStr = (new Date()).toLocaleString();
      if (infoEl) infoEl.textContent = "Last reminder sent: just now";
      addLog("auditFeed", "✓ Reminder sent to " + student.name, "success");
    } else {
      btn.textContent = "Send Reminder →"; btn.disabled = false;
      addLog("auditFeed", "❌ " + (data && data.message ? data.message : "Reminder failed"), "error");
    }
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
    if (s.countMatch === false) {
      var b3 = document.createElement("span");
      b3.style.cssText = "display:inline-block;margin:2px 4px 2px 0;padding:3px 8px;background:rgba(255,165,0,0.15);color:#ffa500;border:1px solid rgba(255,165,0,0.4);border-radius:3px;font-size:11px";
      b3.textContent = "E vs dates mismatch (" + s.blockDateCount + " dates, E=" + s.counterLesson + ")";
      diff.appendChild(b3);
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
