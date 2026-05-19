import { onchainTable, primaryKey } from "ponder";

export const giveaway = onchainTable("giveaway", (t) => ({
  address: t.hex().primaryKey(),
  sponsor: t.hex().notNull(),
  prizeToken: t.hex().notNull(),
  entryFee: t.bigint().notNull(),
  endAt: t.bigint().notNull(),
  status: t.text().notNull(),
  prizePool: t.bigint().notNull(),
  bonusPool: t.bigint().notNull().default(0n),
  numEntrants: t.integer().notNull().default(0),
  createdAt: t.bigint().notNull(),
}));

export const entry = onchainTable(
  "entry",
  (t) => ({
    giveaway: t.hex().notNull(),
    entrant: t.hex().notNull(),
    feePaid: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (t) => ({ pk: primaryKey({ columns: [t.giveaway, t.entrant] }) })
);

export const winner = onchainTable(
  "winner",
  (t) => ({
    giveaway: t.hex().notNull(),
    rank: t.integer().notNull(),
    address: t.hex().notNull(),
    amount: t.bigint().notNull(),
    claimed: t.boolean().notNull().default(false),
    txHash: t.hex().notNull(),
  }),
  (t) => ({ pk: primaryKey({ columns: [t.giveaway, t.rank] }) })
);
