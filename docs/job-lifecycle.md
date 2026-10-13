# Job lifecycle và vacancy hết hạn

## Mục tiêu

Khi một tin tuyển dụng có `Hạn ứng tuyển` hợp lệ và thời điểm đó đã qua, frontend phải thể hiện rõ tin đã đóng và không tiếp tục phát `JobPosting` JSON-LD như một vacancy còn mở.

## Dữ liệu nguồn

Lifecycle chỉ đọc `Hạn ứng tuyển` từ visible content của Blogger Post:

- hàng bảng có nhãn `Hạn ứng tuyển`; hoặc
- text dạng `Hạn ứng tuyển: ...` trong `.post-body`.

Định dạng được hỗ trợ:

- `YYYY-MM-DD`
- `DD/MM/YYYY`
- `DD-MM-YYYY`
- `DD.MM.YYYY`

Deadline được hiểu là 23:59:59 giờ Việt Nam (`+07:00`) của ngày đó.

## Khi job đã hết hạn

`Fusumi Careers Config` sẽ:

- thêm `data-job-status="expired"` và class `job-expired` vào JobPosting container;
- chèn thông báo visible `Đã hết hạn tuyển` ngay sau tiêu đề;
- vô hiệu hóa CTA ứng tuyển bằng cách bỏ `href`, thêm `aria-disabled="true"` và `tabindex="-1"`;
- không đụng tới `mailto:`, `tel:` hoặc các link liên hệ khác;
- gỡ `#fusumi-jobposting-jsonld`;
- quan sát `<head>` để tiếp tục gỡ JSON-LD nếu Careers Runtime chèn schema bất đồng bộ sau đó.

URL bài tuyển dụng vẫn giữ nguyên để người dùng có thể xem nội dung lịch sử và để tránh tạo lỗi 404 không cần thiết.

## Khi job còn hạn

Không thay đổi Apply flow. Careers Runtime tiếp tục xuất `validThrough` từ deadline thật.

## Khi không có deadline hợp lệ

Không suy đoán trạng thái hết hạn và không fabricate `validThrough`. Tin tiếp tục hoạt động như hiện tại.

## Quy trình vận hành

Khi đăng job mới, nên nhập `Hạn ứng tuyển` dưới dạng ngày thật nếu doanh nghiệp đã xác định deadline. Nếu vị trí tuyển liên tục hoặc chưa có deadline chắc chắn, để trống thay vì nhập placeholder.

Khi cần đóng job sớm trước deadline, hiện tại nên cập nhật `Hạn ứng tuyển` về ngày đóng thực tế. Không dùng ngày giả chỉ để điều khiển SEO.

## Regression tests

`tests/job-lifecycle.spec.js` cover ba contract:

1. deadline đã qua → visible expired state + Apply disabled + không còn JobPosting JSON-LD;
2. deadline tương lai → Apply hoạt động + JSON-LD có `validThrough`;
3. không có deadline → job vẫn mở + không fabricate `validThrough`.
