# Tài liệu chức năng — Sinh nội dung/kịch bản AI

Tài liệu này cụ thể hoá tính năng "Sinh nội dung tự động" nhắc tới ở `chuc-nang-tao-anh-ai.md` mục 1, 3.1 (placeholder lúc đó) và `kientruc-ky-thuat.md` mục 7. Khác với 2 tài liệu kia (viết trước khi code), tài liệu này viết **sau khi đã code xong** — mô tả đúng những gì đã cài đặt thực tế, kèm phần còn thiếu (testing, xác nhận) để hoàn thiện. Theo cùng format với `chuc-nang-tao-anh-ai.md` để đồng bộ phong cách tài liệu — xem `ke-hoach-tinh-nang.md` mục 2.5.

---

## 1. Mục đích & phạm vi

Từ trang chi tiết sản phẩm, user bấm "Sinh nội dung tự động" → chọn 1 trong 3 tông giọng → AI sinh ra kịch bản ngắn (hook/body/cta) để đọc khi quay video TikTok Affiliate cho sản phẩm đó. Đây là mảnh ghép **lõi** của pipeline AffiMate (theo `tailieubandau.md` mục 9: nội dung/kịch bản mới là phần chính cho TikTok, ảnh chỉ hỗ trợ).

Phạm vi hiện tại (đã code):
- Sinh nội dung dựa trên `product.name` + `product.description` — **không** dùng ảnh sản phẩm hay các field mở rộng khác (product chưa có field mở rộng, xem `chuc-nang-tao-anh-ai.md` mục 4).
- 3 tông giọng cố định: gần gũi / hài hước / chuyên nghiệp — không cho tự do nhập tông giọng khác.
- Mỗi lần tạo là 1 bản ghi độc lập (`GeneratedContent`), không có khái niệm "sửa" hay "tạo tiếp nối" từ bản trước.
- Không bao gồm: chọn độ dài nội dung, chọn ngôn ngữ khác tiếng Việt, tạo nhiều phương án cùng lúc để so sánh, đưa ảnh sản phẩm vào prompt (multimodal).

---

## 2. Actor

| Actor | Quyền |
|---|---|
| User (đã login) | Sinh nội dung cho sản phẩm của chính mình, xem/xoá nội dung đã tạo của chính mình |
| Admin | Không thao tác trực tiếp, chỉ thấy tổng số lượt đã tạo qua `GET /api/admin/stats` (`totalGeneratedContents`) |

---

## 3. User flow

1. User ở trang chi tiết sản phẩm (`ProductDetailPage`) → bấm thẻ "Sinh nội dung tự động" → sang `GenerateContentPage` (`/products/:id/generate-content`).
2. Chọn 1 trong 3 tông giọng (mặc định `gan-gui`) → bấm "Tạo kịch bản".
3. Frontend chuyển sang state `generating` (chặn thao tác thêm) → gọi `POST /api/products/:id/generate-content` `{ tone }`.
4. Backend (`content.controller.js`):
   - `loadOwnedProduct(req)` — kiểm tra sản phẩm tồn tại và thuộc user hiện tại (404/403), dùng chung hàm với `image.controller.js`.
   - Validate `tone` — nếu không nằm trong 3 giá trị hợp lệ, âm thầm fallback về `gan-gui` (không trả lỗi 400 — khác với cách xử lý `options` ảnh AI vốn trả 400 khi có key lạ; chấp nhận được vì `tone` không phải do client tự nhập tự do, chỉ có 3 nút chọn ở UI).
   - Trừ quota **trước khi** gọi AI (`quotaService.consumeContentQuota`) — cùng nguyên tắc với ảnh AI, tránh lãng phí quota khi chắc chắn sẽ bị chặn.
   - Tạo bản ghi `GeneratedContent(status='pending')`.
   - Gọi `contentAiService.generate({ productName, productDescription, tone })`.
   - Thành công: lưu `hook/body/cta`, `status='success'`.
   - Lỗi: `status='failed'`, `errorMessage` thân thiện (phân biệt timeout vs lỗi khác), trả `502` — **không** hoàn lại lượt quota đã trừ (chấp nhận được ở MVP, giống hệt cách xử lý của ảnh AI).
5. Frontend hiện kết quả dạng 3 khối (Hook/Nội dung chính/CTA), mỗi khối có nút "Sao chép" riêng + nút "Sao chép tất cả".
6. Lịch sử các lần tạo hiện ở `ProductDetailPage` (`GET /products/:id/contents`), xoá được từng bản ghi (`DELETE /contents/:id`).

### 3.1 UI states

| State | Mô tả | UI |
|---|---|---|
| `options` | Chưa tạo | Chọn tông giọng, nút "Tạo kịch bản" |
| `generating` | Đang gọi AI | Spinner, thông báo "có thể mất 10–20 giây" |
| `result` | Có `hook/body/cta` | 3 khối nội dung + copy từng phần/tất cả + nút "Tạo kịch bản khác" |
| `error` | Lỗi/timeout | Thông báo "hệ thống đang bận" + nút thử lại + nhắc rõ "lượt dùng hôm nay không bị mất thêm" (dù thực tế BE **có** trừ quota cho lượt lỗi — xem mục 6, cần xem lại copy này) |
| `quota` | Hết quota ngày | Thông báo giờ reset, nút "Tạo kịch bản" bị khoá |

