# QA bài tuyển dụng trước khi Publish

Mục tiêu là bắt lỗi authoring trước khi một Blogger Post được public và trước khi lỗi đó ảnh hưởng filter, Apply flow, JobPosting hoặc lifecycle.

## Cách chạy

Lưu body HTML của draft vào một file, ví dụ `draft-job.html`, sau đó chạy:

```bash
python scripts/check_job_authoring.py \
  --title "Kế toán nội bộ" \
  --labels "PB: Kế toán" "ĐĐ: Hà Nội" "HT: Full-time" \
  --html-file draft-job.html
```

Nếu không có lỗi, script trả exit code `0` và in `Job authoring QA passed.`. Nếu có lỗi, script trả exit code `1` và liệt kê tất cả vấn đề cần sửa.

## Contract được kiểm tra

Script kiểm tra:

- Title không trống và không gắn địa điểm/khu vực vào tên vị trí.
- Có đủ metadata `Địa điểm`, `Hình thức`, `Số lượng`.
- `Số lượng` bắt đầu bằng số nguyên dương, ví dụ `1` hoặc `02 nhân sự`.
- Nếu có `Hạn ứng tuyển`, ngày phải là ngày thật theo một trong các dạng runtime hỗ trợ: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`.
- Nếu chưa có deadline, xóa hẳn hàng `Hạn ứng tuyển` thay vì để placeholder.
- Có đúng một label cho mỗi nhóm `PB:`, `ĐĐ:`, `HT:`.
- Không còn placeholder `NHẬP ...` trong body.
- Không có `<style>` hoặc `<script>` trong body.
- Không tự chèn link/CTA `Ứng tuyển`; Theme/Runtime cung cấp CTA chuẩn.

`Thu nhập` là metadata tùy chọn đối với QA. Nếu chưa có dữ liệu lương đủ chắc chắn, có thể dùng nội dung mô tả trung thực như `Thỏa thuận`; runtime hiện không fabricate `baseSalary` từ trường này.

## Quy trình đề xuất

1. Copy `templates/mau-tin-tuyen-dung-blogger.html` làm draft.
2. Điền dữ liệu thật và xóa các hàng tùy chọn chưa có dữ liệu.
3. Gán Title và ba nhóm labels dự kiến.
4. Chạy QA script.
5. Chỉ khi script pass mới paste body vào Blogger và Publish.
6. Sau publish, để Live Smoke Test và Search Console/Rich Results chịu trách nhiệm cho lớp verification production.

## Phạm vi

Script này là pre-publish authoring QA, không kết nối Blogger và không thay đổi dữ liệu production. Nó cũng không thay thế Rich Results Test, URL Inspection hoặc live runtime verification.
