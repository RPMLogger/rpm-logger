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

// ─── CASH PAYMENT WINDOW ─────────────────────────────────────────────────────
// The Trial window look (2026-09-29): "Payments · Log cash", the payment icon, the
// student dropdown, then Date / Amount / Note and one bright Log bottom right.
var cashDdHi = -1;   // the option ↑↓ has lit while the list is open

function openManualEntryModal() {
  var list = document.getElementById("cashDdList");
  list.innerHTML = "";
  allStudentData.forEach(function(s) {
    var name = typeof s === "string" ? s : (s.name || s.tab);
    var tab  = (typeof s === "object" && s.tab) ? s.tab : name;
    if (/^--/.test(name)) return;   // the --BLANK-- template tab isn't a student
    var o = document.createElement("button");
    o.type = "button";
    o.className = "cash-dd-opt";
    o.textContent = name;
    o.onclick = function() { cashDdClose(); openCashLogPanel(name, tab); };
    o.onmouseenter = function() { cashDdLight([].indexOf.call(list.children, o)); };
    list.appendChild(o);
  });
  var caret = document.querySelector("#cashDdBtn .cash-dd-caret");
  if (caret && !caret.innerHTML) caret.innerHTML = TRI_ICON;
  var ico = document.getElementById("cashIcon");
  if (ico && !ico.innerHTML) ico.innerHTML = PAY_ICON;
  closeCashLogPanel(true);
  document.getElementById("manualEntryModal").classList.add("active");
}

function closeManualEntryModal() {
  document.getElementById("manualEntryModal").classList.remove("active");
  cashDdClose();
  closeCashLogPanel(true);
}

// ─── Student dropdown (the portal's own, not the OS menu) ───────────────────
function cashDdOpen() { return !document.getElementById("cashDdList").hidden; }

function cashDdToggle() {
  var list = document.getElementById("cashDdList");
  if (!list.hidden) { cashDdClose(); return; }
  list.hidden = false;
  document.getElementById("cashDd").classList.add("open");
  var opts = list.children, cur = -1;
  for (var i = 0; i < opts.length; i++) if (opts[i].classList.contains("on")) cur = i;
  cashDdLight(cur);
  if (cur >= 0) opts[cur].scrollIntoView({ block: "nearest" });
}

function cashDdClose() {
  var list = document.getElementById("cashDdList");
  if (!list) return;
  list.hidden = true;
  document.getElementById("cashDd").classList.remove("open");
}

function cashDdLight(i) {
  var opts = document.getElementById("cashDdList").children;
  cashDdHi = i;
  for (var k = 0; k < opts.length; k++) opts[k].classList.toggle("hi", k === i);
  if (opts[i]) opts[i].scrollIntoView({ block: "nearest" });
}

// A click anywhere else in the window closes the list.
document.addEventListener("click", function(e) {
  var dd = document.getElementById("cashDd");
  if (dd && cashDdOpen() && !dd.contains(e.target)) cashDdClose();
});

function openCashLogPanel(name, tab) {
  [].forEach.call(document.getElementById("cashDdList").children, function(o) {
    o.classList.toggle("on", o.textContent === name);
  });
  var lbl = document.getElementById("cashDdLabel");
  lbl.textContent = name;
  document.getElementById("cashDdBtn").classList.add("picked");
  activeCashStudent = { name: name, tab: tab };
  document.getElementById("cashLogPanel").classList.add("active");
  document.getElementById("cashActs").classList.add("active");
  setCashDate(todayFormatted());
  document.getElementById("cashAmount").value = "380";
  document.getElementById("cashNotes").value = "";
  document.getElementById("cashMsg").innerHTML = "";
  var btn = document.getElementById("btnCashLog");
  btn.textContent = "Log"; btn.className = "link-btn bright";
  btn.disabled = false;
}

// ─── CASH DATE PICKER (Mon / Day) ────────────────────────────────────────────
// The cash date is written straight into Students Import and RPM Payments, so
// a typo breaks the "Aug /24" format the audits match on. No free typing: the
// Trial windows' picker (grey box, ▲ / ▼ above and below each value). Hover
// or click lights a value; ↑↓ step it, ←→ move between month and day, Enter
// logs. Year is inferred on submit.
var CASH_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var cashDate    = { mon: null, day: null, on: 0 };

