// ─── CORE / STORAGE.JS ──────────────────────────────────────────────────────
// All localStorage logic lives here.
//
// Lesson "already logged" state is NOT stored here anymore — the student sheet
// is the single source of truth. getWeekStudents returns an `alreadyLogged`
// flag per Today student, so there's no per-week client memory to go stale.

// Script URL
function getScriptUrl() {
  var url = document.getElementById('scriptUrl').value.trim();
  if (!url) { openSettings(); return null; }
  localStorage.setItem('scriptUrl', url);
  return url;
}
