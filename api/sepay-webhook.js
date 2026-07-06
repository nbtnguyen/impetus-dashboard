// ============================================================
//  SePay webhook  ·  đặt file này tại:  api/sepay-webhook.js
//  URL sau khi deploy: https://impetus-dashboard.vercel.app/api/sepay-webhook
//
//  Cần 2 biến môi trường trên Vercel (Settings → Environment Variables):
//    SUPABASE_SERVICE_ROLE   = service_role key của Supabase (BÍ MẬT)
//    SEPAY_WEBHOOK_APIKEY    = một chuỗi bí mật anh tự đặt, dùng lại y hệt bên SePay
//  Đặt xong nhớ Redeploy để biến môi trường có hiệu lực.
// ============================================================

const SUPABASE_URL = 'https://zpaicfpuogmewsulawxx.supabase.co';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // 1) Xác thực: SePay gửi header  Authorization: Apikey <key>
  const secret = process.env.SEPAY_WEBHOOK_APIKEY || '';
  const auth = req.headers['authorization'] || '';
  if (!secret || auth !== ('Apikey ' + secret)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const SR = process.env.SUPABASE_SERVICE_ROLE;
  if (!SR) return res.status(500).json({ success: false, message: 'Thiếu SUPABASE_SERVICE_ROLE' });

  // 2) Đọc dữ liệu
  let data = req.body;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = null; } }
  if (data === undefined || data === null) {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (e) { data = null; }
  }
  if (!data || typeof data !== 'object') {
    return res.status(200).json({ success: false, message: 'No data' });
  }

  // Chỉ xử lý tiền VÀO
  if (data.transferType && data.transferType !== 'in') {
    return res.status(200).json({ success: true, message: 'Bỏ qua (không phải tiền vào)' });
  }

  const sepayId = String(data.id);
  const amount = Math.round(Number(data.transferAmount) || 0);
  const content = String(data.content || data.description || '');
  const normContent = content.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Key mới (sb_secret_...) chỉ dùng header apikey; key cũ (JWT service_role) cần thêm Authorization Bearer
  const isNewKey = SR.startsWith('sb_');
  const headers = isNewKey
    ? { apikey: SR, 'Content-Type': 'application/json' }
    : { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
  const minimal = Object.assign({ Prefer: 'return=minimal' }, headers);
  const rest = (p) => SUPABASE_URL + '/rest/v1/' + p;

  try {
    // 3) Chống trùng theo id giao dịch SePay
    const inTT = await (await fetch(rest('thanh_toan?sepay_transaction_id=eq.' + encodeURIComponent(sepayId) + '&select=id'), { headers })).json();
    if (Array.isArray(inTT) && inTT.length) return res.status(200).json({ success: true, message: 'Đã xử lý trước đó' });
    const inGD = await (await fetch(rest('giao_dich_chua_khop?sepay_transaction_id=eq.' + encodeURIComponent(sepayId) + '&select=id'), { headers })).json();
    if (Array.isArray(inGD) && inGD.length) return res.status(200).json({ success: true, message: 'Đã nằm trong chưa khớp' });

    // 4) Tìm phiếu đang chờ, khớp mã nội dung CK nằm trong nội dung giao dịch
    const pend = await (await fetch(rest('thanh_toan?trang_thai=eq.cho_thanh_toan&select=id,noi_dung_ck,so_tien'), { headers })).json();
    let matched = null;
    if (Array.isArray(pend)) {
      for (const p of pend) {
        if (!p.noi_dung_ck) continue;
        const code = String(p.noi_dung_ck).toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (code && normContent.includes(code)) { matched = p; break; }
      }
    }

    // 5) Khớp mã + đúng số tiền → ghi ĐÃ THU
    if (matched && Math.round(Number(matched.so_tien)) === amount) {
      await fetch(rest('thanh_toan?id=eq.' + matched.id), {
        method: 'PATCH', headers: minimal,
        body: JSON.stringify({ trang_thai: 'da_thu', sepay_transaction_id: sepayId, ngay_thanh_toan: new Date().toISOString() })
      });
      // ghi vào dòng tiền (Thu chi)
      await fetch(rest('thu_chi'), {
        method: 'POST', headers: minimal,
        body: JSON.stringify({ loai: 'thu', danh_muc: 'Học phí', so_tien: amount, ngay: new Date().toISOString().slice(0, 10), ghi_chu: 'SePay · ' + (matched.noi_dung_ck || '') })
      });
      return res.status(200).json({ success: true, message: 'Khớp & đã thu' });
    }

    // 6) Không khớp (sai mã hoặc lệch tiền) → đẩy vào CHƯA KHỚP để xử lý tay
    await fetch(rest('giao_dich_chua_khop'), {
      method: 'POST', headers: minimal,
      body: JSON.stringify({ sepay_transaction_id: sepayId, so_tien: amount, noi_dung_ck: content, ngay_giao_dich: new Date().toISOString(), trang_thai: 'cho_xu_ly' })
    });
    return res.status(200).json({ success: true, message: 'Đưa vào chưa khớp' });

  } catch (e) {
    return res.status(500).json({ success: false, message: String((e && e.message) || e) });
  }
};
