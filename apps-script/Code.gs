/**
 * Jai Chan Spa — Review API (Google Apps Script)
 * วิธีติดตั้งดูใน README.md ขั้นตอนที่ 2
 *
 * Script Properties ที่ต้องตั้ง (Project Settings > Script properties):
 *   SHEET_ID           รหัส Google Sheet (ส่วนระหว่าง /d/ กับ /edit ใน URL) — จำเป็นถ้าสคริปต์ไม่ได้สร้างจากเมนูของชีต
 *   MANAGER_PIN        PIN สำหรับเปิด Dashboard (เช่น 6 หลัก)
 *   LINE_TOKEN         Channel access token ของ LINE Messaging API (ไม่บังคับ)
 *   LINE_TO            groupId / userId ที่จะรับแจ้งเตือน (ไม่บังคับ)
 *   OPEN_HOUR          ชั่วโมงเปิดร้าน (ค่าเริ่มต้น 10)
 *   CLOSE_HOUR         ชั่วโมงปิดร้าน (ค่าเริ่มต้น 23)
 */

const SHEET_REVIEWS = "Reviews";
const SHEET_STAFF = "Staff";
const HEADERS = ["id","created","updated","therapist","stars","chips","rebook","service","comment","comment_th",
                 "lang","country","device","flag","excluded","exclude_reason","alerted"];
const TZ = "Asia/Bangkok";

function props_(){ return PropertiesService.getScriptProperties(); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheet_(name, headers){
  const sid = props_().getProperty("SHEET_ID");
  const ss = sid ? SpreadsheetApp.openById(sid) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh){ sh = ss.insertSheet(name); if (headers) sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}

/** รันครั้งแรกครั้งเดียว: สร้างแท็บ Reviews + Staff */
function setup(){
  sheet_(SHEET_REVIEWS, HEADERS);
  const st = sheet_(SHEET_STAFF, ["id","nick","full_name","active"]);
  if (st.getLastRow() < 2){
    [["680603","Nicky"],["680602","Fon"],["680606","Noi"],["680609","Namhom"],["680613","Sui"],["6902055","Mena"],
     ["690627","Veena"],["690637","Pook"],["690630","Kai"],["690635","Kookkai"],["690632","Kwan"]]
      .forEach(r => st.appendRow([r[0], r[1], "", true]));
    st.getRange("A2:A").setNumberFormat("@");
  }
}

function doPost(e){
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const b = JSON.parse(e.postData.contents || "{}");
    if (b.action === "review") return json_(saveReview_(b));
    if (b.action === "exclude") return json_(exclude_(b));
    return json_({ ok:false, error:"unknown action" });
  } catch(err){ return json_({ ok:false, error:String(err) }); }
  finally { lock.releaseLock(); }
}

function doGet(e){
  const p = e.parameter || {};
  if (p.action === "data"){
    if (!checkPin_(p.pin)) return json_({ ok:false, error:"bad pin" });
    return json_({ ok:true, reviews: readReviews_(p.since), now: new Date().toISOString() });
  }
  return json_({ ok:true, service:"jaichan-review" });
}

function checkPin_(pin){ const real = props_().getProperty("MANAGER_PIN"); return !!real && String(pin) === String(real); }

function clean_(s, max){ return String(s || "").replace(/[\u0000-\u001f]/g," ").slice(0, max || 200); }

function saveReview_(b){
  const stars = Number(b.stars);
  if (!(stars >= 1 && stars <= 5)) return { ok:false, error:"stars" };
  const t = clean_(b.t, 12); if (!/^\d{5,8}$/.test(t)) return { ok:false, error:"therapist" };
  const id = clean_(b.id, 60) || Utilities.getUuid();
  const sh = sheet_(SHEET_REVIEWS, HEADERS);
  const now = new Date();
  const data = sh.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = data.length - 1; i >= 1; i--) if (data[i][0] === id){ rowIdx = i + 1; break; }

  const comment = clean_(b.comment, 800);
  const row = rowIdx > 0 ? data[rowIdx - 1].slice() : new Array(HEADERS.length).fill("");
  const set = (k, v) => row[HEADERS.indexOf(k)] = v;
  if (rowIdx < 0){ set("id", id); set("created", now); set("flag", flags_(data, t, clean_(b.device,60), now)); set("excluded", false); }
  set("updated", now); set("therapist", "'" + t); set("stars", stars);
  if (b.chips !== undefined) set("chips", clean_(b.chips, 200));
  if (b.rebook !== undefined) set("rebook", clean_(b.rebook, 10));
  if (b.service !== undefined) set("service", clean_(b.service, 20));
  if (b.country !== undefined) set("country", clean_(b.country, 4));
  if (comment){ set("comment", comment); set("comment_th", translate_(comment, b.lang)); }
  set("lang", clean_(b.lang, 5)); set("device", clean_(b.device, 60));

  if (rowIdx > 0) sh.getRange(rowIdx, 1, 1, HEADERS.length).setValues([row]);
  else sh.appendRow(row);

  // แจ้งเตือนรีวิว ≤2 ดาว (ครั้งเดียวต่อรีวิว; ส่งอีกครั้งถ้ามีความคิดเห็นเพิ่มเข้ามา)
  const alerted = row[HEADERS.indexOf("alerted")];
  if (stars <= 2 && (!alerted || (comment && alerted === "stars"))){
    const r = rowIdx > 0 ? rowIdx : sh.getLastRow();
    sendLine_(lowAlertText_(t, stars, row));
    sh.getRange(r, HEADERS.indexOf("alerted") + 1).setValue(comment ? "full" : "stars");
  }
  return { ok:true, id:id };
}

