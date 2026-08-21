import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct } from '../api/products';
import { TipIcon, ClipboardIcon, CheckIcon } from '../components/icons';
import { SWATCHES } from '../constants/colors';

const BACKGROUND_OPTIONS = ['Studio nền trơn', 'Bàn gỗ mộc', 'Ngoài trời thiên nhiên', 'Kệ trưng bày cửa hàng', 'Bàn bếp/gia đình'];
const STYLE_OPTIONS = ['Tối giản', 'Sang trọng', 'Trẻ trung pastel', 'Mộc mạc tự nhiên', 'Rực rỡ nổi bật', 'Retro hoài cổ'];
const LIGHTING_OPTIONS = ['Ánh sáng tự nhiên', 'Studio sáng đều', 'Nắng vàng ấm', 'Đèn neon', 'Ánh sáng dịu buổi tối'];
const COMPOSITION_OPTIONS = ['Cận cảnh sản phẩm', 'Góc nghiêng 3/4', 'Flatlay từ trên xuống', 'Có bối cảnh sinh hoạt'];
const RATIO_OPTIONS = ['9:16 (TikTok/Story)', '1:1 (Vuông)', '4:5 (Instagram)', '16:9 (Ngang)'];
const AVOID_OPTIONS = ['Không đổi hình dáng sản phẩm', 'Không thêm chữ/watermark', 'Không đổi logo/nhãn hiệu', 'Không thêm người mẫu'];

const DEFAULT_AVOID = ['Không đổi hình dáng sản phẩm', 'Không thêm chữ/watermark'];

const INSTRUCTION =
  'Tạo ảnh sản phẩm mới dựa trên ảnh gốc tôi đính kèm, giữ nguyên hình dáng/logo/nhãn của sản phẩm thật, chỉ thay đổi bối cảnh, ánh sáng và phong cách theo mô tả bên dưới.';

