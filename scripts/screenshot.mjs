#!/usr/bin/env node
/**
 * WEB-8 / WEB-14: drive apps/web in a real browser, screenshot every route at desktop and phone
 * width, and measure what a screenshot cannot show: contrast against the actual composited
 * background, touch-target size, and horizontal overflow.
 *
 * Usage: node scripts/screenshot.mjs [url] [outDir]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const URL_ = (process.argv[2] ?? "http://localhost:5173/").replace(/\/?$/, "/");
const OUT = process.argv[3] ?? "/tmp/tinjau-shots";
const EXE =
  process.env.CHROMIUM ??
  "/Users/scientivan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

mkdirSync(OUT, { recursive: true });

async function shot(page, path, opts = {}) {
  for (const attempt of [{ timeout: 12_000 }, { timeout: 12_000, animations: "disabled" }]) {
    try {
      await page.screenshot({ path, ...attempt, ...opts });
      return true;
    } catch {
      /* try the next strategy */
    }
  }
  console.warn(`! could not screenshot ${path}`);
  return false;
}

function audit() {
  // Computed colours come back in their authored space (oklch, color-mix); a canvas resolves any of
  // them to sRGB bytes, which is what the contrast formula needs.
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const parse = (c) => {
    if (cache.has(c)) return cache.get(c);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = c;
    const norm = ctx.fillStyle; // normalized to #rrggbb or rgba(...)
    let out;
    if (norm.startsWith("#")) {
      out = { r: parseInt(norm.slice(1, 3), 16), g: parseInt(norm.slice(3, 5), 16), b: parseInt(norm.slice(5, 7), 16), a: 1 };
    } else if (norm.startsWith("oklch(")) {
      // Chromium keeps oklch() as authored; convert OKLCH → OKLab → linear sRGB → sRGB bytes.
      const n = (norm.match(/-?[\d.]+/g) || []).map(Number);
      const [L, C, hdeg] = n;
      const h = ((hdeg || 0) * Math.PI) / 180;
      const a = C * Math.cos(h), bb = C * Math.sin(h);
      const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
      const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
      const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
      const l = l_ ** 3, m = m_ ** 3, sv = s_ ** 3;
      const lin = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * sv,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * sv,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * sv,
      ].map((v) => Math.min(1, Math.max(0, v)));
      const gam = lin.map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
      out = { r: gam[0] * 255, g: gam[1] * 255, b: gam[2] * 255, a: norm.includes("/") ? n[3] : 1 };
    } else if (norm.startsWith("color(")) {
      // Chromium serializes wide-gamut results as color(srgb r g b [/ a]) with 0..1 channels.
      const n = (norm.replace(/^color\(srgb/, "").match(/[\d.]+/g) || []).map(Number);
      out = { r: n[0] * 255, g: n[1] * 255, b: n[2] * 255, a: n.length > 3 ? n[3] : 1 };
    } else {
      const n = (norm.match(/[\d.]+/g) || []).map(Number);
      out = { r: n[0] ?? 0, g: n[1] ?? 0, b: n[2] ?? 0, a: n.length > 3 ? n[3] : 1 };
    }
    cache.set(c, out);
    return out;
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = ({ r, g, b }) =>
    [r, g, b]
      .map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
      .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (fg, bg) => {
    const a = lum(fg) + 0.05;
    const b = lum(bg) + 0.05;
    return +(Math.max(a, b) / Math.min(a, b)).toFixed(2);
  };
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
  const bgOf = (el) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.unshift(n);
    let acc = { ...bodyBg, a: 1 };
    for (const n of chain) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.a > 0) acc = over(c, acc);
    }
    return acc;
  };
  const contrast = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("p, span, a, button, h1, h2, h3, h4, dt, dd, li, label, option, code, strong")) {
    const text = (el.childNodes[0]?.nodeType === 3 ? el.childNodes[0].textContent : "").trim();
    if (!text || seen.has(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const fg = over(parse(cs.color), bgOf(el));
    const bg = bgOf(el);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const c = ratio(fg, bg);
    if (c < need) contrast.push({ text: text.slice(0, 40), c, size, cls: el.className?.toString().slice(0, 40) });
    seen.add(el);
  }
  const targets = [];
  for (const el of document.querySelectorAll("a, button, input, select, [role=radio]")) {
    const b = el.getBoundingClientRect();
    if (!b.width) continue;
    if (b.width < 24 || b.height < 24) targets.push({ tag: el.tagName, text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) });
  }
  return {
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    contrast: contrast.slice(0, 12),
    targets: [...new Set(targets.map((t) => JSON.stringify(t)))].slice(0, 10).map((t) => JSON.parse(t)),
    pills: [...document.querySelectorAll(".pill-state")].map((s) => s.textContent.trim()),
  };
}

