// ============================================================
//  Quản lý tài khoản GV · đặt file này tại:  api/gv-tai-khoan.js
//  URL sau khi deploy: https://impetus-dashboard.vercel.app/api/gv-tai-khoan
//
//  Dùng lại đúng biến môi trường đã có sẵn trên Vercel (không cần thêm gì mới):
//    SUPABASE_SERVICE_ROLE = service_role key của Supabase (BÍ MẬT)
//
//  Route này luôn tự xác thực người gọi bằng access_token trong header
//  Authorization, tra vai_tro thật trong bảng profiles (không tin phía
//  client) — chỉ quan_ly mới thực hiện được 2 hành động: tạo tài khoản
//  đăng nhập cho GV, hoặc đặt lại mật khẩu tạm.
// ============================================================

const SUPABASE_URL = 'https://zpaicfpuogmewsulawxx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYWljZnB1b2dtZXdzdWxhd3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTE4MTIsImV4cCI6MjA5ODM4NzgxMn0.crkUGJuB2eB7NyprRzg2IQaJ_LfrAwi6H7Oct4UQ5i8';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const SR = process.env.SUPABASE_SERVICE_ROLE;
  if (!SR) return res.status(500).json({ success: false, message: 'Thiếu SUPABASE_SERVICE_ROLE' });

  // 1) Đọc dữ liệu
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

  // 2) Xác thực người gọi qua access_token, KHÔNG tin cờ quyền phía client
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

  const isNewKey = SR.startsWith('sb_');
  const srHeaders = isNewKey
    ? { apikey: SR, 'Content-Type': 'application/json' }
    : { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
  const rest = (p) => SUPABASE_URL + '/rest/v1/' + p;

  try {
    const whoRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token }
    });
    if (!whoRes.ok) return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ' });
    const who = await whoRes.json();
    const callerId = who && who.id;
    if (!callerId) return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ' });

    const profRes = await fetch(rest('profiles?id=eq.' + callerId + '&select=vai_tro'), { headers: srHeaders });
    const profArr = await profRes.json();
    const role = Array.isArray(profArr) && profArr[0] && profArr[0].vai_tro;
    if (role !== 'quan_ly') return res.status(403).json({ success: false, message: 'Chỉ quản lý mới thực hiện được' });

    // 3) Tạo tài khoản đăng nhập cho 1 giáo viên đã có trong danh bạ
    if (data.action === 'create') {
      const giao_vien_id = data.giao_vien_id;
      const ho_ten = data.ho_ten || '';
      const email = (data.email || '').trim();
      const password = data.password || '';
      if (!giao_vien_id || !email || !password) {
        return res.status(400).json({ success: false, message: 'Thiếu email hoặc mật khẩu' });
      }

      const existRes = await fetch(rest('profiles?giao_vien_id=eq.' + giao_vien_id + '&select=id'), { headers: srHeaders });
      const existArr = await existRes.json();
      if (Array.isArray(existArr) && existArr.length) {
        return res.status(200).json({ success: false, message: 'Giáo viên này đã có tài khoản' });
      }

      const createRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
        method: 'POST', headers: srHeaders,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { ho_ten } })
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        return res.status(200).json({ success: false, message: created.msg || created.message || 'Không tạo được tài khoản' });
      }
      const newId = created.id;

      // handle_new_user() tạo dòng profiles ngay trong cùng transaction —
      // đợi/thử lại vài lần cho chắc rồi gán vai_tro + giao_vien_id
      let updOk = false;
      for (let i = 0; i < 4 && !updOk; i++) {
        const updRes = await fetch(rest('profiles?id=eq.' + newId), {
          method: 'PATCH',
          headers: Object.assign({ Prefer: 'return=representation' }, srHeaders),
          body: JSON.stringify({ vai_tro: 'giao_vien', giao_vien_id })
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
      return res.status(200).json({ success: true, message: 'Đã tạo tài khoản' });
    }

    // 4) Đặt lại mật khẩu tạm cho 1 tài khoản đã có
    if (data.action === 'reset_password') {
      const profile_id = data.profile_id;
      const password = data.password || '';
      if (!profile_id || !password) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
      }
      const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + profile_id, {
        method: 'PUT', headers: srHeaders,
        body: JSON.stringify({ password })
      });
      if (!r.ok) {
        const e = await r.json();
        return res.status(200).json({ success: false, message: e.msg || e.message || 'Không đặt lại được mật khẩu' });
      }
      return res.status(200).json({ success: true, message: 'Đã đặt lại mật khẩu' });
    }

    return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
  } catch (e) {
    return res.status(500).json({ success: false, message: String((e && e.message) || e) });
  }
};
