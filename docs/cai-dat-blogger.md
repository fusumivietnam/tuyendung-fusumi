# Hướng dẫn cài theme tuyển dụng Fusumi trên Blogger

## 1. Tạo Blog
- Vào Blogger và tạo blog mới.
- Đặt tên gợi ý: `Fusumi Careers`.
- Có thể dùng địa chỉ tạm `fusumi-careers.blogspot.com`.
- Sau này trỏ domain riêng như `tuyendung.fusumi.vn`.

## 2. Cài theme
1. Vào **Chủ đề / Theme**.
2. Sao lưu theme hiện tại trước khi thay.
3. Chọn **Chỉnh sửa HTML / Edit HTML**.
4. Xóa nội dung cũ và dán toàn bộ file `blogger/fusumi-careers-theme.xml`.
5. Lưu lại.

## 3. Tạo các Page cố định
Tạo các trang với đúng slug hoặc điều chỉnh link trong theme:
- `/p/ve-fusumi.html`
- `/p/quy-trinh-tuyen-dung.html`
- `/p/ung-tuyen.html`

## 4. Trang ứng tuyển
Phương án tiết kiệm nhất:
- Tạo Google Form.
- Các trường nên có: Họ tên, SĐT, Email, vị trí ứng tuyển, link CV hoặc upload CV.
- Chọn Google Sheets làm nơi lưu phản hồi.
- Nhúng Google Form vào Page `Ứng tuyển`.

Ví dụ iframe:
```html
<iframe src="LINK_GOOGLE_FORM" width="100%" height="1100" frameborder="0">Đang tải…</iframe>
```

## 5. Đăng một vị trí tuyển dụng
Mỗi job = 1 bài đăng Blogger.

- Tiêu đề: `Nhân viên Kinh doanh`
- Nội dung: dùng file `templates/mau-tin-tuyen-dung.md`
- Label: phòng ban + địa điểm + loại công việc.

Ví dụ:
- `Kinh doanh`
- `Hà Nội`
- `Full-time`

Theme sẽ tự lấy bài đăng mới để hiển thị trên trang chủ.

## 6. Việc cần thay trước khi chạy thật
- Logo Fusumi.
- Màu nhận diện nếu khác màu xanh mặc định.
- Email tuyển dụng.
- Hotline.
- Nội dung “Về Fusumi”.
- Google Form chính thức.
- Domain công ty.

## 7. Nâng cấp khuyến nghị
Sau MVP có thể bổ sung:
- Bộ lọc theo phòng ban / địa điểm.
- JobPosting Schema cho Google Jobs.
- Google Analytics / Search Console.
- Meta Pixel nếu cần chạy tuyển dụng qua Facebook.
- Zalo/Chat.
- Trang cảm ơn sau khi ứng tuyển.
- Tự động gửi email xác nhận hồ sơ.
