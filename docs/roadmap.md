# Fusumi Careers — Roadmap cập nhật 30/10/2026

**Website:** https://tuyendung.fusumi.vn/ · **Repository:** fusumivietnam/tuyendung-fusumi  
**Mục tiêu:** vận hành Blogger ổn định, chuẩn hóa tuyển dụng và đo hiệu quả mà không lộ dữ liệu cá nhân.

## 1. Trạng thái các giai đoạn

| Giai đoạn | Trạng thái | Bằng chứng / lưu ý |
| --- | --- | --- |
| V1 — Theme, trang tuyển dụng, tìm kiếm, Apply | ✅ Hoàn thành | Blogger production và source/runtime đã nghiệm thu |
| Responsive mobile, SEO JobPosting, lifecycle | ✅ Đã nghiệm thu | Live Smoke 27/10: Runtime PASS và Responsive 8/8 PASS; issue #70 đã đóng |
| CI/CD, Node.js 24, Playwright, test contracts | ✅ Hoàn thành | PR #75–#76 |
| Sổ tay đăng tin, QA và xử lý sự cố | ✅ Hoàn thành | PR #77, docs/operations-runbook.md |
| Báo cáo funnel CSV + dashboard HTML offline | ✅ Hoàn thành phần mềm | PR #78–#80; chưa có chứng nhận chạy với số liệu thực |
| Tự động đồng bộ GA4 + aggregate Sheet hàng tuần | 🟡 Đã triển khai mã nguồn, **chưa bật** | PR #81; job chỉ chạy khi biến FUSUMI_FUNNEL_SYNC_ENABLED=true và đủ quyền tối thiểu |
| Dashboard số liệu thật và nghiệm thu nghiệp vụ | ⬜ Chưa hoàn thành | Cần custom GA4 dimension, service account, Sheet tổng hợp đúng kỳ |
| Theo dõi độ ổn định Live Smoke | 🟡 Đang vận hành | 29–30/10 GitHub workflow thất bại do HTTP 429 / INCONCLUSIVE, **chưa xác nhận regression** |

## 2. Sprint tiếp theo — Ưu tiên P0: chất lượng production

- [ ] Theo dõi phân loại **PASS / FAIL / INCONCLUSIVE**, phân biệt HTTP 429 với regression kỹ thuật.
- [ ] Giảm request không cần thiết và đo thời gian chạy smoke, tránh retry dồn dập gây rate limit.
- [ ] Đảm bảo báo cáo, artifact và issue ghi đúng bằng chứng; không đóng issue chỉ dựa vào GitHub Success.
- [ ] Tiếp tục rà soát khả năng truy cập mobile, CTA và schema trong các lần production kiểm thử đủ dữ liệu.

### Dấu mốc mới nhất

- **27/10:** Live Smoke #40545573831, Runtime PASS + Responsive PASS 8/8.
- **29/10:** #40830231473, Runtime PASS, Responsive INCONCLUSIVE do HTTP 429 trang job desktop.
- **30/10:** #41015072925, Runtime INCONCLUSIVE và Responsive INCONCLUSIVE do HTTP 429 từ Blogger.

## 3. Sprint tiếp theo — P1: dữ liệu và báo cáo

- [ ] Tạo Google service account quyền GA4 Viewer và Sheets Viewer đối với **Sheet tổng hợp riêng**, không cấp quyền vào Sheet hồ sơ gốc.
- [ ] Đăng ký/xác minh GA4 custom event dimension `job_url` cho `fusumi_apply_click`, kiểm tra phép đo đúng vị trí.
- [ ] Tạo tab `Summary` chứa `job_url,applications` cho **cùng kỳ** với GA4, chuẩn hóa timezone để không so sánh lệch kỳ.
- [ ] Cấu hình GitHub Secret/Variables theo docs/private-funnel-automation.md; test thủ công trước khi bật lịch.
- [ ] Nghiệm thu dashboard với dữ liệu đã tổng hợp, không chứa PII; kiểm tra số hồ sơ nhận qua email được báo cáo riêng.

**Điều kiện bật lịch:** nguồn dữ liệu thật đã được cấp quyền, phép đo khớp kỳ, chạy thủ công thành công; sau đó mới bật `FUSUMI_FUNNEL_SYNC_ENABLED=true`.

## 4. P2: quy trình vận hành tuyển dụng

- [ ] Thiết lập checklist hàng tuần: tin mới, tin sắp hết hạn, tin hết hạn, Apply CTA và Search Console.
- [ ] Rà soát hiệu quả tuyển dụng từng tháng (lượt xem / click / hồ sơ thực nhận).
- [ ] Tài liệu hóa nghiệp vụ đóng job sớm và tình trạng hồ sơ qua email mà không tạo ngày giả cho SEO.
- [ ] Định kỳ rà soát quyền truy cập GA4/Sheets/GitHub và luân chuyển secret theo chính sách bảo mật.

## 5. Quy định triển khai

1. Đổi code: tạo PR → CI PASS → merge `main` → xem Live Smoke và báo cáo thật.
2. Đổi CSS/Runtime/Config trên Blogger: **phải đồng bộ thủ công** đúng file; merge GitHub không tự deploy Blogger.
3. HTTP 429 được phân loại **INCONCLUSIVE**; không giả định production fail hoặc pass.
4. Không commit hồ sơ ứng viên, credentials, bản xuất Sheet chứa PII hoặc dashboard có dữ liệu nhạy cảm.
5. Không bật kết nối dữ liệu tự động trước khi chủ tài khoản cấp quyền và kiểm tra nguồn dữ liệu.

**Tài liệu liên quan:** [Operations](operations-runbook.md) · [Live Smoke](live-smoke-test.md) · [Funnel](recruitment-funnel-report.md) · [Private automation](private-funnel-automation.md).
