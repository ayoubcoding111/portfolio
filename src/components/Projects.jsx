import { PROJECTS } from '../content.js';

const Ext = () => (
  <svg className="pf-ic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"></path></svg>
);

export default function Projects() {
  return (
    <section className="pf-section pf-projects" id="projects" aria-labelledby="projects-title">
      <div className="pf-wrap">
        <div className="pf-projects__head">
          <h2 className="pf-h2" id="projects-title" data-split="">Selected projects</h2>
        </div>
        <ul className="pf-grid">
          {PROJECTS.map((p) => (
            <li className="pf-card" key={p.id}>
              <article className="pf-card__inner" aria-labelledby={p.id + '-title'}>
                {/* Swap each [Screenshot] and [Detail] box for an <img loading="lazy"> of your project. */}
                <div className="pf-card__media" data-tilt="">
                  <div className="pf-card__stage" data-tilt-stage="">
                    <div className="pf-shot pf-shot--main"><div className="pf-chrome"><i></i><i></i><i></i><span className="pf-url">[project-url]</span></div><div className="pf-card__ph"><span className="pf-card__ph-label">[Screenshot, 16:10]</span></div><span className="pf-glare" data-glare=""></span></div>
                    <div className="pf-shot pf-shot--f1" data-z="70"><div className="pf-chrome"><i></i><i></i><i></i></div><div className="pf-card__ph"><span className="pf-card__ph-label">[Detail]</span></div></div>
                    <div className="pf-shot pf-shot--f2" data-z="110"><div className="pf-chrome"><i></i><i></i><i></i></div><div className="pf-card__ph"><span className="pf-card__ph-label">[Detail]</span></div></div>
                  </div>
                </div>
                <div className="pf-card__body">
                  <p className="pf-tag">{p.tag}</p>
                  <h3 className="pf-card__title" id={p.id + '-title'}>{p.title}</h3>
                  <p className="pf-card__summary">{p.summary}</p>
                  <ul className="pf-card__stack" aria-label="Stack">{p.stack.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  <div className="pf-card__links">
                    <a className="pf-link" href={p.demo} target="_blank" rel="noopener noreferrer">Live demo<span className="pf-sr"> of {p.srName} (opens in a new tab)</span><Ext /></a>
                    <a className="pf-link" href={p.repo} target="_blank" rel="noopener noreferrer">GitHub<span className="pf-sr"> repository for {p.srName} (opens in a new tab)</span><Ext /></a>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
