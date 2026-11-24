import React from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle,
  Zap,
  Layers,
  Activity,
  Cpu,
  Share2,
  Volume2,
  Calendar,
  HardDrive,
  Mail,
  Play,
  Clock,
  BarChart2,
  Shield,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 30%, #fdf2f8 65%, #eff6ff 100%)',
        color: '#1e1b4b',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      {/* Ambient background glow orbs */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.35) 0%, rgba(196, 181, 253, 0.15) 50%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          left: -60,
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251, 207, 232, 0.35) 0%, rgba(216, 180, 254, 0.15) 50%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      {/* 1. TOP NAVIGATION BAR */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px',
          maxWidth: 1440,
          width: '100%',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
            }}
          >
            {/* Waveform icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <span style={{ width: 2.5, height: 10, background: '#fff', borderRadius: 2 }}></span>
              <span style={{ width: 2.5, height: 18, background: '#fff', borderRadius: 2 }}></span>
              <span style={{ width: 2.5, height: 12, background: '#fff', borderRadius: 2 }}></span>
              <span style={{ width: 2.5, height: 6, background: '#fff', borderRadius: 2 }}></span>
            </div>
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, color: '#0f172a' }}>
            JARVIS <span style={{ color: '#2563eb' }}>2.0</span>
          </span>
        </div>

        {/* Center Nav Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
            fontSize: 14,
            fontWeight: 600,
            color: '#475569'
          }}
          className="landing-nav-links"
        >
          <span
            style={{
              color: '#2563eb',
              position: 'relative',
              paddingBottom: 4,
              borderBottom: '2.5px solid #2563eb',
              cursor: 'pointer'
            }}
          >
            Home
          </span>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={onGetStarted}>
            Features
          </span>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={onGetStarted}>
            Integrations
          </span>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={onGetStarted}>
            About
          </span>
        </nav>

        {/* Top Right Action Button */}
        <div>
          <button
            onClick={onGetStarted}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 9999,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* 2. HERO CONTENT SECTION */}
      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 1.05fr) minmax(460px, 1.25fr)',
          alignItems: 'center',
          gap: 40,
          maxWidth: 1440,
          width: '100%',
          margin: '0 auto',
          padding: '20px 48px 40px',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Left Column: Typography & CTAs */}
        <div style={{ maxWidth: 580 }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 9999,
              background: 'rgba(219, 234, 254, 0.75)',
              border: '1px solid rgba(147, 197, 253, 0.6)',
              color: '#1d4ed8',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 20
            }}
          >
            <span>Your Personal Digital Operating System</span>
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 'clamp(44px, 5.5vw, 68px)',
              fontWeight: 900,
              lineHeight: 1.05,
              margin: '0 0 18px',
              letterSpacing: -1.5,
              color: '#0f172a'
            }}
          >
            JARVIS <span style={{ color: '#2563eb' }}>2.0</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(16px, 1.8vw, 20px)',
              color: '#475569',
              lineHeight: 1.5,
              margin: '0 0 32px',
              fontWeight: 400,
              maxWidth: 520
            }}
          >
            An AI companion that remembers, organizes, communicates and acts on your behalf.
          </p>

          {/* 4 Feature Pills Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 36
            }}
          >
            {/* 1. Organize */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: 14,
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 8,
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Check size={18} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Organize</span>
            </div>

            {/* 2. Focus */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: 14,
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 8,
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.14)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Zap size={18} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Focus</span>
            </div>

            {/* 3. Automate */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: 14,
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 8,
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(139, 92, 246, 0.14)',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Layers size={18} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Automate</span>
            </div>

            {/* 4. Execute */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: 14,
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 8,
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(6, 182, 212, 0.14)',
                  color: '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Activity size={18} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Execute</span>
            </div>
          </div>

          {/* Primary Action Button (Watch Demo Button Removed per User Request) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={onGetStarted}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                padding: '16px 36px',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(37, 99, 235, 0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.4)';
              }}
            >
              <span>Get Started</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Right Column: 3D Holographic Robot Illustration with Floating HUD Cards */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 460
          }}
        >
          {/* Main Visual Image cropped to the robot + holographic pedestal + HUD cards */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 620,
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(99, 102, 241, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              background: 'rgba(255, 255, 255, 0.4)'
            }}
          >
            <img
              src="/jarvis-hero-landing.jpg"
              alt="JARVIS 2.0 Autonomous Companion"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      </main>

      {/* 3. BOTTOM VALUE PROPOSITION STRIP */}
      <footer
        style={{
          maxWidth: 1440,
          width: 'calc(100% - 96px)',
          margin: '0 auto 28px',
          padding: '18px 32px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.08)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Item 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Cpu size={20} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
              AI-Powered Productivity
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Deterministic & neural execution</div>
          </div>
        </div>

        {/* Item 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
              Persistent Memory
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Memory Vault goals & principles</div>
          </div>
        </div>

        {/* Item 3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(79, 70, 229, 0.12)',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Share2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
              Connected Applications
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Gmail, Drive, Calendar via MCP</div>
          </div>
        </div>

        {/* Item 4 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(6, 182, 212, 0.12)',
              color: '#0891b2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Volume2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
              Multilingual Voice
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Indic & Global neural TTS</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
