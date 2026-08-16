# Tài liệu chức năng — Tạo ảnh sản phẩm bằng AI

Tài liệu này cụ thể hóa mục 2, 3 (Product, GeneratedImage), 4 (API ảnh AI) của `kientruc-ky-thuat.md` thành spec đủ chi tiết để code và test. Các điểm còn "chưa chốt" ở tài liệu kia được đề xuất phương án cụ thể tại đây — đánh dấu **[ĐỀ XUẤT — cần xác nhận]** ở những chỗ cần bạn duyệt lại.

---

## 1. Mục đích & phạm vi

Cho phép user tạo sản phẩm, upload **nhiều ảnh** sản phẩm gốc và điền thông tin sản phẩm, sau đó chọn 1 ảnh trong số đó để dùng AI (PhotoRoom API) xử lý (xóa nền / thay nền) tạo ra ảnh sản phẩm đẹp hơn phục vụ làm nội dung Affiliate trên TikTok, không cần biết dùng Photoshop/Canva.

Từ thẻ sản phẩm, ngoài "Tạo ảnh AI" (spec chi tiết trong tài liệu này), user còn có lựa chọn "Sinh nội dung tự động" — tính năng tạo nội dung/kịch bản, **chưa spec chi tiết ở đây**, chỉ cần chừa chỗ trên UI (xem mục 3.1 bước 5). Tính năng này sẽ có tài liệu riêng khi tới lượt triển khai.

Phạm vi MVP:
- User có thể tạo **nhiều sản phẩm**.
- 1 sản phẩm có thể có **nhiều ảnh gốc** (`Product.originalImageUrls`, mảng URL).
- Khi tạo ảnh AI, user **chọn 1 ảnh cụ thể** trong các ảnh gốc đã upload làm nguồn cho lần tạo đó.
- Từ 1 ảnh gốc đã chọn, user có thể tạo **nhiều lần** ảnh AI với option khác nhau → mỗi lần tạo ra 1 bản ghi `GeneratedImage`, có lưu lại đã dùng ảnh gốc nào (mục 4).
- Không bao gồm: chỉnh sửa ảnh thủ công (crop/filter tay), tạo ảnh từ text (text-to-image), batch nhiều ảnh cùng lúc, spec chi tiết "Sinh nội dung tự động".

---

## 2. Actor

| Actor | Quyền |
|---|---|
| User (đã login) | Upload ảnh gốc, tạo ảnh AI cho sản phẩm của chính mình, xem/xoá ảnh AI của chính mình |
| Admin | Không thao tác trực tiếp tính năng này ở MVP, nhưng cần thấy được thống kê usage (xem mục 8) |

---

## 3. User flow chi tiết

### 3.1 Tạo sản phẩm — upload nhiều ảnh & điền thông tin

1. User vào trang "Sản phẩm của tôi" → bấm "Thêm sản phẩm".
2. Nhập `name` (bắt buộc), `description` (tuỳ chọn), các trường thông tin sản phẩm khác **[ĐỀ XUẤT — placeholder, chưa chốt danh sách field cụ thể, xem mục 4]**, chọn **nhiều** file ảnh gốc (tối thiểu 1 ảnh).
3. Frontend validate trước khi gửi, cho từng ảnh: định dạng `jpg/jpeg/png/webp`, dung lượng ≤ **10MB/ảnh [ĐỀ XUẤT — tăng từ 5MB ban đầu để đủ cho ảnh chụp thẳng từ điện thoại độ phân giải cao, chưa qua nén]**; số lượng ảnh tối đa **[ĐỀ XUẤT — cần chốt, ví dụ tối đa 5 ảnh/sản phẩm]**.
4. Gửi `POST /api/products` (multipart, nhiều field ảnh) → backend validate lại từng ảnh (không tin client), upload từng ảnh lên Cloudinary, lưu `Product.originalImageUrls` (mảng URL).
5. UI hiện sản phẩm với gallery các ảnh gốc đã upload, cùng 2 nút hành động: "Tạo ảnh AI" (mục 3.2) và "Sinh nội dung tự động" (placeholder, chưa spec — có thể hiện dạng "Sắp ra mắt" ở MVP nếu chưa code tính năng này).

### 3.2 Tạo ảnh AI

