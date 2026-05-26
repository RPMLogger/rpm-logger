// ─── TABS / PAYMENTS.JS ──────────────────────────────────────────────────────
// Payments tab: Manual Entry (cash), incoming Venmo/Zelle, payment history.

var allStudentData  = [];
var payHistoryLoaded = false;

// Called by core after getAllStudents resolves
function renderPaymentStudents(students) {
  allStudentData = students;
  if (typeof populateStudentPicker === "function") populateStudentPicker(students);
}

// ─── DATE NORMALIZER ─────────────────────────────────────────────────────────
// Turns "May 16" → "May 16, 2026". Leaves "May 16, 2026" alone.
function normalizePayDate(raw) {
  if (!raw) return raw;
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var currentYear = new Date().getFullYear();
  var hasMonth = false;
  for (var i = 0; i < months.length; i++) {
    if (raw.toLowerCase().indexOf(months[i].toLowerCase()) !== -1) { hasMonth = true; break; }
  }
  if (!hasMonth) return raw;
  if (/\b20\d\d\b/.test(raw)) return raw; // already has year
  return raw.trim() + ", " + currentYear;
}

// ─── DISPLAY DATE FORMATTER ───────────────────────────────────────────────────
// Turns "May 26, 2026" or any date string → "May 26" for display only.
function shortDate(dateStr) {
  if (!dateStr) return '';
  // Strip year and any trailing comma/space
  var s = dateStr.replace(/,?\s*20\d\d/, '').trim();
  // If it still looks like a full JS date, parse it
  if (s.length > 10) {
    var d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return months[d.getMonth()] + ' ' + d.getDate();
    }
  }
  return s;
}

// ─── MANUAL ENTRY MODAL ───────────────────────────────────────────────────────
function openManualEntryModal() {
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
  closeCashLogPanel(true);
  document.getElementById("manualEntryModal").classList.add("active");
}

function closeManualEntryModal() {
  document.getElementById("manualEntryModal").classList.remove("active");
  closeCashLogPanel(true);
}

function openCashLogPanel(name, tab, pillEl) {
  document.querySelectorAll(".student-pill").forEach(function(p) { p.classList.remove("active"); });
  if (pillEl) pillEl.classList.add("active");
  activeCashStudent = { name: name, tab: tab };
  document.getElementById("cashLogPanel").classList.add("active");
  document.getElementById("cashLogName").textContent = name;
  document.getElementById("cashDate").value = "";
  document.getElementById("cashDate").placeholder = "Date — e.g. May 20";
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
  var raw    = document.getElementById("cashDate").value.trim();
  var amount = document.getElementById("cashAmount").value.trim() || "$380";
  var notes  = document.getElementById("cashNotes").value.trim();

  if (!raw) {
    document.getElementById("cashDate").placeholder = "Required — e.g. May 20";
    document.getElementById("cashDate").focus();
    return;
  }

  // Auto-append year if missing, normalize format
  var date = normalizePayDate(raw);

  // K column note: "May 20, 2026 · $380 · notes" (notes optional)
  var kNote = date + " · " + amount + (notes ? " · " + notes : "");

  var btn = document.getElementById("btnCashLog");
  btn.textContent = "Logging..."; btn.disabled = true;

  callScript(url, "logPaymentNote", { studentName: tab, note: kNote }, function(data) {
    if (data.success) {
      callScript(url, "logPayment", {
        date: date, studentName: name, method: "Cash", amount: amount, notes: notes
      }, function() {});
      btn.textContent = "✓ Logged!"; btn.className = "btn-log success";
      addLog("paymentFeed", "✓ " + name + " · Cash · " + amount + " · " + shortDate(date), "success");
      payHistoryLoaded = false; // force refresh next time history opens
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

      // Update tab badge
      var tabBtn = document.querySelector(".tab-btn[onclick*=\"payments\"]");

      if (!data.success || !data.payments || !data.payments.length) {
        container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No new payments</div>";
        // Clear badge
        if (tabBtn) tabBtn.innerHTML = "Payments";
        return;
      }

      // Show badge on tab
      if (tabBtn) tabBtn.innerHTML = "Payments <span style='background:var(--accent);color:#fff;font-size:8px;border-radius:8px;padding:1px 5px;vertical-align:middle;margin-left:2px'>!</span>";

      data.payments.forEach(function(p) {
        var card = document.createElement("div");
        card.className = "incoming-card";
        card.innerHTML =
          "<div class='incoming-left'>" +
            "<div class='incoming-name'>" + p.name + "</div>" +
            "<div class='incoming-meta'>" +
              "<span class='incoming-method " + p.method.toLowerCase() + "'>" + p.method + "</span>" +
              "<span class='incoming-amount'>" + p.amount + "</span>" +
              "<span class='incoming-date'>" + shortDate(p.date) + "</span>" +
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

  // Log to RPM Payments sheet — email date in column A, notes empty
  callScript(url, "logPayment", {
    date: payment.date, studentName: payment.name,
    method: payment.method, amount: payment.amount, notes: ""
  }, function() {});

  // If matched to student sheet — write checkbox + K note ("Venmo $379.00")
  if (payment.matchedTab) {
    callScript(url, "logPaymentNote", {
      studentName: payment.matchedTab,
      note: payment.method + " " + payment.amount
    }, function() {});
  }

  var label = "✓ " + payment.name + " · " + payment.method + " · " + payment.amount +
    (payment.matched ? "" : " (RPM only — no sheet match)");
  addLog("paymentFeed", label, "success");

  // Remove card
  if (cardEl) {
    cardEl.remove();
  } else {
    document.querySelectorAll(".incoming-card").forEach(function(c) {
      if (c.querySelector(".incoming-name") && c.querySelector(".incoming-name").textContent === payment.name) c.remove();
    });
  }

  var container = document.getElementById("incomingPayments");
  if (!container.querySelector(".incoming-card")) {
    container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No new payments</div>";
    // Clear tab badge
    var tabBtn = document.querySelector(".tab-btn[onclick*=\"payments\"]");
    if (tabBtn) tabBtn.innerHTML = "Payments";
  }

  payHistoryLoaded = false; // force history refresh
}

function dismissIncoming(btn) {
  var card = btn.closest(".incoming-card");
  if (card) card.remove();
  var container = document.getElementById("incomingPayments");
  if (!container.querySelector(".incoming-card")) {
    container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No new payments</div>";
    var tabBtn = document.querySelector(".tab-btn[onclick*=\"payments\"]");
    if (tabBtn) tabBtn.innerHTML = "Payments";
  }
}

// ─── PAYMENT HISTORY ─────────────────────────────────────────────────────────
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
          // Format: "Glen Paulin · Cash · $380 · May 26"
          var parts = [row.name, row.method, row.amount, shortDate(row.date)].filter(Boolean);
          if (row.notes) parts.push(row.notes);
          item.textContent = parts.join(" · ");
          list.appendChild(item);
        });
      });
    }).catch(function() {
      list.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load history</div>";
    });
}

function extractMonthKey(dateStr) {
  if (!dateStr) return "Unknown";
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for (var i = 0; i < months.length; i++) {
    if (dateStr.indexOf(months[i]) !== -1) {
      var yearMatch = dateStr.match(/\b(20\d\d)\b/);
      return months[i] + (yearMatch ? " " + yearMatch[1] : "");
    }
  }
  // Fallback: try parsing
  var d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    var mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mn[d.getMonth()] + " " + d.getFullYear();
  }
  return dateStr.split(/[\s,/]/)[0] || dateStr;
}
