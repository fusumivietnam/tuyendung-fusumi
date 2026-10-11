# Feature-complete runtime

Phase này hoàn thiện trải nghiệm tuyển dụng mà không sửa theme XML.

## Thành phần

- `blogger/fusumi-careers-custom.css`: toàn bộ CSS custom, dùng qua Blogger **Theme → Customize → Advanced → Add CSS**.
- `templates/fusumi-careers-runtime.html`: gadget HTML/JavaScript riêng cho runtime.
- `templates/pages/ve-fusumi.html`: nội dung Page `Về Fusumi`.
- `templates/pages/quy-trinh-tuyen-dung.html`: nội dung Page `Quy trình tuyển dụng`.
- `templates/pages/ung-tuyen.html`: nội dung Page `Ứng tuyển`.

## Chức năng

- Responsive/mobile hardening cho header, menu, toolbar, job cards, tables và CTA.
- Search/filter có trạng thái `aria-live`, nút xóa bộ lọc tự disable khi không có điều kiện lọc, phím Esc xóa nhanh ô tìm kiếm.
- Job detail CTA tự chuyển sang `/p/ung-tuyen.html?vi-tri=...&job=...`.
- Trang Ứng tuyển đọc query string, hiển thị vị trí đang ứng tuyển và tạo email `mailto:` với subject/body đã điền sẵn.
- Runtime JobPosting/SEO hiện tại được giữ nguyên.

## Google Form

Repo chưa có Google Form URL/entry ID chính thức. Vì vậy phase này dùng email ứng tuyển làm đường dẫn hoạt động ngay. Khi có form chính thức, thay `data-apply-email` bằng URL/prefill của Google Form hoặc bổ sung submit integration trong runtime mà không cần thay theme XML.

## Cài đặt Blogger

1. Replace toàn bộ Add CSS bằng `blogger/fusumi-careers-custom.css`.
2. Replace gadget `Fusumi Careers Runtime` bằng `templates/fusumi-careers-runtime.html`.
3. Mở từng Blogger Page ở chế độ HTML và paste template tương ứng.
4. Giữ nguyên Page URLs: `/p/ve-fusumi.html`, `/p/quy-trinh-tuyen-dung.html`, `/p/ung-tuyen.html`.
