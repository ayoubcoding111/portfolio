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
  { idx: '01', title: 'Frontend', kicker: 'What people see and touch', story: 'It starts with a click.', text: 'Accessible, responsive interfaces with purposeful motion.', label: 'Frontend tools', tools: ['React', 'Next.js', 'JavaScript', 'Tailwind CSS', 'Three.js', 'Figma', 'UI/UX Design'] },
  { idx: '02', title: 'Backend', kicker: 'Logic, APIs and integrations', story: 'The request reaches the API.', text: 'REST APIs in Express with secure logins and role-based access.', label: 'Backend tools', tools: ['Node.js', 'Express', 'REST APIs'] },
  { idx: '03', title: 'Databases', kicker: 'Where data lives and stays correct', story: 'The data is written, and stays correct.', text: 'Relational models in MySQL that keep the data correct.', label: 'Database tools', tools: ['MySQL', 'SQL'] },
  { idx: '04', title: 'DevOps & Tools', kicker: 'How it ships and stays up', story: 'It all ships, and stays up.', text: 'Git and GitHub for every change, deployed on Vercel and Railway.', label: 'DevOps tools', tools: ['Git', 'GitHub', 'Vercel', 'Railway', 'Linux'] }
];

/* Projects: titles, summaries and stacks come from the GitHub repos. Media lives in public/projects (compressed copies of
   docs/screenshots). `main` is the big shot (an image, or a video with a poster); `details` are the two floating shots.
   url: the live site, shown in the frame and linked; leave it out for a project with no live site. */
export const PROJECTS = [
  { id: 'p1', title: 'Redline Motors', summary: 'A dark, motion-led concept site for a car showroom, with a pinned car gallery and a WhatsApp or email enquiry.', stack: ['React', 'Vite', 'GSAP', 'Lenis'], url: 'redline-motors.vercel.app',
    main: { video: '/projects/redline-reel.mp4', poster: '/projects/redline-hero.webp', alt: 'Redline Motors: the showroom warms up, then the hero with a black BMW' },
    details: [{ src: '/projects/redline-cars.webp', alt: 'Redline Motors: the “On the floor” car gallery' }, { src: '/projects/redline-dialog.webp', alt: 'Redline Motors: the car details dialog for a Jeep Wrangler Rubicon' }] },
  { id: 'p2', title: 'Delicious Restaurant', summary: 'A full-stack food ordering platform with live order tracking, a kitchen dashboard and admin analytics, in English, French and Arabic.', stack: ['Node.js', 'MySQL', 'Vanilla JS'],
    main: { video: '/projects/restaurant-reel.mp4', poster: '/projects/restaurant-poster.webp', alt: 'Delicious Restaurant: the animated hero with the Tacos, Drinks and Family Pack marquee' },
    details: [{ src: '/projects/restaurant-dishes.webp', alt: 'Delicious Restaurant: the signature dishes reel' }, { src: '/projects/restaurant-admin.webp', alt: 'Delicious Restaurant: the admin analytics dashboard' }] },
  { id: 'p3', title: 'Pacific Dental Clinic', summary: 'A bilingual dental clinic site with a before and after slider, reviews and an appointment form.', stack: ['HTML', 'CSS', 'JavaScript'], url: 'pacific-clinic.vercel.app',
    main: { src: '/projects/dental-main.webp', alt: 'Pacific Dental Clinic: the hero with a smiling patient and the Prendre RDV button' },
    details: [{ src: '/projects/dental-ba.webp', alt: 'Pacific Dental Clinic: the before and after slider' }, { src: '/projects/dental-contact.webp', alt: 'Pacific Dental Clinic: the appointment booking form' }] },
  { id: 'p4', title: 'Oriel', summary: 'A scroll-driven concept site for a watchmaker, with a 3D watch built entirely in code.', stack: ['Three.js', 'GSAP', 'Lenis', 'Vite'], url: 'oriel-seven.vercel.app',
    main: { video: '/projects/oriel-reel.mp4', poster: '/projects/oriel-poster.webp', alt: 'Oriel: the hero with a 3D watch beside the headline “Time, taken apart.”' },
    details: [{ src: '/projects/oriel-anatomy.webp', alt: 'Oriel: the exploded anatomy, seven labelled layers' }, { src: '/projects/oriel-movement.webp', alt: 'Oriel: a close view of the Calibre O-1 movement' }] },
  { id: 'p5', title: 'Atlas', summary: 'A concept homepage for a travel agency in Algiers: guided visits, day trips and custom circuits.', stack: ['Vite', 'JavaScript', 'CSS'], url: 'atlastours.vercel.app',
    main: { src: '/projects/atlas-main.webp', alt: 'Atlas: the hero of the private tours of Algeria homepage' },
    details: [{ src: '/projects/atlas-trips.webp', alt: 'Atlas: the featured trips grid' }, { src: '/projects/atlas-people.webp', alt: 'Atlas: the people section' }] },
  { id: 'p6', title: 'Mahdi, Graphic Designer', summary: 'A one-page portfolio for a graphic designer: brand identities, posters and packaging.', stack: ['HTML', 'CSS', 'JavaScript'], url: 'mahdi-design.vercel.app',
    main: { video: '/projects/mahdi-reel.mp4', poster: '/projects/mahdi-poster.webp', alt: 'Mahdi, Graphic Designer: a short scroll through the portfolio' },
    details: [{ src: '/projects/mahdi-work.webp', alt: 'Mahdi, Graphic Designer: the work section' }, { src: '/projects/mahdi-billboard.webp', alt: 'Mahdi, Graphic Designer: a billboard poster project' }] }
];

