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
  btn.textContent = "＋ Log"; btn.className = "link-btn bright";
  btn.disabled = false;
}

// ─── CASH DATE PICKER ────────────────────────────────────────────────────────
// The cash date is written straight into Students Import and RPM Payments, so
// a typo breaks the "Aug /24" format the audits match on. No free typing: the
// portal's date picker (rpmDtpHtml), date only, a day a step (2026-10-06, was
// separate month and day). It takes the keys while the window is open; Enter
// logs.
var CASH_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Pick the year that lands mon/day nearest today (handles Dec viewed in Jan).
function cashInferYear(mon, day) {
  var now = new Date(), y = now.getFullYear();
  if ((new Date(y, mon, day) - now) > 60 * 24 * 60 * 60 * 1000) y--;
  return y;
}

// Accepts "Aug /24", "Aug 24", "Aug 24, 2026". Falls back to today.
function setCashDate(disp) {
  var box = document.getElementById("cashDtWrap");
  if (!box) return;
  var m = (disp || "").trim().match(/([A-Za-z]{3})[^\d]*(\d{1,2})(?:[^\d]+(\d{4}))?/);
  var mon = m ? CASH_MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1, 3).toLowerCase()) : -1;
  var d = new Date(); d.setHours(0, 0, 0, 0);
  if (m && mon >= 0) {
    var day = parseInt(m[2], 10), y = m[3] ? +m[3] : cashInferYear(mon, day);
    d = new Date(y, mon, Math.min(day, new Date(y, mon + 1, 0).getDate()));
  }
  box.innerHTML = rpmDtpHtml("cash", { date: rpmDtpYmd(d), noTime: true, keys: true });
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
  // ↑↓ step the date: the picker's own listener (core/utils.js).
  if (e.key === "Enter") { e.preventDefault(); submitCashLog(); }
});

