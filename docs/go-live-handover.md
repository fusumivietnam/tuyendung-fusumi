# Fusumi Careers v1 — Go-live / Handover

Tài liệu này là checklist cuối để chuyển dự án từ giai đoạn triển khai sang vận hành.

## Production baseline

- Production: `https://tuyendung.fusumi.vn/`
- Blogger là runtime CMS chính.
- Source of truth kỹ thuật nằm trong repo này.
- Theme deploy theo hướng native-first; không dùng Restore/Upload XML như quy trình deploy/rollback thông thường.

## Checklist kỹ thuật

- [x] Custom domain + HTTPS hoạt động.
- [x] Homepage, search, apply flow và job detail có live smoke/runtime checks.
- [x] Responsive regression check được tích hợp vào CI/live smoke.
- [x] Runtime/Config/Analytics/CSS có quy trình rollback riêng.
- [x] Sitemap `/sitemap.xml` đã được Search Console chấp nhận.
- [x] Homepage đã được Google lập chỉ mục.
- [x] Runtime chỉ quản lý một nguồn JobPosting JSON-LD; legacy JobPosting microdata được loại bỏ.
- [x] JobPosting canonical/datePosted được đối chiếu với Blogger feed.

## Checklist thủ công còn lại trước khi tuyên bố v1 hoàn tất

1. Mở một job đang tuyển trên production và xác nhận:
   - chỉ có một JobPosting hợp lệ trong Rich Results/Search Console;
   - `url` trùng permalink Blogger thực tế;
   - `datePosted` trùng ngày `published` của Blogger feed;
   - có `jobLocation` và `hiringOrganization`.
2. Trong Search Console, chạy URL Inspection cho job đó và bấm **Yêu cầu lập chỉ mục** nếu live test hợp lệ.
3. Xác nhận taxonomy job đúng nghiệp vụ (`PB:`, `ĐĐ:`, `HT:`). Ví dụ bài Kế toán nội bộ phải dùng phòng ban Kế toán, không dùng Kinh doanh.
4. Mở CTA **Ứng tuyển** và xác nhận trang `/p/ung-tuyen.html` nhận đúng vị trí/job URL; Google Form hoặc email fallback hoạt động.
5. Sau khi Google crawl lại, xác nhận job URL không còn lỗi JobPosting nghiêm trọng.

## Quy trình vận hành sau handover

Mỗi job mới cần:

- dùng template nội dung chuẩn;
- gắn đúng `PB:`, `ĐĐ:`, `HT:`;
- kiểm tra CTA ứng tuyển;
- kiểm tra permalink/canonical;
- theo dõi Search Console sau khi publish;
- đóng hoặc cập nhật job khi hết hạn.

## Định nghĩa hoàn tất Fusumi Careers v1

V1 được xem là hoàn tất khi issue Search Console/indexing cuối cùng được đóng, production giữ một JobPosting hợp lệ cho job đang mở, apply flow hoạt động, và source repo khớp runtime đang chạy.
