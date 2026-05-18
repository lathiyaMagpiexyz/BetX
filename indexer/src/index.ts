import { ponder } from "ponder:registry";
import { giveaway, entry, winner } from "ponder:schema";

ponder.on("GiveawayFactory:GiveawayCreated", async ({ event, context }) => {
  await context.db.insert(giveaway).values({
    address: event.args.giveaway,
    sponsor: event.args.sponsor,
    prizeToken: event.args.prizeToken,
    entryFee: event.args.entryFee,
    endAt: event.args.endAt,
    status: "Open",
    prizePool: event.args.totalPrize,
    bonusPool: 0n,
    numEntrants: 0,
    createdAt: event.block.timestamp,
  });
});

ponder.on("Giveaway:Entered", async ({ event, context }) => {
  await context.db.insert(entry).values({
    giveaway: event.log.address,
    entrant: event.args.entrant,
    feePaid: event.args.feePaid,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });

  await context.db.update(giveaway, { address: event.log.address }).set((row) => ({
    numEntrants: row.numEntrants + 1,
    bonusPool: event.args.newBonusPool,
  }));
});

ponder.on("Giveaway:WinnersSelected", async ({ event, context }) => {
  for (let i = 0; i < event.args.winners.length; i++) {
    await context.db.insert(winner).values({
      giveaway: event.log.address,
      rank: i + 1,
      address: event.args.winners[i],
      amount: event.args.amounts[i],
      claimed: false,
      txHash: event.transaction.hash,
    });
  }

  await context.db.update(giveaway, { address: event.log.address }).set({ status: "Resolved" });
});

ponder.on("Giveaway:PrizeClaimed", async ({ event, context }) => {
  await context.db
    .update(winner)
    .set({ claimed: true })
    .where((row) =>
      row.giveaway.eq(event.log.address).and(row.address.eq(event.args.winner))
    );
});
