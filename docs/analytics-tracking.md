# Analytics cho trang tuyển dụng Fusumi

## Production identifiers

- GA4 property: `fusumi.vn`
- Property ID: `472296050`
- Measurement ID: `G-6FN6HGQ5R8`
- GTM container hiện có: `GTM-TLPRFXWF`

Trang tuyển dụng dùng GA4 trực tiếp qua `gtag.js` để tránh phụ thuộc vào cấu hình GTM workspace. GTM container hiện được giữ nguyên cho các tích hợp khác của `fusumi.vn`.

## Blogger deployment

Thêm một gadget HTML/JavaScript tên `Fusumi Analytics Runtime` và dán nguyên nội dung:

`templates/fusumi-analytics-runtime.html`

Gadget chỉ chứa JavaScript loader/analytics, không chứa CSS.

## Page view

Analytics runtime nạp:

`https://www.googletagmanager.com/gtag/js?id=G-6FN6HGQ5R8`

và gọi `gtag('config', 'G-6FN6HGQ5R8')`, nên page_view được gửi tự động.

## Conversion event

Khi ứng viên bấm Google Form hoặc email trên Page `Ứng tuyển`, runtime gửi:

```js
gtag('event', 'fusumi_apply_click', {
  apply_channel: 'google_form' | 'email',
  job_position: 'Kế toán nội bộ',
  job_url: 'https://tuyendung.fusumi.vn/...'
});
```

Runtime tuyển dụng hiện tại vẫn push cùng ngữ nghĩa vào `window.dataLayer`, vì vậy có thể chuyển sang GTM sau này mà không đổi flow ứng tuyển.

## Google Sheet phản hồi

Sheet `Ứng tuyển Fusumi - Responses` nhận phản hồi Form với các cột:

- Dấu thời gian
- Họ và tên
- Số điện thoại
- Email
- Vị trí ứng tuyển
- Link CV/Portfolio
- URL tin tuyển dụng

Timezone của spreadsheet phải là `Asia/Ho_Chi_Minh` (Google API có thể hiển thị alias `Asia/Saigon`).

## Validation

Playwright kiểm tra:

- GA4 loader chỉ được thêm một lần;
- Measurement ID đúng `G-6FN6HGQ5R8`;
- `config` command được tạo;
- click Google Form tạo event `fusumi_apply_click`;
- event chứa đúng `apply_channel`, `job_position`, `job_url`.
