#!/usr/bin/env node
/**
 * WEB-21: run hire, fund and claim through the real page, in a real browser.
 *
 * Until now those three paths existed only as code: every live transaction in this project was sent
 * by a Node script, never by the frontend a visitor uses. This drives the actual marketplace with a
 * real EIP-1193 provider injected into the page, so every line the visitor's browser would run does
 * run: the static call that turns a refusal into a sentence, the event parsing after the receipt,
 * and the wallet state that refreshes afterwards. The transactions are real ones on Creditcoin CC3
 * testnet, paid from the project wallet.
 *
 * Usage: node scripts/wallet-browser-test.mjs [url]
 */
import { readFileSync } from "node:fs";
import { JsonRpcProvider, Wallet, formatEther } from "ethers";
import { chromium } from "playwright-core";

const URL_ = (process.argv[2] ?? "http://localhost:5173").replace(/\/$/, "");
const EXE =
  process.env.CHROMIUM ??
  "/Users/scientivan/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const RPC = "https://rpc.cc3-testnet.creditcoin.network";
const CHAIN_ID = 102031;

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const provider = new JsonRpcProvider(RPC, CHAIN_ID, { staticNetwork: true });
const wallet = new Wallet(env.PRIVATE_KEY, provider);

const results = [];
const step = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

/**
 * The wallet the page talks to. Everything the page reads goes straight to the same public RPC a
 * visitor's wallet would use; only signing is done here, with the project key, because a browser
 * extension cannot be driven from a script.
 */
async function handle({ method, params = [] }) {
  switch (method) {
    case "eth_requestAccounts":
    case "eth_accounts":
      return [wallet.address];
    case "eth_chainId":
      return "0x" + CHAIN_ID.toString(16);
    case "net_version":
      return String(CHAIN_ID);
    case "wallet_switchEthereumChain":
    case "wallet_addEthereumChain":
      return null;
    case "eth_sendTransaction": {
      const [tx] = params;
      const sent = await wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ?? 0n,
        ...(tx.gas ? { gasLimit: tx.gas } : {}),
      });
      return sent.hash;
    }
    default: {
      const res = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      });
      const json = await res.json();
      if (json.error) throw Object.assign(new Error(json.error.message), json.error);
      return json.result;
    }
  }
}

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.exposeFunction("__walletRpc", async (payload) => {
  try {
    return { ok: true, value: await handle(payload) };
  } catch (e) {
    return { ok: false, error: { message: e.message, code: e.code, data: e.data } };
  }
});

await page.addInitScript(() => {
  window.ethereum = {
    isMetaMask: true,
    on() {},
    removeListener() {},
    async request(payload) {
      const r = await window.__walletRpc({ method: payload.method, params: payload.params ?? [] });
      if (r.ok) return r.value;
      const err = new Error(r.error.message);
      Object.assign(err, r.error);
      throw err;
    },
  };
});

const before = await provider.getBalance(wallet.address);
console.log(`wallet ${wallet.address} holds ${formatEther(before)} tCTC\n`);

await page.goto(`${URL_}/#/marketplace`, { waitUntil: "load" });
await page.waitForSelector(".listing:not(.listing-skel)", { timeout: 60_000 });
await page.waitForFunction(() => document.querySelectorAll(".listing:not(.listing-skel)").length > 5, { timeout: 60_000 });

// 1. Connect, through the marketplace's own wallet bar.
await page.getByRole("button", { name: /connect wallet/i }).click();
await page.waitForSelector(".walletbar-account", { timeout: 30_000 });
const shown = await page.textContent(".walletbar-account");
step("connect", shown.includes(wallet.address.slice(0, 6)), shown.replace(/\s+/g, " ").trim());

/**
 * Pin a listing down by its position before touching it. A filter on button text would drift the
 * moment the button relabels itself ("Hire" becomes "Close"), and the test would walk off onto a
 * different agent mid-way.
 */