---

## 4. Data model

### GeneratedContent (đã tạo — `backend/src/models/GeneratedContent.js`)

```js
{
  userId: ObjectId,      // ref User, required, index
  productId: ObjectId,   // ref Product, required, index
  provider: String,      // default 'cloudflare'
  tone: { enum: ['gan-gui', 'hai-huoc', 'chuyen-nghiep'], default: 'gan-gui' },
  hook: String,
  body: String,
  cta: String,
  status: { enum: ['pending', 'success', 'failed'], default: 'pending' },
  errorMessage: String,
  createdAt, updatedAt   // timestamps: true
}
```

### User — quota (đã thêm vào `backend/src/models/User.js`)

```js
{
  contentGenUsage: {
    date: String,   // 'YYYY-MM-DD' giờ VN — cùng cơ chế imageGenUsage
    count: Number,
  }
}
```

---

## 5. Business rule — Quota

- **10 lượt/user/ngày** (`DAILY_CONTENT_GEN_LIMIT`, mặc định 10 nếu không set env) — **[ĐÃ CHỐT]** theo `ke-hoach-tinh-nang.md` mục 4: cùng nhóm người dùng, cùng mức "tài nguyên miễn phí giới hạn" như ảnh AI nên dùng chung con số, không cần khảo sát riêng.
- Cơ chế reset: theo giờ VN (UTC+7), giống hệt `imageGenUsage` — dùng chung hàm `consumeQuotaField` đã refactor trong `quotaService.js` (tách từ `consumeQuota` gốc, xem git log).
- Trừ quota **trước** khi gọi Cloudflare — tránh gọi AI vô ích khi chắc chắn bị chặn.
- **Chưa có** cờ `AI_FEATURE_DISABLED` tắt khẩn cấp toàn hệ thống khi Cloudflare gặp sự cố diện rộng — xem mục 9 (Việc cần làm thêm), nên làm chung cho cả ảnh và content khi có thời gian (đã ghi trong `ke-hoach-tinh-nang.md` mục 2.7, không gấp vì Cloudflare free tier hiện ổn định hơn PhotoRoom Sandbox watermark).
- Cloudflare free tier: **10.000 neurons/ngày chung toàn tài khoản** (không phải theo user) — tái dùng credential đã có cho `backgroundPrompt` (`chuc-nang-tao-anh-ai.md` mục 6, mục 11 câu 14). Model text-generation (`llama-3.1-8b-instruct`) tốn ít neuron hơn nhiều so với model ảnh, nhưng vẫn **chưa có cơ chế đếm/cảnh báo khi gần chạm trần chung** — rủi ro giống hệt đã ghi nhận với ảnh AI, chấp nhận được ở quy mô người dùng hiện tại (theo `tailieubandau.md` mục 1: chỉ phục vụ người quen biết ban đầu).

---

## 6. Provider & xử lý lỗi

- Kiến trúc tách provider giống ảnh AI (`chuc-nang-tao-anh-ai.md` mục 9.2): controller chỉ gọi `contentAiService.generate()`, không biết provider cụ thể — đổi provider chỉ cần thêm file mới vào `backend/src/services/contentAi/providers/` + đăng ký trong `index.js`, đổi qua env `CONTENT_AI_PROVIDER`.
- Provider hiện có: `cloudflare` (`providers/cloudflareText.js`) — model mặc định `@cf/meta/llama-3.1-8b-instruct` (đổi qua `CLOUDFLARE_CONTENT_MODEL`), timeout 30s (`CLOUDFLARE_CONTENT_TIMEOUT_MS`).
- Prompt yêu cầu model trả **JSON thuần** (`{hook, body, cta}`), có strip code-fence (```json ... ```) trước khi parse vì model instruct đôi khi tự bọc markdown quanh JSON.
- Lỗi phân loại rõ: `ContentAiTimeoutError` (hết `CLOUDFLARE_CONTENT_TIMEOUT_MS`) vs `ContentAiUpstreamError` (HTTP lỗi từ Cloudflare, JSON không hợp lệ, thiếu field, chưa cấu hình credentials) — controller map cả 2 loại thành `errorMessage` thân thiện khác nhau cho user.
- Model trả theo format tương thích OpenAI chat completions (`result.choices[0].message.content`) — đã xác nhận qua test thật (khác model cũ dùng `result.response`, ghi chú lại trong code để tránh nhầm khi đổi model).
- **Chưa test thật qua UI** trường hợp: Cloudflare trả lỗi/JSON hỏng, timeout, chưa cấu hình credentials — chỉ mới verify logic bằng đọc code (xem mục 8 testing checklist).

---

## 7. API spec

### 7.1 `POST /api/products/:id/generate-content`

