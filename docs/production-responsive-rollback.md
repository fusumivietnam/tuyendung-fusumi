# Production responsive rollout and rollback

Roadmap: issue #3.

## Mục tiêu

Đồng bộ responsive/mobile source đang được quản lý trong GitHub sang Blogger production, kiểm tra các luồng chính ở 390×844 và 1366×768, và giữ rollback không phụ thuộc Theme Restore/Upload XML.

## Source of truth

Các phần production phải lấy từ đúng file trong `main` hoặc release/tag đã duyệt:

- Add CSS: `blogger/fusumi-careers-custom.css`
- Fusumi Careers Config: `templates/fusumi-careers-config.html`
- Fusumi Careers Runtime: `templates/fusumi-careers-runtime.html`
- Fusumi Analytics Runtime: `templates/fusumi-analytics-runtime.html`
- Footer Contact nếu cần khôi phục: `templates/footer-contact.html`

Không dùng Theme Restore/Upload XML làm đường deploy hoặc rollback thường xuyên.

## Deploy responsive CSS

1. Blogger → Theme → Customize → Advanced → Add CSS.
2. Sao lưu nội dung Add CSS hiện tại vào một file tạm hoặc commit/tag trước khi thay đổi.
3. Thay toàn bộ Add CSS bằng nội dung `blogger/fusumi-careers-custom.css` từ commit/release đã duyệt.
4. Lưu theme.
5. Mở production bằng cửa sổ riêng tư và kiểm tra homepage, `/search`, `/p/ung-tuyen.html`, ít nhất một job Post.
6. Chạy GitHub Actions → `Live Smoke Test` hoặc chờ workflow theo `main`/schedule.

Các contract mobile quan trọng trong CSS source hiện tại:

- `.toolbar` về một cột ở `max-width:620px`.
- `.filter` và `.job-search` chiếm `width:100%`.
- `.summary .clear` có touch target tối thiểu 44px.
- `.post-body table` dùng internal horizontal scrolling trên mobile thay vì làm tràn toàn trang.
- `.apply .btn` và `.fusumi-apply-actions .btn` về full width trên mobile.
- PageList được phép cuộn ngang nội bộ nếu menu dài, không làm document overflow.

## Production verification

`Live Smoke Test` chạy `scripts/check_live_responsive.mjs` với hai viewport:

- mobile: 390×844
- desktop: 1366×768

Script kiểm tra homepage, `/search`, trang `Ứng tuyển`, và một live job Post được tự động phát hiện. Workflow fail khi document hoặc các container/controls chính vượt viewport; HTTP 429 được đánh dấu `inconclusive` thay vì false failure.

Artifact: `live-responsive-report.json`.

## Rollback thực dụng

Nếu responsive deployment gây regression:

1. Xác định commit/tag production trước thay đổi.
2. Blogger → Theme → Customize → Advanced → Add CSS.
3. Thay toàn bộ Add CSS bằng `blogger/fusumi-careers-custom.css` từ commit/tag trước đó.
4. Nếu lỗi liên quan runtime/config/analytics, vào Blogger → Layout và mở đúng gadget:
   - `Fusumi Careers Config`
   - `Fusumi Careers Runtime`
   - `Fusumi Analytics Runtime`
5. Thay toàn bộ nội dung gadget bằng file tương ứng từ commit/tag trước đó.
6. Không thay đổi Header1/PageList1/Blog1 và không Restore XML chỉ để rollback CSS/runtime.
7. Mở lại production và chạy `Live Smoke Test`.

## Tiêu chí đóng issue #3

- Homepage pass mobile + desktop.
- `/search` pass mobile + desktop, filter không gây document horizontal overflow.
- `Ứng tuyển` + Google Form flow hiển thị tốt trên mobile.
- Ít nhất một live job Post pass; expired state được kiểm tra khi production có dữ liệu expired.
- Header/menu, CTA, metadata/table và footer không làm document overflow.
- Runbook rollback ở trên được lưu trong repo và có thể thực hiện chỉ bằng Add CSS + Layout gadgets.
