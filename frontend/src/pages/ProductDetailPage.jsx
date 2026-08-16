import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProduct, deleteProduct } from '../api/products';
import { listImages, deleteImage } from '../api/images';
import { SparkleIcon } from '../components/icons';
import ConfirmDialog from '../components/ConfirmDialog';

function optionsLabel(options) {
  if (options?.bgColor) return `Nền màu ${options.bgColor}`;
  if (options?.removeBackground) return 'Xoá nền';
  return 'Tuỳ chỉnh';
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABEL = { success: 'Thành công', pending: 'Đang xử lý', failed: 'Lỗi' };

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback((signal) => {
    setError('');
    Promise.all([getProduct(id, { signal }), listImages(id, { limit: 20, signal })])
      .then(([p, imgRes]) => {
        setProduct(p);
        setImages(imgRes.items);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  function sourceIndexLabel(sourceImageUrl) {
    if (!product) return '';
    const idx = product.originalImages.findIndex((img) => img.url === sourceImageUrl);
    return idx >= 0 ? `Ảnh gốc #${idx + 1}` : '';
  }

  async function handleDeleteImage(imageId) {
    try {
      await deleteImage(imageId);
      setImages((prev) => prev.filter((img) => img._id !== imageId));
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDeleteProduct() {
    setDeleting(true);
    try {
      await deleteProduct(id);
      navigate('/products', { replace: true });
    } catch (err) {
      setConfirmOpen(false);
      setDeleting(false);
      setError(err.message);
    }
  }

  if (error && !product) {
    return (
      <div className="page">
        <div className="topbar">
          <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate('/products')} />
        </div>
        <div className="body">
          <div className="error-banner">{error}</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ position: 'relative' }}>
      <div className="topbar">
        <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate('/products')} />
        <h1>{product.name}</h1>
      </div>

      <div className="body">
        {error && <div className="error-banner">{error}</div>}

        <div>
          <div className="hint" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            {product.originalImages.length} ảnh gốc
          </div>
          <div className="gallery-row">
            {product.originalImages.map((img, i) => (
              <img key={img.publicId} className="gallery-item" src={img.url} alt={`Ảnh gốc #${i + 1}`} />
            ))}
          </div>
        </div>

        <div className="action-row">
          <Link className="action-card primary" to={`/products/${id}/generate`}>
            <span className="a-title">
              <SparkleIcon /> Tạo ảnh AI
            </span>
            <span className="a-sub">Xoá nền / đổi màu nền bằng AI</span>
          </Link>
          <button className="action-card muted" onClick={() => showToast('Tính năng đang phát triển')}>
            <span className="soon-badge">Sắp có</span>
            <span className="a-title">Sinh nội dung tự động</span>
            <span className="a-sub">Kịch bản, nội dung TikTok</span>
          </button>
        </div>

        <div>
          <div className="section-title">
            <h3>Lịch sử ảnh đã tạo</h3>
            <span>{images ? images.length : '…'} lần tạo</span>
          </div>

          {images && images.length === 0 && (
            <p className="hint" style={{ marginTop: 8 }}>
              Chưa có ảnh AI nào — bấm "Tạo ảnh AI" để bắt đầu.
            </p>
          )}

          {images && images.length > 0 && (
            <div className="history-grid" style={{ marginTop: 9 }}>
              {images.map((img) => (
                <div className="history-card" key={img._id}>
                  <div className="history-thumb">
                    <span className={`status-pill ${img.status}`}>{STATUS_LABEL[img.status]}</span>
                    {img.status === 'success' && img.resultImageUrl ? (
                      <img src={img.resultImageUrl} alt="" />
                    ) : (
                      <img src={img.sourceImageUrl} alt="" style={{ opacity: img.status === 'failed' ? 0.5 : 1 }} />
                    )}
                    <button className="history-del" aria-label="Xoá ảnh" onClick={() => handleDeleteImage(img._id)}>
                      ×
                    </button>
                  </div>
                  <div className="history-meta">
                    <span className="opt">{optionsLabel(img.options)}</span>
                    <span className="when">
                      {formatDateTime(img.createdAt)} · {sourceIndexLabel(img.sourceImageUrl)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-ghost" onClick={() => setConfirmOpen(true)} style={{ marginTop: 8, color: 'var(--error)' }}>
          Xoá sản phẩm
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Xoá sản phẩm này?"
        message={`"${product.name}" và toàn bộ ảnh gốc sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá sản phẩm"
        busy={deleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setConfirmOpen(false)}
      />

      {toast && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            background: 'var(--ink)',
            color: 'var(--bg)',
            font: '600 12.5px/1 var(--font-body)',
            padding: '10px 16px',
            borderRadius: 999,
            zIndex: 30,
            whiteSpace: 'nowrap',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
