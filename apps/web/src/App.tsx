import { Suspense, lazy, useState } from "react";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Landing from "./components/Landing";
import AgentsPage from "./components/AgentsPage";

// The landing page and the marketplace are what a visitor lands on; the rest are read on their own
// visit, so they are fetched then rather than shipped in the first download.
const ComparePage = lazy(() => import("./components/ComparePage"));
const HowPage = lazy(() => import("./components/HowPage"));
const FaqPage = lazy(() => import("./components/FaqPage"));
const DevPage = lazy(() => import("./components/DevPage"));
import { useBureau } from "./lib/useBureau";
import { useRoute } from "./lib/router";
import type { Care } from "./lib/params";

export default function App() {
  const route = useRoute();
  const [care, setCare] = useState<Care>("normal");
  const [refreshKey, setRefreshKey] = useState(0);
  // Only these three routes read the chain; the prose pages must not trigger a log scan.
  const needsChain = route.name === "home" || route.name === "agents" || route.name === "compare";
  const bureau = useBureau(care, refreshKey, needsChain);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="app">
      <Nav route={route} block={bureau.net?.block} />
      <div className="route" key={route.name}>
      <Suspense fallback={<main className="page"><div className="shell"><p className="small muted">Loading…</p></div></main>}>
      {route.name === "home" && <Landing bureau={bureau} care={care} />}
      {route.name === "agents" && (
        <AgentsPage care={care} onCare={setCare} bureau={bureau} onRefresh={refresh} tab={route.tab} />
      )}
      {route.name === "how" && <HowPage care={care} />}
      {route.name === "faq" && <FaqPage />}
      {route.name === "dev" && <DevPage />}
      {route.name === "compare" && (
        <ComparePage ids={route.ids} care={care} onCare={setCare} bureau={bureau} onRefresh={refresh} />
      )}
      </Suspense>
      </div>
      <Footer />
    </div>
  );
}
