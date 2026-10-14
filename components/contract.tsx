"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./contract.css";

type Member = { id: string; slot: number; displayName: string; publicKey: string | null };
type Round = {
  index: number;
  receiverMemberId: string;
  splitBps: { now: number; vault: number; fund: number };
  deadline: string;
  members?: Record<string, string>;
};
type GroupResponse = {
  id: string;
  name: string;
  contributionStroops: string;
  mode?: string;
  activeRound?: number | null;
  vaultAccount?: string | null;
  fundAccount?: string | null;
  members: Member[];
  destinations: { slot: number; label: string; publicKey: string | null; percentBps: number }[];
  rounds: Round[];
};

const ACKS = [
  {
    title: "Pool and payout order are correct",
    body: "I confirm my slot, contribution amount, and the receiver order shown in the payout schedule.",
  },
  {
    title: "Vault hold and Safety Fund split understood",
    body: "I understand part of each payment is held in the Vault and part goes to the Safety Fund.",
  },
  {
    title: "Paiflow + Stellar testnet risks accepted",
    body: "I accept testnet volatility, irreversibility after SUCCESS, and that demo funds have no cash value.",
  },
  {
    title: "E-signature consent",
    body: "I agree my Freighter signature below counts as my signature on this group contract.",
  },
];

const shortKey = (k: string | null) => (k ? `${k.slice(0, 4)}…${k.slice(-4)}` : "TBD");
const stroopsToXlm = (s: string) => {
  try {
    return (BigInt(s) / 10_000_000n).toString();
  } catch {
    return s;
  }
};