// 2024 is a leap year, so Feb 29 stays reachable while stepping. getCashDate()
// clamps against the real inferred year before it hands the date over.
function cashMonthLen(mon, year) { return new Date(year || 2024, mon + 1, 0).getDate(); }

// Pick the year that lands mon/day nearest today (handles Dec viewed in Jan).
function cashInferYear(mon, day) {
  var now = new Date(), y = now.getFullYear();
  if ((new Date(y, mon, day) - now) > 60 * 24 * 60 * 60 * 1000) y--;
  return y;
}

// Accepts "Aug /24", "Aug 24", "Aug 24, 2026". Falls back to today.
function setCashDate(disp) {
  var m = (disp || "").trim().match(/([A-Za-z]{3})[^\d]*(\d{1,2})/);
  var mon = m ? CASH_MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1, 3).toLowerCase()) : -1;
  if (m && mon >= 0) {
    cashDate.mon = mon;
    cashDate.day = Math.min(parseInt(m[2], 10), cashMonthLen(mon));
  } else {
    var t = new Date();
    cashDate.mon = t.getMonth();
    cashDate.day = t.getDate();
  }
  cashDate.on = 0;
  renderCashDate();
}

function stepCashDate(which, dir) {
  if (cashDate.mon == null) return;
  if (which === "mon") {
    cashDate.mon = (cashDate.mon + dir + 12) % 12;
    cashDate.day = Math.min(cashDate.day, cashMonthLen(cashDate.mon));
  } else {
    // The day rolls into the next / previous month (Sep 30 ↑ → Oct 1), like
    // Pick a time's real dates (2026-09-29; it used to wrap to Sep 1).
    var y = cashInferYear(cashDate.mon, cashDate.day);
    var d = new Date(y, cashDate.mon, cashDate.day + dir);
    cashDate.mon = d.getMonth();
    cashDate.day = d.getDate();
  }
  renderCashDate();
}

function cashDateOn(i) {
  cashDate.on = i;
  document.querySelectorAll("#cashDtRow .dt-val").forEach(function(el, k) { el.classList.toggle("on", k === i); });
}

// Redrawn whole on every step, like Pick a time; nothing holds focus.
function renderCashDate() {
  var box = document.getElementById("cashDtRow");
  if (!box || cashDate.mon == null) return;
  var parts = [["mon", CASH_MONTHS[cashDate.mon], 44], ["day", String(cashDate.day), 34]];
  box.innerHTML = parts.map(function(p, i) {
    var tri = function(dir) {
      return '<button type="button" class="tb-tri' + (dir < 0 ? ' down' : '') + '" tabindex="-1" ' +
        'onclick="cashDateOn(' + i + ');stepCashDate(\'' + p[0] + '\',' + dir + ')">' + TRI_ICON + '</button>';
    };
    return '<div class="tb-col">' + tri(1) +
      '<div class="dt-seg"><button type="button" class="dt-val' + (cashDate.on === i ? ' on' : '') + '" tabindex="-1" ' +
        'style="min-width:' + p[2] + 'px" onmouseenter="cashDateOn(' + i + ')" onclick="cashDateOn(' + i + ')">' + p[1] + '</button></div>' +
      tri(-1) + '</div>';
  }).join("");
}

document.addEventListener("keydown", function(e) {
  var ov = document.getElementById("manualEntryModal");
  if (!ov || !ov.classList.contains("active")) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // Open student list: ↑↓ walk it, Enter picks, Esc closes.
  if (cashDdOpen()) {
    var opts = document.getElementById("cashDdList").children;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      cashDdLight(Math.max(0, Math.min(opts.length - 1, cashDdHi + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (opts[cashDdHi]) opts[cashDdHi].click();
    } else if (e.key === "Escape") {
      e.preventDefault(); cashDdClose();
    }
    return;
  }
  if (!activeCashStudent) return;
  var typing = /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || "");
  if (e.key === "Enter") { e.preventDefault(); submitCashLog(); return; }
  if (typing) return;
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    stepCashDate(cashDate.on ? "day" : "mon", e.key === "ArrowUp" ? 1 : -1);
  } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    cashDateOn(e.key === "ArrowRight" ? 1 : 0);
  }
});

