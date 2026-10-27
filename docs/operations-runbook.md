# Fusumi Careers — Sổ tay vận hành sau go-live

> Production: https://tuyendung.fusumi.vn/ · Nguồn cấu hình kỹ thuật: GitHub `main` · CMS thực tế: Blogger.

## Đăng tin tuyển dụng

1. Chuẩn bị nội dung theo `templates/mau-tin-tuyen-dung-blogger.html`; kiểm tra đủ chức danh, địa điểm, hình thức, số lượng, hạn ứng tuyển (nếu có).
2. Chỉ gắn **một** label cho từng nhóm: `PB:` (phòng ban), `ĐĐ:` (địa điểm), `HT:` (hình thức).
3. Chạy QA nội dung theo [job-authoring-qa.md](job-authoring-qa.md) trước khi đăng. Không tự chèn `<script>`, JobPosting schema hoặc nút Apply tùy biến vào nội dung.
4. Publish trên Blogger, mở permalink sạch; kiểm tra ảnh không gây cuộn ngang ở màn hình 390 px, Apply CTA chuyển đúng vị trí và URL tin tuyển dụng.
5. Kiểm tra JobPosting/Rich Results và Search Console sau đăng; theo dõi việc lập chỉ mục. Hết hạn tuyển dụng: cập nhật trạng thái đúng quy trình [job-lifecycle.md](job-lifecycle.md).

## Sau khi thay CSS, Runtime hoặc cấu hình

1. Sửa và kiểm thử trong GitHub PR trước, merge vào `main`.
2. Đồng bộ đúng **toàn bộ** file tương ứng vào Blogger theo [go-live-handover.md](go-live-handover.md); merge GitHub **không tự deploy** lên Blogger.
3. Vào GitHub Actions → **Live Smoke Test** → **Run workflow** trên `main`.
4. Chỉ xác nhận production khi `Live runtime verification result: PASS` **và** `Live responsive verification result: PASS` (8/8). Bước **Require conclusive production PASS** phải thành công.
5. Ghi link workflow run và nội dung đã triển khai vào issue/PR để truy vết.

## Khi Live Smoke Test đỏ

| Dấu hiệu | Phân loại | Cách xử lý |
| --- | --- | --- |
| `INCONCLUSIVE`, `HTTP 429` | Rate limit/chưa đủ bằng chứng | Không coi là regression; hạn chế rerun liên tiếp, thử lại ở lượt lịch kế tiếp hoặc một lần kiểm tra có kiểm soát |
| `FAIL` ở Runtime | Regression chức năng, cấu hình, schema | Kiểm tra `live-runtime-report.json`, lỗi JobPosting, marker, canonical, Apply CTA; mở issue nếu tái hiện |
| `FAIL` ở Responsive | Regression bố cục | Đọc `live-responsive-report.json` và các phần tử gây overflow; sửa selector đúng nguồn, không che bằng `body { overflow-x:hidden }` |
| `MISSING` report / lỗi Chromium | CI hạ tầng hoặc test chưa chạy | Kiểm tra các bước Setup Node, Playwright, cache/install Chromium; không kết luận website hỏng khi chưa có phép đo |
| `PASS` ở một phép đo, `INCONCLUSIVE` ở phép đo khác | Chưa nghiệm thu | Chỉ đóng issue sau khi cả hai report đồng thời PASS |

## Bảo trì định kỳ

- **Mỗi tin mới/chỉnh sửa:** kiểm tra labels, deadline, CTA, permalink, Rich Results.
- **Hàng tuần:** xem Actions/Live Smoke Test, issue mở, lỗi Search Console; ghi nhận 429 kéo dài nhưng tránh tự động coi là sự cố giao diện.
- **Hàng tháng:** rà soát các tin hết hạn, link Form/email, cập nhật README/hướng dẫn nếu hợp đồng kỹ thuật thay đổi.
- **Khi CI cần nâng cấp:** kiểm tra tài liệu phiên bản Actions/Node/Playwright, chạy PR CI và Live Smoke; không cập nhật Blogger nếu chỉ thay CI.

## Rollback

Nếu production lỗi sau khi đồng bộ cấu hình/CSS, sử dụng phiên bản GitHub đã xác nhận ổn định và hướng dẫn [production-responsive-rollback.md](production-responsive-rollback.md). Ưu tiên rollback đúng phần CSS/Runtime/Config vừa thay đổi, sau đó chạy lại smoke test; không sử dụng việc restore toàn bộ XML Blogger như phương pháp rollback mặc định.
