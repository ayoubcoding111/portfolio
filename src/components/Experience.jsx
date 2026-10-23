import { EXPERIENCE, EXPERIENCE_INTRO } from '../content.js';

const pad = (n) => String(n + 1).padStart(2, '0');

export default function Experience() {
  return (
    <section className="pf-section pf-exp pf-xp" id="experience" aria-labelledby="exp-title" data-xp>
      <div className="pf-xp__pin" data-xp-pin>
        <div className="pf-wrap pf-xp__wrap">
          <header className="pf-xp__head">
            <h2 className="pf-h2" id="exp-title" data-split="">Experience</h2>
            <p className="pf-xp__lede">{EXPERIENCE_INTRO}</p>
          </header>
          <div className="pf-xp__stage" data-xp-stage>
            <div className="pf-xp__glow" data-xp-glow aria-hidden="true"></div>
            <ol className="pf-xp__list">
              {EXPERIENCE.map((e, i) => (
                <li className="pf-xp__ch" key={i} data-xp-ch>
                  <span className="pf-xp__n" aria-hidden="true"><span className="pf-xp__ni" data-xp-n>{pad(i)}</span></span>
                  <div className="pf-xp__body">
                    <p className="pf-xp__eyebrow"><b>{e.beat}</b><span data-xp-when>{e.when}</span></p>
                    <h3 className="pf-xp__role" data-xp-role>{e.role}</h3>
                    <p className="pf-xp__desc" data-xp-desc>{e.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="pf-xp__rail" aria-hidden="true" data-xp-rail>
              <span className="pf-xp__fill" data-xp-fill></span>
              <ul>
                {EXPERIENCE.map((e, i) => (<li key={i} data-xp-tick><i></i>{pad(i)}</li>))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
