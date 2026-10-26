// Paste into the Google Sheet's Extensions → Apps Script, then deploy as a Web app.
const HEADERS = [
  "timestamp", "participant_id", "age_group", "occupation", "route", "first_ui", "second_ui",
  "ui_a_ease", "ui_a_comment", "ui_b_ease", "ui_b_comment",
  "ui_a_time_sec", "ui_b_time_sec", "ui_a_pages", "ui_b_pages",
  "ui_a_errors", "ui_b_errors", "preferred_version", "preference_themes",
  "preference_comment", "started_at", "completed_at", "total_duration_sec",
  "device_category", "os", "browser", "user_agent",
];
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = JSON.parse(e.postData.contents);
  // Use the sheet's own header row, adding any column it is missing, so rows
  // always line up under the right heading even if the headers are old.
  const width = Math.max(sheet.getLastColumn(), 1);
  let header = sheet.getLastRow()
    ? sheet.getRange(1, 1, 1, width).getValues()[0].filter(String)
    : [];
  const missing = HEADERS.filter((h) => !header.includes(h));
  if (missing.length) {
    sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]);
    header = header.concat(missing);
  }
  sheet.appendRow(header.map((h) => (data[h] === undefined ? "" : data[h])));
  return ContentService.createTextOutput("ok");
}
