# Google Form / Google Sheets cho luồng ứng tuyển

## Mục tiêu

Trang `Ứng tuyển` hỗ trợ hai kênh song song:

1. Google Form là kênh ưu tiên khi đã cấu hình.
2. Email `hr@fusumi.vn` luôn được giữ làm fallback.

Runtime tự prefill tên vị trí và URL tin tuyển dụng từ query string `?vi-tri=...&job=...`.

## Tạo Form

Tạo Google Form tuyển dụng với tối thiểu các trường:

- Họ và tên
- Số điện thoại
- Email
- Vị trí ứng tuyển
- Link CV/Portfolio hoặc File upload CV
- URL tin tuyển dụng (có thể để trường ngắn; dùng cho prefill/đối soát)

Trong Google Forms, chọn **Liên kết với Trang tính** để tạo Google Sheet nhận phản hồi.

## Lấy `entry.*`

Trong Google Form:

1. Chọn menu ba chấm → **Nhận đường liên kết được điền sẵn**.
2. Điền giá trị mẫu dễ nhận biết vào `Vị trí ứng tuyển` và `URL tin tuyển dụng`.
3. Bấm lấy liên kết.
4. Trong URL kết quả sẽ có dạng:

```text
https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.111111=KE_TOAN&entry.222222=https%3A%2F%2Fexample.com
```

Ghi lại:

- Form URL: phần `https://docs.google.com/forms/d/e/FORM_ID/viewform`
- Entry vị trí: `entry.111111`
- Entry URL job: `entry.222222`

## Cấu hình Blogger Page `Ứng tuyển`

Ở thẻ root `.fusumi-apply-page`, điền ba data attribute:

```html
<div class="fusumi-apply-page"
     data-google-form-url="https://docs.google.com/forms/d/e/FORM_ID/viewform"
     data-google-form-position-entry="entry.111111"
     data-google-form-job-entry="entry.222222">
```

Nếu ba giá trị để rỗng, nút Google Form sẽ tự ẩn và email tiếp tục hoạt động.

## Hành vi runtime

Khi Form hợp lệ, runtime tạo URL dạng:

```text
FORM_URL?usp=pp_url&entry.POSITION=<vi-tri>&entry.JOB=<canonical-job-url>
```

Nút mở Form ở tab mới với `rel="noopener"`.

Runtime chỉ chấp nhận Form URL trên `docs.google.com` có path chứa `/forms/` và entry key dạng `entry.<digits>`; cấu hình sai sẽ không tạo link Form.

## Conversion event

Khi ứng viên bấm Google Form hoặc email, runtime push vào `window.dataLayer`:

```js
{
  event: 'fusumi_apply_click',
  apply_channel: 'google_form' | 'email',
  job_position: 'Kế toán nội bộ',
  job_url: 'https://tuyendung.fusumi.vn/...'
}
```

Có thể dùng event này cho Google Tag Manager / GA4 mà không cần sửa lại runtime.

## Kiểm thử

Playwright CI kiểm tra cả hai trạng thái:

- chưa cấu hình Form → Google Form ẩn, email hoạt động;
- đã cấu hình Form → prefill đúng tên vị trí + URL job;
- click email sinh `fusumi_apply_click` trong `dataLayer`.
