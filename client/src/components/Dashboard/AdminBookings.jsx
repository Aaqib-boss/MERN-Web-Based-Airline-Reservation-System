import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './AdminPortal.css';

export default function AdminBookings({ activeTab }) {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchBookings = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch('/api/admin/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBookings(data);
        } else {
          throw new Error('Failed to fetch bookings list');
        }
      } catch (err) {
        console.error(err);
        setError('Error loading bookings logs.');
      } finally {
        if (!silent) setLoading(false);
      }
    };
    if (token && activeTab === 'bookings') {
      const isInitial = bookings.length === 0;
      fetchBookings(!isInitial);
    }
  }, [token, activeTab]);

  const filteredBookings = bookings.filter(b => {
    const flight = b.flightIds[0] || {};
    const passengerList = b.passengers.map(p => p.name).join(', ');
    return (
      b.pnr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flight.flightNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flight.origin?.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flight.destination?.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      passengerList.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="animate-fade-in">
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Passenger Bookings Audit Log</h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <span className="animate-spin" style={{ fontSize: '24px' }}>🔄</span> Loading bookings...
        </div>
      ) : error ? (
        <div style={{ color: 'var(--error)', fontWeight: 'bold' }}>{error}</div>
      ) : bookings.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No booking records found in the database.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="text"
              className="glass-input"
              placeholder="🔍 Search bookings by PNR, flight number, airport code, traveler name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: '400px', padding: '10px 14px', fontSize: '13px' }}
            />
          </div>

          <div className="table-scrollbar-wrapper">
            <table className="admin-log-table">
              <thead>
                <tr>
                  <th>PNR</th>
                  <th>Flight</th>
                  <th>Route</th>
                  <th>Travelers</th>
                  <th>Seats</th>
                  <th>Total Paid</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No matching bookings found.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map(b => {
                    const flight = b.flightIds[0] || {};
                    const passengerList = b.passengers.map(p => p.name).join(', ');
                    const seatsList = b.passengers.map(p => p.seatNumber).join(', ');
                    
                    return (
                      <tr key={b._id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', color: 'var(--sky-accent)' }}>{b.pnr}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{flight.flightNumber || 'N/A'}</td>
                        <td>
                          <strong>{flight.origin?.code || 'N/A'} ➔ {flight.destination?.code || 'N/A'}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {flight.stops && flight.stops.length > 0 ? (
                              <span style={{ color: 'var(--sky-gold)' }}>Touch ({flight.stops[0].city})</span>
                            ) : (
                              <span style={{ color: 'var(--success)' }}>Direct</span>
                            )}
                          </div>
                        </td>
                        <td title={passengerList} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {passengerList}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{seatsList}</td>
                        <td style={{ color: 'var(--success)', fontWeight: '700' }}>₹{b.totalAmount.toLocaleString('en-IN')}</td>
                        <td>
                          <span className="status-badge" style={{ 
                            color: b.status === 'confirmed' ? 'var(--success)' : 'var(--error)',
                            border: `1px solid ${b.status === 'confirmed' ? 'var(--success)' : 'var(--error)'}`,
                            background: 'rgba(255,255,255,0.03)'
                          }}>
                            {b.status}
                          </span>
                        </td>
                        <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
