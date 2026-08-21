import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts } from '../api/products';
import { useAuth } from '../context/AuthContext';
import { BoxIcon } from '../components/icons';

export default function ProductListPage() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    listProducts({ signal: controller.signal })
      .then(setProducts)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, []);

  const loading = products === null && !error;
  const empty = products !== null && products.length === 0;

  return (
    <div className="page">
      <div className="list-head">
        <h1>Sản phẩm của tôi</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user?.role === 'admin' && (
            <Link className="link-btn" to="/admin/users" style={{ padding: 0 }}>
              Quản trị
            </Link>
          )}
          <button className="link-btn" onClick={logout} style={{ padding: 0 }}>
            Đăng xuất
          </button>
        </span>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="body">
          <div className="error-banner" role="alert">{error}</div>
        </div>
      )}

      {empty && (
        <div className="body">
          <div className="empty-wrap">
            <div className="empty-frame">
              <BoxIcon style={{ width: 36, height: 36, color: 'var(--ink-faint)' }} />
            </div>
            <h2>Chưa có sản phẩm nào</h2>
            <p>Thêm sản phẩm đầu tiên để bắt đầu tạo ảnh AI cho nội dung bán hàng của bạn.</p>
            <Link className="btn btn-primary" to="/products/new" style={{ maxWidth: 230 }}>
              + Thêm sản phẩm đầu tiên
            </Link>
          </div>
          <div>
            <div className="hint" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600 }}>
              3 bước đơn giản
            </div>
            <div className="step-strip">
              <div className="step-item">
                <span className="step-num">1</span>
                <b>Thêm ảnh</b>
                <span>Upload ảnh sản phẩm</span>
              </div>
              <div className="step-item">
                <span className="step-num">2</span>
                <b>Chọn nền</b>
                <span>Xoá hoặc đổi màu</span>
              </div>
              <div className="step-item">
                <span className="step-num">3</span>
                <b>Tải về</b>
                <span>Dùng cho nội dung</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {products && products.length > 0 && (
        <>
          <div className="body">
            {products.map((p) => (
              <Link key={p._id} className="product-card" to={`/products/${p._id}`}>
                <img className="thumb" src={p.originalImages[0]?.url} alt={p.name} />
                <span className="pc-body">
                  <h3>{p.name}</h3>
                  <span className="pc-meta">{p.originalImages.length} ảnh gốc</span>
                </span>
                <span className="pc-chev">›</span>
              </Link>
            ))}
          </div>
          <div className="cta-bar">
            <Link className="btn btn-primary" to="/products/new">
              + Thêm sản phẩm
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