1. User bấm "Tạo ảnh AI" trên 1 sản phẩm → **chọn 1 ảnh gốc** trong gallery các ảnh đã upload làm nguồn (nếu sản phẩm chỉ có 1 ảnh gốc thì tự động chọn ảnh đó, bỏ qua bước chọn) → mở panel chọn option: "Xoá nền" / "Đổi màu nền" (bảng màu) / **"Mô tả nền theo ý bạn"** (ô nhập text tự do, vd "nền gỗ sáng, ánh nắng tự nhiên") — lựa chọn thứ 3 này cần gói PhotoRoom Plus (xem cảnh báo mục 6), nên hiện kèm nhãn "Cần nâng gói" cho tới khi ngân sách được duyệt.
2. User xác nhận → frontend hiện trạng thái **loading** (không cho bấm tạo tiếp trong lúc chờ) → gửi `POST /api/products/:id/generate-image` kèm `sourceImageUrl` (ảnh gốc đã chọn) + `options`.
3. Backend:
   - Kiểm tra quyền sở hữu (`product.userId === req.user.id`).
   - Kiểm tra `sourceImageUrl` có nằm trong `product.originalImageUrls` không → nếu không, trả `400` (chặn client tự gửi URL ảnh không thuộc sản phẩm này).
   - Kiểm tra **quota còn lại trong ngày** (mục 5) → nếu hết, trả lỗi `429` ngay, không gọi PhotoRoom.
   - Tạo bản ghi `GeneratedImage` với `status = pending`, lưu `sourceImageUrl` đã dùng.
   - Validate & whitelist `options` (mục 6).
   - Gọi PhotoRoom API (dùng ảnh tại `sourceImageUrl`) với timeout **20s [ĐỀ XUẤT]**.
   - Nếu thành công: upload ảnh binary lên Cloudinary (có resize, mục 7) → cập nhật `resultImageUrl`, `status = success`.
   - Nếu lỗi/timeout: cập nhật `status = failed`, `errorMessage` (message thân thiện, không lộ chi tiết kỹ thuật/API key).
4. Trả response tương ứng, frontend hiện ảnh kết quả hoặc thông báo lỗi rõ ràng + cho phép thử lại.
5. Ảnh kết quả được lưu vào lịch sử của sản phẩm (`GET /api/products/:id/images`), user có thể xem lại các lần tạo trước (kèm biết đã tạo từ ảnh gốc nào nếu sản phẩm có nhiều ảnh), tải xuống, hoặc xoá.

### 3.3 Sửa thông tin sản phẩm (không đổi ảnh gốc) rồi tạo ảnh AI

Tình huống: user đã tạo sản phẩm, đã tạo ít nhất 1 `GeneratedImage`, sau đó vào sửa `name`/`description` (không đổi ảnh) rồi bấm "Tạo ảnh AI" tiếp.

1. Sửa thông tin: `PUT /api/products/:id` — body chỉ nhận `name`, `description` (và các field thông tin mở rộng khi đã chốt, mục 4). **Không** cho đổi `originalImageUrls` qua endpoint này ở MVP (thêm/xoá ảnh gốc sau khi tạo sản phẩm — xem câu hỏi mục 11 — hiện tạm coi ảnh gốc chỉ set được lúc tạo sản phẩm).
   - Kiểm tra ownership như các API khác của `Product` (403 nếu không phải chủ sở hữu).
   - Endpoint này hiện **chưa có** trong bảng API ở `kientruc-ky-thuat.md` mục 4 — cần bổ sung (đã cập nhật ở đó).
2. Vì `originalImageUrls` không đổi, các `GeneratedImage` đã tạo trước đó (thuộc về sản phẩm này) vẫn hợp lệ nguyên vẹn, không cần migrate/xử lý gì.
3. Khi bấm "Tạo ảnh AI" (trước hay sau khi sửa thông tin đều như nhau): request `POST /api/products/:id/generate-image` gửi `{sourceImageUrl, options}` (mục 8.2) — **không** gửi kèm file ảnh, vì ảnh đã có sẵn trên Cloudinary từ lúc tạo sản phẩm. Cơ chế backend lấy ảnh gốc để gọi PhotoRoom, làm rõ thêm bước "backend lấy ảnh gốc" đang được nói khá chung ở `kientruc-ky-thuat.md` mục 2:
   - Backend nhận `sourceImageUrl` từ request, đối chiếu với `product.originalImageUrls` **tại thời điểm gọi** (query DB, không cache ở FE) để xác nhận ảnh này thuộc đúng sản phẩm.
   - Backend `fetch` (HTTP GET) nội dung binary của ảnh từ `sourceImageUrl` (Cloudinary) về memory buffer.
   - Forward buffer này trong multipart request tới PhotoRoom, cùng `options` đã whitelist.
   - Không lưu file tạm ra đĩa — nhất quán với `upload` middleware dùng memory storage (mục 5 kiến trúc).
   - Nếu bước fetch từ Cloudinary lỗi (mạng, URL không truy cập được...) → xử lý như lỗi PhotoRoom: `GeneratedImage.status = failed`, trả `502`.
