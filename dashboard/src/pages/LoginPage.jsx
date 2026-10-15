import { useState } from 'react';
import { 
  Shield, 
  Lock, 
  User, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Monitor, 
  BrainCircuit, 
  ShieldCheck
} from 'lucide-react';
import { authApi } from '../api/authApi';
import loginHeroImg from '../assets/login-hero.jpg';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both administrator username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.login(username.trim(), password);
      onLoginSuccess();
    } catch (err) {
      console.error('Login authentication error:', err.response?.status || err.message);
      let detail = 'Invalid administrator username or password';
      if (err.response?.data?.detail) {
        detail = err.response.data.detail;
      } else if (err.response?.data?.message) {
        detail = err.response.data.message;
      } else if (!err.response) {
        detail = 'Unable to connect to SentinelGuard backend (http://localhost:8080). Please ensure the backend is running.';
      }
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-12 bg-[#050814] text-slate-100 font-sans overflow-x-hidden select-none">
      
      {/* ═════════════════════════════════════════════════════════════════════
          LEFT HERO PANE (7 Columns on Desktop)
          ═════════════════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-14 border-b lg:border-b-0 lg:border-r border-slate-800/70 relative bg-gradient-to-b from-[#070C1E] via-[#050814] to-[#04060F]">
        
        {/* Subtle cyber grid ambient background */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38BDF8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* ── Top Left Branding ── */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path 
                d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z" 
                fill="currentColor" 
                fillOpacity="0.95"
              />
              <path 
                d="M12 7v10M8 12h8" 
                stroke="#FFFFFF" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
              />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white block">
              SentinelGuard
            </span>
            <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase block">
              SECURITY OPERATIONS CENTER
            </span>
          </div>
        </div>

        {/* ── Center Content: Headline + Subtitle + (3 Feature Tiles & 3D Shield) ── */}
        <div className="relative z-10 my-auto py-8 lg:py-10 space-y-6">
          
          {/* Tag & Headlines */}
          <div className="space-y-3 max-w-xl">
            <p className="text-xs font-bold tracking-[0.25em] text-blue-400 uppercase">
              PROTECT • DETECT • RESPOND
            </p>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
              AI-Powered <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Endpoint Security
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg pt-1">
              Real-time Windows endpoint telemetry, insider threat detection, and centralized behavioral risk analysis.
            </p>
          </div>

          {/* 2-Column Side-by-Side Area: Feature Tiles on Left, 3D Shield Graphic on Right */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-2">
            
            {/* 3 Feature Highlight Boxes (6 cols) */}
            <div className="sm:col-span-6 space-y-3.5">
              {/* 1. Endpoint Visibility */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0B132B]/80 border border-blue-900/40 backdrop-blur-md shadow-xs hover:border-cyan-500/40 transition-colors group">
                <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Endpoint Visibility
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    Monitor organizational endpoints in real time.
                  </p>
                </div>
              </div>

              {/* 2. AI-Driven Detection */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0B132B]/80 border border-blue-900/40 backdrop-blur-md shadow-xs hover:border-purple-500/40 transition-colors group">
                <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-purple-500/30 text-purple-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    AI-Driven Detection
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    Detect insider threats and abnormal behavior.
                  </p>
                </div>
              </div>

              {/* 3. Enterprise-Ready */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0B132B]/80 border border-blue-900/40 backdrop-blur-md shadow-xs hover:border-emerald-500/40 transition-colors group">
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Enterprise-Ready
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    Secure, centralized, and built for modern organizations.
                  </p>
                </div>
              </div>
            </div>

            {/* 3D Holographic Cyber Shield Graphic (6 cols) */}
            <div className="sm:col-span-6 flex items-center justify-center relative">
              <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
                {/* Glowing cyan/blue backdrop glow */}
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
                
                <img 
                  src={loginHeroImg} 
                  alt="3D Holographic Security Shield" 
                  className="w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(56,189,248,0.45)] relative z-10"
                  style={{
                    maskImage: 'radial-gradient(circle at center, black 50%, transparent 80%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 80%)'
                  }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* ── Bottom Left Footer ── */}
        <div className="relative z-10 flex items-center gap-2.5 text-xs text-slate-400 pt-4">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-300">SentinelGuard v2.0</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">AI-Powered Endpoint Security &amp; Insider Threat Detection</span>
        </div>

      </div>


      {/* ═════════════════════════════════════════════════════════════════════
          RIGHT LOGIN PANE (5 Columns on Desktop)
          ═════════════════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-5 flex flex-col justify-center p-8 sm:p-12 lg:p-14 bg-[#070B18] relative">

        {/* Centered Elevated Welcome Back Card */}
        <div className="w-full max-w-[440px] mx-auto my-auto py-6">
          <div className="w-full p-8 sm:p-9 rounded-2xl bg-[#0B1224]/95 border border-slate-800/90 shadow-2xl backdrop-blur-xl space-y-6">
            
            {/* Card Header */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome Back
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sign in to your SentinelGuard console to manage endpoints and security operations.
              </p>
            </div>

            {error && (
              <div 
                role="alert"
                className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4.5">
              
              {/* Username Input */}
              <div>
                <label 
                  htmlFor="admin-username-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 pointer-events-none" />
                  <input
                    id="admin-username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-[#0F182F] border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label 
                  htmlFor="admin-password-input"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 pointer-events-none" />
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-11 bg-[#0F182F] border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#0F182F] border-slate-700 text-blue-600 focus:ring-blue-500/30 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <a 
                  href="#forgot" 
                  onClick={(e) => { e.preventDefault(); alert('Please contact your SentinelGuard security super-administrator to reset administrative credentials.'); }}
                  className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors cursor-pointer"
                >
                  Forgot password?
                </a>
              </div>

              {/* Primary Submit Button */}
              <button
                id="admin-login-submit"
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-600 text-white text-sm sm:text-base font-semibold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* ── Bottom Right Footer Links ── */}
        <div className="flex items-center justify-center sm:justify-end gap-4 text-xs text-slate-400 pt-4">
          <a href="#docs" onClick={(e) => { e.preventDefault(); alert('SentinelGuard v2.0 documentation is located in /docs/ARCHITECTURE.md'); }} className="hover:text-slate-200 transition-colors">Documentation</a>
          <span className="text-slate-700">|</span>
          <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('SentinelGuard adheres to enterprise zero-trust data privacy standards.'); }} className="hover:text-slate-200 transition-colors">Privacy</a>
          <span className="text-slate-700">|</span>
          <a href="#support" onClick={(e) => { e.preventDefault(); alert('SentinelGuard Security Support: support@sentinelguard.io'); }} className="hover:text-slate-200 transition-colors">Support</a>
        </div>

      </div>

    </div>
  );
}
