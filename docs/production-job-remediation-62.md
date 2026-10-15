# Production remediation — Issue #62

Mục tiêu của remediation này là đưa 2 Blogger Post đang live về cùng authoring contract hiện tại mà không đổi URL, title hay Search Description.

## 1. Kế toán nội bộ

Post:
`https://tuyendung.fusumi.vn/2026/10/ke-toan-noi-bo.html`

### Blogger labels bắt buộc

- `PB: Kế toán`
- `ĐĐ: Hà Nội`
- `HT: Full-time`

Lưu ý: live feed tại thời điểm phát hiện issue #62 đang gắn nhầm `PB: Kinh doanh`.

### Body

Trong Blogger Post editor:

1. Chuyển sang HTML view.
2. Xóa toàn bộ body hiện tại.
3. Dán nguyên nội dung file `production-fixes/issue-62/ke-toan-noi-bo.html`.
4. Không thêm `<style>`, `<script>` hoặc CTA/link Ứng tuyển trong body.
5. Save/Update post.

Body sửa lỗi các điểm production hiện tại: embedded `<style>`, nội dung cũ bị lặp/double-encoded, placeholder cũ và metadata `Số lượng` không còn parse ổn định.

## 2. Nhân viên kinh doanh thị trường

Post:
`https://tuyendung.fusumi.vn/2026/10/nvkd-thi-truong-khu-vuc-mien-tru.html`

### Blogger labels bắt buộc

- `PB: Kinh doanh`
- `ĐĐ: Miền Trung`
- `HT: Full-time`

### Body

Trong Blogger Post editor:

1. Chuyển sang HTML view.
2. Xóa toàn bộ body hiện tại.
3. Dán nguyên nội dung file `production-fixes/issue-62/nvkd-mien-trung.html`.
4. Không thêm hàng `Hạn ứng tuyển` nếu chưa có ngày thật.
5. Save/Update post.

Body chuyển metadata đầu bài sang table canonical để live authoring QA đọc được `Địa điểm`, `Hình thức`, `Thu nhập` và `Số lượng`. Giá trị `Cập nhật theo kế hoạch tuyển dụng` được bỏ khỏi `Hạn ứng tuyển` vì lifecycle chỉ nhận ngày thật.

## 3. Không thay đổi

- Title của 2 Post.
- Permalink hiện tại.
- Search Description hiện tại.
- Careers Runtime / Config / Analytics gadgets.
- Add CSS.

## 4. Xác nhận sau deploy

Sau khi cả 2 Post được Update, chạy lại `Live Smoke Test` hoặc chờ run định kỳ. Kỳ vọng:

- Authoring QA: `PASS` cho cả 2 job.
- Runtime: tiếp tục `PASS` hoặc `INCONCLUSIVE` nếu Blogger rate-limit.
- Issue production regression #62 tự đóng chỉ khi các live reports đáng tin cậy xác nhận toàn bộ job pass.
