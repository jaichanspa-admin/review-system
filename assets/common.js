// ฟังก์ชันที่ใช้ร่วมกันทุกหน้า
window.JC = (function(){
  const store = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  };
  function uuid(){ return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2)); }
  function deviceId(){ let d = store.get("jc_dev"); if (!d){ d = uuid(); store.set("jc_dev", d); } return d; }
  // text/plain avoids a CORS preflight, which Apps Script does not answer
  async function post(body){
    const r = await fetch(window.JC_CONFIG.API_URL, { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(body) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error || "failed"); return j;
  }
  async function get(params){
    const u = new URL(window.JC_CONFIG.API_URL); Object.entries(params).forEach(([k,v]) => u.searchParams.set(k,v));
    const r = await fetch(u); const j = await r.json(); if (!j.ok) throw new Error(j.error || "failed"); return j;
  }
  // รูปพนักงาน: photos/<id>.jpg ถ้าไม่มีไฟล์ แสดงวงกลมตัวอักษรแรกแทน
  function avatar(s, small, base){
    base = base || "../photos/";
    const fb = document.createElement("div"); fb.className = "avatar"+(small?" sm":""); fb.textContent = s.nick.charAt(0);
    const img = new Image(); img.className = "avatar"+(small?" sm":""); img.alt = s.nick;
    img.onerror = () => img.replaceWith(fb);
    img.src = base + s.id + ".jpg";
    return img;
  }
  return { store, uuid, deviceId, post, get, avatar };
})();
