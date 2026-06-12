import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import './AdminPortal.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminAnalytics({ activeTab }) {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch('/api/admin/analytics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        } else {
          throw new Error('Failed to load system analytics');
        }
      } catch (err) {
        console.error(err);
        setError('Error loading dashboard analytics.');
      } finally {
        if (!silent) setLoading(false);
      }
    };
    if (token && activeTab === 'analytics') {
      const isInitial = analytics === null;
      fetchAnalytics(!isInitial);
    }
  }, [token, activeTab]);

  if (loading && !analytics) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <span className="animate-spin" style={{ fontSize: '24px' }}>🔄</span> Loading analytics...
      </div>
    );
  }

  if (error || !analytics) {
    return <div style={{ color: 'var(--error)', padding: '20px', fontWeight: 'bold' }}>{error || 'No data available'}</div>;
  }

  const { summary, charts } = analytics;

  // Chart 1: Revenue Timeline (Line Chart)
  const lineChartData = {
    labels: charts.timeline.labels,
    datasets: [
      {
        label: 'Monthly Revenue (₹)',
        data: charts.timeline.revenue,
        borderColor: '#00BFFF',
        backgroundColor: 'rgba(0, 191, 255, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#E2E8F0',
          font: { family: 'Outfit, sans-serif', size: 11, weight: '500' }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#A0AEC0', font: { family: 'Outfit, sans-serif' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#A0AEC0', font: { family: 'Outfit, sans-serif' } }
      }
    }
  };

  // Chart 2: Cabin class revenue share (Pie Chart)
  const pieChartData = {
    labels: charts.classSplit.labels,
    datasets: [
      {
        data: charts.classSplit.data,
        backgroundColor: ['#A0AEC0', '#0066CC', '#FFB800'],
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#E2E8F0',
          font: { family: 'Outfit, sans-serif', size: 11, weight: '500' },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    }
  };

  const hasRevenueData = charts.classSplit.data.some(val => val > 0);

  // Chart 3: Flight statuses horizontal bar chart
  const barChartData = {
    labels: Object.keys(charts.statuses).map(s => s.toUpperCase()),
    datasets: [
      {
        label: 'Active Flights Count',
        data: Object.values(charts.statuses),
        backgroundColor: 'rgba(0, 102, 204, 0.6)',
        borderColor: '#0066CC',
        borderWidth: 1
      }
    ]
  };

  const barChartOptions = {
    indexAxis: 'y', // Horizontal bar
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { 
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#A0AEC0', font: { family: 'Outfit, sans-serif' } }
      },
      y: { 
        grid: { display: false },
        ticks: { color: '#A0AEC0', font: { family: 'Outfit, sans-serif' } }
      }
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 5-Column Stats Cards Grid */}
      <div className="stats-cards-grid">
        <div className="stat-metric-card glass-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            ₹{summary.totalRevenue.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="stat-metric-card glass-card">
          <div className="stat-label">Active Bookings</div>
          <div className="stat-value">{summary.activeBookings}</div>
        </div>
        <div className="stat-metric-card glass-card">
          <div className="stat-label">Flights Logged</div>
          <div className="stat-value">{summary.totalFlights}</div>
        </div>
        <div className="stat-metric-card glass-card">
          <div className="stat-label">Traveler Accounts</div>
          <div className="stat-value">{summary.totalUsers}</div>
        </div>
        <div className="stat-metric-card glass-card">
          <div className="stat-label">Seat Occupancy</div>
          <div className="stat-value" style={{ color: 'var(--sky-accent)' }}>
            {summary.overallOccupancyPercentage}%
          </div>
        </div>
      </div>

      {/* Grid for timeline line charts and class split pie charts */}
      <div className="charts-grid-layout" style={{ marginTop: '24px' }}>
        <div className="chart-card-wrapper glass-card">
          <div className="chart-title">📈 Sales Growth Trends</div>
          <div className="chart-canvas-container">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        <div className="chart-card-wrapper glass-card">
          <div className="chart-title">🍕 Revenue Share by Cabin Class</div>
          <div className="chart-canvas-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '220px' }}>
            {hasRevenueData ? (
              <div style={{ maxWidth: '220px', margin: '0 auto', width: '100%', height: '100%' }}>
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '20px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>🥧</div>
                <div style={{ fontWeight: 'bold', color: '#ffffff', marginBottom: '4px' }}>No Revenue Data</div>
                <div>Bookings will generate cabin metrics.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status counts bar chart */}
      <div className="chart-card-wrapper glass-card" style={{ marginTop: '24px' }}>
        <div className="chart-title">📊 Operational Flights Status Distribution</div>
        <div className="chart-canvas-container" style={{ maxHeight: '200px' }}>
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </div>
    </div>
  );
}
