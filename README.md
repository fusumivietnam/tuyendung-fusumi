# Tuyển dụng Fusumi

Source cho trang tuyển dụng Fusumi triển khai trên **Blogger / Blogspot**, ưu tiên chi phí thấp, dễ vận hành và để HR có thể đăng vị trí mới bằng bài viết Blogger mà không cần sửa code.

## Cấu trúc repo

```text
blogger/
  fusumi-careers-theme.xml      Theme Blogger chính

docs/
  cai-dat-blogger.md            Hướng dẫn cài đặt và cấu hình

templates/
  mau-tin-tuyen-dung.md         Mẫu nội dung job cho HR
```

## MVP hiện tại

- Landing page tuyển dụng Fusumi.
- Responsive desktop / tablet / mobile.
- Danh sách vị trí lấy tự động từ Blogger Posts.
- Dùng Blogger Labels cho phòng ban, địa điểm và loại công việc.
- Tìm kiếm nhanh job đang hiển thị.
- Trang chi tiết tin tuyển dụng.
- CTA ứng tuyển và cấu trúc Page cố định.
- Có thể nhúng Google Form để nhận CV và lưu phản hồi vào Google Sheets.

## Cài nhanh

1. Tạo Blogger site.
2. Mở **Theme → Edit HTML**.
3. Dán nội dung `blogger/fusumi-careers-theme.xml`.
4. Tạo 3 Page: `Về Fusumi`, `Quy trình tuyển dụng`, `Ứng tuyển`.
5. Tạo Google Form và nhúng vào Page ứng tuyển.
6. Đăng mỗi vị trí tuyển dụng dưới dạng một Blogger Post.

Chi tiết xem tại [`docs/cai-dat-blogger.md`](docs/cai-dat-blogger.md).

## Quy ước đăng job

Mỗi tin nên có tối thiểu 3 label:

- Phòng ban, ví dụ `Kinh doanh`.
- Địa điểm, ví dụ `Hà Nội`.
- Hình thức, ví dụ `Full-time`.

Mẫu nội dung: [`templates/mau-tin-tuyen-dung.md`](templates/mau-tin-tuyen-dung.md).

## Roadmap

- [ ] Thay logo và màu nhận diện Fusumi chính thức.
- [ ] Thêm bộ lọc phòng ban / địa điểm / hình thức.
- [ ] Thêm Schema.org `JobPosting` cho từng bài tuyển dụng.
- [ ] Hoàn thiện Google Form và luồng lưu Google Sheets.
- [ ] Thêm GA4 và Google Search Console.
- [ ] Tối ưu SEO / Open Graph.
- [ ] Kiểm thử theme trực tiếp trên Blogger.
- [ ] Trỏ domain `tuyendung.fusumi.vn` hoặc domain chính thức khác.

## License

Xem file [`LICENSE`](LICENSE).