/** ติดธงรีวิวน่าสงสัย: ซ้ำเครื่องเดิมใน 12 ชม. / นอกเวลาเปิดร้าน */
function flags_(data, t, device, now){
  const f = [];
  const h = Number(Utilities.formatDate(now, TZ, "H"));
  const open = Number(props_().getProperty("OPEN_HOUR") || 10), close = Number(props_().getProperty("CLOSE_HOUR") || 23);
  if (h < open || h > close + 1) f.push("off-hours");
  const ti = HEADERS.indexOf("therapist"), di = HEADERS.indexOf("device"), ci = HEADERS.indexOf("created");
  let sameDevice24h = 0;
  for (let i = 1; i < data.length; i++){
    if (data[i][di] !== device || !device) continue;
    const age = (now - new Date(data[i][ci])) / 36e5;
    if (String(data[i][ti]).replace("'","") === t && age < 12) f.push("duplicate-12h");
    if (age < 24) sameDevice24h++;
  }
  if (sameDevice24h >= 3) f.push("same-device-many");
  return [...new Set(f)].join(",");
}

function translate_(text, lang){
  if (!text || lang === "th") return "";
  try { return LanguageApp.translate(text, "", "th"); } catch(e){ return ""; }
}

function readReviews_(since){
  const sh = sheet_(SHEET_REVIEWS, HEADERS);
  const v = sh.getDataRange().getValues(); const out = [];
  const s = since ? new Date(since) : null;
  for (let i = 1; i < v.length; i++){
    const o = {}; HEADERS.forEach((h, j) => o[h] = v[i][j]);
    if (s && new Date(o.updated) <= s) continue;
    o.therapist = String(o.therapist).replace("'","");
    delete o.device; delete o.alerted;
    out.push(o);
  }
  return out;
}

function exclude_(b){
  if (!checkPin_(b.pin)) return { ok:false, error:"bad pin" };
  const sh = sheet_(SHEET_REVIEWS, HEADERS); const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (v[i][0] === b.id){
    sh.getRange(i + 1, HEADERS.indexOf("excluded") + 1, 1, 2).setValues([[!!b.excluded, clean_(b.reason, 200)]]);
    sh.getRange(i + 1, HEADERS.indexOf("updated") + 1).setValue(new Date());
    return { ok:true };
  }
  return { ok:false, error:"not found" };
}

function nick_(t){
  const v = sheet_(SHEET_STAFF).getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === t) return v[i][1];
  return t;
}

function lowAlertText_(t, stars, row){
  const g = k => row[HEADERS.indexOf(k)];
  return "⚠️ รีวิว " + stars + " ดาว\nTherapist: " + nick_(t) + " (" + t + ")" +
    (g("service") ? "\nบริการ: " + g("service") : "") +
    (g("chips") ? "\nควรปรับ: " + g("chips") : "") +
    (g("comment") ? "\nความเห็น: " + g("comment") : "") +
    (g("comment_th") ? "\n(แปล) " + g("comment_th") : "") +
    "\nเวลา: " + Utilities.formatDate(new Date(), TZ, "d/M HH:mm");
}

function sendLine_(text){
  const token = props_().getProperty("LINE_TOKEN"), to = props_().getProperty("LINE_TO");
  if (!token || !to) return;
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method:"post", contentType:"application/json", muteHttpExceptions:true,
    headers:{ Authorization:"Bearer " + token },
    payload: JSON.stringify({ to:to, messages:[{ type:"text", text:text.slice(0, 4900) }] })
  });
}

/** สรุปรายวัน — ตั้ง Trigger แบบ Time-driven ทุกวัน 21:00–22:00 */
function dailySummary(){
  const today = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  const rows = readReviews_().filter(r => !r.excluded && Utilities.formatDate(new Date(r.created), TZ, "yyyy-MM-dd") === today);
  if (!rows.length){ sendLine_("📊 สรุปรีวิววันนี้: ยังไม่มีรีวิว"); return; }
  const by = {};
  rows.forEach(r => { (by[r.therapist] = by[r.therapist] || []).push(Number(r.stars)); });
  const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  const lines = Object.keys(by).sort((a, b) => avg(by[b]) - avg(by[a]))
    .map(t => "• " + nick_(t) + ": " + avg(by[t]) + " ★ (" + by[t].length + ")");
  sendLine_("📊 สรุปรีวิววันนี้ " + rows.length + " รีวิว เฉลี่ย " + avg(rows.map(r => Number(r.stars))) + " ★\n" + lines.join("\n"));
}
