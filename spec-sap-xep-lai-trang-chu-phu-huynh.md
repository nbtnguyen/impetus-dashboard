# Spec: Sắp xếp lại Trang chủ Cổng phụ huynh

> **Loại: SỬA UI, không phải feature mới.** Cổng phụ huynh đã build & chạy thật (repo `main`, các hàm `enterParentApp`/`renderParentHome`/`openParentAttendance`/`openParentHocPhi`/`openParentNhanXet`). Spec này chỉ đổi **thứ tự & nội dung hiển thị** trong `renderParentHome()`, theo mockup đã duyệt qua Artifact. **Không đụng DB, không đụng RLS, không đụng hàm nào khác.**

---

## 1. Mục tiêu & User story

- **Mục tiêu:** Sắp xếp lại trang chủ phụ huynh theo đúng thứ tự đã duyệt: chào đúng tên phụ huynh → 3 section rõ ràng "Lớp đang học" / "Hoạt động" (Điểm danh/Nhận xét/Học phí đúng thứ tự mới) / "Liên hệ" xuống cuối.
- **User story:** Là phụ huynh, tôi muốn thấy tên mình ngay khi mở app (không phải dòng "Xin chào" trơ trọi), thấy rõ 3 nhóm nội dung tách bạch (lớp đang học · hoạt động con · liên hệ trung tâm), và thấy Nhận xét trước Học phí (vì quan tâm con học thế nào hơn là tiền) — để không phải dò tìm.

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

### 3b. Section "Lớp đang học" (label tĩnh, không đổi theo tên con)

> **Cập nhật sau khi xem preview thật:** Bản đầu định đổi `.lbl` thành tên con đang chọn (`activeChild.ho_ten`) — đã build và duyệt qua preview, nhưng Trung xem lại và quyết định **giữ label tĩnh "Lớp đang học"** (tên con đã hiện đủ rõ qua segment chọn con phía trên rồi, không cần lặp lại ở `.lbl`). Đồng thời gộp nhóm 3 mục Điểm danh/Nhận xét/Học phí vào 1 `section` có `.lbl` riêng — xem 3c.

**Hiện tại (trước spec này):** section có `.lbl` tĩnh "Lớp đang học", segment chọn con (nếu nhiều con) nằm tách riêng phía trên.

**Đổi thành:** giữ `segHtml` (segment chọn con, nếu `phCon.length>1`) ở nguyên vị trí phía trên — **không đổi**. `.lbl` của section lớp giữ nguyên chữ tĩnh **"Lớp đang học"** (không đổi theo tên con):

```html
<div class="section"><div class="lbl">Lớp đang học</div><div class="group">${classHtml}</div></div>
```

### 3c. Đổi thứ tự 3 mục + gộp vào section "Hoạt động"

**Hiện tại** (Điểm danh, Học phí, Nhận xét — không có `.lbl` bọc ngoài, chỉ 1 `.group` trần):
```html
<div class="group">
  <div class="row tap" id="phRowDiemDanh">...Điểm danh...</div>
  <div class="row tap" id="phRowHocPhi">...Học phí...</div>
  <div class="row tap" id="phRowNhanXet">...Nhận xét...</div>
</div>
```

**Đổi thành** (đổi thứ tự 2 dòng cuối + bọc vào `section` có `.lbl` "Hoạt động" — cập nhật theo yêu cầu xem lại sau preview, để đồng bộ 3 section rõ ràng: Lớp đang học / Hoạt động / Liên hệ):
```html
<div class="section"><div class="lbl">Hoạt động</div><div class="group">
  <div class="row tap" id="phRowDiemDanh">...Điểm danh...</div>
  <div class="row tap" id="phRowNhanXet">...Nhận xét...</div>
  <div class="row tap" id="phRowHocPhi">...Học phí...</div>
</div></div>
```
(3 dòng wiring `onclick` ở cuối hàm — `$('#phRowDiemDanh').onclick=...`, `$('#phRowHocPhi').onclick=...`, `$('#phRowNhanXet').onclick=...` — giữ nguyên, không cần đổi thứ tự vì chọn theo `id`, không theo vị trí DOM)

### 3d. Chuyển "Liên hệ" xuống cuối cùng + đổi label

**Hiện tại:** section "Liên hệ trung tâm" nằm giữa (sau "Lớp đang học", trước group 3 mục).

**Đổi thành:** di chuyển nguyên khối xuống **sau** section "Hoạt động", làm khối cuối cùng của trang. Đổi `.lbl` từ "Liên hệ trung tâm" → **"Liên hệ"** (cập nhật theo yêu cầu xem lại sau preview). Không đổi nội dung bên trong (2 dòng Hotline/Zalo, `PH_CONTACT`):
```html
<div class="section"><div class="lbl">Liên hệ</div><div class="group">
  ...Hotline trung tâm... / ...Nhắn Zalo trung tâm...
</div></div>
```

### Thứ tự cuối cùng của cả trang (từ trên xuống)

