import "server-only";
import { randomUUID } from "node:crypto";
import {
  Asset,
  BASE_FEE,
  FeeBumpTransaction,
  Horizon,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  type Transaction,
} from "@stellar/stellar-sdk";
import { fromStroops } from "@/lib/amount";
import { PaiflowError } from "@/lib/paiflow";
import { getGroup, memberById, receiverRound } from "@/lib/tranche/registry";
import { readStore, withStore, type Release } from "@/lib/tranche/store";
import { conflict, vaultShares } from "@/lib/tranche/ledger";

const RELEASE_WINDOW_SECONDS = 3600;

function configError(message: string): never {
  throw new PaiflowError(503, { code: "CONFIGURATION", message }, null, null);
}
function horizon() {
  const url = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
  if (!/^https:\/\/[^/]*testnet[^/]*\/?$/.test(url))
    configError("Set HORIZON_URL to a Stellar testnet Horizon origin.");
  return new Horizon.Server(url);
}
function sourceAccount(source: Release["source"]) {
  const key =
    source === "vault"
      ? process.env.TRANCHE_VAULT_ACCOUNT
      : process.env.TRANCHE_FUND_ACCOUNT;
  if (!key || !StrKey.isValidEd25519PublicKey(key))
    configError(`Set TRANCHE_${source.toUpperCase()}_ACCOUNT to a G-address.`);
  return key;
}
function parse(xdr: string): Transaction {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  if (tx instanceof FeeBumpTransaction)
    throw new PaiflowError(422, { code: "VALIDATION", message: "Unsupported envelope." }, null, null);
  return tx;
}

/** Live multisig rules: signer weights and the medium threshold that a payment needs. */
export async function multisig(source: Release["source"] = "vault") {
  const account = await horizon().loadAccount(sourceAccount(source));
  return {
    account: account.accountId(),
    threshold: Math.max(account.thresholds.med_threshold, 1),
    signers: account.signers
      .filter((s) => s.type === "ed25519_public_key" && s.weight > 0)
      .map((s) => ({ key: s.key, weight: s.weight })),
    balances: account.balances,
  };
}

/** Build an unsigned vault release for a receiver who paid this round on time. */
export async function createRelease(memberId: string, round: number) {
  const group = getGroup();
  const member = memberById(group, memberId);
  if (!member?.publicKey) conflict("This member has no wallet configured.");
  const own = receiverRound(group, memberId);
  if (!own || round <= own.index)
    conflict("Releases start in the rounds after the member received the pot.");
  const state = await readStore();
  const paid = state.contributions.some(
    (c) => c.round === round && c.memberId === memberId && c.status === "SUCCESS",
  );
  if (!paid) conflict("The ledger has no confirmed payment from this member in this round.");
  const active = (r: Release) => !["FAILED", "EXPIRED"].includes(r.status);
  if (state.releases.some((r) => r.source === "vault" && r.memberId === memberId && r.round === round && active(r)))
    conflict("A release for this member and round already exists.");
  // One open release at a time: two envelopes on the same sequence number cannot both succeed.
  if (state.releases.some((r) => r.source === "vault" && (r.status === "COLLECTING" || r.status === "PENDING")))
    conflict("Finish or let the open vault release expire first.");
  const share = vaultShares(group, state).find((s) => s.memberId === memberId)!;
  if (share.paymentsDue < 1 || BigInt(share.remainingStroops) <= 0n)
    conflict("This member has no held tranche left.");
  const amount = BigInt(share.remainingStroops) / BigInt(share.paymentsDue);
  if (amount <= 0n) conflict("The release amount rounds to zero.");

  const account = await horizon().loadAccount(sourceAccount("vault"));
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: member.publicKey,
        asset: Asset.native(),
        amount: fromStroops(amount.toString()),
      }),
    )
    .setTimeout(RELEASE_WINDOW_SECONDS)
    .build();
  const release: Release = {
    id: randomUUID(),
    source: "vault",
    memberId,
    round,
    destination: member.publicKey,
    amountStroops: amount.toString(),
    txHash: Buffer.from(tx.hash()).toString("hex"),
    xdr: tx.toXDR(),
    signers: [],
    expiresAt: new Date(Number(tx.timeBounds!.maxTime) * 1000).toISOString(),
    status: "COLLECTING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return withStore((s) => {
    if (s.releases.some((r) => r.source === "vault" && (r.status === "COLLECTING" || r.status === "PENDING")))
      conflict("Finish or let the open vault release expire first.");
    s.releases.push(release);
    return release;
  });
}

