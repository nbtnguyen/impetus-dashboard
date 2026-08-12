# Spec: Bổ sung mục 24, 25 vào design-system.html

> **Loại: DOC/SHOWCASE, không phải feature.** Không đụng `index.html`, không đụng DB, không đụng RLS. Chỉ sửa 1 file: `design-system.html`.
> **File này dùng để test lần đầu pipeline Claude Code — cố tình chọn việc rủi ro thấp.**

---

## 0. Bối cảnh — vì sao cần

`DESIGN-SYSTEM.md` (tài liệu luật) đã ghi mục 24 = Bottom Nav, mục 25 = Header Tổng quan & Trang Profile từ bản v1.3, và có ghi chú:

> ⚠️ Sau v1.3 file showcase chưa được cập nhật thêm mục 24/25 — cần bổ sung ở phiên sau.

Đã audit `design-system.html` thật: 2 mục này **chưa tồn tại**. Thay vào đó, số "24" đang bị chiếm nhầm bởi phần "Quy ước code" (nội dung này thực ra là mục 8 riêng trong `DESIGN-SYSTEM.md`, không phải component #24). Cần: chèn đúng 2 mục còn thiếu, và bỏ số "24" sai chỗ đó đi (chuyển thành không đánh số, giống cách "Quy tắc điều hướng" ở cuối file đã làm).

Code thật của 2 component này đã có sẵn, đang chạy production trong `index.html` (đã audit, lấy nguyên văn — xem mục 2 bên dưới).

---

## 1. Mục tiêu & User story

- **Mục tiêu:** `design-system.html` phản ánh đúng 100% component đang chạy thật, để mọi phiên build sau (kể cả Claude Code) tra cứu đúng, không lệch giữa tài liệu và code thật.
- **User story:** Là quản lý (Trung), tôi muốn showcase design system đầy đủ mọi component đang dùng, để giao spec cho Claude Code mà không sợ nó tự chế UI sai chuẩn.

---

## 2. Nội dung cần thêm (code thật, lấy từ `index.html` production — không tự chế)

### 2a. Thêm CSS — chèn vào cuối phần `<style>`, ngay phía trên dòng `</style>`

```css
/* ===== 24 · Bottom Nav ===== */
.bottomnavmock{position:relative; margin:0 auto; width:100%; max-width:400px; height:62px; display:flex;
  background:rgba(255,255,255,.72); backdrop-filter:blur(20px) saturate(180%); -webkit-backdrop-filter:blur(20px) saturate(180%);
  border:1px solid rgba(255,255,255,.6); border-radius:31px;
  box-shadow:0 10px 30px rgba(16,32,55,.16), 0 2px 6px rgba(16,32,55,.08), inset 0 1px 0 rgba(255,255,255,.9)}
.navitem{position:relative; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; color:var(--faint); font-size:11px; font-weight:600; cursor:pointer; border:0; background:transparent; z-index:2}
.navitem i{font-size:23px; line-height:1}
.navitem.active{color:var(--primary)}
.navitem.active::before{content:''; position:absolute; inset:6px 8px; background:rgba(120,120,128,.14); border-radius:var(--r-pill); z-index:-1}

/* ===== 25 · Header Tổng quan & Profile ===== */
.dashhead{display:flex; align-items:center; justify-content:space-between; margin:14px 0 20px}
.dashhead .brandtitle{font-size:var(--text-page); font-weight:700; letter-spacing:-.03em; margin:0}
.dashhead .brandtitle span{color:var(--primary)}
.dashhead .meblock{display:flex; align-items:center; gap:9px; cursor:pointer}
.dashhead .meblock .who{text-align:right; line-height:1.25}
.dashhead .meblock .who .n{font-weight:700; font-size:13.5px; color:var(--ink)}
.dashhead .meblock .who .s{font-size:11.5px; color:var(--faint); font-weight:600}
.dashhead .meblock .av{width:38px; height:38px; border-radius:50%; display:grid; place-items:center; color:#fff; font-weight:700; font-size:15px; flex:none}
.row .ricon{width:36px; height:36px; border-radius:10px; background:var(--primary-soft); color:var(--primary); display:grid; place-items:center; flex:none}
.row .ricon i{font-size:18px}
.row .ricon svg{width:17px; height:17px}
.row.danger .ricon{background:var(--danger-soft); color:var(--danger)}
```

> Ghi chú: `.hero`, `.group`, `.row`, `.section` đã có sẵn trong file (mục 6, 7, 13) — không định nghĩa lại, mục 25 tái dùng nguyên.

### 2b. Thêm 2 khối `<div class="block">` — chèn ngay TRƯỚC khối hiện có `<h2>24 · Quy ước code...</h2>`

```html
<div class="block">
  <h2>24 · Bottom Nav (nổi, iOS 26 "floating capsule")</h2>
  <p class="desc">Thanh điều hướng dạng đảo nổi, cách mép trái/phải/dưới <span class="mono">20px + var(--safe-b)</span>, bo capsule đúng nghĩa (<span class="mono">var(--r-pill)</span>), nền kính mờ (<span class="mono">backdrop-filter: blur(20px) saturate(180%)</span>). Tab đang chọn: viên nền xám trung tính mờ phía sau icon+label — không nhuộm màu primary vào nền, chỉ icon/chữ đổi màu cobalt. Ngoại lệ có chủ đích với nguyên tắc "không đổ bóng" (mục 1.3) — phần tử nổi lơ lửng cần shadow để đọc được độ cao.</p>
  <div class="frame" style="padding:40px 20px">
    <div class="bottomnavmock">
      <button class="navitem active"><i class="hgi-stroke hgi-user-multiple-02"></i>Học sinh</button>
      <button class="navitem"><i class="hgi-stroke hgi-mortarboard-01"></i>Lớp học</button>
      <button class="navitem"><i class="hgi-stroke hgi-wallet-01"></i>Thu chi</button>
    </div>
  </div>
  <p class="mono">Class thật: <span class="mono">.bottomnav</span> (container, <span class="mono">position:fixed</span> khi chạy thật — demo trên dùng <span class="mono">.bottomnavmock</span> để hiện tĩnh trong trang) + <span class="mono">.navitem</span> (từng tab, <span class="mono">.active</span> khi đang chọn).</p>
</div>

<div class="block">
  <h2>25 · Header Tổng quan &amp; Trang Profile</h2>
  <p class="desc">Từ v1.3: bỏ hẳn topbar cũ khỏi toàn app. Chỉ tab Tổng quan có header riêng (<span class="mono">.dashhead</span>): wordmark "Impetus" + avatar/tên góc phải, bấm mở trang Profile (tái dùng khung push-page <span class="mono">#detailPage</span> có sẵn — không tạo trang riêng). 3 tab còn lại không có header, chỉ còn tiêu đề trang như cũ.</p>
  <div class="cap">Header Tổng quan (.dashhead)</div>
  <div class="dashhead" style="margin:0">
    <h1 class="brandtitle">Impe<span>tus</span></h1>
    <div class="meblock"><div class="who"><div class="n">Trung Nguyễn</div><div class="s">Cài đặt</div></div><div class="av" style="background:#2f6fed">T</div></div>
  </div>
  <div class="cap">Trang Profile (mở từ avatar — tái dùng Hero mục 13 + Group/Row mục 6)</div>
  <div class="hero"><div class="avatar lg" style="background:#2f6fed;margin:0 auto">T</div><div class="dname">Trung Nguyễn</div><div style="text-align:center;font-size:13px;color:var(--muted);margin-top:3px">trung@impetus.edu.vn</div><div style="margin-top:11px;text-align:center"><span class="spill" style="color:var(--primary);background:var(--primary-soft)">Quản lý</span></div></div>
  <div class="section">
    <div class="lbl">Tài khoản</div>
    <div class="group">
      <div class="row tap haslead"><div class="lead"><div class="ricon"><i class="hgi-stroke hgi-square-lock-password"></i></div></div><div class="main"><div class="t">Đổi mật khẩu</div></div><i class="hgi-stroke hgi-arrow-right-01 rchev"></i></div>
      <div class="row tap haslead"><div class="lead"><div class="ricon"><i class="hgi-stroke hgi-mortarboard-01"></i></div></div><div class="main"><div class="t">Quản lý tài khoản GV</div></div><i class="hgi-stroke hgi-arrow-right-01 rchev"></i></div>
    </div>
  </div>
  <div class="section">
    <div class="group"><div class="row tap haslead danger"><div class="lead"><div class="ricon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg></div></div><div class="main"><div class="t" style="color:var(--danger)">Đăng xuất</div></div></div></div>
  </div>
  <p class="mono">Class mới: <span class="mono">.dashhead</span> (header) + <span class="mono">.meblock</span> (khối avatar/tên bấm được) + <span class="mono">.ricon</span> (icon vuông dẫn đầu dòng, tái dùng ngôn ngữ hình <span class="mono">.addico</span>). Hero + Group/Row dùng lại nguyên mục 13 &amp; 6, không tạo mới.</p>
</div>
```

### 2c. Bỏ số "24" sai chỗ khỏi heading hiện có

Tìm dòng:
```html
<h2>24 · Quy ước code (bắt buộc khi refactor & làm màn mới)</h2>
```
Đổi thành (bỏ số, giống cách "Quy tắc điều hướng" ở cuối file đã không đánh số — vì đây là quy ước code, không phải component trong danh sách 1-25):
```html
<h2>Quy ước code (bắt buộc khi refactor & làm màn mới)</h2>
```

### 2d. Cập nhật số version ở dòng cuối file (tiện thể, rủi ro thấp)

Tìm: `<p class="doc-sub" ...>Hết · Impetus Design System v1</p>`
Đổi thành: `<p class="doc-sub" ...>Hết · Impetus Design System v1.3</p>`
(khớp với version thật ghi trong `DESIGN-SYSTEM.md`)

---

## 3. Dán vào đâu

- **File duy nhất bị sửa:** `design-system.html` (nằm ở gốc thư mục repo, cạnh `index.html`).
- **Không đụng `index.html`, không đụng bất kỳ file nào trong `api/`.**
- Nếu `design-system.html` chưa được git track (file mới, chưa từng commit) — cứ `git add` bình thường cùng lúc với các sửa đổi trên, không cần commit riêng.

---

## 4. Tiêu chí nghiệm thu

- [x] Mở `design-system.html` bằng trình duyệt (double-click file, hoặc mở trực tiếp) — cuộn tới cuối trang, thấy đúng 2 mục mới: "24 · Bottom Nav..." và "25 · Header Tổng quan & Trang Profile".
- [x] Mục 24: thanh nav nổi hiện đúng dạng viên thuốc bo tròn, có hiệu ứng mờ kính, tab "Học sinh" đang chọn có viên nền xám phía sau + chữ màu cobalt.
- [x] Mục 25: header có chữ "Impetus" (chữ "tus" màu cobalt) bên trái, khối avatar/tên bên phải; phía dưới là demo trang Profile với avatar lớn, tên, email, pill "Quản lý", rồi 2 dòng "Đổi mật khẩu"/"Quản lý tài khoản GV", rồi dòng "Đăng xuất" chữ đỏ.
- [x] Heading "Quy ước code..." không còn số "24 ·" phía trước.
- [x] Không có class CSS nào bị định nghĩa trùng 2 lần trong file (kiểm tra `.navitem`, `.dashhead`, `.ricon` mỗi cái chỉ xuất hiện 1 lần trong `<style>`).
- [x] Dòng cuối file ghi "v1.3" thay vì "v1".

---

## 5. Ngoài phạm vi (KHÔNG làm ở lần này)

- Không sửa `DESIGN-SYSTEM.md` (file đó không nằm trong repo này).
- Không sửa gì trong `index.html` — 2 component này đã sống trong `index.html` rồi, mục đích duy nhất của spec này là chép đúng sang showcase.
- Không thêm animation/tương tác JS cho phần demo — chỉ cần đúng hình ảnh tĩnh.

---

## 6. Handoff (điền SAU KHI build xong)

- **Đã build gì:** Bổ sung đúng 2 mục còn thiếu vào `design-system.html`: mục 24 "Bottom Nav (nổi, iOS 26 floating capsule)" và mục 25 "Header Tổng quan & Trang Profile". Đã dọn số "24" bị chiếm nhầm khỏi heading "Quy ước code" (chuyển sang không đánh số, đồng bộ cách làm với "Quy tắc điều hướng" ở cuối file). Đã cập nhật dòng version cuối file từ v1 → v1.3.
- **Đổi code gì:** (chỉ `design-system.html`)
  - Thêm CSS mới trước `</style>`: `.bottomnavmock`, `.navitem` (+ `.navitem.active`, `.navitem.active::before`), `.dashhead` (+ `.brandtitle`, `.meblock`, `.who`, `.av`), `.row .ricon` (+ `.row.danger .ricon`). Không định nghĩa lại `.hero`/`.group`/`.row`/`.section` — tái dùng nguyên như spec yêu cầu.
  - Chèn 2 khối `<div class="block">` mới (mục 24, mục 25) ngay trước khối `<h2>24 · Quy ước code...</h2>` cũ.
  - Đổi `<h2>24 · Quy ước code...</h2>` → `<h2>Quy ước code...</h2>` (bỏ số).
  - Đổi dòng cuối file `Hết · Impetus Design System v1` → `v1.3`.
  - Ghi chú thêm: file gốc trong thư mục tên là `design-system_1.html` (không khớp tên spec yêu cầu) — đã đổi tên thành `design-system.html` trước khi sửa, sau khi hỏi và được xác nhận.
- **Còn nợ / bước tiếp theo:** Không có — phạm vi spec đã hoàn tất đủ 100%. `DESIGN-SYSTEM.md` (tài liệu luật, nằm ngoài repo này) vẫn cần người quản lý tự xác nhận là đã khớp, vì file đó không nằm trong repo để Claude Code sửa.
- **Gotcha cần nhớ:** Đã kiểm tra bằng cả grep (đếm số lần xuất hiện `.navitem{`, `.dashhead{`, `.row .ricon{` — mỗi class đúng 1 lần) và bằng mắt (mở file trong Browser pane, cuộn qua toàn bộ mục 24/25 + heading "Quy ước code" + dòng version cuối) — khớp 100% với tiêu chí nghiệm thu ở mục 4. Không đụng `index.html` hay bất kỳ file nào trong `api/`.