// → "Aug 24, 2026", already normalized so it needs no normalizePayDate pass.
function getCashDate() {
  if (cashDate.mon == null || cashDate.day == null) return "";
  var y = cashInferYear(cashDate.mon, cashDate.day);
  var d = Math.min(cashDate.day, cashMonthLen(cashDate.mon, y));
  return CASH_MONTHS[cashDate.mon] + " " + d + ", " + y;
}

// The $ lives in a fixed prefix next to the field, so the input holds digits
// only. Strip any stray $ the user pastes in and re-attach it on submit.
function formatCashAmount(raw) {
  var num = (raw || "").toString().replace(/[^0-9.]/g, "").trim();
  return num ? "$" + num : "$380";
}

function closeCashLogPanel(silent) {
  activeCashStudent = null;
  document.getElementById("cashLogPanel").classList.remove("active");
  document.getElementById("cashActs").classList.remove("active");
  document.getElementById("cashDdLabel").textContent = "Pick student";
  document.getElementById("cashDdBtn").classList.remove("picked");
  [].forEach.call(document.getElementById("cashDdList").children, function(o) { o.classList.remove("on"); });
  rpmBusy(document.getElementById("cashModal"), null, false);
}

// ─── SUBMIT CASH PAYMENT ─────────────────────────────────────────────────────
// The Trial feedback rule: the window dims while it logs; success turns Log
// into a green "Logged ✓" and the window closes a second later; failure is
// the red Unsuccessful badge beside Log, reason in its tooltip, window stays.
function submitCashLog() {
  var url = getScriptUrl(); if (!url) return;
  if (!activeCashStudent) return;
  var btn = document.getElementById("btnCashLog");
  if (btn.disabled) return;

  var name   = activeCashStudent.name;
  var tab    = activeCashStudent.tab;
  var date   = getCashDate();
  var amount = formatCashAmount(document.getElementById("cashAmount").value);
  var notes  = document.getElementById("cashNotes").value.trim();

  if (!date) return; // the picker always holds a date, so this can't normally fire

  var modal = document.getElementById("cashModal");
  document.getElementById("cashMsg").innerHTML = "";
  btn.textContent = "Logging…"; btn.disabled = true;
  rpmBusy(modal, btn, true);

  var fail = function(why) {
    rpmBusy(modal, btn, false);
    btn.textContent = "Log"; btn.disabled = false;
    rpmFail("cashMsg", why, "right");
  };
  fetch(url + "?action=logPaymentNote&studentName=" + encodeURIComponent(tab) +
      "&paymentDate=" + encodeURIComponent(date) + "&note=" + encodeURIComponent(notes))
    .then(function(r) { return r.json(); })
    .catch(function() { return { success: false, message: "No answer from Google." }; })
    .then(function(data) {
    if (data && data.success) {
      rpmBusy(modal, btn, false);
      callScript(url, "logPayment", {
        date: date, studentName: name, method: "Cash", amount: amount, notes: notes
      }, function() {});
      payHistoryLoaded = false;
      // Success in the window, the house way (Log lesson): the button turns
      // green "Logged ✓", then the window closes a second later.
      btn.textContent = "Logged ✓"; btn.className = "link-btn green";
      setTimeout(closeManualEntryModal, 1000);
    } else {
      fail((data && data.message) || "Google did not log it.");
    }
  });
}

// ─── INCOMING NOTE PANEL (text + mic + log) ───────────────────────────────────
var activeIncomingPayment = null;
var incomingRecognition   = null;
var incomingRecording     = false;

