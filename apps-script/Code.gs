/**
 * Travel Planning, app di dalam Google Sheet (Apps Script).
 *
 *  - Menu "Travel Planning" di Sheet membuka app (Index.html) sebagai jendela.
 *  - Deploy sebagai Web App untuk membukanya dari HP lewat link.
 *  - Database = tab "TRAVEL PLAN" (kolom A:M). Tanpa token: akses diatur oleh
 *    izin berbagi Sheet itu sendiri.
 *
 * Kolom: A Waktu mulai | B Hari | C Durasi | D Jam mulai | E Jam selesai | F Lokasi
 *        G Pemilik | H Catatan | I Result | J Plan | K Kategori
 *        L Estimasi Google Maps | M Pengeluaran Real
 */

// Isi hanya kalau script ini dibuat TERPISAH dari Sheet (bukan lewat Extensions).
const SPREADSHEET_ID = '';

const SHEET_NAME = 'TRAVEL PLAN';
const BACKUP_SHEET_NAME = '_BACKUP';
const NUM_COLS = 13;
const HEADERS = [
  'Waktu mulai', 'Hari', 'Durasi', 'Jam mulai', 'Jam selesai', 'Lokasi',
  'Pemilik', 'Catatan', 'Result', 'Plan', 'Kategori',
  'Estimasi Google Maps', 'Pengeluaran Real',
];
// Ditulis sebagai teks supaya "12/09/2026" tidak berubah format oleh locale Sheet.
const TEXT_COLS = [1, 4, 5];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Travel Planning')
    .addItem('Buka app', 'openApp')
    .addToUi();
}

function openApp() {
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setWidth(1180)
    .setHeight(780);
  SpreadsheetApp.getUi().showModalDialog(html, 'Travel Planning');
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Travel Planning')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Dipanggil dari app: baca semua baris (baris pertama = header) + versi data. */
function getData() {
  return readAll_();
}

/** Dipanggil dari app: ganti semua baris data dengan `rows` (tanpa header). */
function saveData(rows, baseVersion) {
  if (!Array.isArray(rows)) throw new Error('rows harus berupa array');
  if (rows.length > 2000) throw new Error('Terlalu banyak baris');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return writeAll_(rows, baseVersion);
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  throw new Error('Script tidak terhubung ke Sheet. Isi SPREADSHEET_ID di Code.gs.');
}

function getSheet_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Tab "' + SHEET_NAME + '" tidak ditemukan');
  return sheet;
}

/** Baca A:M apa adanya seperti tampil di Sheet. */
function readAll_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  const values = lastRow >= 1
    ? sheet.getRange(1, 1, lastRow, NUM_COLS).getDisplayValues()
    : [HEADERS];
  while (values.length > 1 && values[values.length - 1].every(function (c) { return c === ''; })) {
    values.pop();
  }
  return { ok: true, version: hash_(values), rows: values };
}

function hash_(values) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    JSON.stringify(values),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

/** Cegah teks berawalan = + - @ dibaca Sheet sebagai rumus. */
function safeCell_(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@]/.test(s) && isNaN(Number(s))) return "'" + s;
  return s;
}

function writeAll_(rows, baseVersion) {
  const ss = getSpreadsheet_();
  const sheet = getSheet_();
  const current = readAll_();

  // Sheet berubah dari tempat lain sejak app terakhir membaca.
  if (baseVersion && baseVersion !== current.version) {
    return { ok: false, error: 'CONFLICT', version: current.version, rows: current.rows };
  }

  // Simpan salinan terakhir sebelum ditimpa (1 snapshot, tab tersembunyi).
  let backup = ss.getSheetByName(BACKUP_SHEET_NAME);
  if (!backup) {
    backup = ss.insertSheet(BACKUP_SHEET_NAME);
    backup.hideSheet();
  }
  backup.clear();
  backup.getRange(1, 1, current.rows.length, NUM_COLS).setNumberFormat('@').setValues(current.rows);
  backup.getRange(1, NUM_COLS + 2).setValue('Backup: ' + new Date().toISOString());

  // Tepat 13 kolom per baris, semua string.
  const data = rows.map(function (r) {
    const out = [];
    for (let i = 0; i < NUM_COLS; i++) out.push(safeCell_(r && r[i]));
    return out;
  });

  const maxRows = sheet.getMaxRows();
  if (maxRows > 1) sheet.getRange(2, 1, maxRows - 1, NUM_COLS).clearContent();
  sheet.getRange(1, 1, 1, NUM_COLS).setValues([HEADERS]);

  if (data.length > 0) {
    if (sheet.getMaxRows() < data.length + 1) {
      sheet.insertRowsAfter(sheet.getMaxRows(), data.length + 1 - sheet.getMaxRows());
    }
    TEXT_COLS.forEach(function (c) {
      sheet.getRange(2, c, data.length, 1).setNumberFormat('@');
    });
    sheet.getRange(2, 1, data.length, NUM_COLS).setValues(data);
  }

  SpreadsheetApp.flush();
  return readAll_();
}
