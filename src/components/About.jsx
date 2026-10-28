const PRINCIPLES = [
  { title: 'Start from the user’s path', text: 'I map what someone needs to get done before choosing a framework.' },
  { title: 'Boring where it counts', text: 'Proven tools for data and auth. Experiments stay at the edges.' },
  { title: 'Small releases, real feedback', text: 'Ship often, show the client, and fix what they find.' }
];

export default function About() {
  return (
    <section className="pf-section pf-about" id="about" aria-labelledby="about-title">
      <div className="pf-wrap">
        <h2 className="pf-statement" id="about-title" data-highlight="">I like software that feels simple on the surface and stays calm underneath.</h2>
        <div className="pf-about__body">
          <p>I’m Ayoub, a full-stack developer and cyber security engineering student at USTHB, graduating in June 2029. I’ve built websites for paying clients since August 2025, taking them from a first sketch in Figma to launch: the interface, the API behind it and the data underneath.</p>
          <p>I keep the core simple, build security in from the start, and ship in small steps so problems surface early. To me, good engineering is mostly clear decisions that stay easy to change.</p>
        </div>
        <ul className="pf-principles">
          {PRINCIPLES.map((p) => (
            <li className="pf-principle" key={p.title}>
              <span className="pf-rule" aria-hidden="true"></span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
