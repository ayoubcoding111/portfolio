import { siReact, siJavascript, siVite, siHtml5, siCss, siTailwindcss, siNodedotjs, siNextdotjs, siExpress, siMysql,
  siGit, siGithub, siClaude, siKalilinux, siFigma } from 'simple-icons';
import { FAQ_ICONS } from './lib/faqIcons.js';

/* Everything you'll want to edit lives here. Items marked PLACEHOLDER still need your real details. */

export const LINKS = {
  github: 'https://github.com/ayoubcoding111',
  linkedin: 'https://www.linkedin.com/in/omar-ayoub-benkreira',
  email: 'omarayoubnkr@gmail.com',
  emailLabel: 'omarayoubnkr@gmail.com'
};

/* The contact form posts to api/contact.js, which forwards each message to Discord. */
export const FORM_ENDPOINT = '/api/contact';

export const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'stack', label: 'Stack' },
  { id: 'projects', label: 'Projects' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' }
];

/* The skills section's scroll story: one click, followed down through the four layers and back. */
export const SKILLS = {
  title: 'Skills, layer by layer',
  intro: 'Follow one click through the four layers I build, from the button you press to the server that answers.',
  outro: 'I work across all four layers, and I’m most useful where they meet.'
};

/* The tools in each layer match the CV. story: the chapter's headline in the scroll story. */
export const LAYERS = [
  { idx: '01', title: 'Frontend', kicker: 'What people see and touch', story: 'It starts with a click.', text: 'Accessible components, responsive layouts and motion with a purpose, fast on every device.', label: 'Frontend tools', tools: ['React', 'Next.js', 'JavaScript', 'Tailwind CSS', 'Three.js', 'Figma', 'UI/UX Design'] },
  { idx: '02', title: 'Backend', kicker: 'Logic, APIs and integrations', story: 'The request reaches the API.', text: 'REST APIs in Express with secure logins: bcrypt passwords, role-based access and brute-force lockout, plus validation and clear errors.', label: 'Backend tools', tools: ['Node.js', 'Express', 'REST APIs'] },
  { idx: '03', title: 'Databases', kicker: 'Where data lives and stays correct', story: 'The data is written, and stays correct.', text: 'Relational models in MySQL that keep the numbers a business needs and delete personal data it no longer needs.', label: 'Database tools', tools: ['MySQL', 'SQL'] },
  { idx: '04', title: 'DevOps & Tools', kicker: 'How it ships and stays up', story: 'It all ships, and stays up.', text: 'Git and GitHub for every change, deployed on Vercel and Railway.', label: 'DevOps tools', tools: ['Git', 'GitHub', 'Vercel', 'Railway', 'Linux'] }
];

/* Projects: titles, summaries and stacks come from the GitHub repos. Media lives in public/projects (compressed copies of
   docs/screenshots). `main` is the big shot (an image, or a video with a poster); `details` are the two floating shots.
   url: the live site, shown in the frame and linked; leave it out for a project with no live site. */
export const PROJECTS = [
  { id: 'p1', title: 'Redline Motors', summary: 'A dark, motion-led concept site for a car showroom in Austin, Texas: a cinematic intro, a pinned gallery of the cars on the floor and an enquiry that writes itself up for WhatsApp or email.', stack: ['React', 'Vite', 'GSAP', 'Lenis'], url: 'redline-motors-austin.vercel.app',
    main: { video: '/projects/redline-reel.mp4', poster: '/projects/redline-hero.webp', alt: 'Redline Motors: the showroom warms up, then the hero with a black BMW' },
    details: [{ src: '/projects/redline-cars.webp', alt: 'Redline Motors: the “On the floor” car gallery' }, { src: '/projects/redline-dialog.webp', alt: 'Redline Motors: the car details dialog for a Jeep Wrangler Rubicon' }] },
  { id: 'p2', title: 'Delicious Restaurant', summary: 'A full-stack food ordering platform: customers order and track their food live, staff run a kitchen dashboard and admins get analytics, in English, French and Arabic.', stack: ['Node.js', 'MySQL', 'Vanilla JS'],
    main: { video: '/projects/restaurant-reel.mp4', poster: '/projects/restaurant-poster.webp', alt: 'Delicious Restaurant: the animated hero with the Tacos, Drinks and Family Pack marquee' },
    details: [{ src: '/projects/restaurant-dishes.webp', alt: 'Delicious Restaurant: the signature dishes reel' }, { src: '/projects/restaurant-admin.webp', alt: 'Delicious Restaurant: the admin analytics dashboard' }] },
  { id: 'p3', title: 'Pacific Dental Clinic', summary: 'A bilingual website for a dental clinic in Algiers, with draggable before and after results, patient reviews and an appointment form, in plain HTML, CSS and JavaScript.', stack: ['HTML', 'CSS', 'JavaScript'], url: 'dentist-website-gamma-seven.vercel.app',
    main: { src: '/projects/dental-main.webp', alt: 'Pacific Dental Clinic: the hero with a smiling patient and the Prendre RDV button' },
    details: [{ src: '/projects/dental-ba.webp', alt: 'Pacific Dental Clinic: the before and after slider' }, { src: '/projects/dental-contact.webp', alt: 'Pacific Dental Clinic: the appointment booking form' }] },
  { id: 'p4', title: 'Oriel', summary: 'A scroll-driven concept site for an independent watchmaker: a 3D watch built entirely in code comes apart layer by layer, dives into the movement, then rebuilds in the metal and dial you pick.', stack: ['Three.js', 'GSAP', 'Lenis', 'Vite'], url: 'oriel-seven.vercel.app',
    main: { video: '/projects/oriel-reel.mp4', poster: '/projects/oriel-poster.webp', alt: 'Oriel: the hero with a 3D watch beside the headline “Time, taken apart.”' },
    details: [{ src: '/projects/oriel-anatomy.webp', alt: 'Oriel: the exploded anatomy, seven labelled layers' }, { src: '/projects/oriel-movement.webp', alt: 'Oriel: a close view of the Calibre O-1 movement' }] }
];

