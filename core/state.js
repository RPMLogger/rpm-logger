// ─── CORE / STATE.JS ────────────────────────────────────────────────────────
// Shared data store. Tabs read from here. Nothing writes back up to tabs.

var weekStudents  = [];
var todayStudents = [];
var lessonCounts  = {};

var activeStudent    = null;
var activePayStudent = null;

var recognition    = null;
var payRecognition = null;
var isRecording    = false;
var isPayRecording = false;
