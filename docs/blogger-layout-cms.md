# Blogger Layout as CMS

Mục tiêu: người vận hành chỉnh các nội dung thường xuyên từ **Blogger → Bố cục** thay vì sửa trực tiếp XML.

## Header CMS — giai đoạn 1

Theme hiện cung cấp hai widget native:

### 1. Logo Fusumi
- Section: `header-logo`
- Widget: `Image1`
- Loại: **Image**
- Tên trong Layout: **Logo Fusumi**

Cách dùng:
1. Vào **Blogger → Bố cục**.
2. Mở widget **Logo Fusumi**.
3. Upload logo chính thức hoặc chọn ảnh phù hợp.
4. Lưu widget và kiểm tra desktop/mobile.

Nếu widget chưa có ảnh, theme tự fallback về mark `F` + chữ `Fusumi Careers` để tránh mất header.

### 2. Menu chính
- Section: `header-menu`
- Widget: `LinkList1`
- Loại: **Link List**
- Tên trong Layout: **Menu chính**

Cách dùng:
1. Vào **Blogger → Bố cục**.
2. Mở widget **Menu chính**.
3. Thêm/sắp xếp các liên kết cần hiển thị.
4. Lưu và kiểm tra navigation.

Menu mặc định khi widget chưa được cấu hình:
- Trang chủ
- Việc làm
- Về Fusumi
- Quy trình
- Ứng tuyển

## Nguyên tắc triển khai tiếp theo

Các nội dung tĩnh sẽ được widget hóa từng PR nhỏ: Hero → CTA → Footer/Contact. Phần job rendering, filter, responsive, SEO và JobPosting vẫn do theme quản lý để tránh làm người vận hành phải chỉnh code.

Sau mỗi PR:
1. CI `validate-theme` phải pass.
2. Import XML lên Blogger thật.
3. Kiểm tra Layout editor.
4. Kiểm tra homepage/search/Page/Post.
5. Chạy Live Smoke Test.