// → "Aug 24, 2026", already normalized so it needs no normalizePayDate pass.
function getCashDate() {
  var d = rpmDtpParse(rpmDtpGet("cash").date);
  return d ? CASH_MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() : "";
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
    btn.textContent = "＋ Log"; btn.disabled = false;
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

  // tab / student: whose lesson this pays for — their own name, a contact on
  // their card, or the student picked in the Add contact popup (2026-10-29).
  activeIncomingPayment = {
    payment: payment, cardEl: cardEl, onDone: onDone || null,
    tab: payment.matchedTab || "",
    student: payment.student || studentNameForTab(payment.matchedTab)
  };

  var panel = document.createElement("div");
  panel.className = "incoming-note-panel";
  panel.innerHTML =
    (activeIncomingPayment.student
      ? "<div class='inp-for'>Paying for <b>" + inqEsc(activeIncomingPayment.student) + "</b></div>"
      : "<div class='inp-for inp-for-none'>No student picked — this logs to the Payments sheet only</div>") +
    "<div class='inp-row'>" +
      "<textarea class='inp-textarea' placeholder='Note (optional)...' rows='2'></textarea>" +
      "<button class='inp-mic' data-tip='Starts or stops dictation.'>" + MIC_ICON + "</button>" +
    "</div>" +
    "<div class='inp-actions'>" +
      "<span class='inp-state' style='flex:1'></span>" +
      "<button class='inp-log btn-log'>＋ Log →</button>" +
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

// The student full name behind a tab, for the "Paying for" line.
function studentNameForTab(tab) {
  if (!tab) return "";
  var hit = payerStudentList().filter(function(s) { return s.tab === tab; })[0];
  return hit ? hit.name : "";
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
  // The student picked in "Paying for" wins over the card's own match: it is
  // the one whose Paid box gets ticked.
  var tab      = act.tab || payment.matchedTab || "";
  var samePerson = act.student &&
    act.student.replace(/\s+/g, " ").trim().toLowerCase() === payment.name.replace(/\s+/g, " ").trim().toLowerCase();
  // Someone else paying: say whose lesson it is, since the row carries the
  // payer's name (that is how Incoming knows the payment is dealt with).
  var noteFull = [(act.student && !samePerson) ? "For " + act.student : "", note].filter(Boolean).join(" · ");
  var fullNote = noteFull ? payment.amount + " - " + noteFull : payment.amount;
  var wrote    = payment._wrote || (payment._wrote = { log: false, box: !tab });


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
    method: payment.method, amount: payment.amount, notes: noteFull
  }));
  jobs.push(wrote.box ? Promise.resolve({ ok: true }) : call("logPaymentNote", {
    studentName: tab, paymentDate: payment.date, note: fullNote
  }));

  Promise.all(jobs).then(function(res) {
    if (panel && panel.classList) rpmBusy(panel, logBtn, false);
    if (res[0].ok) wrote.log = true;
    if (res[1].ok) wrote.box = true;

    if (wrote.log && wrote.box) {
      var label = shortDate(payment.date) + " · " + payment.name + " · " + payment.amount + " · " + payment.method +
        (tab ? "" : " (RPM only — no sheet match)");
      addLog("paymentFeed", "✓ " + label, "success");
      if (panel && panel.classList && panel.classList.contains("incoming-note-panel")) panel.remove();
      cardEl.remove();
      activeIncomingPayment = null;
      checkEmptyIncoming();
      payHistoryLoaded = false;
      if (act.onDone) act.onDone();
      // Unpaid Students is its own page now (Audit payments) and reloads
      // every time it opens, so nothing to refresh here.
      return;
    }

    logBtn.textContent = "＋ Log →"; logBtn.disabled = false;
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

// ─── AUDIT PAYMENTS PAGE (2026-10-14) ────────────────────────────────────────
// Unpaid Students used to load under Incoming every time the tab opened (~20s).
// Now Audit payments swaps the page to it and only then asks Google; Back
// returns to Incoming. Opening the Payments tab always lands on Incoming.
function openPayAudit() {
  document.getElementById("payMainView").style.display = "none";
  document.getElementById("payAuditView").style.display = "";
  var back = document.getElementById("btnPayAuditBack");
  if (back && !back.querySelector("svg")) back.insertAdjacentHTML("afterbegin", ARROW_ICON);  window.scrollTo(0, 0);
  var url = getScriptUrl();
  if (!url) { document.getElementById("auditUnpaidSection").innerHTML = '<div class="empty-state">No script URL set</div>'; return; }
  _runAudit3(url);
}
// The magnifier (Details icon) on the button, as soon as the page is up.
document.addEventListener("DOMContentLoaded", function () {
  var b = document.getElementById("btnPayAudit");
  if (b && !b.querySelector("svg")) b.insertAdjacentHTML("afterbegin", DETAILS_ICON);
});
function closePayAudit() {
  document.getElementById("payAuditView").style.display = "none";
  document.getElementById("payMainView").style.display = "";
}

// ─── INCOMING PAYMENTS (Venmo / Zelle) ───────────────────────────────────────
function loadIncomingPayments() {
  var url = getScriptUrl(); if (!url) return;
  var container = document.getElementById("incomingPayments");
  container.innerHTML = "<div class='rpm-loading' style='color:var(--muted)'>Loading</div>";

  fetch(url + "?action=getIncomingPayments")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      container.innerHTML = "";
      var tabBtn = document.querySelector(".tab-btn[onclick*=\"payments\"]");
      renderAutoConfirmed(data.autoRecent);

      if (!data.success || !data.payments || !data.payments.length) {
        container.innerHTML = "<div style='color:var(--muted);font-size:11px;padding:10px 0'>None</div>";
        if (tabBtn) tabBtn.innerHTML = "Payments";
        return;
      }

      if (tabBtn) tabBtn.innerHTML = "Payments<span class='inq-badge'>!</span>";

      data.payments.forEach(function(p) {
        // A trial payment is recorded from the Trial tab (Make Student / Not
        // continuing), never confirmed here: that would tick a lesson's Paid box.
        var isTrial = !!p.trial;
        var card = document.createElement("div");
        card.className = "incoming-card";
        // A name nobody owns: Confirm first opens Add contact (2026-10-30, was
        // its own button above the name): pick the student, the name is theirs
        // from then on, then the usual note + Log.
        var canAdd = !isTrial && p.matchHow !== "own" && p.matchHow !== "contact";
        card.innerHTML =
          "<div class='incoming-main'>" +
            "<div class='incoming-left'>" +
              "<div class='incoming-name'>" + p.name + "</div>" +
              "<div class='incoming-meta'>" +
                "<span class='incoming-method " + p.method.toLowerCase() + "'>" + p.method + "</span>" +
                "<span class='incoming-amount'>" + p.amount + "</span>" +
                "<span class='incoming-date'>" + shortDate(p.date) + "</span>" +
              "</div>" +
              (isTrial
                ? "<div class='incoming-nomatch' style='color:var(--accent2)'>Trial payment \u00b7 " + p.trial.name + " (recorded from the Trial tab)</div>"
                : (p.matched ? "" : "<div class='incoming-nomatch'>\u26a0 Name not matched in student sheets</div>")) +
            "</div>" +
            "<div style='display:flex;gap:6px;flex-shrink:0'>" +
              "<button class='incoming-confirm'" + (isTrial ? " disabled data-tip='Trial payment.\nRecorded from the Trial tab.' style='opacity:.35;cursor:not-allowed'" : "") + ">Confirm \u2192</button>" +
              "<button class='incoming-dismiss'>Dismiss</button>" +
            "</div>" +
          "</div>";

        if (!isTrial) card.querySelector(".incoming-confirm").addEventListener("click", function() {
          if (!canAdd) { openIncomingNotePanel(p, card); return; }
          openAddContact(p, function(tab, student) {
            // Theirs now: the card matches, and Log ticks their box.
            p.matchedTab = tab; p.student = student; p.matchHow = "contact";
            canAdd = false;
            var warn = card.querySelector(".incoming-nomatch");
            if (warn) warn.remove();
            openIncomingNotePanel(p, card);
          });
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


// Payments the hourly backend job recorded on its own (RPM_AutoConfirm.gs):
// exact name + exactly 4x the student's rate. Last 14 days, newest first.
// Same card as Incoming, with AUTO over a green circled check where the buttons go. Sits
// below the pending cards, outside #incomingPayments, so checkEmptyIncoming
// never wipes it.
function renderAutoConfirmed(rows) {
  var box = document.getElementById("autoConfirmed");
  if (!box) {
    var inc = document.getElementById("incomingPayments");
    if (!inc) return;
    box = document.createElement("div");
    box.id = "autoConfirmed";
    inc.parentNode.insertBefore(box, inc.nextSibling);
  }
  if (!rows || !rows.length) { box.innerHTML = ""; return; }
  box.innerHTML =
    "<div class='section-label' style='margin-top:56px;margin-bottom:26px' " +
      "data-tip='Recorded without a Confirm press when all 4 hold:\n1. Venmo or Zelle, not a trial payment.\n2. Name exactly matches one student.\n3. Amount is exactly 4x their rate.\n4. Not already recorded.\nLast 14 days.'>Auto-confirmed</div>" +
    rows.map(function(r) {
      // The Payments log keeps amounts as plain numbers ("440"); show them like Incoming ("$440.00").
      var amt = /^\$/.test(r.amount) ? r.amount : "$" + (parseFloat(r.amount) || 0).toFixed(2);
      return "<div class='incoming-card'>" +
        "<div class='incoming-left'>" +
          "<div class='incoming-name'>" + r.name + "</div>" +
          "<div class='incoming-meta'>" +
            "<span class='incoming-method " + r.method.toLowerCase() + "'>" + r.method + "</span>" +
            "<span class='incoming-amount'>" + amt + "</span>" +
            "<span class='incoming-date'>" + shortDate(r.date) + "</span>" +
          "</div>" +
        "</div>" +
        "<span style='flex-shrink:0;display:inline-flex;flex-direction:column;align-items:center;gap:5px;color:var(--green)'>" +
          "<span style='font-family:\"DM Mono\",monospace;font-size:9px;letter-spacing:.12em'>AUTO</span>" +
          PAID_CHECK_ICON.replace('width="13" height="13"', 'width="15" height="15"') + "</span>" +
      "</div>";
    }).join("");
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

// ─── PAYMENT CONTACTS (2026-10-29) ───────────────────────────────────────────
// Who may pay for each student. Their own name is built in; every other payer
// — a husband, a parent, the short name Venmo prints — is a row on the Payers
// tab of the Payments sheet. Nothing is added in this window: a name you don't
// know turns up on an Incoming card, you work out whose it is, and Confirm asks
// you to put it on that student's card. Here you only look, and remove.
// Auto-confirm accepts a payment from anyone on a student's card; the rest of
// its rules (one block, exactly 4 x their rate) don't change.
var payersLoaded = false;
var payersData   = null;   // the cards as last read, for the Add contact popup

function openPayers() {
  document.getElementById("payersIcon").innerHTML = PAY_ICON;
  document.getElementById("payersModal").style.display = "flex";
  if (!payersLoaded) loadPayers();
}

function closePayers() {
  document.getElementById("payersModal").style.display = "none";
}

function loadPayers() {
  var url = getScriptUrl(); if (!url) return;
  var list = document.getElementById("payersList");
  list.innerHTML = "<div class='rpm-loading' style='color:var(--muted)'>Loading</div>";
  fetch(url + "?action=getPayers")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      payersLoaded = true;
      if (!data.success || !data.students || !data.students.length) {
        list.innerHTML = "<div style='color:var(--muted);font-size:11px'>" +
          (data && data.message ? inqEsc(data.message) : "None") + "</div>";
        return;
      }
      payersData = data.students;
      list.innerHTML = "";
      var grid = document.createElement("div");
      grid.className = "payer-grid";
      data.students.forEach(function(s) { grid.appendChild(payerCard(s)); });
      list.appendChild(grid);
    })
    .catch(function() { list.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load</div>"; });
}

// One small card per student: their own name, then everyone else who pays for
// them. ✕ forgets an added name; the own name has none.
function payerCard(s) {
  var card = document.createElement("div");
  card.className = "payer-card";
  var names = s.payers.map(function(p) {
    if (p.own) return "<div class='payer-row'><span class='payer-name'>" + inqEsc(p.name) + "</span></div>";
    return "<div class='payer-row'><span class='payer-name added'>" + inqEsc(p.name) + "</span>" +
      "<button class='payer-del' data-name='" + inqEsc(p.name) +
      "' data-tip='Forgets this name.&#10;Their payments go back to manual.'>✕</button></div>";
  }).join("");

  card.innerHTML = "<div class='payer-card-head'>" + inqEsc(s.name) + "</div>" +
    "<div class='payer-names'>" + names + "</div><div class='payer-state'></div>";

  var state = card.querySelector(".payer-state");
  card.querySelectorAll(".payer-del").forEach(function(btn) {
    btn.addEventListener("click", function() {
      rpmBusy(card, btn, true);
      payerCall("removePayer", { tab: s.tab, name: btn.getAttribute("data-name") }, function(res) {
        rpmBusy(card, btn, false);
        if (!res.ok) { rpmFail(state, res.why); return; }
        loadPayers();
      });
    });
  });
  return card;
}

// ─── ADD CONTACT POPUP (2026-10-29) ──────────────────────────────────────────
// Add contact on an Incoming card opens this: you have worked out whose the
// name is, so put it on their card. The student box is the portal's picker
// (the Travel look the date and time boxes wear), its list the same drop.
// From then on the name is theirs and the next payment confirms itself.
var payAddPick = null;   // { tab, name } picked in the popup

function payerStudentList() {
  return allStudentData.map(function(s) {
    var name = typeof s === "string" ? s : (s.name || s.tab);
    var tab  = (typeof s === "object" && s.tab) ? s.tab : name;
    return { name: name, tab: tab };
  }).filter(function(s) { return !/^--/.test(s.name); });
}

// done(tab, studentName) once you have picked, or null if you skipped.
function openAddContact(payment, done) {
  var modal = document.getElementById("payAddModal");
  payAddPick = null;
  document.getElementById("payAddIcon").innerHTML = PAY_ICON;
  // The name alone: pressing Confirm means you have already read the card.
  document.getElementById("payAddWho").innerHTML =
    "<span class='pa-name'>" + inqEsc(payment.name) + "</span>";
  document.getElementById("payAddPick").innerHTML =
    "<div class='dtp'><div class='dtp-box'><div class='dtp-cell'>" +
      "<span class='dtp-lab'>Student</span>" +
      "<button type='button' class='dtp-val pa-val' id='payAddVal'>—</button>" +
      "<span class='dtp-chevs dtp-dropchev'><button type='button' class='dtp-drop' id='payAddDrop' aria-label='Pick a student'>" +
        dtArrow(-1) + "</button></span>" +
    "</div></div></div>";
  document.getElementById("payAddState").innerHTML = "";
  payAddSetBtns();

  var open = function() { payAddDropOpen(); };
  document.getElementById("payAddVal").onclick = open;
  document.getElementById("payAddDrop").onclick = open;

  document.getElementById("payAddSave").onclick = function() { payAddFinish(payment, done); };
  modal.dataset.done = "";
  modal._done = done;
  modal.style.display = "flex";
}

// ✕ or a click outside drops the whole Confirm: nothing is logged, the card
// stays on Incoming.
function closeAddContact() {
  var modal = document.getElementById("payAddModal");
  modal.style.display = "none";
  modal._done = null;
  payAddDropClose();
}

// Nothing to add until a student is picked.
function payAddSetBtns() {
  document.getElementById("payAddSave").disabled = !payAddPick;
}

function payAddDropClose() {
  var l = document.getElementById("payAddList");
  if (l) l.remove();
}

function payAddDropOpen() {
  payAddDropClose();
  var cell = document.getElementById("payAddVal").closest(".dtp-cell");
  var list = document.createElement("div");
  list.id = "payAddList";
  list.innerHTML = payerStudentList().map(function(s) {
    return "<button type='button' class='" + (payAddPick && payAddPick.tab === s.tab ? "on" : "") +
      "' data-tab='" + inqEsc(s.tab) + "' data-name='" + inqEsc(s.name) + "'>" + inqEsc(s.name) + "</button>";
  }).join("");
  document.body.appendChild(list);
  var b = cell.getBoundingClientRect();
  list.style.minWidth = b.width + "px";
  var below = window.innerHeight - b.bottom - 6;
  list.style.left = Math.max(8, Math.min(b.left, window.innerWidth - list.offsetWidth - 8)) + "px";
  list.style.top = (below >= list.offsetHeight || below >= b.top ? b.bottom + 6 : b.top - 6 - list.offsetHeight) + "px";
  var on = list.querySelector(".on");
  if (on) list.scrollTop = on.offsetTop - list.clientHeight / 2 + on.offsetHeight / 2;
  list.addEventListener("click", function(e) {
    var o = e.target.closest("button");
    if (!o) return;
    payAddPick = { tab: o.getAttribute("data-tab"), name: o.getAttribute("data-name") };
    document.getElementById("payAddVal").textContent = payAddPick.name;
    payAddDropClose();
    payAddSetBtns();
  });
}

function payAddFinish(payment, done) {
  if (!payAddPick) return;
  var pick = payAddPick;
  var modal = document.getElementById("payAddModal");
  var state = document.getElementById("payAddState");
  var btn = document.getElementById("payAddSave");

  function out() {
    modal._done = null;
    modal.style.display = "none";
    done(pick.tab, pick.name);
  }

  rpmBusy(modal.querySelector(".settings-modal"), btn, true);
  payerCall("addPayer", { tab: pick.tab, name: payment.name, method: payment.method }, function(res) {
    rpmBusy(modal.querySelector(".settings-modal"), btn, false);
    if (!res.ok) { rpmFail(state, res.why); return; }
    payersLoaded = false;
    addLog("paymentFeed", "✓ " + payment.name + " → " + pick.name + " · payment contact added", "success");
    out();
  });
}

function payerCall(action, params, done) {
  var url = getScriptUrl(); if (!url) { done({ ok: false, why: "No script URL." }); return; }
  var q = url + "?action=" + action;
  for (var k in params) q += "&" + k + "=" + encodeURIComponent(params[k]);
  fetch(q).then(function(r) { return r.json(); })
    .then(function(d) { done({ ok: !!(d && d.success), why: (d && d.message) || "" }); })
    .catch(function() { done({ ok: false, why: "No answer from Google." }); });
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
  list.innerHTML = "<div class='rpm-loading' style='color:var(--muted)'>Loading</div>";

  fetch(url + "?action=getPaymentHistory")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      payHistoryLoaded = true;
      list.innerHTML = "";
      if (!data.success || !data.rows || !data.rows.length) {
        list.innerHTML = "<div style='color:var(--muted);font-size:11px'>None</div>";
        return;
      }

      // 2026-10-24: one Dashboard-look box per month, newest first, month
      // total in its header; "Auto-confirmed" notes hidden (it's most rows).
      var rows = data.rows.map(function(row, i) {
        var t = new Date(row.date).getTime();
        return { row: row, t: isNaN(t) ? 0 : t, i: i };
      });
      rows.sort(function(a, b) { return (b.t - a.t) || (a.i - b.i); });

      var groups = {};
      var order  = [];
      rows.forEach(function(r) {
        var monthKey = extractMonthKey(r.row.date);
        if (!groups[monthKey]) { groups[monthKey] = []; order.push(monthKey); }
        groups[monthKey].push(r.row);
      });

      order.forEach(function(month) {
        var total = groups[month].reduce(function(s, row) { return s + (parseFloat(String(row.amount).replace(/[^0-9.]/g, "")) || 0); }, 0);
        // Month + total as the box's header band, like the Dashboard's boxes.
        var html = "<div class='f2-wrap'><div class='pay-history-month'><span>" + inqEsc(month) + "</span>" +
          "<span class='pay-history-total'>" + payHistMoney(total) + "</span></div>" +
          "<table class='f2-table pay-history-table'><tbody>";
        groups[month].forEach(function(row) {
          // A note pops up on hover over the name; a dot marks the names that have one.
          var hasNote = row.notes && row.notes !== "Auto-confirmed";
          var name = hasNote
            ? "<span class='pay-history-noted' data-tip='" + inqEsc(row.notes) + "'>" + inqEsc(row.name || "") + "<span class='pay-history-dot'></span></span>"
            : inqEsc(row.name || "");
          html += "<tr class='f2-row'>" +
            "<td class='ph-date'>" + inqEsc(shortDate(row.date)) + "</td>" +
            "<td class='ph-name'>" + name + "</td>" +
            "<td class='ph-method'>" + inqEsc(row.method || "") + "</td>" +
            "<td class='ph-amt'>" + payHistMoney(row.amount) + "</td></tr>";
        });
        html += "</tbody></table></div>";
        list.insertAdjacentHTML("beforeend", html);
      });
    }).catch(function() {
      list.innerHTML = "<div style='color:var(--muted);font-size:11px'>Could not load history</div>";
    });
}

// "$1,240" — whole dollars unless there are cents.
function payHistMoney(v) {
  var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return inqEsc(v);
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
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
