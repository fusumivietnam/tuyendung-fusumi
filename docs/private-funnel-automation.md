# Dashboard tuyển dụng tự động (opt-in)

Workflow `.github/workflows/private-funnel-dashboard.yml` chạy dự kiến thứ Hai 09:30 giờ Việt Nam và có thể chạy thủ công. **Mặc định job bị skip**: chỉ bật sau khi hoàn tất quyền truy cập và kiểm tra dữ liệu, không có kết nối GA4/Sheet nào được tự động thiết lập.

## Quyền truy cập

1. Trong Google Cloud, tạo service account chuyên dùng chỉ cho báo cáo, bật **Google Analytics Data API** và **Google Sheets API**. Tải khóa JSON và đặt trong GitHub Actions secret `FUSUMI_GOOGLE_SERVICE_ACCOUNT_JSON`; **không commit khóa**.
2. Cấp service account vai trò **Viewer** trên GA4 property Fusumi. Thêm custom event-scoped dimension GA4 có API name `job_url` (truy cập qua Data API `customEvent:job_url`) tương ứng event `fusumi_apply_click`. Xác minh field đã sẵn sàng trước khi chạy; nếu không, API sẽ báo lỗi thay vì tạo số liệu giả.
3. Tạo **spreadsheet riêng chỉ chứa số liệu tổng hợp**, chỉ chia sẻ spreadsheet này với service account ở quyền Viewer. Tab `Summary` có hai cột đầu `job_url,applications`; các hàng là URL tin tuyển dụng và **số hồ sơ trong đúng kỳ báo cáo**. Không chia sẻ Sheet Responses có tên, SĐT, email hoặc CV với service account.
4. Đặt Repository Variables: `FUSUMI_GA4_PROPERTY_ID` (property số), `FUSUMI_FUNNEL_SHEET_ID`, `FUSUMI_FUNNEL_SHEET_RANGE` (ví dụ `Summary!A:B`). Chỉ khi cấu hình đầy đủ mới đặt `FUSUMI_FUNNEL_SYNC_ENABLED=true`.

## Về kỳ báo cáo

GA4 đang lấy **7 ngày UTC gần nhất, kết thúc hôm qua**. Số `applications` trong Summary phải được tính **cùng kỳ** và dùng cùng định nghĩa múi giờ nếu muốn so sánh (nên chuẩn hóa kỳ theo UTC hoặc đổi workflow và Sheet cùng theo giờ Việt Nam). Workflow hiện **không tự tổng hợp phản hồi Form**, không được dùng tổng số hồ sơ toàn thời gian để so với GA4 tuần. Nếu không chuẩn bị được tab tổng hợp cùng kỳ, hãy để workflow disabled.

## Kết quả và bảo mật

Dashboard HTML + CSV tổng hợp được lưu trong GitHub Actions Artifacts với thời gian giữ **14 ngày**. Người có quyền đọc Actions/artifacts của repository có thể tải xuống; không công bố trên Blogger/GitHub Pages. Không có thông tin cá nhân ứng viên hay khóa JSON được đưa vào báo cáo. Tải và mở HTML ngoại tuyến khi cần.

Workflow gọi API ở runtime và không lưu bản raw API hoặc phản hồi từng ứng viên. Nếu cấu hình hoặc API thiếu quyền, job thất bại rõ ràng. Giữ workflow disabled cho tới khi có quyền hợp lệ.
