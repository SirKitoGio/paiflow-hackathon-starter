"use client";

import { useState } from "react";
import Link from "next/link";
import "./dashboard.css";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"home" | "wallet" | "create" | "user">("home");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newContribution, setNewContribution] = useState("50");
  const [newMembers, setNewMembers] = useState("6");
  const [newFrequency, setNewFrequency] = useState("Weekly");

  const handleCreatePool = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreateModalOpen(false);
    setNewPoolName("");
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
              width="46"
              height="45"
              viewBox="0 0 82 82"
              aria-hidden="true"
              style={{ overflow: "visible" }}
            >
              <defs>
                <filter id="db-glow" x="0" y="0" width="82" height="82" filterUnits="userSpaceOnUse">
                  <feGaussianBlur stdDeviation="10.38" />
                </filter>
              </defs>
              <g filter="url(#db-glow)">
                <ellipse cx="40.77" cy="40.77" rx="24.5" ry="24.5" fill="#B54880" />
              </g>
              <image href="/images/logo.svg" x="13" y="14" width="55.69" height="54.16" preserveAspectRatio="none" />
            </svg>
          </div>
          <span className="db-brand-name">Tranche</span>
        </Link>
      </header>

      {/* Frame 23: Left Sidebar */}
      <aside className="db-sidebar" aria-label="Navigation Sidebar">
        {/* Frame 24: Home */}
        <button
          type="button"
          className={`db-sidebar-btn db-btn-home ${activeTab === "home" ? "db-btn-active" : ""}`}
          onClick={() => setActiveTab("home")}
          aria-label="Home"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z"
              fill="#B54880"
            />
          </svg>
        </button>

        {/* Frame 25: Wallet */}
        <button
          type="button"
          className={`db-sidebar-btn db-btn-wallet ${activeTab === "wallet" ? "db-btn-active" : ""}`}
          onClick={() => setActiveTab("wallet")}
          aria-label="Wallet"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="20" height="14" rx="3" stroke="#A8D070" strokeWidth="2" fill="none" />
            <path d="M2 10h20" stroke="#A8D070" strokeWidth="1.5" />
            <circle cx="16" cy="14" r="1.5" fill="#A8D070" />
          </svg>
        </button>

        {/* Frame 24: Plus Math */}
        <button
          type="button"
          className={`db-sidebar-btn db-btn-plus ${activeTab === "create" ? "db-btn-active" : ""}`}
          onClick={() => setIsCreateModalOpen(true)}
          aria-label="Create"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 6v12M6 12h12" stroke="#A8D070" strokeWidth="2.4" strokeLinecap="round" />
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#A8D070" strokeWidth="2" fill="none" />
            <path d="M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" stroke="#A8D070" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </aside>

      {/* Frame 27: Main Card */}
      <main className="db-main-card">
        {/* Frame 43: Create Paluwagan Top Right Button */}
        <button
          type="button"
          className="db-create-paluwagan-btn"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <span>Create Paluwagan</span>
        </button>

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
      </main>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="db-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="db-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Create New Paluwagan"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="db-modal-header">
              <h2>Create New Paluwagan</h2>
              <button
                type="button"
                className="db-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePool} className="db-modal-form">
              <label>
                <span>Paluwagan Name</span>
                <input
                  type="text"
                  placeholder="e.g. Office Savings Circle"
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                  required
                />
              </label>

              <div className="db-modal-row">
                <label>
                  <span>Contribution (XLM per turn)</span>
                  <input
                    type="number"
                    min="1"
                    value={newContribution}
                    onChange={(e) => setNewContribution(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Total Members</span>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={newMembers}
                    onChange={(e) => setNewMembers(e.target.value)}
                    required
                  />
                </label>
              </div>

              <label>
                <span>Payout Frequency</span>
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-Weekly (15th / 30th)">Bi-Weekly (15th / 30th)</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </label>

              <div className="db-modal-actions">
                <button
                  type="button"
                  className="db-modal-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="db-modal-submit">
                  Launch Paluwagan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
