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

  // Headcount balance is only half the story: a biweekly student alone in a
  // slot leaves that hour empty every other week. Count how many slots are
  // actually shared vs. half-empty, and list the halves below the pairs.
  var halves = _biweeklyOpenHalves(data);
  var pairedCount = (data.pairs || []).length;
  var sub = document.createElement("div");
  sub.style.cssText = "margin-top:4px;font-size:11px;font-weight:400;opacity:0.8";
  sub.textContent = pairedCount + " slot" + (pairedCount === 1 ? "" : "s") + " paired · " +
    halves.length + " half-empty slot" + (halves.length === 1 ? "" : "s") +
    (halves.length ? " (next biweekly student goes there)" : "");
  banner.appendChild(sub);
  section.appendChild(banner);

  // --- two-column groups ----------------------------------------------
  var cols = document.createElement("div");
  cols.style.cssText = "display:flex;gap:12px;align-items:flex-start";
  cols.appendChild(_biweeklyColumn(a, true));
  cols.appendChild(_biweeklyColumn(b, false));
  section.appendChild(cols);

  // --- matching pairs (shared weekday + time across the two weeks) -----
  if (data.pairs && data.pairs.length) {
    var pairsWrap = document.createElement("div");
    pairsWrap.style.cssText = "border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-top:14px";

    var pHdr = document.createElement("div");
    pHdr.style.cssText = "padding:8px 12px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border)";
    pHdr.textContent = "Matching Pairs · same slot, alternating weeks";
    pairsWrap.appendChild(pHdr);

    data.pairs.forEach(function(p) {
      var row = document.createElement("div");
      row.style.cssText = "padding:8px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;align-items:center;gap:10px";

      var names = p.students.map(function(s) {
        var color = s.week === "A" ? "var(--green)" : "#5b9dff";
        return "<span style='font-weight:600;font-size:13px'>" + s.name +
          " <span style='font-size:9px;color:" + color + "'>(" + s.week + ")</span></span>";
      }).join("<span style='color:var(--muted);margin:0 6px'>·</span>");

      row.innerHTML =
        "<span>" + names + "</span>" +
        "<span style='font-size:11px;color:var(--muted);flex-shrink:0;letter-spacing:0.3px'>" +
          (p.day || "").toUpperCase() + " · " + p.time + "</span>";
      pairsWrap.appendChild(row);
    });
    section.appendChild(pairsWrap);
  }

  // --- open halves: unpaired biweeklies, the slot is free the other week --
  if (halves.length) {
    var hWrap = document.createElement("div");
    hWrap.style.cssText = "border:1px solid var(--border);border-radius:6px;background:var(--panel);overflow:hidden;margin-top:14px";

    var hHdr = document.createElement("div");
    hHdr.style.cssText = "padding:8px 12px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border)";
    hHdr.textContent = "Open Halves · offer these to the next biweekly student";
    hWrap.appendChild(hHdr);

    halves.forEach(function(h) {
      var row = document.createElement("div");
      row.style.cssText = "padding:8px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:10px";
      var openColor = h.openWeek === "A" ? "var(--green)" : "#5b9dff";
      var withColor = h.student.week === "A" ? "var(--green)" : "#5b9dff";
      row.innerHTML =
        "<span style='font-size:9px;letter-spacing:0.5px;text-transform:uppercase;padding:2px 6px;border-radius:3px;" +
          "border:1px solid;color:" + openColor + ";opacity:0.9;white-space:nowrap;width:64px;text-align:center'>" +
          h.openWeek + " week</span>" +
        "<span style='font-weight:600;font-size:13px;white-space:nowrap'>" +
          (h.day || "").toUpperCase() + " · " + h.time + "</span>" +
        "<span style='font-size:10px;color:var(--muted);margin-left:auto;text-align:right'>pairs with " +
          h.student.name + " <span style='color:" + withColor + "'>(" + h.student.week + ")</span></span>";
      hWrap.appendChild(row);
    });
    section.appendChild(hWrap);
  }
}

// A biweekly student whose slot has nobody in the other week. The empty
// half is in the opposite week from the student who holds it.
function _biweeklyOpenHalves(data) {
  var pairedKeys = {};
  (data.pairs || []).forEach(function(p) { pairedKeys[p.dow + "|" + p.mins] = true; });
  var all = (data.weekA.students || []).concat(data.weekB.students || []);
  return all
    .filter(function(s) { return !pairedKeys[s.dow + "|" + s.mins]; })
    .map(function(s) {
      return { day: s.day, time: s.time, dow: s.dow, mins: s.mins,
               openWeek: s.week === "A" ? "B" : "A", student: s };
    })
    .sort(function(a, b) { return (a.dow - b.dow) || (a.mins - b.mins); });
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
      "<span style='font-size:11px;color:var(--muted);text-align:right;flex-shrink:0;letter-spacing:0.3px'>" +
        (s.day || "").toUpperCase() + " · " + s.time + "</span>";
    col.appendChild(row);
  });

  return col;
}
