# Blogger Layout options: nên cấu hình gì ở đâu

Mục tiêu là để người vận hành có thể chỉnh các giá trị hay thay đổi từ Blogger Layout mà không biến Layout thành nơi chứa logic ứng dụng.

## Nguyên tắc

Blogger HTML/JavaScript gadget không cung cấp custom option fields kiểu form tùy ý. Vì vậy "option trong Layout" thực tế có 3 mức:

1. Native Blogger widget settings — nên dùng khi Blogger đã hỗ trợ sẵn.
2. HTML/JavaScript gadget có tên rõ ràng — dùng cho block nội dung hoặc runtime tách biệt.
3. Config gadget tự định nghĩa bằng `data-*` — chỉ nên dùng khi runtime đã có contract/test đọc cấu hình đó; không triển khai ad-hoc dựa vào thứ tự load gadget.

## Đang phù hợp để quản lý qua Layout

### Native widgets

- Header / logo: dùng native `Header1`.
- Navigation pages: dùng native `PageList1`.
- Footer: dùng HTML/JavaScript gadget riêng.
- Careers runtime: HTML/JavaScript gadget riêng.
- Analytics runtime: HTML/JavaScript gadget riêng.

### Tên gadget

Nên đặt tên rõ ràng để nhận diện trong Layout:

- `Fusumi Careers Runtime`
- `Fusumi Analytics Runtime`
- `Fusumi Footer Contact`

Frontend có thể ẩn title của runtime bằng CSS theo marker bên trong gadget; không nên để gadget không tên vì khó vận hành.

## Có thể đưa thành Layout config trong phase tiếp theo

Các giá trị dưới đây là ứng viên tốt cho một gadget `Fusumi Careers Config` khi runtime đã có regression tests đọc config:

- HR email.
- HR phone.
- Apply Page path.
- Google Form URL.
- Google Form position entry ID.
- Google Form job URL entry ID.
- GA4 Measurement ID.
- Organization name / URL / logo nếu có nhu cầu thay đổi.

Config gadget dự kiến chỉ chứa một marker duy nhất, ví dụ:

```html
<div id="fusumi-careers-config"
     data-hr-email="hr@fusumi.vn"
     data-hr-phone="0797139999"
     data-apply-page="/p/ung-tuyen.html"
     data-google-form-url="https://docs.google.com/forms/d/e/.../viewform"
     data-google-form-position-entry="entry.348709449"
     data-google-form-job-entry="entry.3122690363"
     data-ga4-id="G-6FN6HGQ5R8"
     hidden></div>
```

Runtime phải đọc config theo nguyên tắc:

- config hợp lệ → dùng config;
- config thiếu / sai → dùng default an toàn trong source;
- không được làm hỏng Apply flow nếu config gadget bị xóa;
- không phụ thuộc config gadget phải nằm trước hay sau runtime trong Layout;
- Playwright phải cover cả trạng thái có config và không có config.

## Không nên đưa thành Layout option

- Logic tạo JobPosting JSON-LD.
- Selector DOM.
- Regex parse ngày / số lượng.
- Logic canonical/meta description.
- Code analytics bridge.
- Search/filter behavior.
- CI / smoke-test settings.

Các phần này phải tiếp tục nằm trong GitHub source + PR + CI để tránh chỉnh nhầm trực tiếp trên production.

## Nội dung nên nằm ở Post/Page thay vì Layout

- Tên vị trí.
- Mô tả công việc.
- Yêu cầu ứng viên.
- Quyền lợi.
- Địa điểm theo từng job.
- Hình thức làm việc.
- Hạn ứng tuyển.
- Mức lương nếu có.
- Số lượng tuyển.

Dữ liệu theo từng job phải là visible content/labels của Blogger Post để structured data không tách rời nội dung mà người dùng nhìn thấy.

## Khuyến nghị triển khai

Giữ kiến trúc hiện tại trong production. Chỉ triển khai `Fusumi Careers Config` khi có một PR riêng cập nhật đồng thời:

- `templates/fusumi-careers-runtime.html`;
- `templates/fusumi-analytics-runtime.html`;
- Apply Page fallback;
- Playwright contracts;
- tài liệu cài đặt Blogger.

Như vậy Layout trở thành nơi chỉnh **giá trị cấu hình**, còn GitHub vẫn là source-of-truth cho **logic**.
