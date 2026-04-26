import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface Message { role: 'interviewer' | 'user'; content: string; }
interface Question { text: string; type: string; }

/* ── AI 面试官头像（左栏主视觉） ── */
const AIOrb: React.FC<{ speaking: boolean; thinking: boolean }> = ({ speaking, thinking }) => (
  <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
    {/* 最外层涟漪 */}
    {speaking && [0, 1, 2].map(i => (
      <div key={i} style={{
        position: 'absolute', inset: -(i * 22 + 18), borderRadius: '50%',
        border: `1.5px solid rgba(79,142,247,${0.18 - i * 0.05})`,
        animation: `ripple 2.4s ease-out ${i * 0.5}s infinite`,
      }} />
    ))}
    {/* 外发光环 */}
    <div style={{
      position: 'absolute', inset: -6, borderRadius: '50%',
      background: speaking
        ? 'radial-gradient(circle, rgba(79,142,247,0.22) 0%, transparent 70%)'
        : 'radial-gradient(circle, rgba(155,127,234,0.12) 0%, transparent 70%)',
      animation: 'breathe 2.5s ease-in-out infinite',
      transition: 'background 0.6s',
    }} />
    {/* 旋转光环 */}
    <div style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      border: '2px solid transparent',
      borderTopColor: speaking ? 'rgba(79,142,247,0.7)' : 'rgba(155,127,234,0.4)',
      borderRightColor: speaking ? 'rgba(79,142,247,0.3)' : 'rgba(155,127,234,0.15)',
      animation: `spin ${speaking ? 2 : 5}s linear infinite`,
      transition: 'border-color 0.6s',
    }} />
    <div style={{
      position: 'absolute', inset: 8, borderRadius: '50%',
      border: '1.5px solid transparent',
      borderBottomColor: speaking ? 'rgba(52,211,153,0.5)' : 'rgba(155,127,234,0.25)',
      animation: `spinReverse ${speaking ? 3 : 7}s linear infinite`,
    }} />
    {/* 核心球体 */}
    <div style={{
      position: 'absolute', inset: 16, borderRadius: '50%',
      background: speaking
        ? 'radial-gradient(135deg at 35% 35%, #6BA8FF 0%, #4F8EF7 40%, #2563EB 100%)'
        : thinking
          ? 'radial-gradient(135deg at 35% 35%, #B49EEA 0%, #9B7FEA 40%, #7C3AED 100%)'
          : 'radial-gradient(135deg at 35% 35%, #6BA8FF 0%, #4F8EF7 60%, #2563EB 100%)',
      boxShadow: speaking
        ? '0 0 40px rgba(79,142,247,0.55), 0 0 80px rgba(79,142,247,0.25), inset 0 2px 8px rgba(255,255,255,0.25)'
        : '0 0 20px rgba(79,142,247,0.2), inset 0 2px 6px rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.6s cubic-bezier(0.25,0.1,0.25,1)',
      animation: speaking ? 'glow 2s ease-in-out infinite' : thinking ? 'breathe 2s ease-in-out infinite' : 'none',
    }}>
      {/* 内部高光 */}
      <div style={{
        position: 'absolute', top: '18%', left: '22%',
        width: '30%', height: '20%', borderRadius: '50%',
        background: 'rgba(255,255,255,0.28)',
        filter: 'blur(3px)',
      }} />
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.3" strokeLinecap="round">
        <path d="M12 2a5 5 0 110 10A5 5 0 0112 2z"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </div>
    {/* 状态徽章 */}
    <div style={{
      position: 'absolute', bottom: 18, right: 18,
      width: 20, height: 20, borderRadius: '50%',
      background: speaking ? '#34D399' : thinking ? '#FBBF24' : '#4F8EF7',
      border: '3px solid #F5F5F7',
      boxShadow: `0 0 10px ${speaking ? 'rgba(52,211,153,0.6)' : thinking ? 'rgba(251,191,36,0.6)' : 'rgba(79,142,247,0.5)'}`,
      transition: 'all 0.3s',
      animation: (speaking || thinking) ? 'pulse 1.5s ease-in-out infinite' : 'none',
    }} />
  </div>
);