Request:
```json
{ "tone": "gan-gui" }
```
> `tone` không hợp lệ hoặc thiếu → tự fallback `gan-gui`, không trả lỗi (khác quyết định của ảnh AI với `options` lạ — xem mục 3 giải thích lý do).

Response 200:
```json
{
  "_id": "665...",
  "userId": "...",
  "productId": "...",
  "provider": "cloudflare",
  "tone": "gan-gui",
  "hook": "...",
  "body": "...",
  "cta": "...",
  "status": "success",
  "createdAt": "2026-08-21T10:00:00Z"
}
```

Response lỗi:
| Status | Khi nào | Body |
|---|---|---|
| 403 | Sản phẩm không thuộc user hiện tại | `{ message: "Không có quyền" }` |
| 404 | Không tìm thấy sản phẩm | `{ message: "Không tìm thấy sản phẩm" }` |
| 429 | Hết quota content trong ngày | `{ message: "Đã hết lượt tạo nội dung hôm nay", resetAt: "..." }` |
| 502 | Cloudflare lỗi/timeout/JSON hỏng | `{ message: "Hết thời gian chờ tạo nội dung" }` hoặc `{ message: "Không tạo được nội dung, vui lòng thử lại" }` |

### 7.2 `GET /api/products/:id/contents?page=&limit=`

Trả `{ items, total, page, limit }`, sắp mới nhất trước — cùng shape với `GET /api/products/:id/images`.

### 7.3 `DELETE /api/contents/:id`

Kiểm tra ownership (`content.userId === req.user._id`), xoá bản ghi. **Khác** `DELETE /api/images/:id`: không có file ngoài (Cloudinary) cần dọn theo, vì nội dung chỉ là text lưu trong Mongo — xoá bản ghi là đủ, không cần bước dọn tài nguyên ngoài.

---

## 8. Testing checklist — cần chạy trước khi coi là "xong" (theo `ke-hoach-tinh-nang.md` mục 2.5)

- [ ] Tạo nội dung thành công với cả 3 tông giọng → `status=success`, hook/body/cta hợp lý, đúng giọng điệu yêu cầu.
- [ ] Tạo nội dung khi sản phẩm không có `description` → vẫn tạo được (prompt có nhánh `(không có mô tả)`).
- [ ] Gọi `generate-content` trên sản phẩm của user khác → 403.
- [ ] Gọi `generate-content` với id sản phẩm không tồn tại → 404.
- [ ] Gọi khi đã hết quota ngày → 429, không gọi Cloudflare (kiểm tra qua log/mock call count).
- [ ] Cloudflare trả lỗi HTTP (mock 4xx/5xx) → `status=failed`, `502`, không crash server, quota vẫn bị trừ (xác nhận đúng ý đồ thiết kế, khớp copy UI ở mục 3.1 hay không).
- [ ] Cloudflare timeout (mock delay > `CLOUDFLARE_CONTENT_TIMEOUT_MS`) → xử lý như lỗi, `errorMessage` đúng là "Hết thời gian chờ tạo nội dung".
- [ ] Cloudflare trả JSON không hợp lệ / thiếu field hook-body-cta → `ContentAiUpstreamError`, không crash.
- [ ] Cloudflare trả JSON bọc trong ```json ... ``` → parse đúng sau khi strip code-fence.
- [ ] Chưa cấu hình `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` → lỗi rõ ràng, không crash.
- [ ] `GET /products/:id/contents` phân trang đúng, sắp xếp mới nhất trước.
- [ ] `DELETE /contents/:id` trên nội dung của user khác → 403; xoá đúng của mình → 204, không còn trong danh sách.
- [ ] Frontend: copy từng phần (hook/body/cta) và "sao chép tất cả" hoạt động đúng trên trình duyệt thật (không chỉ mock).
- [ ] Frontend: state `quota` hiện đúng giờ reset (định dạng `toLocaleString('vi-VN')`).

---

## 9. Việc cần làm thêm (chưa xong, không chặn coi là MVP hoàn chỉnh)

1. Chạy testing checklist mục 8 qua UI thật (đang là ưu tiên #1 theo `ke-hoach-tinh-nang.md` mục 3).
2. Xem lại copy "lượt dùng hôm nay của bạn không bị mất thêm" ở state `error` (`GenerateContentPage.jsx`) — **sai thực tế**, vì quota đã bị trừ trước khi gọi AI nên lượt lỗi vẫn tính vào quota ngày. Cần sửa copy cho đúng, hoặc đổi thiết kế sang hoàn quota khi AI lỗi (đổi thiết kế tốn công hơn, đề xuất chỉ sửa copy ở bản đầu).
3. Cờ `AI_FEATURE_DISABLED` (mục 5) — làm chung với ảnh AI, chưa gấp.
4. Cân nhắc thêm field thông tin sản phẩm mở rộng (giá, danh mục, đối tượng khách hàng...) để prompt sinh nội dung sát hơn — phụ thuộc vào việc chốt danh sách field mở rộng của `Product` (`chuc-nang-tao-anh-ai.md` mục 11 câu 7, vẫn chưa chốt).
