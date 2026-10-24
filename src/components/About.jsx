const PRINCIPLES = [
  { title: 'Start from the user’s path', text: 'I map what someone needs to get done before choosing a framework.' },
  { title: 'Boring where it counts', text: 'Proven tools for data, auth and payments. Experiments stay at the edges.' },
  { title: 'Small releases, real numbers', text: 'Ship often, watch the metrics, and fix what the data points to.' }
];

export default function About() {
  return (
    <section className="pf-section pf-about" id="about" aria-labelledby="about-title">
      <div className="pf-wrap">
        <h2 className="pf-statement" id="about-title" data-highlight="">I like software that feels simple on the surface and stays calm underneath.</h2>
        <div className="pf-about__body">
          <p>I’m Ayoub, a full-stack engineer. I take web products from first sketch to production: the interface, the API behind it, the data underneath and the pipeline that ships it. I studied cyber security engineering at USTHB and have two years of hands-on experience.</p>
          <p>I keep the core boring and well tested, measure before I optimize, and ship in small steps so problems surface early. To me, good engineering is mostly clear decisions that stay easy to change.</p>
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