1. "Xin chào" + tên phụ huynh
2. Segment chọn con (nếu nhiều con)
3. Section "Lớp đang học" (label tĩnh, không đổi theo tên con)
4. Section "Hoạt động": Điểm danh → Nhận xét → Học phí
5. Section "Liên hệ": Hotline → Zalo

---

## 4. Dán vào đâu

- **Hàm duy nhất bị sửa:** `renderParentHome()` (khối `/* ===== PH Mode (Trang chủ phụ huynh) ===== */`).
- **Không đụng:** `enterParentApp()`, `openParentAttendance()`, `openParentHocPhi()`, `openParentNhanXet()`, `api/ph-dang-ky.js`, `api/ph-dang-nhap.js`, bất kỳ bảng/RLS nào.

---

## 5. Tiêu chí nghiệm thu

- [x] Đăng nhập bằng 1 tài khoản phụ huynh thật — dòng "Xin chào" có tên phụ huynh (lấy từ `profiles.ho_ten`) ngay bên dưới, không phải email.
- [x] Nếu tài khoản đó chưa có `ho_ten` (rơi về email) → tên hiển thị đã cắt bỏ phần `@domain` (qua `displayName()`), không hiện nguyên email.
- [x] Section lớp đang học có label tĩnh "Lớp đang học" (không đổi theo tên con) — bấm chuyển tab (nếu nhiều con) vẫn đổi đúng lớp hiển thị bên dưới, không bị lẫn/giữ lớp con cũ.
- [x] Thứ tự 3 mục đúng: Điểm danh, Nhận xét, Học phí (không phải Điểm danh, Học phí, Nhận xét như cũ), bọc trong section có `.lbl` "Hoạt động".
- [x] Section "Liên hệ" (label rút gọn từ "Liên hệ trung tâm") nằm cuối trang, không còn ở giữa.
- [x] Bấm từng dòng (Điểm danh/Nhận xét/Học phí) vẫn mở đúng màn tương ứng như trước (chức năng không đổi, chỉ đổi vị trí).
- [x] `node --check` sạch.

---

## 6. Ngoài phạm vi (KHÔNG làm ở lần này)

- Không đổi bất kỳ màn con nào (`openParentAttendance`/`openParentHocPhi`/`openParentNhanXet`) — chỉ đổi trang chủ.
- Không đổi logic đăng ký/đăng nhập (`api/ph-dang-ky.js`/`api/ph-dang-nhap.js`).
- Không xử lý 4 hồ sơ phụ huynh có SĐT sai định dạng (việc này Trung tự sửa tay trong Supabase, không phải code).

---

## 7. Handoff (điền SAU KHI build xong)

- **Đã build gì:** Sắp xếp lại `renderParentHome()` trong `index.html` theo mockup đã duyệt, qua 2 vòng:
  - **Vòng 1** (theo spec gốc): thêm dòng tên phụ huynh (`${displayName(me.name)}`) dưới "Xin chào" (3a); đổi `.lbl` thẻ lớp thành tên con đang chọn qua biến `activeChild` (3b bản đầu); đổi thứ tự Điểm danh → Nhận xét → Học phí (3c); chuyển "Liên hệ trung tâm" xuống cuối (3d).
  - **Vòng 2** (Trung xem preview thật, yêu cầu chỉnh lại): bỏ biến `activeChild` (không dùng nữa), trả `.lbl` section lớp về chữ tĩnh **"Lớp đang học"**; bọc group 3 mục vào section riêng có `.lbl` **"Hoạt động"**; đổi `.lbl` section liên hệ từ "Liên hệ trung tâm" → **"Liên hệ"**. Kết quả cuối: đúng 3 section rõ ràng — Lớp đang học / Hoạt động / Liên hệ.
- **Còn nợ / bước tiếp theo:** Không có — phạm vi hoàn tất 100%, không đụng `enterParentApp`/`openParentAttendance`/`openParentHocPhi`/`openParentNhanXet`/`api/ph-dang-ky.js`/`api/ph-dang-nhap.js`. 4 hồ sơ phụ huynh SĐT sai định dạng vẫn để Trung tự sửa tay trong Supabase như spec mục 6 ghi rõ.
- **Gotcha cần nhớ:** Đã kiểm bằng `node --check` trên phần `<script>` trích ra (sạch, cả 2 vòng), và bằng mắt qua harness preview dựng tạm (mock `phCon` 2 con, `me.name` cố tình để dạng email chưa có `ho_ten` để test đúng case #2) — chạy qua local HTTP server trong chính thư mục project vì `file://` ngoài project chỉ render tĩnh (không chạy JS). File preview tạm đã xoá sạch sau mỗi lần test, không còn sót trong repo. Xác nhận cả 3 dòng Điểm danh/Nhận xét/Học phí vẫn gọi đúng hàm tương ứng (`onclick` gán theo `id`, không phụ thuộc vị trí DOM nên đổi thứ tự/bọc thêm `section` không ảnh hưởng wiring) và chuyển tab con vẫn cập nhật đúng lớp, không lẫn dữ liệu cũ.
