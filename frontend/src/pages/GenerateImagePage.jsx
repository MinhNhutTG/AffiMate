import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct } from '../api/products';
import { generateImage } from '../api/images';
import { ApiError } from '../api/client';
import { CheckIcon, DownloadIcon, TipIcon, WarnIcon, ClockIcon } from '../components/icons';

// Bảng màu nền dạng "giấy phông studio" — đủ đa dạng tông trung tính/ấm/lạnh/pastel
// cho ảnh sản phẩm, cộng thêm ô "Tuỳ chỉnh" bên dưới cho màu bất kỳ ngoài danh sách.
const SWATCHES = [
  { name: 'Trắng', hex: '#FFFFFF' },
  { name: 'Đen', hex: '#17181A' },
  { name: 'Xám nhạt', hex: '#E4E1D8' },
  { name: 'Xám đá', hex: '#C9C2B2' },
  { name: 'Kem', hex: '#F3EEE1' },
  { name: 'Be', hex: '#E8D3B0' },
  { name: 'Nâu gỗ', hex: '#8B5E3C' },
  { name: 'Ngọc lam', hex: '#0E8F6F' },
  { name: 'Xanh dương', hex: '#3B6FD9' },
  { name: 'Xanh navy', hex: '#1E2A4A' },
  { name: 'Cam san hô', hex: '#FF5B3C' },
  { name: 'Vàng bơ', hex: '#F0C64B' },
  { name: 'Hồng phấn', hex: '#F3C9C2' },
  { name: 'Tím pastel', hex: '#D8C4E8' },
];

