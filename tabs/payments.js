// ─── TABS / PAYMENTS.JS ──────────────────────────────────────────────────────
// Payments tab: Manual Entry (cash), incoming Venmo/Zelle, payment history.

var allStudentData   = [];
var payHistoryLoaded = false;

function renderPaymentStudents(students) {
  allStudentData = students;
  if (typeof populateStudentPicker === "function") populateStudentPicker(students);
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function normalizePayDate(raw) {
  if (!raw) return raw;
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var hasMonth = false;
  for (var i = 0; i < months.length; i++) {
    if (raw.toLowerCase().indexOf(months[i].toLowerCase()) !== -1) { hasMonth = true; break; }
  }
  if (!hasMonth) return raw;
  if (/\b20\d\d\b/.test(raw)) return raw;
  return raw.trim() + ", " + new Date().getFullYear();
}

function shortDate(dateStr) {
  if (!dateStr) return '';
  var s = dateStr.replace(/,?\s*20\d\d/, '').trim();
  if (s.length > 10) {
    var d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      var mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return mn[d.getMonth()] + ' ' + d.getDate();
    }
  }
  return s;
}

function todayFormatted() {
  var d = new Date();
  var mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return mn[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
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
  document.getElementById("cashDate").value = todayFormatted();
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

  var date = normalizePayDate(raw);

  var btn = document.getElementById("btnCashLog");
  btn.textContent = "Logging..."; btn.disabled = true;

  callScript(url, "logPaymentNote", { studentName: tab, paymentDate: date, note: notes }, function(data) {
    if (data.success) {
      callScript(url, "logPayment", {
        date: date, studentName: name, method: "Cash", amount: amount, notes: notes
      }, function() {});
      btn.textContent = "✓ Logged!"; btn.className = "btn-log success";
      addLog("paymentFeed", "✓ " + shortDate(date) + " · " + name + " · " + amount + " · Cash", "success");
      payHistoryLoaded = false;
      setTimeout(function() { closeManualEntryModal(); }, 1200);
    } else {
      btn.textContent = "Log Payment →"; btn.disabled = false;
      addLog("paymentFeed", "❌ " + (data.message || "Error logging cash payment"), "error");
    }
  });
}

// ─── INCOMING NOTE PANEL (text + mic + log) ───────────────────────────────────
var activeIncomingPayment = null;
var incomingRecognition   = null;
var incomingRecording     = false;

function openIncomingNotePanel(payment, cardEl) {
  // Close any other open note panel first
  document.querySelectorAll(".incoming-note-panel").forEach(function(p) { p.remove(); });
  stopIncomingMic();

  activeIncomingPayment = { payment: payment, cardEl: cardEl };

  var panel = document.createElement("div");
  panel.className = "incoming-note-panel";
  panel.innerHTML =
    "<div class='inp-row'>" +
      "<textarea class='inp-textarea' placeholder='Note (optional)...' rows='2'></textarea>" +
      "<button class='inp-mic' title='Dictate note'>🎤</button>" +
    "</div>" +
    "<div class='inp-actions'>" +
      "<button class='inp-log btn-log'>Log →</button>" +
      "<button class='inp-cancel'>✕</button>" +
    "</div>";

  var textarea  = panel.querySelector(".inp-textarea");
  var micBtn    = panel.querySelector(".inp-mic");
  var logBtn    = panel.querySelector(".inp-log");
  var cancelBtn = panel.querySelector(".inp-cancel");

  micBtn.addEventListener("click", function() {
    if (incomingRecording) {
      stopIncomingMic();
      micBtn.textContent = "🎤";
      micBtn.classList.remove("recording");
    } else {
      startIncomingMic(textarea, micBtn);
    }
  });

  logBtn.addEventListener("click", function() {
    stopIncomingMic();
    submitIncomingWithNote(textarea.value.trim(), logBtn);
  });

  cancelBtn.addEventListener("click", function() {
    stopIncomingMic();
    panel.remove();
    activeIncomingPayment = null;
  });

  cardEl.parentNode.insertBefore(panel, cardEl.nextSibling);
  textarea.focus();
}

function startIncomingMic(textarea, micBtn) {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    addLog("paymentFeed", "Speech not supported. Use Chrome.", "error");
    return;
  }
  incomingRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  incomingRecognition.lang = "en-US";
  incomingRecognition.continuous = true;
  incomingRecognition.interimResults = true;
  incomingRecognition._finalText = "";
  incomingRecognition._suppressed = false;

  incomingRecognition.onstart = function() {
    incomingRecording = true;
    micBtn.textContent = "⏹";
    micBtn.classList.add("recording");
  };

  incomingRecognition.onresult = function(event) {
    var interim = "";
    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) incomingRecognition._finalText += event.results[i][0].transcript;
      else interim += event.results[i][0].transcript;
    }
    textarea.value = (incomingRecognition._finalText + interim).trim();
  };

  incomingRecognition.onend = function() {
    if (incomingRecognition._suppressed) return;
    incomingRecording = false;
    micBtn.textContent = "🎤";
    micBtn.classList.remove("recording");
  };

  incomingRecognition.onerror = function(e) {
    if (e.error === "no-speech") return;
    incomingRecording = false;
    micBtn.textContent = "🎤";
    micBtn.classList.remove("recording");
  };

  incomingRecognition.start();
}

