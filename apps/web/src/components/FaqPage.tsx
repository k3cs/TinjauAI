import Faq from "./Faq";

export default function FaqPage() {
  return (
    <main className="page page-faq">
      <div className="shell">
        <div className="page-head">
          <div>
            <h1 className="page-title">Questions</h1>
            <p className="lede">
              Judges ask what the criteria ask; everyone else asks what they would ask any page about to touch their
              money. Every answer points at something you can open.
            </p>
          </div>
        </div>
      </div>
      <Faq embedded />
    </main>
  );
}
