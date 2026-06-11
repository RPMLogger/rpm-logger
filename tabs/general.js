// ─── TABS / GENERAL.JS ───────────────────────────────────────────────────────
// General tab: student load stats + student list table.

function renderStudentList(data) {
  var rows = document.getElementById("studentListRows");
  rows.innerHTML = "";
  var all = [];
  (data.weeklyList   || []).forEach(function(s) { all.push({ name: s.name || s, rate: s.rate || 95, ave: 1   }); });
  (data.biweeklyList || []).forEach(function(s) { all.push({ name: s.name || s, rate: s.rate || 95, ave: 0.5 }); });
  all.sort(function(a, b) { return a.name.localeCompare(b.name); });
  all.forEach(function(s) {
    var row = document.createElement("div");
    row.className = "load-row"; row.style.padding = "5px 14px";
    row.innerHTML =
      "<div class='load-label' style='flex:1;color:var(--text)'>" + s.name + "</div>" +
      "<div class='load-value' style='width:60px;text-align:center;font-size:10px;color:" +
        (s.ave === 1 ? "var(--accent)" : "var(--accent2)") + "'>" + s.ave + "</div>" +
      "<div class='load-value' style='width:60px;text-align:right;font-size:10px;color:var(--muted)'>$" + s.rate + "</div>";
    rows.appendChild(row);
  });
  document.getElementById("listNormTotal").textContent = data.normalized;
  document.getElementById("studentListTable").style.display = "block";
}
