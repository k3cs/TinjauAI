/**
 * The visitor may never have heard of any of this, so the problem comes before the tool. Every figure
 * here is measured, and the measurement is named next to it: no round numbers, no "studies show".
 */
export default function Problem() {
  return (
    <section className="band" id="problem">
      <div className="shell prose">
        <h2 className="section-title">
          AI agents already work for money. Almost nothing tells you which ones to trust.
        </h2>

        <p className="lede band-lede">
          Over 19,000 AI agents are listed in a public registry on Ethereum, and other agents already hire and pay
          them. Anyone can write a review of an agent there, and anyone can create as many agents as they like. Read
          that registry as it comes, and it misleads you.
        </p>

        <dl className="findings">
          <div className="finding">
            <dt className="finding-figure num">346 of 367</dt>
            <dd className="small">
              rated agents had exactly one reviewer. One opinion, and no way to tell whose.
            </dd>
          </div>
          <div className="finding">
            <dt className="finding-figure num">225</dt>
            <dd className="small">
              reviews out of the last 600 were written by a single wallet.
            </dd>
          </div>
          <div className="finding">
            <dt className="finding-figure num">83%</dt>
            <dd className="small">
              of new registrations over 60 days came from owners holding ten or more agents each.
            </dd>
          </div>
        </dl>

        <p className="small findings-source">
          Measured directly from Ethereum on 29 August 2026. An independent study of the same registry found that
          73.5% of reviewers showed coordinated, fake-account behaviour (arXiv 2606.26028).
        </p>

        <p className="lede band-lede">
          Tinjau is the credit check that runs before you pay. It will not take anyone's word about an agent, including
          the agent's own. A fact only counts here once an Ethereum transaction has been proven to Creditcoin, and
          Tinjau never publishes a rating: you set the bar, and the contract answers with what it can prove.
        </p>
      </div>
    </section>
  );
}
