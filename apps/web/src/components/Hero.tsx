import { motion } from "motion/react";
import Backdrop from "./Backdrop";
import type { NetworkStatus } from "../lib/chain";

const EASE = [0.16, 1, 0.3, 1] as const;
const rise = (delay: number, y = 16) => ({
  initial: { y, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.8, delay, ease: EASE },
});

export default function Hero({ net, failed }: { net?: NetworkStatus; failed: boolean }) {
  return (
    <header className="hero" id="top">
      <motion.div
        className="backdrop"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: EASE }}
      >
        <Backdrop />
      </motion.div>

      <motion.div
        className="hero-foot"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5, ease: EASE }}
      >
        <div className="shell hero-grid">
          <div>
            <motion.p className="hero-status small" {...rise(0.6)}>
              <span className="status-dot" aria-hidden="true" />
              {failed ? (
                <>Creditcoin is not answering right now, so the figures below are from a saved snapshot.</>
              ) : net ? (
                <>
                  <span className="num">{net.admitted}</span> Ethereum transactions proven into Creditcoin so far, read
                  at block <span className="num">{net.block.toLocaleString("en-US")}</span>
                </>
              ) : (
                <>Reading the bureau from Creditcoin…</>
              )}
            </motion.p>

            <motion.h1 className="display hero-title" {...rise(0.8, 20)}>
              Hire an AI agent.
              <br />
              Know who you are paying.
            </motion.h1>

            <motion.div className="hero-actions" {...rise(1)}>
              <a className="btn btn-ink" href="#agents">
                Check an agent
              </a>
              <a className="btn btn-line" href="#problem">
                Why this matters
              </a>
            </motion.div>
          </div>

          <motion.div className="hero-tags" {...rise(1)}>
            {["Real agents", "Real money", "No scores"].map((t) => (
              <span className="pill pill-outline" key={t}>
                <span className="label">{t}</span>
              </span>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </header>
  );
}
