# Dashboard tuyển dụng tự động (opt-in)

Workflow `.github/workflows/private-funnel-dashboard.yml` chạy dự kiến thứ Hai 09:30 giờ Việt Nam và có thể chạy thủ công. **Mặc định job bị skip**: chỉ bật sau khi hoàn tất quyền truy cập và kiểm tra dữ liệu, không có kết nối GA4/Sheet nào được tự động thiết lập.

## Quyền truy cập

1. Trong Google Cloud, tạo service account chuyên dùng chỉ cho báo cáo, bật **Google Analytics Data API** và **Google Sheets API**. Tải khóa JSON và đặt trong GitHub Actions secret `FUSUMI_GOOGLE_SERVICE_ACCOUNT_JSON`; **không commit khóa**.
2. Cấp service account vai trò **Viewer** trên GA4 property Fusumi. Thêm custom event-scoped dimension GA4 có API name `job_url` (truy cập qua Data API `customEvent:job_url`) tương ứng event `fusumi_apply_click`. Xác minh field đã sẵn sàng trước khi chạy; nếu không, API sẽ báo lỗi thay vì tạo số liệu giả.
3. Tạo **spreadsheet riêng chỉ chứa số liệu tổng hợp**, chỉ chia sẻ spreadsheet này với service account ở quyền Viewer. Tab `Summary` cần có đúng **4 cột** `period_start,period_end,job_url,applications` (theo thứ tự A:D), chỉ chứa URL bài đăng và số hồ sơ đã tổng hợp. Mỗi dòng phải có kỳ báo cáo trùng chính xác với kỳ GA4. Không chia sẻ dữ liệu cá nhân hoặc Sheet Responses gốc. Không chia sẻ Sheet Responses có tên, SĐT, email hoặc CV với service account.
4. Đặt Repository Variables: `FUSUMI_GA4_PROPERTY_ID` (property số), `FUSUMI_FUNNEL_SHEET_ID`, `FUSUMI_FUNNEL_SHEET_RANGE` (ví dụ `Summary!A:D`). Chỉ khi cấu hình đầy đủ mới đặt `FUSUMI_FUNNEL_SYNC_ENABLED=true`.

## Về kỳ báo cáo

Đối với lượt chạy định kỳ thứ Hai 09:30 (Asia/Ho_Chi_Minh), script mặc định tính **bảy ngày lịch trọn vẹn gần nhất theo giờ Việt Nam**, từ thứ Hai trước đến hết Chủ nhật vừa qua. Cần bảo đảm **timezone của GA4 property** và phép tính hồ sơ trong Sheet cũng sử dụng `Asia/Ho_Chi_Minh`; GA4 Data API đánh giá ngày theo timezone của property.

Ví dụ lượt chạy thứ Hai 16/11/2026 sẽ yêu cầu kỳ `2026-11-09` đến `2026-11-15`. Tab `Summary!A:D`:

```csv
period_start,period_end,job_url,applications
2026-11-09,2026-11-15,https://tuyendung.fusumi.vn/2026/10/ke-toan-noi-bo.html,2
```

Nếu **bất kỳ dòng nào** dùng kỳ khác, thiếu cột, có cột bổ sung hoặc bảng không có dữ liệu, đồng bộ sẽ **thất bại** thay vì xuất báo cáo sai. Điều này cũng ngăn lấy tổng số hồ sơ toàn thời gian làm hồ sơ trong tuần. Tính số hồ sơ cùng kỳ tại Sheet tổng hợp riêng và cập nhật nó trước khi workflow chạy. Script **không** tự đọc hoặc tổng hợp Google Form Responses.

Khi chạy thủ công, có thể truyền `--start-date YYYY-MM-DD --end-date YYYY-MM-DD`; ngày phải khớp với tất cả hàng trong tab tổng hợp. Nếu cần làm báo cáo giai đoạn khác, cập nhật đồng bộ cả hai nguồn. Không bật lịch cho đến khi chốt được quy trình cập nhật tab `Summary`.


## Kết quả và bảo mật

Dashboard HTML + CSV tổng hợp được lưu trong GitHub Actions Artifacts với thời gian giữ **14 ngày**. Người có quyền đọc Actions/artifacts của repository có thể tải xuống; không công bố trên Blogger/GitHub Pages. Không có thông tin cá nhân ứng viên hay khóa JSON được đưa vào báo cáo. Tải và mở HTML ngoại tuyến khi cần.

Workflow gọi API ở runtime và không lưu bản raw API hoặc phản hồi từng ứng viên. Nếu cấu hình hoặc API thiếu quyền, job thất bại rõ ràng. Giữ workflow disabled cho tới khi có quyền hợp lệ.
