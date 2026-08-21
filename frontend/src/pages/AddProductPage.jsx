import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../api/products';
import { TipIcon } from '../components/icons';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AddProductPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function handleFilesSelected(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (picked.length === 0) return;

    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Chỉ nhận ảnh định dạng jpg/png/webp');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`Ảnh "${file.name}" vượt quá 10MB`);
        return;
      }
    }

    setError('');
    setFiles((prev) => {
      const next = [...prev, ...picked].slice(0, MAX_FILES);
      return next;
    });
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (files.length === 0) {
      setError('Cần ít nhất 1 ảnh sản phẩm');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const product = await createProduct({ name, description, files });
      navigate(`/products/${product._id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(-1)} />
        <h1>Thêm sản phẩm</h1>
      </div>

      <form className="body" onSubmit={handleSubmit}>
        {showTip && (
          <div className="tip-banner">
            <TipIcon />
            <p>Chụp ảnh sáng rõ, nền đơn giản — AI sẽ xử lý đẹp hơn nhiều.</p>
            <button type="button" className="tip-close" aria-label="Ẩn mẹo" onClick={() => setShowTip(false)}>
              ×
            </button>
          </div>
        )}

        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="field">
          <label htmlFor="name">Tên sản phẩm *</label>
          <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="description">Mô tả (tuỳ chọn)</label>
          <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="hint" style={{ background: 'var(--surface-alt)', padding: '10px 12px', borderRadius: 12 }}>
          <b style={{ color: 'var(--ink)' }}>Thông tin khác</b> — sắp bổ sung thêm trường (giá, danh mục...), đang chờ chốt danh
          sách cụ thể.
        </div>

        <div className="field">
          <label>Ảnh sản phẩm *</label>
          <div className="img-grid">
            {previews.map((src, i) => (
              <div className="img-slot" key={src}>
                <img src={src} alt="" />
                <button type="button" className="img-del" aria-label="Xoá ảnh" onClick={() => removeFile(i)}>
                  ×
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <button type="button" className="img-slot img-add" onClick={() => fileInputRef.current?.click()}>
                <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>+</span>
                <span>Thêm ảnh</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={handleFilesSelected}
          />
          <span className="hint">
            {files.length}/{MAX_FILES} ảnh · JPG/PNG/WEBP, tối đa 10MB mỗi ảnh
          </span>
        </div>
      </form>

      <div className="cta-bar">
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Đang lưu…' : 'Lưu sản phẩm'}
        </button>
      </div>
    </div>
  );
}
