import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Attempt to refresh access token on startup
  useEffect(() => {
    const resumeSession = async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.accessToken);
          
          // Fetch user profile or decode token
          // Since the server login returns the full profile, let's load it
          // We can call a /me route or get it from a verify query.
          // Let's implement a quick fetch for profile or decodes.
          // We'll write a profile service later, but let's parse from token payload or load it.
          // For simplicity, we can decode JWT payload for user info:
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          
          // Fetch detailed profile
          const profileRes = await fetch(`/api/users/profile`, {
            headers: { 'Authorization': `Bearer ${data.accessToken}` }
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            
            // Check port authorization on startup
            const port = window.location.port;
            if (port === '3003' && profileData.role !== 'admin') {
              console.warn('Session mismatch: Operations Admin portal requires admin role.');
              setUser(null);
              setToken(null);
            } else if (port === '3004' && profileData.role !== 'superadmin') {
              console.warn('Session mismatch: Super Admin portal requires superadmin role.');
              setUser(null);
              setToken(null);
            } else if (port === '3002' && profileData.role !== 'user') {
              console.warn('Session mismatch: Traveler portal requires user role.');
              setUser(null);
              setToken(null);
            } else {
              setUser(profileData);
            }
          } else {
            // Fallback to minimal info from payload if it matches port role criteria
            const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
            const port = window.location.port;
            // Note: payload doesn't contain role usually unless we put it. But we put it in the seed. Let's assume verification via /profile is the source of truth.
            // If profile cannot be loaded, we clear session.
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.log('No active session found on startup');
      } finally {
        setLoading(false);
      }
    };
    resumeSession();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }

    const data = await res.json();
    const port = window.location.port;

    // Enforce port role restrictions on login
    if (port === '3003' && data.role !== 'admin') {
      throw new Error('Access denied. This portal is reserved for Operations Admins on port 3003.');
    }
    if (port === '3004' && data.role !== 'superadmin') {
      throw new Error('Access denied. This portal is reserved for Super Admins on port 3004.');
    }
    if (port === '3002' && data.role !== 'user') {
      throw new Error('Access denied. Admins must log in through their respective portals on ports 3003/3004.');
    }

    setUser({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      loyaltyTier: data.loyaltyTier,
      loyaltyPoints: data.loyaltyPoints,
      passportNumber: data.passportNumber,
      nationality: data.nationality,
      dateOfBirth: data.dateOfBirth
    });
    setToken(data.accessToken);
    return data;
  };

  const register = async (userData) => {
    const port = window.location.port;
    if (port === '3004') {
      throw new Error('Access denied. Administrative accounts cannot be registered publicly.');
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Registration failed');
    }

    const data = await res.json();
    if (data.status === 'pending') {
      return data;
    }

    setUser({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      loyaltyTier: data.loyaltyTier,
      loyaltyPoints: data.loyaltyPoints,
      passportNumber: data.passportNumber,
      nationality: data.nationality,
      dateOfBirth: data.dateOfBirth
    });
    setToken(data.accessToken);
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    setUser(null);
    setToken(null);
  };

  // Sync profile details manually (e.g., after booking points added)
  const syncProfile = async (accessToken = token) => {
    if (!accessToken) return;
    try {
      const profileRes = await fetch(`/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData);
      }
    } catch (err) {
      console.error('Profile sync failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, syncProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { AuthContext };
