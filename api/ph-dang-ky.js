// ============================================================
//  Đăng ký tài khoản Phụ huynh · đặt file này tại:  api/ph-dang-ky.js
//  URL sau khi deploy: https://impetus-dashboard.vercel.app/api/ph-dang-ky
//
//  Dùng lại đúng biến môi trường đã có sẵn trên Vercel (không cần thêm gì mới):
//    SUPABASE_SERVICE_ROLE = service_role key của Supabase (BÍ MẬT)
//
//  Route này là ĐIỂM VÀO CÔNG KHAI (không cần đăng nhập trước) — vì mục
//  đích chính là để phụ huynh TỰ tạo tài khoản. Xác thực danh tính bằng
//  cách khớp số điện thoại đã nhập với bảng `phu_huynh` (do quản lý nhập
//  sẵn khi tạo hồ sơ học sinh). Nếu khớp được ít nhất 1 dòng còn trống
//  `auth_user_id` → tạo tài khoản Auth mới, set email_confirm:true luôn
//  (bỏ qua bước xác nhận email của Supabase vì đã xác thực qua SĐT rồi),
//  gán vai_tro='phu_huynh' vào profiles, rồi gán auth_user_id vào MỌI
//  dòng phu_huynh khớp SĐT đó (xử lý ca 2 con dùng chung SĐT bố/mẹ).
// ============================================================

const SUPABASE_URL = 'https://zpaicfpuogmewsulawxx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYWljZnB1b2dtZXdzdWxhd3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTE4MTIsImV4cCI6MjA5ODM4NzgxMn0.crkUGJuB2eB7NyprRzg2IQaJ_LfrAwi6H7Oct4UQ5i8';

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
  const email = String(data.email || '').trim();
  const password = String(data.password || '');
  if (!phone || phone.length !== 10 || !email || !password) {
    return res.status(400).json({ success: false, message: 'Thiếu hoặc sai định dạng số điện thoại / email / mật khẩu' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu tối thiểu 6 ký tự' });
  }

  const isNewKey = SR.startsWith('sb_');
  const srHeaders = isNewKey
    ? { apikey: SR, 'Content-Type': 'application/json' }
    : { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
  const rest = (p) => SUPABASE_URL + '/rest/v1/' + p;

  try {
    // 1) Tìm các dòng phu_huynh khớp SĐT
    const matchRes = await fetch(rest('phu_huynh?so_dien_thoai=eq.' + encodeURIComponent(phone) + '&select=id,ho_ten,hoc_sinh_id,auth_user_id'), { headers: srHeaders });
    const matches = await matchRes.json();
    if (!Array.isArray(matches) || !matches.length) {
      return res.status(200).json({ success: false, message: 'Không tìm thấy thông tin, liên hệ trung tâm để được hỗ trợ.' });
    }
    if (matches.some((m) => m.auth_user_id)) {
      return res.status(200).json({ success: false, message: 'Số điện thoại này đã có tài khoản, hãy đăng nhập.' });
    }

    // 2) Tạo tài khoản Auth — bỏ qua xác nhận email vì đã xác thực qua SĐT
    const createRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
      method: 'POST', headers: srHeaders,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { ho_ten: matches[0].ho_ten } })
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      return res.status(200).json({ success: false, message: created.msg || created.message || 'Không tạo được tài khoản' });
    }
    const newId = created.id;

    // 3) handle_new_user() đã tự tạo dòng profiles — đợi/thử lại rồi gán vai_tro
    let updOk = false;
    for (let i = 0; i < 4 && !updOk; i++) {
      const updRes = await fetch(rest('profiles?id=eq.' + newId), {
        method: 'PATCH',
        headers: Object.assign({ Prefer: 'return=representation' }, srHeaders),
        body: JSON.stringify({ vai_tro: 'phu_huynh', ho_ten: matches[0].ho_ten })
      });
      if (updRes.ok) {
        const arr = await updRes.json();
        if (Array.isArray(arr) && arr.length) { updOk = true; break; }
      }
      await new Promise((r) => setTimeout(r, 350));
    }
    if (!updOk) {
      return res.status(200).json({ success: false, message: 'Đã tạo tài khoản Auth nhưng gán quyền thất bại — báo lại để xử lý tay' });
    }

    // 4) Gán auth_user_id vào MỌI dòng phu_huynh khớp SĐT (ca nhiều con chung SĐT)
    const linkRes = await fetch(rest('phu_huynh?so_dien_thoai=eq.' + encodeURIComponent(phone) + '&auth_user_id=is.null'), {
      method: 'PATCH', headers: srHeaders,
      body: JSON.stringify({ auth_user_id: newId })
    });
    if (!linkRes.ok) {
      return res.status(200).json({ success: false, message: 'Đã tạo tài khoản nhưng liên kết học sinh thất bại — báo lại để xử lý tay' });
    }

    return res.status(200).json({ success: true, message: 'Đã tạo tài khoản' });
  } catch (e) {
    return res.status(500).json({ success: false, message: String((e && e.message) || e) });
  }
};