/* Drafted answers: rewrite any answer that doesn't sound like you. label: the small tag before the question. tags: the words and icons that scroll past when a mouse is over
   the row (the icons are in lib/faqIcons.js). */
export const FAQ_INTRO = 'What clients and hiring teams usually ask before we work together. Don’t see your question?';

const tag = (word, icon) => ({ word, icon });

export const FAQ = [
  { id: 'faq-pricing', label: 'Pricing', q: 'How do you price a project?',
    a: 'A fixed quote once the scope is clear. Open-ended work is billed weekly.',
    tags: [tag('Fixed quote', FAQ_ICONS.billList), tag('Clear scope', FAQ_ICONS.checklistMinimalistic), tag('Weekly billing', FAQ_ICONS.calendar)] },
  { id: 'faq-remote', label: 'Remote', q: 'Do you work remotely, and in which time zone?',
    a: 'Yes. I’m in Algeria (GMT+1), so my day overlaps with Europe’s.',
    tags: [tag('Based in Algeria', FAQ_ICONS.mapPoint), tag('GMT+1', FAQ_ICONS.clockCircle), tag('Written updates', FAQ_ICONS.chatRoundDots)] },
  { id: 'faq-stack', label: 'Stack', q: 'Which technologies do you work with?',
    a: 'Mostly JavaScript: React, Next.js and Tailwind on the front, Node.js, Express and MySQL on the back. I can adapt to your stack.',
    tags: [tag('JavaScript', FAQ_ICONS.codeSquare), tag('APIs', FAQ_ICONS.server), tag('Databases', FAQ_ICONS.database)] },
  { id: 'faq-hiring', label: 'Hiring', q: 'Are you open to an internship?',
    a: 'Yes. I’m available now for a part-time internship alongside my studies, and I still take freelance projects.',
    tags: [tag('Internship', FAQ_ICONS.caseRound), tag('Part-time', FAQ_ICONS.clockCircle), tag('Freelance', FAQ_ICONS.programming)] },
  { id: 'faq-support', label: 'Support', q: 'What happens after launch?',
    a: 'You get the code, the accounts and short docs, and I can stay on for maintenance.',
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
