# SEO / Search Console / Rich Results runbook

Runbook này dùng cho `https://tuyendung.fusumi.vn` sau khi đăng mới hoặc chỉnh sửa một tin tuyển dụng.

## 1. Checklist trước khi publish

Mỗi job phải là một Blogger Post riêng, có URL riêng và nội dung hoàn chỉnh.

- Title chỉ chứa tên vị trí, không nhồi địa điểm hoặc trạng thái tuyển dụng.
- Label phòng ban dùng tiền tố `PB:`.
- Label địa điểm dùng tiền tố `ĐĐ:`.
- Label hình thức dùng tiền tố `HT:`.
- Không còn placeholder dạng `[ ... ]`.
- Không tự thêm mức lương, hạn ứng tuyển, địa chỉ, kinh nghiệm hoặc điều kiện khác nếu chưa có dữ liệu thật.
- Search Description được điền ngắn gọn, đúng với nội dung visible trên trang.
- CTA ứng tuyển hoạt động và dẫn tới `/p/ung-tuyen.html`.
- Google Form và email fallback đều còn hoạt động.

## 2. Checklist runtime SEO trên trang job

Sau khi mở URL job, xác nhận:

- Có đúng một `link[rel="canonical"]` và canonical không chứa query string hoặc hash.
- Có đúng một `meta[name="description"]`.
- H1 khớp với tên vị trí.
- Có `script#fusumi-jobposting-jsonld` sau khi runtime chạy.
- JSON-LD có `@type: JobPosting`.
- `title` khớp nội dung visible.
- `description` được lấy từ nội dung job visible, không chứa CSS/script/form.
- `datePosted` lấy từ Blogger feed.
- `identifier` là ID bài Blogger.
- `hiringOrganization.name` là Fusumi Việt Nam.
- `url` bằng canonical URL.
- `directApply` hiện để `false`.
- `employmentType` chỉ xuất khi label `HT:` có giá trị hợp lệ.
- `jobLocation` chỉ xuất khi label `ĐĐ:` có dữ liệu.
- `validThrough` chỉ xuất khi bài có hạn ứng tuyển ở định dạng ngày rõ ràng.
- Không xuất `baseSalary` nếu bài không có dữ liệu lương chuẩn hóa.
- Không xuất `employmentUnit` từ label phòng ban.

Lưu ý: `JobPosting` chỉ được đặt trên trang chi tiết một job, không đặt trên trang danh sách nhiều job.

## 3. Rich Results Test

Dùng Google Rich Results Test cho từng URL job production.

URL công cụ:

`https://search.google.com/test/rich-results`

Quy trình:

1. Dán canonical URL của job, không dùng URL có query parameters.
2. Chạy test bằng Google Inspection Tool smartphone.
3. Kiểm tra crawl allowed / page fetch / indexing allowed.
4. Xác nhận hệ thống phát hiện `JobPosting`.
5. Mục tiêu là không có lỗi invalid.
6. Cảnh báo recommended field chỉ xử lý khi có dữ liệu thật; không điền dữ liệu giả chỉ để xóa warning.
7. Nếu test không thấy JSON-LD, kiểm tra JavaScript console và Blogger feed trước khi sửa schema.

### Acceptance criteria

Một job được coi là qua Rich Results validation khi:

- URL fetch thành công.
- JobPosting được detect.
- Không có lỗi required-field hoặc policy error.
- Structured data khớp với nội dung visible.
- Canonical trỏ đúng URL job production.

## 4. Search Console sau khi publish hoặc sửa job

Trong Google Search Console property phù hợp với `tuyendung.fusumi.vn`:

1. Mở URL Inspection.
2. Dán canonical URL của job.
3. Chạy **Test live URL** sau các thay đổi quan trọng về runtime hoặc structured data.
4. Nếu live URL hợp lệ nhưng Google index vẫn là bản cũ, dùng **Request indexing**.
5. Sau khi Google crawl lại, kiểm tra trạng thái index và rich-result report nếu report Job postings xuất hiện.
6. Nếu Search Console báo invalid structured data, sửa lỗi rồi dùng **Validate fix** trong report tương ứng.

Không request indexing hàng loạt sau những thay đổi CSS/visual nhỏ; ưu tiên khi có job mới, thay đổi nội dung tuyển dụng đáng kể, canonical, meta hoặc JobPosting.

## 5. Sitemap / discovery

Blogger tự cung cấp sitemap. Trong Search Console cần đảm bảo sitemap của domain đã được submit và không có lỗi fetch.

Sau khi đăng job mới, ưu tiên kiểm tra URL Inspection và discovery trước khi tạo workaround riêng. Không tạo sitemap custom nếu sitemap Blogger đang hoạt động bình thường.

## 6. Khi đóng vị trí tuyển dụng

Không để một tin hết hạn tồn tại vô thời hạn như một job đang mở.

Ưu tiên một trong hai hướng:

- cập nhật nội dung visible thành trạng thái đã đóng và loại bỏ JobPosting khỏi trang; hoặc
- gỡ bài theo quy trình nội dung phù hợp và đảm bảo URL cũ không tiếp tục quảng bá một vị trí không còn tuyển.

Nếu có `validThrough`, giá trị phải phản ánh hạn thật trong nội dung visible.

## 7. Sau mỗi thay đổi runtime

Thực hiện theo thứ tự:

1. CI / Playwright phải pass.
2. Cập nhật gadget `Fusumi Careers Runtime` trên Blogger.
3. Mở ít nhất một job Hà Nội và một job ngoài Hà Nội.
4. Kiểm tra canonical + meta description + JSON-LD trong DOM sau khi JavaScript chạy.
5. Chạy Rich Results Test trên ít nhất một URL đại diện.
6. Test live URL trong Search Console nếu thay đổi ảnh hưởng structured data/canonical/indexing.
7. Theo dõi lỗi mới trong Search Console vài ngày sau deployment.

## 8. Checklist hiện tại cho Fusumi

### Kế toán nội bộ

Canonical:
`https://tuyendung.fusumi.vn/2026/10/ke-toan-noi-bo.html`

Cần xác nhận thủ công trong Blogger / live DOM:

- label `PB: Kế toán`;
- `ĐĐ: Hà Nội`;
- `HT: Full-time`;
- không còn placeholder cũ;
- Search Description đúng;
- Rich Results detect JobPosting.

### Nhân viên kinh doanh thị trường

Canonical:
`https://tuyendung.fusumi.vn/2026/10/nvkd-thi-truong-khu-vuc-mien-tru.html`

Cần xác nhận:

- title visible là `Nhân viên kinh doanh thị trường`;
- location nằm ở label `ĐĐ: Miền Trung`, không nhồi vào title;
- `HT: Full-time`;
- không còn placeholder cũ;
- Rich Results detect JobPosting.

## 9. Nguồn tham chiếu chính thức

- Google JobPosting structured data: `https://developers.google.com/search/docs/appearance/structured-data/job-posting`
- Rich Results Test: `https://search.google.com/test/rich-results`
- Google Search Console: `https://search.google.com/search-console`
