import { Fragment } from 'react';
import { FAQ, FAQ_INTRO, LINKS } from '../content.js';

const pad = (n) => String(n + 1).padStart(2, '0');

/* The strip loops by sliding half its width, so it holds an even number of copies, enough to overfill the widest row. */
const COPIES = 4;

/* Opening, closing and the hover band are wired in lib/motion.js (pfBindFaq). The band and its scrolling strip are
   decoration for mouse users, so screen readers skip them and get the question and its answer only. */
export default function Faq() {
  return (
    <section className="pf-section pf-faq" id="faq" aria-labelledby="faq-title">
      <div className="pf-wrap pf-faq__grid">
        <header className="pf-faq__head">
          <h2 className="pf-h2" id="faq-title" data-split="">Questions, answered.</h2>
          <p className="pf-faq__lede">{FAQ_INTRO}</p>
          <a className="pf-link pf-faq__ask" href={'mailto:' + LINKS.email}>Ask me directly<svg className="pf-ic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"></path></svg></a>
        </header>
        <ul className="pf-faq__list" data-faq="">
          {FAQ.map((f, i) => (
            <li className="pf-faq__item" key={f.id} data-faq-item="">
              <span className="pf-faq__rule" aria-hidden="true"></span>
              <div className="pf-faq__row" data-faq-row="">
                <h3 className="pf-faq__h">
                  <button className="pf-faq__q" type="button" id={f.id + '-q'} aria-expanded="false" aria-controls={f.id + '-a'} data-faq-q="">
                    <span className="pf-faq__k" aria-hidden="true">{pad(i)} · {f.label}</span>
                    <span className="pf-faq__text">{f.q}</span>
                    <span className="pf-faq__ic" aria-hidden="true"><svg className="pf-ic" viewBox="0 0 24 24" width="18" height="18" focusable="false"><path d="M12 5v14M5 12h14"></path></svg></span>
                  </button>
                </h3>
                <div className="pf-faq__band" aria-hidden="true" data-faq-band="">
                  <div className="pf-faq__track" data-faq-track="">
                    <div className="pf-faq__mq">
                      {Array.from({ length: COPIES }, (_, c) => f.tags.map((t, j) => (
                        <Fragment key={c + '-' + j}>
                          <span className="pf-faq__word">{t.word}</span>
                          <span className="pf-faq__pill"><svg viewBox="0 0 24 24" width="28" height="28" focusable="false" dangerouslySetInnerHTML={{ __html: t.icon }}></svg></span>
                        </Fragment>
                      )))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="pf-faq__a" id={f.id + '-a'} role="region" aria-labelledby={f.id + '-q'} data-faq-a="">
                <div className="pf-faq__a-in"><p>{f.a}</p></div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
