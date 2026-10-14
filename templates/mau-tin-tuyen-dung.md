# [TÊN VỊ TRÍ]

> Dùng đúng cấu trúc metadata bên dưới để runtime, JobPosting và job lifecycle đọc ổn định. Xóa dòng tùy chọn nếu chưa có dữ liệu thật; không để placeholder trong bài đã publish.

| Thông tin | Giá trị |
| --- | --- |
| Địa điểm | Hà Nội |
| Hình thức | Full-time |
| Thu nhập | Thỏa thuận |
| Số lượng | 01 |
| Hạn ứng tuyển | 31/12/2026 |

## Mô tả công việc

- Mô tả nhiệm vụ chính số 1.
- Mô tả nhiệm vụ chính số 2.
- Phối hợp với các bộ phận liên quan để hoàn thành mục tiêu.
- Báo cáo kết quả công việc theo quy định.

## Yêu cầu

- Tốt nghiệp phù hợp với vị trí.
- Có kinh nghiệm liên quan là lợi thế.
- Chủ động, trách nhiệm và có khả năng phối hợp nhóm.
- Sử dụng tốt các công cụ phục vụ công việc.

## Quyền lợi

- Thu nhập cạnh tranh theo năng lực.
- Thưởng theo hiệu quả công việc.
- Được đào tạo và có cơ hội phát triển.
- Chế độ BHXH/BHYT theo quy định.
- Các chính sách nội bộ khác của Fusumi.

## Thời gian làm việc

Thứ 2 – Thứ 7, theo khung giờ áp dụng tại công ty.

## Cách ứng tuyển

Nhấn nút **Ứng tuyển vị trí này** ở cuối trang hoặc truy cập trang Ứng tuyển.

## Quy tắc dữ liệu

- `Địa điểm`: nên khớp với label `ĐĐ:` của bài.
- `Hình thức`: nên khớp với label `HT:`; ví dụ `Full-time`, `Part-time`, `Thực tập`.
- `Thu nhập`: chỉ ghi dữ liệu thật. Runtime hiện không tạo `baseSalary` từ trường này.
- `Số lượng`: dùng số nguyên dương, ví dụ `01`, `2`, `10`.
- `Hạn ứng tuyển`: dùng ngày thật theo một trong các dạng `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY` hoặc `YYYY-MM-DD`.
- Nếu vị trí tuyển liên tục hoặc chưa có deadline chắc chắn, **xóa hẳn hàng `Hạn ứng tuyển`** thay vì nhập `Không giới hạn`, `TBD`, `DD/MM/YYYY` hoặc ngày giả.
- Không để ngoặc vuông placeholder như `[01 nhân sự]`, `[ĐỊA ĐIỂM]`, `[MỨC LƯƠNG]` trong bài đã publish.
- Tiêu đề Post chỉ là tên vị trí, không thêm địa điểm/khu vực vào title. Địa điểm được thể hiện bằng label và metadata.

## Labels bắt buộc

Để bộ lọc tự sinh đúng, mỗi bài phải có đủ 3 nhóm label:

- Phòng ban: `PB: Kinh doanh`
- Địa điểm: `ĐĐ: Hà Nội`
- Hình thức: `HT: Full-time`

Có thể thêm label tự do như `Hot`, `Fresher`, `Sales B2B` để hỗ trợ tìm kiếm, nhưng không dùng chúng thay cho 3 label bắt buộc ở trên.

## Checklist trước khi Publish

- [ ] Title chỉ chứa tên vị trí.
- [ ] Có đủ `PB:`, `ĐĐ:`, `HT:`.
- [ ] Metadata không còn placeholder.
- [ ] `Số lượng` là số thật nếu có.
- [ ] `Hạn ứng tuyển` là ngày thật hoặc hàng này đã được xóa.
- [ ] Search Description mô tả đúng vị trí, địa điểm và hình thức.
- [ ] Nội dung không chứa email/số điện thoại placeholder.