function stopIncomingMic() {
  if (incomingRecognition) {
    incomingRecognition._suppressed = true;
    incomingRecognition.stop();
  }
  incomingRecording = false;
}

function submitIncomingWithNote(note, logBtn) {
  var url = getScriptUrl(); if (!url) return;
  if (!activeIncomingPayment) return;

  var payment   = activeIncomingPayment.payment;
  var cardEl    = activeIncomingPayment.cardEl;
  var fullNote  = note ? payment.amount + " - " + note : payment.amount;

  logBtn.textContent = "Logging..."; logBtn.disabled = true;

  callScript(url, "logPayment", {
    date: payment.date, studentName: payment.name,
    method: payment.method, amount: payment.amount, notes: note
  }, function() {});

  if (payment.matchedTab) {
    callScript(url, "logPaymentNote", {
      studentName: payment.matchedTab,
      paymentDate: payment.date,
      note: fullNote
    }, function() {});
  }

  var label = shortDate(payment.date) + " · " + payment.name + " · " + payment.amount + " · " + payment.method +
    (payment.matched ? "" : " (RPM only — no sheet match)");
  addLog("paymentFeed", "✓ " + label, "success");

  // Remove note panel + card
  var panel = cardEl.nextSibling;
  if (panel && panel.classList && panel.classList.contains("incoming-note-panel")) panel.remove();
  cardEl.remove();
  activeIncomingPayment = null;
  checkEmptyIncoming();
  payHistoryLoaded = false;
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
      var tabBtn = document.querySelector(".tab-btn[onclick*=\"payments\"]");

      if (!data.success || !data.payments || !data.payments.length) {
        container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>No new payments</div>";
        if (tabBtn) tabBtn.innerHTML = "Payments";
        return;
      }

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
            "<button class='incoming-dismiss'>✕ Dismiss</button>" +
          "</div>";

        card.querySelector(".incoming-confirm").addEventListener("click", function() {
          openIncomingNotePanel(p, card);
        });
        card.querySelector(".incoming-dismiss").addEventListener("click", function() {
          dismissIncoming(card, p.id);
        });

        container.appendChild(card);
      });
    }).catch(function() {
      container.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load</div>";
    });
}


function dismissIncoming(cardEl, threadId) {
  var url = getScriptUrl();

  if (cardEl) cardEl.remove();
  checkEmptyIncoming();

  if (url && threadId) {
    callScript(url, "logDismissed", { threadId: threadId }, function() {});
  }
}

function checkEmptyIncoming() {
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
        header.textContent = month.toUpperCase();
        list.appendChild(header);

        groups[month].forEach(function(row) {
          var item = document.createElement("div");
          item.className = "pay-history-row";
          var parts = [shortDate(row.date), row.name, row.amount, row.method].filter(Boolean);
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
  var d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    var mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mn[d.getMonth()] + " " + d.getFullYear();
  }
  return dateStr.split(/[\s,/]/)[0] || dateStr;
}
