import { LINKS } from '../content.js';

const Ext = () => (
  <svg className="pf-ic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"></path></svg>
);

/* Validation and sending are wired in lib/motion.js (pfBindForm); set FORM_ENDPOINT in content.js to make it send. */
export default function Contact() {
  return (
    <section className="pf-contact" id="contact" aria-labelledby="contact-title">
      <div className="pf-contact__panel">
        <div className="pf-wrap pf-contact__grid">
          <div className="pf-contact__intro">
            <h2 className="pf-h2 pf-contact__title" id="contact-title" data-split="focus">Let’s build something.</h2>
            <p className="pf-contact__lede">Tell me what you’re building, your timeline and what a good result looks like.</p>
            <div className="pf-email-wrap"><span className="pf-magnet" data-magnetic=""><a className="pf-email" href={'mailto:' + LINKS.email}>{LINKS.emailLabel}</a></span></div>
            <ul className="pf-socials">
              <li><a className="pf-link" href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub<span className="pf-sr"> (opens in a new tab)</span><Ext /></a></li>
              <li><a className="pf-link" href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<span className="pf-sr"> (opens in a new tab)</span><Ext /></a></li>
            </ul>
          </div>
          <form className="pf-form" data-contact-form="" aria-labelledby="form-title" noValidate>
            <h3 className="pf-form__title" id="form-title">Send a message</h3>
            <div className="pf-field">
              <label htmlFor="cf-name">Your name</label>
              <input className="pf-input" id="cf-name" name="name" type="text" autoComplete="name" aria-required="true" aria-describedby="cf-name-err" />
              <p className="pf-field__err" id="cf-name-err"></p>
            </div>
            <div className="pf-field">
              <label htmlFor="cf-email">Email</label>
              <input className="pf-input" id="cf-email" name="email" type="email" autoComplete="email" inputMode="email" aria-required="true" aria-describedby="cf-email-err" />
              <p className="pf-field__err" id="cf-email-err"></p>
            </div>
            <div className="pf-field">
              <label htmlFor="cf-message">Message</label>
              <textarea className="pf-input" id="cf-message" name="message" rows="5" aria-required="true" aria-describedby="cf-message-err"></textarea>
              <p className="pf-field__err" id="cf-message-err"></p>
            </div>
            <button className="pf-btn pf-btn--light" type="submit" data-submit="">Send message</button>
            <p className="pf-form__status" role="status" aria-live="polite" data-status=""></p>
          </form>
        </div>
      </div>
    </section>
  );
}
