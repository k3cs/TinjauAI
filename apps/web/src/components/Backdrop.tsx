import { useEffect, useRef } from "react";

/**
 * The hero backdrop, in place of the stock video the brief pinned (that asset belongs to another
 * project). It draws the one thing the product does: a fact leaves Ethereum on the left, crosses,
 * and lands as a mark on Creditcoin's ledger on the right, where the marks pile up and stay.
 *
 * It lives in the right-hand half so the headline sits on clean paper. Paused off-screen, and drawn
 * as one still frame with a full ledger under prefers-reduced-motion.
 */
export default function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let landed = reduced ? 999 : 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Deterministic, so the page looks identical in every recording of the demo.
    let seed = 20260912;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

    const LANES = 9;
    const lanes = Array.from({ length: LANES }, () => ({
      speed: 0.055 + rnd() * 0.05,
      phase: rnd(),
    }));

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // The composition occupies the right side; narrow screens get the whole width.
      const wide = w > 900;
      const x0 = wide ? w * 0.42 : w * 0.1;
      const x1 = wide ? w * 0.95 : w * 0.9;
      const top = h * 0.16;
      const bottom = h * 0.62;
      const span = x1 - x0;
      const rowGap = (bottom - top) / (LANES - 1);

      ctx.font = "500 10px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.fillText("ETHEREUM", x0, top - 22);
      const label = "CREDITCOIN";
      ctx.fillText(label, x1 - ctx.measureText(label).width, top - 22);

      // The two shores.
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      for (const x of [x0, x1]) {
        ctx.beginPath();
        ctx.moveTo(x, top - 12);
        ctx.lineTo(x, bottom + 12);
        ctx.stroke();
      }

      lanes.forEach((lane, i) => {
        const y = Math.round(top + i * rowGap) + 0.5;

        // The crossing itself, as a faint rule.
        ctx.strokeStyle = "rgba(0,0,0,0.07)";
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();

        // A fact waiting on the Ethereum side.
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillRect(x0 - 7, y - 2.5, 5, 5);

        const p = reduced ? 1 : (lane.phase + t * lane.speed) % 1.6;
        if (p <= 1) {
          const x = x0 + p * span;
          const tail = Math.min(46, p * span);
          const grad = ctx.createLinearGradient(x - tail, y, x, y);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(0,0,0,0.62)");
          ctx.fillStyle = grad;
          ctx.fillRect(x - tail, y - 1.5, tail, 3);
        }

        // Once a lane has delivered, its mark stays on the ledger: the record is cumulative.
        const delivered = reduced || t * lane.speed + lane.phase >= 1;
        if (delivered) {
          ctx.strokeStyle = "rgba(0,0,0,0.55)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1 + 4, y);
          ctx.lineTo(x1 + 16, y);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      });

      // A running count under the ledger, the same shape as the figure in the status line.
      if (!reduced) landed = lanes.filter((l) => t * l.speed + l.phase >= 1).length;
      const shown = Math.min(landed, LANES);
      ctx.font = "300 13px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      const count = `${shown} proven`;
      ctx.fillText(count, x1 - ctx.measureText(count).width, bottom + 34);
    };

    const frame = (ms: number) => {
      if (visible) draw(ms / 1000);
      raf = requestAnimationFrame(frame);
    };

    resize();
    if (reduced) draw(0);
    else raf = requestAnimationFrame(frame);

    const onResize = () => {
      resize();
      if (reduced) draw(0);
    };
    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="backdrop-canvas" aria-hidden="true" />;
}
