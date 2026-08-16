# Kiến trúc kỹ thuật — AffiMate (MVP)

Tài liệu này cụ thể hóa `tailieubandau.md` thành schema DB và API endpoints để bắt đầu code.

---

## 1. Stack tổng quan

| Thành phần | Lựa chọn | Ghi chú |
|---|---|---|
| Frontend | React | SPA, gọi REST API backend |
| Backend | Node.js + Express | REST API |
| Database | MongoDB (Atlas free tier) | qua Mongoose |
| Auth | JWT (access token) + bcrypt | đăng nhập bằng email |
| AI tạo ảnh | PhotoRoom API | trả ảnh kết quả dạng **binary**, không phải URL |
| Lưu trữ ảnh | Cloudinary (free tier) | lưu cả ảnh gốc user upload và ảnh PhotoRoom trả về |
| Hosting backend | Render/Railway free tier | |
| Hosting frontend | Vercel free tier | |

---

## 2. Luồng tạo ảnh AI (quan trọng nhất của MVP)

1. User tạo sản phẩm, upload **nhiều ảnh** gốc cùng lúc → backend nhận file (multer) → upload từng ảnh lên Cloudinary → lưu mảng URL vào `Product.originalImageUrls`.
2. User bấm "Tạo ảnh AI" trên 1 sản phẩm → chọn 1 ảnh trong `originalImageUrls` làm nguồn → backend lấy ảnh gốc đó (`sourceImageUrl`) → gọi **PhotoRoom API** (kèm options: xóa nền / thay nền / v.v.) → nhận về ảnh **binary**.
3. Backend upload ảnh binary đó lên Cloudinary → lấy URL → lưu vào `GeneratedImage.resultImageUrl`, `status = success`.
4. Trả URL ảnh kết quả về frontend để hiển thị / tải xuống.

Nếu bước 2 hoặc 3 lỗi → lưu `GeneratedImage.status = failed` kèm `errorMessage`, trả lỗi rõ ràng cho frontend (không để user chờ vô thời hạn).

---

## 3. Data models (Mongoose)

### User
```js
{
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'banned'], default: 'active' },
  plan: { type: String, enum: ['free', 'paid'], default: 'free' }, // để dành cho sau
  createdAt, updatedAt // timestamps: true
}
```

### Product
```js
{
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  description: String,
  originalImageUrls: [String], // Cloudinary URLs — nhiều ảnh gốc, tối thiểu 1 phần tử
  // các field thông tin sản phẩm mở rộng: chưa chốt danh sách, xem chuc-nang-tao-anh-ai.md mục 4
  createdAt, updatedAt
}
```

### GeneratedImage
```js
{
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  productId: { type: ObjectId, ref: 'Product', required: true, index: true },
  provider: { type: String, default: 'photoroom' },
  sourceImageUrl: String,  // 1 phần tử của product.originalImageUrls — ảnh gốc đã dùng cho lần tạo này
  options: Object,        // options gửi cho PhotoRoom (loại nền, style...)
  resultImageUrl: String, // Cloudinary URL của ảnh kết quả
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  errorMessage: String,
  createdAt
}
```

---

## 4. API endpoints

### Auth
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | `{email, password, name}` |
| POST | `/api/auth/login` | `{email, password}` → `{accessToken, user}` |
| GET | `/api/auth/me` | lấy thông tin user đang đăng nhập |

### User (tự quản lý)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/users/me` | xem thông tin |
| PUT | `/api/users/me` | cập nhật `name`, ... |

### Admin (yêu cầu `role = admin`)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/admin/users?page=&limit=&search=` | danh sách user |
| GET | `/api/admin/users/:id` | chi tiết 1 user |
| PUT | `/api/admin/users/:id` | sửa `role`, `status` |
| DELETE | `/api/admin/users/:id` | xoá user |

### Product
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/products` | tạo sản phẩm (multipart: `name`, `description`, `images[]` — nhiều ảnh) |
| GET | `/api/products` | danh sách sản phẩm của chính user |
| GET | `/api/products/:id` | chi tiết |
| PUT | `/api/products/:id` | sửa `name`, `description` — không đổi ảnh gốc (chi tiết xem `chuc-nang-tao-anh-ai.md` mục 3.3, 8.1) |
| DELETE | `/api/products/:id` | xoá |

### Ảnh AI
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/products/:id/generate-image` | body `{sourceImageUrl, options}` → gọi PhotoRoom, trả về `GeneratedImage` |
| GET | `/api/products/:id/images` | danh sách ảnh AI đã tạo cho 1 sản phẩm |
| DELETE | `/api/images/:id` | xoá 1 ảnh kết quả |

---

## 5. Middleware

- `authenticate` — verify JWT từ header `Authorization: Bearer <token>`, gắn `req.user`.
- `requireRole('admin')` — chặn route admin nếu `req.user.role !== 'admin'`.
- `upload` (multer, memory storage) — nhận file ảnh, forward buffer lên Cloudinary/PhotoRoom, không lưu file tạm ra đĩa.
- `imageAiService` — lớp service tách riêng việc gọi AI xử lý ảnh khỏi controller (interface `generate({ sourceImageUrl, options }) → { buffer, contentType }`), chọn provider theo config — để đổi gói PhotoRoom hoặc đổi provider sau này chỉ sửa 1 chỗ (chi tiết `chuc-nang-tao-anh-ai.md` mục 9.2).

---

## 6. Biến môi trường (.env)

```
MONGODB_URI=
JWT_SECRET=
PHOTOROOM_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 7. Việc chưa quyết (để chốt trước khi code hoặc trong lúc code)

- Refresh token hay chỉ dùng access token 1 loại (hạn ngắn, đăng nhập lại khi hết hạn) — MVP có thể dùng access token hạn dài hơn (vd 7 ngày) cho đơn giản.
- Giới hạn số lượt tạo ảnh AI / user / ngày (tránh lạm dụng gói free của PhotoRoom).
- Options cụ thể của PhotoRoom cho MVP: chỉ xóa nền, hay có cả thay nền theo mẫu?
- Số lượng ảnh gốc tối đa/sản phẩm; có cho thêm/xoá ảnh gốc sau khi tạo sản phẩm hay chỉ set lúc tạo.
- Danh sách field thông tin mở rộng của `Product` (ngoài `name`, `description`).
- Tính năng "Sinh nội dung tự động" — chỉ đang có chỗ trống trên UI (thẻ sản phẩm), spec chi tiết (data model, API) để ở tài liệu riêng khi tới lượt triển khai.