// onDone (optional): called after both writes land, e.g. the Audit tab
// re-checking who is still unpaid.
function openIncomingNotePanel(payment, cardEl, onDone) {
  // Close any other open note panel first
  document.querySelectorAll(".incoming-note-panel").forEach(function(p) { p.remove(); });
  stopIncomingMic();

  activeIncomingPayment = { payment: payment, cardEl: cardEl, onDone: onDone || null };

  var panel = document.createElement("div");
  panel.className = "incoming-note-panel";
  panel.innerHTML =
    "<div class='inp-row'>" +
      "<textarea class='inp-textarea' placeholder='Note (optional)...' rows='2'></textarea>" +
      "<button class='inp-mic' data-tip='Starts or stops dictation.'>" + MIC_ICON + "</button>" +
    "</div>" +
    "<div class='inp-actions'>" +
      "<span class='inp-state' style='flex:1'></span>" +
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
      micBtn.innerHTML = MIC_ICON;
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
    micBtn.innerHTML = MIC_STOP_ICON;
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
    micBtn.innerHTML = MIC_ICON;
    micBtn.classList.remove("recording");
  };

  incomingRecognition.onerror = function(e) {
    if (e.error === "no-speech") return;
    incomingRecording = false;
    micBtn.innerHTML = MIC_ICON;
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

// Two writes: the RPM Payments log and the student's Students Import box.
// Three outcomes (2026-09-27):
//   both land   → the card goes, as before
//   both fail   → red Unsuccessful badge, card stays
//   one fails   → amber badge naming the one that failed, card stays; Log
//                 again redoes ONLY that one, so the Payments log never gets
//                 the same payment twice.
// What already landed is remembered on the payment itself (payment._wrote).
function submitIncomingWithNote(note, logBtn) {
  var url = getScriptUrl(); if (!url) return;
  if (!activeIncomingPayment) return;

  var act      = activeIncomingPayment;
  var payment  = act.payment;
  var cardEl   = act.cardEl;
  var panel    = cardEl.nextSibling;
  var stateEl  = panel && panel.querySelector ? panel.querySelector(".inp-state") : null;
  var fullNote = note ? payment.amount + " - " + note : payment.amount;
  var wrote    = payment._wrote || (payment._wrote = { log: false, box: !payment.matchedTab });

  function call(action, params) {
    var q = url + "?action=" + action;
    for (var k in params) q += "&" + k + "=" + encodeURIComponent(params[k]);
    return fetch(q).then(function(r) { return r.json(); })
      .then(function(d) { return { ok: !!(d && d.success), why: (d && d.message) || "" }; })
      .catch(function() { return { ok: false, why: "No answer from Google." }; });
  }

  if (stateEl) stateEl.innerHTML = "";
  logBtn.textContent = "Logging…"; logBtn.disabled = true;
  if (panel && panel.classList) rpmBusy(panel, logBtn, true);

  var jobs = [];
  jobs.push(wrote.log ? Promise.resolve({ ok: true }) : call("logPayment", {
    date: payment.date, studentName: payment.name,
    method: payment.method, amount: payment.amount, notes: note
  }));
  jobs.push(wrote.box ? Promise.resolve({ ok: true }) : call("logPaymentNote", {
    studentName: payment.matchedTab, paymentDate: payment.date, note: fullNote
  }));

  Promise.all(jobs).then(function(res) {
    if (panel && panel.classList) rpmBusy(panel, logBtn, false);
    if (res[0].ok) wrote.log = true;
    if (res[1].ok) wrote.box = true;

    if (wrote.log && wrote.box) {
      var label = shortDate(payment.date) + " · " + payment.name + " · " + payment.amount + " · " + payment.method +
        (payment.matched ? "" : " (RPM only — no sheet match)");
      addLog("paymentFeed", "✓ " + label, "success");
      if (panel && panel.classList && panel.classList.contains("incoming-note-panel")) panel.remove();
      cardEl.remove();
      activeIncomingPayment = null;
      checkEmptyIncoming();
      payHistoryLoaded = false;
      if (act.onDone) act.onDone();
      // Unpaid Students sits under Incoming now: the confirm may have paid
      // someone up, so check the list again.
      else if (document.getElementById("auditUnpaidSection") && typeof _runAudit3 === "function") _runAudit3(url);
      return;
    }

    logBtn.textContent = "Log →"; logBtn.disabled = false;
    if (!wrote.log && !wrote.box) {
      rpmFail(stateEl, [res[0].why, res[1].why].filter(Boolean).join(" · "));
    } else if (!wrote.box) {
      rpmHalf(stateEl, "Sheet box not ticked", "The payment is in the RPM Payments log.\nTicking the Students Import box failed: " +
        (res[1].why || "no reason given") + "\nLog again ticks only the box.");
    } else {
      rpmHalf(stateEl, "Not in Payments log", "The Students Import box is ticked.\nWriting the RPM Payments log failed: " +
        (res[0].why || "no reason given") + "\nLog again writes only the log.");
    }
  });
}

// ─── INCOMING PAYMENTS (Venmo / Zelle) ───────────────────────────────────────
function loadIncomingPayments() {
  var url = getScriptUrl(); if (!url) return;
  var container = document.getElementById("incomingPayments");
  container.innerHTML = "<div class='rpm-loading' style='color:var(--muted);font-size:11px'>Loading</div>";

  fetch(url + "?action=getIncomingPayments")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      container.innerHTML = "";
      var tabBtn = document.querySelector(".tab-btn[onclick*=\"payments\"]");

      if (!data.success || !data.payments || !data.payments.length) {
        container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>None</div>";
        if (tabBtn) tabBtn.innerHTML = "Payments";
        return;
      }

      if (tabBtn) tabBtn.innerHTML = "Payments <span style='background:var(--accent);color:#fff;font-size:8px;border-radius:8px;padding:1px 5px;vertical-align:middle;margin-left:2px'>!</span>";

      data.payments.forEach(function(p) {
        // A trial payment is recorded from the Trial tab (Make Student / Not
        // continuing), never confirmed here: that would tick a lesson's Paid box.
        var isTrial = !!p.trial;
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
            (isTrial
              ? "<div class='incoming-nomatch' style='color:var(--accent2)'>Trial payment · " + p.trial.name + " (recorded from the Trial tab)</div>"
              : (p.matched ? "" : "<div class='incoming-nomatch'>⚠ Name not matched in student sheets</div>")) +
          "</div>" +
          "<div style='display:flex;flex-direction:column;gap:6px;flex-shrink:0'>" +
            "<button class='incoming-confirm'" + (isTrial ? " disabled data-tip='Trial payment.\nRecorded from the Trial tab.' style='opacity:.35;cursor:not-allowed'" : "") + ">Confirm →</button>" +
            "<button class='incoming-dismiss'>Dismiss</button>" +
          "</div>";

        if (!isTrial) card.querySelector(".incoming-confirm").addEventListener("click", function() {
          openIncomingNotePanel(p, card);
        });
        card.querySelector(".incoming-dismiss").addEventListener("click", function() {
          dismissIncoming(card, p);
        });

        container.appendChild(card);
      });
    }).catch(function() {
      container.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load</div>";
    });
}


