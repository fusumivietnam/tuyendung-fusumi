# Footer / contact native trên Blogger

Triển khai Footer theo workflow an toàn đã được xác nhận trên Blogger: nội dung bằng gadget native trong `Bố cục`, giao diện bằng `Chủ đề → Tùy chỉnh → Nâng cao → Thêm CSS`.

## Cài đặt gadget

1. Vào `Bố cục`.
2. Tại `Footer / Liên hệ`, chọn `Thêm tiện ích`.
3. Chọn `HTML/JavaScript`.
4. Để tiêu đề trống hoặc dùng `Liên hệ tuyển dụng`.
5. Dán nội dung từ `templates/footer-contact.html`.
6. Thay `YOUR_RECRUITMENT_EMAIL` và `YOUR_PHONE` bằng thông tin thật.
7. Lưu gadget.

## CSS

CSS cho Footer được lưu trong `blogger/fusumi-careers-custom.css`. Sao chép phần mới nhất vào `Chủ đề → Tùy chỉnh → Nâng cao → Thêm CSS`.

## Nguyên tắc

Không thêm widget bằng cách sửa XML theme. Không dùng Restore/Upload cho thay đổi Footer này. Sau khi Footer hoạt động ổn định, có thể export theme từ Blogger để lưu snapshot nếu cần.