4. Kết luận: sửa `name`/`description` **không ảnh hưởng gì** tới luồng tạo ảnh AI — 2 thao tác độc lập hoàn toàn, chỉ dùng chung 1 bản ghi `Product`. Ảnh gửi cho PhotoRoom luôn là ảnh gốc do user **chủ động chọn** tại thời điểm bấm "Tạo ảnh AI" (bước 3.2.1), không phải ảnh mặc định cố định.

### 3.4 UI states cần xử lý

| State | Mô tả | UI |
|---|---|---|
| `idle` | Chưa tạo ảnh nào | Hiện nút "Tạo ảnh AI" |
| `generating` | Đang gọi API, chờ kết quả | Spinner/skeleton, disable nút tạo, hiện ước lượng thời gian chờ |
| `success` | Có `resultImageUrl` | Hiện ảnh, nút tải xuống, nút tạo thêm |
| `failed` | Có `errorMessage` | Hiện thông báo lỗi dễ hiểu (vd "Ảnh không hợp lệ, thử ảnh khác" / "Hệ thống đang bận, thử lại sau") + nút thử lại |
| `quota_exceeded` | Hết lượt trong ngày | Thông báo rõ số lượt đã dùng, thời điểm reset |

---

## 4. Data model

`Product` và `GeneratedImage` gốc ở `kientruc-ky-thuat.md` cần cập nhật theo phạm vi mới (nhiều ảnh gốc), bổ sung như sau:

### Product — đổi field ảnh gốc từ 1 ảnh sang nhiều ảnh

```js
{
  // ...các field cũ (name, description...)...
  originalImageUrls: [String], // thay cho originalImageUrl (String) cũ — mảng URL Cloudinary, tối thiểu 1 phần tử
}
```
> Đã cập nhật đồng bộ ở `kientruc-ky-thuat.md` mục 3.

### Product — placeholder field thông tin mở rộng **[ĐỀ XUẤT — cần bạn chốt danh sách cụ thể]**

Ngoài `name`, `description`, sản phẩm dự kiến có thêm các trường thông tin khác (ví dụ tham khảo: giá bán, danh mục, đối tượng khách hàng...) phục vụ cho việc điền thông tin sản phẩm và có thể dùng lại cho tính năng "Sinh nội dung tự động" sau này. Chưa có danh sách field cụ thể nên chưa thiết kế schema chi tiết cho phần này — sẽ bổ sung khi có yêu cầu rõ.

### GeneratedImage — bổ sung field

```js
{
  // ...các field cũ...
  sourceImageUrl: String,  // bắt buộc — 1 trong các phần tử của product.originalImageUrls tại thời điểm tạo, ảnh gốc đã dùng cho lần này
  updatedAt: Date,         // cần timestamps: true để track thời điểm chuyển status
}
```

### User — bổ sung field cho quota **[ĐỀ XUẤT]**

```js
{
  // ...các field cũ...
  imageGenUsage: {
    date: String,   // 'YYYY-MM-DD', theo giờ VN
    count: Number,  // số lượt đã tạo trong ngày đó
  }
}
```
> Cách đơn giản, không cần collection riêng. Reset tự nhiên khi `date` khác ngày hiện tại (so sánh và reset về 0 khi query).

---

## 5. Business rule — Giới hạn số lượt tạo ảnh

**[ĐỀ XUẤT — cần xác nhận theo quota thực tế của gói PhotoRoom đang dùng]**

- Giới hạn mặc định: **10 lượt / user / ngày**.
- Kiểm tra ở backend (không tin frontend), thực hiện **trước khi** gọi PhotoRoom để không lãng phí quota khi chắc chắn sẽ bị chặn.
- Khi vượt hạn mức: trả `429 Too Many Requests` kèm body `{ message, resetAt }`.
- Nên có thêm 1 biến môi trường `DAILY_IMAGE_GEN_LIMIT` để chỉnh không cần sửa code khi biết quota PhotoRoom chính xác.
- **Global fallback**: nếu PhotoRoom trả lỗi liên quan đến hết quota tháng (billing/limit error), nên có cờ `AI_FEATURE_DISABLED` (đọc từ DB hoặc env, admin bật/tắt được) để tắt tạm tính năng toàn hệ thống thay vì để mỗi user tự gặp lỗi khó hiểu.

---

