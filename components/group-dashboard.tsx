"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import "./group-dashboard.css";

/* Figma frame "DASHBOARD" (node 83-2244) is designed at 1480 × 1024. */
const FRAME_WIDTH = 1480;
const FRAME_HEIGHT = 1024;

/* ---------- Icons ---------- */
type IconName =
  | "check"
  | "checkOnly"
  | "clock"
  | "star"
  | "refresh"
  | "alert"
  | "shield"
  | "link"
  | "card"
  | "trend"
  | "grid"
  | "chevrons"
  | "user";

const ICON_PATHS: Record<IconName, ReactNode> = {
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  checkOnly: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </>
  ),
  shield: <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" />,
  link: (
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  ),
  card: <rect x="3" y="6" width="18" height="13" rx="2" fill="currentColor" stroke="none" />,
  trend: <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />,
  grid: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" />
    </>
  ),
  chevrons: <path d="m6 17 5-5-5-5M13 17l5-5-5-5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4.2" fill="currentColor" stroke="none" />
      <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" fill="currentColor" stroke="none" />
    </>
  ),
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`gd-icon ${className ?? ""}`} aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ---------- Placeholder data (wire to the Tranche backend later) ---------- */
type PoolSlice = { label: string; color: string; amount: number };
type Member = {
  name: string;
  slot: string;
  status: string;
  statusIcon: IconName;
  paid: string;
  security: IconName;
  highlight?: boolean;
};
type Round = { n: number; state: "done" | "current" | "upcoming" };

const GROUP = {
  name: "ANTIPOLO TRIP",
  subtitle: "Tranche-Based Rotating Savings",
  currentRound: "—",
  totalRounds: 6,
  totalPool: 12000,
  nextDrawDate: "—",
  contribution: 500,
};

const POOL_BREAKDOWN: PoolSlice[] = [
  { label: "Disbursed", color: "#2d6a3e", amount: 0 },
  { label: "Active Round", color: "#6ee7a0", amount: 0 },
  { label: "Pending", color: "#e5e7eb", amount: 0 },
  { label: "Fees", color: "#fdf3b0", amount: 0 },
];

const MEMBERS: Member[] = [
  { name: "—", slot: "—", status: "—", statusIcon: "check", paid: "—", security: "shield" },
  { name: "—", slot: "—", status: "—", statusIcon: "clock", paid: "—", security: "link" },
  { name: "—", slot: "—", status: "—", statusIcon: "star", paid: "—", security: "link", highlight: true },
  { name: "—", slot: "—", status: "—", statusIcon: "refresh", paid: "—", security: "link" },
  { name: "—", slot: "—", status: "—", statusIcon: "alert", paid: "—", security: "link" },
  { name: "—", slot: "—", status: "—", statusIcon: "alert", paid: "—", security: "link" },
];

const ROUNDS: Round[] = [
  { n: 1, state: "done" },
  { n: 2, state: "done" },
  { n: 3, state: "current" },
  { n: 4, state: "upcoming" },
  { n: 5, state: "upcoming" },
  { n: 6, state: "upcoming" },
];

const peso = (v: number) => `₱${v.toLocaleString("en-PH")}`;

function donutBackground(slices: PoolSlice[]): string {
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  if (total === 0) return "var(--gd-placeholder)";
  let acc = 0;
  const stops = slices.map((s) => {
    const start = (acc / total) * 100;
    acc += s.amount;
    return `${s.color} ${start}% ${(acc / total) * 100}%`;
  });
  return `conic-gradient(${stops.join(",")})`;
}

/* Scales the fixed-size Figma frame to the viewport width. */
function useFrameScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(window.innerWidth / FRAME_WIDTH);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

