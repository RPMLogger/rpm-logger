// ─── TABS / BIWEEKLY.JS ─────────────────────────────────────────────────────
// Biweekly load balancer. Scans the next 90 days of the RPM - Biweekly
// calendar and splits students into the two alternating weeks of the
// fortnight cycle, so a lopsided load is obvious and can be rebalanced.

function initBiweeklyTab() {
  var section = document.getElementById("biweeklyBody");
  if (!section) return;
  section.innerHTML = '<div class="empty-state">Scanning next 90 days...</div>';

  var url = getScriptUrl();
  if (!url) { section.innerHTML = '<div class="empty-state">No script URL set</div>'; return; }

  fetch(url + "?action=getBiweeklyBalance")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) {
        section.innerHTML = '<div class="empty-state">Error: ' + (data.message || "unknown") + '</div>';
        return;
      }
      _renderBiweekly(data);
    })
    .catch(function() {
      section.innerHTML = '<div class="empty-state">Connection failed</div>';
    });
}

function _renderBiweekly(data) {
  var section = document.getElementById("biweeklyBody");
  section.innerHTML = "";

  var a = data.weekA, b = data.weekB;
  var diff = Math.abs(a.count - b.count);

  // --- balance banner --------------------------------------------------
  var banner = document.createElement("div");
  var balanced = diff <= 1;
  var heavier = a.count >= b.count ? a.label : b.label;
  banner.style.cssText =
    "padding:10px 14px;border-radius:6px;margin-bottom:14px;font-size:13px;font-weight:600;" +
    (balanced
      ? "background:rgba(0,200,100,0.12);color:var(--green);border:1px solid rgba(0,200,100,0.35)"
      : "background:rgba(255,180,0,0.12);color:#ffb400;border:1px solid rgba(255,180,0,0.35)");
  banner.textContent = balanced
    ? "Balanced — " + a.count + " vs " + b.count + " biweekly students"
    : "Off by " + diff + " — " + heavier + " is heavier (" + a.count + " vs " + b.count + "). Move " +
      Math.ceil(diff / 2) + " to even it out.";
  section.appendChild(banner);

  // --- two-column groups ----------------------------------------------
  var cols = document.createElement("div");
  cols.style.cssText = "display:flex;gap:12px;align-items:flex-start";
  cols.appendChild(_biweeklyColumn(a, true));
  cols.appendChild(_biweeklyColumn(b, false));
  section.appendChild(cols);

  // --- per-week timeline ----------------------------------------------
  if (data.timeline && data.timeline.length) {
    var tl = document.createElement("div");
    tl.style.cssText = "margin-top:18px";
    var tlHdr = document.createElement("div");
    tlHdr.style.cssText = "font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px";
    tlHdr.textContent = "Lessons per week · next " + data.windowDays + " days";
    tl.appendChild(tlHdr);

    var max = data.timeline.reduce(function(m, w) { return Math.max(m, w.count); }, 1);
    var strip = document.createElement("div");
    strip.style.cssText = "display:flex;gap:4px;align-items:flex-end;height:90px;overflow-x:auto;padding-bottom:4px";
    data.timeline.forEach(function(w) {
      var bar = document.createElement("div");
      bar.title = w.weekStart + " — " + w.count + " lessons (" + w.group + " week)";
      bar.style.cssText = "flex:0 0 26px;display:flex;flex-direction:column;align-items:center;gap:3px";
      var h = Math.round((w.count / max) * 60) + 4;
      bar.innerHTML =
        "<span style='font-size:9px;color:var(--muted)'>" + w.count + "</span>" +
        "<div style='width:18px;height:" + h + "px;border-radius:3px;background:" +
          (w.group === "This" ? "var(--green)" : "#5b9dff") + "'></div>" +
        "<span style='font-size:8px;color:var(--muted);writing-mode:vertical-rl;margin-top:2px'>" + w.weekStart + "</span>";
      strip.appendChild(bar);
    });
    tl.appendChild(strip);
    section.appendChild(tl);
  }
}

function _biweeklyColumn(group, isThis) {
  var col = document.createElement("div");
  col.style.cssText = "flex:1;min-width:0;border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden";

  var hdr = document.createElement("div");
  hdr.style.cssText =
    "padding:8px 12px;display:flex;justify-content:space-between;align-items:center;" +
    "border-bottom:1px solid var(--border);border-left:3px solid " +
    (isThis ? "var(--green)" : "#5b9dff");
  hdr.innerHTML =
    "<span style='font-weight:700;font-size:13px'>" + group.label + "</span>" +
    "<span style='font-size:12px;color:var(--muted)'>" + group.count + "</span>";
  col.appendChild(hdr);

  if (!group.students.length) {
    var empty = document.createElement("div");
    empty.style.cssText = "padding:14px 12px;font-size:12px;color:var(--muted)";
    empty.textContent = "No biweekly students";
    col.appendChild(empty);
    return col;
  }

  group.students.forEach(function(s) {
    var row = document.createElement("div");
    row.style.cssText = "padding:8px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;align-items:center;gap:8px";
    row.innerHTML =
      "<span style='font-weight:600;font-size:13px'>" + s.name +
        (s.split ? " <span title='Also has lessons in the other week' style='color:#ffb400;font-size:10px'>⚠</span>" : "") +
      "</span>" +
      "<span style='font-size:10px;color:var(--muted);text-align:right;flex-shrink:0'>" +
        s.date + "<br>" + s.time + "</span>";
    col.appendChild(row);
  });

  return col;
}