## 6. Options gửi cho PhotoRoom — whitelist

**[ĐỀ XUẤT — cần chốt danh sách option thật sự dùng ở MVP]**

Backend chỉ nhận và forward các key sau, mọi key khác bị bỏ qua (không forward nguyên object client gửi lên):

| Option key | Giá trị hợp lệ | Mô tả |
|---|---|---|
| `removeBackground` | `true` | Xoá nền, trả nền trong suốt |
| `bgColor` | mã hex, vd `#FFFFFF` | Thay nền bằng màu (chỉ áp dụng khi `removeBackground = true`) |
| `backgroundPrompt` | chuỗi text tự do, tối đa 200 ký tự, vd `"nền gỗ sáng, ánh nắng tự nhiên"` | Nền do AI sinh ra theo mô tả người dùng nhập, thay vì chọn màu đơn sắc |

> MVP đề xuất **chỉ làm "xoá nền" + "nền màu đơn sắc"**, chưa làm "thay nền theo mẫu ảnh có sẵn" (phức tạp hơn, cần thêm asset mẫu) — để phase sau.

> `bgColor` và `backgroundPrompt` **loại trừ nhau** — gửi cả 2 cùng lúc bị coi là option không hợp lệ (400).

**`backgroundPrompt` — đã triển khai bằng chính PhotoRoom, KHÔNG cần nâng gói Plus trả phí.** PhotoRoom có **Sandbox mode** miễn phí áp dụng được cho cả Image Editing API (`/v2/edit`, gồm AI Backgrounds/`background.prompt`) — không phải chỉ Remove Background API. Cách dùng: thêm tiền tố `sandbox_` vào `PHOTOROOM_API_KEY` hiện có khi gửi header `x-api-key` (không cần tài khoản/key khác).

> Lịch sử: 2 phương án trước đó (nâng gói Plus trả phí; tự ghép Hugging Face + `sharp`) đều đã bị thay bằng phương án này sau khi tra lại kỹ tài liệu PhotoRoom — đơn giản hơn nhiều (1 API call, PhotoRoom tự lo việc canh vị trí/ánh sáng/bóng đổ, đã test qua ảnh thật cho kết quả rất tốt) và không cần thêm tài khoản/thư viện ghép ảnh nào.

Về code: provider riêng `photoroomBackgroundPrompt` (mục 9.2), gọi `POST https://image-api.photoroom.com/v2/edit` với `imageFile` (binary, tải từ `sourceImageUrl` giống `photoroomBasic`), `referenceBox=originalImage` (giữ khung ảnh gốc để canh sản phẩm — theo đúng ví dụ chính thức PhotoRoom), và `background.prompt`. `photoroomPlus`/hướng Hugging Face không còn được dùng cho tính năng này.

**⚠️ Đánh đổi QUAN TRỌNG cần biết — đã kiểm chứng bằng ảnh thật:**
- **Ảnh trả về LUÔN có watermark "Photoroom" phủ kín (tile) toàn bộ ảnh** — không tắt được ở sandbox mode. Chỉ hết watermark nếu dùng key production thật của gói Plus (trả phí) — đổi qua env `PHOTOROOM_BACKGROUND_SANDBOX=false` khi đã nâng gói.
- **Ảnh có watermark hiện KHÔNG dùng được cho mục đích thật** (đăng bán hàng trên TikTok Shop) — chỉ phù hợp để demo/test tính năng ở giai đoạn hiện tại. Cần bạn xác nhận: có chấp nhận tạm để watermark cho tới khi nâng gói Plus, hay tạm ẩn option này khỏi UI cho tới khi có ngân sách?
- Giới hạn **1.000 lượt/tháng, tối đa 100 lượt/ngày** — tính **chung cho toàn app** (theo 1 API key), không phải riêng từng user. Với quota hiện tại (10 ảnh/user/ngày), chỉ cần ~10 user cùng dùng option này trong 1 ngày là có thể chạm trần sandbox chung — **chưa có cơ chế bảo vệ riêng cho giới hạn này** (mục 11).
- Chất lượng thực tế đã test tốt: PhotoRoom tự xử lý đúng ánh sáng/bóng đổ/phối cảnh sản phẩm theo mô tả, không cần tự ghép ảnh thủ công.

---

## 7. Xử lý ảnh trước khi lưu Cloudinary

**[ĐỀ XUẤT]**