function formatResetAt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export default function GenerateImagePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState('picker'); // picker | options | generating | result | error | quota
  const [sourceIndex, setSourceIndex] = useState(0);
  const [bgMode, setBgMode] = useState('transparent'); // transparent | color | prompt
  const [selectedSwatch, setSelectedSwatch] = useState(SWATCHES[0]);
  const [customColor, setCustomColor] = useState('#888888');
  const [promptText, setPromptText] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [quotaResetAt, setQuotaResetAt] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getProduct(id, { signal: controller.signal })
      .then((p) => {
        setProduct(p);
        if (p.originalImages.length === 1) setStep('options');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(err.message);
      });
    return () => controller.abort();
  }, [id]);

  function buildOptions() {
    if (bgMode === 'color') return { removeBackground: true, bgColor: selectedSwatch.hex };
    if (bgMode === 'prompt') return { removeBackground: true, backgroundPrompt: promptText.trim() };
    return { removeBackground: true };
  }

  async function handleGenerate() {
    const sourceImageUrl = product.originalImages[sourceIndex].url;
    const options = buildOptions();

    setStep('generating');
    try {
      const record = await generateImage(id, { sourceImageUrl, options });
      setResult(record);
      setStep('result');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setQuotaResetAt(err.extra?.resetAt || '');
        setStep('quota');
      } else {
        setErrorMessage(err.message);
        setStep('error');
      }
    }
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="topbar">
          <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(`/products/${id}`)} />
        </div>
        <div className="body">
          <div className="error-banner">{loadError}</div>
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
    <div className="page">
      {step === 'picker' && (
        <>
          <div className="topbar">
            <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(`/products/${id}`)} />
            <h1>Chọn ảnh nguồn</h1>
          </div>
          <p className="topbar-sub">Ảnh AI sẽ được tạo từ ảnh bạn chọn bên dưới</p>
          <div className="body">
            <div className="tip-banner">
              <TipIcon />
              <p>Nên chọn ảnh chụp rõ mặt trước sản phẩm nhất trong các ảnh đã có.</p>
            </div>
            <div className="picker-grid">
              {product.originalImages.map((img, i) => (
                <button
                  key={img.publicId}
                  className={`picker-card${i === sourceIndex ? ' selected' : ''}`}
                  onClick={() => setSourceIndex(i)}
                >
                  <img src={img.url} alt={`Ảnh gốc #${i + 1}`} />
                  <span className="picker-check">
                    <CheckIcon />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="cta-bar">
            <button className="btn btn-primary" onClick={() => setStep('options')}>
              Tiếp tục
            </button>
          </div>
        </>
      )}

      {step === 'options' && (
        <>
          <div className="topbar">
            <button
              className="icon-btn icon-back"
              aria-label="Quay lại"
              onClick={() => (product.originalImages.length > 1 ? setStep('picker') : navigate(`/products/${id}`))}
            />
            <h1>Tuỳ chọn tạo ảnh</h1>
          </div>
          <div className="body">
            <div className="tip-banner">
              <TipIcon />
              <p>Chưa chắc chọn gì? Bắt đầu với "Xoá nền" — dùng tốt cho hầu hết trường hợp.</p>
            </div>

            <div className="source-preview">
              <img className="thumb" src={product.originalImages[sourceIndex].url} alt="" />
              <span className="sp-text">
                <b>Ảnh nguồn: Ảnh gốc #{sourceIndex + 1}</b>
                <span>{product.name}</span>
              </span>
              {product.originalImages.length > 1 && (
                <button className="link-btn" onClick={() => setStep('picker')}>
                  Đổi ảnh
                </button>
              )}
            </div>

            <div className="opt-group">
              <button className={`opt-card${bgMode === 'transparent' ? ' on' : ''}`} onClick={() => setBgMode('transparent')}>
                <span className="opt-swatch" style={{ background: 'repeating-conic-gradient(#ededed 0% 25%, #dcdcdc 0% 50%) 0 0/10px 10px' }} />
                <span className="opt-txt">
                  <b>Xoá nền</b>
                  <span>Trả về nền trong suốt</span>
                </span>
                <span className="opt-radio" />
              </button>
              <button className={`opt-card${bgMode === 'color' ? ' on' : ''}`} onClick={() => setBgMode('color')}>
                <span
                  className="opt-swatch"
                  style={{ background: 'conic-gradient(from 0deg,#0E8F6F,#FF5B3C,#F0C64B,#F3C9C2,#0E8F6F)' }}
                />
                <span className="opt-txt">
                  <b>Đổi màu nền</b>
                  <span>Chọn 1 màu nền bên dưới</span>
                </span>
                <span className="opt-radio" />
              </button>
              <button className="opt-card" disabled>
                <span className="opt-swatch">Aa</span>
                <span className="opt-txt">
                  <b>
                    Mô tả nền theo ý bạn{' '}
                    <span className="soon-badge" style={{ marginLeft: 4 }}>
                      Đang phát triển
                    </span>
                  </b>
                  <span>Tự nhập nền bạn muốn, AI vẽ theo mô tả</span>
                </span>
              </button>
            </div>

            {bgMode === 'color' && (
              <div className="swatch-row">
                {SWATCHES.map((sw) => (
                  <button
                    key={sw.hex}
                    className={`swatch${selectedSwatch.name !== 'Tuỳ chỉnh' && selectedSwatch.hex === sw.hex ? ' selected' : ''}`}
                    style={{ background: sw.hex }}
                    title={sw.name}
                    onClick={() => setSelectedSwatch(sw)}
                  />
                ))}
                <label
                  className={`swatch swatch-custom${selectedSwatch.name === 'Tuỳ chỉnh' ? ' selected' : ''}`}
                  style={{ background: customColor }}
                  title="Tuỳ chỉnh màu khác"
                >
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setSelectedSwatch({ name: 'Tuỳ chỉnh', hex: e.target.value });
                    }}
                  />
                </label>
              </div>
            )}
            {bgMode === 'color' && (
              <span className="hint">
                Đang chọn: {selectedSwatch.name} ({selectedSwatch.hex})
              </span>
            )}

            {bgMode === 'prompt' && (
              <div className="field">
                <input
                  type="text"
                  maxLength={200}
                  placeholder="VD: nền gỗ sáng, ánh nắng tự nhiên, tối giản..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                />
                <span className="hint">
                  AI sẽ vẽ nền mới theo mô tả này — có thể mất lâu hơn bình thường.{' '}
                  <b style={{ color: 'var(--warn)' }}>Tính năng đang thử nghiệm, chất lượng có thể chưa ổn định.</b>
                </span>
              </div>
            )}
          </div>
          <div className="cta-bar">
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={bgMode === 'prompt' && promptText.trim().length === 0}
            >
              Tạo ảnh AI
            </button>
          </div>
        </>
      )}

      {step === 'generating' && (
        <>
          <div className="topbar">
            <span className="icon-btn" style={{ visibility: 'hidden' }} />
            <h1>Đang tạo ảnh</h1>
          </div>
          <div className="center-wrap">
            <div className="gen-frame">
              <img src={product.originalImages[sourceIndex].url} alt="" />
            </div>
            <div className="spinner" />
            <div>
              <div className="gen-title">Đang xử lý ảnh…</div>
              <div className="gen-sub">
                {bgMode === 'prompt'
                  ? 'Đang vẽ nền theo mô tả — có thể lâu hơn bình thường.'
                  : 'Có thể mất 10–20 giây.'}{' '}
                Đừng rời khỏi trang trong lúc chờ nhé.
              </div>
            </div>
          </div>
        </>
      )}

      {step === 'result' && result && (
        <>
          <div className="topbar">
            <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(`/products/${id}`)} />
            <h1>Kết quả</h1>
          </div>
          <div className="body">
            <div className="ba-row">
              <div className="ba-col">
                <span className="ba-label">Trước</span>
                <div className="ba-frame">
                  <img src={product.originalImages[sourceIndex].url} alt="" />
                </div>
              </div>
              <div className="ba-col">
                <span className="ba-label">Sau</span>
                <div className="ba-frame">
                  <img src={result.resultImageUrl} alt="" />
                </div>
              </div>
            </div>
            <div className="tag-row">
              <span className="tag">
                {bgMode === 'color' && `Nền ${selectedSwatch.name}`}
                {bgMode === 'prompt' && `Nền: "${promptText}"`}
                {bgMode === 'transparent' && 'Xoá nền'}
              </span>
              <span className="tag time">Vừa xong · Ảnh gốc #{sourceIndex + 1}</span>
            </div>
          </div>
          <div className="cta-bar">
            <a className="btn btn-outline" href={result.resultImageUrl} target="_blank" rel="noreferrer">
              <DownloadIcon /> Tải xuống
            </a>
            <button className="btn btn-primary" onClick={() => setStep('options')}>
              Tạo ảnh khác
            </button>
          </div>
        </>
      )}

      {step === 'error' && (
        <>
          <div className="topbar">
            <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => setStep('options')} />
            <h1>Không tạo được ảnh</h1>
          </div>
          <div className="center-wrap">
            <span className="state-icon err">
              <WarnIcon />
            </span>
            <div className="gen-title">Hệ thống đang bận</div>
            <p className="gen-sub">{errorMessage || 'Không tạo được ảnh, vui lòng thử lại.'} Ảnh gốc và lượt dùng hôm nay của bạn không bị mất.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
              <button className="btn btn-primary" onClick={handleGenerate}>
                Thử lại
              </button>
              <button className="btn btn-ghost" onClick={() => navigate(`/products/${id}`)}>
                Quay lại sản phẩm
              </button>
            </div>
          </div>
        </>
      )}

      {step === 'quota' && (
        <>
          <div className="topbar">
            <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(`/products/${id}`)} />
            <h1>Hết lượt hôm nay</h1>
          </div>
          <div className="center-wrap">
            <span className="state-icon warn">
              <ClockIcon />
            </span>
            <div className="gen-title">Đã hết lượt tạo ảnh hôm nay</div>
            <p className="gen-sub">
              Bạn đã dùng hết lượt tạo ảnh AI hôm nay.
              {quotaResetAt ? ` Lượt mới sẽ làm mới lúc ${formatResetAt(quotaResetAt)}.` : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
              <button className="btn btn-disabled" disabled>
                Tạo ảnh AI
              </button>
              <button className="btn btn-ghost" onClick={() => navigate(`/products/${id}`)}>
                Quay lại sản phẩm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
