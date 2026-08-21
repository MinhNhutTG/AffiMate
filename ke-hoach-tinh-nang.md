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
| "Mô tả nền theo ý bạn" (backgroundPrompt AI) | ⬜ **Khoá có chủ đích** | Đã code cả 2 provider (PhotoRoom Sandbox watermark, Cloudflare hay quá tải) nhưng **chưa đủ ổn định để mở** — xem điều kiện mở lại ở `chuc-nang-tao-anh-ai.md` mục 11 câu 13. Không tốn công đến khi 1 trong 3 điều kiện đó xảy ra. Thiết kế cờ `AI_FEATURE_DISABLED` đã đề xuất cụ thể ở mục 5.1 tài liệu đó — chưa code. |
| **"Mô tả ảnh (ChatGPT)" — trợ lý tạo prompt JSON để user tự dán vào ChatGPT vẽ ảnh** | 🟡 | `ImagePromptPage.jsx` — thuần frontend, không gọi AI backend, không tốn quota/chi phí. Đã có tài liệu spec đầy đủ ở `chuc-nang-tao-anh-ai.md` mục 12. Còn thiếu: chạy testing checklist qua UI thật. |

### 2.5 Tạo nội dung/kịch bản AI (`chuc-nang-noi-dung-ai.md`)

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Model `GeneratedContent` (hook/body/cta, tone, status) | 🟡 | Mirror `GeneratedImage` |
| `POST /products/:id/generate-content` | 🟡 | 3 tone: gần gũi / hài hước / chuyên nghiệp |
| `GET /products/:id/contents` — lịch sử | 🟡 | |
| `DELETE /contents/:id` | 🟡 | |
| Quota riêng `contentGenUsage` (10/ngày, mirror ảnh) | 🟡 | `DAILY_CONTENT_GEN_LIMIT` |
| Provider Cloudflare Workers AI (`llama-3.1-8b-instruct`) | 🟡 | Free, tái dùng credentials Cloudflare đã có cho ảnh |
| Trang `GenerateContentPage` (chọn tone → xem hook/body/cta → copy) | 🟡 | |
| Tài liệu spec đầy đủ | ✅ | `chuc-nang-noi-dung-ai.md` — mirror format `chuc-nang-tao-anh-ai.md`, kèm testing checklist chi tiết (mục 8) |
| **Bug nhỏ phát hiện khi viết tài liệu**: copy UI ở state lỗi ("lượt dùng hôm nay của bạn không bị mất thêm") sai thực tế — quota đã bị trừ trước khi gọi AI nên vẫn tính vào lượt ngày dù lỗi | ⬜ | Xem `chuc-nang-noi-dung-ai.md` mục 9.2 — sửa copy, việc nhỏ |
| **Việc thiếu**: chưa chạy testing checklist qua UI thật | ⬜ | Xem `chuc-nang-noi-dung-ai.md` mục 8 |

### 2.6 Voice AI (định hướng, chưa bắt đầu)

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Tạo giọng đọc AI từ nội dung đã tạo | ⬜ | Theo `tailieubandau.md` mục 3 — sau content AI. **Đã khảo sát provider free tier** (2026-08-21, qua web search), xem kết quả bên dưới — chưa code, chưa xác nhận với user. |

**Kết quả khảo sát provider Voice AI (free tier)** — mục tiêu: đọc được văn bản tiếng Việt tự nhiên (nội dung sinh ra 100% tiếng Việt, xem `chuc-nang-noi-dung-ai.md`), free tier đủ dùng cho quy mô nhỏ ban đầu:

