// ============================================================
//  Hikvision webhook (điểm danh) · đặt tại: api/hikvision-webhook.js
//  URL sau khi deploy: https://impetus-dashboard.vercel.app/api/hikvision-webhook
//  Dùng lại SUPABASE_SERVICE_ROLE đã có (không cần env var mới).
//
//  v2 — viết lại đúng theo schema thật: buoi_hoc (buổi học cụ thể) +
//  diem_danh (bắt buộc có buoi_hoc_id + hoc_sinh_id) + 
//  luot_quet_chua_xac_dinh (khi không khớp mã học sinh nào).
//  Tự "tìm hoặc tạo" buoi_hoc nếu chưa có sẵn cho hôm nay.
// ============================================================

const SUPABASE_URL = 'https://zpaicfpuogmewsulawxx.supabase.co';
const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DEFAULT_DURATION_MIN = 90; // fallback nếu không tìm được giờ kết thúc lớp

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

function vnDateTimeToUTC(ngay, hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  const iso = ngay + 'T' + String(h).padStart(2, '0') + ':' + String(m || 0).padStart(2, '0') + ':00+07:00';
  return new Date(iso);
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

  const isAttendanceAttempt = /employeeNoString|FaceRect/i.test(rawBody);
  if (!isAttendanceAttempt) {
    return res.status(200).json({ ok: true, skipped: true, message: 'Bỏ qua — không phải lượt chấm công' });
  }

  const isNewKey = SR.startsWith('sb_');
  const headers = isNewKey
    ? { apikey: SR, 'Content-Type': 'application/json' }
    : { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
  const minimal = Object.assign({ Prefer: 'return=minimal' }, headers);
  const rest = (p) => SUPABASE_URL + '/rest/v1/' + p;

  try {
    const maHS = extractField(rawBody, ['employeeNoString', 'employeeNo', 'cardNo', 'PersonID', 'userId']);
    const { gio_quet, ngay, thu } = parseScanTime(rawBody);

    if (!maHS) {
      return res.status(200).json({ ok: true, message: 'Không đọc được mã học sinh' });
    }

    // 1) Tra học sinh theo mã quét được
    const hs = await (await fetch(rest('hoc_sinh?ma_hoc_sinh=ilike.' + encodeURIComponent(maHS) + '&select=id'), { headers })).json();
    const hoc_sinh_id = (Array.isArray(hs) && hs.length) ? hs[0].id : null;

    // 2) Không khớp học sinh nào -> ghi vào luot_quet_chua_xac_dinh
    if (!hoc_sinh_id) {
      await fetch(rest('luot_quet_chua_xac_dinh'), {
        method: 'POST', headers: minimal,
        body: JSON.stringify({ ma_hoc_sinh: maHS, thoi_gian_quet: gio_quet, trang_thai: 'chua_xu_ly' })
      });
      return res.status(200).json({ ok: true, message: 'Không khớp học sinh, đã ghi vào luot_quet_chua_xac_dinh', ma_hoc_sinh: maHS });
    }

    // 3) Tìm lớp học sinh đang đăng ký HÔM NAY, chọn lớp gần giờ quét nhất
    const dk = await (await fetch(rest('dang_ky_lop?hoc_sinh_id=eq.' + hoc_sinh_id +
      '&trang_thai=neq.da_nghi&select=lop_hoc_id,lop_hoc(id,gio_bat_dau,cac_ngay_trong_tuan,trang_thai)'), { headers })).json();

    let lop = null;
    if (Array.isArray(dk)) {
      const vn = new Date(new Date(gio_quet).getTime() + 7 * 3600 * 1000);
      const scanMin = vn.getUTCHours() * 60 + vn.getUTCMinutes();
      const ungvien = dk.map(r => r.lop_hoc).filter(l => l && l.trang_thai !== 'da_dong' &&
        String(l.cac_ngay_trong_tuan || '').split(',').map(s => s.trim()).includes(thu));
      if (ungvien.length === 1) lop = ungvien[0];
      else if (ungvien.length > 1) {
        let bestDiff = Infinity;
        for (const l of ungvien) {
          if (!l.gio_bat_dau) continue;
          const [h, m] = String(l.gio_bat_dau).split(':').map(Number);
          const diff = Math.abs((h * 60 + (m || 0)) - scanMin);
          if (diff < bestDiff) { bestDiff = diff; lop = l; }
        }
        if (!lop) lop = ungvien[0];
      }
    }

    if (!lop) {
      console.log('Không khớp lớp nào hôm nay cho học sinh', hoc_sinh_id);
      return res.status(200).json({ ok: true, message: 'Khớp học sinh nhưng không có lớp nào hôm nay', hoc_sinh_id });
    }

    // 4) Tìm buoi_hoc của lớp này trong ngày hôm nay — chưa có thì tự tạo
    const dayStartUTC = vnDateTimeToUTC(ngay, '00:00').toISOString();
    const dayEndUTC = vnDateTimeToUTC(ngay, '23:59').toISOString();
    const bh = await (await fetch(rest('buoi_hoc?lop_hoc_id=eq.' + lop.id +
      '&bat_dau=gte.' + encodeURIComponent(dayStartUTC) + '&bat_dau=lte.' + encodeURIComponent(dayEndUTC) +
      '&select=id'), { headers })).json();

    let buoi_hoc_id = (Array.isArray(bh) && bh.length) ? bh[0].id : null;

    if (!buoi_hoc_id) {
      const lopFull = await (await fetch(rest('lop_hoc?id=eq.' + lop.id + '&select=*'), { headers })).json();
      const lopRow = (Array.isArray(lopFull) && lopFull.length) ? lopFull[0] : {};
      const batDau = vnDateTimeToUTC(ngay, lop.gio_bat_dau || '00:00');
      let ketThuc;
      const endTimeStr = lopRow.gio_ket_thuc || lopRow.gio_ket_thuc_du_kien || null;
      if (endTimeStr) {
        ketThuc = vnDateTimeToUTC(ngay, endTimeStr);
      } else if (lopRow.thoi_luong_phut || lopRow.so_phut_moi_buoi) {
        const phut = Number(lopRow.thoi_luong_phut || lopRow.so_phut_moi_buoi);
        ketThuc = new Date(batDau.getTime() + phut * 60000);
      } else {
        ketThuc = new Date(batDau.getTime() + DEFAULT_DURATION_MIN * 60000);
      }

      const created = await (await fetch(rest('buoi_hoc'), {
        method: 'POST',
        headers: Object.assign({ Prefer: 'return=representation' }, headers),
        body: JSON.stringify({
          lop_hoc_id: lop.id,
          bat_dau: batDau.toISOString(),
          ket_thuc: ketThuc.toISOString(),
          trang_thai: 'da_dien_ra'
        })
      })).json();
      buoi_hoc_id = (Array.isArray(created) && created.length) ? created[0].id : null;
      if (!buoi_hoc_id) {
        console.error('Tạo buoi_hoc thất bại', created);
        return res.status(200).json({ ok: false, message: 'Không tạo được buoi_hoc', detail: created });
      }
    }

    // 5) Tìm hoặc cập nhật diem_danh cho (buoi_hoc_id, hoc_sinh_id)
    const dd = await (await fetch(rest('diem_danh?buoi_hoc_id=eq.' + buoi_hoc_id +
      '&hoc_sinh_id=eq.' + hoc_sinh_id + '&select=id'), { headers })).json();

    if (Array.isArray(dd) && dd.length) {
      await fetch(rest('diem_danh?id=eq.' + dd[0].id), {
        method: 'PATCH', headers: minimal,
        body: JSON.stringify({ trang_thai: 'co_mat', nguon: 'may_quet', thoi_gian_quet: gio_quet })
      });
    } else {
      await fetch(rest('diem_danh'), {
        method: 'POST', headers: minimal,
        body: JSON.stringify({
          hoc_sinh_id, buoi_hoc_id, trang_thai: 'co_mat', nguon: 'may_quet',
          thoi_gian_quet: gio_quet, la_hoc_bu: false
        })
      });
    }

    return res.status(200).json({ ok: true, hoc_sinh_id, buoi_hoc_id, ma_hoc_sinh: maHS });
  } catch (e) {
    console.error('Lỗi hikvision-webhook:', e);
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
};
