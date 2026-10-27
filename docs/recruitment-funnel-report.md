# Báo cáo hiệu quả tuyển dụng theo vị trí

Hệ thống hiện có hai nguồn khác nhau: GA4 ghi nhận `page_view` và `fusumi_apply_click`; Google Form/Sheet ghi nhận hồ sơ thực nhận. **Click không phải hồ sơ đã nộp.**

## Dữ liệu xuất đầu vào

1. Từ GA4 hoặc báo cáo tổng hợp do bạn tạo, xuất CSV `events.csv` có các cột chính xác: `job_url,event_name,event_count`. Chỉ dùng hai sự kiện `page_view` và `fusumi_apply_click`. Script chấp nhận `job_url`, `page_location`, `pageLocation` hoặc `Page location`; sự kiện nhận `event_name`/`eventName`, số lượng nhận `event_count`/`eventCount`. Khi xuất GA4, cần tạo báo cáo có chiều `pageLocation` và `eventName`, chỉ số `eventCount`. Không tự giả định các trường tùy chỉnh đã được đăng ký. Không khẳng định GA4 đã có sẵn custom dimension cho `job_url`.
2. Xuất `responses.csv` từ Sheet phản hồi Google Form với cột `URL tin tuyển dụng` (hoặc `job_url`). Các cột thông tin cá nhân nếu có chỉ được đọc trong file nguồn; công cụ không xuất các cột đó ra báo cáo. Nên ưu tiên tạo bản CSV chỉ có URL để giảm xử lý dữ liệu cá nhân.
3. Chỉ so sánh **cùng một khoảng thời gian** và cùng múi giờ (`Asia/Ho_Chi_Minh`). Bộ tổng hợp không tự lọc thời gian. Xóa bản xuất dữ liệu gốc khỏi máy xử lý sau khi hoàn thành theo chính sách lưu trữ nội bộ.

## Chạy cục bộ

```bash
python scripts/report_recruitment_funnel.py --events events.csv --responses responses.csv --output funnel-summary.csv
```

Báo cáo chỉ chứa `job_url,page_views,apply_clicks,applications,click_through_rate`. Tỷ lệ nhấp là `apply_clicks/page_views`, hiển thị dưới dạng số thập phân, ví dụ `0.12` tương đương 12%; không phải tỷ lệ chuyển đổi hồ sơ. `applications` là số **dòng phản hồi**, có thể có hồ sơ trùng nếu người nộp gửi nhiều lần; không tự động coi là ứng viên duy nhất.

## Đọc kết quả

- `page_views`: lượt xem, không phải số người dùng duy nhất.
- `apply_clicks`: số sự kiện click vào kênh ứng tuyển; một người có thể click nhiều lần.
- `applications`: số phản hồi Form (theo URL vị trí). Hồ sơ gửi qua email chưa được tính tự động.
- `click_through_rate`: tỷ lệ click/view để so sánh tương đối; chỉ đáng tin khi `page_view` được ánh xạ đúng URL.
- Có thể có báo cáo click/response lệch do chặn Analytics, consent, khác múi giờ, email, người quay lại, hoặc URL trống/không hợp lệ.

## Quy tắc an toàn

Không đưa file ứng viên có tên, email, điện thoại, CV vào GitHub hoặc issue. Chỉ commit script, test và tài liệu; không commit CSV dữ liệu thực. Khi cần chia sẻ báo cáo, chỉ sử dụng file tổng hợp đã kiểm tra không chứa PII.


## Dashboard HTML ngoại tuyến

Để tạo thêm trang báo cáo có các KPI và bảng theo vị trí:

```bash
python scripts/report_recruitment_funnel.py --events events.csv --responses responses.csv --output funnel-summary.csv --html-output funnel-dashboard.html
```

Mở `funnel-dashboard.html` bằng trình duyệt trên máy tính. Trang là HTML tĩnh, không dùng thư viện, JavaScript hoặc API bên ngoài. Báo cáo chỉ trình bày số liệu tổng hợp; **không upload dashboard hoặc file hồ sơ ứng viên lên public GitHub Pages/Blogger**.

Dashboard thống kê lượt xem, click, phản hồi Form, và CTR (click/view); không xác nhận ứng viên duy nhất hay số hồ sơ email. Người vận hành cần xuất hai nguồn theo cùng thời kỳ; đây chưa phải tích hợp GA4/Google Sheets tự động.

## Định dạng URL và phạm vi

Chỉ URL bài viết tuyển dụng trên `https://tuyendung.fusumi.vn/YYYY/MM/*.html` mới được thống kê; URL domain ngoài, trang chủ, trang tìm kiếm, trang ứng tuyển không được tính vào chỉ số theo job. Tham số query và fragment được loại bỏ khi chuẩn hóa. Nếu GA4 dùng `pageLocation` của **trang ứng tuyển** thay cho URL bài tuyển dụng ở sự kiện click, không thể quy kết click cho job từ trường đó: cần báo cáo GA4 có tham số `job_url` tương ứng (đã được thu thập và đăng ký đúng) để tránh thiếu hoặc lệch số liệu.