/** Add the verified member signatures from signedXdr; submit once the weight reaches the threshold. */
export async function signRelease(id: string, signedXdr: string) {
  const rules = await multisig("vault");
  const update = await withStore((state) => {
    const release = state.releases.find((r) => r.id === id);
    if (!release)
      throw new PaiflowError(404, { code: "NOT_FOUND", message: "No such release." }, null, null);
    if (release.status !== "COLLECTING") conflict(`This release is ${release.status}.`);
    if (Date.parse(release.expiresAt) <= Date.now()) {
      release.status = "EXPIRED";
      return { ...release };
    }
    const stored = parse(release.xdr);
    const incoming = parse(signedXdr);
    if (Buffer.from(incoming.hash()).toString("hex") !== release.txHash)
      throw new PaiflowError(422, { code: "VALIDATION", message: "This is not the release transaction." }, null, null);
    const hash = stored.hash();
    for (const sig of incoming.signatures) {
      const signer = rules.signers.find((s) => {
        const kp = Keypair.fromPublicKey(s.key);
        return (
          Buffer.from(kp.signatureHint()).equals(Buffer.from(sig.hint.toXdrObject())) &&
          kp.verify(hash, sig.signature)
        );
      });
      // Only current vault signers count, and each signer only once.
      if (signer && !release.signers.includes(signer.key)) {
        stored.addDecoratedSignature(sig);
        release.signers.push(signer.key);
      }
    }
    release.xdr = stored.toXDR();
    release.updatedAt = new Date().toISOString();
    return { ...release };
  });
  const weight = rules.signers
    .filter((s) => update.signers.includes(s.key))
    .reduce((sum, s) => sum + s.weight, 0);
  if (update.status !== "COLLECTING" || weight < rules.threshold)
    return { ...update, weight, threshold: rules.threshold };
  return { ...(await submitRelease(update.id)), weight, threshold: rules.threshold };
}

async function setStatus(id: string, status: Release["status"], error?: string) {
  return withStore((state) => {
    const release = state.releases.find((r) => r.id === id)!;
    release.status = status;
    release.error = error;
    release.updatedAt = new Date().toISOString();
    return { ...release };
  });
}

async function submitRelease(id: string) {
  const release = await setStatus(id, "PENDING");
  try {
    await horizon().submitTransaction(parse(release.xdr));
    return setStatus(id, "SUCCESS");
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: { extras?: { result_codes?: unknown } } } }).response;
    if (response?.status === 400)
      return setStatus(id, "FAILED", JSON.stringify(response.data?.extras?.result_codes ?? "rejected"));
    // Timeout or 5xx: outcome unknown. Stay PENDING and look the hash up; never rebuild.
    return release;
  }
}

/** Resolve a PENDING release by its hash on Horizon. */
export async function checkRelease(id: string) {
  const { releases } = await readStore();
  const release = releases.find((r) => r.id === id);
  if (!release)
    throw new PaiflowError(404, { code: "NOT_FOUND", message: "No such release." }, null, null);
  if (release.status !== "PENDING") return release;
  try {
    const tx = await horizon().transactions().transaction(release.txHash).call();
    return setStatus(id, tx.successful ? "SUCCESS" : "FAILED");
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404 && Date.parse(release.expiresAt) < Date.now())
      return setStatus(id, "EXPIRED");
    return release;
  }
}

export async function vaultOverview() {
  const group = getGroup();
  const state = await readStore();
  let rules: Awaited<ReturnType<typeof multisig>> | null = null;
  try {
    rules = await multisig("vault");
  } catch {
    rules = null;
  }
  return {
    shares: vaultShares(group, state),
    multisig: rules && {
      account: rules.account,
      threshold: rules.threshold,
      signers: rules.signers.map((s) => ({
        ...s,
        member: group.members.find((m) => m.publicKey === s.key)?.displayName ?? null,
      })),
      nativeBalance: rules.balances.find((b) => b.asset_type === "native")?.balance ?? null,
    },
    releases: state.releases.map((r) => ({
      ...r,
      member: memberById(group, r.memberId)?.displayName,
      weight: rules?.signers.filter((s) => r.signers.includes(s.key)).reduce((n, s) => n + s.weight, 0) ?? null,
    })),
  };
}
