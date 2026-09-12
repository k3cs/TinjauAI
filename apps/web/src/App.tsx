import { useState } from "react";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Problem from "./components/Problem";
import CareLevel from "./components/CareLevel";
import AgentList from "./components/AgentList";
import ScoutStory from "./components/ScoutStory";
import HowItWorks from "./components/HowItWorks";
import Limits from "./components/Limits";
import { useBureau } from "./lib/useBureau";
import type { Care } from "./lib/params";

export default function App() {
  const [care, setCare] = useState<Care>("normal");
  const bureau = useBureau(care);

  return (
    <>
      <Nav block={bureau.net?.block} />
      <Hero net={bureau.net} failed={bureau.failed} />
      <main>
        <Problem />
        <CareLevel care={care} onChange={setCare} />
        <AgentList care={care} bureau={bureau} />
        <ScoutStory />
        <HowItWorks net={bureau.net} />
        <Limits />
      </main>
      <footer className="page-foot">
        <div className="shell page-foot-inner">
          <p className="small">
            Tinjau · BUIDL CTC 2026 Fall · Creditcoin CC3 testnet. Facts are proven from Ethereum through the
            Attestcoin Protocol; nothing on this page is a score.
          </p>
          <a className="small" href="https://github.com/k3cs/TinjauAI">
            Source and contracts
          </a>
        </div>
      </footer>
    </>
  );
}
