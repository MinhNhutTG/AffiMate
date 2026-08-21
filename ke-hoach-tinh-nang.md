# Kế hoạch & danh sách chức năng — AffiMate

Tài liệu tổng hợp, **cập nhật liên tục**, đóng vai trò "nguồn sự thật" duy nhất về: chức năng nào đã xong, đang làm, sắp làm — và các quyết định đã chốt để **không cần dừng lại hỏi** ở những việc đã có phương án hợp lý. Các tài liệu khác (`tailieubandau.md`, `kientruc-ky-thuat.md`, `chuc-nang-tao-anh-ai.md`) vẫn là nguồn chi tiết cho từng mảng; tài liệu này chỉ tổng hợp trạng thái + thứ tự ưu tiên.

> Nguyên tắc làm việc: khi gặp 1 quyết định nhỏ chưa chốt mà có phương án hợp lý (đặt tên biến, giá trị mặc định, copy UI, thứ tự trường form...), **tự chọn phương án hợp lý nhất và ghi chú lại** thay vì dừng hỏi. Chỉ dừng lại hỏi khi: (a) việc **tốn tiền thật** (nâng gói trả phí, mua API key mới), (b) **không thể đảo ngược** (xoá dữ liệu, deploy production, đổi kiến trúc lớn), hoặc (c) **ảnh hưởng định hướng sản phẩm** (đổi phạm vi MVP, đổi đối tượng người dùng).

---

## 1. Bức tranh toàn cảnh (pipeline sản phẩm)

Theo `tailieubandau.md` mục 9, AffiMate hướng tới hỗ trợ đủ luồng làm nội dung Affiliate TikTok:

```
Cung cấp thông tin sản phẩm → Tạo nội dung/kịch bản → Tạo hình ảnh → Tạo lời thoại/voice → Hoàn thiện nội dung quảng bá
```

Ảnh AI được làm trước (dễ triển khai kỹ thuật hơn), nhưng **nội dung/kịch bản mới là phần lõi** cho video TikTok — đã bắt đầu triển khai (mục 3 bên dưới).

---

## 2. Danh sách chức năng — trạng thái hiện tại

Chú thích trạng thái: ✅ Xong & đã commit · 🟡 Đã code, **chưa commit/chưa test kỹ** · ⬜ Chưa code (kế hoạch)

### 2.1 Auth & User

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Đăng ký / đăng nhập bằng email | ✅ | JWT + bcrypt |
| Xem/sửa thông tin cá nhân (`/api/users/me`) | ✅ | |
| Phân quyền `user` / `admin` | ✅ | `requireRole` middleware |

### 2.2 Admin

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| CRUD người dùng (list/search/sửa role,status/xoá) | ✅ | `admin.routes.js` |
| Thẻ số liệu tổng quan (`GET /api/admin/stats`) | 🟡 | Mới thêm: tổng user, banned, admin, product, ảnh AI đã tạo. Chưa có số liệu content AI — nên bổ sung `totalGeneratedContents` cho đồng bộ (việc nhỏ, tự làm không cần hỏi) |
| Script tạo tài khoản admin đầu tiên (`backend/scripts/createAdmin.js`) | 🟡 | Đã có `npm run create-admin`, cần test chạy thử 1 lần |
| Trang Admin — quản lý người dùng (`AdminUsersPage`) | 🟡 | Desktop-first theo đúng `tailieubandau.md` mục 6 |

### 2.3 Sản phẩm (Product)

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Tạo sản phẩm, upload nhiều ảnh gốc | ✅ | Cloudinary |
| Danh sách / chi tiết / sửa / xoá sản phẩm | ✅ | |

### 2.4 Tạo ảnh AI (`chuc-nang-tao-anh-ai.md`)

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Xoá nền | ✅ | PhotoRoom Basic (`/v1/segment`) |
| Đổi màu nền (preset + color picker tự do) | ✅ | |
| Quota 10 lượt/user/ngày | ✅ | `quotaService.consumeQuota` |
| Lịch sử ảnh đã tạo, tải xuống, xoá | ✅ | |
| "Mô tả nền theo ý bạn" (backgroundPrompt AI) | ⬜ **Khoá có chủ đích** | Đã code cả 2 provider (PhotoRoom Sandbox watermark, Cloudflare hay quá tải) nhưng **chưa đủ ổn định để mở** — xem điều kiện mở lại ở `chuc-nang-tao-anh-ai.md` mục 11 câu 13. Không tốn công đến khi 1 trong 3 điều kiện đó xảy ra. |
| **"Mô tả ảnh (ChatGPT)" — trợ lý tạo prompt JSON để user tự dán vào ChatGPT vẽ ảnh** | 🟡 **Mới, chưa có tài liệu spec** | `ImagePromptPage.jsx` — thuần frontend, không gọi AI backend, không tốn quota/chi phí. Là giải pháp thay thế thông minh cho backgroundPrompt (né hẳn vấn đề watermark/quá tải). **Cần**: viết mục spec ngắn bổ sung vào `chuc-nang-tao-anh-ai.md` (hoặc file riêng) mô tả logic sinh JSON từ thông tin sản phẩm + màu nền chọn. |

