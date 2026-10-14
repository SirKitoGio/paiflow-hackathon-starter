import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
vi.mock("server-only", () => ({}));
import { capabilities } from "@/lib/paiflow";
import { POST as pay } from "@/app/api/tranche/pay/route";
import { GET as group } from "@/app/api/tranche/group/route";
import { POST as release } from "@/app/api/tranche/vault/release/route";
import { syncEvents, vaultShares } from "@/lib/tranche/ledger";
import { getGroup } from "@/lib/tranche/registry";
import { readStore, withStore } from "@/lib/tranche/store";
import { fixtureAddress, fixturePrepared, fixtureTransaction } from "./transaction-fixture";

const round1 = { id: "11111111-1111-4111-8111-111111111111", token: `pfk_${"a".repeat(64)}` };
const round2 = { id: "22222222-2222-4222-8222-222222222222", token: `pfk_${"b".repeat(64)}` };
const fixtureHash = Buffer.from(fixtureTransaction.hash()).toString("hex");
const members = [fixtureAddress, ...Array.from({ length: 4 }, () => Keypair.random().publicKey())];
const day = 86_400_000;
const groupConfig = {
  id: "g",
  name: "Test group",
  contributionStroops: "10000000",
  members: members.map((publicKey, i) => ({ id: `m${i + 1}`, slot: i + 1, displayName: `M${i + 1}`, publicKey })),
  destinations: [],
  rounds: [7700, 8200, 8700, 9200, 9700].map((now, i) => ({
    index: i + 1,
    receiverMemberId: `m${i + 1}`,
    splitBps: { now, vault: 9700 - now, fund: 300 },
    deadline: new Date(Date.now() + (i + 1) * day).toISOString(),
  })),
};
const json = (data: unknown, status = 200) => Response.json(data, { status });
const post = (url: string, body: unknown, origin = "http://localhost") =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  const dir = mkdtempSync(path.join(tmpdir(), "tranche-"));
  writeFileSync(path.join(dir, "group.json"), JSON.stringify(groupConfig));
  vi.stubEnv("TRANCHE_GROUP_FILE", path.join(dir, "group.json"));
  vi.stubEnv("TRANCHE_DATA_FILE", path.join(dir, "ledger.json"));
  vi.stubEnv("PAIFLOW_MODE", "team");
  vi.stubEnv("PAIFLOW_BASE_URL", "http://localhost:3000");
  vi.stubEnv("PAIFLOW_API_TOKEN", round1.token);
  vi.stubEnv("PAIFLOW_DEPLOYMENT_ID", round1.id);
  vi.stubEnv("TRANCHE_ROUNDS_JSON", JSON.stringify([{ round: 2, deploymentId: round2.id, token: round2.token }]));
  mockFetch = vi.fn(async (url: URL) => {
    const p = url.pathname;
    if (p.endsWith("/capabilities")) return json({ data: { network: "testnet" } });
    if (p.endsWith("/execute/submit")) return json({ data: { txHash: fixtureHash, status: "SUCCESS", ledger: 9 } });
    if (p.endsWith("/execute"))
      return json({ data: { ...fixturePrepared, expiresAt: new Date(Date.now() + 180_000).toISOString() } });
    return json({ error: { code: "NOT_FOUND", message: "nope" } }, 404);
  });
  vi.stubGlobal("fetch", mockFetch);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("uses the round's own deployment and token", async () => {
  await capabilities(2);
  const [url, init] = mockFetch.mock.calls[0];
  expect(String(url)).toContain(round2.id);
  expect(init.headers.Authorization).toBe(`Bearer ${round2.token}`);
  await capabilities();
  expect(String(mockFetch.mock.calls[1][0])).toContain(round1.id);
});
it.each(["not json", "{}", JSON.stringify([{ round: 2, deploymentId: "x", token: round2.token }])])(
  "refuses a bad TRANCHE_ROUNDS_JSON %s",
  async (value) => {
    vi.stubEnv("TRANCHE_ROUNDS_JSON", value);
    await expect(capabilities(2)).rejects.toMatchObject({ status: 503 });
  },
);
it("refuses a round with no deployment", async () => {
  await expect(capabilities(3)).rejects.toMatchObject({ status: 503 });
});