| Provider | Free tier | Tiếng Việt | Ghi chú |
|---|---|---|---|
| **FPT.AI Text to Speech** (đề xuất chính) | 100.000 ký tự/tháng | ✅ **Chuyên biệt tiếng Việt**, nhiều giọng vùng miền (Bắc/Trung/Nam), chất lượng tự nhiên hơn hẳn TTS đa ngôn ngữ khi đọc tiếng Việt | REST API + docs tiếng Anh rõ ràng (`docs.fpt.ai`). Cần tạo tài khoản riêng (không tái dùng được Cloudinary/Cloudflare/PhotoRoom đã có) — **chưa xác nhận có cần thẻ tín dụng lúc đăng ký không**, cần tự đăng ký thử trước khi code. |
| Google Cloud Text-to-Speech | 4 triệu ký tự/tháng (giọng Standard), 1 triệu (WaveNet/Neural2) — rất rộng rãi | ✅ Có giọng `vi-VN` nhưng là giọng đa ngôn ngữ chung, phát âm tiếng Việt không tự nhiên bằng provider chuyên biệt | Cần tài khoản Google Cloud — theo thông lệ thường yêu cầu khai báo thẻ để xác minh (dù free tier không tính phí nếu không vượt hạn mức) → **nếu đúng vậy, cần hỏi xác nhận trước** theo nguyên tắc mục 4 bên dưới (nhập thông tin thẻ, dù không mất tiền, vẫn là hành động nhạy cảm nên hỏi trước). Dùng làm phương án dự phòng nếu FPT.AI có vướng mắc. |
| Cloudflare Workers AI (`@cf/myshell-ai/melotts`) | Miễn phí trong hạn mức neuron/ngày đã dùng chung (tái dùng account hiện có, không cần đăng ký thêm) | ❌ **Chưa xác nhận hỗ trợ tiếng Việt** — MeloTTS gốc công bố hỗ trợ EN/ES/FR/ZH/JP/KR, không thấy liệt kê VN | Ưu điểm lớn nhất là tái dùng credential Cloudflare sẵn có, nhưng rủi ro không dùng được cho use case chính (nội dung tiếng Việt) — cần test thật với văn bản tiếng Việt trước khi cân nhắc nghiêm túc, khả năng cao phải loại. |
| ElevenLabs, ~~ai voice khác~~ | Free tier có nhưng giới hạn thấp (thường vài nghìn ký tự/tháng), một số yêu cầu thẻ | — | Không ưu tiên khảo sát sâu — free tier quá hẹp so với nhu cầu (mirror quota 10 lượt/ngày như ảnh/content), phù hợp demo hơn dùng thật. |

**Đề xuất**: thử FPT.AI trước (tự đăng ký tài khoản, xác nhận không cần thẻ, gọi thử API với 1 đoạn kịch bản đã sinh từ Content AI) — nếu ổn thì chốt làm provider chính; nếu vướng (cần thẻ, hạn chế lạ) thì chuyển sang khảo sát kỹ hơn Google Cloud TTS làm phương án 2. Việc này là **khảo sát tiếp theo cần user tự thao tác** (đăng ký tài khoản ngoài), không phải việc code được ngay.

### 2.7 Hạ tầng / vận hành

| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Deploy backend (Render) + frontend (Vercel) | ⬜ | `render.yaml` (Blueprint, free tier) đã có ở gốc repo. `app.js` đã đọc `FRONTEND_URL` để siết CORS khi deploy — không set thì mặc định mở (local dev). Các bước còn lại cần thao tác trực tiếp trên dashboard Render/Vercel (đăng nhập tài khoản) — xem mục 3.7 bên dưới |
| `AI_FEATURE_DISABLED` cờ tắt khẩn cấp toàn hệ thống | ⬜ | **Đã có thiết kế cụ thể** ở `chuc-nang-tao-anh-ai.md` mục 5.1 (SystemConfig trong Mongo, middleware `checkAiEnabled`, API admin bật/tắt) — chưa code, không gấp, làm chung cho cả ảnh lẫn content khi có thời gian |

---

## 3. Việc tiếp theo — thứ tự ưu tiên đề xuất

Thứ tự dưới đây là đề xuất mặc định để cứ thế làm tiếp, không cần hỏi lại từng bước. Đã đánh dấu ✅ những việc hoàn thành trong phiên làm việc 2026-08-21:

