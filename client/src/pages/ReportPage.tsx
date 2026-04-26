import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// 星星评分（深色版）
const ScoreStars: React.FC<{ score: number; max?: number }> = ({ score, max = 5 }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {Array.from({ length: max }).map((_, i) => (
      <svg key={i} width="13" height="13" viewBox="0 0 24 24"
        fill={i < score ? 'var(--amber)' : 'none'}
        stroke={i < score ? 'var(--amber)' : 'rgba(0,0,0,0.12)'}
        strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

// 分数进度条（深色版）
const ScoreBar: React.FC<{ score: number; max?: number; color: string }> = ({ score, max = 5, color }) => {
  const [width, setWidth] = useState(0);
  const pct = (score / max) * 100;
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{ height: 5, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{
        height: '100%', width: `${width}%`,
        background: color, borderRadius: 99,
        transition: 'width 0.9s cubic-bezier(0.25, 0.1, 0.25, 1)',
        boxShadow: `0 0 8px ${color}70`,
      }} />
    </div>
  );
};

// 总评分圆环（深色版）
const OverallScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const [display, setDisplay] = useState(0);
  const [progress, setProgress] = useState(0);
  const size = 140, stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = (score / 5) * 100;

  const color = score >= 4 ? '#34D399' : score >= 3 ? '#FBBF24' : '#F87171';
  const label = score >= 4 ? '优秀' : score >= 3 ? '良好' : '需改进';

  useEffect(() => {
    const duration = 1400;
    const step = (ts: number, start: number) => {
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Number((e * score).toFixed(1)));
      setProgress(e * pct);
      if (p < 1) requestAnimationFrame(t => step(t, start));
    };
    requestAnimationFrame(t => step(t, t));
  }, [score]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - (progress / 100) * circ}
          style={{ filter: `drop-shadow(0 0 10px ${color}70)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          fontSize: 32, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-1px',
        }}>{display}</span>
        <span style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>/ 5.0</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color,
          background: `${color}20`,
          padding: '2px 8px', borderRadius: 99, marginTop: 4,
          border: `1px solid ${color}40`,
        }}>{label}</span>
      </div>
    </div>
  );
};

// 报告生成加载动画（深色版）
const ReportLoadingScreen: React.FC = () => {
  const [step, setStep] = React.useState(0);
  const steps = ['分析面试对话...', '整理答题情况...', '计算各维度评分...', '生成改进建议...'];
  React.useEffect(() => {
    const t = setInterval(() => setStep(p => (p + 1) % steps.length), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface-0)',
      gap: 32, fontFamily: 'var(--font)',
      position: 'relative',
    }}>
      {/* 背景光晕 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(0,113,227,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', width: 88, height: 88 }}>
        {/* 外旋转圈 */}
        <div style={{
          position: 'absolute', inset: -10, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'var(--blue)',
          borderRightColor: 'rgba(79,142,247,0.3)',
          animation: 'spin 2s linear infinite',
        }} />
        {/* 内反转圈 */}
        <div style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          border: '1.5px solid transparent',
          borderBottomColor: 'var(--purple)',
          animation: 'spinReverse 3s linear infinite',
        }} />
        {/* 核心 */}
        <div style={{
          width: 88, height: 88, borderRadius: 24,
          background: 'linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px var(--blue-glow)',
          animation: 'breathe 2.5s ease-in-out infinite',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
      </div>

      <div style={{ textAlign: 'center', position: 'relative' }}>
        <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
          正在生成评估报告
        </h3>
        <p key={step} style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, animation: 'msgIn 0.3s ease' }}>
          {steps[step]}
        </p>
      </div>

      {/* 步骤指示 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 7, height: 7, borderRadius: 99,
            background: i === step ? 'var(--blue)' : 'rgba(0,0,0,0.10)',
            transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: i === step ? '0 0 8px var(--blue-glow)' : 'none',
          }} />
        ))}
      </div>
    </div>
  );
};

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // React 18 StrictMode 在开发期会把 effect 执行两次，用 ref 做幂等守卫，
  // 避免重复触发昂贵的 /report/generate 调用
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const cached = localStorage.getItem('report_data');
    if (cached) {
      try { setReport(JSON.parse(cached)); setLoading(false); return; } catch {}
    }
    generateReport();
  }, []);

  const generateReport = async () => {
    const resume = JSON.parse(localStorage.getItem('resume_data') || '{}');
    const jd = JSON.parse(localStorage.getItem('jd_data') || '{}');
    const match = JSON.parse(localStorage.getItem('match_data') || '{}');
    // 优先从 localStorage 读 InterviewPage 结束时写入的面试上下文
    let questions = JSON.parse(localStorage.getItem('interview_questions') || '[]');
    let chatHistory = JSON.parse(localStorage.getItem('interview_messages') || '[]');

    // 兜底：如果 localStorage 里没有（例如用户刷新了报告页、或从其他路径进入），
    // 从后端 /session/restore 拉取真实面试数据。这是"报告显示 0 题"类问题的
    // 最后一道防线——只要 Redis 还有会话，就不会出现负载空数组。
    if (!Array.isArray(questions) || questions.length === 0 ||
        !Array.isArray(chatHistory) || chatHistory.length === 0) {
      try {
        console.warn('[Report] localStorage 面试上下文为空，尝试从 /session/restore 兜底');
        const restore = await api.get('/session/restore');
        const s = restore.data?.session;
        if (s) {
          if ((!Array.isArray(questions) || questions.length === 0) && Array.isArray(s.questions)) {
            questions = s.questions;
            localStorage.setItem('interview_questions', JSON.stringify(questions));
          }
          if ((!Array.isArray(chatHistory) || chatHistory.length === 0) && Array.isArray(s.messages)) {
            chatHistory = s.messages;
            localStorage.setItem('interview_messages', JSON.stringify(chatHistory));
          }
          console.log('[Report] 已从 /session/restore 兜底恢复：questions=' +
            `${questions.length} 道，messages=${chatHistory.length} 条`);
        } else {
          console.warn('[Report] /session/restore 也没有会话数据，报告可能为空');
        }
      } catch (e) {
        console.warn('[Report] /session/restore 兜底失败:', e);
      }
    }

    // 调试日志：把请求体的关键计数打印出来，便于「报告显示已答 0 题」类问题
    const userMsgs = chatHistory.filter((m: any) => m?.role === 'user');
    const validUserMsgs = userMsgs.filter((m: any) => {
      const c = (m?.content || '').trim();
      return c && !['[跳过]', '跳过', 'skip', 'pass'].includes(c);
    });
    console.log(
      `[Report] 准备生成：questions=${questions.length} 道，chat_history=${chatHistory.length} 条，` +
      `user 消息=${userMsgs.length} 条，有效作答=${validUserMsgs.length} 条`,
      { questions, chatHistorySample: chatHistory.slice(0, 4) }
    );

    try {
      const res = await api.post('/report/generate', {
        resume_json: resume, jd_json: jd,
        match_analysis: match,
        questions,
        chat_history: chatHistory,
      });
      const data = res.data.report || res.data;
      setReport(data);
      // 只缓存"看起来有效"的报告，避免把一次异常输出永远钉在前端
      const looksValid = Array.isArray(data?.question_scores)
        && data.question_scores.some((q: any) => (q?.score ?? 0) > 0 || (q?.comment && q.comment.length > 0));
      if (looksValid) {
        localStorage.setItem('report_data', JSON.stringify(data));
      } else {
        console.warn(
          '[Report] 生成结果看起来异常（全 0 分或无评论），不缓存，允许用户重新生成。',
          { rawReport: data }
        );
        localStorage.removeItem('report_data');
      }
    } catch (err) { console.error('报告加载失败:', err); }
    finally { setLoading(false); }
  };

  const handleRegenerate = () => {
    if (!window.confirm('将重新调用 AI 生成这份报告，是否继续？')) return;
    localStorage.removeItem('report_data');
    setReport(null);
    setLoading(true);
    generateReport();
  };

  /**
   * 「重新面试」= 对同一份简历 + JD 重开一场。必须同步清掉：
   *   - 后端 Redis 会话（否则 /session/restore 会恢复上一场的题目/回答）
   *   - 前端缓存的上一场面试快照和旧报告
   * 这是从 ReportPage 进入 InterviewPage 的唯一入口，任何一处遗漏清理都会
   * 让新一场面试显示"上一场的题目和回答"。
   */
  const handleRetakeInterview = async () => {
    try { await api.delete('/session/clear'); } catch (e) { console.warn('清理后端会话失败:', e); }
    localStorage.removeItem('report_data');
    localStorage.removeItem('interview_questions');
    localStorage.removeItem('interview_messages');
    navigate('/interview');
  };

  if (loading) return <ReportLoadingScreen />;

  const score = report?.overall_score || 0;
  const jdData = JSON.parse(localStorage.getItem('jd_data') || '{}');

  const infoSections = [
    {
      title: '你的优势', color: 'var(--green)',
      bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.15)',
      items: report?.strengths || [],
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    {
      title: '待改进项', color: 'var(--amber)',
      bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.15)',
      items: report?.weaknesses || [],
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
    {
      title: '改进建议', color: 'var(--blue)',
      bg: 'rgba(79,142,247,0.06)', border: 'rgba(79,142,247,0.15)',
      items: report?.suggestions || [],
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  ];

  return (
    <div style={S.wrapper}>
      {/* 装饰光晕单独包一层 absolute 容器，避免外层 overflow 把内容裁掉 */}
      <div style={S.decorLayer} aria-hidden>
        <div style={S.orb1} />
        <div style={S.orb2} />
      </div>

      <div style={S.container}>
        {/* 顶部操作栏：返回首页，避免用户在报告页无路可退 */}
        
        <div style={S.topBar}>
          <button
            onClick={() => navigate('/upload')}
            style={S.topBarBtn}
            title="返回首页（重新上传简历）"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回首页
          </button>
          <button
            onClick={handleRegenerate}
            style={{ ...S.topBarBtn, marginLeft: 'auto' }}
            title="重新调用 AI 生成本次面试的评估"
            className="no-print"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.13-9.36L23 10" />
            </svg>
            重新生成
          </button>
          <button
            onClick={() => window.print()}
            style={{ ...S.topBarBtn }}
            title="导出报告（调用浏览器打印，可保存为 PDF）"
            className="no-print"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            导出报告
          </button>
        </div>

        {/* Header */}
        <div style={S.pageHeader}>
          <div style={S.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <h2 style={S.pageTitle}>面试评估报告</h2>
            <p style={S.pageSubtitle}>{jdData.title || '目标岗位'}{jdData.company ? ` · ${jdData.company}` : ''}</p>
          </div>
        </div>

        {/* Score Card */}
        <div style={S.scoreCard}>
          <OverallScoreRing score={score} />
          <div style={S.scoreSummary}>
            <h3 style={S.scoreTitle}>综合评分</h3>
            <p style={S.scoreDesc}>
              {score >= 4 ? '非常出色！你的面试表现令人印象深刻。' :
                score >= 3 ? '表现良好，还有一些提升空间。' :
                  '需要加强练习，针对弱项重点提升。'}
            </p>
            <div style={S.statRow}>
              <div style={S.statItem}>
                <span style={S.statNum}>{report?.question_scores?.length || 0}</span>
                <span style={S.statLabel}>答题数</span>
              </div>
              <div style={S.statDivider} />
              <div style={S.statItem}>
                <span style={{ ...S.statNum, color: 'var(--green)' }}>
                  {report?.question_scores?.filter((q: any) => q.score >= 4).length || 0}
                </span>
                <span style={S.statLabel}>优秀回答</span>
              </div>
              <div style={S.statDivider} />
              <div style={S.statItem}>
                <span style={{ ...S.statNum, color: 'var(--amber)' }}>
                  {report?.question_scores?.filter((q: any) => q.score < 3).length || 0}
                </span>
                <span style={S.statLabel}>待提升</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Scores */}
        {report?.question_scores?.length > 0 && (
          <div style={S.section}>
            <h3 style={S.sectionTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
              </svg>
              逐题评估
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {report.question_scores.map((qs: any, i: number) => {
                const qColor = qs.score >= 4 ? '#34D399' : qs.score >= 3 ? '#FBBF24' : '#F87171';
                return (
                  <div key={i} style={{
                    padding: '18px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    animation: `msgIn 0.35s ease ${i * 0.06}s both`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6,
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                          background: `${qColor}20`, color: qColor,
                          border: `1px solid ${qColor}30`,
                        }}>Q{i + 1}</span>
                        <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.5, margin: 0, flex: 1 }}>{qs.question}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <ScoreStars score={qs.score} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: qColor }}>{qs.score}/5</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <ScoreBar score={qs.score} color={qColor} />
                    </div>
                    {qs.comment && (
                      <p style={{
                        fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5,
                        margin: 0, fontStyle: 'italic',
                        paddingLeft: 8, borderLeft: `2px solid rgba(0,0,0,0.08)`,
                      }}>{qs.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Sections */}
        {infoSections.map((sec, si) => sec.items.length > 0 && (
          <div key={si} style={{
            borderRadius: 20, padding: '20px 24px',
            background: sec.bg,
            border: `1px solid ${sec.border}`,
            animation: `msgIn 0.4s ease ${si * 0.1}s both`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 7,
                background: sec.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{sec.icon}</span>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, flex: 1, color: sec.color }}>{sec.title}</h3>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: sec.border, color: sec.color }}>
                {sec.items.length}
              </span>
            </div>
            {sec.items.map((item: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: sec.color, flexShrink: 0, marginTop: 7,
                  boxShadow: `0 0 6px ${sec.color}80`,
                }} />
                <p style={{ fontSize: 13, color: '#3A3A3C', lineHeight: 1.6, margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        ))}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, padding: '8px 0 24px' }}>
          <button
            onClick={() => navigate('/upload')}
            style={S.secondaryBtn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            再来一次
          </button>
          <button
            onClick={handleRetakeInterview}
            style={S.primaryBtn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            重新面试
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
    display: 'flex', justifyContent: 'center',
    padding: '24px 20px 48px',
    fontFamily: 'var(--font)',
    position: 'relative',
    // 不再设 overflow: hidden —— 外层必须允许滚动，否则报告内容会被裁掉
  },
  decorLayer: {
    position: 'absolute', inset: 0,
    overflow: 'hidden',           // 装饰光晕在这一层内裁切，避免造成横向滚动
    pointerEvents: 'none',
    zIndex: 0,
  },
  orb1: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,113,227,0.06) 0%, transparent 70%)',
    top: -150, left: -150,
  },
  orb2: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(94,92,230,0.05) 0%, transparent 70%)',
    bottom: -100, right: -100,
  },
  container: {
    width: '100%', maxWidth: 700,
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', gap: 16,
    animation: 'msgIn 0.5s ease both',
  },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 4,
  },
  topBarBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 99,
    padding: '7px 14px',
    fontSize: 12, fontWeight: 600, color: '#1D1D1F',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  pageHeader: {
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8,
  },
  headerIcon: {
    width: 50, height: 50, borderRadius: 16,
    background: 'linear-gradient(135deg, #0071E3 0%, #5E5CE6 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,113,227,0.28)', flexShrink: 0,
  },
  pageTitle: {
    fontSize: 26, fontWeight: 700, color: '#1D1D1F',
    margin: '0 0 2px', letterSpacing: '-0.6px',
  },
  pageSubtitle: { fontSize: 14, color: '#86868B', margin: 0 },
  scoreCard: {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: 24,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    padding: '28px 32px',
    display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
  },
  scoreSummary: { flex: 1, minWidth: 200 },
  scoreTitle: { fontSize: 16, fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' },
  scoreDesc: { fontSize: 13, color: '#6E6E73', lineHeight: 1.6, margin: '0 0 20px' },
  statRow: { display: 'flex', alignItems: 'center', gap: 16 },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  statNum: { fontSize: 22, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-1px', lineHeight: 1 },
  statLabel: { fontSize: 11, color: '#86868B', fontWeight: 500 },
  statDivider: { width: 1, height: 32, background: 'rgba(0,0,0,0.07)' },
  section: {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: 24,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    padding: '24px 28px',
  },
  sectionTitle: {
    fontSize: 16, fontWeight: 700, color: '#1D1D1F',
    margin: '0 0 16px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  primaryBtn: {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'linear-gradient(135deg, #0071E3 0%, #005BB5 100%)',
    border: 'none', borderRadius: 26, padding: '14px 28px',
    fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,113,227,0.30)',
    transition: 'all 0.2s',
  },
  secondaryBtn: {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.08)', borderRadius: 26, padding: '14px 28px',
    fontSize: 15, fontWeight: 600, color: '#1D1D1F', cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default ReportPage;