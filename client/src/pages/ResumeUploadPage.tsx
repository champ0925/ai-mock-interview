import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadResume } from '../api';

/* ── 共享步骤条（浅色） ── */
export const Stepper: React.FC<{ current: number }> = ({ current }) => {
  const steps = ['上传简历', '输入 JD', '匹配分析', '模拟面试'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 0, marginBottom: 32, padding: '12px 24px',
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      animation: 'fadeDown 0.4s var(--ease) both',
    }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const state = idx < current ? 'done' : idx === current ? 'active' : 'pending';
        return (
          <React.Fragment key={i}>
            {i > 0 && <div style={{
              width: 28, height: 1,
              background: state === 'done' || idx <= current
                ? 'linear-gradient(90deg, #34C759, rgba(0,113,227,0.4))'
                : 'rgba(0,0,0,0.08)',
              margin: '0 4px', transition: 'background 0.4s',
            }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: state === 'done' ? '#34C759' : state === 'active' ? '#0071E3' : 'rgba(0,0,0,0.06)',
                border: state === 'active' ? '2px solid rgba(0,113,227,0.30)' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
                color: state !== 'pending' ? '#fff' : '#6E6E73',
                boxShadow: state === 'active' ? '0 0 12px rgba(0,113,227,0.25)' : 'none',
                transition: 'all 0.3s',
              }}>
                {state === 'done' ? '✓' : idx}
              </div>
              <span style={{
                fontSize: 12, fontWeight: state === 'active' ? 700 : 500,
                color: state === 'done' ? '#248A3D' : state === 'active' ? '#0071E3' : '#6E6E73',
                whiteSpace: 'nowrap', transition: 'color 0.3s',
              }}>{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── 解析加载弹层（浅色） ── */
const ParseOverlay: React.FC = () => {
  const steps = [
    { icon: '📄', text: '读取文档内容...' },
    { icon: '🔍', text: '识别工作经历...' },
    { icon: '🛠️', text: '提取技能标签...' },
    { icon: '✨', text: '生成结构化数据...' },
  ];
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % steps.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 28, padding: '44px 48px', width: 380, textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.16)',
        animation: 'scaleIn 0.4s var(--spring)',
      }}>
        {/* 双环动画 */}
        <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 28px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(0,113,227,0.12)', borderTopColor: 'rgba(0,113,227,0.7)', animation: 'spin 2.5s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: '2px solid rgba(94,92,230,0.10)', borderBottomColor: 'rgba(94,92,230,0.5)', animation: 'spinReverse 3s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 24, borderRadius: '50%', background: 'rgba(0,113,227,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'breathe 2s ease-in-out infinite' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0071E3" strokeWidth="1.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px', letterSpacing: '-0.3px' }}>AI 正在解析简历</h3>
        <p style={{ fontSize: 13, color: '#86868B', margin: '0 0 28px' }}>请稍候，通常需要几秒钟</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 24 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i <= active ? 1 : 0.35, transform: i === active ? 'translateX(4px)' : 'none', transition: 'all 0.4s' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: i === active ? '#0071E3' : i < active ? '#248A3D' : '#86868B', fontWeight: i === active ? 600 : 400, flex: 1 }}>{s.text}</span>
              {i < active && <span style={{ fontSize: 12, color: '#34C759', fontWeight: 700 }}>✓</span>}
              {i === active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0071E3', animation: 'breathe 1s ease-in-out infinite' }} />}
            </div>
          ))}
        </div>
        <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((active + 1) / steps.length) * 100}%`, background: 'linear-gradient(90deg, #0071E3, #5E5CE6)', borderRadius: 99, transition: 'width 0.8s var(--ease)', boxShadow: '0 0 8px rgba(0,113,227,0.35)' }} />
        </div>
      </div>
    </div>
  );
};

const ResumeUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['pdf','doc','docx'].includes(ext || '')) { setError('仅支持 PDF、DOC、DOCX 格式'); return; }
    setFile(f); setError('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const res = await uploadResume(file);
      localStorage.setItem('resume_data', JSON.stringify(res.data.parsed_data));
      navigate('/jd-input');
    } catch (err: any) {
      setError(err.response?.data?.message || '上传失败');
    } finally { setLoading(false); }
  };

  const extColor: Record<string,string> = { PDF: '#FF3B30', DOC: '#0071E3', DOCX: '#0071E3' };
  const fileExt = file?.name.split('.').pop()?.toUpperCase() || '';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
      background: 'linear-gradient(150deg, #F0F4FF 0%, #F5F5F7 55%, #EEF0F8 100%)',
      fontFamily: 'var(--font)', position: 'relative', overflow: 'hidden',
    }}>
      {loading && <ParseOverlay />}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(0,113,227,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -180, right: -180, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(94,92,230,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -150, left: -150, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 580, position: 'relative', zIndex: 1, animation: 'fadeUp 0.5s var(--ease) both' }}>
        <Stepper current={1} />

        <div style={{
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24,
          padding: '36px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1D1D1F', margin: '0 0 6px', letterSpacing: '-0.5px' }}>上传你的简历</h2>
              <p style={{ fontSize: 13, color: '#86868B', margin: 0 }}>支持 PDF、DOC、DOCX，AI 将自动解析你的经历与技能</p>
            </div>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{
              background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 500,
              color: '#6E6E73', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              退出
            </button>
          </div>

          {/* 拖拽区 */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            style={{
              border: `2px dashed ${dragging ? '#0071E3' : file ? '#34C759' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: 18, padding: '44px 24px', cursor: 'pointer',
              background: dragging ? 'rgba(0,113,227,0.06)' : file ? 'rgba(52,199,89,0.06)' : '#FAFAFA',
              transition: 'all 0.25s var(--ease)',
              transform: dragging ? 'scale(1.01)' : 'scale(1)',
              marginBottom: 20, minHeight: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {!file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(0,113,227,0.10)', border: '1px solid rgba(0,113,227,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'float 3s ease-in-out infinite' }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0071E3" strokeWidth="1.4" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: 0 }}>拖拽简历到此处，或点击选择</p>
                <p style={{ fontSize: 12, color: '#86868B', margin: 0 }}>支持 PDF · DOC · DOCX · 最大 10MB</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {['PDF', 'DOC', 'DOCX'].map(f => (
                    <span key={f} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: f === 'PDF' ? 'rgba(255,59,48,0.10)' : 'rgba(0,113,227,0.10)', color: f === 'PDF' ? '#D70015' : '#0071E3', border: `1px solid ${f === 'PDF' ? 'rgba(255,59,48,0.20)' : 'rgba(0,113,227,0.20)'}` }}>{f}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '0 8px' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${extColor[fileExt] || '#0071E3'}1A`, border: `1px solid ${extColor[fileExt] || '#0071E3'}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={extColor[fileExt] || '#0071E3'} strokeWidth="1.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                  <p style={{ fontSize: 12, color: '#86868B', margin: 0 }}>{(file.size / 1024).toFixed(1)} KB · {fileExt}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', color: '#86868B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#D70015', background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.22)', borderRadius: 10, padding: '9px 13px', marginBottom: 16 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}

          <button onClick={handleUpload} disabled={!file || loading} style={{
            width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: (!file || loading) ? 'rgba(0,113,227,0.25)' : 'linear-gradient(135deg, #0071E3 0%, #005BB5 100%)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: (!file || loading) ? 'not-allowed' : 'pointer',
            boxShadow: (!file || loading) ? 'none' : '0 4px 20px rgba(0,113,227,0.30)',
            transition: 'all 0.2s',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            上传并解析简历
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeUploadPage;