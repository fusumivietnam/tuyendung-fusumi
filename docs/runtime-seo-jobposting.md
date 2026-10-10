# Blogger runtime + SEO/JobPosting

## Kiến trúc runtime

- `blogger/fusumi-careers-theme.xml`: giữ nguyên baseline native, không dùng để triển khai CSS/runtime hằng ngày.
- `blogger/fusumi-careers-custom.css`: source of truth duy nhất cho CSS custom; copy toàn bộ vào Blogger → Theme → Customize → Advanced → Add CSS.
- `templates/footer-contact.html`: chỉ HTML Footer/contact, không CSS, không JavaScript.
- `templates/fusumi-careers-runtime.html`: gadget HTML/JavaScript riêng, không render nội dung; xử lý job-card fallback/snippet và SEO JobPosting.

## Cài đặt trên Blogger

1. Footer / Liên hệ: thêm hoặc sửa gadget HTML/JavaScript và dán `templates/footer-contact.html`.
2. Trong Footer / Liên hệ, thêm gadget HTML/JavaScript thứ hai, đặt tên `Fusumi Careers Runtime`, rồi dán `templates/fusumi-careers-runtime.html`.
3. Theme → Customize → Advanced → Add CSS: replace toàn bộ bằng `blogger/fusumi-careers-custom.css`.
4. Không đặt `<style>` trong gadget và không đặt runtime JavaScript trong Footer content gadget.

## Dữ liệu JobPosting

Runtime chỉ tạo JSON-LD trên trang chi tiết bài tuyển dụng. Nguồn dữ liệu:

- `title`: H1 của bài; runtime loại bỏ prefix dạng `[Fulltime - Hà Nội]` và suffix `- Khu vực ...` trong schema để giữ chức danh thuần.
- `description`: toàn bộ `.post-body` HTML.
- `datePosted`: Blogger JSON feed, khớp theo canonical URL. Nếu không lấy được ngày đăng thật, runtime không phát JobPosting JSON-LD.
- `employmentType`: label `HT:`.
- `jobLocation`: label `ĐĐ:`; `Hà Nội` được map vào `addressLocality`/`addressRegion`, các giá trị khác vào `addressRegion`; `addressCountry=VN`.
- `employmentUnit`: label `PB:`.
- `validThrough`: chỉ thêm nếu nội dung có `Hạn ứng tuyển:` kèm ngày cụ thể.
- `totalJobOpenings`: lấy từ `Số lượng:` nếu có số nguyên dương.
- `hiringOrganization`: Fusumi Việt Nam.

## Quy ước nội dung bài tuyển dụng

Để schema đầy đủ và nhất quán:

- Tiêu đề Blogger nên chỉ là chức danh, ví dụ `Kế toán nội bộ`, không nên chứa địa điểm/hình thức trong title.
- Luôn gắn 3 labels: `PB: ...`, `ĐĐ: ...`, `HT: ...`.
- Nếu có hạn tuyển, dùng đúng cú pháp `Hạn ứng tuyển: DD/MM/YYYY` hoặc `YYYY-MM-DD`.
- Nếu có số lượng, dùng `Số lượng: 2`.
- Phần mô tả cần chứa trách nhiệm, yêu cầu/kỹ năng và thông tin làm việc; không dùng một đoạn metadata ngắn làm toàn bộ mô tả.
- Nên điền Search Description trong Blogger cho từng bài; runtime chỉ thêm meta description khi trang chưa có.

## Kiểm thử

Sau khi triển khai:

1. Mở source/DevTools trang job và xác nhận `#fusumi-jobposting-jsonld` xuất hiện trong `<head>`.
2. Kiểm tra JSON-LD có `title`, `description`, `datePosted`, `hiringOrganization` và `jobLocation` khi job có địa điểm.
3. Dùng Google Rich Results Test cho từng URL job.
4. Theo dõi Search Console → Enhancements/Job postings và Indexing.

Không thêm dữ liệu không tồn tại trên bài chỉ để vượt validator; schema phải phản ánh nội dung mà ứng viên nhìn thấy.
