import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/portfolio.css';

// The page always opens at the top, under the loader. A restored scroll position would also start ScrollTrigger with
// one-shot reveals already passed, and those remove themselves mid-setup.
if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
window.scrollTo(0, 0);

// No StrictMode: the motion layer splits heading text into word spans and pins sections, and a development double-mount
// would build and tear all of that down twice on load.
createRoot(document.getElementById('root')).render(<App />);
