import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useJob } from '../context/JobContext';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <path d="M4 11 12 4l8 7M6 9.5V19a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1V9.5" />
    )
  },
  {
    to: '/history',
    label: 'History',
    icon: <path d="M12 8v5l3 2M21 12a9 9 0 1 1-9-9" />
  },
  {
    to: '/storage',
    label: 'Storage',
    icon: <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
  }
];

function Wordmark() {
  return (
    <div className="wordmark">
      <span className="mark">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 17 9 8l4 6 2.5-4L20 17H4Z" fill="#1a0d08" />
        </svg>
      </span>
      <span className="name">
        PIXEL REDUCER
        <span className="sub">BATCH IMAGE RESIZER</span>
      </span>
    </div>
  );
}

function StatusBadge() {
  const { phase } = useJob();
  if (phase === 'empty') return null;

  const label = { staged: 'Ready to process', processing: 'Processing…', completed: 'Completed' }[phase];
  const dotClass = phase === 'processing' ? 'pulse-dot' : '';

  return (
    <div className="sidebar-status">
      {phase === 'processing' && <span className={dotClass} />}
      <span>{label}</span>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="topbar-mobile">
        <Wordmark />
        <button
          className="hamburger"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar-rail ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Wordmark />
          <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <StatusBadge />
          <span className="sidebar-footer-note">v1.0</span>
        </div>
      </aside>
    </>
  );
}
