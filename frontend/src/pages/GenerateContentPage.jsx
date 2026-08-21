import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct } from '../api/products';
import { generateContent } from '../api/contents';
import { ApiError } from '../api/client';
import { WarnIcon, ClockIcon } from '../components/icons';

const TONES = [
  { value: 'gan-gui', emoji: '😊', label: 'Gần gũi', sub: 'Giọng thân thiện, dễ mến' },
  { value: 'hai-huoc', emoji: '🤣', label: 'Hài hước', sub: 'Vui nhộn, gây cười' },
  { value: 'chuyen-nghiep', emoji: '💼', label: 'Chuyên nghiệp', sub: 'Đáng tin cậy, nghiêm túc' },
];

function formatResetAt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export default function GenerateContentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState('options'); // options | generating | result | error | quota
  const [tone, setTone] = useState('gan-gui');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [quotaResetAt, setQuotaResetAt] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getProduct(id, { signal: controller.signal })
      .then(setProduct)
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(err.message);
      });
    return () => controller.abort();
  }, [id]);

  async function handleGenerate() {
    setStep('generating');
    try {
      const record = await generateContent(id, { tone });
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

  function copy(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    });
  }

  function copyAll() {
    if (!result) return;
    copy('all', `${result.hook}\n\n${result.body}\n\n${result.cta}`);
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="topbar">
          <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(`/products/${id}`)} />
        </div>
        <div className="body">
          <div className="error-banner" role="alert">{loadError}</div>
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
      {step === 'options' && (
        <>
          <div className="topbar">
            <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(`/products/${id}`)} />
            <h1>Sinh nội dung tự động</h1>
          </div>
          <p className="topbar-sub">Chọn tông giọng cho kịch bản TikTok của "{product.name}"</p>
          <div className="body">
            <div className="opt-group">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  className={`opt-card${tone === t.value ? ' on' : ''}`}
                  onClick={() => setTone(t.value)}
                >
                  <span className="opt-swatch">{t.emoji}</span>
                  <span className="opt-txt">
                    <b>{t.label}</b>
                    <span>{t.sub}</span>
                  </span>
                  <span className="opt-radio" />
                </button>
              ))}
            </div>
          </div>
          <div className="cta-bar">
            <button className="btn btn-primary" onClick={handleGenerate}>
              Tạo kịch bản
            </button>
          </div>
        </>
      )}

      {step === 'generating' && (
        <>
          <div className="topbar">
            <span className="icon-btn" style={{ visibility: 'hidden' }} />
            <h1>Đang tạo nội dung</h1>
          </div>
          <div className="center-wrap">
            <div className="spinner" />
            <div>
              <div className="gen-title">Đang viết kịch bản…</div>
              <div className="gen-sub">Có thể mất 10–20 giây. Đừng rời khỏi trang trong lúc chờ nhé.</div>
            </div>
          </div>
        </>
      )}

      {step === 'result' && result && (
        <>
          <div className="topbar">
            <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(`/products/${id}`)} />
            <h1>Kịch bản của bạn</h1>
          </div>
          <div className="body">
            <div className="tag-row">
              <span className="tag">{TONES.find((t) => t.value === result.tone)?.label || 'Gần gũi'}</span>
              <span className="tag time">Vừa xong</span>
            </div>

            <div className="content-block">
              <div className="content-block-head">
                <b>Hook — mở đầu</b>
                <button className="copy-btn" onClick={() => copy('hook', result.hook)}>
                  {copiedKey === 'hook' ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <p>{result.hook}</p>
            </div>

            <div className="content-block">
              <div className="content-block-head">
                <b>Nội dung chính</b>
                <button className="copy-btn" onClick={() => copy('body', result.body)}>
                  {copiedKey === 'body' ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <p>{result.body}</p>
            </div>

            <div className="content-block">
              <div className="content-block-head">
                <b>CTA — kêu gọi hành động</b>
                <button className="copy-btn" onClick={() => copy('cta', result.cta)}>
                  {copiedKey === 'cta' ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <p>{result.cta}</p>
            </div>
          </div>
          <div className="cta-bar">
            <button className="btn btn-outline" onClick={copyAll}>
              {copiedKey === 'all' ? 'Đã sao chép tất cả' : 'Sao chép tất cả'}
            </button>
            <button className="btn btn-primary" onClick={() => setStep('options')}>
              Tạo kịch bản khác
            </button>
          </div>
        </>
      )}

      {step === 'error' && (
        <>
          <div className="topbar">
            <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => setStep('options')} />
            <h1>Không tạo được nội dung</h1>
          </div>
          <div className="center-wrap">
            <span className="state-icon err">
              <WarnIcon />
            </span>
            <div className="gen-title">Hệ thống đang bận</div>
            <p className="gen-sub">{errorMessage || 'Không tạo được nội dung, vui lòng thử lại.'} Lượt dùng hôm nay của bạn không bị mất thêm.</p>
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
            <div className="gen-title">Đã hết lượt tạo nội dung hôm nay</div>
            <p className="gen-sub">
              Bạn đã dùng hết lượt tạo nội dung AI hôm nay.
              {quotaResetAt ? ` Lượt mới sẽ làm mới lúc ${formatResetAt(quotaResetAt)}.` : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
              <button className="btn btn-disabled" disabled>
                Tạo kịch bản
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