1. ✅ **Commit + push toàn bộ thay đổi hiện tại** — 5 commit theo nhóm chức năng (Content AI, Image-Prompt, Admin dashboard, wiring/UI polish, docs) đã lên `origin/main`.
2. ✅ **Vá lỗ hổng tài liệu/config nhỏ** — `.env.example` và `/admin/stats` (`totalGeneratedContents`) hoá ra đã được bổ sung sẵn trong code trước khi rà soát, không cần làm thêm.
3. ✅ **Viết bổ sung tài liệu spec** cho Content AI (`chuc-nang-noi-dung-ai.md`, file mới) và Image-Prompt helper (`chuc-nang-tao-anh-ai.md` mục 12) — đầy đủ user flow, data model, API spec, testing checklist theo đúng format tài liệu cũ.
4. ✅ **Thiết kế cờ `AI_FEATURE_DISABLED`** — cụ thể hoá ở `chuc-nang-tao-anh-ai.md` mục 5.1, chưa code.
5. ✅ **Khảo sát provider Voice AI** (free tier, qua web search) — đề xuất chính **FPT.AI TTS** (chuyên tiếng Việt, 100k ký tự/tháng), xem mục 2.6. Việc tiếp theo cần **user tự đăng ký tài khoản** để xác nhận điều kiện thực tế (có cần thẻ không) trước khi code.
6. ✅ **Chuẩn bị hạ tầng deploy** — `render.yaml`, CORS qua `FRONTEND_URL`, đổi `JWT_SECRET` yếu — xem mục 3.7.
7. **Chạy thử & test tính năng Content AI + Image-Prompt + Admin qua UI thật** (mục 2.2, 2.4, 2.5) — **việc còn lại quan trọng nhất**, dùng đúng testing checklist đã viết ở `chuc-nang-noi-dung-ai.md` mục 8 và `chuc-nang-tao-anh-ai.md` mục 12.4. Chưa làm vì cần chạy backend + frontend local và thao tác qua trình duyệt.
8. **Chạy thử `npm run create-admin`** ít nhất 1 lần — script đã có, chưa test.
9. Sau bước 7, sửa bug copy UI nhỏ đã phát hiện ở `chuc-nang-noi-dung-ai.md` mục 9.2.
10. **User tự đăng ký tài khoản FPT.AI**, xác nhận điều kiện free tier thật → quay lại chốt provider Voice AI.
11. **Voice AI MVP** — theo kiến trúc tương tự (model riêng, quota riêng, provider layer tách biệt) — sau khi có provider đã chốt.
12. **Deploy thật lên Render/Vercel** khi các tính năng MVP đã ổn định qua test (bước 7) — bước có rủi ro vận hành, cần xác nhận trước khi bấm nút deploy thật (theo mục 3.7, đã có hướng dẫn từng bước).

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
- Provider Voice AI đề xuất chính: **FPT.AI Text to Speech** (100k ký tự/tháng free, chuyên tiếng Việt) — nhưng **chưa chốt hẳn**, cần user tự đăng ký tài khoản xác nhận điều kiện thực tế trước khi code (xem mục 2.6). Google Cloud TTS là phương án 2 nếu FPT.AI vướng.
- Đăng ký tài khoản dịch vụ ngoài mới (vd FPT.AI) dù miễn phí vẫn cần **user tự thao tác** (email/thông tin cá nhân của họ) — không tự đăng ký hộ.

---

## 5. Nhật ký cập nhật tài liệu

- 2026-08-20 — Tạo tài liệu, tổng hợp trạng thái tại thời điểm: Content AI + Admin dashboard đã code xong (chưa commit, chưa test), tính năng Image-Prompt (ChatGPT helper) phát hiện thêm chưa có trong tài liệu cũ nào.
- 2026-08-21 — Đã commit + push toàn bộ Content AI, Admin dashboard, Image-Prompt helper (5 commit theo nhóm chức năng). Chuẩn bị hạ tầng deploy free: `render.yaml` (Blueprint), CORS đọc `FRONTEND_URL`, đổi `JWT_SECRET` yếu (`helpmom`) sang chuỗi ngẫu nhiên mạnh trong `.env` local.
- 2026-08-21 (tiếp) — Viết đầy đủ tài liệu spec còn thiếu: `chuc-nang-noi-dung-ai.md` (Content AI, file mới), mục 12 "Mô tả ảnh (ChatGPT)" và mục 5.1 thiết kế `AI_FEATURE_DISABLED` bổ sung vào `chuc-nang-tao-anh-ai.md`. Khảo sát provider Voice AI free tier (FPT.AI, Google Cloud TTS, Cloudflare MeloTTS) — đề xuất FPT.AI. Còn thiếu: test qua UI, chạy thử `create-admin`, user tự đăng ký FPT.AI, và tự thao tác deploy trên dashboard Render/Vercel (xem mục 3.7).
