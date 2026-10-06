# Quy trình GitHub cho Fusumi Careers

## 1. Branch
Không phát triển tính năng mới trực tiếp trên `main` sau khi branch protection được bật.

Quy ước gợi ý:
- `feature/<ten-tinh-nang>`
- `fix/<ten-loi>`
- `docs/<noi-dung>`
- `chore/<cong-viec-ky-thuat>`

## 2. Issue
Mở Issue trước cho bug hoặc feature có phạm vi rõ ràng. Dùng Issue Forms trong `.github/ISSUE_TEMPLATE/`.

## 3. Pull Request
PR phải:
- Liên kết Issue khi có.
- Mô tả thay đổi và cách kiểm thử.
- Pass status check `validate-theme`.
- Có review trước khi merge sau khi protection được bật.

## 4. CI
Workflow `.github/workflows/ci.yml` chạy trên push/PR vào `main`.

Validator dùng chung nằm tại `scripts/validate_theme.py` và kiểm tra:
- XML parse hợp lệ.
- Không có merge conflict marker.
- Namespace/marker bắt buộc của Blogger.
- Các section `home-jobs`, `job-detail`, `page-archive` còn tồn tại.
- Widget IDs không bị trùng.
- Kiến trúc 3 Blog widget `Blog1`, `Blog2`, `Blog3` đã được kiểm thử trên Blogger thật không bị thay đổi ngoài ý muốn.
- Các marker search/filter/CTA/JobPosting còn tồn tại.

CI cũng compile các Python scripts và upload `fusumi-careers-theme.xml` làm artifact.

## 5. Live smoke test
Workflow `.github/workflows/live-smoke-test.yml` chạy:
- thủ công bằng `workflow_dispatch`;
- tự động mỗi ngày lúc 01:00 UTC (08:00 giờ Việt Nam).

Script `scripts/check_live_site.py` kiểm tra website public `https://tuyendung.fusumi.vn/`:
- homepage trả HTML và có nội dung chính;
- `/search` hoạt động;
- các Page `Về Fusumi`, `Quy trình`, `Ứng tuyển` không bị trắng;
- có ít nhất một job card trên homepage hoặc search;
- tự tìm một Post tuyển dụng đã xuất bản;
- Post có CTA ứng tuyển và marker `JobPosting`.

Mục đích của workflow này là phát hiện regression mà XML parser không thể thấy, ví dụ Blogger chấp nhận theme nhưng widget engine không render nội dung public.

## 6. Release
Sau khi một commit trên `main` đã test thành công trên Blogger:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Workflow `release.yml` gọi cùng `scripts/validate_theme.py`, tạo SHA-256 checksum và đóng gói:
- `blogger/fusumi-careers-theme.xml`
- `blogger/fusumi-careers-theme.xml.sha256`

Khi push tag `v*`, workflow tạo GitHub Release với generated notes và cả hai asset trên.

Dùng semantic versioning:
- PATCH: sửa lỗi không đổi chức năng chính.
- MINOR: thêm tính năng tương thích ngược.
- MAJOR: thay đổi lớn/có thể cần cấu hình lại Blogger.

## 7. Branch protection cho `main`
Ruleset `Protect main` đang dùng:
- Require a pull request before merging.
- Require status check `validate-theme`.
- Require branches to be up to date before merging.
- Squash-only + linear history.
- Block force pushes.
- Block branch deletion.

## 8. GitHub Project
Project: `Fusumi Careers Roadmap`

Fields:
- Status: Backlog / Ready / In progress / Review / Done
- Priority: P0 / P1 / P2 / P3
- Type: Feature / Bug / Ops / Content

Views:
- Board theo Status.
- Table theo Priority.

Seed project bằng các issue roadmap đang mở trong repo.
