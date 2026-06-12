import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminAnalytics from './AdminAnalytics';
import AdminFlights from './AdminFlights';
import AdminBookings from './AdminBookings';
import AdminUsers from './AdminUsers';
import './AdminPortal.css';

export default function AdminDashboard() {
  const { user, token, syncProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'flights', 'bookings', 'users', 'profile'

  // Access control check
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px', border: '1px solid var(--error)' }}>
          <span style={{ fontSize: '48px' }}>🚫</span>
          <h3 style={{ margin: '16px 0 8px', color: 'var(--error)' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            You do not have administrative permissions to view this portal. Please log in with an admin account or contact system engineering.
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="container animate-fade-in">
      <div className="admin-container">
        
        {/* Portal Header */}
        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Airline Operations Command Center</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Welcome, <strong>{user.name}</strong> • System Role: <span className={`role-badge ${user.role}`}>{user.role}</span>
            </p>
          </div>
          {user.profilePicture && (
            <img 
              src={user.profilePicture} 
              alt="Avatar" 
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} 
            />
          )}
        </div>

        {/* Tab Links */}
        <div className="admin-header-tabs">
          <button 
            type="button" 
            className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Command Dashboard
          </button>
          <button 
            type="button" 
            className={`admin-tab ${activeTab === 'flights' ? 'active' : ''}`}
            onClick={() => setActiveTab('flights')}
          >
            ✈️ Manage Flights
          </button>
          <button 
            type="button" 
            className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📋 Passenger Bookings
          </button>
          {user.role === 'superadmin' && (
            <button 
              type="button" 
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 User Management
            </button>
          )}
          <button 
            type="button" 
            className={`admin-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 My Profile
          </button>
        </div>

        {/* Tab Subviews Content */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: activeTab === 'analytics' ? 'block' : 'none' }}>
            <AdminAnalytics activeTab={activeTab} />
          </div>
          <div style={{ display: activeTab === 'flights' ? 'block' : 'none' }}>
            <AdminFlights activeTab={activeTab} />
          </div>
          <div style={{ display: activeTab === 'bookings' ? 'block' : 'none' }}>
            <AdminBookings activeTab={activeTab} />
          </div>
          <div style={{ display: activeTab === 'users' ? 'block' : 'none' }}>
            <AdminUsers activeTab={activeTab} />
          </div>
          <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
            <div className="glass-card animate-fade-in" style={{ padding: '35px', maxWidth: '800px', margin: '20px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👤 Administrative Profile
                </h3>

                {/* Profile Picture */}
                <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '24px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
                    PROFILE AVATAR
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
                        <span style={{ fontSize: '10px', marginTop: '6px' }}>No Avatar</span>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
                        Upload a high-quality JPEG or PNG avatar for your administrative credentials (Max 2MB).
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12.5px', marginBottom: '4px' }}>Full Name</span>
                    <strong style={{ fontSize: '16px' }}>{user.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12.5px', marginBottom: '4px' }}>Email Address</span>
                    <strong style={{ fontSize: '16px' }}>{user.email}</strong>
                  </div>
                </div>
              </div>

              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>
                  🔑 Security & Role Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12.5px', marginBottom: '4px' }}>System Access Role</span>
                    <span className={`role-badge ${user.role}`} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      {user.role.toUpperCase()}
                    </span>
                  </div>
                  {user.employeeId && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12.5px', marginBottom: '4px' }}>Employee Identifier</span>
                      <strong style={{ color: 'var(--sky-gold)', fontSize: '15px' }}>{user.employeeId}</strong>
                    </div>
                  )}
                  {user.permissions && user.permissions.length > 0 && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12.5px', marginBottom: '6px' }}>Assigned Control Permissions</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {user.permissions.map(perm => (
                          <span key={perm} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', color: 'var(--sky-accent)' }}>
                            {perm.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12.5px', marginBottom: '4px' }}>Account Status</span>
                    <span style={{ color: '#00c853', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                      <span style={{ fontSize: '10px' }}>●</span> Active & Authorized
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
