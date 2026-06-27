import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import FlightSearch from './components/Search/FlightSearch';
import FlightList from './components/Search/FlightList';
import SeatMap from './components/Booking/SeatMap';
import PassengerForm from './components/Booking/PassengerForm';
import PaymentPanel from './components/Booking/PaymentPanel';
import BookingConfirmation from './components/Booking/BookingConfirmation';
import BookingsDashboard from './components/Dashboard/BookingsDashboard';
import CheckIn from './components/CheckIn/CheckIn';
import FlightStatus from './components/Search/FlightStatus';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import Footer from './components/Footer/Footer';
import { useBooking } from './hooks/useBooking';
import { useAuth } from './hooks/useAuth';
import './App.css';

export default function App() {
  const { step, resetBooking } = useBooking();
  const { user, login, register } = useAuth();

  useEffect(() => {
    if (!user && step !== 'search') {
      resetBooking();
    }
  }, [user, step, resetBooking]);

  const [features, setFeatures] = useState([
    { icon: '✨', title: 'AI Suggestion Engine', desc: 'Get recommended flight badges instantly based on duration, stops, layover times, and price balances.' },
    { icon: '🔒', title: 'Real-Time Seat Locks', desc: 'Lock your favorite window or aisle seat for up to 8 minutes while you enter traveler info. No double-bookings.' },
    { icon: '👑', title: 'Elite SkyWave Club', desc: 'Accumulate club rewards points automatically and advance through Bronze, Silver, Gold, and Platinum tiers.' }
  ]);

  useEffect(() => {
    const fetchHomepageFeatures = async () => {
      try {
        const res = await fetch(`/api/config/features?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length === 3) {
            setFeatures(data);
          }
        }
      } catch (err) {
        console.error('Failed to load homepage features configuration:', err);
      }
    };
    fetchHomepageFeatures();
  }, []);
  
  // Portal role detection via environment variable and port fallback
  const getPortalRole = () => {
    const envRole = import.meta.env.VITE_PORTAL_ROLE;
    if (envRole) return envRole;
    if (typeof window !== 'undefined' && window.location) {
      const port = window.location.port;
      if (port === '3003') return 'admin';
      if (port === '3004') return 'superadmin';
      if (port === '3002') return 'user';
    }
    return 'user';
  };

  const portalRole = getPortalRole();
  const isOperationsPort = portalRole === 'admin';
  const isSuperAdminPort = portalRole === 'superadmin';
  const isAdminPort = isOperationsPort || isSuperAdminPort;


  // Auth Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot-password', 'pending-approval-msg'
  
  // Form input fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [nationality, setNationality] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password state
  const [forgotStep, setForgotStep] = useState(1); // 1 = email, 2 = otp, 3 = password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      if (isOperationsPort && authView === 'register') {
        const data = await register({
          name,
          email,
          password,
          role: 'admin'
        });
        if (data.status === 'pending') {
          setAuthView('pending-approval-msg');
          resetAuthForm();
          return;
        }
      } else if (authView === 'login') {
        await login(email, password);
      } else {
        await register({
          name,
          email,
          password,
          passportNumber,
          nationality,
          dateOfBirth
        });
      }
      setIsAuthModalOpen(false);
      resetAuthForm();
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotStatus('');

    try {
      if (forgotStep === 1) {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'No account found with this email.');
        }
        const data = await res.json();
        setForgotStatus('Simulated verification code generated.');
        if (data.otpToken) {
          setSimulatedOtp(data.otpToken);
        }
        setForgotStep(2);
      } else if (forgotStep === 2) {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, otp: forgotOtp })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Invalid verification OTP code.');
        }
        setForgotStep(3);
      } else if (forgotStep === 3) {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to reset password.');
        }
        alert('Password reset successful! You can now log in.');
        // reset
        setForgotStep(1);
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPassword('');
        setSimulatedOtp('');
        setAuthView('login');
        setIsAuthModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      setForgotError(err.message || 'Operation failed.');
    }
  };

  const resetAuthForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPassportNumber('');
    setNationality('');
    setDateOfBirth('');
    setAuthError('');
  };

  const renderActiveStepView = () => {
    if (isAdminPort) {
      if (!user) {
        return (
          <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '40px 24px' }}>
            <div className="glass-card animate-scale-up" style={{ maxWidth: '450px', width: '100%', padding: '40px' }}>
              
              {authView === 'login' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '40px' }}>{isSuperAdminPort ? '👑' : '⚙️'}</span>
                    <h2 style={{ fontSize: '24px', marginTop: '12px', color: 'var(--sky-gold)' }}>
                      {isSuperAdminPort ? 'Super Admin Command' : 'Operations Center'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                      Please sign in with your administrative credentials
                    </p>
                  </div>
                  
                  <form onSubmit={handleAuthSubmit}>
                    <div className="form-field" style={{ marginBottom: '16px' }}>
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        className="glass-input" 
                        placeholder="name@skywave.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-field" style={{ marginBottom: '12px' }}>
                      <label>Password</label>
                      <input 
                        type="password" 
                        className="glass-input" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                      <button 
                        type="button" 
                        onClick={() => { setAuthView('forgot-password'); setForgotEmail(email); setForgotError(''); setForgotStatus(''); setForgotStep(1); }}
                        style={{ background: 'none', border: 'none', color: 'var(--sky-accent)', fontSize: '12.5px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Forgot Password?
                      </button>
                    </div>

                    {authError && (
                      <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold' }}>
                        ⚠️ {authError}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="glass-button" 
                      style={{ width: '100%', height: '44px' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Authenticating...' : 'Sign In to Command Center ➔'}
                    </button>
                  </form>

                  {isOperationsPort && (
                    <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                      <button 
                        onClick={() => { setAuthView('register'); setAuthError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--sky-gold)', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Request Operations Admin Account
                      </button>
                    </div>
                  )}
                </>
              )}

              {authView === 'register' && isOperationsPort && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '40px' }}>⚙️</span>
                    <h2 style={{ fontSize: '24px', marginTop: '12px', color: 'var(--sky-gold)' }}>
                      Request Operations Access
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                      Register an administrative credentials request.
                    </p>
                  </div>
                  
                  <form onSubmit={handleAuthSubmit}>
                    <div className="form-field" style={{ marginBottom: '16px' }}>
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="Enter full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-field" style={{ marginBottom: '16px' }}>
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        className="glass-input" 
                        placeholder="e.g. admin@skywave.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-field" style={{ marginBottom: '20px' }}>
                      <label>Desired Secure Password</label>
                      <input 
                        type="password" 
                        className="glass-input" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    {authError && (
                      <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold' }}>
                        ⚠️ {authError}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="glass-button" 
                      style={{ width: '100%', height: '44px' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting Request...' : 'Submit Credentials Request ➔'}
                    </button>
                  </form>

                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button 
                      onClick={() => { setAuthView('login'); setAuthError(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Back to Login
                    </button>
                  </div>
                </>
              )}

              {authView === 'pending-approval-msg' && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⏳</span>
                  <h3 style={{ color: 'var(--sky-gold)', fontSize: '20px', marginBottom: '12px' }}>Request Pending Approval</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                    Your administrative registration request has been submitted successfully. 
                    Your account is registered as <strong>PENDING</strong> and requires manual activation by the Super Admin before you can log in.
                  </p>
                  <button 
                    onClick={() => setAuthView('login')}
                    className="glass-button"
                    style={{ width: '100%' }}
                  >
                    Back to Sign In
                  </button>
                </div>
              )}

              {authView === 'forgot-password' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '40px' }}>🔑</span>
                    <h2 style={{ fontSize: '24px', marginTop: '12px', color: 'var(--sky-gold)' }}>
                      Reset Password
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                      Verify OTP to reset your system access credentials
                    </p>
                  </div>

                  <form onSubmit={handleForgotPasswordSubmit}>
                    {forgotStep === 1 && (
                      <div className="form-field" style={{ marginBottom: '20px' }}>
                        <label>Register Email Address</label>
                        <input 
                          type="email" 
                          className="glass-input" 
                          placeholder="name@skywave.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {forgotStep === 2 && (
                      <>
                        <div style={{ background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.2)', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Simulated code: <strong style={{ color: 'var(--sky-gold)' }}>{simulatedOtp}</strong>
                        </div>
                        <div className="form-field" style={{ marginBottom: '20px' }}>
                          <label>Enter 6-digit Verification OTP</label>
                          <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="e.g. 123456"
                            value={forgotOtp}
                            onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                            maxLength="6"
                            required
                          />
                        </div>
                      </>
                    )}

                    {forgotStep === 3 && (
                      <div className="form-field" style={{ marginBottom: '20px' }}>
                        <label>Enter New Secure Password</label>
                        <input 
                          type="password" 
                          className="glass-input" 
                          placeholder="••••••••"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {forgotError && (
                      <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold' }}>
                        ⚠️ {forgotError}
                      </div>
                    )}
                    {forgotStatus && (
                      <div style={{ color: 'var(--success)', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold' }}>
                        ✓ {forgotStatus}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="glass-button" 
                      style={{ width: '100%', height: '40px' }}
                    >
                      {forgotStep === 1 ? 'Send OTP Verification Code ➔' : forgotStep === 2 ? 'Verify Code ➔' : 'Confirm Password Reset ➔'}
                    </button>
                  </form>

                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button 
                      onClick={() => { setAuthView('login'); setForgotStep(1); setForgotEmail(''); setForgotOtp(''); setForgotNewPassword(''); setSimulatedOtp(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
                    >
                      Back to Sign In
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        );
      }
      return <AdminDashboard />;
    }

    switch (step) {
      case 'search':
        return (
          <div className="homepage-gradient-wrapper">
            <section className="hero-section">
              <div className="hero-content">
                <span className="hero-tag">Welcome to SkyWave Airlines</span>
                <h1 className="hero-title">Discover the Sky<br />on Your Own Terms</h1>
                <p className="hero-subtitle">
                  Experience commercial air travel reimagined. Book international journeys with real-time seat status locks and intelligent AI flight scores.
                </p>
              </div>
            </section>
            
            {user && <FlightSearch />}

            <section className="container" style={{ paddingBottom: '60px' }}>
              <div className="features-grid">
                {features.map((feat, index) => (
                  <div key={index} className="feature-card glass-card animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className="feature-icon">{feat.icon}</span>
                    <h3 className="feature-title">{feat.title}</h3>
                    <p className="feature-desc">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        );
      case 'results':
        return (
          <>
            <div style={{ background: 'var(--gradient-hero)', padding: '40px 0 20px', borderBottom: '1px solid var(--card-border)' }}>
              <FlightSearch />
            </div>
            <FlightList />
          </>
        );
      case 'seats':
        return <SeatMap />;
      case 'passengers':
        return <PassengerForm />;
      case 'payment':
        return <PaymentPanel />;
      case 'confirmation':
        return <BookingConfirmation />;
      case 'bookings_dashboard':
        return <BookingsDashboard />;
      case 'checkin':
        return <CheckIn />;
      case 'flight_status':
        return <FlightStatus />;
      case 'admin_dashboard':
        return <AdminDashboard />;
      default:
        return <div style={{ padding: '60px', textAlign: 'center' }}>Step view not found</div>;
    }
  };

  const renderAuthModal = () => {
    if (!isAuthModalOpen) return null;
    return (
      <div className="auth-modal-overlay animate-fade-in" onClick={() => setIsAuthModalOpen(false)}>
        <div className="auth-modal-content glass-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setIsAuthModalOpen(false)}>×</button>
          
          {authView !== 'forgot-password' ? (
            <>
              <div className="auth-tab-row">
                <button 
                  className={`auth-tab-btn ${authView === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthView('login'); setAuthError(''); }}
                >
                  Log In
                </button>
                <button 
                  className={`auth-tab-btn ${authView === 'register' ? 'active' : ''}`}
                  onClick={() => { setAuthView('register'); setAuthError(''); }}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuthSubmit}>
                {authView === 'register' && (
                  <div className="form-field" style={{ marginBottom: '16px' }}>
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Enter full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-field" style={{ marginBottom: '16px' }}>
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="glass-input" 
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field" style={{ marginBottom: '12px' }}>
                  <label>Password</label>
                  <input 
                    type="password" 
                    className="glass-input" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {authView === 'login' && (
                  <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                    <button 
                      type="button" 
                      onClick={() => { setAuthView('forgot-password'); setForgotEmail(email); setForgotError(''); setForgotStatus(''); setForgotStep(1); }}
                      style={{ background: 'none', border: 'none', color: 'var(--sky-accent)', fontSize: '12.5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {authView === 'register' && (
                  <>
                    <div className="form-field" style={{ marginBottom: '16px' }}>
                      <label>Passport Number (Optional)</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="Passport ID"
                        value={passportNumber}
                        onChange={(e) => setPassportNumber(e.target.value)}
                      />
                    </div>

                    <div className="form-grid-row" style={{ gridTemplateColumns: '1fr 1.2fr', marginBottom: '16px', gap: '12px' }}>
                      <div className="form-field">
                        <label>Nationality</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          placeholder="e.g. India"
                          value={nationality}
                          onChange={(e) => setNationality(e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label>Date of Birth</label>
                        <input 
                          type="date" 
                          className="glass-input" 
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {authError && (
                  <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold' }}>
                    ⚠️ {authError}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="glass-button" 
                  style={{ width: '100%', height: '44px', marginTop: '10px' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Authenticating...' : authView === 'login' ? 'Sign In ➔' : 'Create Account ➔'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '32px' }}>🔑</span>
                <h3 style={{ fontSize: '20px', marginTop: '8px', color: 'var(--sky-gold)' }}>Forgot Password</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                  Reset your traveler account password using secure OTP.
                </p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit}>
                {forgotStep === 1 && (
                  <div className="form-field" style={{ marginBottom: '20px' }}>
                    <label>Enter Registered Email Address</label>
                    <input 
                      type="email" 
                      className="glass-input" 
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                )}

                {forgotStep === 2 && (
                  <>
                    <div style={{ background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.2)', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Simulated code: <strong style={{ color: 'var(--sky-gold)' }}>{simulatedOtp}</strong>
                    </div>
                    <div className="form-field" style={{ marginBottom: '20px' }}>
                      <label>Enter 6-digit Verification OTP</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="e.g. 123456"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                        maxLength="6"
                        required
                      />
                    </div>
                  </>
                )}

                {forgotStep === 3 && (
                  <div className="form-field" style={{ marginBottom: '20px' }}>
                    <label>Enter New Secure Password</label>
                    <input 
                      type="password" 
                      className="glass-input" 
                      placeholder="••••••••"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                {forgotError && (
                  <div style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold' }}>
                    ⚠️ {forgotError}
                  </div>
                )}
                {forgotStatus && (
                  <div style={{ color: 'var(--success)', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold' }}>
                    ✓ {forgotStatus}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="glass-button" 
                  style={{ width: '100%', height: '40px' }}
                >
                  {forgotStep === 1 ? 'Send OTP Verification Code ➔' : forgotStep === 2 ? 'Verify Code ➔' : 'Confirm Password Reset ➔'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <button 
                  onClick={() => { setAuthView('login'); setForgotStep(1); setForgotEmail(''); setForgotOtp(''); setForgotNewPassword(''); setSimulatedOtp(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
                >
                  Back to Log In
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenLoginModal={() => { setIsAuthModalOpen(true); setAuthView('login'); }} isMobileMode={false} />
      
      <main style={{ flex: 1, paddingTop: (isAdminPort || step !== 'search') ? '70px' : '0px' }}>
        {renderActiveStepView()}
      </main>

      <Footer />

      {/* Auth Modal Overlay */}
      {renderAuthModal()}
    </div>
  );
}
