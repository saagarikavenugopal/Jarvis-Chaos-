import React from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="landing-page-wrapper text-slate-900 antialiased flex flex-col justify-between min-h-screen">
      <style>{`
        .landing-page-wrapper {
          font-family: 'Inter', system-ui, sans-serif;
          background: radial-gradient(circle at 15% 20%, #e0e7ff 0%, transparent 45%),
                      radial-gradient(circle at 85% 15%, #cffafe 0%, transparent 45%),
                      radial-gradient(circle at 75% 80%, #ddd6fe 0%, transparent 50%),
                      linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0f2fe 100%);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .text-gradient-jarvis {
          background: linear-gradient(90deg, #2563eb 0%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .btn-gradient-primary {
          background: linear-gradient(90deg, #2563eb 0%, #6366f1 100%);
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.45);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: none;
          cursor: pointer;
        }

        .btn-gradient-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px -5px rgba(59, 130, 246, 0.55);
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 12px 32px -8px rgba(30, 41, 59, 0.08),
                      inset 0 1px 1px rgba(255, 255, 255, 0.9);
        }

        .glass-bar {
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
        }

        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes floatCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        .animate-float-robot {
          animation: floatSlow 4.5s ease-in-out infinite;
        }

        .animate-float-card-1 { animation: floatCard 5s ease-in-out infinite; }
        .animate-float-card-2 { animation: floatCard 5.5s ease-in-out 0.6s infinite; }
        .animate-float-card-3 { animation: floatCard 4.8s ease-in-out 1.2s infinite; }
        .animate-pulse-glow { animation: pulseGlow 3.5s ease-in-out infinite; }
      `}</style>

      {/* BEGIN: MainHeader */}
      <header className="w-full max-w-7xl mx-auto px-6 lg:px-10 pt-5 pb-3" data-purpose="top-navigation">
        <nav aria-label="Primary Navigation" className="flex items-center justify-between">
          {/* Brand Logo with Soundwave Icon */}
          <div className="flex items-center gap-3 group cursor-pointer" data-purpose="brand-logo" onClick={onGetStarted}>
            <div className="w-10 h-10 rounded-full btn-gradient-primary flex items-center justify-center text-white shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <line x1="4" x2="4" y1="10" y2="14" />
                <line x1="8" x2="8" y1="7" y2="17" />
                <line x1="12" x2="12" y1="4" y2="20" />
                <line x1="16" x2="16" y1="7" y2="17" />
                <line x1="20" x2="20" y1="10" y2="14" />
              </svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
              JARVIS 2.0
            </span>
          </div>

          {/* Right CTA Button */}
          <div className="flex items-center">
            <button
              className="btn-gradient-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full"
              onClick={onGetStarted}
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>
      {/* END: MainHeader */}

      {/* BEGIN: HeroSection */}
      <main className="flex-1 flex items-center w-full max-w-7xl mx-auto px-6 lg:px-10 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center w-full">
          {/* BEGIN: LeftHeroColumn */}
          <section className="lg:col-span-5 flex flex-col items-start space-y-6" data-purpose="hero-content">
            {/* Pill Badge */}
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/70 text-blue-800 text-xs sm:text-sm font-medium shadow-sm">
              Your Personal Digital Operating System
            </div>

            {/* Main Heading */}
            <h1
              className="font-extrabold text-5xl sm:text-6xl lg:text-[64px] leading-[1.05] tracking-tight text-slate-900"
              style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
            >
              JARVIS <span className="text-gradient-jarvis">2.0</span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-md">
              An AI companion that remembers, organizes, communicates and acts on your behalf.
            </p>

            {/* 4 Mini Feature Icon Cards */}
            <div className="grid grid-cols-4 gap-3 w-full max-w-md pt-1" data-purpose="hero-mini-cards">
              {/* Card 1: Organize */}
              <div className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform cursor-default">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                    <rect height="18" rx="4" width="18" x="3" y="3" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700">Organize</span>
              </div>

              {/* Card 2: Focus */}
              <div className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform cursor-default">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L4.5 13.5h6.5L9.5 22l9-11.5h-6.5L13 2z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700">Focus</span>
              </div>

              {/* Card 3: Automate */}
              <div className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform cursor-default">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 12 12 17 22 12" />
                    <polyline points="2 17 12 22 22 17" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700">Automate</span>
              </div>

              {/* Card 4: Execute */}
              <div className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform cursor-default">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <line x1="4" x2="4" y1="10" y2="14" />
                    <line x1="8" x2="8" y1="7" y2="17" />
                    <line x1="12" x2="12" y1="4" y2="20" />
                    <line x1="16" x2="16" y1="7" y2="17" />
                    <line x1="20" x2="20" y1="10" y2="14" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700">Execute</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-wrap items-center gap-4 pt-2" data-purpose="hero-cta-buttons">
              <button
                className="btn-gradient-primary text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-full inline-flex items-center gap-2"
                onClick={onGetStarted}
              >
                <span>Get Started</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="5" x2="19" y1="12" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </section>
          {/* END: LeftHeroColumn */}

          {/* BEGIN: RightHeroColumn */}
          <section className="lg:col-span-7 relative flex items-center justify-center min-h-[460px] sm:min-h-[520px]" data-purpose="hero-visual-ecosystem">
            {/* Glowing Orbital Ring Background */}
            <div className="absolute w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full border-2 border-cyan-300/50 shadow-[0_0_60px_rgba(34,211,238,0.35)] animate-pulse-glow pointer-events-none" />
            <div className="absolute w-[260px] h-[260px] sm:w-[310px] sm:h-[310px] rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />

            {/* Central AI Robot Companion & Holographic Pedestal */}
            <div className="relative z-10 flex flex-col items-center justify-center mt-8">
              {/* Floating Robot SVG */}
              <div className="animate-float-robot relative z-20">
                <svg className="w-48 h-52 sm:w-56 sm:h-60 drop-shadow-[0_18px_28px_rgba(37,99,235,0.28)]" fill="none" viewBox="0 0 220 240" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="robotBody" x1="50" x2="170" y1="20" y2="200">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="65%" stopColor="#E2E8F0" />
                      <stop offset="100%" stopColor="#CBD5E1" />
                    </linearGradient>
                    <linearGradient gradientUnits="userSpaceOnUse" id="visorGrad" x1="65" x2="155" y1="55" y2="120">
                      <stop offset="0%" stopColor="#0F172A" />
                      <stop offset="100%" stopColor="#1E293B" />
                    </linearGradient>
                    <linearGradient id="cyanGlow" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#22D3EE" />
                    </linearGradient>
                  </defs>
                  {/* Head Top Antenna/Crest */}
                  <path d="M98 22 C102 14, 118 14, 122 22" stroke="#38BDF8" strokeLinecap="round" strokeWidth="4" />
                  {/* Head Shell */}
                  <rect fill="url(#robotBody)" height="96" rx="44" stroke="#FFFFFF" strokeWidth="2" width="128" x="46" y="24" />
                  {/* Left & Right Glowing Ear Cups */}
                  <rect fill="#0F172A" height="36" rx="7" stroke="#38BDF8" strokeWidth="3" width="14" x="34" y="54" />
                  <rect fill="#0F172A" height="36" rx="7" stroke="#38BDF8" strokeWidth="3" width="14" x="172" y="54" />
                  {/* Dark Glass Visor */}
                  <rect fill="url(#visorGrad)" height="66" rx="28" stroke="#38BDF8" strokeOpacity="0.5" strokeWidth="1.5" width="104" x="58" y="40" />
                  {/* Happy Glowing Cyan Arc Eyes */}
                  <path d="M78 72 C82 62, 96 62, 100 72" stroke="#22D3EE" strokeLinecap="round" strokeWidth="5.5" />
                  <path d="M120 72 C124 62, 138 62, 142 72" stroke="#22D3EE" strokeLinecap="round" strokeWidth="5.5" />
                  {/* Neck */}
                  <rect fill="#334155" height="12" rx="6" width="28" x="96" y="118" />
                  {/* Torso */}
                  <path d="M72 130 C72 124, 148 124, 148 130 L140 182 C138 192, 82 192, 80 182 Z" fill="url(#robotBody)" stroke="#FFFFFF" strokeWidth="2" />
                  {/* Left & Right Floating Arms */}
                  <rect fill="url(#robotBody)" height="34" rx="9" stroke="#FFFFFF" strokeWidth="1.5" transform="rotate(18 50 136)" width="18" x="50" y="136" />
                  <rect fill="url(#robotBody)" height="34" rx="9" stroke="#FFFFFF" strokeWidth="1.5" transform="rotate(-18 152 140)" width="18" x="152" y="140" />
                  {/* Chest Soundwave Emblem */}
                  <circle cx="110" cy="158" fill="#0F172A" r="16" stroke="#38BDF8" strokeWidth="2" />
                  <line stroke="#22D3EE" strokeLinecap="round" strokeWidth="2.2" x1="101" x2="101" y1="155" y2="161" />
                  <line stroke="#22D3EE" strokeLinecap="round" strokeWidth="2.2" x1="105.5" x2="105.5" y1="151" y2="165" />
                  <line stroke="#22D3EE" strokeLinecap="round" strokeWidth="2.2" x1="110" x2="110" y1="148" y2="168" />
                  <line stroke="#22D3EE" strokeLinecap="round" strokeWidth="2.2" x1="114.5" x2="114.5" y1="151" y2="165" />
                  <line stroke="#22D3EE" strokeLinecap="round" strokeWidth="2.2" x1="119" x2="119" y1="155" y2="161" />
                </svg>
              </div>

              {/* Holographic Pedestal */}
              <div className="relative -mt-4 flex flex-col items-center">
                <div className="w-40 h-10 rounded-[100%] bg-gradient-to-r from-cyan-400/40 via-blue-500/40 to-indigo-400/40 blur-md" />
                <div className="w-44 h-12 -mt-8 rounded-[100%] bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(34,211,238,0.6)] flex items-center justify-center">
                  <div className="w-28 h-5 rounded-[100%] bg-cyan-400/30 border border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.9)]" />
                </div>
              </div>
            </div>

            {/* Floating Card 1: Tasks (Top Left) */}
            <div className="hidden sm:block absolute top-4 left-2 lg:left-4 z-20 glass-card rounded-2xl p-3.5 w-48 animate-float-card-1" data-purpose="floating-card-tasks">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-xs font-bold text-slate-900">Tasks</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-cyan-500 text-white flex items-center justify-center text-[9px]">✓</span>
                  <div className="h-2 w-24 rounded-full bg-slate-300/80" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-cyan-500 text-white flex items-center justify-center text-[9px]">✓</span>
                  <div className="h-2 w-20 rounded-full bg-slate-300/70" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-cyan-100 border border-cyan-400" />
                  <div className="h-2 w-16 rounded-full bg-slate-200/90" />
                </div>
              </div>
            </div>

            {/* Floating Card 2: Focus Mode (Top Right) */}
            <div className="hidden sm:block absolute top-4 right-2 lg:right-4 z-20 glass-card rounded-2xl p-3.5 w-48 animate-float-card-2" data-purpose="floating-card-focus">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 14" />
                  </svg>
                </span>
                <span className="text-xs font-bold text-slate-900">Focus Mode</span>
              </div>
              <div className="flex items-center justify-between bg-blue-50/80 rounded-xl px-3 py-2 border border-blue-100">
                <span className="font-bold text-lg text-slate-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>25:00</span>
                <span className="w-7 h-7 rounded-full btn-gradient-primary text-white flex items-center justify-center shadow">
                  <svg className="w-3 h-3 ml-0.5 fill-current" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Floating Card 3: Memory Vault (Middle Left) */}
            <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -left-2 lg:left-0 z-20 glass-card rounded-2xl p-3.5 w-48 animate-float-card-3" data-purpose="floating-card-memory">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                  </svg>
                </span>
                <span className="text-xs font-bold text-slate-900">Memory Vault</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-10 rounded-lg bg-indigo-100/90 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-2 w-full rounded-full bg-slate-300/80" />
                  <div className="h-2 w-4/5 rounded-full bg-slate-300/70" />
                  <div className="h-2 w-3/5 rounded-full bg-slate-200/80" />
                </div>
              </div>
            </div>

            {/* Floating Card 4: Integrations (MCP) (Middle Right) */}
            <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -right-2 lg:right-0 z-20 glass-card rounded-2xl p-3.5 w-52 animate-float-card-1" data-purpose="floating-card-integrations">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-6 h-6 rounded-md bg-cyan-500 text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                <span className="text-xs font-bold text-slate-900">Integrations (MCP)</span>
              </div>
              {/* App Icons Row: Gmail, Drive, Calendar, GitHub */}
              <div className="flex items-center justify-between pt-1">
                <span className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center font-bold text-xs text-red-500">
                  M
                </span>
                <span className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="12 3 21 19 3 19" />
                  </svg>
                </span>
                <span className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center font-bold text-[10px] text-blue-600">
                  31
                </span>
                <span className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-800">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Floating Card 5: Analytics (Bottom Left) */}
            <div className="hidden sm:block absolute bottom-2 left-4 lg:left-8 z-20 glass-card rounded-2xl p-3.5 w-48 animate-float-card-2" data-purpose="floating-card-analytics">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-6 h-6 rounded-md bg-blue-500 text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="18" x2="18" y1="20" y2="10" />
                    <line x1="12" x2="12" y1="20" y2="4" />
                    <line x1="6" x2="6" y1="20" y2="14" />
                  </svg>
                </span>
                <span className="text-xs font-bold text-slate-900">Analytics</span>
              </div>
              <div className="flex items-end gap-2 h-10 px-1">
                <div className="w-4 h-3 rounded-t bg-blue-200" />
                <div className="w-4 h-5 rounded-t bg-blue-300" />
                <div className="w-4 h-4 rounded-t bg-indigo-300" />
                <div className="w-4 h-7 rounded-t bg-blue-500" />
                <div className="w-4 h-9 rounded-t bg-indigo-600" />
              </div>
            </div>

            {/* Floating Card 6: Voice Assistant (Bottom Right) */}
            <div className="hidden sm:block absolute bottom-2 right-4 lg:right-8 z-20 glass-card rounded-2xl p-3.5 w-48 animate-float-card-3" data-purpose="floating-card-voice">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                </span>
                <span className="text-xs font-bold text-slate-900">Voice Assistant</span>
              </div>
              <div className="flex items-center justify-center gap-1 h-8">
                <span className="w-1 h-2 bg-blue-400 rounded-full" />
                <span className="w-1 h-4 bg-blue-500 rounded-full" />
                <span className="w-1 h-6 bg-indigo-500 rounded-full" />
                <span className="w-1 h-8 bg-blue-600 rounded-full" />
                <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                <span className="w-1 h-7 bg-blue-500 rounded-full" />
                <span className="w-1 h-3 bg-blue-400 rounded-full" />
                <span className="w-1 h-5 bg-indigo-400 rounded-full" />
                <span className="w-1 h-2 bg-blue-300 rounded-full" />
              </div>
            </div>
          </section>
          {/* END: RightHeroColumn */}
        </div>
      </main>
      {/* END: HeroSection */}

      {/* BEGIN: BottomFeatureBar */}
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-10 pb-6" data-purpose="bottom-feature-bar">
        <div className="glass-bar rounded-2xl px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x divide-slate-200/80">
          {/* Feature 1 */}
          <div className="flex items-center justify-start lg:justify-center gap-3 px-2">
            <span className="text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect height="12" rx="2" width="12" x="6" y="6" />
                <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
              </svg>
            </span>
            <span className="text-sm font-medium text-slate-900">AI-Powered Productivity</span>
          </div>

          {/* Feature 2 */}
          <div className="flex items-center justify-start lg:justify-center gap-3 px-2">
            <span className="text-indigo-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 12 12 17 22 12" />
                <polyline points="2 17 12 22 22 17" />
              </svg>
            </span>
            <span className="text-sm font-medium text-slate-900">Persistent Memory</span>
          </div>

          {/* Feature 3 */}
          <div className="flex items-center justify-start lg:justify-center gap-3 px-2">
            <span className="text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
              </svg>
            </span>
            <span className="text-sm font-medium text-slate-900 leading-tight">
              Connected Applications<br className="hidden lg:inline" /> via MCP
            </span>
          </div>

          {/* Feature 4 */}
          <div className="flex items-center justify-start lg:justify-center gap-3 px-2">
            <span className="text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="4" x2="4" y1="10" y2="14" />
                <line x1="8" x2="8" y1="7" y2="17" />
                <line x1="12" x2="12" y1="4" y2="20" />
                <line x1="16" x2="16" y1="7" y2="17" />
                <line x1="20" x2="20" y1="10" y2="14" />
              </svg>
            </span>
            <span className="text-sm font-medium text-slate-900 leading-tight">
              Multilingual Voice<br className="hidden lg:inline" /> Interaction
            </span>
          </div>
        </div>
      </footer>
      {/* END: BottomFeatureBar */}
    </div>
  );
};