- Ảnh gốc user upload: resize chiều dài cạnh lớn nhất về tối đa **2000px** trước khi lưu (giữ đủ chất lượng cho AI xử lý, tránh tốn storage/bandwidth free tier).
- Ảnh kết quả PhotoRoom trả về: giữ nguyên (đã qua xử lý AI, không nén lại để tránh giảm chất lượng).
- Dùng Cloudinary transformation on-upload (`eager`/`transformation` param khi upload) thay vì tự resize bằng thư viện riêng — đỡ phải cài thêm dependency.

---

## 8. API spec chi tiết

### 8.1 `PUT /api/products/:id` **[bổ sung]**

Request:
```json
{ "name": "Tên sản phẩm mới", "description": "Mô tả mới" }
```

- Chỉ nhận `name`, `description` (và field mở rộng khi đã chốt, mục 4) — **không** nhận/không cho đổi `originalImageUrls` ở MVP (xem mục 3.3).
- Kiểm tra ownership như các API `Product` khác (403 nếu không phải chủ sở hữu, 404 nếu không tìm thấy).
- Không ảnh hưởng tới `GeneratedImage` đã có hay việc tạo ảnh AI tiếp theo (xem mục 3.3).

### 8.2 `POST /api/products/:id/generate-image`

Request:
```json
{
  "sourceImageUrl": "https://res.cloudinary.com/.../original-2.jpg",
  "options": { "removeBackground": true, "bgColor": "#FFFFFF" }
}
```

Response 200:
```json
{
  "id": "665...",
  "status": "success",
  "sourceImageUrl": "https://res.cloudinary.com/.../original-2.jpg",
  "resultImageUrl": "https://res.cloudinary.com/.../result.jpg",
  "options": { "removeBackground": true, "bgColor": "#FFFFFF" },
  "createdAt": "2026-08-15T10:00:00Z"
}
```

Response lỗi:
| Status | Khi nào | Body |
|---|---|---|
| 400 | `sourceImageUrl` không thuộc sản phẩm (không có trong `originalImageUrls`) | `{ message: "Ảnh gốc không hợp lệ" }` |
| 400 | `options` không hợp lệ (key/value ngoài whitelist) | `{ message: "Tuỳ chọn không hợp lệ" }` |
| 403 | Sản phẩm không thuộc user hiện tại | `{ message: "Không có quyền" }` |
| 404 | Không tìm thấy sản phẩm | `{ message: "Không tìm thấy sản phẩm" }` |
| 429 | Hết quota trong ngày | `{ message: "Đã hết lượt tạo ảnh hôm nay", resetAt: "..." }` |
| 502 | PhotoRoom lỗi/timeout | `{ message: "Không tạo được ảnh, vui lòng thử lại" }` (log chi tiết lỗi thật ở server, không trả cho client) |

### 8.3 `GET /api/products/:id/images`

Trả về danh sách `GeneratedImage` của sản phẩm, sắp xếp mới nhất trước, có phân trang `?page=&limit=`.

### 8.4 `DELETE /api/images/:id`

- Kiểm tra quyền sở hữu.
- Xoá bản ghi `GeneratedImage` **và** gọi Cloudinary API xoá file thật (`resultImageUrl`) — tránh rác tồn free tier storage.

---

## 9. Xử lý lỗi & timeout khi gọi PhotoRoom

- Timeout bước fetch ảnh gốc từ Cloudinary (mục 3.3, mục 9.1): **10s [ĐỀ XUẤT]** — bắt buộc phải có timeout riêng cho bước này, nếu không có thể treo request nếu Cloudinary chậm/lỗi. Quá thời gian → xử lý như lỗi PhotoRoom (`status = failed`, trả `502`).
- Timeout request tới PhotoRoom: **20s**. Quá thời gian → coi như `failed`, `errorMessage = "Hết thời gian chờ xử lý ảnh"`.
- Tổng thời gian chờ tệ nhất cho 1 lần tạo ảnh AI khi backend đang "nguội" (cold start): ~30–50s (cold start) + ~10s (fetch Cloudinary) + ~20s (PhotoRoom) + thời gian upload kết quả lên Cloudinary → có thể tới **60–90s** cho 1 request. Đây là lý do nên cân nhắc mô hình async/polling (tạo `pending` → trả ngay → FE poll trạng thái) thay vì giữ 1 request HTTP mở suốt khoảng thời gian đó.
- Không retry tự động trong request (tránh user chờ lâu gấp đôi) — cho user tự bấm "Thử lại" ở UI, tạo `GeneratedImage` mới.
- Log đầy đủ lỗi thật (status code, response body từ PhotoRoom hoặc lỗi fetch Cloudinary) ở server để debug, nhưng **không** trả nguyên văn lỗi đó cho client.
- Nếu backend host trên free tier bị "sleep" (Render/Railway), lần gọi đầu tiên sau khi sleep có thể chậm 30–50s trước khi tới được bước gọi PhotoRoom — cân nhắc hiện thông báo "Hệ thống đang khởi động, vui lòng đợi" ở frontend khi request đầu tiên trong phiên mất quá 5s.