// Takes the whole payment, not just the thread id, so the Dismissed tab records a
// readable row (date, name, method, amount) instead of an opaque Gmail id. Also
// leaves a line in the feed, so a mis-tapped dismiss is visible instead of silent.
function dismissIncoming(cardEl, payment) {
  var url = getScriptUrl();

  if (cardEl) cardEl.remove();
  checkEmptyIncoming();

  if (url && payment && payment.id) {
    callScript(url, "logDismissed", {
      threadId: payment.id,
      date:     payment.date   || "",
      name:     payment.name   || "",
      method:   payment.method || "",
      amount:   payment.amount || ""
    }, function() {});
    addLog("paymentFeed", "\u2715 Dismissed \u00b7 " + shortDate(payment.date) + " \u00b7 " +
      payment.name + " \u00b7 " + payment.amount + " (recorded in Dismissed tab)", "info");
  }
}

function checkEmptyIncoming() {
  var container = document.getElementById("incomingPayments");
  if (!container.querySelector(".incoming-card")) {
    container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>None</div>";
    var tabBtn = document.querySelector(".tab-btn[onclick*=\"payments\"]");
    if (tabBtn) tabBtn.innerHTML = "Payments";
  }
}

// ─── PAYMENT HISTORY ─────────────────────────────────────────────────────────
// Payment history opens in its own window (2026-09-29); loads once, again
// after a payment is confirmed (payHistoryLoaded goes false).
function openPaymentHistory() {
  document.getElementById("payHistoryIcon").innerHTML = PAY_ICON;
  document.getElementById("payHistoryModal").style.display = "flex";
  if (!payHistoryLoaded) loadPaymentHistory();
}

function closePaymentHistory() {
  document.getElementById("payHistoryModal").style.display = "none";
}

function loadPaymentHistory() {
  var url = getScriptUrl(); if (!url) return;
  var list = document.getElementById("payHistoryList");
  list.innerHTML = "<div class='rpm-loading' style='color:var(--muted);font-size:11px'>Loading</div>";

  fetch(url + "?action=getPaymentHistory")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      payHistoryLoaded = true;
      list.innerHTML = "";
      if (!data.success || !data.rows || !data.rows.length) {
        list.innerHTML = "<div style='color:var(--muted);font-size:11px'>None</div>";
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
