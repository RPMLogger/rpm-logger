// ─── TABS / PAYMENTS.JS ──────────────────────────────────────────────────────
// Payments tab: Manual Entry (cash), incoming Venmo/Zelle, payment history.

var allStudentData = []; // { tab, name } for each student

// Called by core after getAllStudents resolves
function renderPaymentStudents(students) {
  allStudentData = students;
  // No student grid rendered here — students live in the manual entry modal only
  if (typeof populateStudentPicker === "function") populateStudentPicker(students);
}

// ─── MANUAL ENTRY MODAL ───────────────────────────────────────────────────────

function openManualEntryModal() {
  var modal = document.getElementById("manualEntryModal");
  var pillContainer = document.getElementById("manualStudentPills");
  pillContainer.innerHTML = "";

  allStudentData.forEach(function(s) {
    var name = typeof s === "string" ? s : (s.name || s.tab);
    var tab  = (typeof s === "object" && s.tab) ? s.tab : name;
    var pill = document.createElement("button");
    pill.className = "student-pill";
    pill.textContent = name;
    pill.onclick = function() { openCashLogPanel(name, tab, pill); };
    pillContainer.appendChild(pill);
  });

  // Reset log panel
  closeCashLogPanel(true);
  modal.classList.add("active");
}

function closeManualEntryModal() {
  document.getElementById("manualEntryModal").classList.remove("active");
  closeCashLogPanel(true);
}

function openCashLogPanel(name, tab, pillEl) {
  // Highlight selected pill
  document.querySelectorAll(".student-pill").forEach(function(p) { p.classList.remove("active"); });
  if (pillEl) pillEl.classList.add("active");

  activeCashStudent = { name: name, tab: tab };

  document.getElementById("cashLogPanel").classList.add("active");
  document.getElementById("cashLogName").textContent = name;
  document.getElementById("cashDate").value = "";
  document.getElementById("cashAmount").value = "$380";
  document.getElementById("cashNotes").value = "";

  var btn = document.getElementById("btnCashLog");
  btn.textContent = "Log Payment →";
  btn.disabled = false;
  btn.className = "btn-log";
}

function closeCashLogPanel(silent) {
  activeCashStudent = null;
  document.getElementById("cashLogPanel").classList.remove("active");
  if (!silent) {
    document.querySelectorAll(".student-pill").forEach(function(p) { p.classList.remove("active"); });
  }
}

// ─── SUBMIT CASH PAYMENT ─────────────────────────────────────────────────────
function submitCashLog() {
  var url = getScriptUrl(); if (!url) return;
  if (!activeCashStudent) return;

  var name   = activeCashStudent.name;
  var tab    = activeCashStudent.tab;
  var date   = document.getElementById("cashDate").value.trim();
  var amount = document.getElementById("cashAmount").value.trim() || "$380";
  var notes  = document.getElementById("cashNotes").value.trim();

  if (!date) {
    document.getElementById("cashDate").focus();
    document.getElementById("cashDate").placeholder = "Required — e.g. May 20";
    return;
  }

  // K column note: "May 20 · $380 · paid in person" (notes optional)
  var kNote = date + " · " + amount + (notes ? " · " + notes : "");

  var btn = document.getElementById("btnCashLog");
  btn.textContent = "Logging..."; btn.disabled = true;

  // 1. Write checkbox + note to student sheet
  callScript(url, "logPaymentNote", { studentName: tab, note: kNote }, function(data) {
    if (data.success) {
      // 2. Append row to RPM Payments sheet
      callScript(url, "logPayment", {
        date:        date,
        studentName: name,
        method:      "Cash",
        amount:      amount,
        notes:       notes
      }, function() {});

      btn.textContent = "✓ Logged!"; btn.className = "btn-log success";
      addLog("paymentFeed", "✓ " + name + " · Cash · " + amount + " · " + date, "success");
      setTimeout(function() { closeManualEntryModal(); }, 1200);
    } else {
      btn.textContent = "Log Payment →"; btn.disabled = false;
      addLog("paymentFeed", "❌ " + (data.message || "Error logging cash payment"), "error");
    }
  });
}

// ─── INCOMING PAYMENTS (Venmo / Zelle) ───────────────────────────────────────
function loadIncomingPayments() {
  var url = getScriptUrl(); if (!url) return;
  var container = document.getElementById("incomingPayments");
  container.innerHTML = "<div style='color:var(--muted);font-size:11px'>Loading...</div>";

  fetch(url + "?action=getIncomingPayments")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      container.innerHTML = "";
      if (!data.success || !data.payments || !data.payments.length) {
        container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No pending Venmo or Zelle payments</div>";
        return;
      }
      data.payments.forEach(function(p) {
        var card = document.createElement("div");
        card.className = "incoming-card";
        card.innerHTML =
          "<div class='incoming-left'>" +
            "<div class='incoming-name'>" + p.name + "</div>" +
            "<div class='incoming-meta'>" +
              "<span class='incoming-method " + p.method.toLowerCase() + "'>" + p.method + "</span>" +
              "<span class='incoming-amount'>" + p.amount + "</span>" +
              "<span class='incoming-date'>" + p.date + "</span>" +
            "</div>" +
            (p.matched ? "" : "<div class='incoming-nomatch'>⚠ Name not matched in student sheets</div>") +
          "</div>" +
          "<div style='display:flex;flex-direction:column;gap:6px;flex-shrink:0'>" +
            "<button class='incoming-confirm'>Confirm →</button>" +
            "<button class='incoming-dismiss' onclick='dismissIncoming(this)'>✕ Dismiss</button>" +
          "</div>";
        card.querySelector(".incoming-confirm").addEventListener("click", function() {
          confirmIncoming(p, card);
        });
        container.appendChild(card);
      });
    }).catch(function() {
      container.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load</div>";
    });
}

