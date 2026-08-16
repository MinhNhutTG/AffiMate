import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page">
      <div className="body" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: 1 }}>
        <h1 style={{ font: '700 22px/1.3 var(--font-display)' }}>Không tìm thấy trang</h1>
        <Link className="btn btn-primary" to="/products" style={{ maxWidth: 200, marginTop: 12 }}>
          Về trang chính
        </Link>
      </div>
    </div>
  );
}
