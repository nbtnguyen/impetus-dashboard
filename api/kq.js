// ============================================================
//  Link kết quả buổi học gửi phụ huynh · đặt file này tại:  api/kq.js
//  URL sau khi deploy: https://impetus-dashboard.vercel.app/api/kq?t=<token>
//
//  Dùng lại đúng biến môi trường đã có sẵn trên Vercel (không cần thêm gì mới):
//    SUPABASE_SERVICE_ROLE = service_role key của Supabase (BÍ MẬT)
//
//  Route này KHÔNG mở RLS công khai — luôn dùng service_role để tự đọc dữ
//  liệu, kiểm tra token/hạn dùng/thu hồi bằng tay rồi mới render HTML.
//  Không có action ghi nào ở route này (chỉ đọc + render).
// ============================================================

const SUPABASE_URL = 'https://zpaicfpuogmewsulawxx.supabase.co';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDateVN(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const wd = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date(iso + 'T00:00:00+07:00').getUTCDay()];
  return wd + ', ' + d + '/' + m + '/' + y;
}

function pageShell(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Kết quả buổi học · Impetus English</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/inter@latest/400.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/inter@latest/700.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/inter@latest/800.css">
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:'Inter',system-ui,sans-serif;background:#F6F6F6;color:#191c1f;-webkit-font-smoothing:antialiased}
  .wrap{max-width:440px;margin:0 auto;padding:16px 14px 40px}
  .brand{display:flex;align-items:center;gap:10px;padding:6px 4px 16px}
  .brand .logo{width:36px;height:36px;border-radius:11px;background:#494fdf;display:grid;place-items:center;color:#fff;font-weight:800;font-size:16px}
  .brand .n{font-size:15px;font-weight:800;color:#191c1f}
  .brand .n span{color:#494fdf}
  .brand .s{font-size:11px;color:#8d969e}
  .card{background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:12px}
  .lbl{font-size:12px;font-weight:700;color:#8d969e;text-transform:uppercase;letter-spacing:.02em;margin:2px 4px 8px}
  input.search{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:11px 13px;border-radius:12px;border:1px solid #E6E6EA;margin-bottom:14px;background:#fff;outline:0}
  input.search:focus{border-color:#494fdf}
  .field{margin-bottom:10px}
  .field:last-child{margin-bottom:0}
  .field .t{font-size:12.5px;font-weight:700;color:#191c1f;margin-bottom:3px}
  .field .v{font-size:13.5px;color:#505a63;line-height:1.5}
  .scard{background:#fff;border-radius:16px;padding:13px 15px;margin-bottom:10px}
  .scard .head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .scard .ava{width:32px;height:32px;border-radius:50%;color:#fff;display:grid;place-items:center;font-weight:800;font-size:12.5px;flex:none}
  .scard .name{font-size:14px;font-weight:700;color:#191c1f}
  .tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
  .tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}
  .tag.ok{background:#E3F4EC;color:#0E9F6E}
  .tag.warn{background:#FBF0DC;color:#C77700}
  .tag.off{background:#F1F1F1;color:#8d969e}
  .nx{font-size:13.5px;color:#505a63;line-height:1.5}
  .nx.empty{color:#B0B0B0;font-style:italic}
  .foot{text-align:center;font-size:11px;color:#8d969e;margin-top:18px;line-height:1.6}
  .noresult{display:none;text-align:center;padding:24px;color:#8d969e;font-size:13px}
  .state{text-align:center;padding:60px 20px}
  .state .big{font-size:16px;font-weight:700;color:#191c1f;margin-bottom:6px}
  .state .sub{font-size:13.5px;color:#8d969e;line-height:1.6}
</style>
</head>
<body>
<div class="wrap">
<div class="brand"><div class="logo">I</div><div><div class="n">Impetus <span>English</span></div><div class="s">Kết quả buổi học</div></div></div>
${bodyHtml}
</div>
</body>
</html>`;
}

function statePage(title, sub) {
  return pageShell(`<div class="state"><div class="big">${esc(title)}</div><div class="sub">${esc(sub)}</div></div>`);
}

function initial(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}
const AVA_COLORS = ['#494fdf', '#6b81f5', '#0E9F6E', '#C77700', '#D92D20', '#0E7490'];
function avaColor(seed) {
  let h = 0;
  for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVA_COLORS[h % AVA_COLORS.length];
}

const BTVN_LABEL = { hoan_thanh: 'Đã làm BTVN', chua_hoan_thanh: 'Chưa làm BTVN', khong_kiem_tra: 'Buổi này không kiểm tra BTVN' };

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET') {
    res.status(405);
    return res.send(statePage('Không hỗ trợ', 'Yêu cầu không hợp lệ.'));
  }

  const token = (req.query && req.query.t) || '';
  if (!token) {
    res.status(400);
    return res.send(statePage('Link không hợp lệ', 'Thiếu mã truy cập trong đường link.'));
  }

  const SR = process.env.SUPABASE_SERVICE_ROLE;
  if (!SR) {
    res.status(500);
    return res.send(statePage('Có lỗi hệ thống', 'Vui lòng báo lại cho trung tâm.'));
  }
  const isNewKey = SR.startsWith('sb_');
  const srHeaders = isNewKey
    ? { apikey: SR, 'Content-Type': 'application/json' }
    : { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
  const rest = (p) => SUPABASE_URL + '/rest/v1/' + p;

  try {
    const shareRes = await fetch(rest('buoi_hoc_chia_se?token=eq.' + encodeURIComponent(token) + '&select=*'), { headers: srHeaders });
    const shareArr = await shareRes.json();
    const share = Array.isArray(shareArr) ? shareArr[0] : null;

    if (!share) {
      res.status(404);
      return res.send(statePage('Link không hợp lệ', 'Đường link này không tồn tại hoặc đã bị xoá.'));
    }
    if (share.thu_hoi_luc) {
      res.status(410);
      return res.send(statePage('Link đã bị thu hồi', 'Vui lòng liên hệ giáo viên hoặc trung tâm để biết thêm chi tiết.'));
    }
    if (share.het_han && new Date(share.het_han).getTime() <= Date.now()) {
      res.status(410);
      return res.send(statePage('Link đã hết hạn', 'Link kết quả buổi học tự hết hạn sau 30 ngày. Vui lòng liên hệ giáo viên để được hỗ trợ.'));
    }

    const [lopRes, regRes, nxlbRes, dgbRes] = await Promise.all([
      fetch(rest('lop_hoc?id=eq.' + share.lop_hoc_id + '&select=id,ten_lop'), { headers: srHeaders }),
      fetch(rest('dang_ky_lop?lop_hoc_id=eq.' + share.lop_hoc_id + '&select=trang_thai,hoc_sinh(id,ho_ten,ma_hoc_sinh,trang_thai)'), { headers: srHeaders }),
      fetch(rest('nhan_xet_lop_buoi?lop_hoc_id=eq.' + share.lop_hoc_id + '&ngay=eq.' + share.ngay + '&select=*'), { headers: srHeaders }),
      fetch(rest('danh_gia_buoi?lop_hoc_id=eq.' + share.lop_hoc_id + '&ngay=eq.' + share.ngay + '&select=hoc_sinh_id,du_lieu'), { headers: srHeaders })
    ]);
    const [lopArr, regArr, nxlbArr, dgbArr] = await Promise.all([lopRes.json(), regRes.json(), nxlbRes.json(), dgbRes.json()]);

    const lop = Array.isArray(lopArr) ? lopArr[0] : null;
    if (!lop) {
      res.status(404);
      return res.send(statePage('Không tìm thấy lớp', 'Vui lòng liên hệ trung tâm để được hỗ trợ.'));
    }
    const nxlb = Array.isArray(nxlbArr) ? nxlbArr[0] : null;
    const dgbMap = {};
    (Array.isArray(dgbArr) ? dgbArr : []).forEach((e) => { dgbMap[e.hoc_sinh_id] = e.du_lieu || {}; });
    const roster = (Array.isArray(regArr) ? regArr : [])
      .filter((r) => r.hoc_sinh && r.trang_thai !== 'da_nghi' && (r.hoc_sinh.trang_thai === 'dang_hoc' || r.hoc_sinh.trang_thai === 'bao_luu'))
      .map((r) => r.hoc_sinh)
      .sort((a, b) => (a.ho_ten || '').localeCompare(b.ho_ten || '', 'vi'));

    const chungRows = [];
    if (nxlb && nxlb.chuyen_can) chungRows.push(['Chuyên cần', nxlb.chuyen_can]);
    if (nxlb && nxlb.phieu_homework) chungRows.push(['Phiếu Homework', nxlb.phieu_homework]);
    if (nxlb && nxlb.bai_tap_bo_tro) chungRows.push(['Bài tập bổ trợ', nxlb.bai_tap_bo_tro]);
    const chungHtml = chungRows.length
      ? `<div class="lbl">I. Nhận xét chung</div><div class="card">${chungRows.map(([t, v]) => `<div class="field"><div class="t">${esc(t)}</div><div class="v">${esc(v)}</div></div>`).join('')}</div>`
      : '';

    const studentCards = roster.map((s) => {
      const du = dgbMap[s.id] || null;
      const tags = [];
      if (du && du.btvn) tags.push(`<span class="tag ${du.btvn === 'hoan_thanh' ? 'ok' : du.btvn === 'chua_hoan_thanh' ? 'warn' : 'off'}">${esc(BTVN_LABEL[du.btvn] || du.btvn)}</span>`);
      if (du && du.dat_muc_tieu === true) tags.push('<span class="tag ok">Đạt mục tiêu</span>');
      else if (du && du.dat_muc_tieu === false) tags.push('<span class="tag warn">Chưa đạt mục tiêu</span>');
      const nx = du && du.nhan_xet_text ? esc(du.nhan_xet_text) : '';
      return `<div class="scard" data-name="${esc((s.ho_ten || '').toLowerCase())}">
        <div class="head"><div class="ava" style="background:${avaColor(s.ma_hoc_sinh || s.id)}">${esc(initial(s.ho_ten))}</div><div class="name">${esc(s.ho_ten)}</div></div>
        ${tags.length ? `<div class="tags">${tags.join('')}</div>` : ''}
        <div class="nx${nx ? '' : ' empty'}">${nx || 'Chưa cập nhật'}</div>
      </div>`;
    }).join('');

    const body = `
<div class="card"><div style="font-size:17px;font-weight:800">${esc(lop.ten_lop)}</div><div style="font-size:12.5px;color:#8d969e;margin-top:2px">${esc(fmtDateVN(share.ngay))}</div></div>
<input class="search" id="q" placeholder="Tìm tên học sinh...">
${chungHtml}
<div class="lbl">II. Nhận xét từng học sinh</div>
<div id="stulist">${studentCards || '<div class="state"><div class="sub">Chưa có nhận xét học sinh nào.</div></div>'}</div>
<div class="noresult" id="noresult">Không tìm thấy học sinh này</div>
<div class="foot">Link do Impetus English gửi, tự hết hạn sau 30 ngày kể từ ngày tạo.<br>Vui lòng không chia sẻ ra ngoài nhóm phụ huynh của lớp.</div>
<script>
(function(){
  var input=document.getElementById('q');
  var cards=Array.prototype.slice.call(document.querySelectorAll('.scard'));
  var noresult=document.getElementById('noresult');
  if(!input) return;
  input.addEventListener('input',function(){
    var q=input.value.trim().toLowerCase();
    var shown=0;
    cards.forEach(function(c){
      var match=c.getAttribute('data-name').indexOf(q)!==-1;
      c.style.display=match?'':'none';
      if(match)shown++;
    });
    noresult.style.display=(shown===0 && cards.length>0)?'block':'none';
  });
})();
</script>`;

    res.status(200);
    return res.send(pageShell(body));
  } catch (e) {
    res.status(500);
    return res.send(statePage('Có lỗi xảy ra', 'Vui lòng thử lại sau hoặc liên hệ trung tâm.'));
  }
};
