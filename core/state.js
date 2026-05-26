// ─── CORE / STATE.JS ────────────────────────────────────────────────────────
// Shared data store. Tabs read from here. Nothing writes back up to tabs.
var weekStudents  = [];
var todayStudents = [];
var lessonCounts  = {};
var activeStudent     = null;
var activeCashStudent = null;
var recognition    = null;
var isRecording    = false;