### 9.1 Ảnh hưởng hiệu suất của bước "fetch rồi forward" ảnh gốc

**[Đã xác nhận qua tài liệu PhotoRoom]** Endpoint `POST /v1/segment` (gói **Basic/free**, đúng gói AffiMate đang dùng) chỉ nhận ảnh qua `image_file` dạng binary multipart, **không có** tham số URL nào (`image_url`/`imageUrl` không tồn tại ở gói này). Vì vậy bước "backend tự tải ảnh gốc từ Cloudinary về buffer rồi forward" (mục 3.3) là **bắt buộc**, không phải 1 trong nhiều lựa chọn.

Ảnh hưởng cần lưu ý:
- **Thêm độ trễ**: mỗi lần tạo ảnh AI tốn thêm thời gian tải ảnh gốc từ Cloudinary về backend trước khi gọi được PhotoRoom (thường vài trăm ms–vài giây, tuỳ ảnh đã resize ≤2000px và tốc độ mạng của host free tier) — cộng dồn vào tổng thời gian chờ ở trên.
- **Thêm tải RAM**: ảnh gốc được giữ nguyên trong memory buffer (Node.js) suốt thời gian xử lý 1 request — nhiều request đồng thời thì RAM dùng tăng tuyến tính theo số ảnh đang xử lý cùng lúc. Ở quy mô MVP (nhóm người dùng nhỏ theo `tailieubandau.md`, quota 10 ảnh/user/ngày) rủi ro thấp, nhưng cần lưu ý nếu sau này có nhiều user dùng đồng thời trên free tier RAM giới hạn (thường ~512MB).
- **Tải trùng lặp**: nếu user tạo nhiều `GeneratedImage` liên tiếp từ cùng 1 ảnh gốc (thử nhiều option khác nhau), backend tải lại đúng ảnh gốc đó mỗi lần — không cache. Chấp nhận được ở MVP (quota thấp, ảnh đã resize nhỏ), chưa cần tối ưu ngay.
- **Không tốn CPU đáng kể** — đây là I/O (network fetch), không phải xử lý ảnh, nên không chặn event loop nếu code dùng async/await đúng cách (không đọc buffer đồng bộ/blocking).
- **Hướng tối ưu tương lai**: nếu nâng cấp gói PhotoRoom lên **Plus**, endpoint `GET /v2/edit` hỗ trợ thẳng tham số `imageUrl` — có thể bỏ hẳn bước tự fetch/forward, giảm độ trễ và tải RAM. Ghi nhận làm điểm cân nhắc khi có ngân sách nâng gói, không cần làm ở MVP.

### 9.2 Thiết kế để dễ đổi cách gọi ảnh AI sau này (đổi gói/đổi provider)

Vì mục 9.1 đã xác nhận gói Basic bắt buộc fetch-rồi-forward, còn gói Plus (hoặc provider khác sau này) có thể chỉ cần gửi URL — cần tách phần "gọi AI xử lý ảnh" thành 1 lớp service riêng, để nâng gói/đổi provider chỉ sửa **1 chỗ**, không đụng vào route/controller hay logic nghiệp vụ (quota, ownership, whitelist options, ghi DB).

**Ranh giới thiết kế:**