async function listingWithButton(label) {
  const index = await page.evaluate((want) => {
    const rows = [...document.querySelectorAll(".listing:not(.listing-skel)")];
    return rows.findIndex((r) => [...r.querySelectorAll(".listing-actions button")].some((b) => b.textContent.trim() === want));
  }, label);
  if (index < 0) throw new Error(`no listing offers a "${label}" button`);
  return page.locator(".listing:not(.listing-skel)").nth(index);
}

// 2. Hire: the first listing the contract says is hireable.
const hireable = await listingWithButton("Hire");
await hireable.scrollIntoViewIfNeeded();
const hiredAgent = (await hireable.locator(".listing-stats .mono").first().textContent()).trim();
await hireable.getByRole("button", { name: "Hire", exact: true }).click();
await hireable.locator(".panel-title", { hasText: "Hire this agent" }).waitFor();
await hireable.locator('input[type="number"]').first().fill("0.01");
await hireable.getByRole("button", { name: /^Pay .* and hire$/ }).click();
try {
  await hireable.locator(".panel-done-title").waitFor({ timeout: 180_000 });
  step("hire", true, `${hiredAgent}: ${(await hireable.locator(".panel-done-title").textContent()).trim()}`);
} catch {
  const err = await hireable.locator(".notice-error").textContent().catch(() => "no message shown");
  step("hire", false, err.trim());
}

// 3. Fund a bounty on an agent the contract is holding, which is where a bounty belongs.
const bountyTarget = await listingWithButton("Held").catch(() => page.locator(".listing:not(.listing-skel)").first());
await bountyTarget.scrollIntoViewIfNeeded();
const bountyAgent = (await bountyTarget.locator(".listing-stats .mono").first().textContent()).trim();
await bountyTarget.getByRole("button", { name: "Bounty", exact: true }).click();
await bountyTarget.locator(".panel-title", { hasText: "Pay for a better answer" }).waitFor();
await bountyTarget.locator('.panel input[type="number"]').first().fill("0.01");
await bountyTarget.getByRole("button", { name: /^Put .* on the table$/ }).click();
try {
  await bountyTarget.locator(".panel-done-title").waitFor({ timeout: 180_000 });
  step("fund", true, `${bountyAgent}: ${(await bountyTarget.locator(".panel-done-title").textContent()).trim()}`);
} catch {
  const err = await bountyTarget.locator(".notice-error").textContent().catch(() => "no message shown");
  step("fund", false, err.trim());
}

// 4. Claim: submit a transaction the bureau has already admitted. The contract must refuse it,
//    because nothing about the decision changes, and the page must say so in a sentence rather
//    than throwing a wallet error at the visitor. This exercises the whole claim path: the prover
//    fetch, the static call and the error translation.
// Bounties are a tab of the marketplace now, not a section below the listings.
await page.locator('.tab:has-text("Bounties")').click();
await page.waitForSelector(".bounty-card:not(:has(.skel))", { timeout: 60_000 });
const card = page.locator(".bounty-card").first();
await card.getByRole("button", { name: /claim it with proof/i }).click();
// A real Ethereum mainnet transaction, inside the attested range, that has nothing to do with this
// agent. The prover can prove it and the contract can admit it, and then the decision does not move,
// so the page must come back with the "nothing changed" sentence rather than a wallet error. That is
// the whole claim path exercised: prover fetch, static call, error translated into English.
const known = process.env.KNOWN_TX ?? "0xe77da50f06539c0d5db7cdc3d13fa893a6fe9c1dfd3d03a2395bc27ee52e4ab9";
await card.locator('input[aria-label^="Ethereum transaction hash"]').first().fill(known);
await card.getByRole("button", { name: /submit .*claim/i }).click();
try {
  await card.locator(".notice-error, .panel-done-title").waitFor({ timeout: 180_000 });
  const text = (await card.locator(".notice-error, .panel-done-title").first().textContent()).trim();
  const sentence = /^[A-Z]/.test(text) && !/0x[0-9a-f]{20}/i.test(text) && text.length > 25;
  step("claim path answers in a sentence", sentence, text.slice(0, 160));
} catch {
  step("claim path answers in a sentence", false, "nothing was shown within three minutes");
}

const after = await provider.getBalance(wallet.address);
console.log(`\nspent ${formatEther(before - after)} tCTC`);
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
