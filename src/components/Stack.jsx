import { useEffect, useMemo, useRef, useState } from 'react';
import { STACK } from '../content.js';
import { SITE } from '../config.js';
import { createKeyboard, hexToLinear } from '../lib/keyboard.js';

/* The Stack: a 3D keyboard of the tools I use (lib/keyboard.js). Hover a key to press it; click, Enter or Space sends a
   ripple across the board. The readout underneath names the key. Without WebGL2 the same tools show as a plain list. */

const pad = (n) => String(n).padStart(2, '0');

function ToolIcon({ tool }) {
  if (!tool.path) { return <span className="pf-kb__chip-text" aria-hidden="true">{tool.short}</span>; }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" style={{ fill: '#' + tool.hex }}>
      <path d={tool.path}></path>
    </svg>
  );
}

export default function Stack({ theme }) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const boardRef = useRef(null);
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState(false);

  // What the engine needs per key: the logo, its colour, and that colour in linear RGB for the press light
  // (near-black brands like GitHub light in the site's accent instead).
  const keys = useMemo(() => STACK.map((t) => {
    const glow = hexToLinear(t.hex, [0, 0, 0]);
    const dark = 0.2126 * glow[0] + 0.7152 * glow[1] + 0.0722 * glow[2] < 0.02;
    return { ...t, dark, glow: dark ? hexToLinear(SITE.accent, [0.02, 0.06, 1]) : glow };
  }), []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const board = createKeyboard(stageRef.current, canvasRef.current, {
      keys,
      light: theme === 'light',
      reduced,
      onHover: (i) => setActive(i)
    });
    if (!board) { setFailed(true); return undefined; }
    boardRef.current = board;
    return () => { board.destroy(); boardRef.current = null; };
    // The board is built once; theme changes go through setTheme below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  useEffect(() => { if (boardRef.current) { boardRef.current.setTheme(theme === 'light'); } }, [theme]);

  const tool = active >= 0 ? keys[active] : null;

  return (
    <section className="pf-section pf-kb" id="stack" aria-labelledby="stack-title">
      <div className="pf-wrap">
        <div className="pf-kb__head">
          <h2 className="pf-h2" id="stack-title" data-split="">The Stack</h2>
          <p className="pf-kb__lede">The tools I reach for every day, from the first commit to production. Hover a key to press it.</p>
        </div>

        {failed ? (
          <ul className="pf-kb__list" aria-label="Tools">
            {STACK.map((t) => <li className="pf-chip pf-kb__chip" key={t.name}><ToolIcon tool={t} />{t.name}</li>)}
          </ul>
        ) : (
          <>
            <div
              className="pf-kb__stage"
              ref={stageRef}
              tabIndex={0}
              role="application"
              aria-roledescription="keyboard"
              aria-label="A keyboard of the tools I use. Use the arrow keys to move between keys, Enter to press, or type a tool's first letter."
            >
              <canvas className="pf-kb__canvas" ref={canvasRef} aria-hidden="true"></canvas>
              {/* The hovered key's name and line, top left of the keyboard. Keyed by tool, so each change replays the
                  entrance: the name rises out of a mask, the colour bar draws, the line follows. */}
              <div className="pf-kb__info" aria-live="polite">
                {tool ? (
                  <div className="pf-kb__card" key={tool.name} style={{ '--kb-c': tool.dark ? 'var(--ink)' : '#' + tool.hex }}>
                    <span className="pf-kb__meta" aria-hidden="true"><span className="pf-kb__bar"></span>{pad(active + 1)} / {pad(STACK.length)}</span>
                    <span className="pf-kb__mask"><b className="pf-kb__title">{tool.name}</b></span>
                    <p className="pf-kb__desc">{tool.desc}</p>
                  </div>
                ) : (
                  <p className="pf-kb__hint" key="hint">{pad(STACK.length)} tools · hover a key</p>
                )}
              </div>
            </div>
            <ul className="pf-sr">{STACK.map((t) => <li key={t.name}>{t.name}: {t.desc}</li>)}</ul>
          </>
        )}
      </div>
    </section>
  );
}
