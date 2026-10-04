# Tuyển dụng Fusumi

Source cho trang tuyển dụng Fusumi triển khai trên **Blogger / Blogspot**, ưu tiên chi phí thấp, dễ vận hành và để HR đăng vị trí mới bằng Blogger Post mà không cần sửa code.

## Cấu trúc repo

```text
blogger/
  fusumi-careers-theme.xml      Theme Blogger chính

docs/
  cai-dat-blogger.md            Hướng dẫn cài đặt và cấu hình

templates/
  mau-tin-tuyen-dung.md         Mẫu nội dung job cho HR
```

## Tính năng hiện tại

- Landing page Fusumi Careers responsive.
- Danh sách job tự lấy từ Blogger Posts.
- Tìm kiếm client-side theo tên và nội dung hiển thị.
- Bộ lọc tự sinh theo Blogger Labels: phòng ban, địa điểm, hình thức.
- Trạng thái số lượng kết quả và empty state.
- Trang chi tiết tuyển dụng + CTA ứng tuyển.
- SEO metadata và Open Graph cơ bản.
- `noindex,follow` cho trang tìm kiếm.
- Schema.org `JobPosting` dạng microdata ở trang job.
- Có thể nhúng Google Form để nhận CV và lưu vào Google Sheets.

## Quy ước Labels

Mỗi tin tuyển dụng nên có đủ:

- `PB: Kinh doanh`
- `ĐĐ: Hà Nội`
- `HT: Full-time`

Các dropdown trên homepage được tạo tự động từ ba nhóm label này.

## Cài nhanh

1. Tạo Blogger site.
2. Mở **Theme → Edit HTML**.
3. Dán `blogger/fusumi-careers-theme.xml`.
4. Tạo các Page: `Về Fusumi`, `Quy trình tuyển dụng`, `Ứng tuyển`.
5. Tạo Google Form và nhúng vào Page ứng tuyển.
6. Đăng mỗi vị trí bằng một Blogger Post theo mẫu trong `templates/`.

Chi tiết xem `docs/cai-dat-blogger.md`.

## Trạng thái production

Theme đã có nền tảng production nhưng vẫn cần kiểm thử trực tiếp trên một Blogger site trước khi public. Các dữ liệu doanh nghiệp chưa được cung cấp (logo, màu brand chính thức, hotline, email HR, địa chỉ làm việc, form thật) đang để ở dạng placeholder hoặc cấu hình chung.

## Roadmap

- [x] Bộ lọc phòng ban / địa điểm / hình thức.
- [x] SEO / Open Graph cơ bản.
- [x] Schema.org `JobPosting` cơ bản.
- [ ] Thay logo và màu nhận diện Fusumi chính thức.
- [ ] Bổ sung JobPosting properties từ dữ liệu tuyển dụng thực tế.
- [ ] Hoàn thiện Google Form + Google Sheets.
- [ ] Thêm GA4 và Google Search Console.
- [ ] Kiểm thử theme trực tiếp trên Blogger.
- [ ] Trỏ domain chính thức.

## License

Xem `LICENSE`.
