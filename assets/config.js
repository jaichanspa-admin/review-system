// ===== ตั้งค่าระบบรีวิว ใจฉันสปา =====
// 1) วาง URL ของ Google Apps Script Web App (ดู README ขั้นตอนที่ 2)
// 2) ใส่ลิงก์ Google Review ของร้าน (ถ้ามี) เพื่อให้ลูกค้า 5 ดาวรีวิวต่อ
window.JC_CONFIG = {
  API_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
  GOOGLE_REVIEW_URL: "",
  REFRESH_SECONDS: 30,
  MIN_REVIEWS_FOR_RANK: 10,

  // รายชื่อ Therapist (ชื่อเล่น + รหัส) — ชื่อ-นามสกุลจริงเก็บเฉพาะใน Google Sheet (PDPA)
  // รูป: วางไฟล์ photos/<รหัส>.jpg (สี่เหลี่ยมจัตุรัส 600x600) ถ้ายังไม่มีรูปจะแสดงตัวอักษรแทน
  STAFF: [
    { id: "680603",  nick: "Nicky" },
    { id: "680602",  nick: "Fon" },
    { id: "680606",  nick: "Noi" },
    { id: "680609",  nick: "Namhom" },
    { id: "680613",  nick: "Sui" },
    { id: "6902055", nick: "Mena" },
    { id: "690627",  nick: "Veena" },
    { id: "690637",  nick: "Pook" },
    { id: "690630",  nick: "Kai" },
    { id: "690635",  nick: "Kookkai" },
    { id: "690632",  nick: "Kwan" }
  ],

  SERVICES: ["headspa", "massage", "body", "facial", "package"],
  CHIPS: ["technique", "pressure", "friendly", "clean", "ontime", "explained"],
  COUNTRIES: [
    ["TH","🇹🇭 Thailand"],["CN","🇨🇳 China"],["JP","🇯🇵 Japan"],["KR","🇰🇷 South Korea"],
    ["TW","🇹🇼 Taiwan"],["HK","🇭🇰 Hong Kong"],["SG","🇸🇬 Singapore"],["MY","🇲🇾 Malaysia"],
    ["IN","🇮🇳 India"],["RU","🇷🇺 Russia"],["US","🇺🇸 USA"],["GB","🇬🇧 UK"],
    ["AU","🇦🇺 Australia"],["DE","🇩🇪 Germany"],["FR","🇫🇷 France"],["OT","🌏 Other"]
  ]
};
