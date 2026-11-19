# Dashboard tuyển dụng tự động (opt-in)

Workflow `.github/workflows/private-funnel-dashboard.yml` chạy dự kiến thứ Hai 09:30 giờ Việt Nam và có thể chạy thủ công. **Mặc định lịch xuất báo cáo bị skip**. Chế độ `validate` chạy thủ công trên nhánh `main` của repository private, không cần bật lịch và không xuất báo cáo. Repository mã nguồn website hiện là public: cả xác thực Google và xuất báo cáo đều bị chặn ở đó. Không có kết nối GA4/Sheet nào được tự động thiết lập.

## Quyền truy cập

1. Trong Google Cloud, tạo service account chuyên dùng chỉ cho báo cáo, bật **Google Analytics Data API** và **Google Sheets API**. Dùng Workload Identity Federation (WIF) qua GitHub OIDC và service account impersonation; **không tạo khóa JSON**, không tắt Organization Policy. Bật thêm IAM API, IAM Service Account Credentials API và Security Token Service API.
2. Cấp service account vai trò **Viewer** trên GA4 property Fusumi. Thêm custom event-scoped dimension GA4 có API name `job_url` (truy cập qua Data API `customEvent:job_url`) tương ứng event `fusumi_apply_click`. Xác minh field đã sẵn sàng trước khi chạy; nếu không, API sẽ báo lỗi thay vì tạo số liệu giả.
3. Tạo **spreadsheet riêng chỉ chứa số liệu tổng hợp**, chỉ chia sẻ spreadsheet này với service account ở quyền Viewer. Tab `Summary` cần có đúng **4 cột** `period_start,period_end,job_url,applications` (theo thứ tự A:D), chỉ chứa URL bài đăng và số hồ sơ đã tổng hợp. Mỗi dòng phải có kỳ báo cáo trùng chính xác với kỳ GA4. Không chia sẻ dữ liệu cá nhân hoặc Sheet Responses gốc. Không chia sẻ Sheet Responses có tên, SĐT, email hoặc CV với service account.
4. Đặt Repository Variables: `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `FUSUMI_GA4_PROPERTY_ID` (property số), `FUSUMI_FUNNEL_SHEET_ID`, `FUSUMI_FUNNEL_SHEET_RANGE` (ví dụ `Summary!A:D`). Chỉ khi cấu hình đầy đủ, chạy preflight thành công và sử dụng repository private mới đặt `FUSUMI_FUNNEL_SYNC_ENABLED=true`.

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

Chế độ `validate` không xuất CSV/HTML hay artifact, không in số lượng hồ sơ ra log. Chế độ `export` chỉ được phép trên repository private đã bật đồng bộ. Dashboard HTML + CSV tổng hợp được lưu trong GitHub Actions Artifacts với thời gian giữ **14 ngày**. Người có quyền đọc Actions/artifacts của repository có thể tải xuống; không công bố trên Blogger/GitHub Pages. Không có thông tin cá nhân ứng viên hay tệp xác thực WIF tạm thời được đưa vào báo cáo. Artifact chỉ lấy từ `funnel-output/`. Tải và mở HTML ngoại tuyến khi cần.

Workflow gọi API ở runtime và không lưu bản raw API hoặc phản hồi từng ứng viên. Nếu cấu hình hoặc API thiếu quyền, job thất bại rõ ràng. Giữ workflow disabled cho tới khi có quyền hợp lệ.

## Kiểm tra trước khi bật lịch

1. Tạo repository private `fusumivietnam/tuyendung-fusumi-analytics`, sao chép những file runtime cần thiết từ mã nguồn hiện tại và cấu hình service account/variables theo hướng dẫn dưới đây. Chỉ cấp quyền vào spreadsheet tổng hợp riêng.
2. Vào Actions → Private Recruitment Funnel Dashboard → Run workflow, chọn `mode: validate` trên nhánh `main`. Không bật biến lịch để thực hiện kiểm tra này.
3. Xác nhận `Preflight PASS`. Nếu kiểm tra thất bại, rà soát quyền API, custom dimension, timezone, kỳ dữ liệu và các trường cấu hình. Log lỗi được giới hạn để không làm lộ nội dung phản hồi API.
4. Repository public không được chạy bước Google authentication. Có thể giữ repository code public và chạy xuất dashboard cục bộ với ADC đã được cấp đúng quyền và scopes, hoặc thiết lập repository báo cáo private riêng. Không đổi visibility repository hiện hữu nếu chưa được chủ sở hữu đồng ý.
5. Chỉ bật lịch xuất dữ liệu tại repository private sau khi validate thành công.

## Cấu hình WIF (không dùng JSON Key)

- Pool: `fusumi-github`; OIDC Provider: `github-actions`; Issuer: `https://token.actions.githubusercontent.com/`.
- Giới hạn condition đến đúng repository private và `refs/heads/main`. Giai đoạn chuẩn bị có thể dùng `assertion.repository == 'fusumivietnam/tuyendung-fusumi-analytics' && assertion.repository_owner == 'fusumivietnam' && assertion.ref == 'refs/heads/main'`. Trước khi chạy dữ liệu thật, nên thay tên bằng repository_id và repository_owner_id cố định của repository thực tế, giữ giới hạn ref main.
- Grant access sử dụng service account impersonation, principal giới hạn theo repository (ưu tiên repository_id), vai trò `roles/iam.workloadIdentityUser` trên service account báo cáo. Không cấp cho toàn pool.
- Biến `GCP_WIF_PROVIDER`: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/fusumi-github/providers/github-actions` (dùng Project Number, không phải Project ID).
- Biến `GCP_SERVICE_ACCOUNT`: email đầy đủ service account.
- Biến `FUSUMI_GA4_PROPERTY_ID`: `472296050`; `FUSUMI_FUNNEL_SHEET_ID`: ID spreadsheet tổng hợp; `FUSUMI_FUNNEL_SHEET_RANGE`: `Summary!A:D`; `FUSUMI_FUNNEL_SYNC_ENABLED`: `false` cho tới khi nghiệm thu.

Workflow dùng `google-github-actions/auth@v3`, tạo ADC tạm thời và Python dùng `google.auth.default(scopes=SCOPES)` với analytics.readonly và spreadsheets.readonly. Không cần đặt `FUSUMI_GOOGLE_SERVICE_ACCOUNT_JSON`. Không commit `gha-creds-*.json` hoặc file báo cáo. Bảo vệ nhánh main và chỉ cấp quyền ghi repository private cho người được phép truy cập dữ liệu tuyển dụng.

Các file tối thiểu để triển khai repository private: `.github/workflows/private-funnel-dashboard.yml`, `scripts/sync_recruitment_funnel.py`, `scripts/report_recruitment_funnel.py` và tài liệu này. Trong repository private cần giữ nguyên đường dẫn tương đối của các file. Chạy `validate` trước khi bật lịch.