function SingleChipField({ options, value, onSelect, addPlaceholder }) {
  const [extra, setExtra] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const all = [...options, ...extra];

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = customInput.trim();
    if (!val) return;
    if (!all.includes(val)) setExtra((prev) => [...prev, val]);
    onSelect(val);
    setCustomInput('');
  }

  return (
    <>
      <div className="chip-row">
        {all.map((opt) => (
          <button key={opt} type="button" className={`chip${value === opt ? ' on' : ''}`} onClick={() => onSelect(value === opt ? '' : opt)}>
            {opt}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="chip-add-input"
        placeholder={addPlaceholder}
        value={customInput}
        onChange={(e) => setCustomInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </>
  );
}

function MultiChipField({ options, values, onToggle, addPlaceholder }) {
  const [extra, setExtra] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const all = [...options, ...extra];

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = customInput.trim();
    if (!val) return;
    if (!all.includes(val)) setExtra((prev) => [...prev, val]);
    if (!values.includes(val)) onToggle(val);
    setCustomInput('');
  }

  return (
    <>
      <div className="chip-row">
        {all.map((opt) => (
          <button key={opt} type="button" className={`chip${values.includes(opt) ? ' on' : ''}`} onClick={() => onToggle(opt)}>
            {opt}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="chip-add-input"
        placeholder={addPlaceholder}
        value={customInput}
        onChange={(e) => setCustomInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </>
  );
}

export default function ImagePromptPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [keyFeatures, setKeyFeatures] = useState('');
  const [background, setBackground] = useState('');
  const [style, setStyle] = useState('');
  const [lighting, setLighting] = useState('');
  const [composition, setComposition] = useState('');
  const [ratio, setRatio] = useState(RATIO_OPTIONS[0]);
  const [selectedSwatch, setSelectedSwatch] = useState(null);
  const [avoidSelected, setAvoidSelected] = useState(DEFAULT_AVOID);
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getProduct(id, { signal: controller.signal })
      .then(setProduct)
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(err.message);
      });
    return () => controller.abort();
  }, [id]);

  function toggleAvoid(val) {
    setAvoidSelected((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  }

  const promptObject = {
    affiMateImagePrompt: {
      instruction: INSTRUCTION,
      product: {
        name: product?.name || '',
        description: product?.description || undefined,
        keyFeatures: keyFeatures.trim() || undefined,
      },
      scene: {
        background: background || undefined,
        style: style || undefined,
        lighting: lighting || undefined,
        composition: composition || undefined,
        primaryColor: selectedSwatch ? `${selectedSwatch.name} (${selectedSwatch.hex})` : undefined,
      },
      output: {
        aspectRatio: ratio || undefined,
      },
      avoid: avoidSelected.length > 0 ? avoidSelected : undefined,
      notes: notes.trim() || undefined,
    },
  };

  const jsonText = JSON.stringify(promptObject, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setLoadError('Không sao chép được — trình duyệt chặn quyền truy cập clipboard.');
    }
  }

  if (loadError && !product) {
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
      <div className="topbar">
        <button className="icon-btn icon-back" aria-label="Quay lại" onClick={() => navigate(`/products/${id}`)} />
        <h1>Mô tả ảnh AI</h1>
      </div>
      <p className="topbar-sub">Điền thông tin bên dưới, sao chép JSON rồi dán vào ChatGPT (kèm ảnh sản phẩm) để vẽ ảnh.</p>

      <div className="body">
        <div className="tip-banner">
          <TipIcon />
          <p>AffiMate không gọi ChatGPT hộ bạn — hãy dán JSON này cùng 1 ảnh sản phẩm gốc vào khung chat của ChatGPT để nó vẽ ảnh mới.</p>
        </div>

        {loadError && <div className="error-banner" role="alert">{loadError}</div>}

        <div className="field">
          <label>Đặc điểm nổi bật (tuỳ chọn)</label>
          <textarea
            rows={2}
            placeholder="VD: chất liệu gỗ tự nhiên, thiết kế tối giản, có 3 màu..."
            value={keyFeatures}
            onChange={(e) => setKeyFeatures(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Bối cảnh mong muốn</label>
          <SingleChipField options={BACKGROUND_OPTIONS} value={background} onSelect={setBackground} addPlaceholder="Bối cảnh khác… (Enter để thêm)" />
        </div>

        <div className="field">
          <label>Phong cách hình ảnh</label>
          <SingleChipField options={STYLE_OPTIONS} value={style} onSelect={setStyle} addPlaceholder="Phong cách khác… (Enter để thêm)" />
        </div>

        <div className="field">
          <label>Ánh sáng & không khí</label>
          <SingleChipField options={LIGHTING_OPTIONS} value={lighting} onSelect={setLighting} addPlaceholder="Ánh sáng khác… (Enter để thêm)" />
        </div>

        <div className="field">
          <label>Bố cục khung hình</label>
          <SingleChipField options={COMPOSITION_OPTIONS} value={composition} onSelect={setComposition} addPlaceholder="Bố cục khác… (Enter để thêm)" />
        </div>

        <div className="field">
          <label>Màu chủ đạo (tuỳ chọn)</label>
          <div className="swatch-row">
            {SWATCHES.map((sw) => (
              <button
                key={sw.hex}
                type="button"
                className={`swatch${selectedSwatch?.hex === sw.hex ? ' selected' : ''}`}
                style={{ background: sw.hex }}
                title={sw.name}
                onClick={() => setSelectedSwatch(selectedSwatch?.hex === sw.hex ? null : sw)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Tỷ lệ xuất ảnh</label>
          <SingleChipField options={RATIO_OPTIONS} value={ratio} onSelect={setRatio} addPlaceholder="Tỷ lệ khác… (Enter để thêm)" />
        </div>

        <div className="field">
          <label>Cần tránh</label>
          <MultiChipField options={AVOID_OPTIONS} values={avoidSelected} onToggle={toggleAvoid} addPlaceholder="Thêm điều cần tránh… (Enter để thêm)" />
        </div>

        <div className="field">
          <label>Ghi chú thêm (tuỳ chọn)</label>
          <textarea rows={2} placeholder="Bất kỳ yêu cầu nào khác..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="field">
          <label>JSON mô tả (tự động cập nhật)</label>
          <pre className="prompt-json-box">{jsonText}</pre>
        </div>
      </div>

      <div className="cta-bar">
        <button className="btn btn-primary" onClick={handleCopy}>
          {copied ? (
            <>
              <CheckIcon /> Đã sao chép
            </>
          ) : (
            <>
              <ClipboardIcon /> Sao chép JSON
            </>
          )}
        </button>
      </div>
    </div>
  );
}
