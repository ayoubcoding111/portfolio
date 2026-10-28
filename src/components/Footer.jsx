import { LINKS, SECTIONS } from '../content.js';
import { SITE } from '../config.js';

export default function Footer() {
  return (
    <footer className="pf-hwf" data-hwf="">
      <div className="pf-wrap pf-hwf-top">
        <div className="pf-hwf-brand">
          <strong><span className="pf-pulse" aria-hidden="true"></span>Ayoub</strong>
          <span>©{new Date().getFullYear()} · Full-stack developer</span>
          <span>Algeria · Working worldwide</span>
        </div>
        <nav className="pf-hwf-col" aria-label="Explore">
          <h3>Explore</h3>
          <ul>{SECTIONS.map((s) => <li key={s.id}><a href={'#' + s.id}>{s.label}</a></li>)}</ul>
        </nav>
        <nav className="pf-hwf-col" aria-label="Layers">
          <h3>Layers</h3>
          <ul>
            <li><a href="#skills">Frontend</a></li>
            <li><a href="#skills">Backend</a></li>
            <li><a href="#skills">Databases</a></li>
            <li><a href="#skills">DevOps</a></li>
          </ul>
        </nav>
        <nav className="pf-hwf-col" aria-label="Contact links">
          <h3>Contact</h3>
          <ul>
            <li><a href={'mailto:' + LINKS.email}>Email</a></li>
            <li><a href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub<span className="pf-sr"> (opens in a new tab)</span></a></li>
            <li><a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<span className="pf-sr"> (opens in a new tab)</span></a></li>
          </ul>
        </nav>
      </div>
      <div className="pf-wrap">
        <div className="pf-hwf-rule">
          <span>Local time <b data-clock="">--:--:--</b> · {SITE.timeZoneLabel}</span>
          <a href="#top" className="pf-hwf-up"><span>Back to top</span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5"></path><path d="m6 11 6-6 6 6"></path></svg></a>
        </div>
      </div>
      <div className="pf-hwf-stage" data-hwf-stage=""><canvas className="pf-hwf-canvas" data-hwf-canvas="" aria-hidden="true"></canvas></div>
      <div className="pf-hwf-grain" data-hwf-grain="" aria-hidden="true"></div>
    </footer>
  );
}
