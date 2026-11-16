/**
 * Travel Planning API (Google Apps Script)
 *
 * Menjadikan tab "TRAVEL PLAN" di Google Sheet sebagai database untuk web app.
 *  - GET  ?token=...            -> baca semua baris (A:M) + versi data
 *  - POST {token, rows, baseVersion} -> ganti semua baris data dengan `rows`
 *
 * Kolom: A Waktu mulai | B Hari | C Durasi | D Jam mulai | E Jam selesai | F Lokasi
 *        G Pemilik | H Catatan | I Result | J Plan | K Kategori
 *        L Estimasi Google Maps | M Pengeluaran Real
 */

// GANTI dengan kata sandi buatanmu sendiri (jangan dibagikan / jangan di-commit).
const TOKEN = 'GANTI_DENGAN_KATA_SANDI_KAMU';

const SHEET_NAME = 'TRAVEL PLAN';
const BACKUP_SHEET_NAME = '_BACKUP';
const NUM_COLS = 13;
const HEADERS = [
  'Waktu mulai', 'Hari', 'Durasi', 'Jam mulai', 'Jam selesai', 'Lokasi',
  'Pemilik', 'Catatan', 'Result', 'Plan', 'Kategori',
  'Estimasi Google Maps', 'Pengeluaran Real',
];
// Kolom yang ditulis sebagai teks supaya "12/09/2026" tidak berubah format/locale.
const TEXT_COLS = [1, 4, 5];

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    checkToken_(p.token);
    return json_(readAll_());
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    lock.waitLock(20000);
    locked = true;
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    checkToken_(body.token);
    if (!Array.isArray(body.rows)) throw new Error('rows harus berupa array');
    if (body.rows.length > 2000) throw new Error('terlalu banyak baris');
    return json_(writeAll_(body.rows, body.baseVersion));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function checkToken_(token) {
  if (!token || token !== TOKEN || TOKEN === 'GANTI_DENGAN_KATA_SANDI_KAMU') {
    throw new Error('UNAUTHORIZED');
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Tab "' + SHEET_NAME + '" tidak ditemukan');
  return sheet;
}

/** Baca A:M apa adanya seperti tampil di Sheet (baris pertama = header). */
function readAll_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  let values = lastRow >= 1
    ? sheet.getRange(1, 1, lastRow, NUM_COLS).getDisplayValues()
    : [HEADERS];
  // buang baris kosong di bagian bawah
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

/** Cegah teks yang diawali = + - @ dibaca Sheet sebagai rumus. */
function safeCell_(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@]/.test(s) && isNaN(Number(s))) return "'" + s;
  return s;
}

function writeAll_(rows, baseVersion) {
  const sheet = getSheet_();
  const current = readAll_();

  // Ada orang/perangkat lain yang mengubah Sheet sejak app terakhir membaca.
  if (baseVersion && baseVersion !== current.version) {
    return { ok: false, error: 'CONFLICT', version: current.version, rows: current.rows };
  }

  // Simpan salinan terakhir sebelum ditimpa (1 snapshot, tab tersembunyi).
  let backup = SpreadsheetApp.getActive().getSheetByName(BACKUP_SHEET_NAME);
  if (!backup) {
    backup = SpreadsheetApp.getActive().insertSheet(BACKUP_SHEET_NAME);
    backup.hideSheet();
  }
  backup.clear();
  backup.getRange(1, 1, current.rows.length, NUM_COLS).setNumberFormat('@').setValues(current.rows);
  backup.getRange(1, NUM_COLS + 2).setValue('Backup: ' + new Date().toISOString());

  // Rapikan data dari app: tepat 13 kolom per baris, semua string.
  const data = rows.map(function (r) {
    const out = [];
    for (var i = 0; i < NUM_COLS; i++) out.push(safeCell_(r && r[i]));
    return out;
  });

  // Hapus isi lama (A2:M terakhir), tulis ulang header + data.
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
