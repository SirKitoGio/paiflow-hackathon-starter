"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LedgerModal, type LedgerData } from "./ledger-modal";
import "./dashboard.css";

export type PaluwaganItem = {
  id: string;
  purpose: string;
  goal: string;
  start: string;
  deadline: string;
  recipients?: { email: string; share: string }[];
  signature?: string;
  createdAt?: string;
};

const DEFAULT_PALUWAGAN: PaluwaganItem = {
  id: "pal-default",
  purpose: "<<Purpose Name>>",
  goal: "",
  start: "",
  deadline: "",
  recipients: [
    { email: "julianna@tranche.finance", share: "20000" },
    { email: "rent.landlord@stellar.org", share: "15000" },
    { email: "emergency.vault@stellar.org", share: "15000" },
  ],
  signature: "verified",
  createdAt: "2026-10-14T00:00:00.000Z",
};

function formatCardDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  const p0 = parts[0];
  const p1 = parts[1];
  const p2 = parts[2];
  if (p0 && p1 && p2) {
    const month = parseInt(p1, 10);
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthName = monthNames[month - 1] || p1;
    return `${monthName} ${p2}, ${p0}`;
  }
  return iso;
}

function formatCardGoal(goal: string): string {
  if (!goal || !goal.trim()) return "<<Monetary Goal>>";
  const num = parseFloat(goal.replace(/,/g, ""));
  if (isNaN(num)) return `₱ ${goal}`;
  return `₱ ${num.toLocaleString("en-US")}`;
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"home" | "wallet" | "create" | "user">("home");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paluwagans, setPaluwagans] = useState<PaluwaganItem[]>([DEFAULT_PALUWAGAN]);
  const [selectedPaluwagan, setSelectedPaluwagan] = useState<PaluwaganItem | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tranche_paluwagans");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPaluwagans(parsed);
        }
      }
    } catch {}
  }, []);

  const handleCreatePaluwagan = (data: LedgerData) => {
    const newItem: PaluwaganItem = {
      id: "pal-" + Date.now(),
      purpose: data.purpose.trim() || "<<Purpose Name>>",
      goal: data.goal.trim(),
      start: data.start,
      deadline: data.deadline,
      recipients: data.recipients,
      signature: data.signature,
      createdAt: new Date().toISOString(),
    };

    setPaluwagans((prev) => {
      const filtered = prev.filter((item) => item.id !== "pal-default");
      const updated = [newItem, ...filtered];
      try {
        localStorage.setItem("tranche_paluwagans", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setIsCreateModalOpen(false);
  };

  const handleDeletePaluwagan = (id: string) => {
    setPaluwagans((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      const finalList = updated.length > 0 ? updated : [DEFAULT_PALUWAGAN];
      try {
        localStorage.setItem("tranche_paluwagans", JSON.stringify(finalList));
      } catch {}
      return finalList;
    });
    setSelectedPaluwagan(null);
  };
  return (
    <div className="db">
      {/* Background Gradient */}
      <div className="db-bg" aria-hidden="true" />

      {/* Top Header: Tranche Logo + Wordmark */}
      <header className="db-header">
        <Link href="/" className="db-brand">
          {/* Group 1 / Logo with glow */}
          <div className="db-logo-group">
            <svg
              width="45.41"
              height="44.16"
              viewBox="0 0 45.41 44.16"
              aria-hidden="true"
              style={{ overflow: "visible" }}
            >
              <defs>
                <filter id="db-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="10.38" />
                </filter>
              </defs>
              <g filter="url(#db-glow)">
                <ellipse cx="22.7" cy="22.1" rx="20" ry="20" fill="#B54880" />
              </g>
              <image href="/images/logo.svg" width="45.41" height="44.16" preserveAspectRatio="none" />
            </svg>
          </div>
          <span className="db-brand-name">Tranche</span>
        </Link>
      </header>

      {/* Frame 23: Left Navigation Sidebar */}
      <aside className="db-sidebar" aria-label="Navigation Sidebar">
        {/* Frame 24: Home */}
        <button
          type="button"
          className={`db-sidebar-btn db-btn-home ${activeTab === "home" ? "db-btn-active" : ""}`}
          onClick={() => setActiveTab("home")}
          aria-label="Home"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#B54880" aria-hidden="true">
            <path d="M12 2.5 2.5 11h2.7V21h5.6v-6h2.4v6h5.6V11h2.7z" />
          </svg>
        </button>

        {/* Frame 25: Wallet */}
        <button
          type="button"
          className={`db-sidebar-btn db-btn-wallet ${activeTab === "wallet" ? "db-btn-active" : ""}`}
          onClick={() => setActiveTab("wallet")}
          aria-label="Wallet"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#E1EDA0" aria-hidden="true">
            <path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v6h3.5l1 2h7l1-2H20V6zm0 8v4h16v-4h-2.4l-1 2H7.400l-1-2z" fillRule="evenodd" />
          </svg>
        </button>

        {/* Frame 24: Plus Math */}
        <button
          type="button"
          className={`db-sidebar-btn db-btn-plus ${activeTab === "create" ? "db-btn-active" : ""}`}
          onClick={() => setIsCreateModalOpen(true)}
          aria-label="Create"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3v18M3 12h18" stroke="#E1EDA0" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>

        {/* Double Right Arrow */}
        <div className="db-sidebar-arrow" aria-hidden="true">
          <svg width="17" height="15" viewBox="0 0 17 15" fill="none">
            <path
              d="M2 1.5l5.5 6-5.5 6M9.5 1.5l5.5 6-5.5 6"
              stroke="#CA8A04"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Frame 26: User Profile */}
        <button
          type="button"
          className={`db-sidebar-btn db-btn-user ${activeTab === "user" ? "db-btn-active" : ""}`}
          onClick={() => setActiveTab("user")}
          aria-label="User profile"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#E1EDA0" aria-hidden="true">
            <circle cx="12" cy="8" r="4.5" />
            <path d="M3.500 21c0-4.500 3.800-7 8.500-7s8.500 2.500 8.500 7z" />
          </svg>
        </button>
      </aside>

      {/* Frame 27: Main Card */}
      <main className="db-main-card">
        {/* Frame 27 Top Header Row */}
        <header className="db-card-header">
          {/* Left Greeting */}
          <div className="db-greeting">
            <h1 className="db-greeting-title">Good day, Julianna! 👋</h1>
            <p className="db-greeting-sub">Here&apos;s an overview of your savings journey.</p>
          </div>

          {/* Right Action Controls */}
          <div className="db-header-controls">
            {/* Date Pill */}
            <div className="db-date-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#176B45" strokeWidth="2" />
                <path d="M16 2v4M8 2v4M3 10h18" stroke="#176B45" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>October 14, 2026</span>
            </div>

            {/* Notification Bell */}
            <button type="button" className="db-icon-btn" aria-label="Notifications">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                  stroke="#176B45"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* User Avatar */}
            <div className="db-avatar" title="Julianna">
              <span>J</span>
            </div>

            {/* + Create Paluwagan Magenta Button */}
            <button
              type="button"
              className="db-btn-create-paluwagan"
              onClick={() => setIsCreateModalOpen(true)}
            >
              + Create Paluwagan
            </button>
          </div>
        </header>

        {/* Paluwagan Cards Container */}
        <div className="db-cards-container">
          {paluwagans.map((p) => {
            const hasCustomPurpose = p.purpose && p.purpose !== "<<Purpose Name>>";
            const displayTitle = hasCustomPurpose ? p.purpose : "<<Purpose Name>>";
            const displayStart = p.start
              ? `<< Started: ${formatCardDate(p.start)} >>`
              : "<< Validation Started Date >>";
            const displayDeadline = p.deadline
              ? `<< Deadline: ${formatCardDate(p.deadline)} >>`
              : "<< Validating Deadline Date >>";
            const displayGoal = formatCardGoal(p.goal);

            return (
              <div key={p.id} className="db-purpose-card">
                {/* Card content */}
                <div className="db-card-content">
                  {/* Ellipse 3 Glow */}
                  <div className="db-card-illu-glow" aria-hidden="true" />

                  {/* image 14 */}
                  <img
                    src="/images/image-14.svg"
                    alt=""
                    width={107.11}
                    height={104.16}
                    className="db-card-illu-img"
                  />

                  {/* Card text */}
                  <div className="db-card-text">
                    <h3 className="db-card-title" title={displayTitle}>
                      {displayTitle}
                    </h3>
                    <p className="db-card-desc-1" title={displayStart}>
                      {displayStart}
                    </p>
                    <p className="db-card-desc-2" title={displayDeadline}>
                      {displayDeadline}
                    </p>
                  </div>

                  {/* Product action */}
                  <div className="db-card-action">
                    <span className="db-card-price" title={displayGoal}>
                      {displayGoal}
                    </span>
                    <button
                      type="button"
                      className="db-card-btn"
                      onClick={() => setSelectedPaluwagan(p)}
                      aria-label={`View ${displayTitle}`}
                    >
                      <span className="db-card-btn-label">View</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Frame 28: Add Paluwagan Card */}
          <div
            className="db-card-create"
            role="button"
            tabIndex={0}
            onClick={() => setIsCreateModalOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setIsCreateModalOpen(true)}
            aria-label="Create Paluwagan"
          >
            {/* Ellipse 4: Magenta circle with shadow */}
            <div className="db-create-circle">
              {/* Plus Math */}
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
                <path d="M15 6v18M6 15h18" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </main>

      {/* View Paluwagan Detail Modal */}
      {selectedPaluwagan && (
        <div
          className="db-detail-overlay"
          onClick={() => setSelectedPaluwagan(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="db-detail-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="db-detail-header">
              <div className="db-detail-header-left">
                <div className="db-detail-logo-thumb">
                  <img
                    src="/images/image-14.svg"
                    alt=""
                    width={32}
                    height={32}
                  />
                </div>
                <div>
                  <h2 className="db-detail-title">
                    {selectedPaluwagan.purpose || "<<Purpose Name>>"}
                  </h2>
                  <span className="db-detail-badge">Active Savings Plan</span>
                </div>
              </div>
              <button
                type="button"
                className="db-detail-close"
                onClick={() => setSelectedPaluwagan(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Target Goal Section */}
            <div className="db-detail-section">
              <div className="db-detail-section-title">Target Goal</div>
              <div className="db-detail-goal-row">
                <span className="db-detail-goal-val">
                  {formatCardGoal(selectedPaluwagan.goal)}
                </span>
                <span style={{ fontSize: "12px", color: "#176B45", fontWeight: 600 }}>
                  Non-Custodial Tranche
                </span>
              </div>
            </div>

            {/* Timeline Section */}
            <div className="db-detail-section">
              <div className="db-detail-section-title">Timeline</div>
              <div className="db-detail-dates-grid">
                <div className="db-detail-date-box">
                  <div className="db-detail-date-label">Validation Started Date</div>
                  <div className="db-detail-date-val">
                    {selectedPaluwagan.start ? formatCardDate(selectedPaluwagan.start) : "Pending"}
                  </div>
                </div>
                <div className="db-detail-date-box">
                  <div className="db-detail-date-label">Validating Deadline Date</div>
                  <div className="db-detail-date-val">
                    {selectedPaluwagan.deadline ? formatCardDate(selectedPaluwagan.deadline) : "Pending"}
                  </div>
                </div>
              </div>
            </div>

            {/* Recipients Section */}
            {selectedPaluwagan.recipients && selectedPaluwagan.recipients.length > 0 && (
              <div className="db-detail-section">
                <div className="db-detail-section-title">
                  Recipients &amp; Allocations ({selectedPaluwagan.recipients.length})
                </div>
                <div className="db-detail-recipients-list">
                  {selectedPaluwagan.recipients.map((r, idx) => (
                    <div key={idx} className="db-detail-recipient-row">
                      <span className="db-detail-recipient-email">{r.email || `Member ${idx + 1}`}</span>
                      <span className="db-detail-recipient-share">
                        {r.share ? `₱ ${parseFloat(r.share).toLocaleString("en-US")}` : "Unallocated"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E-Signature Verification */}
            <div className="db-detail-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="db-detail-section-title" style={{ margin: 0 }}>E-Signature Status</div>
                <div style={{ fontSize: "13px", color: "#176B45", fontWeight: 600, marginTop: "4px" }}>
                  ✓ Validated on Record
                </div>
              </div>
              {selectedPaluwagan.signature && selectedPaluwagan.signature.startsWith("data:image") ? (
                <img
                  src={selectedPaluwagan.signature}
                  alt="E-Signature"
                  style={{ maxHeight: "36px", maxWidth: "100px", objectFit: "contain", border: "1px dashed #CBD5E1", borderRadius: "6px", padding: "2px" }}
                />
              ) : null}
            </div>

            {/* Actions */}
            <div className="db-detail-actions">
              <Link href="/" className="db-detail-btn-action">
                Make Contribution
              </Link>
              {selectedPaluwagan.id !== "pal-default" && (
                <button
                  type="button"
                  className="db-detail-btn-secondary"
                  onClick={() => handleDeletePaluwagan(selectedPaluwagan.id)}
                  style={{ color: "#EF4444" }}
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                className="db-detail-btn-secondary"
                onClick={() => setSelectedPaluwagan(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Creation Modal */}
      {isCreateModalOpen && (
        <LedgerModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreatePaluwagan}
        />
      )}
    </div>
  );
}
