// ─── TABS / FINANCIAL.JS ─────────────────────────────────────────────────────

// ── Week number from date (Jan 6 = week 1) ───────────────────────────────────
function getWeekNum() {
  var start = new Date(2026, 0, 6); // Jan 6 2026 = week 1
  var now   = new Date();
  var diff  = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(diff + 1, 1), 52);
}

function getWeekDateLabel(weekNum) {
  var start = new Date(2026, 0, 6);
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[start.getMonth()] + " / " + start.getDate();
}

function getMonthNum(weekNum) {
  return Math.ceil(weekNum / 4);
}

// ── Init Financial tab ────────────────────────────────────────────────────────
function initFinancialTab() {
  var weekNum  = getWeekNum();
  var monthNum = getMonthNum(weekNum);

  document.getElementById("fin-week-num").textContent  = weekNum;
  document.getElementById("fin-week-date").textContent = getWeekDateLabel(weekNum);
  document.getElementById("fin-month-num").textContent = monthNum;

  // Pull student income from General tab DOM (already fetched from cal)
  var incEl = document.getElementById("loadIncome");
  var inc   = incEl ? incEl.textContent : "—";
  document.getElementById("fin-student-income").textContent = inc;

  finCalcTotal();
  fetchFinancialSummary();
}

// ── Live total calculation ────────────────────────────────────────────────────
function finCalcTotal() {
  var incEl  = document.getElementById("loadIncome");
  var incRaw = incEl ? incEl.textContent.replace(/[$,]/g, "") : "0";
  var inc    = parseFloat(incRaw) || 0;
  var gigs   = parseFloat(document.getElementById("fin-gigs-input").value) || 0;
  var total  = inc + gigs;
  document.getElementById("fin-total-in").textContent = "$" + total.toLocaleString();
}

// ── Fetch month summary from Apps Script ─────────────────────────────────────
function fetchFinancialSummary() {
  var url = getScriptUrl();
  if (!url) return;
  var monthNum = getMonthNum(getWeekNum());
  fetch(url + "?action=getFinancialSummary&month=" + monthNum)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) return;
      var fmt = function(v) { return v !== null && v !== "" ? "$" + parseFloat(v).toLocaleString() : "—"; };
      document.getElementById("fin-month-income").textContent  = fmt(data.monthIncome);
      document.getElementById("fin-avg-expense").textContent   = fmt(data.avgExpense);
      document.getElementById("fin-net-monthly").textContent   = fmt(data.netMonthly);
      document.getElementById("fin-net-greg").textContent      = fmt(data.netGreg);
      document.getElementById("fin-student-avg").textContent   = data.studentAvg !== null ? data.studentAvg : "—";
    })
    .catch(function() {
      document.getElementById("fin-status").textContent = "Could not load month summary.";
    });
}

// ── Log week to Income sheet ──────────────────────────────────────────────────
function finLogWeek() {
  var url = getScriptUrl();
  if (!url) return;

  var weekNum  = getWeekNum();
  var incEl    = document.getElementById("loadIncome");
  var incRaw   = incEl ? incEl.textContent.replace(/[$,]/g, "") : "0";
  var normEl   = document.getElementById("loadNorm");
  var norm     = normEl ? parseFloat(normEl.textContent) || 0 : 0;
  var studentIncome = parseFloat(incRaw) || 0;
  var gigs     = parseFloat(document.getElementById("fin-gigs-input").value) || 0;

  var btn = document.getElementById("fin-log-btn");
  btn.textContent = "Logging...";
  btn.disabled    = true;

  fetch(url + "?action=logWeek&week=" + weekNum +
              "&norm=" + norm +
              "&studentIncome=" + studentIncome +
              "&gigs=" + gigs)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        document.getElementById("fin-status").textContent = "✓ Week " + weekNum + " logged.";
        document.getElementById("fin-gigs-input").value  = "";
        finCalcTotal();
        fetchFinancialSummary();
      } else {
        document.getElementById("fin-status").textContent = "Error: " + (data.message || "unknown");
      }
      btn.textContent = "↑ Log Week";
      btn.disabled    = false;
    })
    .catch(function() {
      document.getElementById("fin-status").textContent = "Could not connect.";
      btn.textContent = "↑ Log Week";
      btn.disabled    = false;
    });
}
