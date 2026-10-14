import { PaiflowError, requireIntegration } from "@/lib/paiflow";
import { handle } from "@/lib/http";
import { getGroup, stellarExpertTx } from "@/lib/tranche/registry";
import { readStore } from "@/lib/tranche/store";
import { publicContribution, syncEvents } from "@/lib/tranche/ledger";

const MAX_PAGES = 5;

export async function GET() {
  return handle(async () => {
    const group = getGroup();
    let live = true;
    try {
      requireIntegration();
    } catch (error) {
      if (!(error instanceof PaiflowError)) throw error;
      live = false;
    }
    if (live) {
      const before = await readStore();
      const rounds = new Set(before.contributions.map((c) => c.round));
      for (const round of rounds)
        for (let page = 0; page < MAX_PAGES && (await syncEvents(round)); page++);
    }
    const state = await readStore();
    const byTx = new Map<string, typeof state.events>();
    for (const e of state.events) byTx.set(e.txHash, [...(byTx.get(e.txHash) ?? []), e]);
    return {
      live,
      contributions: state.contributions
        .filter((c) => c.status !== "PREPARED" && c.status !== "EXPIRED")
        .map((c) => ({
          ...publicContribution(c),
          member: group.members.find((m) => m.id === c.memberId)?.displayName,
          explorerUrl: stellarExpertTx(c.txHash),
          events: byTx.get(c.txHash) ?? [],
        })),
      events: state.events.map((e) => ({ ...e, explorerUrl: stellarExpertTx(e.txHash) })),
      releases: state.releases.map(({ xdr: _xdr, ...r }) => ({
        ...r,
        explorerUrl: r.status === "SUCCESS" ? stellarExpertTx(r.txHash) : null,
      })),
    };
  });
}
