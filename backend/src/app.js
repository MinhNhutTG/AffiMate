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

app.use(cors());
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
