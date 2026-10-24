import { LINKS } from '../content.js';

const Ext = () => (
  <svg className="pf-ic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"></path></svg>
);
const ArrowRight = ({ cls }) => (
  <svg className={cls} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>
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
            {/* data-state (idle, sending, sent) swaps the arrow for a spinner, then a check; set in lib/motion.js. */}
            <button className="pf-btn pf-btn--light pf-btn--icon pf-btn--send" type="submit" data-submit="" data-state="idle">
              <span data-submit-label="">Send message</span>
              <span className="pf-btn-icon" aria-hidden="true">
                <ArrowRight cls="i1" /><ArrowRight cls="i2" />
                <span className="pf-send-spin"></span>
                <svg className="pf-send-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"></path></svg>
              </span>
            </button>
            <p className="pf-form__status" role="status" aria-live="polite" data-status=""></p>
          </form>
        </div>
      </div>
    </section>
  );
}
