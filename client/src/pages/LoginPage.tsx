import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api';
import axios from 'axios';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) { setError('请填写用户名和密码'); return; }
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password);
        setIsRegister(false);
        setError('注册成功，请登录');
      } else {
        const res = await login(username, password);
        localStorage.setItem('token', res.data.token);
        ['resume_data','jd_data','match_data','interview_questions','interview_opening','report_data'].forEach(k => localStorage.removeItem(k));
        try { await axios.delete('http://localhost:3000/api/session/clear', { headers: { Authorization: `Bearer ${res.data.token}` } }); } catch {}
        navigate('/upload');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败');
    } finally { setLoading(false); }
  };

  const isSuccess = error.includes('成功');

  const features = [
    { icon: '🔍', title: '智能简历解析', desc: '深度理解你的经历与技能' },
    { icon: '🎯', title: '精准岗位匹配', desc: '与 JD 高度对齐的面试题库' },
    { icon: '🤖', title: 'AI 面试官追问', desc: '真实模拟面试对话体验' },
    { icon: '📊', title: '专业评估报告', desc: '多维度量化你的表现' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(150deg, #F0F4FF 0%, #F5F5F7 55%, #EEF0F8 100%)',
      fontFamily: 'var(--font)', position: 'relative', overflow: 'hidden',
    }}>
      {/* 背景装饰 */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(0,113,227,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,113,227,0.10) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -150, right: -150, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(94,92,230,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* ─── 左栏：品牌 ─── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px', position: 'relative', zIndex: 1,
        animation: 'slideLeft 0.6s var(--ease) both',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #0071E3 0%, #5E5CE6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,113,227,0.28)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(0,0,0,0.55)', letterSpacing: '0.5px' }}>AI INTERVIEW</span>
        </div>

        <h1 style={{ fontSize: 52, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2px', lineHeight: 1.1, margin: '0 0 18px' }}>
          模拟面试，<br />
          <span style={{
            background: 'linear-gradient(135deg, #0071E3, #5E5CE6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>一步到位</span>
        </h1>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.7, margin: '0 0 52px', maxWidth: 380 }}>
          AI 面试官为你量身定制面试体验，逐题追问，精准评估，助你斩获心仪 offer。
        </p>

        {/* Feature cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px',
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 14,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              animation: `fadeUp 0.5s var(--ease) ${0.1 + i * 0.07}s both`,
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: '0 0 2px' }}>{f.title}</p>
                <p style={{ fontSize: 12, color: '#86868B', margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 右栏：表单 ─── */}
      <div style={{
        width: 460, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 48px',
        borderLeft: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'relative', zIndex: 1,
        animation: 'slideRight 0.6s var(--ease) both',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* 表单头 */}
          <div style={{ marginBottom: 36 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, marginBottom: 20,
              background: 'rgba(0,113,227,0.10)', border: '1px solid rgba(0,113,227,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isRegister
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0071E3" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="23" y2="12"/><line x1="23" y1="8" x2="19" y2="12"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0071E3" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              }
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1D1D1F', margin: '0 0 6px', letterSpacing: '-0.8px' }}>
              {isRegister ? '创建账号' : '欢迎回来'}
            </h2>
            <p style={{ fontSize: 14, color: '#86868B', margin: 0 }}>
              {isRegister ? '加入 AI 模拟面试，开启你的提升之旅' : '继续你的面试准备'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 用户名 */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6E6E73', letterSpacing: '0.5px', marginBottom: 7 }}>用户名</label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6E6E73', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text" placeholder="请输入用户名" value={username}
                  onChange={e => setUsername(e.target.value)} autoFocus
                  style={{
                    width: '100%', height: 48, borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.09)',
                    background: '#FFFFFF',
                    padding: '0 16px 0 44px', fontSize: 14, color: '#1D1D1F',
                    outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6E6E73', letterSpacing: '0.5px', marginBottom: 7 }}>密码</label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6E6E73', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input
                  type="password" placeholder="请输入密码" value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%', height: 48, borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.09)',
                    background: '#FFFFFF',
                    padding: '0 16px 0 44px', fontSize: 14, color: '#1D1D1F',
                    outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                padding: '10px 14px', borderRadius: 10,
                background: isSuccess ? 'rgba(52,199,89,0.10)' : 'rgba(255,59,48,0.08)',
                border: `1px solid ${isSuccess ? 'rgba(52,199,89,0.25)' : 'rgba(255,59,48,0.22)'}`,
                color: isSuccess ? '#248A3D' : '#D70015',
              }}>
                <span>{isSuccess ? '✅' : '⚠️'}</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', height: 50, borderRadius: 12, border: 'none',
              background: loading ? 'rgba(0,113,227,0.4)' : 'linear-gradient(135deg, #0071E3 0%, #005BB5 100%)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 20px rgba(0,113,227,0.30)',
              transition: 'all 0.2s', marginTop: 4,
            }}>
              {loading
                ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />处理中...</>
                : isRegister ? '创建账号' : '登录'
              }
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 20px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: 12, color: '#AEAEB2' }}>或</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#86868B' }}>
            {isRegister ? '已有账号？' : '没有账号？'}
            <span onClick={() => { setIsRegister(!isRegister); setError(''); }} style={{ color: '#0071E3', cursor: 'pointer', marginLeft: 4, fontWeight: 600 }}>
              {isRegister ? '去登录' : '免费注册'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;