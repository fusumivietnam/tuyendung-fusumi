# Live authoring audit

## Mục tiêu

Định kỳ kiểm tra các bài tuyển dụng đang public bằng chính authoring contract đã dùng trước khi Publish.

Audit chỉ đọc production. Nó không chỉnh sửa Blogger và không tự sửa bài khi gặp output stale hoặc cache.

## Job discovery

Danh sách job không còn hard-code trong từng audit script.

`scripts/live_jobs.mjs` là nguồn discovery dùng chung cho cả live authoring audit và rendered runtime verification:

1. ưu tiên đọc Blogger posts feed và lấy mọi `alternate` URL có dạng `/YYYY/MM/*.html` trên đúng domain tuyển dụng;
2. feed job payload giữ lại `title`, labels và body HTML để Authoring QA có thể kiểm tra trực tiếp mà không cần mở từng trang job;
3. nếu feed không dùng được hoặc bị 429, fallback sang các post URL tìm thấy trên homepage;
4. loại query/hash, URL ngoài domain và static Page URL;
5. nếu feed có body post, phân loại lifecycle ngay từ discovery bằng `Hạn ứng tuyển`;
6. nếu homepage fallback không có body post thì lifecycle ban đầu là `inconclusive`, sau đó được xác định lại từ rendered job page;
7. nếu cả hai nguồn đều không đáng tin cậy, workflow báo `INCONCLUSIVE` thay vì giả định danh sách job cũ.

Policy lifecycle:

- không có `Hạn ứng tuyển` → `open`;
- deadline hợp lệ và chưa qua 23:59:59 Asia/Ho_Chi_Minh → `open`;
- deadline hợp lệ và đã qua → `expired`;
- có chuỗi deadline nhưng ngày không hợp lệ → `inconclusive`.

Không tự tạo deadline và không tự đóng job khi dữ liệu không đủ.

## Authoring QA: feed-first

Khi Blogger feed có đủ `title`, labels và body HTML, `scripts/check_live_authoring.mjs` chạy `scripts/check_job_authoring.py` trực tiếp trên dữ liệu feed.

Điều này tránh thêm một HTTP request/Chromium navigation cho từng job và giảm đáng kể khả năng gặp Blogger HTTP 429.

Chỉ khi discovery phải fallback sang homepage hoặc feed thiếu dữ liệu authoring, audit mới mở rendered job page để lấy title/labels/body.

Report ghi `source` cho từng job:

- `blogger-feed`: authoring QA được kiểm tra trực tiếp từ feed;
- `rendered-page`: phải fallback sang rendered page;
- `none`: discovery không đủ tin cậy.

`counts.feed` và `counts.renderedFallback` giúp theo dõi audit đang dùng đường nào.

## Những gì được kiểm tra

Với từng job URL được discovery tự động:

- title chỉ là tên vị trí, không gắn địa điểm/khu vực;
- đủ đúng một nhóm label `PB:`, `ĐĐ:`, `HT:`;
- body không còn placeholder `NHẬP ...`;
- có metadata `Địa điểm`, `Hình thức`, `Số lượng`;
- `Số lượng` bắt đầu bằng số nguyên dương;
- `Hạn ứng tuyển`, nếu có, là ngày thật theo một trong các format runtime hỗ trợ;
- không có `<style>` hoặc `<script>` trong body;
- body không tự chèn CTA/link Ứng tuyển.

Các rule được thực thi bởi `scripts/check_job_authoring.py`, nên pre-publish QA và live QA dùng cùng một nguồn contract.

Rendered runtime verification vẫn luôn kiểm tra browser-rendered production vì canonical, runtime marker, GA4, Apply CTA và JobPosting JSON-LD phụ thuộc JavaScript thực tế.

Rendered runtime verification áp contract theo lifecycle:

- `open`: phải có Apply CTA khả dụng và `fusumi-jobposting-jsonld` hợp lệ;
- `expired`: phải hiển thị `Đã hết hạn tuyển`, Apply CTA phải bị vô hiệu hóa và không còn `fusumi-jobposting-jsonld`;
- `inconclusive`: vẫn kiểm tra các contract chung như canonical/config/GA4 nhưng bỏ qua check lifecycle-dependent để tránh false-fail.

Nếu feed và rendered page cho lifecycle khác nhau, report ghi mismatch và coi tình huống là `INCONCLUSIVE`; rendered page được dùng cho contract check của lần chạy đó.

## Trạng thái

- `PASS`: production data thỏa toàn bộ contract áp dụng cho nguồn kiểm tra hiện tại.
- `FAIL`: dữ liệu production đọc được bình thường nhưng có vi phạm contract; workflow fail để cần xử lý.
- `INCONCLUSIVE`: Blogger trả 429, lỗi mạng, discovery không đủ dữ liệu, deadline không hợp lệ hoặc DOM chưa đọc được đáng tin cậy. Trạng thái này không được coi là regression production.

## Workflow

`Live Smoke Test` chạy audit sau khi Chromium được cài đặt. Report được ghi vào `live-authoring-report.json` và `live-runtime-report.json` rồi upload thành workflow artifacts.

Report có `discovery.jobs` với `lifecycle`, `reason`, `validThrough`, cùng counts `open`, `expired` và `inconclusive`.

Workflow chạy khi:

- merge/push vào `main`;
- chạy thủ công;
- lịch hằng ngày lúc 08:00 giờ Việt Nam.

## GitHub Actions live dashboard

`scripts/render_live_summary.mjs` hợp nhất hai JSON report thành một bảng Markdown trong `GITHUB_STEP_SUMMARY`.

Mỗi job có một dòng với Job + link production, Location, Lifecycle, Authoring QA, Runtime, JobPosting, Apply và SEO canonical/meta description.

Quy ước hiển thị:

- ✅ pass;
- ❌ fail;
- ⚠️ inconclusive;
- — dữ liệu không có vì một report chưa được tạo.

Dashboard chỉ trình bày lại kết quả audit, không thay đổi exit code và không tự sửa production. JSON artifacts vẫn được giữ làm nguồn debug chi tiết.

## Production regression issue

`scripts/sync_live_failure_issue.mjs` đồng bộ một issue duy nhất có tiêu đề `[Production] Fusumi Careers live audit failure`.

Policy:

- có ít nhất một `FAIL` trong authoring hoặc runtime report → tạo issue nếu chưa có, hoặc thêm comment vào issue hiện có;
- issue đã đóng mà regression quay lại → mở lại cùng issue và thêm lần kiểm tra mới;
- `HTTP 429`, thiếu report, lỗi mạng hoặc `INCONCLUSIVE` → không tạo issue, không cập nhật issue và không tự đóng issue cũ;
- chỉ tự đóng issue khi cả hai report đều tồn tại và mọi job được discovery đều `PASS` ở cả Authoring QA và Runtime.

Workflow cấp `issues: write` chỉ cho `Live Smoke Test`; CI/PR validation vẫn giữ quyền read-only.

## Khi có FAIL

Không sửa Blogger chỉ dựa trên một kết quả live nếu dữ liệu mâu thuẫn với editor hoặc vừa mới cập nhật. Trước tiên xác nhận lại Post trong Blogger editor; sau đó chỉ sửa field thực sự sai.
