#!/usr/bin/env node
/**
 * WEB-8: drive apps/web in a real browser, screenshot every section at desktop and phone width, and
 * measure the things a screenshot cannot show — contrast against the actual composited background,
 * touch-target size, and horizontal overflow. Also produces the screenshot used in the README.
 *
 * Usage: node scripts/screenshot.mjs [url] [outDir]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const URL_ = process.argv[2] ?? "http://localhost:5179/";
const OUT = process.argv[3] ?? "/tmp/tinjau-shots";
const EXE =
  process.env.CHROMIUM ??
  "/Users/scientivan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

mkdirSync(OUT, { recursive: true });

/** Google Fonts can stall; a screenshot with a fallback face beats no screenshot at all. */
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
  // Composite rgba over its real backdrop before measuring: this palette states almost every
  // secondary colour as black-at-alpha, which reads as pure ink if the alpha channel is ignored.
  const parse = (c) => {
    const n = (c.match(/[\d.]+/g) || []).map(Number);
    return { r: n[0] ?? 0, g: n[1] ?? 0, b: n[2] ?? 0, a: n.length > 3 ? n[3] : 1 };
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
  const bgOf = (el) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.unshift(n);
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (const n of chain) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.a > 0) acc = over(c, acc);
    }
    return acc;
  };

  const contrast = [];
  for (const el of document.querySelectorAll("p,span,li,dd,dt,a,button,h1,h2,h3,h4,code,input")) {
    if (el.children.length) continue;
    if (!el.textContent.trim() && el.tagName !== "INPUT") continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (!el.getBoundingClientRect().height) continue;
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const bg = bgOf(el);
    const r = ratio(over(parse(cs.color), bg), bg);
    if (r < (large ? 3 : 4.5)) contrast.push(`${el.tagName}.${el.className} ${size}px r=${r}`);
  }

  const targets = [...document.querySelectorAll("button,a,input")]
    .filter((el) => {
      const b = el.getBoundingClientRect();
      if (!b.width) return false;
      // A link inside a run of prose is exempt (WCAG 2.5.8 inline exception).
      const inline =
        getComputedStyle(el).display.startsWith("inline") &&
        el.parentElement?.textContent.trim() !== el.textContent.trim();
      return !inline && b.height < 44 && !el.closest(".nav");
    })
    .map((el) => `${el.tagName}.${el.className} ${Math.round(el.getBoundingClientRect().height)}px`);

  return {
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    wide: [...document.querySelectorAll("*")]
      .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 5)
      .map((e) => `${e.tagName}.${e.className}`),
    contrast: [...new Set(contrast)].slice(0, 12),
    targets: [...new Set(targets)].slice(0, 10),
    stamps: [...document.querySelectorAll(".stamp")].map((s) => s.textContent.trim()),
    agents: document.querySelectorAll(".agent").length,
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

  await page.goto(URL_, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".stamp", { timeout: 25_000 }).catch(() => problems.push("no verdicts rendered"));
  await page.waitForTimeout(2500);
  await shot(page, `${OUT}/${name}-hero.png`);

  report[name] = { ...(await page.evaluate(audit)), problems: [...new Set(problems)].slice(0, 6) };

  for (const id of ["problem", "settings", "agents", "scout", "how", "limits"]) {
    await page.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id);
    await page.waitForTimeout(350);
    await shot(page, `${OUT}/${name}-${id}.png`);
  }

  // The second layer: open every disclosure and capture the evidence trail.
  for (const b of await page.$$(".disclose")) await b.click().catch(() => {});
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById("agents")?.scrollIntoView());
  await page.waitForTimeout(350);
  await shot(page, `${OUT}/${name}-evidence.png`);

  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