/* ── 实时音频波形 ── */
const AudioWave: React.FC<{ active: boolean }> = ({ active }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
    {[0,1,2,3,4,5,6,7,8].map(i => (
      <div key={i} style={{
        width: 3, borderRadius: 99,
        background: active
          ? `rgba(0,113,227,${0.4 + (i % 3) * 0.2})`
          : 'rgba(0,0,0,0.10)',
        height: active ? 28 : 8,
        // 把 delay 直接合并进 animation 的 shorthand，避免 React 对
        // 同名 shorthand + longhand 同时赋值时抛出警告：
        // "Updating a style property during rerender (animation) when a
        //  conflicting property is set (animationDelay) can lead to styling bugs."
        animation: active ? `wave 1.1s ease-in-out ${i * 0.1}s infinite` : 'none',
        transformOrigin: 'center',
        transition: 'height 0.3s ease, background 0.3s',
      }} />
    ))}
  </div>
);

/* ── 打字气泡点 ── */
const TypingDots: React.FC = () => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
    {[0,1,2].map(i => (
      <span key={i} style={{
        width: 7, height: 7, borderRadius: '50%',
        background: 'rgba(79,142,247,0.7)',
        display: 'inline-block',
        // 同上：合并 delay 进 animation shorthand
        animation: `blink 1.4s ease-in-out ${i * 0.22}s infinite`,
      }} />
    ))}
  </div>
);

/* ── 初始化全屏加载 ── */
const InitScreen: React.FC = () => {
  const [tip, setTip] = React.useState(0);
  const tips = ['正在生成针对性面试题...', '分析你的简历亮点...', 'AI 面试官正在就位...', '准备开始对话...'];
  React.useEffect(() => {
    const t = setInterval(() => setTip(p => (p + 1) % tips.length), 1300);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(150deg, #F0F4FF 0%, #F5F5F7 55%, #EEF0F8 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32,
    }}>
      {/* 背景粒子网格 */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(0,113,227,0.06) 1px, transparent 1px)', backgroundSize: '36px 36px', pointerEvents: 'none' }} />
      <AIOrb speaking={false} thinking={true} />
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px', margin: '0 0 8px' }}>AI 面试官准备中</h2>
        <p key={tip} style={{ fontSize: 14, color: '#86868B', margin: 0, animation: 'fadeIn 0.4s ease' }}>{tips[tip]}</p>
      </div>
      <AudioWave active={true} />
    </div>
  );
};

