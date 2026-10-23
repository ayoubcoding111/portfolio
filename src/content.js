import { siReact, siJavascript, siTypescript, siHtml5, siCss, siTailwindcss, siNodedotjs, siNextdotjs, siExpress, siMongodb,
  siPostgresql, siGit, siGithub, siDocker, siFigma } from 'simple-icons';

/* Everything you'll want to edit lives here. Items marked PLACEHOLDER still need your real details. */

export const LINKS = {
  github: 'https://github.com/ayoubcoding111',
  /* PLACEHOLDER: your LinkedIn profile URL */
  linkedin: 'https://www.linkedin.com/',
  /* PLACEHOLDER: your email address */
  email: 'you@example.com',
  emailLabel: '[you@email.com]'
};

/* TODO: connect the contact form. Put your form endpoint here, for example a Formspree URL or your own /api/contact route. */
export const FORM_ENDPOINT = '';

export const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'stack', label: 'Stack' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' }
];

/* The skills section's scroll story: one click, followed down through the four layers and back. */
export const SKILLS = {
  title: 'Skills, layer by layer',
  intro: 'Follow one click through the four layers I build, from the button you press to the server that answers.',
  outro: 'I work across all four layers, and I’m most useful where they meet.'
};

/* PLACEHOLDER: starter tool lists. Swap in the tools you actually use. story: the chapter's headline in the scroll story. */
export const LAYERS = [
  { idx: '01', title: 'Frontend', kicker: 'What people see and touch', story: 'It starts with a click.', text: 'Accessible components, responsive layouts and motion with a purpose, fast on every device.', label: 'Frontend tools', tools: ['TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'GSAP', 'Accessibility'] },
  { idx: '02', title: 'Backend', kicker: 'Logic, APIs and integrations', story: 'The request reaches the API.', text: 'Typed, documented APIs with auth, validation and clear errors that stay easy to consume.', label: 'Backend tools', tools: ['Node.js', 'Express', 'NestJS', 'REST', 'GraphQL', 'Authentication'] },
  { idx: '03', title: 'Databases', kicker: 'Where data lives and stays correct', story: 'The data is written, and stays correct.', text: 'Relational models, migrations, indexing and caching, so data stays correct as the product grows.', label: 'Database tools', tools: ['PostgreSQL', 'MongoDB', 'Redis', 'Prisma'] },
  { idx: '04', title: 'DevOps & Tools', kicker: 'How it ships and stays up', story: 'It all ships, and stays up.', text: 'Containers, CI/CD and monitoring, so releases are routine and production stays quiet.', label: 'DevOps tools', tools: ['Docker', 'GitHub Actions', 'Linux', 'Nginx', 'Vercel', 'Git'] }
];

/* PLACEHOLDER: stack, links and screenshots. Swap each [Screenshot]/[Detail] box for a real image in Projects.jsx. */
export const PROJECTS = [
  { id: 'p1', tag: 'Placeholder: add stack and links', title: 'Japoni Auto', summary: 'Website for a car showroom in Algiers.', stack: ['[Framework]', '[Backend]', '[Hosting]'], demo: 'https://example.com', repo: LINKS.github, srName: 'Japoni Auto' },
  { id: 'p2', tag: 'Placeholder', title: '[Your product or side project]', summary: '[One line: what it does and who it’s for.]', stack: ['[Tech]', '[Tech]', '[Tech]'], demo: 'https://example.com', repo: LINKS.github, srName: 'project 2' },
  { id: 'p3', tag: 'Placeholder', title: '[Open-source work]', summary: '[One line: the problem it solves.]', stack: ['[Tech]', '[Tech]', '[Tech]'], demo: 'https://example.com', repo: LINKS.github, srName: 'project 3' },
  { id: 'p4', tag: 'Placeholder', title: '[Work or client project]', summary: '[One line: your role and the result.]', stack: ['[Tech]', '[Tech]', '[Tech]'], demo: 'https://example.com', repo: LINKS.github, srName: 'project 4' }
];

/* PLACEHOLDER: your roles, newest first */
export const EXPERIENCE_INTRO = 'Scroll back through the years: where I am now, and the steps that got me here.';

/* beat: the chapter's label in the scroll story. */
export const EXPERIENCE = [
  { beat: 'Now', when: '[2024] – Present', role: '[Role] at [Company]', desc: '[What you built and the result, in one or two lines.]' },
  { beat: 'Before that', when: '[2022] – [2024]', role: '[Role] at [Company]', desc: '[What you owned, shipped or improved.]' },
  { beat: 'Earlier', when: '[2020] – [2022]', role: '[Role] at [Company]', desc: '[A project or responsibility worth mentioning.]' },
  { beat: 'The start', when: '[Year]', role: '[Degree or certificate], [School]', desc: '[Optional: a focus area or award.]' }
];

/* The Stack: one key each, in keyboard order (three rows of 6, 5 and 5). Logos are Simple Icons (CC0, simpleicons.org).
   VS Code has no entry there (Microsoft asked for its marks to be removed), so its key carries a text legend instead. */

/* desc: the 6–9 word line shown on hover. */
const tool = (icon, desc) => ({ name: icon.title, hex: icon.hex, path: icon.path, desc });

export const STACK = [
  tool(siReact, 'Component-based library for building fast, interactive interfaces'),
  tool(siJavascript, 'The language of the web, running everywhere'),
  tool(siTypescript, 'JavaScript with static types that catch bugs early'),
  tool(siHtml5, 'The semantic markup that structures every web page'),
  tool(siCss, 'Styles, layouts and animations for the modern web'),
  tool(siTailwindcss, 'Utility-first classes for styling straight in the markup'),
  tool(siNodedotjs, 'JavaScript on the server, fast and event-driven'),
  tool(siNextdotjs, 'React framework for server rendering and full-stack apps'),
  tool(siExpress, 'Minimal, flexible web framework for Node.js APIs'),
  tool(siMongodb, 'Flexible document database that stores data as JSON'),
  tool(siPostgresql, 'Reliable relational database with powerful SQL and constraints'),
  tool(siGit, 'Version control that tracks every change to code'),
  tool(siGithub, 'Where code lives, gets reviewed and ships through CI'),
  tool(siDocker, 'Packages apps into containers that run the same everywhere'),
  { name: 'VS Code', short: 'VS Code', hex: '007ACC', path: null, desc: 'Lightweight, extensible code editor for every language' },
  tool(siFigma, 'Collaborative design tool for interfaces and prototypes')
];