export function GroupDashboard() {
  const scale = useFrameScale();

  return (
    <div className="gd-viewport" style={{ height: FRAME_HEIGHT * scale }}>
      <div className="gd" style={{ transform: `scale(${scale})` }}>
        {/* Brand */}
        <header className="gd-brand">
          <Link href="/" className="gd-brand__link">
            <img className="gd-brand__logo" src="/images/tranche/logo.png" alt="" />
            <span className="gd-brand__name">Tranche</span>
          </Link>
        </header>

        {/* Sidebar */}
        <nav className="gd-sidebar" aria-label="Main navigation">
          <div className="gd-sidebar__top">
            <Link href="/dashboard" className="gd-sidebar__btn is-active" aria-label="Home">
              <img src="/images/tranche/icon-home.png" alt="" />
            </Link>
            <button type="button" className="gd-sidebar__btn" aria-label="Wallet">
              <img src="/images/tranche/icon-wallet.png" alt="" />
            </button>
            <button type="button" className="gd-sidebar__btn" aria-label="Create group">
              <img src="/images/tranche/icon-plus.png" alt="" />
            </button>
          </div>
          <button type="button" className="gd-sidebar__expand" aria-label="Expand sidebar">
            <Icon name="chevrons" />
          </button>
          <button type="button" className="gd-sidebar__btn gd-sidebar__profile" aria-label="Profile">
            <Icon name="user" />
          </button>
        </nav>

        {/* Group header */}
        <section className="gd-group-header">
          <div className="gd-group-header__avatar" />
          <div className="gd-group-header__text">
            <h1 className="gd-group-header__title">{GROUP.name}</h1>
            <p className="gd-group-header__subtitle">{GROUP.subtitle}</p>
          </div>
          <div className="gd-round-pill">
            ROUND {GROUP.currentRound} / {GROUP.totalRounds}
          </div>
        </section>

        {/* Summary cards */}
        <div className="gd-summary gd-summary--pool">
          <span className="gd-summary__label">Total Pool</span>
          <span className="gd-summary__value">{peso(GROUP.totalPool)}</span>
        </div>
        <div className="gd-summary gd-summary--draw">
          <span className="gd-summary__label">Next Draw Date</span>
          <span className="gd-summary__value">{GROUP.nextDrawDate}</span>
        </div>

        {/* Main panel */}
        <main className="gd-panel gd-main">
          <div className="gd-overview">
            <div className="gd-overview__left">
              {/* Network status */}
              <div className="gd-card gd-network">
                <div className="gd-network__icon">
                  <Icon name="shield" />
                </div>
                <div className="gd-network__info">
                  <span className="gd-muted">Network Status</span>
                  <span className="gd-network__status">
                    <i className="gd-dot" />
                    SECURED <em>(Blockchain)</em>
                  </span>
                </div>
                <div className="gd-network__tags">
                  <span className="gd-tag">
                    <Icon name="link" />
                    On-Chain
                  </span>
                  <span className="gd-tag">
                    <Icon name="card" />
                    Method Payment
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="gd-stats">
                <div className="gd-card gd-stat">
                  <span className="gd-muted">Members Paid</span>
                  <span className="gd-stat__value">0/{MEMBERS.length}</span>
                  <span className="gd-stat__meta gd-stat__meta--green">
                    <Icon name="trend" />
                    0%
                  </span>
                </div>
                <div className="gd-card gd-stat">
                  <span className="gd-muted">Collected</span>
                  <span className="gd-stat__value">{peso(0)}</span>
                  <span className="gd-stat__meta">
                    <b className="gd-stat__currency">$</b> of $3,000
                  </span>
                </div>
                <div className="gd-card gd-stat">
                  <span className="gd-muted">Completion</span>
                  <span className="gd-stat__value">0%</span>
                  <span className="gd-stat__meta">
                    <Icon name="clock" className="gd-amber" />
                    {GROUP.totalRounds} rounds left
                  </span>
                </div>
              </div>
            </div>

            {/* Pool breakdown */}
            <div className="gd-card gd-breakdown">
              <div className="gd-breakdown__head">
                <h3>Pool Breakdown</h3>
                <span className="gd-chip">{peso(GROUP.totalPool)}</span>
              </div>
              <div className="gd-breakdown__body">
                <div className="gd-donut" style={{ background: donutBackground(POOL_BREAKDOWN) }} />
                <ul className="gd-legend">
                  {POOL_BREAKDOWN.map((s) => (
                    <li key={s.label}>
                      <span className="gd-legend__swatch" style={{ background: s.color }} />
                      <span>{s.label}</span>
                      <span className="gd-legend__value">{peso(s.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Members table */}
          <div className="gd-members">
            <h2 className="gd-section-title">
              <span className="gd-section-title__icon">
                <Icon name="grid" />
              </span>
              GROUP MEMBERS &amp; STATUS
            </h2>
            <table className="gd-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Assigned Slot</th>
                  <th>Payment Status</th>
                  <th>Amount Contributed</th>
                  <th>Security / Blockchain</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map((m, i) => (
                  <tr key={i} className={m.highlight ? "is-highlight" : undefined}>
                    <td>
                      <div className="gd-member">
                        <span className="gd-member__avatar" />
                        {m.name}
                      </div>
                    </td>
                    <td>{m.slot}</td>
                    <td>
                      <span className="gd-status-pill">
                        <Icon name={m.statusIcon} />
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <span className="gd-amount">
                        <span>{m.paid}</span>
                        <span>/ {peso(GROUP.contribution)}</span>
                      </span>
                    </td>
                    <td>
                      <span className="gd-status-pill">
                        <Icon name={m.security} />—
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>

        {/* Round timeline */}
        <aside className="gd-panel gd-timeline">
          <div className="gd-timeline__head">
            <h3>
              <Icon name="clock" />
              ROUND TIMELINE
            </h3>
            <button type="button" className="gd-timeline__receipt">
              RECEIPT
            </button>
          </div>
          <ol className="gd-timeline__list">
            {ROUNDS.map((r, i) => {
              if (r.state === "upcoming") {
                return (
                  <li key={r.n} className="gd-timeline__item gd-timeline__item--inline">
                    <span className="gd-timeline__marker">{r.n}</span>
                    <div className="gd-timeline__body">
                      <span className="gd-timeline__title">ROUND {r.n}</span>
                      <span className="gd-timeline__sub">Not Started</span>
                    </div>
                  </li>
                );
              }
              const isCurrent = r.state === "current";
              const hasConnector = r.state === "done" && ROUNDS[i + 1]?.state === "done";
              return (
                <li key={r.n} className={`gd-timeline__item ${hasConnector ? "has-connector" : ""}`}>
                  <span className={`gd-timeline__marker ${isCurrent ? "gd-timeline__marker--current" : ""}`}>
                    <Icon name={isCurrent ? "star" : "checkOnly"} />
                  </span>
                  <div className="gd-timeline__body">
                    <span className="gd-timeline__title">
                      ROUND {r.n}
                      {isCurrent && <span className="gd-timeline__badge">—</span>}
                    </span>
                    <span className="gd-timeline__sub">Not Started</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* E-contract */}
        <aside className="gd-panel gd-contract">
          <div className="gd-contract__head">
            <h3>
              E-CONTRACT &amp;
              <br />
              AGREEMENT
            </h3>
            <span className="gd-chip">{peso(GROUP.totalPool)}</span>
          </div>
          <p className="gd-contract__empty">No agreement yet.</p>
          <ul className="gd-contract__lines">
            <li>—</li>
            <li>—</li>
            <li>—</li>
          </ul>
          <button type="button" className="gd-btn-more">
            See more...
          </button>
        </aside>
      </div>
    </div>
  );
}
