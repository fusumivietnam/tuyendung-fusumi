# Tuyển dụng Fusumi

Source cho trang tuyển dụng Fusumi triển khai trên **Blogger / Blogspot**, ưu tiên chi phí thấp, dễ vận hành và để HR đăng vị trí mới bằng Blogger Post mà không cần sửa code.

## Cấu trúc repo

```text
blogger/
  fusumi-careers-theme.xml      Theme Blogger chính

docs/
  cai-dat-blogger.md            Hướng dẫn cài đặt và cấu hình
  github-workflow.md            Quy trình branch / PR / CI / release

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

## Quy trình phát triển

Mọi thay đổi mới nên đi theo luồng:

```text
Issue → Branch → Pull Request → CI validate-theme → Review → Merge → Tag → Release
```

Quy ước branch:

- `feature/...` cho tính năng mới.
- `fix/...` cho sửa lỗi.
- `docs/...` cho tài liệu.
- `chore/...` cho công việc kỹ thuật/vận hành.

GitHub Actions chạy tự động trên Pull Request và push vào `main`. Job bắt buộc là `validate-theme`, kiểm tra XML Blogger, các marker bắt buộc, conflict marker và upload theme XML thành artifact.

Chi tiết quy trình xem `docs/github-workflow.md`.

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
- [x] Issue templates / PR template / CI / release workflow.
- [ ] Bật branch protection cho `main`.
- [ ] Tạo GitHub Project `Fusumi Careers Roadmap`.
- [ ] Thay logo và màu nhận diện Fusumi chính thức.
- [ ] Bổ sung JobPosting properties từ dữ liệu tuyển dụng thực tế.
- [ ] Hoàn thiện Google Form + Google Sheets.
- [ ] Thêm GA4 và Google Search Console.
- [ ] Kiểm thử theme trực tiếp trên Blogger.
- [ ] Trỏ domain chính thức.

## Release

Sau khi bản trên `main` đã kiểm thử trên Blogger, tạo tag theo semantic versioning, ví dụ `v0.1.0`. Workflow release sẽ tự validate và tạo GitHub Release kèm `fusumi-careers-theme.xml`.

## License

Xem `LICENSE`.
