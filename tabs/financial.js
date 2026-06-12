// ─── TABS / FINANCIAL.JS ─────────────────────────────────────────────────────
function finWeekNum() {
  var start = new Date(2026, 0, 6), now = new Date();
  var diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(diff + 1, 1), 52);
}
function finMonthNum(w) { return Math.ceil(w / 4); }
function finMoney(n) { return '$' + Math.round(n).toLocaleString(); }

var FIN_MONTH = finMonthNum(finWeekNum());
var FIN_WEEKS = [];

function initFinancialTab() {
  FIN_MONTH = finMonthNum(finWeekNum());
  loadFinancialMonth();
}

function loadFinancialMonth() {
  var url = getScriptUrl();
  var c = document.getElementById('financialBody');
  if (!url) { c.innerHTML = '<div class="fin-empty">Set the script URL first.</div>'; return; }
  c.innerHTML = '<div class="fin-empty">Loading…</div>';
  fetch(url + '?action=getMonthIncome&month=' + FIN_MONTH)
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (!d.success) { c.innerHTML = '<div class="fin-empty">' + (d.message || 'Error') + '</div>'; return; }
      FIN_WEEKS = d.weeks;
      renderFinancial(d);
    })
    .catch(function(e){ c.innerHTML = '<div class="fin-empty">' + e + '</div>'; });
}

function renderFinancial(d) {
  var rows = d.weeks.map(function(wk, i) {
    if (!wk.started) {
      return '<tr class="fin-future"><td class="fin-date">' + wk.date + '</td>' +
        '<td class="fin-c">—</td><td class="fin-r">—</td><td class="fin-r">—</td><td class="fin-r">—</td></tr>';
    }
    var gig = '<span class="fin-gig" onclick="finEditGig(' + i + ')">' + (wk.gig ? finMoney(wk.gig) : '+ add') + '</span>';
    return '<tr><td class="fin-date">' + wk.date + '</td>' +
      '<td class="fin-c">' + wk.count + '</td>' +
      '<td class="fin-r">' + finMoney(wk.studentIncome) + '</td>' +
      '<td class="fin-r">' + gig + '</td>' +
      '<td class="fin-r fin-total">' + finMoney(wk.total) + '</td></tr>';
  }).join('');

  document.getElementById('financialBody').innerHTML =
    '<div class="fin-head"><span class="fin-month-label">MONTH</span>' +
      '<span class="fin-month-num">' + d.monthNum + '</span>' +
      '<span class="fin-range">' + d.weeks[0].date + ' – ' + d.weeks[3].date + '</span></div>' +
    '<table class="fin-table"><thead><tr>' +
      '<th class="fin-date">DATE</th><th class="fin-c">#</th>' +
      '<th class="fin-r">STUDENT</th><th class="fin-r">GIGS</th><th class="fin-r">TOTAL</th>' +
    '</tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr><td colspan="2" class="fin-month-foot">MONTH IN</td>' +
      '<td colspan="3" class="fin-r fin-month-total">' + finMoney(d.monthIncome) + '</td></tr></tfoot>' +
    '</table>' +
    '<div class="fin-nav"><button onclick="finPrevMonth()">‹ prev</button>' +
      '<button onclick="finNextMonth()">next ›</button></div>';
}

function finPrevMonth() { if (FIN_MONTH > 1)  { FIN_MONTH--; loadFinancialMonth(); } }
function finNextMonth() { if (FIN_MONTH < 13) { FIN_MONTH++; loadFinancialMonth(); } }

function finEditGig(i) {
  var wk = FIN_WEEKS[i];
  var val = prompt('Gig income for ' + wk.date + ' ($):', wk.gig || '');
  if (val === null) return;
  var gig = parseFloat(val.replace(/[$,]/g, '')) || 0;
  fetch(getScriptUrl() + '?action=logGig&week=' + wk.weekNum + '&gig=' + gig)
    .then(function(r){ return r.json(); })
    .then(function(){ loadFinancialMonth(); });
}
