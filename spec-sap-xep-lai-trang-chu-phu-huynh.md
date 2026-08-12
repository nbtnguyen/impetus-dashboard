# Spec: Sắp xếp lại Trang chủ Cổng phụ huynh

> **Loại: SỬA UI, không phải feature mới.** Cổng phụ huynh đã build & chạy thật (repo `main`, các hàm `enterParentApp`/`renderParentHome`/`openParentAttendance`/`openParentHocPhi`/`openParentNhanXet`). Spec này chỉ đổi **thứ tự & nội dung hiển thị** trong `renderParentHome()`, theo mockup đã duyệt qua Artifact. **Không đụng DB, không đụng RLS, không đụng hàm nào khác.**

---

## 1. Mục tiêu & User story

- **Mục tiêu:** Sắp xếp lại trang chủ phụ huynh theo đúng thứ tự đã duyệt: chào đúng tên phụ huynh → thẻ tên con gộp với lớp đang học → 3 mục Điểm danh/Nhận xét/Học phí đúng thứ tự mới → Liên hệ trung tâm xuống cuối.
- **User story:** Là phụ huynh, tôi muốn thấy tên mình ngay khi mở app (không phải dòng "Xin chào" trơ trọi), thấy ngay tên con đang xem gắn liền với lớp đang học, và thấy Nhận xét trước Học phí (vì quan tâm con học thế nào hơn là tiền) — để không phải dò tìm.

---

## 2. DB schema

**Không đụng.** Không có migration nào trong spec này.

---

## 3. Thay đổi cụ thể trong `renderParentHome()`

### 3a. Header — thêm tên phụ huynh dưới "Xin chào"

**Hiện tại:**
```html
<div style="padding:20px 16px 4px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-size:22px;font-weight:800">Xin chào</div>
  <button class="iconbtn" id="phLogout" title="Đăng xuất">...</button>
</div>
```

**Đổi thành** (bọc "Xin chào" + tên vào 1 div, tên lấy từ `me.name` qua `displayName()` — hàm này đã có sẵn trong file, tự cắt `@domain` nếu tên rơi về email):
```html
<div style="padding:20px 16px 4px;display:flex;justify-content:space-between;align-items:center">
  <div>
    <div style="font-size:22px;font-weight:800">Xin chào</div>
    <div style="font-size:14px;color:var(--muted);font-weight:600;margin-top:2px">${displayName(me.name)}</div>
  </div>
  <button class="iconbtn" id="phLogout" title="Đăng xuất">...</button>
</div>
```
(giữ nguyên SVG bên trong nút `#phLogout`, không đổi)

### 3b. Gộp thẻ tên con + lớp đang học

**Hiện tại:** section có `.lbl` tĩnh "Lớp đang học", segment chọn con (nếu nhiều con) nằm tách riêng phía trên.

**Đổi thành:** giữ `segHtml` (segment chọn con, nếu `phCon.length>1`) ở nguyên vị trí phía trên — **không đổi**. Chỉ đổi `.lbl` từ chữ tĩnh "Lớp đang học" sang **tên con đang chọn**:

```js
const activeChild = phCon.find(c=>c.id===phActiveId);
```
```html
<div class="section"><div class="lbl">${activeChild ? activeChild.ho_ten : 'Lớp đang học'}</div><div class="group">${classHtml}</div></div>
```

### 3c. Đổi thứ tự 3 mục — Điểm danh → Nhận xét → Học phí

**Hiện tại** (Điểm danh, Học phí, Nhận xét):
```html
<div class="group">
  <div class="row tap" id="phRowDiemDanh">...Điểm danh...</div>
  <div class="row tap" id="phRowHocPhi">...Học phí...</div>
  <div class="row tap" id="phRowNhanXet">...Nhận xét...</div>
</div>
```

**Đổi thành** (chỉ đổi thứ tự 2 dòng cuối, giữ nguyên nội dung từng dòng — không đổi text/icon):
```html
<div class="group">
  <div class="row tap" id="phRowDiemDanh">...Điểm danh...</div>
  <div class="row tap" id="phRowNhanXet">...Nhận xét...</div>
  <div class="row tap" id="phRowHocPhi">...Học phí...</div>
</div>
```
(3 dòng wiring `onclick` ở cuối hàm — `$('#phRowDiemDanh').onclick=...`, `$('#phRowHocPhi').onclick=...`, `$('#phRowNhanXet').onclick=...` — giữ nguyên, không cần đổi thứ tự vì chọn theo `id`, không theo vị trí DOM)

### 3d. Chuyển "Liên hệ trung tâm" xuống cuối cùng

**Hiện tại:** section "Liên hệ trung tâm" nằm giữa (sau "Lớp đang học", trước group 3 mục).

