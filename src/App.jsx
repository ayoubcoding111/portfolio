import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { SITE } from './config.js';
import { PortfolioMotion } from './lib/motion.js';
import Loader from './components/Loader.jsx';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import About from './components/About.jsx';
import Skills from './components/Skills.jsx';
import Stack from './components/Stack.jsx';
import Projects from './components/Projects.jsx';
import Faq from './components/Faq.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';

function useSystemDark() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return dark;
}

export default function App() {
  const rootRef = useRef(null);
  const motionRef = useRef(null);
  const [theme, setTheme] = useState(SITE.theme);
  const systemDark = useSystemDark();
  const effective = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useLayoutEffect(() => {
    const motion = new PortfolioMotion(rootRef.current, SITE);
    motionRef.current = motion;
    return () => { motion.destroy(); motionRef.current = null; };
  }, []);

  useEffect(() => { if (motionRef.current) { motionRef.current.syncTheme(); } }, [effective]);

  const onToggleTheme = (e) => {
    const motion = motionRef.current;
    const commit = (next) => flushSync(() => setTheme(next));
    if (motion) { motion.toggleTheme(e, commit); } else { commit(effective === 'dark' ? 'light' : 'dark'); }
  };

  // The class list is fixed on purpose: the motion layer adds and removes is-loading / is-cine / is-lx-pin itself, and a
  // constant className means React never writes over them.
  return (
    <div className={'pf' + (SITE.loader ? ' is-loading' : '')} data-pf-root="" data-theme={theme} ref={rootRef}>
      <a className="pf-skip" href="#main">Skip to content</a>
      <div className="pf-spot" data-spot="" aria-hidden="true"></div>
      <div className="pf-grain" data-grain="" aria-hidden="true"></div>
      <div className="pf-cursor" data-cursor="" aria-hidden="true"><span className="pf-cursor__ring"></span></div>
      {SITE.loader && <Loader />}
      <Nav onToggleTheme={onToggleTheme} isDark={effective === 'dark'} />
      <main id="main">
        <Hero />
        <About />
        <Skills />
        <Stack theme={effective} />
        <Projects />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