it("prepares, submits and records one contribution per member per round", async () => {
  const prepared = await (await pay(post("/api/tranche/pay", { round: 1, from: fixtureAddress }))).json();
  expect(prepared.data.txHash).toBe(fixtureHash);
  // Re-opening Pay returns the same preparation, not a second payment.
  const again = await (await pay(post("/api/tranche/pay", { round: 1, from: fixtureAddress }))).json();
  expect(again.data.txHash).toBe(fixtureHash);
  expect(mockFetch.mock.calls.filter(([u]) => String(u).endsWith("/execute"))).toHaveLength(1);

  const submitted = await (await pay(post("/api/tranche/pay", { round: 1, signedXdr: fixturePrepared.xdr }))).json();
  expect(submitted.data).toMatchObject({ status: "SUCCESS", memberId: "m1" });
  expect(submitted.data.signedXdr).toBeUndefined();

  const paidAgain = await pay(post("/api/tranche/pay", { round: 1, from: fixtureAddress }));
  expect(paidAgain.status).toBe(409);
  const g = await (await group()).json();
  expect(g.data.rounds[0].members.m1).toBe("paid");
  expect(g.data.activeRound).toBe(1);
});
it("refuses non-members, inactive rounds, other origins and unknown envelopes", async () => {
  expect((await pay(post("/api/tranche/pay", { round: 1, from: Keypair.random().publicKey() }))).status).toBe(403);
  expect((await pay(post("/api/tranche/pay", { round: 2, from: fixtureAddress }))).status).toBe(409);
  expect((await pay(post("/api/tranche/pay", { round: 1, from: fixtureAddress }, "http://evil"))).status).toBe(403);
  expect((await pay(post("/api/tranche/pay", { round: 1, signedXdr: fixturePrepared.xdr }))).status).toBe(404);
  expect((await pay(post("/api/tranche/pay", { round: 1, from: fixtureAddress, amount: "1" }))).status).toBe(422);
});
it("refuses payments in prepare mode", async () => {
  vi.stubEnv("PAIFLOW_MODE", "prepare");
  expect((await pay(post("/api/tranche/pay", { round: 1, from: fixtureAddress }))).status).toBe(403);
});

it("deduplicates events by eventId and keeps the cursor", async () => {
  const item = { id: "1", eventId: "e1", kind: "RECEIVE", topic: null, ledger: 1, txHash: fixtureHash, occurredAt: "2026-10-14T00:00:00Z", data: null };
  mockFetch.mockImplementation(async () => json({ data: { items: [item, item], nextCursor: "c1", hasMore: false } }));
  await syncEvents(1);
  await syncEvents(1);
  const state = await readStore();
  expect(state.events).toHaveLength(1);
  expect(state.eventCursors["1"]).toBe("c1");
  expect(String(mockFetch.mock.calls[1][0])).toContain("cursor=c1");
});

it("computes held tranches with bigint stroops", async () => {
  await withStore((s) => {
    for (const memberId of ["m1", "m2", "m3", "m4", "m5"])
      s.contributions.push({
        id: memberId, round: 1, memberId, from: fixtureAddress, amountStroops: "10000000",
        txHash: memberId, status: "SUCCESS", xdr: "", expiresAt: "", createdAt: "", updatedAt: "",
      });
  });
  const shares = vaultShares(getGroup(), await readStore());
  // Five 1 XLM contributions, 20% held for the round 1 receiver.
  expect(shares[0]).toMatchObject({ heldStroops: "10000000", remainingStroops: "10000000", paymentsDue: 4 });
  expect(shares[4]).toMatchObject({ heldStroops: "0", paymentsDue: 0 });
});
it("refuses a vault release without a confirmed payment", async () => {
  expect((await release(post("/api/tranche/vault/release", { memberId: "m1", round: 2 }))).status).toBe(409);
  expect((await release(post("/api/tranche/vault/release", { memberId: "m1", round: 1 }))).status).toBe(409);
});
