import { ExternalLink } from "lucide-react";
import { CC3_TESTNET } from "../lib/chain";

/**
 * The autonomous half of the product, told as what happened rather than as an architecture. Every
 * transaction named here is on Creditcoin and linked; the gas figures are the receipts'.
 */

const STEPS = [
  {
    title: "It chose its own target",
    body: "We funded a 0.05 tCTC bounty for whoever could prove the record of agent 21548 and left it open to anyone. The scout found it on its own and took the job.",
  },
  {
    title: "It looked for both kinds of evidence",
    body: "Not only the flattering kind. It proved the reviewers' history, and it also went looking for the highest-numbered review of anyone who reviews inside their own market, which is the evidence most likely to hurt an agent.",
  },
  {
    title: "It checked whether the work was worth doing",
    body: "Seven proofs would cost about 0.0017 tCTC in gas against a 0.05 tCTC bounty, so it proceeded. On its next pass over another agent it found everything already proven and spent nothing at all.",
    tx: { label: "the proofs", hash: "0x94de7b8ee4c796c5ea02ac37a2daf951d8f321717ff557dfbdddf1190c6c7d51" },
  },
  {
    title: "It claimed the bounty, then hired the agent",
    body: "Its proofs changed the answer, so the bounty paid out. By its own thresholds the agent was then worth hiring at a 1% fee, and it hired it.",
    tx: { label: "the hire", hash: "0xe6ba85dd9a70fe0ab0255150c044ff9b9b7eacaee70896f5c219f0ac40ff077d" },
  },
];

export default function ScoutStory() {
  return (
    <section className="band band-invert" id="scout">
      <div className="shell">
        <h2 className="section-title">Nobody fills the bureau in by hand</h2>
        <p className="lede band-lede">
          An agent of our own does it, and it keeps going without being asked. It runs every three hours until the
          submission deadline, and each pass leaves its reasoning in the log.
        </p>

        <ol className="steps">
          {STEPS.map((s) => (
            <li className="step" key={s.title}>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-body">{s.body}</p>
              {s.tx && (
                <a
                  className="step-link small"
                  href={`${CC3_TESTNET.explorer}/tx/${s.tx.hash}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  See {s.tx.label} on Creditcoin
                  <ExternalLink size={12} strokeWidth={2} />
                </a>
              )}
            </li>
          ))}
        </ol>

        <p className="small steps-foot">
          It also reads the review documents agents publish. Those often claim a payment happened on some chain; a
          language model lists the claims, and then the proof system checks them. On one agent it found six claimed
          payments, and not one of them existed on the chain it named. The model never decides anything: it can only
          point at a claim, and the proof decides.
        </p>
      </div>
    </section>
  );
}
