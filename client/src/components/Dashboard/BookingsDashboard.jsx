import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './Dashboard.css';

export default function BookingsDashboard() {
  const { user, token, syncProfile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancellation state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [refundEstimates, setRefundEstimates] = useState(null);
  const [isProcessingCancellation, setIsProcessingCancellation] = useState(false);

  // Tab switching state
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'profile'
  const [setup2FA, setSetup2FA] = useState(false);
  const [otp2FA, setOtp2FA] = useState('');
  const [isUpdating2FA, setIsUpdating2FA] = useState(false);

  // Fetch bookings from server
  const fetchBookings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else {
        throw new Error('Failed to load bookings');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  // Compute loyalty progress meter details
  const getLoyaltyProgress = () => {
    if (!user) return { fill: 0, nextTier: 'Silver', pointsNeeded: 5000 };
    const pts = user.loyaltyPoints || 0;
    const tier = user.loyaltyTier || 'Bronze';

    if (tier === 'Bronze') {
      const percent = Math.min(100, (pts / 5000) * 100);
      return { fill: percent, nextTier: 'Silver', pointsNeeded: Math.max(0, 5000 - pts) };
    } else if (tier === 'Silver') {
      const percent = Math.min(100, ((pts - 5000) / 10000) * 100);
      return { fill: percent, nextTier: 'Gold', pointsNeeded: Math.max(0, 15000 - pts) };
    } else if (tier === 'Gold') {
      const percent = Math.min(100, ((pts - 15000) / 15000) * 100);
      return { fill: percent, nextTier: 'Platinum', pointsNeeded: Math.max(0, 30000 - pts) };
    } else {
      return { fill: 100, nextTier: 'None (Highest)', pointsNeeded: 0 };
    }
  };

  const loyalty = getLoyaltyProgress();

  // Cancel booking process: estimate refund
  const initiateCancel = (booking) => {
    const flight = booking.flightIds[0];
    if (!flight) return;

    const departure = new Date(flight.departureTime);
    const now = new Date();
    const hoursDifference = (departure - now) / (1000 * 60 * 60);
    
    let refundPercent = 0;
    if (flight.status === 'cancelled') refundPercent = 100;
    else if (hoursDifference > 72) refundPercent = 90;
    else if (hoursDifference >= 24) refundPercent = 50;
    else refundPercent = 0;

    const estimatedRefund = Math.round(booking.totalAmount * (refundPercent / 100));

    setRefundEstimates({
      percent: refundPercent,
      amount: estimatedRefund,
      hoursRemaining: Math.round(hoursDifference)
    });
    setCancellingBooking(booking);
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingBooking || !token) return;
    setIsProcessingCancellation(true);
    try {
      const res = await fetch(`/api/bookings/${cancellingBooking._id}/cancel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Passenger requested cancellation from portal' })
      });

      if (res.ok) {
        // Refresh bookings and user profile loyalty points
        await fetchBookings();
        await syncProfile(token);
        setCancellingBooking(null);
        setRefundEstimates(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Cancellation request failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Cancellation request failed. Please try again.');
    } finally {
      setIsProcessingCancellation(false);
    }
  };

  // Profile pic upload helper
  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const res = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ profilePicture: base64String })
        });
        if (res.ok) {
          await syncProfile(token);
        } else {
          const err = await res.json();
          alert(err.message || 'Failed to upload profile picture.');
        }
      } catch (err) {
        console.error(err);
        alert('Error uploading profile picture.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePicDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your profile picture?')) return;
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profilePicture: '' })
      });
      if (res.ok) {
        await syncProfile(token);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete profile picture.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting profile picture.');
    }
  };

  // Toggle 2FA activation helper
  const handleToggle2FA = async (enable) => {
    if (enable) {
      if (!/^\d{6}$/.test(otp2FA)) {
        alert('Please enter a valid 6-digit verification code.');
        return;
      }
    }

    setIsUpdating2FA(true);
    try {
      const payload = enable 
        ? { twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' }
        : { twoFactorEnabled: false, twoFactorSecret: null };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await syncProfile(token);
        setSetup2FA(false);
        setOtp2FA('');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update Two-Factor Authentication.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating Two-Factor Authentication.');
    } finally {
      setIsUpdating2FA(false);
    }
  };

  // ID Card PDF Download helper using Blobs
  const handleDownloadCard = async () => {
    try {
      const res = await fetch(`/api/users/${user._id || user.id}/card/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to generate PDF card');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `skywave_id_card_${user.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(err.message || 'Error downloading card');
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px' }}>
          <span style={{ fontSize: '48px' }}>👤</span>
          <h3 style={{ margin: '16px 0 8px' }}>Access My Bookings Dashboard</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Please log in or register to view your loyalty points progress and flight reservations dashboard.
          </p>
        </div>
      </div>
    );
  }

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="container animate-fade-in">
      <div style={{ margin: '24px 0 16px' }}>
        <h2>Customer Portal</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Manage your travel history, active tickets, and airline club rewards.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="auth-tab-row" style={{ marginBottom: '24px', maxWidth: '360px', marginTop: '16px' }}>
        <button 
          className={`auth-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          My Bookings
        </button>
        <button 
          className={`auth-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile & Security
        </button>
      </div>

      {activeTab === 'bookings' ? (
        <div className="dashboard-container">
          {/* Left Column: Loyalty Card and Profile Summary */}
          <div>
            {/* Card */}
            <div className={`loyalty-card tier-${user.loyaltyTier} ${user.loyaltyTier === 'Silver' ? 'silver-text' : ''}`}>
              <span className="loyalty-title">SkyWave Club Member</span>
              <div className="loyalty-tier-name">{user.loyaltyTier} Tier</div>
              
              <div className="loyalty-points-label">AVAILABLE POINTS</div>
              <div className="loyalty-points-value">{(user.loyaltyPoints || 0).toLocaleString()} PTS</div>

              {user.loyaltyTier !== 'Platinum' ? (
                <div className="loyalty-progress-wrapper">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', opacity: 0.8 }}>
                    <span>Progress to {loyalty.nextTier}</span>
                    <span>{loyalty.pointsNeeded.toLocaleString()} pts remaining</span>
                  </div>
                  <div className="loyalty-progress-track">
                    <div className="loyalty-progress-fill" style={{ width: `${loyalty.fill}%` }}></div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                  👑 You have reached our premium elite status tier.
                </div>
              )}
            </div>

            {/* Profile metadata */}
            <div className="glass-card" style={{ marginTop: '20px', padding: '20px' }}>
              <h4 style={{ fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '12px' }}>
                My Profile
              </h4>
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>Email: <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong></div>
                {user.passportNumber && <div>Passport: <strong style={{ color: 'var(--text-primary)' }}>{user.passportNumber}</strong></div>}
                {user.nationality && <div>Nationality: <strong style={{ color: 'var(--text-primary)' }}>{user.nationality}</strong></div>}
              </div>
            </div>
          </div>

          {/* Right Column: Bookings list */}
          <div>
            {cancellingBooking ? (
              /* cancellation modal interface */
              <div className="glass-card animate-fade-in" style={{ padding: '30px', border: '1px solid var(--error)' }}>
                <h3 style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Confirm Flight Cancellation
                </h3>
                <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  You are cancelling booking PNR: <strong style={{ color: 'var(--text-primary)' }}>{cancellingBooking.pnr}</strong>. 
                  Departure time is in {refundEstimates.hoursRemaining} hours.
                </p>

                {/* Refund policy calculation display */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '8px', margin: '20px 0', borderLeft: '4px solid var(--error)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span>Original Booking Price:</span>
                    <strong>₹{cancellingBooking.totalAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span>Refund Percentage:</span>
                    <strong style={{ color: refundEstimates.percent > 0 ? 'var(--success)' : 'var(--error)' }}>
                      {refundEstimates.percent}% Refund Policy
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                    <span>Estimated Refund Amount:</span>
                    <span style={{ color: 'var(--success)' }}>₹{refundEstimates.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button 
                    className="glass-button-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      setCancellingBooking(null);
                      setRefundEstimates(null);
                    }}
                    disabled={isProcessingCancellation}
                  >
                    No, Keep Booking
                  </button>
                  <button 
                    className="glass-button" 
                    style={{ flex: 1.5, background: 'var(--error)' }}
                    onClick={handleConfirmCancellation}
                    disabled={isProcessingCancellation}
                  >
                    {isProcessingCancellation ? 'Processing Cancel...' : 'Yes, Confirm Cancellation'}
                  </button>
                </div>
              </div>
            ) : (
              /* normal active booking lists */
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Flight Reservations</h3>
                
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <span className="animate-spin" style={{ fontSize: '24px' }}>🔄</span> Loading your bookings...
                  </div>
                ) : error ? (
                  <div style={{ color: 'var(--error)', padding: '20px', fontWeight: 'bold' }}>{error}</div>
                ) : bookings.length === 0 ? (
                  <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🛫</span>
                    No flight reservations booked yet. Use "Book Flights" to start your search.
                  </div>
                ) : (
                  bookings.map(booking => {
                    const flight = booking.flightIds[0];
                    if (!flight) return null;
                    const isCancelled = booking.status === 'cancelled';
                    
                    return (
                      <div key={booking._id} className="dashboard-booking-card glass-card animate-fade-in">
                        <div className="dashboard-booking-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="pnr-tag">PNR: {booking.pnr}</span>
                            <span className={`status-badge ${booking.status}`}>{booking.status}</span>
                          </div>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Booked on: {new Date(booking.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Flight Route details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', alignItems: 'center', gap: '20px' }}>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '16px' }}>
                              {flight.origin?.city} ({flight.origin?.code}) ➔ {flight.destination?.city} ({flight.destination?.code})
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Departure: <strong>{formatDateTime(flight.departureTime)}</strong> ({flight.airline} - {flight.flightNumber})
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                              {flight.stops && flight.stops.length > 0 ? (
                                <span style={{ color: 'var(--sky-gold)' }}>● Touch Flight ({flight.stops[0].city} layover)</span>
                              ) : (
                                <span style={{ color: 'var(--success)' }}>● Direct Flight</span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>PAID AMOUNT</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)' }}>
                              ₹{booking.totalAmount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* Passengers and seat tags */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Passengers: <strong>{booking.passengers.map(p => `${p.name} (${p.seatNumber})`).join(', ')}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {!isCancelled && (
                              <a 
                                href={`/api/bookings/${booking._id}/boarding-pass`}
                                className="glass-button-secondary" 
                                style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                download
                              >
                                📥 PDF Pass
                              </a>
                            )}
                            {!isCancelled && booking.checkinStatus !== 'checked-in' && (
                              <button 
                                className="glass-button" 
                                style={{ padding: '6px 14px', fontSize: '12px', background: 'var(--error)' }}
                                onClick={() => initiateCancel(booking)}
                              >
                                Cancel Booking
                              </button>
                            )}
                            {isCancelled && booking.refundAmount > 0 && (
                              <span style={{ fontSize: '12px', color: 'var(--success)', fontStyle: 'italic' }}>
                                Refunded ₹{booking.refundAmount.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Profile & Security Tab */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', marginBottom: '60px' }}>
          {/* Left Panel: Profile settings and 2FA */}
          <div className="glass-card animate-fade-in" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              👤 Profile & Security Settings
            </h3>
            
            {/* Profile Picture */}
            <div style={{ marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                PROFILE PICTURE
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt="Profile" 
                    style={{ width: '100px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.1)' }} 
                  />
                ) : (
                  <div style={{ width: '100px', height: '120px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '32px' }}>👤</span>
                    <span style={{ fontSize: '10px', marginTop: '6px' }}>No Photo</span>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Upload a high-quality JPEG or PNG profile picture for your digital membership ID card (Max 2MB).
                  </p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label className="glass-button-secondary" style={{ display: 'inline-block', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', marginBottom: 0 }}>
                      📤 Choose Photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleProfilePicUpload} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    {user.profilePicture && (
                      <button
                        type="button"
                        className="glass-button-secondary"
                        onClick={handleProfilePicDelete}
                        style={{ 
                          padding: '6px 14px', 
                          fontSize: '12px', 
                          background: 'rgba(239, 68, 68, 0.15)', 
                          border: '1px solid rgba(239, 68, 68, 0.35)', 
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        🗑️ Delete Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                TWO-FACTOR AUTHENTICATION (2FA)
              </label>
              
              {user.twoFactorEnabled ? (
                <div style={{ background: 'rgba(0, 200, 83, 0.05)', border: '1px solid rgba(0, 200, 83, 0.2)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 'bold', fontSize: '14px' }}>
                    <span>🛡️</span> Two-Factor Authentication is Enabled
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '16px' }}>
                    Your account is secured with authenticator verification code prompt on log in.
                  </p>
                  <button 
                    className="glass-button" 
                    onClick={() => handleToggle2FA(false)}
                    style={{ background: 'var(--error)', padding: '6px 14px', fontSize: '12px', height: 'auto' }}
                    disabled={isUpdating2FA}
                  >
                    Disable 2FA
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(255, 184, 0, 0.05)', border: '1px solid rgba(255, 184, 0, 0.2)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sky-gold)', fontWeight: 'bold', fontSize: '14px' }}>
                      <span>⚠️</span> Two-Factor Authentication is Disabled
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      Add an extra layer of security by scanning a QR code with Google Authenticator or Microsoft Authenticator.
                    </p>
                  </div>

                  {!setup2FA ? (
                    <button 
                      className="glass-button" 
                      onClick={() => setSetup2FA(true)}
                      style={{ padding: '8px 16px', fontSize: '12px', height: 'auto' }}
                    >
                      Setup 2FA Security
                    </button>
                  ) : (
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                      <h5 style={{ fontSize: '13px', marginBottom: '8px' }}>2FA Activation</h5>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        1. Add account key <strong style={{ color: 'var(--sky-gold)' }}>JBSWY3DPEHPK3PXP</strong> in your authenticator application.
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                        <div style={{ width: '100px', height: '100px', background: '#FFFFFF', padding: '6px', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--card-border)' }}>
                          <span style={{ fontSize: '48px', filter: 'grayscale(1)' }}>🏁</span>
                        </div>
                      </div>

                      <div className="form-field" style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px' }}>2. Enter 6-digit Verification Code</label>
                        <input 
                          type="text" 
                          maxLength="6"
                          className="glass-input" 
                          placeholder="e.g. 123456"
                          value={otp2FA}
                          onChange={(e) => setOtp2FA(e.target.value.replace(/\D/g, ''))}
                          style={{ height: '36px', fontSize: '14px', letterSpacing: '2px', textAlign: 'center' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          className="glass-button-secondary" 
                          onClick={() => { setSetup2FA(false); setOtp2FA(''); }}
                          style={{ flex: 1, padding: '6px 12px', fontSize: '11px', height: 'auto' }}
                        >
                          Cancel
                        </button>
                        <button 
                          className="glass-button" 
                          onClick={() => handleToggle2FA(true)}
                          style={{ flex: 1.5, padding: '6px 12px', fontSize: '11px', height: 'auto' }}
                          disabled={isUpdating2FA}
                        >
                          Verify & Enable
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Card Preview and Print */}
          <div className="glass-card animate-fade-in" style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', alignSelf: 'flex-start' }}>
              🖨️ Digital Membership Card
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', alignSelf: 'flex-start' }}>
              This is your official SkyWave Airlines frequent flyer credentials. Print the PDF card to verify access in boarding queues.
            </p>

            {/* CSS Card Badge Preview */}
            <div style={{ 
              width: '360px', 
              height: '224px', 
              borderRadius: '12px', 
              background: '#f8fafc', 
              color: '#0f172a',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #cbd5e1',
              fontFamily: 'Helvetica, Arial, sans-serif'
            }}>
              {/* Slate 900 Header */}
              <div style={{ background: '#0f172a', height: '52px', padding: '8px 20px', color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>SKYWAVE AIRLINES</span>
                <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginTop: '2px' }}>FREQUENT FLYER MEMBER</span>
              </div>
              {/* Gold Accent Line */}
              <div style={{ background: '#f59e0b', height: '5px' }}></div>

              {/* Card Body */}
              <div style={{ padding: '16px 20px', display: 'flex', gap: '16px' }}>
                {/* Photo */}
                <div style={{ width: '80px', height: '96px', border: '1px solid #cbd5e1', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {user.profilePicture ? (
                    <img src={user.profilePicture} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '24px' }}>👤</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '8px', color: '#475569', fontWeight: 'bold' }}>ROLE: TRAVELER</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                    <div>
                      <span style={{ fontSize: '7px', color: '#64748b', display: 'block' }}>ID NUMBER</span>
                      <strong style={{ fontSize: '8.5px', color: '#0f172a' }}>{user.memberId || 'SW-MBR-PENDING'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '7px', color: '#64748b', display: 'block' }}>TIER LEVEL</span>
                      <strong style={{ fontSize: '8.5px', color: '#f59e0b' }}>{user.loyaltyTier.toUpperCase()}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                    <div>
                      <span style={{ fontSize: '7px', color: '#64748b', display: 'block' }}>CLUB NO</span>
                      <strong style={{ fontSize: '8.5px', color: '#0f172a' }}>{user.membershipNumber || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '7px', color: '#64748b', display: 'block' }}>EXPIRES</span>
                      <strong style={{ fontSize: '8.5px', color: '#475569' }}>3 YEARS</strong>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div style={{ width: '70px', height: '70px', border: '1px solid #cbd5e1', background: '#ffffff', padding: '4px', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start' }}>
                  <span style={{ fontSize: '28px' }}>🏁</span>
                </div>
              </div>

              {/* Bottom bar */}
              <div style={{ background: '#0f172a', position: 'absolute', bottom: 0, width: '100%', height: '14px', display: 'flex', alignItems: 'center', paddingLeft: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '5.5px', fontWeight: 'bold' }}>
                  IF FOUND, RETURN TO ANY SKYWAVE AIRLINES DESK. SECURE CARD.
                </span>
              </div>
            </div>

            <button 
              className="glass-button" 
              onClick={handleDownloadCard} 
              style={{ width: '100%', maxWidth: '360px', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              📥 Download Card (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
