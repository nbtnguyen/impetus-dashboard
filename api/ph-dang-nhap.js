// ============================================================
//  Đăng nhập bằng số điện thoại · đặt file này tại:  api/ph-dang-nhap.js
//  URL sau khi deploy: https://impetus-dashboard.vercel.app/api/ph-dang-nhap
//
//  Dùng lại đúng biến môi trường đã có sẵn trên Vercel:
//    SUPABASE_SERVICE_ROLE = service_role key của Supabase (BÍ MẬT)
//
//  Route CÔNG KHAI — vì phụ huynh chưa đăng nhập được lúc gọi route này.
//  Đăng nhập Supabase Auth chuẩn chỉ nhận email, còn phụ huynh chỉ nhớ
//  SĐT. Route này tra SĐT → auth_user_id (bảng phu_huynh) → email (Admin
//  API) → đổi email+password lấy access_token/refresh_token qua chính
//  API auth chuẩn của Supabase, rồi trả token về cho client tự
//  setSession(). Email KHÔNG bao giờ trả về phía client — tránh lộ email
//  của người khác nếu ai đó dò số điện thoại ngẫu nhiên.
//  Nếu số điện thoại không khớp HOẶC sai mật khẩu → trả về CÙNG MỘT
//  thông báo lỗi, không phân biệt, để tránh dò xem SĐT nào đã có tài khoản.
// ============================================================

const SUPABASE_URL = 'https://zpaicfpuogmewsulawxx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYWljZnB1b2dtZXdzdWxhd3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTE4MTIsImV4cCI6MjA5ODM4NzgxMn0.crkUGJuB2eB7NyprRzg2IQaJ_LfrAwi6H7Oct4UQ5i8';
const GENERIC_ERR = 'Sai số điện thoại hoặc mật khẩu.';

function normPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('84')) d = '0' + d.slice(2);
  if (d.length === 9 && !d.startsWith('0')) d = '0' + d;
  return d;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const SR = process.env.SUPABASE_SERVICE_ROLE;
  if (!SR) return res.status(500).json({ success: false, message: 'Thiếu SUPABASE_SERVICE_ROLE' });

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
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });
  }

  const phone = normPhone(data.so_dien_thoai);
  const password = String(data.password || '');
  if (!phone || phone.length !== 10 || !password) {
    return res.status(400).json({ success: false, message: 'Thiếu số điện thoại hoặc mật khẩu' });
  }

  const isNewKey = SR.startsWith('sb_');
  const srHeaders = isNewKey
    ? { apikey: SR, 'Content-Type': 'application/json' }
    : { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
  const rest = (p) => SUPABASE_URL + '/rest/v1/' + p;

  try {
    // 1) SĐT -> auth_user_id đã liên kết (bảng phu_huynh)
    const matchRes = await fetch(rest('phu_huynh?so_dien_thoai=eq.' + encodeURIComponent(phone) + '&auth_user_id=not.is.null&select=auth_user_id&limit=1'), { headers: srHeaders });
    const matches = await matchRes.json();
    if (!Array.isArray(matches) || !matches.length) {
      return res.status(200).json({ success: false, message: GENERIC_ERR });
    }
    const userId = matches[0].auth_user_id;

    // 2) auth_user_id -> email (Admin API, không lộ ra ngoài)
    const userRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + userId, { headers: srHeaders });
    const user = await userRes.json();
    const email = user && user.email;
    if (!email) {
      return res.status(200).json({ success: false, message: GENERIC_ERR });
    }

    // 3) Đổi email+password lấy token qua đúng API auth chuẩn
    const tokenRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok || !tok.access_token) {
      return res.status(200).json({ success: false, message: GENERIC_ERR });
    }

    return res.status(200).json({ success: true, access_token: tok.access_token, refresh_token: tok.refresh_token });
  } catch (e) {
    return res.status(500).json({ success: false, message: String((e && e.message) || e) });
  }
};
