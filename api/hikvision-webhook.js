// ============================================================
//  Hikvision webhook (điểm danh) · đặt tại: api/hikvision-webhook.js
//  URL sau khi deploy: https://impetus-dashboard.vercel.app/api/hikvision-webhook
//  Dùng lại SUPABASE_SERVICE_ROLE đã có (không cần env var mới).
//
//  v1 — viết phòng thủ: đọc raw body bất kể JSON/XML/multipart, dò field
//  bằng regex, LUÔN lưu raw_event. Sau khi có log thật (Bước 3), có thể
//  cần chỉnh lại tên field trong extractField().
// ============================================================

const SUPABASE_URL = 'https://zpaicfpuogmewsulawxx.supabase.co';
const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; // khớp getUTCDay()

function extractField(raw, names) {
  for (const name of names) {
    let m = raw.match(new RegExp('"' + name + '"\\s*:\\s*"?([^",}\\r\\n]+)"?', 'i'));
    if (m) return m[1].trim();
    m = raw.match(new RegExp('<' + name + '>([^<]+)</' + name + '>', 'i'));
    if (m) return m[1].trim();
    m = raw.match(new RegExp(name + '["\']?\\s*[:=]\\s*"?([^"\\r\\n,}]+)"?', 'i'));
    if (m) return m[1].trim();
  }
  return null;
}

function parseScanTime(raw) {
  let dt = extractField(raw, ['dateTime', 'eventTime', 'time', 'captureTime']);
  let d;
  if (dt) {
    const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(dt);
    d = new Date(hasOffset ? dt : dt + '+07:00');
    if (isNaN(d.getTime())) d = new Date();
  } else d = new Date();
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  return { gio_quet: d.toISOString(), ngay: vn.toISOString().slice(0, 10), thu: DOW[vn.getUTCDay()] };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Webhook sống — chờ máy gửi POST' });
  }
  const SR = process.env.SUPABASE_SERVICE_ROLE;
  if (!SR) return res.status(500).json({ ok: false, message: 'Thiếu SUPABASE_SERVICE_ROLE' });

  let rawBody = '';
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    rawBody = Buffer.concat(chunks).toString('utf8');
  } catch (e) {}

  console.log('=== HIKVISION WEBHOOK HIT ===', new Date().toISOString());
  console.log('RAW BODY PREVIEW:', rawBody.slice(0, 1500));

  const isNewKey = SR.startsWith('sb_');
  const headers = isNewKey
    ? { apikey: SR, 'Content-Type': 'application/json' }
    : { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
  const minimal = Object.assign({ Prefer: 'return=minimal' }, headers);
  const rest = (p) => SUPABASE_URL + '/rest/v1/' + p;

  try {
    const maHS = extractField(rawBody, ['employeeNoString', 'employeeNo', 'cardNo', 'PersonID', 'userId']);
    const { gio_quet, ngay, thu } = parseScanTime(rawBody);

    let hoc_sinh_id = null;
    if (maHS) {
      const hs = await (await fetch(rest('hoc_sinh?ma_hoc_sinh=eq.' + encodeURIComponent(maHS) + '&select=id'), { headers })).json();
      if (Array.isArray(hs) && hs.length) hoc_sinh_id = hs[0].id;
    }

    let lop_hoc_id = null;
    if (hoc_sinh_id) {
      const dk = await (await fetch(rest('dang_ky_lop?hoc_sinh_id=eq.' + hoc_sinh_id +
        '&trang_thai=neq.da_nghi&select=lop_hoc_id,lop_hoc(id,gio_bat_dau,cac_ngay_trong_tuan,trang_thai)'), { headers })).json();
      if (Array.isArray(dk)) {
        const vn = new Date(new Date(gio_quet).getTime() + 7 * 3600 * 1000);
        const scanMin = vn.getUTCHours() * 60 + vn.getUTCMinutes();
        const ungvien = dk.map(r => r.lop_hoc).filter(l => l && l.trang_thai !== 'da_dong' &&
          String(l.cac_ngay_trong_tuan || '').split(',').map(s => s.trim()).includes(thu));
        if (ungvien.length === 1) lop_hoc_id = ungvien[0].id;
        else if (ungvien.length > 1) {
          let best = null, bestDiff = Infinity;
          for (const l of ungvien) {
            if (!l.gio_bat_dau) continue;
            const [h, m] = String(l.gio_bat_dau).split(':').map(Number);
            const diff = Math.abs((h * 60 + (m || 0)) - scanMin);
            if (diff < bestDiff) { bestDiff = diff; best = l; }
          }
          lop_hoc_id = best ? best.id : ungvien[0].id;
        }
      }
    }

    if (hoc_sinh_id) {
      const dupQ = 'diem_danh?hoc_sinh_id=eq.' + hoc_sinh_id + '&ngay=eq.' + ngay +
        '&lop_hoc_id=' + (lop_hoc_id ? 'eq.' + lop_hoc_id : 'is.null') + '&select=id';
      const dup = await (await fetch(rest(dupQ), { headers })).json();
      if (Array.isArray(dup) && dup.length) return res.status(200).json({ ok: true, message: 'Trùng, bỏ qua' });
    }

    await fetch(rest('diem_danh'), {
      method: 'POST', headers: minimal,
      body: JSON.stringify({ hoc_sinh_id, lop_hoc_id, ngay, gio_quet, raw_event: rawBody.slice(0, 8000) })
    });

    return res.status(200).json({ ok: true, hoc_sinh_id, lop_hoc_id, ngay, ma_hoc_sinh_doc_duoc: maHS });
  } catch (e) {
    console.error('Lỗi hikvision-webhook:', e);
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
};