function confirmIncoming(payment, cardEl) {
  var url = getScriptUrl(); if (!url) return;

  // 1. Log to RPM Payments sheet — email date goes in column A, notes column empty
  callScript(url, "logPayment", {
    date:        payment.date,   // FIX: email date, not today
    studentName: payment.name,
    method:      payment.method,
    amount:      payment.amount,
    notes:       ""
  }, function() {});

  // 2. If matched to a student sheet, write checkbox + K note ("Venmo $379.00")
  if (payment.matchedTab) {
    var kNote = payment.method + " " + payment.amount;
    callScript(url, "logPaymentNote", {
      studentName: payment.matchedTab,
      note:        kNote
    }, function() {});
  }

  var label = payment.matched
    ? "✓ " + payment.name + " · " + payment.method + " · " + payment.amount
    : "✓ " + payment.name + " · " + payment.method + " · " + payment.amount + " (RPM only — no sheet match)";
  addLog("paymentFeed", label, "success");

  // Remove card from UI
  if (cardEl) {
    cardEl.remove();
  } else {
    document.querySelectorAll(".incoming-card").forEach(function(c) {
      if (c.querySelector(".incoming-name") && c.querySelector(".incoming-name").textContent === payment.name) {
        c.remove();
      }
    });
  }

  var container = document.getElementById("incomingPayments");
  if (!container.querySelector(".incoming-card")) {
    container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No pending Venmo or Zelle payments</div>";
  }
}

function dismissIncoming(btn) {
  var card = btn.closest(".incoming-card");
  if (card) card.remove();
  var container = document.getElementById("incomingPayments");
  if (!container.querySelector(".incoming-card")) {
    container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No pending Venmo or Zelle payments</div>";
  }
}

// ─── PAYMENT HISTORY ─────────────────────────────────────────────────────────
var payHistoryLoaded = false;

function togglePaymentHistory() {
  var section = document.getElementById("payHistorySection");
  var btn     = document.getElementById("btnPayHistory");
  var isOpen  = section.classList.contains("active");

  if (isOpen) {
    section.classList.remove("active");
    btn.textContent = "▾ View Payment History";
  } else {
    section.classList.add("active");
    btn.textContent = "▴ Hide Payment History";
    if (!payHistoryLoaded) loadPaymentHistory();
  }
}

function loadPaymentHistory() {
  var url = getScriptUrl(); if (!url) return;
  var list = document.getElementById("payHistoryList");
  list.innerHTML = "<div style='color:var(--muted);font-size:11px'>Loading...</div>";

  fetch(url + "?action=getPaymentHistory")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      payHistoryLoaded = true;
      list.innerHTML = "";
      if (!data.success || !data.rows || !data.rows.length) {
        list.innerHTML = "<div style='color:var(--muted);font-size:11px'>No payment history found</div>";
        return;
      }

      // Group by month
      var groups = {};
      var order  = [];
      data.rows.forEach(function(row) {
        // Extract month label — date is e.g. "May 20" or "May 20, 2026"
        var monthKey = extractMonthKey(row.date);
        if (!groups[monthKey]) { groups[monthKey] = []; order.push(monthKey); }
        groups[monthKey].push(row);
      });

      order.forEach(function(month) {
        var header = document.createElement("div");
        header.className = "pay-history-month";
        header.textContent = month;
        list.appendChild(header);

        groups[month].forEach(function(row) {
          var item = document.createElement("div");
          item.className = "pay-history-row";
          var meta = [row.date, row.name, row.method, row.amount].filter(Boolean).join(" · ");
          if (row.notes) meta += " · " + row.notes;
          item.textContent = meta;
          list.appendChild(item);
        });
      });
    }).catch(function() {
      list.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load history</div>";
    });
}

function extractMonthKey(dateStr) {
  if (!dateStr) return "Unknown";
  // Handles "May 20", "May 20, 2026", "May / 20" etc.
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for (var i = 0; i < months.length; i++) {
    if (dateStr.indexOf(months[i]) !== -1) {
      // Try to grab year too
      var yearMatch = dateStr.match(/\b(20\d\d)\b/);
      return months[i] + (yearMatch ? " " + yearMatch[1] : "");
    }
  }
  return dateStr.split(/[\s,/]/)[0] || dateStr;
}
