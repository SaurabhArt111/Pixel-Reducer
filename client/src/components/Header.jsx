import { NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="topbar">
      <NavLink to="/" className="wordmark">
        <span className="mark">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 17 9 8l4 6 2.5-4L20 17H4Z" fill="#1a0d08" />
          </svg>
        </span>
        <span className="name">
          PIXEL REDUCER
          <span className="sub">BATCH IMAGE RESIZER</span>
        </span>
      </NavLink>
      <nav className="topnav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Home
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>
          History
        </NavLink>
      </nav>
    </header>
  );
}
