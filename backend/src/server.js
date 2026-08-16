require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server chạy ở cổng ${PORT}`));
  })
  .catch((err) => {
    console.error('Không kết nối được MongoDB:', err.message);
    process.exit(1);
  });