/* PLACEHOLDER: drafted answers. Fill in each [bracket] with your own details, and rewrite any answer that doesn't sound
   like you. label: the small tag before the question. tags: the words and icons that scroll past when a mouse is over
   the row (the icons are in lib/faqIcons.js). */
export const FAQ_INTRO = 'What clients and hiring teams usually ask before we work together. Don’t see your question?';

const tag = (word, icon) => ({ word, icon });

export const FAQ = [
  { id: 'faq-pricing', label: 'Pricing', q: 'How do you price a project?',
    a: 'Once the scope is clear, after a short call and a written brief, you get a fixed quote. Open-ended work, like a long-running product or a steady stream of features, is billed weekly instead. [Add a starting price or day rate here if you want to show one.]',
    tags: [tag('Fixed quote', FAQ_ICONS.billList), tag('Clear scope', FAQ_ICONS.checklistMinimalistic), tag('Weekly billing', FAQ_ICONS.calendar)] },
  { id: 'faq-timeline', label: 'Timeline', q: 'How long does a project take?',
    a: 'It depends on the scope. A focused marketing site usually takes [2–4] weeks, and a web app with accounts, data and an admin area [6–12]. Before I start you get a plan with milestones, and every week a working preview you can click through.',
    tags: [tag('Discovery', FAQ_ICONS.magnifier), tag('Weekly previews', FAQ_ICONS.eye), tag('Launch', FAQ_ICONS.rocket2)] },
  { id: 'faq-remote', label: 'Remote', q: 'Do you work remotely, and in which time zone?',
    a: 'Yes. I’m based in Algeria (GMT+1), so my working day overlaps with Europe’s. [Add any other hours you cover, like the US East Coast morning.] Progress is written down as I go, so work keeps moving between calls.',
    tags: [tag('Based in Algeria', FAQ_ICONS.mapPoint), tag('GMT+1', FAQ_ICONS.clockCircle), tag('Written updates', FAQ_ICONS.chatRoundDots)] },
  { id: 'faq-stack', label: 'Stack', q: 'Which technologies do you work with?',
    a: 'Mostly JavaScript from end to end: React, Next.js and Tailwind CSS in the browser, Node.js and Express with REST APIs on the server, MySQL for data, shipped on Vercel. I design interfaces in Figma and add 3D with Three.js when a project calls for it. If your team already has a stack, I’ll work in yours.',
    tags: [tag('JavaScript', FAQ_ICONS.codeSquare), tag('APIs', FAQ_ICONS.server), tag('Databases', FAQ_ICONS.database)] },
  { id: 'faq-hiring', label: 'Hiring', q: 'Are you open to an internship?',
    a: 'Yes. I’m available now for a part-time internship alongside my studies at USTHB, and I still take on freelance projects. I like owning a feature from the database up to the interface, as I did on the restaurant ordering system I built and led for my USTHB team.',
    tags: [tag('Internship', FAQ_ICONS.caseRound), tag('Part-time', FAQ_ICONS.clockCircle), tag('Freelance', FAQ_ICONS.programming)] },
  { id: 'faq-support', label: 'Support', q: 'What happens after launch?',
    a: 'You get the code, the accounts and short docs on how to run and change it, all in your name. [I fix bugs for the first N weeks at no cost], and I can stay on for maintenance or new features after that.',
    tags: [tag('Your code', FAQ_ICONS.key), tag('Clear docs', FAQ_ICONS.documentText), tag('Maintenance', FAQ_ICONS.settingsMinimalistic)] }
];

/* The Stack: one key each, in keyboard order (three rows of 6, 5 and 5). Logos are Simple Icons (CC0, simpleicons.org).
   SQL is a language with no logo of its own, so its key carries a text legend instead. */

/* desc: the 6–9 word line shown on hover. */
const tool = (icon, desc) => ({ name: icon.title, hex: icon.hex, path: icon.path, desc });

export const STACK = [
  tool(siReact, 'Component-based library for building fast, interactive interfaces'),
  tool(siJavascript, 'The language of the web, running everywhere'),
  tool(siVite, 'Fast build tool and dev server for the web'),
  tool(siHtml5, 'The semantic markup that structures every web page'),
  tool(siCss, 'Styles, layouts and animations for the modern web'),
  tool(siTailwindcss, 'Utility-first classes for styling straight in the markup'),
  tool(siNodedotjs, 'JavaScript on the server, fast and event-driven'),
  tool(siNextdotjs, 'React framework for server rendering and full-stack apps'),
  tool(siExpress, 'Minimal, flexible web framework for Node.js APIs'),
  { name: 'SQL', short: 'SQL', hex: 'F29111', path: null, desc: 'The query language for shaping and reading relational data' },
  tool(siMysql, 'Popular open-source relational database for web apps'),
  tool(siGit, 'Version control that tracks every change to code'),
  tool(siGithub, 'Where my code lives, versioned and shared'),
  tool(siClaude, 'AI assistant for planning, writing and reviewing code'),
  tool(siKalilinux, 'Security-focused Linux for testing and hardening systems'),
  tool(siFigma, 'Collaborative design tool for interfaces and prototypes')
];
