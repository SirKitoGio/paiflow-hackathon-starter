import "server-only";
import { randomUUID } from "node:crypto";
import {
  PaiflowError,
  listEvents,
  transactionStatus,
  type Prepared,
  type Submitted,
} from "@/lib/paiflow";
import { getRound, receiverRound, type Group } from "@/lib/tranche/registry";
import {
  readStore,
  withStore,
  type Contribution,
  type ContributionStatus,
  type State,
} from "@/lib/tranche/store";

const now = () => new Date().toISOString();
const settled: ContributionStatus[] = ["FAILED", "REJECTED", "EXPIRED"];

export function conflict(message: string, code = "CONFLICT"): never {
  throw new PaiflowError(409, { code, message }, null, null);
}

/** The open (not failed/expired) contribution of a member in a round, if any. */
export function openContribution(
  state: State,
  round: number,
  memberId: string,
): Contribution | undefined {
  return state.contributions.find(
    (c) => c.round === round && c.memberId === memberId && !settled.includes(c.status),
  );
}

export function recordPrepared(input: {
  round: number;
  memberId: string;
  from: string;
  amountStroops: string;
  prepared: Prepared & { txHash: string };
}) {
  return withStore((state) => {
    if (openContribution(state, input.round, input.memberId))
      conflict("This member already has an open payment for this round.");
    const record: Contribution = {
      id: randomUUID(),
      round: input.round,
      memberId: input.memberId,
      from: input.from,
      amountStroops: input.amountStroops,
      txHash: input.prepared.txHash,
      status: "PREPARED",
      xdr: input.prepared.xdr,
      expiresAt: input.prepared.expiresAt,
      preparationRequestId: input.prepared.preparationRequestId,
      createdAt: now(),
      updatedAt: now(),
    };
    state.contributions.push(record);
    return record;
  });
}

/** Persist the exact signed envelope before submit; refuse envelopes we did not prepare. */
export function recordSigned(round: number, txHash: string, signedXdr: string) {
  return withStore((state) => {
    const record = state.contributions.find(
      (c) => c.round === round && c.txHash === txHash,
    );
    if (!record)
      throw new PaiflowError(
        404,
        { code: "NOT_FOUND", message: "No prepared Tranche payment has this hash." },
        null,
        null,
      );
    if (!["PREPARED", "PENDING", "UNKNOWN"].includes(record.status))
      conflict(`This payment is already ${record.status}.`);
    record.signedXdr ??= signedXdr;
    record.updatedAt = now();
    return { ...record };
  });
}

export function recordResult(
  txHash: string,
  result: Pick<Submitted, "status" | "ledger" | "error"> | { status: ContributionStatus },
) {
  return withStore((state) => {
    const record = state.contributions.find((c) => c.txHash === txHash);
    if (!record) return undefined;
    // SUCCESS is final; never downgrade it.
    if (record.status !== "SUCCESS") record.status = result.status;
    if ("ledger" in result && result.ledger !== undefined) record.ledger = result.ledger;
    if ("error" in result && result.error) record.error = result.error;
    record.updatedAt = now();
    return { ...record };
  });
}

/** Ask Paiflow for the final status. Only SUCCESS from this call marks a member as paid. */
export async function reconcile(round: number, txHash: string) {
  const state = await readStore();
  const record = state.contributions.find(
    (c) => c.round === round && c.txHash === txHash,
  );
  if (!record)
    throw new PaiflowError(
      404,
      { code: "NOT_FOUND", message: "No Tranche payment has this hash." },
      null,
      null,
    );
  if (record.status === "SUCCESS") return publicContribution(record);
  try {
    const status = await transactionStatus(txHash, round);
    return publicContribution(
      (await recordResult(txHash, {
        status: status.status,
        ledger: status.ledger,
        error: status.error,
      }))!,
    );
  } catch (error) {
    // Not found is uncertainty, unless the unsigned preparation expired without a signature.
    if (
      error instanceof PaiflowError &&
      error.status === 404 &&
      record.status === "PREPARED" &&
      !record.signedXdr &&
      Date.parse(record.expiresAt) < Date.now()
    )
      return publicContribution((await recordResult(txHash, { status: "EXPIRED" }))!);
    throw error;
  }
}

/** Reads one page of Paiflow events for a round and stores new ones, deduplicated by eventId. */
export async function syncEvents(round: number) {
  const { eventCursors } = await readStore();
  const cursor = eventCursors[round];
  const page = await listEvents({ cursor }, round);
  await withStore((state) => {
    const seen = new Set(state.events.map((e) => e.eventId));
    for (const item of page.items)
      if (!seen.has(item.eventId)) {
        seen.add(item.eventId);
        state.events.push({ ...item, round });
      }
    if (page.nextCursor) state.eventCursors[round] = page.nextCursor;
  });
  return page.hasMore;
}

export type MemberRoundStatus = "paid" | "pending" | "due" | "late";
export function roundStatus(group: Group, state: State, index: number) {
  const round = getRound(group, index);
  const late = Date.parse(round.deadline) < Date.now();
  return Object.fromEntries(
    group.members.map((m) => {
      const c = openContribution(state, index, m.id);
      const status: MemberRoundStatus =
        c?.status === "SUCCESS"
          ? "paid"
          : c && c.status !== "PREPARED"
            ? "pending"
            : late
              ? "late"
              : "due";
      return [m.id, status];
    }),
  );
}

/** First round whose deadline has not passed and that not every member has paid. */
export function activeRound(group: Group, state: State) {
  return group.rounds.find(
    (r) =>
      Date.parse(r.deadline) >= Date.now() &&
      Object.values(roundStatus(group, state, r.index)).some((s) => s !== "paid"),
  );
}

const share = (amount: string, bps: number) =>
  (BigInt(amount) * BigInt(bps)) / 10_000n;

/**
 * Held tranche per receiver. Each SUCCESS contribution in round r adds its vault bps to
 * round r's receiver. Contract rounding can differ by a stroop; Horizon is the final balance.
 */
export function vaultShares(group: Group, state: State) {
  return group.members.map((m) => {
    const own = receiverRound(group, m.id);
    let held = 0n;
    if (own)
      for (const c of state.contributions)
        if (c.round === own.index && c.status === "SUCCESS")
          held += share(c.amountStroops, own.splitBps.vault);
    let released = 0n;
    for (const r of state.releases)
      if (r.source === "vault" && r.memberId === m.id && r.status === "SUCCESS")
        released += BigInt(r.amountStroops);
    const laterRounds = own
      ? group.rounds.filter((r) => r.index > own.index).map((r) => r.index)
      : [];
    const releasedRounds = new Set(
      state.releases
        .filter((r) => r.source === "vault" && r.memberId === m.id && r.status === "SUCCESS")
        .map((r) => r.round),
    );
    return {
      memberId: m.id,
      receiverRound: own?.index ?? null,
      heldStroops: held.toString(),
      releasedStroops: released.toString(),
      remainingStroops: (held - released).toString(),
      paymentsDue: laterRounds.filter((r) => !releasedRounds.has(r)).length,
    };
  });
}

/** Browser-safe view: never includes the signed envelope. */
export function publicContribution(c: Contribution) {
  const { signedXdr: _signed, xdr: _xdr, ...rest } = c;
  return rest;
}
