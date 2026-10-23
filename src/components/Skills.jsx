import { LAYERS, SKILLS } from '../content.js';

/* Skills: the four layers of the stack as brushed metal in three.js (lib/layers.js). On large screens lib/motion.js pins
   the section and tells a story with it: one click, followed down through every layer and back, chapter by chapter,
   ending on the whole stack labelled like an exploded diagram. The chapters are decoration for that story, so they are
   hidden from screen readers; the list underneath carries the same content for everyone (and is what shows on small
   screens, or without WebGL). */
export default function Skills() {
  return (
    <section className="pf-section pf-lx" id="skills" aria-labelledby="skills-title">
      <div className="pf-lx__pin" data-lx-pin="">
        <div className="pf-wrap pf-lx__head">
          <h2 className="pf-h2 pf-lx__title" id="skills-title" data-lx-title="">{SKILLS.title}</h2>
          <p className="pf-lx__intro" data-lx-intro="">{SKILLS.intro}</p>
        </div>

        <div className="pf-lx__stage" data-lx-stage="">
          <canvas className="pf-lx__canvas" data-lx-canvas="" aria-hidden="true"></canvas>
          <div className="pf-lx__story" aria-hidden="true">
            {LAYERS.map((l, i) => (
              <div className={'pf-lx__ch ' + (i % 2 ? 'pf-lx__ch--r' : 'pf-lx__ch--l')} data-lx-ch="" key={l.idx}>
                <p className="pf-lx__eyebrow"><b>{l.idx}</b>{l.title}</p>
                <p className="pf-lx__line" data-lx-line="">{l.story}</p>
                <p className="pf-lx__ctext">{l.text}</p>
                <ul className="pf-chips">{l.tools.map((t) => <li className="pf-chip" key={t}>{t}</li>)}</ul>
              </div>
            ))}
            <div className="pf-lx__ch pf-lx__ch--r pf-lx__outro" data-lx-outro="">
              <p className="pf-lx__line" data-lx-line="">{SKILLS.outro}</p>
            </div>
            <svg className="pf-lx__leaders">
              {LAYERS.map((l) => (
                <g key={l.idx}>
                  <line className="pf-lx__leg" data-lx-leg=""></line>
                  <circle className="pf-lx__dot" data-lx-dot="" r="3.5"></circle>
                </g>
              ))}
            </svg>
            <ol className="pf-lx__labels">
              {LAYERS.map((l) => (
                <li className="pf-lx__label" data-lx-label="" key={l.idx}>
                  <span className="pf-lx__lab" data-lx-lab=""><span className="pf-lx__lidx">{l.idx}</span><span className="pf-lx__lname">{l.title}</span></span>
                </li>
              ))}
            </ol>
            <div className="pf-lx__cursor" data-lx-cursor=""><span className="pf-lx__click" data-lx-click=""></span></div>
            <ol className="pf-lx__rail">{LAYERS.map((l) => <li data-lx-step="" key={l.idx}>{l.title}</li>)}</ol>
          </div>
        </div>

        <div className="pf-wrap">
          <ol className="pf-lx__list">
            {LAYERS.map((l) => (
              <li className="pf-lx__item" data-lx-item="" key={l.idx}>
                <div className="pf-lx__ihead"><span className="pf-lx__iidx">{l.idx}</span><h3 className="pf-lx__ititle">{l.title}</h3><span className="pf-lx__ikicker">{l.kicker}</span></div>
                <p className="pf-lx__itext">{l.text}</p>
                <ul className="pf-chips" aria-label={l.label}>{l.tools.map((t) => <li className="pf-chip" key={t}>{t}</li>)}</ul>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
