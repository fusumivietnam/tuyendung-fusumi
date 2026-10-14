# Live authoring audit

## Mục tiêu

Định kỳ kiểm tra các bài tuyển dụng đang public bằng chính authoring contract đã dùng trước khi Publish.

Audit chỉ đọc production. Nó không chỉnh sửa Blogger và không tự sửa bài khi gặp output stale hoặc cache.

## Những gì được kiểm tra

Với từng job URL đã khai báo trong `scripts/check_live_authoring.mjs`:

- title chỉ là tên vị trí, không gắn địa điểm/khu vực;
- đủ đúng một nhóm label `PB:`, `ĐĐ:`, `HT:`;
- body không còn placeholder `NHẬP ...`;
- có metadata `Địa điểm`, `Hình thức`, `Số lượng`;
- `Số lượng` bắt đầu bằng số nguyên dương;
- `Hạn ứng tuyển`, nếu có, là ngày thật theo một trong các format runtime hỗ trợ;
- không có `<style>` hoặc `<script>` trong body;
- body không tự chèn CTA/link Ứng tuyển.

Các rule được thực thi bởi `scripts/check_job_authoring.py`, nên pre-publish QA và live QA dùng cùng một nguồn contract.

## Trạng thái

- `PASS`: rendered production data thỏa toàn bộ authoring contract.
- `FAIL`: trang tải được bình thường nhưng có vi phạm contract; workflow fail để cần xử lý.
- `INCONCLUSIVE`: Blogger trả 429, lỗi mạng hoặc DOM chưa đọc được đáng tin cậy. Trạng thái này không được coi là regression production.

## Workflow

`Live Smoke Test` chạy audit này sau khi Chromium được cài đặt. Report được ghi vào `live-authoring-report.json` và upload cùng workflow artifact.

Workflow chạy khi:

- merge/push vào `main`;
- chạy thủ công;
- lịch hằng ngày lúc 08:00 giờ Việt Nam.

## Khi có FAIL

Không sửa Blogger chỉ dựa trên một kết quả live nếu dữ liệu mâu thuẫn với editor hoặc vừa mới cập nhật. Trước tiên xác nhận lại Post trong Blogger editor; sau đó chỉ sửa field thực sự sai.
