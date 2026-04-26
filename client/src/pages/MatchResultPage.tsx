import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from './ResumeUploadPage';

// SVG 圆环进度组件（深色版）
const ScoreRing: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const size = 160;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const duration = 1200;
    const step = (timestamp: number, startTime: number) => {
      const elapsed = timestamp - startTime;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(eased * score));
      setProgress(eased * score);
      if (p < 1) requestAnimationFrame(t => step(t, startTime));
    };
    requestAnimationFrame(t => step(t, t));
  }, [score]);

  const strokeDashoffset = circ - (progress / 100) * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(0,0,0,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          style={{ filter: `drop-shadow(0 0 10px ${color}70)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 40, fontWeight: 800, color,
          letterSpacing: '-2px', lineHeight: 1,
          fontFamily: 'var(--font)',
        }}>{displayScore}</span>
        <span style={{ fontSize: 12, color: '#86868B', marginTop: 4, fontWeight: 500 }}>匹配度</span>
      </div>
    </div>
  );
};

const MatchResultPage: React.FC = () => {
  const navigate = useNavigate();
  const matchData = JSON.parse(localStorage.getItem('match_data') || '{}');
  const jdData = JSON.parse(localStorage.getItem('jd_data') || '{}');
  const [visible, setVisible] = useState(false);

  const score = matchData.match_score || 0;
  const scoreColor = score >= 75 ? '#34C759' : score >= 50 ? '#FF9500' : '#FF3B30';
  const scoreLabel = score >= 75 ? '高度匹配' : score >= 50 ? '基本匹配' : '差距较大';
  const scoreHint = score >= 75
    ? '你与该岗位非常匹配，面试成功率较高'
    : score >= 50
      ? '有一定匹配度，建议重点准备差距项'
      : '差距较大，需要针对性地补充相关技能';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const sections = [
    {
      title: '你的优势',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      color: 'var(--green)',
      bg: 'rgba(52,211,153,0.06)',
      border: 'rgba(52,211,153,0.15)',
      items: matchData.strengths || [],
    },
    {
      title: '需要注意',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      color: 'var(--amber)',
      bg: 'rgba(251,191,36,0.06)',
      border: 'rgba(251,191,36,0.15)',
      items: matchData.gaps || [],
    },
    {
      title: '面试建议',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      color: 'var(--blue)',
      bg: 'rgba(79,142,247,0.06)',
      border: 'rgba(79,142,247,0.15)',
      items: matchData.interview_tips || [],
    },
  ];

  return (
    <div style={S.wrapper}>
      {/* 背景 */}
      <div style={S.orb1} />
      <div style={S.orb2} />

      <div style={S.container}>
        <Stepper current={3} />

        <div style={{
          ...S.card,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}>
          {/* Header */}
          <div style={S.header}>
            <div style={S.headerIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <h2 style={S.title}>岗位匹配分析</h2>
              <p style={S.subtitle}>
                {jdData.title || '目标岗位'}{jdData.company ? ` · ${jdData.company}` : ''}
              </p>
            </div>
          </div>

          {/* Score Section */}
          <div style={S.scoreSection}>
            <ScoreRing score={score} color={score >= 75 ? '#34D399' : score >= 50 ? '#FBBF24' : '#F87171'} />
            <div style={S.scoreMeta}>
              <span style={{
                ...S.scoreTag,
                background: score >= 75
                  ? 'rgba(52,211,153,0.12)'
                  : score >= 50
                    ? 'rgba(251,191,36,0.12)'
                    : 'rgba(248,113,113,0.12)',
                color: scoreColor,
                border: `1px solid ${score >= 75
                  ? 'rgba(52,211,153,0.25)'
                  : score >= 50
                    ? 'rgba(251,191,36,0.25)'
                    : 'rgba(248,113,113,0.25)'}`,
              }}>
                {scoreLabel}
              </span>
              <p style={S.scoreHint}>{scoreHint}</p>
              {/* 匹配度进度条 */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#86868B' }}>匹配进度</span>
                  <span style={{ fontSize: 11, color: scoreColor, fontWeight: 700 }}>{score}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${visible ? score : 0}%`,
                    background: `linear-gradient(90deg, ${score >= 75 ? '#34D399, #059669' : score >= 50 ? '#FBBF24, #D97706' : '#F87171, #DC2626'})`,
                    borderRadius: 99,
                    transition: 'width 1.2s cubic-bezier(0.25, 0.1, 0.25, 1) 0.3s',
                    boxShadow: `0 0 8px ${score >= 75 ? '#34D39980' : score >= 50 ? '#FBBF2480' : '#F8717180'}`,
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div style={S.sections}>
            {sections.map((sec, si) => sec.items.length > 0 && (
              <div key={si} style={{
                ...S.section,
                background: sec.bg,
                border: `1px solid ${sec.border}`,
                // 把 delay 合并进 animation shorthand，避免与 S.section.animation
                // 同时设置 animation + animationDelay 触发 React 警告
                animation: `msgIn 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) ${0.3 + si * 0.12}s both`,
              }}>
                <div style={S.sectionHeader}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${sec.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{sec.icon}</span>
                  <h3 style={{ ...S.sectionTitle, color: sec.color }}>{sec.title}</h3>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 99,
                    background: `${sec.border}`,
                    color: sec.color,
                  }}>
                    {sec.items.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sec.items.map((item: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: sec.color, flexShrink: 0, marginTop: 7,
                        boxShadow: `0 0 6px ${sec.color}80`,
                      }} />
                      <p style={{ fontSize: 13, color: '#3A3A3C', lineHeight: 1.6, margin: 0 }}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action */}
          <button
            onClick={() => navigate('/interview')}
            style={S.button}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            开始模拟面试
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
    top: -150, left: -150, pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(52,199,89,0.06) 0%, transparent 70%)',
    bottom: -100, right: -100, pointerEvents: 'none',
  },
  container: {
    width: '100%', maxWidth: 640,
    position: 'relative', zIndex: 1,
  },
  card: {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: 28,
    boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    padding: '36px',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32,
  },
  headerIcon: {
    width: 48, height: 48, borderRadius: 16,
    background: 'rgba(0,113,227,0.10)',
    border: '1px solid rgba(0,113,227,0.18)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 24, fontWeight: 700, color: '#1D1D1F',
    margin: '0 0 4px', letterSpacing: '-0.5px',
  },
  subtitle: { fontSize: 14, color: '#86868B', margin: 0 },
  scoreSection: {
    display: 'flex', alignItems: 'center', gap: 32,
    justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap',
    padding: '24px', borderRadius: 20,
    background: 'rgba(0,0,0,0.02)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  scoreMeta: { flex: 1, minWidth: 200, maxWidth: 280 },
  scoreTag: {
    display: 'inline-block',
    padding: '5px 14px', borderRadius: 99,
    fontSize: 13, fontWeight: 700, marginBottom: 10,
    letterSpacing: '-0.2px',
  },
  scoreHint: {
    fontSize: 13, color: '#6E6E73', lineHeight: 1.6, margin: 0,
  },
  sections: {
    display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28,
  },
  section: {
    borderRadius: 18, padding: '18px 20px',
    animation: 'msgIn 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) both',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 700, margin: 0, flex: 1,
  },
  button: {
    width: '100%', height: 54, borderRadius: 27, border: 'none',
    background: 'linear-gradient(135deg, #0071E3 0%, #005BB5 100%)',
    color: '#fff', fontSize: 16, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 4px 16px rgba(0,113,227,0.30)',
    transition: 'all 0.2s', cursor: 'pointer',
    letterSpacing: '-0.2px',
  },
};

export default MatchResultPage;