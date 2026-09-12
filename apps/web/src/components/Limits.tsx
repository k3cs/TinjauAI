/**
 * What Tinjau cannot do, stated where a visitor will actually read it. A bureau that only advertises
 * its strengths is asking for the same trust it refuses to give anyone else.
 */
const LIMITS = [
  [
    "A review nobody has proven is invisible",
    "Tinjau only sees what has been proven to Creditcoin. If an agent has glowing reviews that nobody paid to prove, they do not help it here. Anyone can fund a bounty to get them proven.",
  ],
  [
    "An old wallet can be bought",
    "Reviewer history makes fake reviewers expensive, not impossible. Someone patient, or willing to pay for aged wallets, can still get past it.",
  ],
  [
    "An honest operator with many agents looks like a clone farm",
    "Running twenty legitimate agents and running twenty fakes look the same from outside. Tinjau reports the count and refuses to guess which one you are looking at.",
  ],
  [
    "Only the Ethereum side is readable",
    "Most of this activity has moved to other networks that Creditcoin cannot prove from yet. Those agents cannot be checked here at all.",
  ],
  [
    "This is a test network",
    "The coins are free and the stakes are pretend. The registry being read, though, is the live one on Ethereum.",
  ],
];

export default function Limits() {
  return (
    <section className="band band-tight" id="limits">
      <div className="shell">
        <h2 className="section-title">What this cannot tell you</h2>
        <dl className="limits">
          {LIMITS.map(([title, body]) => (
            <div className="limit" key={title}>
              <dt className="limit-title">{title}</dt>
              <dd className="small">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
