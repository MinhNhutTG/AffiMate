const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const productRoutes = require('./routes/product.routes');
const imageRoutes = require('./routes/image.routes');
const contentRoutes = require('./routes/content.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// FRONTEND_URL: danh sách domain frontend được phép gọi API, cách nhau bởi dấu phẩy
// (vd "https://affimate.vercel.app,http://localhost:5173"). Không set thì mở cho mọi origin
// (mặc định lúc chưa deploy) — set khi lên Render để siết lại theo domain Vercel thật.
const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : undefined));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/contents', contentRoutes);

app.use((req, res) => res.status(404).json({ message: 'Không tìm thấy route' }));
app.use(errorHandler);

module.exports = app;
