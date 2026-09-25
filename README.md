# ระบบรีวิวการให้บริการ · ใจฉันสปา

ลูกค้าสแกน QR ประจำตัว Therapist → ให้ดาว 1–5 (บังคับข้อเดียว) → เลือกรายละเอียดเพิ่มได้ถ้าต้องการ
ผู้จัดการดูผลแบบ real time บน Dashboard (อัปเดตทุก 30 วินาที) และรับแจ้งเตือน LINE เมื่อมีรีวิว ≤ 2 ดาว

| หน้า | ลิงก์ (หลังเปิด GitHub Pages) |
| --- | --- |
| หน้ารีวิวลูกค้า | `https://jaichanspa-admin.github.io/review-system/review/?t=<รหัสพนักงาน>` |
| Dashboard ผู้จัดการ | `https://jaichanspa-admin.github.io/review-system/dashboard/` |
| Dashboard ข้อมูลตัวอย่าง | `.../dashboard/?demo=1` |
| พิมพ์การ์ด QR | `https://jaichanspa-admin.github.io/review-system/qr/` |

ภาษาหน้ารีวิว: ไทย, English, 中文, 日本語, 한국어 (เลือกอัตโนมัติตามภาษามือถือ เปลี่ยนเองได้)

## โครงสร้างไฟล์

```
review/        หน้ารีวิวสำหรับลูกค้า
dashboard/     Dashboard ผู้จัดการ (ต้องใส่ PIN)
qr/            สร้างและพิมพ์การ์ด QR ของ Therapist ทุกคน
assets/        config.js (ตั้งค่า + รายชื่อพนักงาน), i18n.js (คำแปล), common.js, style.css
photos/        รูปพนักงาน ตั้งชื่อ <รหัส>.jpg
apps-script/   Code.gs — โค้ด backend สำหรับ Google Apps Script
```

## ติดตั้ง (ทำครั้งเดียว ~20 นาที)

### 1. เปิด GitHub Pages
Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / `(root)` → Save

### 2. สร้างฐานข้อมูล Google Sheets + API
1. สร้าง Google Sheet ใหม่ชื่อ `JaiChan Reviews` (ใช้บัญชีของร้าน)
2. เมนู **Extensions → Apps Script** → ลบโค้ดเดิม วางโค้ดจาก `apps-script/Code.gs` → Save
3. เลือกฟังก์ชัน `setup` → Run (อนุญาตสิทธิ์) — จะได้แท็บ `Reviews` และ `Staff`
4. **Project Settings → Script properties** เพิ่ม:
   - `MANAGER_PIN` = PIN ของผู้จัดการ (เช่น 6 หลัก)
   - `OPEN_HOUR` = `10`, `CLOSE_HOUR` = `23` (แก้ตามเวลาเปิดร้าน)
5. **Deploy → New deployment → Web app**
   - Execute as: **Me** · Who has access: **Anyone**
   - คัดลอก Web app URL (ลงท้าย `/exec`)
6. เปิด `assets/config.js` วาง URL ที่ `API_URL` แล้ว commit

> แก้ Code.gs ภายหลัง ต้อง Deploy → Manage deployments → Edit → Version: New version (URL เดิม)

### 3. แจ้งเตือน LINE (ไม่บังคับ)
1. สร้าง LINE Official Account + เปิด Messaging API ที่ developers.line.biz
2. คัดลอก Channel access token → Script property `LINE_TOKEN`
3. เชิญบอทเข้ากลุ่มผู้จัดการ แล้วใส่ groupId ที่ `LINE_TO`
4. Apps Script → Triggers → Add trigger → `dailySummary` · Time-driven · Day timer · 9pm–10pm (สรุปรายวัน)

### 4. ลิงก์ Google Review
ใส่ลิงก์เขียนรีวิว Google Maps ของร้านที่ `GOOGLE_REVIEW_URL` ใน `assets/config.js`
ลูกค้าที่ให้ 5 ดาวจะเห็นปุ่มชวนรีวิวต่อบน Google

### 5. รูปพนักงานและการ์ด QR
- วางรูปใน `photos/` (ดู `photos/README.md`)
- เปิดหน้า `qr/` → พิมพ์ A4 (4 ใบ/หน้า) → ตัดเป็นการ์ด A6 ใส่ขาตั้งอะคริลิก

## เพิ่ม / ลบพนักงาน
แก้รายชื่อใน `assets/config.js` (`STAFF`) และแท็บ `Staff` ใน Google Sheet
ชื่อ-นามสกุลจริงใส่เฉพาะใน Google Sheet เท่านั้น (repo นี้เป็นสาธารณะ)

## การประเมินพนักงาน
- คะแนนเฉลี่ย, % 5 ดาว, % 1–2 ดาว, % อยากจองซ้ำ, จุดแข็ง/จุดพัฒนาจากชิปที่ลูกค้าเลือก
- จัดอันดับด้วยคะแนนถ่วงน้ำหนัก (Bayesian) และจัดอันดับเฉพาะคนที่มี ≥ 10 รีวิวในช่วงนั้น
- ผู้จัดการกด "ไม่นับรีวิวนี้" ได้ (เช่น บ่นเรื่องที่จอดรถ) พร้อมเหตุผล — ข้อมูลไม่ถูกลบ
- รีวิวน่าสงสัยติดธง ⚑: ซ้ำเครื่องเดิมใน 12 ชม., เครื่องเดียวรีวิวหลายครั้งใน 24 ชม., นอกเวลาเปิดร้าน
- ปุ่ม "พิมพ์ใบประเมิน" ในหน้าโปรไฟล์ใช้สำหรับคุยผลรายเดือนกับพนักงาน

## ความปลอดภัยของข้อมูล
- ไม่มีข้อมูลรีวิวเก็บใน repo — Dashboard ดึงจาก Google Sheet ผ่าน API เมื่อใส่ PIN ถูกเท่านั้น
- ไม่เก็บชื่อ เบอร์ หรืออีเมลลูกค้า
