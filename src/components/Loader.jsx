/* Loading screen: the name rises, three layer cards fan in, a counter runs to 100, then the panel wipes up into the hero.
   Its timeline lives in lib/motion.js (pfLoader). */
export default function Loader() {
  return (
    <div className="pf-ld" data-loader="" tabIndex={-1}>
      <div className="pf-ld-glow" aria-hidden="true"></div>
      <div className="pf-ld-center" aria-hidden="true">
        <div className="pf-ld-hold">
          <p className="pf-ld-tag" data-ld-tag=""><span className="pf-ld-tag-n">AYOUB,</span> <span className="pf-ld-tag-r">Full‑Stack Developer</span></p>
          <div className="pf-ld-stage">
            <div className="pf-ld-cover" data-ld-cover="">
              <div className="pf-tbls">
                <div className="pf-tbl"><div className="pf-tbl-h">users</div><div className="pf-tbl-r"><span>id</span><em>uuid</em></div><div className="pf-tbl-r"><span>email</span><em>text</em></div><div className="pf-tbl-r"><span>role</span><em>enum</em></div></div>
                <div className="pf-tbl"><div className="pf-tbl-h">orders</div><div className="pf-tbl-r"><span>id</span><em>uuid</em></div><div className="pf-tbl-r"><span>user_id</span><em>fk</em></div><div className="pf-tbl-r"><span>total</span><em>num</em></div></div>
              </div>
              <span>Schema</span>
            </div>
            <div className="pf-ld-cover" data-ld-cover="">
              <div className="pf-api">
                <div className="pf-api-r"><b>GET</b><span>/v1/projects</span><em>200</em></div>
                <div className="pf-api-r"><b>POST</b><span>/v1/orders</span><em>201</em></div>
                <div className="pf-api-r"><b>PATCH</b><span>/v1/users/:id</span><em>200</em></div>
                <div className="pf-api-r"><b>WS</b><span>/v1/live</span><em>101</em></div>
              </div>
              <span>API</span>
            </div>
            <div className="pf-ld-cover" data-ld-cover="">
              <div className="pf-um">
                <div className="pf-um-bar"><i></i><i></i><i></i></div>
                <div className="pf-um-body"><span className="pf-um-h"></span><span className="pf-um-h2"></span><div className="pf-um-cards"><i></i><i></i></div><span className="pf-um-btn">Get started</span></div>
              </div>
              <span>Interface</span>
            </div>
          </div>
        </div>
        <div className="pf-ld-line" data-ld-line=""><span data-ld-bar=""></span></div>
      </div>
      <p className="pf-ld-count" data-ld-fade="" aria-hidden="true"><span data-ld-count="">000</span><small>%</small></p>
    </div>
  );
}
