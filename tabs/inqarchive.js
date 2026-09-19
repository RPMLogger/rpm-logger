// ─── TABS / INQARCHIVE.JS ────────────────────────────────────────────────────
// Every inquiry ever written, in one read-only list, newest first, split by
// year.
//
// The Inquiries tab is a QUEUE: the moment you press Yes / Maybe / No the card
// leaves it. That is right for working through the morning's post and useless
// for "who was that guy who wrote in last March", or for seeing the students
// you have now next to the inquiry they arrived as. The archive is the other
// half of the same data: the sheet, but readable.
//
// READ-ONLY ON PURPOSE. Same card as the Inquiries tab, minus the decision
// buttons. A decision belongs to the tab where you are actually deciding one;
// a page you open to look things up should not have a No button on it.
//
// One request, then it renders from memory. Nothing here writes, so there is
// nothing to keep in sync: the Reload button at the bottom is the whole
// refresh story.

var _iaCache = null;

// Same source as the Inquiries tab. getInquiries returns EVERY column in the
// sheet with its Decision; the Inquiries tab is the thing doing the filtering,
// not the backend, so the archive just declines to filter.
function initInqArchiveTab() {
  var host = document.getElementById("inqArchiveList");
  if (!host) return;
  if (_iaCache) { _iaRender(_iaCache); return; }

  var url = getScriptUrl();
  if (!url) return;
  host.innerHTML = "<div class='inq-empty rpm-loading'>Loading</div>";
  fetch(url + "?action=getInquiries")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.success) {
        host.innerHTML = "<div class='inq-empty'>Could not load the archive</div>";
        return;
      }
      _iaCache = d.inquiries || [];
      _iaRender(_iaCache);
    })
    .catch(function () {
      host.innerHTML = "<div class='inq-empty'>Could not load the archive</div>";
    });
}

function reloadInqArchive() {
  _iaCache = null;
  initInqArchiveTab();
}

// "Sep 17, 2026" → 2026. Anything unparseable lands in its own group at the
// bottom rather than being dropped: a row with a bad date is still a person.
function _iaYear(inq) {
  var d = new Date(inq.date);
  if (!isNaN(d)) return d.getFullYear();
  var m = (inq.date || "").toString().match(/(20\d{2})/);
  return m ? parseInt(m[1], 10) : 0;
}

// Decision → a class stem. Blank means nobody has answered this one yet, which
// on the Inquiries tab is the only kind of card there is, and here is the thing
// most worth spotting. Drives both the chip and the card's left edge.
function _iaCls(decision) {
  var d = (decision || "").toString().trim();
  return d ? d.toLowerCase().replace(/[^a-z]/g, "") : "open";
}

function _iaChip(decision) {
  var d = (decision || "").toString().trim();
  return "<span class='ia-chip ia-" + _iaCls(decision) + "'>" + inqEsc(d || "Open") + "</span>";
}

// Total / Accepted / Open, the three numbers worth having. Accepted is a Yes:
// every student on the books came through one.
//
// Rendered with the same count tiles as the Load strip (_inqCount, from
// inquiries.js) rather than a private layout, so a number means the same thing
// and looks the same wherever it appears in the portal.
function _iaStats(rows) {
  var yes  = rows.filter(function (i) { return (i.decision || "").toLowerCase() === "yes"; }).length;
  var open = rows.filter(function (i) { return !i.decision; }).length;
  return "<div class='rpm-counts'>" +
      _inqCount("Total",    rows.length) +
      _inqCount("Accepted", yes) +
      _inqCount("Open",     open) +
    "</div>";
}

function _iaRender(inquiries) {
  var host = document.getElementById("inqArchiveList");
  if (!host) return;

  var all = (inquiries || []).slice();
  if (!all.length) { host.innerHTML = "<div class='inq-empty'>Nothing in the archive yet</div>"; return; }

  all.sort(function (a, b) {
    var da = new Date(a.date), db = new Date(b.date);
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1;
    if (isNaN(db)) return -1;
    return db - da;
  });

  // Group into years, keeping the sorted order inside each one.
  var years = [], byYear = {};
  all.forEach(function (inq) {
    var y = _iaYear(inq);
    if (!byYear[y]) { byYear[y] = []; years.push(y); }
    byYear[y].push(inq);
  });
  years.sort(function (a, b) { return b - a; });

  // A grand total only when there is more than one year to add up. With a
  // single year it would just repeat the year header word for word.
  var html = (years.length > 1) ? _iaStats(all) : "";

  years.forEach(function (y) {
    var rows = byYear[y];

    html +=
      "<div class='ia-year'>" +
        "<span class='ia-year-n'>" + (y || "No date") + "</span>" +
      "</div>" +
      _iaStats(rows);

    rows.forEach(function (inq) {
      html +=
        "<div class='inq-dcard archived ia-d-" + _iaCls(inq.decision) + "'>" +
          "<div class='inq-drow'>" +
            "<span class='inq-chan'>" + inqEsc(inq.channel || "Gmail") + "</span>" +
            _iaChip(inq.decision) +
          "</div>" +
          "<div class='inq-name-line'>" +
            "<span class='inq-name'>" + inqEsc(inq.name || "—") + "</span>" +
          "</div>" +
          "<div class='inq-fields'>" + inqCardFieldsHtml(inq) + "</div>" +
        "</div>";
    });
  });

  html += "<hr class='divider' style='margin-top:22px'>" +
          "<button class='refresh-btn' onclick='reloadInqArchive()'>⟳ Reload archive</button>";

  host.innerHTML = html;
}