/* ── 主组件 ── */
const InterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interviewOver, setInterviewOver] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiBuffer, setAiBuffer] = useState('');
  const [initLoading, setInitLoading] = useState(true);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [hasFollowedUp, setHasFollowedUp] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // React 18 StrictMode 在开发环境会把 effect 执行两次（mount → unmount → mount），
  // 用 ref 做幂等守卫，避免重复触发 /question/generate 与 /chat，节省 LLM 调用
  const didInitRef = useRef(false);

  // autoSave 显式接收 override，避免依赖 React 异步 state 导致刚 setState 的
  // isFollowUp / hasFollowedUp 还没生效、autoSave 读到的是旧值。
  // 现象：追问分支 setIsFollowUp(true) 后立刻调用 autoSave()，
  // Redis 里写入的却是 is_follow_up=false，刷新恢复后状态机错乱。
  const autoSave = async (override?: Partial<{
    questions: Question[]; currentIndex: number; messages: Message[];
    isFollowUp: boolean; hasFollowedUp: boolean;
  }>) => {
    try {
      await api.post('/session/save', {
        questions: override?.questions ?? questions,
        current_index: override?.currentIndex ?? currentIndex,
        messages: override?.messages ?? messages,
        is_follow_up: override?.isFollowUp ?? isFollowUp,
        has_followed_up: override?.hasFollowedUp ?? hasFollowedUp,
      });
    } catch (e) { console.warn('会话自动保存失败:', e); }
  };

  useEffect(() => {
    // 幂等守卫：StrictMode 双触发 / HMR 热更新导致重入时直接返回
    if (didInitRef.current) return;
    didInitRef.current = true;

    const init = async () => {
      const resume = JSON.parse(localStorage.getItem('resume_data') || '{}');
      const jd = JSON.parse(localStorage.getItem('jd_data') || '{}');
      const match = JSON.parse(localStorage.getItem('match_data') || '{}');
      try {
        const sessionRes = await api.get('/session/restore');
        if (sessionRes.data.session) {
          const s = sessionRes.data.session;
          setQuestions(s.questions || []);
          setCurrentIndex(s.current_index || 1);
          setMessages(s.messages || []);
          setIsFollowUp(s.is_follow_up || false);
          setHasFollowedUp(s.has_followed_up || false);
          setInitLoading(false);
          return;
        }
      } catch (e) { console.warn('会话恢复失败:', e); }
      try {
        const qRes = await api.post('/question/generate', { resume_json: resume, jd_json: jd, match_analysis: match });
        const qs = qRes.data.questions || [];
        setQuestions(qs);
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ resume_json: resume, jd_json: jd, questions: qs, current_index: 1, user_answer: '', chat_history: [] }),
        });
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let openingText = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            openingText += decoder.decode(value, { stream: true });
          }
        }
        setMessages([{ role: 'interviewer', content: openingText || '面试开始' }]);
        setCurrentIndex(1);
      } catch (err) { console.error('初始化面试失败:', err); }
      finally { setInitLoading(false); }
    };
    init();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiBuffer]);

  const streamChat = async (
    newMessages: Message[],
    nextIndex: number,
    evalResult?: { need_follow_up: boolean; follow_up_question: string; eval_reason: string },
    // 是否是追问轮：追问轮 nextIndex 应保持等于当前题号（不跨题），
    // 同时也不会触发结束态判定。这是修复"第 7 题追问后被误判为面试结束"的关键。
    isFollowUpRound: boolean = false,
  ) => {
    // ⚡ 进度条立即推进（之前等到流式结束才 setCurrentIndex 会出现：
    // 答完最后一题但 LLM 半路被截断/异常时，setCurrentIndex 永远跑不到，
    // 进度条永远停在答完的上一题，左侧会出现"答完 8 题但显示第 7 题 88%"）
    // 注意：
    //   - 追问轮（isFollowUpRound=true）：nextIndex 应等于 currentIndex，不要推进进度
    //   - 正常轮：当 nextIndex <= 题数时推进；超出题数说明刚答完最后一题，由后续结束判定接管
    if (!isFollowUpRound && nextIndex <= questions.length) {
      setCurrentIndex(nextIndex);
    }

    const token = localStorage.getItem('token');
    const resume = JSON.parse(localStorage.getItem('resume_data') || '{}');
    const jd = JSON.parse(localStorage.getItem('jd_data') || '{}');
    const response = await fetch('http://localhost:3000/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        resume_json: resume, jd_json: jd, questions,
        // 追问轮传当前题，让 chat.py 拿到正确的 current_question
        current_index: nextIndex, user_answer: '',
        chat_history: newMessages.map(m => ({ role: m.role, content: m.content })),
        need_follow_up: evalResult?.need_follow_up ?? false,
        follow_up_question: evalResult?.follow_up_question ?? '',
        eval_reason: evalResult?.eval_reason ?? '',
      }),
    });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let aiText = '';
    const aiMsgIndex = newMessages.length;
    setMessages([...newMessages, { role: 'interviewer', content: '' }]);
    setAiTyping(false); setAiBuffer('');
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        aiText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          if (updated[aiMsgIndex]) updated[aiMsgIndex] = { role: 'interviewer', content: aiText };
          return updated;
        });
      }
    }
    // 进入结束态的判定（多重收紧，避免追问/中间题误触发）：
    // 1) 追问轮一律不结束（isFollowUpRound）
    // 2) nextIndex > questions.length（已经超出最后一题）才允许进入结束
    // 3) 或者：已经在最后一题（nextIndex >= questions.length）+ 关键词出现在文本末尾 80 字
    // 之前的 bug：第 7 题追问时 nextIndex 被错误传成 8，命中 (8 >= 8) 又文本里
    // 可能含"结束"二字，被误判为面试结束，跳过了真正的第 8 题。
    if (isFollowUpRound) {
      return;
    }
    const isAtEnd = nextIndex > questions.length;
    const tail = aiText.slice(-80);
    const aiSaysEnd = (nextIndex >= questions.length) && /面试结束|今天的面试.*结束|面试就到这里|本次面试.*结束/.test(tail);
    if (isAtEnd || aiSaysEnd) {
      setInterviewOver(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || interviewOver) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true); setAiTyping(true); setAiBuffer('');
    try {
      if (isFollowUp) {
        // 这一轮是用户对"追问"的回答 → 切换到下一题（正常轮）
        setIsFollowUp(false); setHasFollowedUp(false);
        await streamChat(newMessages, currentIndex + 1);
        // autoSave 显式传入更新后的状态，避免 React 异步 state 导致写错
        autoSave({
          messages: newMessages,
          currentIndex: Math.min(currentIndex + 1, questions.length),
          isFollowUp: false,
          hasFollowedUp: false,
        });
      } else {
        let evalResult = { need_follow_up: false, follow_up_question: '', eval_reason: '' };
        try {
          const followRes = await api.post('/chat/check_follow_up', {
            resume_json: JSON.parse(localStorage.getItem('resume_data') || '{}'),
            jd_json: JSON.parse(localStorage.getItem('jd_data') || '{}'),
            questions, current_index: currentIndex,
            user_answer: userMsg.content,
            chat_history: newMessages.map(m => ({ role: m.role, content: m.content })),
          });
          evalResult = {
            need_follow_up: followRes.data?.need_follow_up ?? false,
            follow_up_question: followRes.data?.follow_up_question ?? '',
            eval_reason: followRes.data?.reason ?? '',
          };
        } catch (e) { console.warn('分析Agent评估失败:', e); }

        if (evalResult.need_follow_up && !hasFollowedUp) {
          // 追问分支：前端直接把推荐追问问题作为 AI 发言写入；进度不推进
          setIsFollowUp(true); setHasFollowedUp(true);
          const followUpMsg: Message = { role: 'interviewer', content: evalResult.follow_up_question || '能再详细说说吗？' };
          const msgsWithFollowUp = [...newMessages, followUpMsg];
          setMessages(msgsWithFollowUp);
          setAiTyping(false); setAiBuffer('');
          // 显式传入追问态，避免 setState 异步导致 Redis 写入 is_follow_up=false
          autoSave({
            messages: msgsWithFollowUp,
            currentIndex,
            isFollowUp: true,
            hasFollowedUp: true,
          });
        } else {
          // 正常推进：候选人答完当前题，进入下一题
          await streamChat(newMessages, currentIndex + 1, evalResult);
          autoSave({
            messages: newMessages,
            currentIndex: Math.min(currentIndex + 1, questions.length),
            isFollowUp: false,
            hasFollowedUp: hasFollowedUp,
          });
        }
      }
    } catch (err) { console.error('对话失败:', err); setAiTyping(false); setAiBuffer(''); }
    finally { setLoading(false); }
  };

  const handleSkip = async () => {
    if (loading || interviewOver) return;
    if (isFollowUp) { setIsFollowUp(false); setHasFollowedUp(false); }
    const userMsg: Message = { role: 'user', content: '[跳过]' };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setLoading(true); setAiTyping(true); setAiBuffer('');
    try {
      await streamChat(newMessages, currentIndex + 1);
      autoSave({
        messages: newMessages,
        currentIndex: Math.min(currentIndex + 1, questions.length),
        isFollowUp: false,
        hasFollowedUp: false,
      });
    }
    catch (err) { setAiTyping(false); setAiBuffer(''); }
    finally { setLoading(false); }
  };

  const handleEnd = async () => {
    // 结束前先校验是否存在有效的候选人回答，避免一题未答就生成"空报告"
    const hasValidAnswer = messages.some(m => {
      if (m.role !== 'user') return false;
      const c = (m.content || '').trim();
      if (!c) return false;
      if (['[跳过]', '跳过', 'skip', 'pass'].includes(c)) return false;
      return true;
    });
    if (!hasValidAnswer) {
      const confirmed = window.confirm(
        '检测到你还没有回答任何问题，直接结束将无法生成有效的面试报告。\n\n确定要结束吗？'
      );
      if (!confirmed) return;
    }

    setInterviewOver(true);
    // 报告生成统一交给 ReportPage 负责。这里要做的事：
    //   1) 把面试上下文写入 localStorage 供 ReportPage 读取
    //   2) 清理旧报告缓存，确保 ReportPage 重新生成
    //   3) 跳转到 /report
    // ⚠️ 注意：**不要**在这里清理后端 Redis 会话（之前会清，导致用户从 /report
    //         点"重新生成"或刷新页面时，Redis 已空、localStorage 又恰好被清，
    //         报告负载就只剩空数组了）。
    //         后端 session 的清理统一交给两个地方：
    //           a) JdInputPage 提交新 JD 前清（开始下一场）
    //           b) ReportPage handleRetakeInterview 点"重新面试"时清
    //         这样 ReportPage 始终可以从 /session/restore 拉到本场真实数据作为兜底。
    try {
      // 调试日志：用于排查"报告显示已答 0 题"类问题——一眼看清传给报告页的数据是否完整
      const userAnswers = messages.filter(m => m.role === 'user');
      console.log(
        `[Interview] 结束面试：questions=${questions.length} 道，messages=${messages.length} 条，user 回答=${userAnswers.length} 条`,
        { questions, messagesPreview: messages.slice(-4) }
      );
      localStorage.setItem('interview_questions', JSON.stringify(questions));
      localStorage.setItem(
        'interview_messages',
        JSON.stringify(messages.map(m => ({ role: m.role, content: m.content })))
      );
      // 同步 await 一次 /session/save，把最新 messages/questions 写进 Redis 做兜底
      await autoSave({
        questions,
        currentIndex,
        messages,
        isFollowUp: false,
        hasFollowedUp,
      });
    } catch (e) { console.warn('保存面试上下文失败:', e); }
    localStorage.removeItem('report_data');
    navigate('/report');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const progress = questions.length > 0 ? Math.round((currentIndex / questions.length) * 100) : 0;
  const isAISpeaking = loading || aiTyping;
  const jdData = JSON.parse(localStorage.getItem('jd_data') || '{}');

  if (initLoading) return <InitScreen />;

  return (
    <div style={{
      height: '100vh', display: 'flex',
      background: 'linear-gradient(150deg, #F0F4FF 0%, #F7F7F9 55%, #EEF0F8 100%)',
      fontFamily: 'var(--font)',
      overflow: 'hidden',
    }}>
      {/* 背景网格 */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(rgba(0,113,227,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* ═══ 左栏：AI 面试官 Panel ═══ */}
      <div style={{
        width: 320, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '40px 28px',
        borderRight: '1px solid rgba(0,0,0,0.07)',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'relative', zIndex: 1,
        animation: 'slideLeft 0.5s var(--ease) both',
      }}>
        {/* 顶部 logo */}
        <div style={{ width: '100%', marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #4F8EF7, #9B7FEA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.65)', letterSpacing: '0.5px' }}>AI INTERVIEW</span>
        </div>

        {/* AI Orb 主视觉 */}
        <AIOrb speaking={isAISpeaking} thinking={false} />

        {/* 状态文字 */}
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', margin: '0 0 4px', letterSpacing: '-0.3px' }}>AI 面试官</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isAISpeaking ? '#34D399' : '#4F8EF7',
              boxShadow: `0 0 8px ${isAISpeaking ? 'rgba(52,211,153,0.6)' : 'rgba(79,142,247,0.5)'}`,
              animation: isAISpeaking ? 'pulse 1.2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ fontSize: 12, color: '#86868B', fontWeight: 500 }}>
              {interviewOver ? '面试已结束' : isAISpeaking ? '正在说话...' : isFollowUp ? '追问中' : '等待回答'}
            </span>
          </div>
        </div>

        {/* 音频波形 */}
        <div style={{ marginTop: 20 }}>
          <AudioWave active={isAISpeaking} />
        </div>

        {/* 分隔线 */}
        <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.07)', margin: '32px 0' }} />

        {/* 面试进度 */}
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#86868B', fontWeight: 600, letterSpacing: '0.5px' }}>面试进度</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0071E3' }}>{progress}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #4F8EF7, #9B7FEA)',
              borderRadius: 99, transition: 'width 0.6s var(--ease)',
              boxShadow: '0 0 8px rgba(79,142,247,0.4)',
            }} />
          </div>
          {/* 题目列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {questions.map((q, i) => {
              const idx = i + 1;
              const isDone = idx < currentIndex;
              const isActive = idx === currentIndex;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 10,
                  background: isActive ? 'rgba(0,113,227,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(0,113,227,0.18)' : '1px solid transparent',
                  transition: 'all 0.3s',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: isDone ? '#34C759' : isActive ? '#0071E3' : 'rgba(0,0,0,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                    color: (isDone || isActive) ? '#fff' : '#6E6E73',
                    boxShadow: isActive ? '0 0 10px rgba(0,113,227,0.3)' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {isDone ? '✓' : idx}
                  </div>
                  <p style={{
                    fontSize: 11, color: isActive ? '#1D1D1F' : '#6E6E73',
                    margin: 0, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                    transition: 'color 0.3s',
                  }}>{q.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 岗位信息 */}
        {jdData.title && (
          <div style={{ width: '100%', marginTop: 'auto', paddingTop: 24 }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)' }}>
              <p style={{ fontSize: 10, color: '#6E6E73', fontWeight: 600, letterSpacing: '0.8px', margin: '0 0 4px' }}>目标岗位</p>
              <p style={{ fontSize: 13, color: '#1D1D1F', fontWeight: 600, margin: 0 }}>{jdData.title}</p>
              {jdData.company && <p style={{ fontSize: 11, color: '#86868B', margin: '2px 0 0' }}>{jdData.company}</p>}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 右栏：对话区 ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

        {/* 顶部栏 */}
        <div style={{
          padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F', margin: 0, letterSpacing: '-0.3px' }}>
              {interviewOver ? '面试已结束' : isFollowUp ? '追问中' : `第 ${currentIndex} 题 / 共 ${questions.length} 题`}
            </h2>
            {!interviewOver && questions[currentIndex - 1] && (
              <p style={{ fontSize: 12, color: '#86868B', margin: '3px 0 0', maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {questions[currentIndex - 1]?.text}
              </p>
            )}
          </div>
          <button
            onClick={handleEnd}
            style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              color: '#F87171', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
            结束面试
          </button>
        </div>

        {/* 聊天区 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '28px 36px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {messages.map((msg, i) => {
            const isAI = msg.role === 'interviewer';
            const isLatest = i === messages.length - 1;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-end', gap: 12,
                justifyContent: isAI ? 'flex-start' : 'flex-end',
                animation: 'msgIn 0.35s var(--ease) both',
              }}>
                {isAI && (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'radial-gradient(135deg at 35% 35%, #6BA8FF 0%, #4F8EF7 60%, #2563EB 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(79,142,247,0.3)',
                    animation: isLatest && isAISpeaking ? 'glow 2s ease-in-out infinite' : 'none',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: '68%',
                  padding: isAI ? '14px 18px' : '12px 16px',
                  borderRadius: isAI ? '4px 18px 18px 18px' : '18px 18px 4px 18px',
                  background: isAI
                    ? 'rgba(255,255,255,0.95)'
                    : 'linear-gradient(135deg, #0071E3 0%, #005BB5 100%)',
                  border: isAI ? '1px solid rgba(0,0,0,0.07)' : 'none',
                  boxShadow: isAI
                    ? '0 2px 12px rgba(0,0,0,0.08)'
                    : '0 4px 20px rgba(0,113,227,0.3)',
                  fontSize: 14, lineHeight: 1.65,
                  color: isAI ? '#1D1D1F' : '#fff',
                  wordBreak: 'break-word',
                  backdropFilter: 'blur(20px)',
                  position: 'relative',
                }}>
                  {msg.content
                    ? msg.content
                    : (isLatest && isAISpeaking ? <TypingDots /> : null)
                  }
                  {/* 时间戳小点 */}
                  {msg.content && (
                    <div style={{
                      position: 'absolute', bottom: -18,
                      [isAI ? 'left' : 'right']: 4,
                      fontSize: 10, color: '#6E6E73', whiteSpace: 'nowrap',
                    }}>
                      {isAI ? 'AI 面试官' : '你'}
                    </div>
                  )}
                </div>
                {!isAI && (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #E8EEF9 0%, #D4DEF0 100%)',
                    border: '1px solid rgba(0,0,0,0.09)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#1D1D1F',
                  }}>你</div>
                )}
              </div>
            );
          })}

          {/* 独立 typing 气泡 */}
          {aiTyping && messages[messages.length - 1]?.role !== 'interviewer' && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, animation: 'msgIn 0.3s ease both' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'radial-gradient(135deg at 35% 35%, #6BA8FF 0%, #4F8EF7 60%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'glow 2s ease-in-out infinite',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </div>
              <div style={{
                padding: '14px 18px', borderRadius: '4px 18px 18px 18px',
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}>
                <TypingDots />
              </div>
            </div>
          )}

          {/* 面试结束卡片 */}
          {interviewOver && (
            <div style={{
              padding: '40px 32px', borderRadius: 24,
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(52,199,89,0.25)',
              textAlign: 'center', animation: 'scaleIn 0.5s var(--spring) both',
              boxShadow: '0 8px 40px rgba(52,199,89,0.12)',
            }}>
              <div style={{ fontSize: 52, marginBottom: 16, animation: 'bounce 1s ease-in-out 3' }}>🎉</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1D1D1F', margin: '0 0 8px', letterSpacing: '-0.5px' }}>面试圆满完成！</h3>
              <p style={{ fontSize: 14, color: '#86868B', margin: '0 0 28px' }}>AI 正在为你生成专属评估报告...</p>
              <button onClick={() => navigate('/report')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                border: 'none', borderRadius: 50, padding: '14px 32px',
                fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(52,211,153,0.35)',
                transition: 'all 0.2s',
              }}>
                查看评估报告
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          )}

          <div ref={chatEndRef} style={{ height: 8 }} />
        </div>

        {/* ── 输入区 ── */}
        {!interviewOver && (
          <div style={{
            padding: '16px 28px 24px',
            background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(0,0,0,0.07)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 12,
              background: inputFocused ? 'rgba(0,113,227,0.04)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${inputFocused ? 'rgba(0,113,227,0.35)' : 'rgba(0,0,0,0.09)'}`,
              borderRadius: 18, padding: '12px 14px',
              transition: 'all 0.2s',
              boxShadow: inputFocused ? '0 0 0 3px rgba(79,142,247,0.1)' : 'none',
            }}>
              <textarea
                ref={inputRef}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 14, color: '#1D1D1F', fontFamily: 'var(--font)',
                  resize: 'none', lineHeight: 1.6, minHeight: 44, maxHeight: 140,
                  padding: 0,
                }}
                placeholder={isFollowUp ? '回答面试官的追问...' : '输入你的回答... (Enter 发送，Shift+Enter 换行)'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                rows={2}
                disabled={loading}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-end' }}>
                {isFollowUp && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#FBBF24',
                    background: 'rgba(251,191,36,0.12)', borderRadius: 6, padding: '3px 7px',
                    textAlign: 'center',
                  }}>追问</span>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleSkip} disabled={loading} style={{
                    height: 36, padding: '0 14px', borderRadius: 99,
                    background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.09)',
                    fontSize: 12, fontWeight: 600, color: '#1D1D1F', cursor: 'pointer',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}>
                    {isFollowUp ? '跳过' : '跳题'}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: 'none',
                      background: input.trim() && !loading
                        ? 'linear-gradient(135deg, #0071E3, #005BB5)'
                        : 'rgba(0,0,0,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      boxShadow: input.trim() && !loading ? '0 2px 12px rgba(0,113,227,0.35)' : 'none',
                      flexShrink: 0,
                    }}
                  >
                    {loading
                      ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : '#6E6E73'} strokeWidth="2.5" strokeLinecap="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPage;