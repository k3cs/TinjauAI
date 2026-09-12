import { BrowserProvider, parseEther, type Eip1193Provider } from "ethers";
import { CC3_TESTNET, DEPLOYMENT } from "@tinjau/core/config";
import { Tinjau, type HireParams } from "@tinjau/core/contracts";
import { CHAIN_KEY } from "./chain";

/**
 * The visitor's own wallet signs the hire. The page holds no key and never asks for one; it only asks
 * the wallet to switch to Creditcoin CC3 testnet and to sign one transaction whose amount the visitor
 * typed.
 */

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { on?: (e: string, cb: (...a: unknown[]) => void) => void };
  }
}

export const hasWallet = () => typeof window !== "undefined" && !!window.ethereum;

const HEX_CHAIN = "0x" + CC3_TESTNET.chainId.toString(16);

export async function connect(): Promise<{ address: string; balance: bigint }> {
  if (!window.ethereum) throw new Error("No wallet extension was found in this browser.");
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: HEX_CHAIN }]);
  } catch {
    // The wallet does not know Creditcoin yet: offer to add it, with the public RPC and explorer.
    await provider.send("wallet_addEthereumChain", [
      {
        chainId: HEX_CHAIN,
        chainName: "Creditcoin CC3 Testnet",
        nativeCurrency: { name: "Testnet CTC", symbol: "tCTC", decimals: 18 },
        rpcUrls: [CC3_TESTNET.rpc],
        blockExplorerUrls: [CC3_TESTNET.explorer],
      },
    ]);
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { address, balance: await provider.provider.getBalance(address) };
}

export interface HireResult {
  hash: string;
  jobId?: bigint;
  premiumPaid: bigint;
  heldInEscrow: bigint;
}

export async function hire(
  agentId: bigint,
  params: HireParams,
  amountTctc: string,
  days: number,
): Promise<HireResult> {
  if (!window.ethereum) throw new Error("No wallet extension was found in this browser.");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const value = parseEther(amountTctc);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + days * 86_400);

  const escrow = Tinjau.withSigner(signer).escrow;

  // Ask the node first: a revert here is the bureau refusing the hire, and the visitor should read
  // that as a sentence rather than as a failed transaction in their wallet.
  await escrow.hire.staticCall(CHAIN_KEY, agentId, params, deadline, { value });

  const tx = await escrow.hire(CHAIN_KEY, agentId, params, deadline, { value });
  const receipt = await tx.wait();

  let jobId: bigint | undefined;
  let premiumPaid = 0n;
  let heldInEscrow = 0n;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = escrow.interface.parseLog(log);
      if (parsed?.name === "Hired") {
        jobId = parsed.args[0] as bigint;
        premiumPaid = parsed.args[5] as bigint;
        heldInEscrow = parsed.args[6] as bigint;
      }
    } catch {
      // not one of ours
    }
  }

  return { hash: tx.hash, jobId, premiumPaid, heldInEscrow };
}

export const escrowAddress = DEPLOYMENT.escrow;

/** Wallet and node errors are written for developers; the visitor gets one sentence instead. */
export function readableError(e: unknown): string {
  const err = e as { code?: string | number; shortMessage?: string; message?: string; reason?: string };
  if (err.code === "ACTION_REJECTED" || err.code === 4001) return "You cancelled the transaction in your wallet.";
  if (err.reason?.startsWith("Gated")) return "The bureau refused this hire: the agent's review record has holes.";
  if (/insufficient funds/i.test(err.message ?? "")) {
    return "This wallet does not hold enough tCTC for the amount you entered plus gas.";
  }
  return err.shortMessage ?? err.reason ?? err.message ?? "The transaction could not be sent.";
}