- **Route/controller `generate-image`**: chỉ lo nghiệp vụ — auth, ownership, quota, validate `sourceImageUrl` thuộc sản phẩm, whitelist `options`, tạo bản ghi `GeneratedImage(status=pending)`, gọi **1 hàm duy nhất** `imageAiService.generate({ sourceImageUrl, options })`, rồi xử lý kết quả/lỗi để cập nhật DB. Controller **không biết** bên trong hàm này tải ảnh kiểu gì.
- **`imageAiService.generate()`**: luôn nhận `{ sourceImageUrl, options }`, luôn trả về `{ buffer, contentType }` khi thành công (để controller upload lên Cloudinary), hoặc throw lỗi có phân loại rõ (vd `ImageAiTimeoutError`, `ImageAiUpstreamError`) — để controller xử lý `failed`/`502` mà không cần biết chi tiết lỗi gốc từ PhotoRoom hay từ bước fetch Cloudinary.
- Bên trong `imageAiService`, chọn 1 trong các "provider implementation" theo config (vd biến môi trường `IMAGE_AI_PROVIDER=photoroom-basic`) hoặc theo chính option client gửi lên:
  - `photoroomBasic` — tải buffer từ `sourceImageUrl`, forward `image_file` multipart tới `/v1/segment` (dùng cho `removeBackground`/`bgColor`).
  - `photoroomPlus` — gửi thẳng `imageUrl` tới `/v2/edit` bằng key production thật (khi nâng gói, chỉ cần thêm file này + đổi config, không sửa gì khác) — hiện vẫn là stub chưa triển khai, không bắt buộc.
  - `photoroomBackgroundPrompt` — **đã triển khai**, xử lý riêng option `backgroundPrompt` (mục 6): gọi `POST /v2/edit` của PhotoRoom bằng **Sandbox mode** (key có tiền tố `sandbox_`, miễn phí nhưng ảnh có watermark — xem cảnh báo ở mục 6). Ví dụ cụ thể cho việc 1 option cần hẳn 1 provider riêng dù cùng là PhotoRoom, vì khác endpoint (`/v2/edit` so với `/v1/segment`) và khác cơ chế xác thực (tiền tố `sandbox_`).
  - Nếu sau này đổi hẳn sang provider khác ngoài PhotoRoom, chỉ cần thêm 1 provider mới cùng interface — khớp với field `provider` đã có sẵn trong schema `GeneratedImage` ở `kientruc-ky-thuat.md` mục 3, cho thấy hướng nhiều-provider đã được tính từ đầu.
  - `imageAiService.generate()` chọn `photoroomBackgroundPrompt` ngay khi thấy `options.backgroundPrompt` có giá trị, bất kể `IMAGE_AI_PROVIDER` đang cấu hình gì — vì đây luôn là lựa chọn đúng cho option đó, không phải 1 "gói" thay thế toàn bộ.
- **Mapping option → tham số thật của provider** (vd `bgColor` → `bg_color`) nằm **bên trong provider**, không nằm ở controller — nhờ vậy whitelist option nội bộ (mục 6) giữ ổn định dù tên tham số thật của PhotoRoom đổi giữa các gói/version.

Đây chỉ là 1 lớp interface mỏng (1 hàm, 1 factory chọn provider theo config) — không cần dựng hẳn hệ thống plugin phức tạp ở MVP, chỉ cần đủ để đổi gói/provider sau này không phải sửa rải rác nhiều nơi trong code.

---

## 10. Testing checklist

- [ ] Upload ảnh hợp lệ (jpg/png/webp) → tạo `Product` thành công, ảnh lưu đúng Cloudinary.
- [ ] Upload file không phải ảnh / quá dung lượng → bị chặn ở cả frontend và backend.
- [ ] Tạo ảnh AI thành công → `GeneratedImage.status = success`, ảnh hiển thị đúng.
- [ ] PhotoRoom trả lỗi (mock 4xx/5xx) → `status = failed`, `errorMessage` hợp lý, không crash server.
- [ ] Timeout PhotoRoom (mock delay) → xử lý đúng như lỗi, không treo request vô thời hạn.
- [ ] Gọi `generate-image` khi đã hết quota ngày → trả 429, không gọi PhotoRoom (kiểm tra qua log/mock call count).
- [ ] Gọi `generate-image` trên sản phẩm của user khác → 403.
- [ ] Gửi `options` chứa key lạ → bị lọc/bỏ qua, không forward nguyên văn cho PhotoRoom.
- [ ] Xoá `GeneratedImage` → file trên Cloudinary cũng bị xoá (kiểm tra qua Cloudinary API/log).
- [ ] Xoá `Product` → các `GeneratedImage` liên quan cũng được xử lý (cascade delete hoặc chặn xoá nếu còn ảnh — **cần chốt theo review kiến trúc trước đó**).
- [ ] Sửa `name`/`description` qua `PUT /api/products/:id` rồi tạo ảnh AI → ảnh gửi PhotoRoom vẫn đúng `sourceImageUrl` user chọn, `originalImageUrls` và các `GeneratedImage` cũ không bị ảnh hưởng.
- [ ] Upload ảnh 5–10MB (trong giới hạn mới) → không bị chặn nhầm; ảnh >10MB → bị chặn ở cả FE và BE.
- [ ] Tạo sản phẩm với nhiều ảnh (vd 3 ảnh) → `Product.originalImageUrls` lưu đủ, đúng thứ tự upload.
- [ ] Tạo ảnh AI, chọn đúng 1 ảnh trong nhiều ảnh gốc → `GeneratedImage.sourceImageUrl` đúng ảnh đã chọn; các ảnh gốc khác của sản phẩm không bị đụng tới.
- [ ] Gửi `sourceImageUrl` không thuộc sản phẩm (URL ảnh của sản phẩm khác hoặc URL bất kỳ) → trả `400`, không gọi PhotoRoom.
- [x] Tạo ảnh với `backgroundPrompt` → gọi PhotoRoom Sandbox (`/v2/edit`) → `status = success`, ảnh kết quả có nền đúng theo mô tả **(đã test bằng ảnh thật — chất lượng tốt, có watermark như đã biết)**.
- [ ] Gửi cả `bgColor` và `backgroundPrompt` cùng lúc → trả `400` (loại trừ nhau, mục 6).
- [ ] `backgroundPrompt` dài hơn 200 ký tự → trả `400`.
- [ ] Chưa cấu hình `PHOTOROOM_API_KEY` mà vẫn gọi `backgroundPrompt` → `status = failed`, `502`, không crash server.
- [ ] PhotoRoom Sandbox trả lỗi/hết lượt trong ngày (>100 lượt/ngày chung toàn app) → xử lý như lỗi upstream, thông báo rõ cho user (khác với "hết quota cá nhân" — cần phân biệt rõ ở UI).

