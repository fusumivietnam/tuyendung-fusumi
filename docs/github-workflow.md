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
Workflow `.github/workflows/ci.yml` chạy trên push/PR vào `main` và:
- Parse XML theme bằng Python stdlib.
- Kiểm tra các marker bắt buộc của Blogger/theme tuyển dụng.
- Phát hiện merge conflict marker.
- Kiểm tra các file repo bắt buộc.
- Upload `fusumi-careers-theme.xml` làm artifact.

## 5. Release
Sau khi một commit trên `main` đã test thành công trên Blogger:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Workflow `release.yml` sẽ validate XML rồi tạo GitHub Release, generated notes và đính kèm `blogger/fusumi-careers-theme.xml`.

Dùng semantic versioning:
- PATCH: sửa lỗi không đổi chức năng chính.
- MINOR: thêm tính năng tương thích ngược.
- MAJOR: thay đổi lớn/có thể cần cấu hình lại Blogger.

## 6. Branch protection đề xuất cho `main`
- Require a pull request before merging.
- Require 1 approval.
- Dismiss stale approvals.
- Require status check `validate-theme`.
- Require branches to be up to date before merging.
- Block force pushes.
- Block branch deletion.

## 7. GitHub Project đề xuất
Project: `Fusumi Careers Roadmap`

Fields:
- Status: Backlog / Ready / In progress / Review / Done
- Priority: P0 / P1 / P2 / P3
- Type: Feature / Bug / Ops / Content

Views:
- Board theo Status.
- Table theo Priority.

Seed project bằng các issue roadmap đang mở trong repo.