export function Contract() {
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [checked, setChecked] = useState<boolean[]>(ACKS.map(() => false));

  useEffect(() => {
    let live = true;
    fetch("/api/tranche/group", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live && j?.data) setGroup(j.data as GroupResponse);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const members = useMemo(() => group?.members ?? [], [group]);
  const rounds = useMemo(() => group?.rounds ?? [], [group]);
  const contribution = group?.contributionStroops ?? "10000000";
  const poolTarget = useMemo(() => {
    try {
      return (BigInt(contribution) * BigInt(Math.max(members.length, 5))).toString();
    } catch {
      return contribution;
    }
  }, [contribution, members.length]);
  const allChecked = checked.every(Boolean);
  const signedCount = 0;

  const toggle = (i: number) =>
    setChecked((c) => c.map((v, k) => (k === i ? !v : v)));

  return (
    <div className="ec">
      <header className="ec-header">
        <Link href="/" className="ec-brand" aria-label="Tranche home">
          <span className="ec-brand-name">Tranche</span>
        </Link>
        <span className="ec-workspace">Workspace</span>
      </header>

      <div className="ec-workspace-area">
        <nav className="ec-rail" aria-label="Navigation rail">
          <div className="ec-nav">
            <button type="button" className="ec-nav-btn active" style={{ top: 32.72 }} aria-label="Home">⌂</button>
            <button type="button" className="ec-nav-btn" style={{ top: 87.49 }} aria-label="Wallet">▭</button>
            <button type="button" className="ec-nav-btn" style={{ top: 142.26 }} aria-label="Create">＋</button>
            <button type="button" className="ec-nav-btn" style={{ top: 479.42 }} aria-label="Profile">○</button>
            <span className="ec-nav-arrow" aria-hidden="true">»</span>
          </div>
        </nav>

        <div className="ec-review">
          <div className="ec-intro">
            <div className="ec-breadcrumb">
              <span>Group</span>
              <span aria-hidden="true">›</span>
              <span className="dim">E-contract</span>
            </div>
            <div className="ec-title-row">
              <div>
                <h1 className="ec-heading">Review group contract</h1>
                <p className="ec-subtitle">
                  {group ? `${group.name} · ` : ""}Confirm pool, payouts, custody and signatures before Round 1.
                </p>
              </div>
              <button type="button" className="ec-download" onClick={() => window.print()}>
                ⭳ <span>Download PDF</span>
              </button>
            </div>
            <div className="ec-notice">
              Draft only — nothing here moves funds. Payments confirm on Stellar testnet via Paiflow.
            </div>
          </div>

          <div className="ec-columns">
            <div className="ec-doc">
              <section className="ec-card" id="purpose" aria-label="Purpose and agreed details">
                <div className="ec-sec-head">
                  <div className="ec-title-row2">
                    <span className="ec-clause">1</span>
                    <h2 className="ec-sec-title">Purpose and agreed details</h2>
                  </div>
                  <p className="ec-desc">Rotating savings pool on testnet. Each member pays once per round; the receiver gets the immediate split.</p>
                </div>
                <div className="ec-pool">
                  <div className="ec-metric"><span className="l">Contribution / turn</span><span className="v">{stroopsToXlm(contribution)} XLM</span></div>
                  <div className="ec-metric"><span className="l">Members in pool</span><span className="v">{members.length || 5}</span></div>
                  <div className="ec-metric"><span className="l">Payout rounds</span><span className="v">{rounds.length || 5}</span></div>
                </div>
                <div className="ec-fields">
                  <div className="ec-field"><span className="l">Group</span><span className="v">{group?.name ?? "Tranche Barkada"} ({group?.id ?? "tranche-demo"})</span></div>
                  <div className="ec-field"><span className="l">Active round</span><span className="v">{group?.activeRound ?? 1} · Mode: {group?.mode ?? "team"}</span></div>
                </div>
                <p className="ec-desc">Destinations are public keys only — no secrets are stored. A null key means that account does not exist yet.</p>
                <div className="ec-divider" />
                <div className="ec-fields">
                  <div className="ec-field"><span className="l">Vault account</span><span className="v">{shortKey(group?.vaultAccount ?? null)} {group?.vaultAccount ?? ""}</span></div>
                  <div className="ec-field"><span className="l">Safety Fund account</span><span className="v">{shortKey(group?.fundAccount ?? null)} {group?.fundAccount ?? ""}</span></div>
                </div>
                <p className="ec-desc muted">Round split example (R1): {(rounds[0]?.splitBps.now ?? 7700) / 100}% now · {(rounds[0]?.splitBps.vault ?? 2000) / 100}% vault · {(rounds[0]?.splitBps.fund ?? 300) / 100}% fund.</p>
              </section>

              <section className="ec-card" id="distribution" aria-label="Distribution and participant protections">
                <div className="ec-title-row2"><span className="ec-clause">2</span><h2 className="ec-sec-title">Distribution and participant protections</h2></div>
                {[
                  ["Immediate payout", "The receiver's destinations (e.g. Rent + Wallet) are paid by Paiflow Split on each SUCCESS."],
                  ["Vault hold", "The vault share is held in multisig and released only to a payer the ledger confirmed."],
                  ["Safety Fund cover", "After a deadline, the Fund may cover a late member once per round via POST fund/cover."],
                  ["Forfeit", "A late member with a held tranche may forfeit it via POST vault/forfeit."],
                  ["One open payment", "Only one unsigned vault/fund payment per account. Cancel or expiry after 1 hour."],
                  ["Paid means SUCCESS", "A member counts as paid only after Paiflow returns SUCCESS. HTTP 200 alone is not proof."],
                ].map(([t, b]) => (
                  <div className="ec-clause-block" key={t}><h4>{t}</h4><p className="ec-desc">{b}</p></div>
                ))}
              </section>

              <section className="ec-card" id="schedule" aria-label="Proposed payout schedule">
                <div className="ec-sec-head">
                  <div className="ec-title-row2"><span className="ec-clause">3</span><h2 className="ec-sec-title">Proposed payout schedule</h2></div>
                  <p className="ec-desc">Receiver, deadline and amount per round. Status comes from GET group.</p>
                </div>
                <div className="ec-table" role="table" aria-label="Payout schedule">
                  <div className="ec-thead" role="row">
                    <span>Round</span><span>Recipient</span><span>Date</span><span>Amount</span><span>Status</span>
                  </div>
                  {(rounds.length ? rounds : [1, 2, 3, 4, 5, 6].map((i) => ({ index: i, receiverMemberId: `m${i}`, deadline: "", members: {} as Record<string, string> })) as Round[]).map((r) => {
                    const m = members.find((x) => x.id === r.receiverMemberId);
                    const st = r.members?.[r.receiverMemberId] ?? (r.index === (group?.activeRound ?? 1) ? "due" : "upcoming");
                    return (
                      <div className="ec-trow" role="row" key={r.index}>
                        <span className="ec-round">R{r.index}</span>
                        <span className="ec-recip">{m?.displayName ?? `Member ${r.index}`}</span>
                        <span className="ec-cell-sm">{r.deadline ? new Date(r.deadline).toLocaleDateString() : "TBD"}</span>
                        <span className="ec-cell-sm">{stroopsToXlm(contribution)} XLM</span>
                        <span><span className="ec-badge">{st}</span></span>
                      </div>
                    );
                  })}
                </div>
                <p className="ec-desc muted">Unconfirmed until Round 1 deployment + multisig setup are verified on testnet.</p>
              </section>

              <section className="ec-card" id="custody" aria-label="Paiflow and cryptocurrency terms">
                <div className="ec-title-row2"><span className="ec-clause">4</span><h2 className="ec-sec-title">Paiflow and cryptocurrency terms</h2></div>
                <div className="ec-intent">
                  <span aria-hidden="true">▭</span>
                  <div>
                    <div style={{ color: "#2d6a3f", fontSize: 15 }}>Non-custodial intent</div>
                    <p className="ec-desc">Tranche never holds secrets. Freighter signs XDR in the browser on testnet only. Mainnet is refused.</p>
                  </div>
                </div>
                <div className="ec-fields">
                  <div className="ec-field"><span className="l">Prepare → Sign → Submit</span><span className="v">Server prepares; wallet signs (~180s); server resubmits first envelope on retry.</span></div>
                  <div className="ec-field"><span className="l">Hosted payments</span><span className="v">Imported only after a SUCCESS check; otherwise ignored.</span></div>
                </div>
                <div className="ec-risks">
                  <div className="ec-clause-block"><h4>Asset and transfer risks</h4><p className="ec-desc">XLM volatility; irreversible after SUCCESS; testnet has no cash value.</p></div>
                  <div className="ec-clause-block"><h4>Provider and custody risks</h4><p className="ec-desc">Paiflow/Horizon downtime; multisig threshold (target 3-of-5, master weight 0).</p></div>
                </div>
                <p className="ec-desc muted">Server calls go only through server-only lib/paiflow.ts. Tokens stay in server env.</p>
              </section>

              <section className="ec-card" id="acks" aria-label="Participant acknowledgments">
                <div className="ec-sec-head">
                  <div className="ec-title-row2"><span className="ec-clause">5</span><h2 className="ec-sec-title">Participant acknowledgments</h2></div>
                  <p className="ec-desc">Tick all four to unlock signing.</p>
                </div>
                {ACKS.map((a, i) => (
                  <div
                    key={a.title}
                    className={`ec-ack${checked[i] ? " done" : ""}`}
                    role="checkbox"
                    aria-checked={checked[i]}
                    tabIndex={0}
                    onClick={() => toggle(i)}
                    onKeyDown={(e) => e.key === "Enter" && toggle(i)}
                  >
                    <span className="ec-check" aria-hidden="true">{checked[i] ? "✓" : ""}</span>
                    <div><h4>{a.title}</h4><p className="ec-desc">{a.body}</p></div>
                    <span className="ec-badge">{checked[i] ? "Ready" : "Pending"}</span>
                  </div>
                ))}
                <p className="ec-desc muted">Checking here is a UI gate only — the binding act is the Freighter signature below.</p>
              </section>

              <section className="ec-card" id="sign" aria-label="Signatures and confirmation">
                <div className="ec-sec-head">
                  <div className="ec-title-row2"><span className="ec-clause">6</span><h2 className="ec-sec-title">Signatures and confirmation</h2></div>
                  <p className="ec-desc">Seven-row register pattern from spec, bound to live members.</p>
                </div>
                <div className="ec-register" role="table" aria-label="Signatory register">
                  <div className="ec-reg-head"><span>Signatory</span><span>E-signature</span><span>Date</span><span>Status</span></div>
                  {(members.length ? members : [{ id: "m1", slot: 1, displayName: "Member 1", publicKey: null } as Member]).map((m) => (
                    <div className="ec-reg-row" key={m.id}>
                      <div>
                        <div className="ec-role">Member · Slot {m.slot}</div>
                        <div style={{ fontSize: 14 }}>{m.displayName}</div>
                        <div style={{ fontSize: 12, color: "#778174" }}>{shortKey(m.publicKey)}</div>
                      </div>
                      <div><div style={{ fontSize: 13, color: "#b54880" }}>Sign with Freighter</div><div className="ec-sign-line" /></div>
                      <div><div style={{ fontSize: 13, color: "#778174" }}>—</div><div style={{ fontSize: 11, color: "#778174" }}>Not signed</div></div>
                      <div><span className="ec-badge pink">Pending</span></div>
                    </div>
                  ))}
                </div>
                <p className="ec-desc">Signing happens on the dashboard/vault release flow after this review. This page collects acknowledgments first.</p>
                <div className="ec-divider" />
                <div className="ec-actions">
                  <div>
                    <div style={{ fontSize: 14 }}>{allChecked ? "Ready to sign" : "Complete all acknowledgments to sign"}</div>
                    <div style={{ fontSize: 12, color: "#778174" }}>{ACKS.length} acknowledgments · {checked.filter(Boolean).length} complete</div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="ec-btn">Save draft</button>
                    <button type="button" className="ec-btn" onClick={() => window.print()}>Print</button>
                    <button type="button" className={`ec-btn primary${allChecked ? " ready" : ""}`} disabled={!allChecked}>✎ Sign contract</button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="ec-side" aria-label="Review companion">
              <div className="ec-card" aria-label="Agreement at a glance">
                <div className="ec-title-row2"><span aria-hidden="true">▤</span><h2 className="ec-sec-title" style={{ fontSize: 16 }}>Agreement at a glance</h2></div>
                <div>
                  <div style={{ fontSize: 12, color: "#778174" }}>Pool target</div>
                  <div className="ec-target">{stroopsToXlm(poolTarget)} XLM</div>
                  <div style={{ fontSize: 12, color: "#778174" }}>{stroopsToXlm(contribution)} × {members.length || 5} members</div>
                </div>
                <div className="ec-divider" />
                {[
                  ["Contribution", `${stroopsToXlm(contribution)} XLM`],
                  ["Members", String(members.length || 5)],
                  ["Active round", `R${group?.activeRound ?? 1}`],
                  ["Vault hold (R1)", `${((rounds[0]?.splitBps.vault ?? 2000) / 100).toFixed(0)}%`],
                ].map(([l, v]) => (
                  <div className="ec-sum-row" key={l}><span className="l">{l}</span><span className="v">{v}</span></div>
                ))}
                <div>
                  <div className="ec-sum-row"><span style={{ fontWeight: 600 }}>Signatures</span><span style={{ color: "#b54880" }}>{signedCount}/{members.length || 5}</span></div>
                  <div className="ec-track" style={{ marginTop: 10 }}><div style={{ width: `${members.length ? (signedCount / members.length) * 100 : 0}%` }} /></div>
                  <div style={{ fontSize: 11, color: "#778174", marginTop: 6 }}>No Freighter signatures yet</div>
                </div>
              </div>

              <div className="ec-card" aria-label="Document contents">
                <h2 className="ec-sec-title" style={{ fontSize: 16 }}>Document contents</h2>
                <div className="ec-toc">
                  {[["1", "Purpose and agreed details", "purpose"], ["2", "Distribution and protections", "distribution"], ["3", "Payout schedule", "schedule"], ["4", "Paiflow and crypto terms", "custody"], ["5", "Acknowledgments", "acks"], ["6", "Signatures", "sign"]].map(([n, t, id]) => (
                    <a key={id} href={`#${id}`}><b>{n}</b><span>{t}</span></a>
                  ))}
                </div>
              </div>

              <div className="ec-commit">
                <span aria-hidden="true">▦</span>
                <h3>Before you commit</h3>
                <p>Testnet only. Verify the receiver order and your public key matches your Freighter wallet before signing.</p>
                <p className="fine">Returns are not promised. Late payments can trigger Safety Fund cover or forfeit.</p>
              </div>

              <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="ec-badge pink">Not yet binding · {checked.filter(Boolean).length}/4 checks</span>
                <p className="ec-desc muted" style={{ fontSize: 14 }}>This review becomes binding only after multisig setup and a SUCCESS payment on testnet.</p>
              </div>
            </aside>
          </div>

          <footer className="ec-foot">Draft only — payments confirm on testnet via Paiflow. No mainnet. · {group?.id ?? "tranche-demo"}</footer>
        </div>
      </div>
    </div>
  );
}
