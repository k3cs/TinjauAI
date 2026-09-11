import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: "npx", args: ["tsx", "--conditions=development", "src/stdio.ts"] });
const client = new Client({ name: "tinjau-smoke", version: "1.0.0" });
await client.connect(transport);
const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));
const facts = await client.callTool({ name: "tinjau_facts", arguments: { chainKey: 3, agentId: "22771" } });
console.log("tinjau_facts 22771:", (facts.content as { text: string }[])[0].text.slice(0, 700));
const quote = await client.callTool({ name: "tinjau_quote", arguments: { chainKey: 3, agentId: "50283" } });
const q = JSON.parse((quote.content as { text: string }[])[0].text);
console.log("tinjau_quote 50283:", q.premiumBps, "bps,", q.gate);
if (process.env.VERIFY) {
  const v = await client.callTool({ name: "tinjau_verify", arguments: { chainKey: 3, agentId: "22771" } });
  const r = JSON.parse((v.content as { text: string }[])[0].text);
  console.log("tinjau_verify 22771: identical =", r.identical, "mismatches =", r.mismatches, "admittedTxs =", r.admittedTxs);
}
await client.close();