**Đổi thành:** di chuyển nguyên khối `<div class="section"><div class="lbl">Liên hệ trung tâm</div>...</div>` xuống **sau** group 3 mục (Điểm danh/Nhận xét/Học phí), làm khối cuối cùng của trang. Không đổi nội dung bên trong (2 dòng Hotline/Zalo, `PH_CONTACT`).

### Thứ tự cuối cùng của cả trang (từ trên xuống)

1. "Xin chào" + tên phụ huynh
2. Segment chọn con (nếu nhiều con)
3. Thẻ tên con + lớp đang học (gộp)
4. Group 3 mục: Điểm danh → Nhận xét → Học phí
5. Liên hệ trung tâm

---

## 4. Dán vào đâu

- **Hàm duy nhất bị sửa:** `renderParentHome()` (khối `/* ===== PH Mode (Trang chủ phụ huynh) ===== */`).
- **Không đụng:** `enterParentApp()`, `openParentAttendance()`, `openParentHocPhi()`, `openParentNhanXet()`, `api/ph-dang-ky.js`, `api/ph-dang-nhap.js`, bất kỳ bảng/RLS nào.

---

## 5. Tiêu chí nghiệm thu

- [x] Đăng nhập bằng 1 tài khoản phụ huynh thật — dòng "Xin chào" có tên phụ huynh (lấy từ `profiles.ho_ten`) ngay bên dưới, không phải email.
- [x] Nếu tài khoản đó chưa có `ho_ten` (rơi về email) → tên hiển thị đã cắt bỏ phần `@domain` (qua `displayName()`), không hiện nguyên email.
- [x] Tiêu đề thẻ lớp đang học đúng bằng tên con đang chọn — bấm chuyển tab (nếu nhiều con) đổi đúng tên, không bị lẫn/giữ tên con cũ.
- [x] Thứ tự 3 mục đúng: Điểm danh, Nhận xét, Học phí (không phải Điểm danh, Học phí, Nhận xét như cũ).
- [x] "Liên hệ trung tâm" nằm cuối trang, không còn ở giữa.
- [x] Bấm từng dòng (Điểm danh/Nhận xét/Học phí) vẫn mở đúng màn tương ứng như trước (chức năng không đổi, chỉ đổi vị trí).
- [x] `node --check` sạch.

---

## 6. Ngoài phạm vi (KHÔNG làm ở lần này)

- Không đổi bất kỳ màn con nào (`openParentAttendance`/`openParentHocPhi`/`openParentNhanXet`) — chỉ đổi trang chủ.
- Không đổi logic đăng ký/đăng nhập (`api/ph-dang-ky.js`/`api/ph-dang-nhap.js`).
- Không xử lý 4 hồ sơ phụ huynh có SĐT sai định dạng (việc này Trung tự sửa tay trong Supabase, không phải code).

---

## 7. Handoff (điền SAU KHI build xong)

- **Đã build gì:** Sắp xếp lại `renderParentHome()` trong `index.html` đúng theo mockup đã duyệt: (3a) thêm dòng tên phụ huynh (`${displayName(me.name)}`) dưới "Xin chào"; (3b) thêm biến `activeChild` và đổi `.lbl` của thẻ lớp từ chữ tĩnh "Lớp đang học" sang tên con đang chọn; (3c) đổi thứ tự 2 dòng cuối trong group 3 mục thành Điểm danh → Nhận xét → Học phí; (3d) chuyển khối "Liên hệ trung tâm" xuống cuối trang, sau group 3 mục. Thứ tự cuối cùng khớp đúng mục 3 của spec (Xin chào+tên → segment con → thẻ tên con/lớp → 3 mục → Liên hệ trung tâm).
- **Còn nợ / bước tiếp theo:** Không có — phạm vi spec hoàn tất 100%, không đụng `enterParentApp`/`openParentAttendance`/`openParentHocPhi`/`openParentNhanXet`/`api/ph-dang-ky.js`/`api/ph-dang-nhap.js`. 4 hồ sơ phụ huynh SĐT sai định dạng vẫn để Trung tự sửa tay trong Supabase như spec mục 6 ghi rõ.
- **Gotcha cần nhớ:** Đã kiểm bằng `node --check` trên phần `<script>` trích ra (sạch), và bằng mắt qua 1 harness preview dựng tạm (mock `phCon` 2 con, `me.name` cố tình để dạng email chưa có `ho_ten` để test đúng case #2) — chạy qua local HTTP server trong chính thư mục project vì `file://` ngoài project chỉ render tĩnh (không chạy JS). File preview tạm đã xoá sạch sau khi test, không còn sót trong repo. Xác nhận cả 3 dòng Điểm danh/Nhận xét/Học phí vẫn gọi đúng hàm tương ứng (`onclick` gán theo `id`, không phụ thuộc vị trí DOM nên đổi thứ tự HTML không ảnh hưởng wiring) và chuyển tab con không bị lẫn tên cũ.
