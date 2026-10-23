import { GLYPHS } from '../lib/glyphs.js';

/* Each letter's slice of the word, as laid out on the canvas: viewBox and its left/width share of the name box. */
const LETTERS = [
  { vb: '8 -700 938 712', left: '0%', width: '20.5252%' },
  { vb: '819 -700 932 712', left: '17.7462%', width: '20.3939%' },
  { vb: '1761 -700 918 712', left: '38.3589%', width: '20.0875%' },
  { vb: '2786 -700 841 712', left: '60.7877%', width: '18.4026%' },
  { vb: '3763 -700 815 712', left: '82.1663%', width: '17.8337%' }
];

const ArrowRight = ({ cls }) => (
  <svg className={cls} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>
);
const ArrowDiag = ({ cls }) => (
  <svg className={cls} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"></path><path d="M8 7h9v9"></path></svg>
);

export default function Hero() {
  return (
    <section className="pf-hero" id="top" aria-labelledby="hero-name">
      <canvas className="pf-gl" data-gl="" aria-hidden="true"></canvas>
      <div className="pf-hero__shade" aria-hidden="true"></div>
      <div className="pf-wrap pf-hero__inner">
        <p className="pf-hero__role">Full-Stack Engineer</p>
        <h1 className="pf-name" id="hero-name">
          <span className="pf-sr">Ayoub</span>
          <span className="pf-name__drift" aria-hidden="true">
            <span className="pf-name__word">
              {LETTERS.map((l, i) => (
                <svg key={i} className="pf-hn-o pf-hn-l" data-hn-letter="" viewBox={l.vb} preserveAspectRatio="none" focusable="false" style={{ left: l.left, width: l.width }}><use href={'#hg-l1-' + i}></use></svg>
              ))}
            </span>
            <span className="pf-name__glow"><svg className="pf-hn-glw" data-hn-glow="" viewBox="-392 -1100 5370 1512" preserveAspectRatio="none" focusable="false">{GLYPHS.map((g) => <use key={g.id} href={'#hg-l1-' + g.id}></use>)}</svg></span>
          </span>
        </h1>
        <svg className="pf-hn-defs" width="0" height="0" aria-hidden="true" focusable="false">
          <defs>{GLYPHS.map((g) => <path key={g.id} id={'hg-l1-' + g.id} d={g.d} vectorEffect="non-scaling-stroke"></path>)}</defs>
        </svg>
        <div className="pf-hero__foot">
          <p className="pf-hero__lede">I build web products end to end, from the interface you touch to the systems you never see.</p>
          <div className="pf-hero__ctas">
            <span className="pf-magnet" data-magnetic=""><a className="pf-btn pf-btn--primary pf-btn--icon" href="#projects"><span>View projects</span><span className="pf-btn-icon" aria-hidden="true"><ArrowRight cls="i1" /><ArrowRight cls="i2" /></span></a></span>
            <span className="pf-magnet" data-magnetic=""><a className="pf-btn pf-btn--ghost pf-btn--icon" href="#contact"><span>Contact me</span><span className="pf-btn-icon diag" aria-hidden="true"><ArrowDiag cls="i1" /><ArrowDiag cls="i2" /></span></a></span>
          </div>
        </div>
      </div>
    </section>
  );
}
