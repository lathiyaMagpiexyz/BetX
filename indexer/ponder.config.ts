import { createConfig } from "ponder";
import { GiveawayAbi } from "./abis/Giveaway.ts";
import { GiveawayFactoryAbi } from "./abis/GiveawayFactory.ts";

const factoryAddress = process.env.NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS;
if (!factoryAddress) {
  throw new Error("NEXT_PUBLIC_GIVEAWAY_FACTORY_ADDRESS is required");
}

export default createConfig({
  contracts: {
    GiveawayFactory: {
      network: "base",
      abi: GiveawayFactoryAbi,
      address: factoryAddress,
      startBlock: Number(process.env.PONDER_START_BLOCK ?? "0"),
    },
    Giveaway: {
      network: "base",
      abi: GiveawayAbi,
      factory: {
        address: factoryAddress,
        event: {
          name: "GiveawayCreated",
          inputs: [
            { type: "address", name: "giveaway", indexed: true },
            { type: "address", name: "sponsor", indexed: true },
            { type: "address", name: "prizeToken", indexed: true },
            { type: "uint256", name: "totalPrize" },
            { type: "uint256", name: "entryFee" },
            { type: "uint64", name: "endAt" },
          ],
        },
        parameter: "giveaway",
      },
      startBlock: Number(process.env.PONDER_START_BLOCK ?? "0"),
    },
  },
  database: {
    kind: "postgres",
    connectionString: process.env.PONDER_DATABASE_URL!,
    schema: "indexer",
  },
});
