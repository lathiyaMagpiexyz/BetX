import { createPublicClient, http, parseAbi } from "viem";
import { bscTestnet } from "viem/chains";
import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf-8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const k = trimmed.slice(0, eq).trim();
  const v = trimmed.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const FACTORY_ABI = parseAbi([
  "function getAllGiveaways() view returns (address[])",
]);

const GIVEAWAY_ABI = parseAbi([
  "function getState() view returns (uint8 status, uint256 entryFee, uint256 bonusPool, uint256 numEntrants, uint256 numWinners, uint64 endAt)",
  "function prizePool() view returns (uint256)",
  "function sponsor() view returns (address)",
]);

const factory = process.env.NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

console.log("Factory:", factory);
console.log("RPC:", rpcUrl);

const client = createPublicClient({
  chain: bscTestnet,
  transport: http(rpcUrl, { timeout: 15_000, retryCount: 0 }),
});

const t0 = Date.now();
const addrs = await client.readContract({
  address: factory,
  abi: FACTORY_ABI,
  functionName: "getAllGiveaways",
});
console.log(`\ngetAllGiveaways returned ${addrs.length} address(es) in ${Date.now() - t0}ms`);

for (const a of addrs) {
  const [state, pool, sponsor] = await Promise.all([
    client.readContract({ address: a, abi: GIVEAWAY_ABI, functionName: "getState" }),
    client.readContract({ address: a, abi: GIVEAWAY_ABI, functionName: "prizePool" }),
    client.readContract({ address: a, abi: GIVEAWAY_ABI, functionName: "sponsor" }),
  ]);
  console.log(`  ${a}`);
  console.log(`    status=${state[0]} entryFee=${state[1]} bonusPool=${state[2]} entrants=${state[3]} prizePool=${pool} sponsor=${sponsor}`);
}