### 2.5 Tạo nội dung/kịch bản AI (MỚI — chưa có tài liệu spec riêng)

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Model `GeneratedContent` (hook/body/cta, tone, status) | 🟡 | Mirror `GeneratedImage` |
| `POST /products/:id/generate-content` | 🟡 | 3 tone: gần gũi / hài hước / chuyên nghiệp |
| `GET /products/:id/contents` — lịch sử | 🟡 | |
| `DELETE /contents/:id` | 🟡 | |
| Quota riêng `contentGenUsage` (10/ngày, mirror ảnh) | 🟡 | `DAILY_CONTENT_GEN_LIMIT` |
| Provider Cloudflare Workers AI (`llama-3.1-8b-instruct`) | 🟡 | Free, tái dùng credentials Cloudflare đã có cho ảnh |
| Trang `GenerateContentPage` (chọn tone → xem hook/body/cta → copy) | 🟡 | |
| **Việc thiếu**: `.env.example` chưa có `CONTENT_AI_PROVIDER`, `CLOUDFLARE_CONTENT_MODEL`, `CLOUDFLARE_CONTENT_TIMEOUT_MS`, `DAILY_CONTENT_GEN_LIMIT` | ⬜ | Việc nhỏ, tự bổ sung không cần hỏi |
| **Việc thiếu**: chưa có testing checklist kiểu mục 10 `chuc-nang-tao-anh-ai.md` (quota hết, JSON lỗi định dạng, timeout, ownership 403...) | ⬜ | Nên viết + chạy trước khi coi là "xong" |

### 2.6 Voice AI (định hướng, chưa bắt đầu)

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Tạo giọng đọc AI từ nội dung đã tạo | ⬜ | Theo `tailieubandau.md` mục 3 — sau content AI. Cần khảo sát provider free tier (tương tự việc đã làm với ảnh/content) trước khi code. |

### 2.7 Hạ tầng / vận hành

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Deploy backend (Render) + frontend (Vercel) | ⬜ | `render.yaml` (Blueprint, free tier) đã có ở gốc repo. `app.js` đã đọc `FRONTEND_URL` để siết CORS khi deploy — không set thì mặc định mở (local dev). Các bước còn lại cần thao tác trực tiếp trên dashboard Render/Vercel (đăng nhập tài khoản) — xem mục 3.7 bên dưới |
| `AI_FEATURE_DISABLED` cờ tắt khẩn cấp toàn hệ thống | ⬜ | Đề xuất ở `chuc-nang-tao-anh-ai.md` mục 5, chưa thấy code — nên làm chung cho cả ảnh lẫn content khi có thời gian, không gấp |

---

## 3. Việc tiếp theo — thứ tự ưu tiên đề xuất

Thứ tự dưới đây là đề xuất mặc định để cứ thế làm tiếp, không cần hỏi lại từng bước:

1. **Chạy thử & test tính năng Content AI + Admin** (mục 2.2, 2.5) — vì code đã viết xong nhưng chưa test thực tế qua UI. Dùng checklist tương tự mục 10 `chuc-nang-tao-anh-ai.md`.
2. **Vá các lỗ hổng tài liệu/config nhỏ** phát hiện ở trên: bổ sung `.env.example`, thêm `totalGeneratedContents` vào `/admin/stats`.
3. **Viết bổ sung tài liệu spec** cho 2 tính năng mới (Content AI, Image-Prompt helper) — theo đúng format `chuc-nang-tao-anh-ai.md` để đồng bộ phong cách tài liệu.
4. **Commit toàn bộ thay đổi hiện tại** thành các commit rõ ràng theo từng nhóm chức năng (Content AI, Admin dashboard, UI polish) sau khi đã test xong bước 1.
5. **Khảo sát provider Voice AI** (free tier) — làm trước khi code, giống cách đã khảo sát kỹ provider ảnh/content, để tránh chọn sai rồi phải đổi giữa chừng.
6. **Voice AI MVP** — theo kiến trúc tương tự (model riêng, quota riêng, provider layer tách biệt).
7. **Deploy** khi các tính năng MVP (auth, admin, ảnh, content) đã ổn định qua test — đây là bước có chi phí/rủi ro vận hành, nên xác nhận trước khi bấm nút deploy thật.

