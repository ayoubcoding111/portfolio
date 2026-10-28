import { useEffect, useRef } from 'react';
import { PROJECTS } from '../content.js';

const play = (v) => { const p = v.play(); if (p && p.catch) { p.catch(() => {}); } };

/* The big shot of a card can be a video. With a mouse it plays while the card is hovered. On a touch screen it plays by
   itself, but only one at a time: the card closest to the middle of the screen. Reduced motion shows the poster only. */
function useProjectVideos(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    const vids = root ? Array.prototype.slice.call(root.querySelectorAll('video[data-reel]')) : [];
    if (!vids.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return undefined; }
    vids.forEach((v) => { v.muted = true; });
    const off = [];
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      vids.forEach((v) => {
        const media = v.closest('.pf-card__media');
        const on = () => play(v);
        const out = () => v.pause();
        media.addEventListener('pointerenter', on);
        media.addEventListener('pointerleave', out);
        off.push(() => { media.removeEventListener('pointerenter', on); media.removeEventListener('pointerleave', out); });
      });
    } else {
      let frame = 0;
      const pick = () => {
        frame = 0;
        const mid = window.innerHeight / 2;
        let best = null;
        let bestGap = Infinity;
        vids.forEach((v) => {
          const r = v.getBoundingClientRect();
          const seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
          const gap = Math.abs((r.top + r.bottom) / 2 - mid);
          if (seen > r.height * 0.5 && gap < bestGap) { best = v; bestGap = gap; }
        });
        vids.forEach((v) => { if (v === best) { if (v.paused) { play(v); } } else if (!v.paused) { v.pause(); } });
      };
      const queue = () => { if (!frame) { frame = requestAnimationFrame(pick); } };
      window.addEventListener('scroll', queue, { passive: true });
      window.addEventListener('resize', queue);
      queue();
      off.push(() => { window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); cancelAnimationFrame(frame); });
    }
    return () => { off.forEach((fn) => fn()); vids.forEach((v) => v.pause()); };
  }, [rootRef]);
}

const Shot = ({ media }) => (media.video
  ? <video data-reel="" src={media.video} poster={media.poster} aria-label={media.alt} muted loop playsInline preload="metadata"></video>
  : <img src={media.src} alt={media.alt} loading="lazy" decoding="async" />);

export default function Projects() {
  const listRef = useRef(null);
  useProjectVideos(listRef);
  return (
    <section className="pf-section pf-projects" id="projects" aria-labelledby="projects-title">
      <div className="pf-wrap">
        <div className="pf-projects__head">
          <h2 className="pf-h2" id="projects-title" data-split="">Selected projects</h2>
        </div>
        <ul className="pf-grid" ref={listRef}>
          {PROJECTS.map((p) => (
            <li className="pf-card" key={p.id}>
              <article className="pf-card__inner" aria-labelledby={p.id + '-title'}>
                <div className="pf-card__media" data-tilt="">
                  <div className="pf-card__stage" data-tilt-stage="">
                    <div className="pf-shot pf-shot--main"><div className="pf-chrome"><i></i><i></i><i></i>{p.url && <a className="pf-url" href={'https://' + p.url} target="_blank" rel="noopener noreferrer">{p.url}<span className="pf-sr"> (opens in a new tab)</span></a>}</div><div className="pf-card__ph pf-card__ph--media"><Shot media={p.main} /></div><span className="pf-glare" data-glare=""></span></div>
                    {p.details.map((d, i) => (
                      <div className={'pf-shot pf-shot--f' + (i + 1)} data-z={i ? '110' : '70'} key={d.src}><div className="pf-chrome"><i></i><i></i><i></i></div><div className="pf-card__ph pf-card__ph--media"><Shot media={d} /></div></div>
                    ))}
                  </div>
                </div>
                <div className="pf-card__body">
                  <h3 className="pf-card__title" id={p.id + '-title'}>{p.title}</h3>
                  <p className="pf-card__summary">{p.summary}</p>
                  <ul className="pf-card__stack" aria-label="Stack">{p.stack.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
