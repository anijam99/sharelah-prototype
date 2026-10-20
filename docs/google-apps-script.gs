// Paste into the Google Sheet's Extensions → Apps Script, then deploy as a Web app.
const HEADERS = [
  "timestamp", "participant_id", "route", "first_ui", "second_ui",
  "ui_a_time_sec", "ui_a_satisfaction", "ui_b_time_sec", "ui_b_satisfaction",
  "user_agent",
];
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow(HEADERS.map((h) => (data[h] === undefined ? "" : data[h])));
  return ContentService.createTextOutput("ok");
}
