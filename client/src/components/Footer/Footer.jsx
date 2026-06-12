import React, { useState, useEffect } from 'react';
import './Footer.css';
import { useAuth } from '../../hooks/useAuth';

export default function Footer() {
  const { user } = useAuth();
  const [socials, setSocials] = useState({
    socialLinks: [
      { platform: 'whatsapp', url: '0774311051' },
      { platform: 'instagram', url: 'https://instagram.com/skywave' },
      { platform: 'x', url: 'https://x.com/skywave' },
      { platform: 'facebook', url: 'https://facebook.com/skywave' },
      { platform: 'tiktok', url: 'https://web.tiktok.com/skywave?_rdc=1&_rdr#' }
    ],
    isAlwaysOpen: false,
    address: '25st Lazarus road, Periyamulla, Negombo',
    phone: '+94 77 431 1051',
    email: 'support@skywave.com',
    branches: ['Colombo', 'Wattala', 'Negombo', 'Jaffna', 'Kandy'],
    workingHoursMonSat: '8:00 AM - 6:00 PM',
    workingHoursSun: 'Closed',
    mapUrl: 'https://maps.google.com/?q=25st+Lazarus+road,+Periyamulla,+Negombo',
    description: 'Your premium global aviation partner, delivering exceptional travel experiences with real-time seat locks and intelligent flight scoring.'
  });

  useEffect(() => {
    const fetchFooterSocials = async () => {
      try {
        const res = await fetch(`/api/config/footer?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          console.log("FOOTER SOCIALS DATA FETCHED:", data);
          setSocials(data);
        }
      } catch (err) {
        console.error('Failed to load footer configurations:', err);
      }
    };
    fetchFooterSocials();
  }, []);

  // Formats WhatsApp number/link to a direct wa.me link
  const getWhatsAppLink = (input) => {
    if (!input) return '#';
    // If it's already a full link, return it
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
    // Clean and check Sri Lankan mobile number
    let cleaned = input.replace(/\D/g, ''); // digit only
    if (cleaned.startsWith('0')) {
      cleaned = '94' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      cleaned = '94' + cleaned;
    }
    
    let text = "Hello SkyWave Airlines! I have an inquiry.";
    if (user) {
      text = `Hello SkyWave Airlines! I am logged in as ${user.name} (${user.email}). I have an inquiry about my account or bookings.`;
    }
    
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
  };

  const renderSocialIcon = (link, index) => {
    const { platform, url } = link;
    console.log("FOOTER ICON RENDER:", platform, url);
    if (!url) return null;

    let iconSvg = null;
    let className = `social-icon ${platform}`;
    let title = platform.toUpperCase();
    let href = url;

    switch (platform) {
      case 'whatsapp':
        href = getWhatsAppLink(url);
        title = 'WhatsApp';
        iconSvg = (
          <svg viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
          </svg>
        );
        break;
      case 'instagram':
        title = 'Instagram';
        iconSvg = (
          <svg viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
        );
        break;
      case 'x':
        title = 'X (Twitter)';
        iconSvg = (
          <svg viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
        break;
      case 'facebook':
        title = 'Facebook';
        iconSvg = (
          <svg viewBox="0 0 24 24">
            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
          </svg>
        );
        break;
      case 'linkedin':
        title = 'LinkedIn';
        iconSvg = (
          <svg viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37z"/>
          </svg>
        );
        break;
      case 'youtube':
        title = 'YouTube';
        iconSvg = (
          <svg viewBox="0 0 24 24">
            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        );
        break;
      case 'tiktok':
        title = 'TikTok';
        iconSvg = (
          <svg viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.99-1.72-.04 3.31-.02 6.61-.04 9.92-.04 2.15-.79 4.39-2.5 5.74-1.61 1.34-3.87 1.83-5.96 1.48-2.6-.33-4.9-2.31-5.46-4.89-.72-2.94.48-6.29 2.98-7.79 1.35-.84 2.97-1.12 4.51-.9v3.98c-.99-.21-2.07-.06-2.92.51-1.07.69-1.57 2.07-1.24 3.3.29 1.25 1.5 2.19 2.78 2.13 1.31.02 2.5-1 2.59-2.3.06-3.61.02-7.21.04-10.82-.01-.01 0 0 0 0z"/>
          </svg>
        );
        break;
      case 'pinterest':
        title = 'Pinterest';
        iconSvg = (
          <svg viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.63 11.17-.1-.95-.19-2.42.04-3.46.21-.93 1.35-5.71 1.35-5.71s-.34-.69-.34-1.71c0-1.6 1.13-2.8 2.08-2.8.99 0 1.47.74 1.47 1.63 0 .99-.63 2.47-.96 3.84-.27 1.16.58 2.1 1.73 2.1 2.08 0 3.68-2.19 3.68-5.35 0-2.8-2.01-4.75-4.88-4.75-3.32 0-5.27 2.49-5.27 5.06 0 1 .39 2.08.88 2.68.1.12.11.23.08.35-.09.37-.29 1.18-.33 1.34-.05.22-.18.27-.41.16-1.54-.72-2.5-2.98-2.5-4.8 0-3.91 2.84-7.5 8.19-7.5 4.3 0 7.64 3.07 7.64 7.16 0 4.28-2.69 7.72-6.43 7.72-1.26 0-2.44-.65-2.84-1.43 0 0-.62 2.37-.77 2.96-.28 1.07-1.03 2.41-1.54 3.24C9.58 23.78 10.77 24 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z"/>
          </svg>
        );
        break;
      default:
        return null;
    }

    return (
      <a key={index} href={href} target="_blank" rel="noopener noreferrer" className={className} title={title}>
        {iconSvg}
      </a>
    );
  };

  return (
    <footer className="premium-footer">
      <div className="container footer-grid">
        {/* Branding Column */}
        <div className="footer-col branding-col">
          <div className="footer-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" className="logo-icon-svg" style={{ width: '28px', height: '28px', transform: 'rotate(-45deg)', display: 'inline-block', marginRight: '6px', color: 'var(--sky-gold)' }}>
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5z"/>
            </svg>
            <span className="logo-text">SkyWave Airlines</span>
          </div>
          <p className="footer-desc">
            {socials.description}
          </p>
          <div className="social-links">
            {Array.isArray(socials.socialLinks) && socials.socialLinks.map((link, index) => renderSocialIcon(link, index))}
          </div>
        </div>

        {/* Contact & Location Column */}
        <div className="footer-col contact-col">
          <h4 className="footer-title">Contact & Location</h4>
          <div className="contact-details">
            <p className="contact-item">
              <span className="contact-label">Address:</span>
              <span className="contact-value">{socials.address}</span>
            </p>
            <p className="contact-item">
              <span className="contact-label">Phone:</span>
              <a href={`tel:${socials.phone.replace(/\s+/g, '')}`} className="contact-value link-hover">{socials.phone}</a>
            </p>
            <p className="contact-item">
              <span className="contact-label">Email:</span>
              <a href={`mailto:${socials.email}`} className="contact-value link-hover">{socials.email}</a>
            </p>
          </div>
        </div>

        {/* Our Branches Column */}
        <div className="footer-col branches-col">
          <h4 className="footer-title">Our Branches</h4>
          <ul className="branches-list">
            {Array.isArray(socials.branches) && socials.branches.map(branch => (
              <li key={branch}>{branch}</li>
            ))}
          </ul>
        </div>

        {/* Working Hours & Maps Column */}
        <div className="footer-col hours-col">
          <h4 className="footer-title">Working Hours</h4>
          <div className="hours-details">
            {socials.isAlwaysOpen ? (
              <p className="hours-item" style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--sky-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🕒</span> 24 Hours & 7 Days
              </p>
            ) : (
              <>
                <p className="hours-item">
                  <span className="hours-label">Mon - Sat:</span>
                  <span className="hours-value">{socials.workingHoursMonSat}</span>
                </p>
                <p className="hours-item">
                  <span className="hours-label">Sunday:</span>
                  <span className="hours-value">{socials.workingHoursSun}</span>
                </p>
              </>
            )}
          </div>

          {/* Premium Google Map Card Mock */}
          <div className="map-card-wrapper">
            <div className="map-card-bg">
              {/* Stylized vector map grid background */}
              <div className="map-grid-overlay"></div>
              <div className="map-pin">📍</div>
            </div>
            
            <div className="map-card-content">
              <a href={socials.mapUrl} target="_blank" rel="noopener noreferrer" className="map-btn">
                Maps ↗
              </a>
              <div className="map-shortcuts">Keyboard shortcuts</div>
              <div className="map-copyright">Map data ©2026</div>
              <div className="map-report-error">Report a map error</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