---

## 11. Việc cần xác nhận trước khi code

1. Con số quota **10 ảnh/user/ngày** (mục 5) — có phù hợp với gói PhotoRoom free đang đăng ký không?
2. Danh sách option MVP (mục 6) — chỉ "xoá nền + nền màu đơn sắc" có đủ cho bản đầu tiên không, hay cần thêm "thay nền theo mẫu"?
3. ~~Giới hạn dung lượng upload~~ — đã tăng lên **10MB** theo yêu cầu (mục 3.1). Cần theo dõi thực tế: nếu ảnh chụp từ các dòng máy độ phân giải rất cao (RAW/ảnh chưa nén) vẫn vượt ngưỡng, cân nhắc tăng thêm.
4. Chính sách xoá Product khi còn `GeneratedImage` liên quan: cascade xoá luôn, hay chặn không cho xoá, hay soft-delete?
5. Số lượng ảnh gốc tối đa/sản phẩm (mục 3.1) — chốt con số cụ thể (vd 5 ảnh)?
6. Có cho phép thêm/xoá ảnh gốc sau khi đã tạo sản phẩm không, hay chỉ set được lúc tạo sản phẩm (mục 3.3)? Nếu cho phép, cần thêm endpoint riêng (vd `POST/DELETE /api/products/:id/images`) và tính lại ảnh hưởng tới các `GeneratedImage` đã tham chiếu ảnh đó.
7. Danh sách field thông tin mở rộng của sản phẩm (mục 4) — cần bạn cung cấp cụ thể để thiết kế schema.
8. Tính năng "Sinh nội dung tự động" (mục 1, 3.1) — dự kiến khi nào cần spec chi tiết riêng?
9. Xác nhận gói PhotoRoom đang đăng ký đúng là **Basic/free** (dùng endpoint `/v1/segment`, bắt buộc gửi `image_file` binary — mục 9.1) hay có kế hoạch nâng **Plus** (`/v2/edit`, hỗ trợ `imageUrl`) để quyết định có cần tối ưu bước fetch/forward ảnh gốc không.
10. ~~Có đồng ý chi phí nâng gói PhotoRoom lên Plus không?~~ — không còn cần thiết ở bước hiện tại: option "Mô tả nền theo ý bạn" (`backgroundPrompt`) dùng PhotoRoom **Sandbox mode** (miễn phí, mục 6, 9.2), không cần key production/gói Plus trả phí.
11. **Ảnh sandbox có watermark "Photoroom" phủ kín, chưa dùng được cho mục đích thật (đăng bán hàng)** — cần bạn quyết định: (a) chấp nhận tạm để watermark cho tới khi có ngân sách nâng gói Plus, hay (b) tạm ẩn option "Mô tả nền theo ý bạn" khỏi UI cho người dùng thật, chỉ dùng nội bộ để demo/test cho tới khi nâng gói.
12. Giới hạn sandbox **100 lượt/ngày chung cho toàn app** (không phải theo user) — cần cơ chế đếm/chặn riêng khi gần chạm trần (khác với quota 10 ảnh/user/ngày hiện có) để tránh 1 vài user dùng hết lượt sandbox rồi user khác gặp lỗi khó hiểu — hiện **chưa có cơ chế này**, mới chỉ ghi nhận là rủi ro biết trước.
