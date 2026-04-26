import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Stepper } from './ResumeUploadPage';

// JD 解析加载动画（深色版）
const JdAnalysisOverlay: React.FC = () => {
  const [phase, setPhase] = React.useState(0);
  const phases = [
    { label: '读取岗位信息', sub: '提取职位名称与公司信息...' },
    { label: '分析岗位要求', sub: '识别技能与经验要求...' },
    { label: '匹配简历数据', sub: '对比你的背景与岗位需求...' },
    { label: 'AI 生成分析', sub: '计算匹配度与优化建议...' },
  ];

  React.useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % phases.length), 1100);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 28,
        padding: '48px 44px',
        width: '100%', maxWidth: 360,
        textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}>
        {/* 双环动画 */}
        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 32px' }}>
          {/* 外环 */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: 'var(--blue)',
            borderRightColor: 'rgba(0,113,227,0.35)',
            animation: 'spin 1.8s linear infinite',
          }} />
          {/* 内环 */}
          <div style={{
            position: 'absolute', inset: 12, borderRadius: '50%',
            border: '2px solid transparent',
            borderBottomColor: 'var(--purple)',
            borderLeftColor: 'rgba(94,92,230,0.35)',
            animation: 'spinReverse 2.4s linear infinite',
          }} />
          {/* 中心 */}
          <div style={{
            position: 'absolute', inset: 24, borderRadius: '50%',
            background: 'radial-gradient(circle, var(--blue-dim) 0%, transparent 70%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
        </div>

        <div key={phase} style={{ animation: 'msgIn 0.35s ease both', marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
            {phases[phase].label}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
            {phases[phase].sub}
          </p>
        </div>

        {/* 进度点 */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {phases.map((_, i) => (
            <div key={i} style={{
              width: i === phase ? 20 : 6, height: 6, borderRadius: 99,
              background: i === phase ? 'var(--blue)' : 'var(--glass-border)',
              transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          ))}
        </div>

        <p style={{
          fontSize: 12, color: 'var(--text-3)', margin: 0,
          padding: '8px 14px',
          background: 'var(--blue-dim)',
          borderRadius: 10,
          border: '1px solid rgba(79,142,247,0.15)',
        }}>AI 正在为你量身定制面试题库</p>
      </div>
    </div>
  );
};

const JdInputPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [hoveredTab, setHoveredTab] = useState<'text' | 'image' | null>(null);
  const [jdText, setJdText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageFile = (f: File) => {
    if (!['png', 'jpg', 'jpeg', 'bmp', 'webp'].includes(f.name.split('.').pop()?.toLowerCase() || '')) {
      setError('仅支持 PNG、JPG、JPEG、BMP、WebP 格式');
      return;
    }
    setImageFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      let jdResult: any;
      if (mode === 'text') {
        if (!jdText.trim()) { setError('请输入JD文本'); setLoading(false); return; }
        const res = await api.post('/jd/parse_text', { jd_text: jdText });
        jdResult = res.data.parsed_jd;
      } else {
        if (!imageFile) { setError('请选择JD截图'); setLoading(false); return; }
        const form = new FormData();
        form.append('file', imageFile);
        const res = await api.post('/jd/upload_image', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        jdResult = res.data.parsed_jd;
      }
      localStorage.setItem('jd_data', JSON.stringify(jdResult));
      const resumeData = JSON.parse(localStorage.getItem('resume_data') || '{}');
      const matchRes = await api.post('/match/analyze', {
        resume_json: resumeData,
        jd_json: jdResult,
      });
      localStorage.setItem('match_data', JSON.stringify(matchRes.data.match_result));

      // 提交了**新的 JD** = 用户决定开启新一场面试，必须把旧上下文彻底清掉，
      // 否则进入 InterviewPage 时 /session/restore 会拿到上一场的题目和回答（已踩坑）。
      // 这里同时清：
      //   1) 后端 Redis 会话（题目/对话历史）
      //   2) 前端缓存的旧报告 + 上一场面试快照
      try { await api.delete('/session/clear'); } catch (e) { console.warn('清理后端会话失败:', e); }
      localStorage.removeItem('report_data');
      localStorage.removeItem('interview_questions');
      localStorage.removeItem('interview_messages');

      navigate('/match-result');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '解析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.wrapper}>
      {loading && <JdAnalysisOverlay />}

      {/* 背景光晕 */}
      <div style={S.orb1} />
      <div style={S.orb2} />

      <div style={S.container}>
        <Stepper current={2} />

        <div style={S.card}>
          {/* Header */}
          <div style={S.header}>
            <button onClick={() => navigate('/upload')} style={S.backBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h2 style={S.title}>输入岗位 JD</h2>
              <p style={S.subtitle}>粘贴文本或上传招聘页截图</p>
            </div>
            <div style={{ width: 36 }} />
          </div>

          {/* Mode Switcher */}
          <div style={S.tabBar}>
            {(['text', 'image'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                onMouseEnter={() => setHoveredTab(m)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  ...S.tab,
                  background: mode === m
                    ? '#EBF4FF'
                    : hoveredTab === m ? '#E6E9EE' : 'var(--surface-2)',
                  color: mode === m ? 'var(--blue)' : 'var(--text-1)',
                  border: mode === m
                    ? '2px solid var(--blue)'
                    : '1px solid rgba(0,0,0,0.09)',
                  boxShadow: 'none',
                  fontWeight: mode === m ? 700 : 600,
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}
              >
                {m === 'text' ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={mode === m ? 'var(--blue)' : '#6E6E73'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    粘贴文本
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={mode === m ? 'var(--blue)' : '#6E6E73'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    上传截图
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Text Mode */}
          {mode === 'text' ? (
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <textarea
                style={S.textarea}
                placeholder={`粘贴岗位 JD 内容，例如：\n\n岗位名称：AI 产品经理\n公司：字节跳动\n\n岗位职责：\n1. 负责 AI 产品规划与设计\n2. 推动大模型应用落地`}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={12}
              />
              {jdText && (
                <div style={{
                  position: 'absolute', right: 12, bottom: 10,
                  fontSize: 11, color: 'var(--text-3)', pointerEvents: 'none',
                }}>{jdText.length} 字</div>
              )}
            </div>
          ) : (
            /* Image Mode */
            <div
              style={{
                ...S.imageDrop,
                borderColor: imagePreview ? 'var(--blue)' : 'rgba(0,0,0,0.12)',
                background: imagePreview ? 'var(--blue-dim)' : '#FAFAFA',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
              />
              {imagePreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <img src={imagePreview} alt="JD预览" style={{
                    maxWidth: '100%', maxHeight: 260, borderRadius: 12,
                    objectFit: 'contain',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                    border: '1px solid var(--glass-border)',
                  }} />
                  <button
                    style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                  >更换图片</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'var(--blue-dim)',
                    border: '1px solid rgba(0,113,227,0.30)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'breathe 3s ease-in-out infinite',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>点击上传 JD 截图</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>PNG · JPG · JPEG · WebP</p>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={S.errorMsg}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...S.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            解析 JD 并查看匹配度
          </button>
        </div>
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(150deg, #F0F4FF 0%, #F5F5F7 55%, #EEF0F8 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '32px 20px',
    fontFamily: 'var(--font)',
    position: 'relative', overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,113,227,0.07) 0%, transparent 70%)',
    top: -150, right: -100, pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(94,92,230,0.05) 0%, transparent 70%)',
    bottom: -100, left: -100, pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: 680,
    position: 'relative', zIndex: 1,
    animation: 'msgIn 0.5s ease both',
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 28,
    boxShadow: '0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
    padding: '36px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'var(--surface-2)', border: '1px solid var(--glass-border)',
    color: 'var(--text-1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'background 0.2s',
  },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px', letterSpacing: '-0.4px' },
  subtitle: { fontSize: 14, color: 'var(--text-2)', margin: 0 },
  tabBar: {
    display: 'flex', gap: 10, marginBottom: 20,
  },
  tab: {
    flex: 1, height: 44, borderRadius: 22,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)',
    fontFamily: 'var(--font)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  textarea: {
    width: '100%', minHeight: 240,
    borderRadius: 16, border: '1.5px solid rgba(0,0,0,0.09)',
    background: '#FAFAFA',
    padding: 16, fontSize: 14, fontFamily: 'var(--font)',
    resize: 'vertical' as const,
    outline: 'none', lineHeight: 1.7,
    boxSizing: 'border-box' as const,
    color: 'var(--text-1)',
    transition: 'border-color 0.2s',
  },
  imageDrop: {
    border: '2px dashed',
    borderRadius: 16, padding: '40px 24px',
    cursor: 'pointer', transition: 'all 0.2s',
    marginBottom: 20, minHeight: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  errorMsg: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 13, color: 'var(--red)',
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 10, padding: '9px 13px', marginBottom: 16,
  },
  button: {
    width: '100%', height: 54, borderRadius: 27, border: 'none',
    background: 'linear-gradient(135deg, #0071E3 0%, #005BB5 100%)',
    color: '#fff', fontSize: 16, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 4px 16px rgba(0,113,227,0.30)',
    transition: 'all 0.2s',
    letterSpacing: '-0.2px',
  },
};

export default JdInputPage;