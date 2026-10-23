import { SECTIONS, LINKS } from '../content.js';

/* The fixed nav and the full-screen mobile menu. Open/close, focus trapping and the active-section underline are wired in
   lib/motion.js, which owns the scroll engine they talk to. */
export default function Nav({ onToggleTheme, isDark }) {
  return (
    <>
      <header className="pf-nav">
        <div className="pf-nav__inner">
          <a className="pf-brand" href="#top">Ayoub</a>
          <nav className="pf-nav__links" aria-label="Main">
            <ul className="pf-nav__list">
              {SECTIONS.map((s) => <li key={s.id}><a href={'#' + s.id}>{s.label}</a></li>)}
            </ul>
          </nav>
          <div className="pf-nav__actions">
            <button className="pf-icon-btn" type="button" data-theme-toggle="" aria-pressed={isDark ? 'true' : 'false'} aria-label="Dark theme" onClick={onToggleTheme}>
              <svg className="pf-ic pf-ic--moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"></path></svg>
              <svg className="pf-ic pf-ic--sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"></path></svg>
            </button>
            <button className="pf-pill pf-menu-btn" type="button" data-menu-open="" aria-expanded="false" aria-controls="pf-menu">Menu</button>
          </div>
        </div>
        <div className="pf-progress" aria-hidden="true"><span></span></div>
      </header>

      <div className="pf-menu" id="pf-menu" data-open="false" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="pf-menu__panel">
          <div className="pf-menu__top">
            <span className="pf-brand" aria-hidden="true">Ayoub</span>
            <button className="pf-pill" type="button" data-menu-close="">Close</button>
          </div>
          <nav aria-label="Sections">
            <ul className="pf-menu__list">
              {SECTIONS.map((s) => <li key={s.id}><a href={'#' + s.id}>{s.label}</a></li>)}
            </ul>
          </nav>
          <ul className="pf-menu__meta">
            <li><a className="pf-link" href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub<span className="pf-sr"> (opens in a new tab)</span></a></li>
            <li><a className="pf-link" href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<span className="pf-sr"> (opens in a new tab)</span></a></li>
          </ul>
        </div>
      </div>
    </>
  );
}
