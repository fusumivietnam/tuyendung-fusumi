# Hướng dẫn triển khai Fusumi Careers trên Blogger

## 1. Tạo Blog
- Tạo một Blogger site mới, tên gợi ý `Fusumi Careers`.
- Có thể dùng địa chỉ Blogspot tạm thời trong giai đoạn thử nghiệm.
- Khi ổn định, trỏ subdomain như `tuyendung.fusumi.vn`.

## 2. Cài theme
1. Vào **Theme / Chủ đề**.
2. Sao lưu theme hiện tại.
3. Chọn **Edit HTML / Chỉnh sửa HTML**.
4. Dán toàn bộ nội dung `blogger/fusumi-careers-theme.xml`.
5. Lưu và kiểm tra trang chủ, trang chi tiết bài viết và `/search`.

## 3. Tạo các Page cố định
Theme đang liên kết tới:
- `/p/ve-fusumi.html`
- `/p/quy-trinh-tuyen-dung.html`
- `/p/ung-tuyen.html`

Nếu Blogger tạo slug khác, sửa đường dẫn tương ứng trong theme.

## 4. Quy ước Labels để bộ lọc hoạt động
Mỗi job phải có tối thiểu ba label theo đúng tiền tố:

- `PB: <Phòng ban>` — ví dụ `PB: Kinh doanh`
- `ĐĐ: <Địa điểm>` — ví dụ `ĐĐ: Hà Nội`
- `HT: <Hình thức>` — ví dụ `HT: Full-time`

Theme đọc các label này và tự tạo ba dropdown bộ lọc. Phần tiền tố sẽ được ẩn khi hiển thị chip trên card job.

## 5. Trang ứng tuyển
Phương án tiết kiệm nhất là Google Form + Google Sheets.

Các trường nên có:
- Họ và tên
- Số điện thoại
- Email
- Vị trí ứng tuyển
- Link CV hoặc upload CV
- Ghi chú / thư giới thiệu ngắn

Nhúng form vào Page `Ứng tuyển` bằng iframe do Google Forms cung cấp.

## 6. SEO hiện có trong theme
- `lang="vi"`.
- Meta description cho homepage.
- Open Graph title/type/url cơ bản.
- `noindex,follow` cho trang tìm kiếm.
- Microdata `Schema.org/JobPosting` trên trang chi tiết job.

Lưu ý: để đủ điều kiện tốt hơn cho Google job rich results, cần bổ sung dữ liệu thực tế như địa điểm làm việc, ngày đăng/hạn nộp, loại hợp đồng và mức lương khi dữ liệu doanh nghiệp đã được chốt.

## 7. Kiểm thử trước khi public
- Desktop, tablet, mobile.
- Search bằng từ khóa tiếng Việt.
- Lọc theo phòng ban, địa điểm, hình thức.
- Job không khớp hiển thị trạng thái rỗng.
- Link `Ứng tuyển` hoạt động.
- Các Page cố định không 404.
- Kiểm tra source HTML xem meta/Schema đã render.
- Kiểm tra Lighthouse và Rich Results Test sau khi site public.

## 8. Thông tin cần thay trước khi chạy thật
- Logo chính thức Fusumi.
- Màu nhận diện chính thức nếu khác theme hiện tại.
- Email tuyển dụng.
- Hotline tuyển dụng.
- Nội dung About / Culture.
- Google Form thật.
- Domain chính thức.
- Địa chỉ pháp lý / địa điểm làm việc dùng cho JobPosting schema.