const browser = await chromium.launch({ executablePath: EXE });
const report = {};

for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 375, 812],
]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  const problems = [];
  page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
  page.on("pageerror", (e) => problems.push(String(e)));
  page.on("requestfailed", (r) => problems.push(`request failed: ${r.url()}`));
  report[name] = {};

  for (const [route, hash] of [
    ["home", "#/"],
    ["marketplace", "#/marketplace"],
    ["how", "#/how"],
    ["compare", "#/compare?ids=22771,50283,50724"],
    ["faq", "#/faq"],
    ["developers", "#/developers"],
  ]) {
    await page.goto(URL_ + hash, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, 0));
    // The how page carries no verdict until a visitor looks one up; everything else must render one.
    const gate = route === "how" ? ".audiences" : route === "faq" ? ".faq-item" : route === "developers" ? ".tools" : route === "marketplace" ? ".listing" : ".pill-state";
    await page.waitForSelector(gate, { timeout: 30_000 }).catch(() => problems.push(`${route}: ${gate} never rendered`));
    await page.waitForTimeout(2200);
    await shot(page, `${OUT}/${name}-${route}.png`);
    // Walk the page so every scroll-triggered reveal has fired before the full capture.
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
    await shot(page, `${OUT}/${name}-${route}-full.png`, { fullPage: true });
    report[name][route] = await page.evaluate(audit);
    if (route === "faq") {
      // Open one answer so the expanded state is captured and audited too.
      const q = await page.$$(".faq-q");
      if (q[0]) await q[0].click();
      await page.waitForTimeout(500);
      await shot(page, `${OUT}/${name}-faq-open.png`);
    }
    if (route === "marketplace") {
      await page.evaluate(() => document.getElementById("bounties")?.scrollIntoView());
      await page.waitForTimeout(1200);
      await shot(page, `${OUT}/${name}-bounties.png`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      // Agent cards come from Ethereum and IPFS; give them a beat before judging the listings.
      await page.waitForTimeout(4000);
      await shot(page, `${OUT}/${name}-marketplace-cards.png`);
      await shot(page, `${OUT}/${name}-marketplace-cards-full.png`, { fullPage: true });
      const faucet = await page.$$('button:has-text("Get test tCTC")');
      if (faucet[0]) await faucet[0].click();
      await page.waitForTimeout(500);
      await shot(page, `${OUT}/${name}-faucet.png`);
    }
    if (route === "home" && name === "desktop") {
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await page.waitForTimeout(400);
      await shot(page, `${OUT}/${name}-${route}-dark.png`);
      report[name]["home-dark"] = await page.evaluate(audit);
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      await page.waitForTimeout(200);
    }
    if (route === "marketplace") {
      await page.evaluate(() => document.getElementById("bounties")?.scrollIntoView());
      await page.waitForTimeout(1200);
      await shot(page, `${OUT}/${name}-bounties.png`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      for (const b of await page.$$(".disclose")) await b.click().catch(() => {});
      await page.waitForTimeout(600);
      await shot(page, `${OUT}/${name}-${route}-open-full.png`, { fullPage: true });
    }
    if (route === "compare") {
      const q = await page.$$(".compare-q");
      if (q[1]) await q[1].click();
      await page.waitForTimeout(400);
      await shot(page, `${OUT}/${name}-${route}-open-full.png`, { fullPage: true });
    }
  }
  report[name].problems = [...new Set(problems)].slice(0, 8);
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
