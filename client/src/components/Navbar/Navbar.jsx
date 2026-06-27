import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useBooking } from '../../hooks/useBooking';
import './Navbar.css';

export default function Navbar({ onOpenLoginModal, isMobileMode }) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { step, setStep, resetBooking } = useBooking();

  const getPortalRole = () => {
    if (typeof window !== 'undefined' && window.location) {
      const port = window.location.port;
      if (port === '3003' || port === '5174') return 'admin';
      if (port === '3004' || port === '5175') return 'superadmin';
      if (port === '3002' || port === '5173') return 'user';
    }
    return import.meta.env.VITE_PORTAL_ROLE || 'user';
  };

  const portalRole = getPortalRole();
  const isOperationsPort = portalRole === 'admin';
  const isSuperAdminPort = portalRole === 'superadmin';
  const isAdminPort = isOperationsPort || isSuperAdminPort;

  const handleNavClick = (targetStep) => {
    if (isAdminPort) {
      setStep('admin_dashboard');
    } else if (targetStep === 'search') {
      resetBooking();
    } else {
      setStep(targetStep);
    }
  };

  return (
    <header id="main-header" className={isMobileMode ? 'is-mobile' : ''}>
      <div className={`navbar-content ${isMobileMode ? 'is-mobile' : ''}`}>
        
        {/* Left Column: Brand Logo */}
        <div className="nav-col-left">
          <div className="logo" onClick={() => handleNavClick(isAdminPort ? 'admin_dashboard' : 'search')}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="logo-icon-svg" style={{ width: '20px', height: '20px', transform: 'rotate(-45deg)', display: 'inline-block', marginRight: '4px', color: 'var(--sky-gold)' }}>
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5z"/>
            </svg>
            SkyWave 
            {isOperationsPort && <span style={{ fontSize: '10px', color: 'var(--sky-gold)', marginLeft: '4px', fontWeight: 'bold' }}>[Ops]</span>}
            {isSuperAdminPort && <span style={{ fontSize: '10px', color: 'var(--sky-gold)', marginLeft: '4px', fontWeight: 'bold' }}>[Super]</span>}
          </div>
        </div>
        
        {/* Center Column: Console / Booking Navigation */}
        {!isMobileMode && (
          <div className="nav-col-center">
            <ul className="nav-links">
              {!isAdminPort ? (
                user && (
                  <>
                    <li>
                      <span 
                        onClick={() => handleNavClick('search')} 
                        className={`nav-link-item ${step === 'search' || step === 'results' || step === 'seats' || step === 'passengers' || step === 'payment' || step === 'confirmation' ? 'active' : ''}`}
                      >
                        Book Flights
                      </span>
                    </li>
                    <li>
                      <span 
                        onClick={() => handleNavClick('bookings_dashboard')} 
                        className={`nav-link-item ${step === 'bookings_dashboard' ? 'active' : ''}`}
                      >
                        My Bookings
                      </span>
                    </li>
                    <li>
                      <span 
                        onClick={() => handleNavClick('checkin')} 
                        className={`nav-link-item ${step === 'checkin' ? 'active' : ''}`}
                      >
                        Check-In
                      </span>
                    </li>
                    <li>
                      <span 
                        onClick={() => handleNavClick('flight_status')} 
                        className={`nav-link-item ${step === 'flight_status' ? 'active' : ''}`}
                      >
                        Flight Status
                      </span>
                    </li>
                  </>
                )
              ) : (
                <li>
                  <span 
                    onClick={() => handleNavClick('admin_dashboard')} 
                    className="nav-link-item active"
                    style={{ color: 'var(--sky-gold)', fontSize: '16px', fontWeight: '700' }}
                  >
                    {isSuperAdminPort ? '👑 Super Admin Console' : '⚙️ Operations Command'}
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Right Column: Actions (Theme Toggle & Login/Logout) */}
        <div className="nav-col-right">
          <div className="nav-actions">
            {/* Theme Toggle Button */}
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="user-badge">
                  <span>👤</span>
                  {!isMobileMode && <span>{user.name}</span>}
                  {user.loyaltyTier && (
                    <span className="loyalty-gold">
                      ({isMobileMode ? user.loyaltyTier[0] : user.loyaltyTier})
                    </span>
                  )}
                </div>
                <button className="login-btn" style={{ background: 'var(--error)', padding: isMobileMode ? '6px 10px' : '8px 18px', fontSize: isMobileMode ? '12px' : '14px' }} onClick={logout}>
                  Logout
                </button>
              </div>
            ) : (
              !isAdminPort && (
                <button className="login-btn" style={{ padding: isMobileMode ? '6px 12px' : '8px 18px', fontSize: isMobileMode ? '12px' : '14px' }} onClick={onOpenLoginModal}>
                  Login
                </button>
              )
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