### 3.7 Hướng dẫn deploy free — Render (backend) + Vercel (frontend)

Hạ tầng đã chuẩn bị sẵn trong repo (`render.yaml`, CORS đọc `FRONTEND_URL`). Các bước dưới đây cần đăng nhập dashboard Render/Vercel nên phải tự thao tác:

1. **Render** → New → Blueprint → chọn repo `AffiMate` → Render tự đọc `render.yaml`. Điền các biến đánh dấu "sync: false" bằng giá trị thật trong `backend/.env` (MONGODB_URI, JWT_SECRET, CLOUDINARY_*, PHOTOROOM_API_KEY, CLOUDFLARE_*). `FRONTEND_URL` để trống ở bước này, điền sau khi có domain Vercel.
2. Deploy xong, lấy URL dạng `https://affimate-backend.onrender.com`. Free tier: instance ngủ sau ~15 phút không traffic, request đầu tiên sau đó chậm (cold start).
3. **Vercel** → New Project → import repo, root directory `frontend`, framework Vite (auto-detect). Thêm env `VITE_API_BASE_URL=https://affimate-backend.onrender.com/api`. Deploy → lấy domain dạng `https://affimate.vercel.app`.
4. Quay lại Render, điền `FRONTEND_URL=https://affimate.vercel.app` (thêm cả `http://localhost:5173` nếu vẫn muốn dev local gọi được backend production, cách nhau dấu phẩy) → Render tự redeploy.
5. Test lại toàn bộ luồng (đăng nhập, tạo sản phẩm, tạo ảnh AI, tạo content AI, admin) trên domain thật trước khi coi là xong.

---

## 4. Quyết định đã chốt (để không hỏi lại)

- Quota content AI = **10 lượt/user/ngày**, cùng cơ chế reset theo giờ VN như ảnh AI — hợp lý vì cùng nhóm người dùng, cùng mức độ "tài nguyên miễn phí giới hạn".
- Provider content AI mặc định: **Cloudflare Workers AI** (`llama-3.1-8b-instruct`) — tái dùng credentials đã có, free tier, không cần khảo sát thêm cho bản đầu.
- Tính năng "Mô tả ảnh (ChatGPT)" là **thay thế hợp lệ** cho backgroundPrompt bị khoá, không phải tính năng tạm — giữ nguyên, không cần gỡ khi backgroundPrompt được mở lại (2 tính năng phục vụ nhu cầu khác nhau: 1 cái AI tự vẽ, 1 cái hỗ trợ user tự vẽ qua ChatGPT).
- Việc nâng gói trả phí (PhotoRoom Plus, Cloudflare trả phí, Google Gemini/Nano Banana...) **luôn cần hỏi xác nhận trước** — đây là quyết định tốn tiền thật, không tự quyết.
- Deploy production **luôn cần xác nhận trước** khi thực hiện lần đầu hoặc khi đổi hạ tầng.

---

## 5. Nhật ký cập nhật tài liệu

- 2026-08-20 — Tạo tài liệu, tổng hợp trạng thái tại thời điểm: Content AI + Admin dashboard đã code xong (chưa commit, chưa test), tính năng Image-Prompt (ChatGPT helper) phát hiện thêm chưa có trong tài liệu cũ nào.
- 2026-08-21 — Đã commit + push toàn bộ Content AI, Admin dashboard, Image-Prompt helper (5 commit theo nhóm chức năng). Chuẩn bị hạ tầng deploy free: `render.yaml` (Blueprint), CORS đọc `FRONTEND_URL`, đổi `JWT_SECRET` yếu (`helpmom`) sang chuỗi ngẫu nhiên mạnh trong `.env` local. Còn thiếu: test qua UI, chạy thử `create-admin`, và tự thao tác deploy trên dashboard Render/Vercel (xem mục 3.7).
