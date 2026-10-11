# Blogger Layout options: nên cấu hình gì ở đâu

Mục tiêu là để người vận hành có thể chỉnh các giá trị hay thay đổi từ Blogger Layout mà không biến Layout thành nơi chứa logic ứng dụng.

## Nguyên tắc

Blogger HTML/JavaScript gadget không cung cấp custom option fields kiểu form tùy ý. Vì vậy "option trong Layout" thực tế có 3 mức:

1. Native Blogger widget settings — nên dùng khi Blogger đã hỗ trợ sẵn.
2. HTML/JavaScript gadget có tên rõ ràng — dùng cho block nội dung hoặc runtime tách biệt.
3. Config gadget tự định nghĩa bằng `data-*` — chỉ dùng khi đã có regression tests và fallback an toàn.

## Layout hiện tại

Các gadget nên có tên rõ ràng trong Blogger Layout:

- `Fusumi Careers Config`
- `Fusumi Careers Runtime`
- `Fusumi Analytics Runtime`
- `Fusumi Footer Contact`

Config gadget dùng source:

`templates/fusumi-careers-config.html`

## Option đã hỗ trợ qua `Fusumi Careers Config`

- HR email — `data-hr-email`
- Apply Page path — `data-apply-page`
- Google Form URL — `data-google-form-url`
- Google Form position entry — `data-google-form-position-entry`
- Google Form job URL entry — `data-google-form-job-entry`
- GA4 Measurement ID — `data-ga4-measurement-id`

Production template hiện dùng đúng Google Form và GA4 đang hoạt động.

## Cơ chế fallback

- Nếu Config gadget bị xóa, Careers Runtime vẫn dùng Apply Page/Google Form attributes đang có trên Page và email production hiện tại.
- Analytics Runtime fallback về `G-6FN6HGQ5R8` nếu không có config hoặc GA4 ID sai định dạng.
- Config gadget có thể nằm trước hoặc sau hai runtime trong Layout; test browser cover trường hợp config nằm sau cả hai runtime.
- Apply Page path chỉ được override bằng URL cùng origin; `mailto:`, `tel:`, `sms:` không bị rewrite.

## Không đưa vào Layout option

Các phần sau tiếp tục nằm trong GitHub source + PR + CI:

- Organization name / URL / logo dùng cho JobPosting.
- Logic tạo JobPosting JSON-LD.
- Selector DOM và regex parse dữ liệu job.
- Canonical và meta description.
- Analytics event bridge.
- Search/filter behavior.
- CI / smoke-test settings.

Organization/schema cố ý không đưa vào Config gadget vì cấu hình sai có thể làm structured data lệch khỏi nội dung visible hoặc gây lỗi Rich Results.

## Nội dung nằm ở Blogger Post/Page

- Tên vị trí.
- Mô tả công việc.
- Yêu cầu ứng viên.
- Quyền lợi.
- Địa điểm theo từng job.
- Hình thức làm việc.
- Hạn ứng tuyển.
- Mức lương nếu có.
- Số lượng tuyển.

Dữ liệu theo từng job phải là visible content/labels của Blogger Post để structured data không tách rời nội dung người dùng nhìn thấy.

## Ẩn title runtime/config trên frontend

Nên đặt tên gadget để dễ nhận diện trong Layout, sau đó ẩn riêng title của các gadget kỹ thuật bằng CSS theo marker bên trong gadget. Không nên để gadget không tên.

Các marker hiện có:

- `#fusumi-careers-config`
- `#fusumi-careers-runtime`
- `#fusumi-analytics-runtime`

CSS production nên dùng selector theo các marker trên, không ẩn title của toàn bộ HTML/JavaScript widget.
