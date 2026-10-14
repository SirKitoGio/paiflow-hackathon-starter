"use client";

import { useEffect, useRef, useState } from "react";
import "./ledger.css";

export type LedgerData = {
  purpose: string;
  goal: string;
  recipients: { email: string; share: string }[];
  start: string;
  deadline: string;
  signature: string;
};

type Row = { email: string; share: string };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Money is kept as decimal strings; percentages use bigint math (no floats).
function toCentavos(v: string): bigint | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(v.trim());
  if (!m) return null;
  return BigInt(m[1]!) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
}

function distributionPct(goal: string, rows: Row[]): string {
  const g = toCentavos(goal);
  if (!g || g === 0n) return "0";
  let sum = 0n;
  for (const r of rows) sum += toCentavos(r.share) ?? 0n;
  return ((sum * 100n) / g).toString();
}

function formatDateDisplay(iso: string): string {
  if (!iso) return "mm / dd / yyyy";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m} / ${d} / ${y}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  // Monday is 0, Sunday is 6
  const startDayIndex = (firstDay.getDay() + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: {
    year: number;
    month: number;
    day: number;
    iso: string;
    isCurrentMonth: boolean;
    isWeekend: boolean;
  }[] = [];

  // Previous month trailing days
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dayOfWeek = days.length % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const iso = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ year: prevYear, month: prevMonth, day: d, iso, isCurrentMonth: false, isWeekend });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = days.length % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ year, month, day: d, iso, isCurrentMonth: true, isWeekend });
  }

  // Next month leading days to complete full grid (6 rows = 42 cells)
  const totalSlots = days.length > 35 ? 42 : 35;
  let nextDay = 1;
  while (days.length < totalSlots) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dayOfWeek = days.length % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const iso = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
    days.push({ year: nextYear, month: nextMonth, day: nextDay, iso, isCurrentMonth: false, isWeekend });
    nextDay++;
  }

  return days;
}

export function LedgerModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: LedgerData) => void;
}) {
  const [purpose, setPurpose] = useState("");
  const [goal, setGoal] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { email: "", share: "" },
    { email: "", share: "" },
    { email: "", share: "" },
  ]);
  const [start, setStart] = useState("");
  const [deadline, setDeadline] = useState("");
  const [signature, setSignature] = useState("");
  const [signaturePhoto, setSignaturePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom calendar state
  const [calTarget, setCalTarget] = useState<"start" | "deadline" | null>(null);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(0); // Default to 2026-01 from Figma
  const calRef = useRef<HTMLDivElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSignaturePhoto(result);
        setSignature(result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Click outside listener for calendar popover
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalTarget(null);
      }
    }
    if (calTarget) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [calTarget]);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const filled = rows.filter((r) => r.email.trim());
  const pct = distributionPct(goal, filled);

  const openCalendar = (target: "start" | "deadline") => {
    const activeDate = target === "start" ? start : deadline;
    if (activeDate) {
      const [y, m] = activeDate.split("-");
      if (y && m) {
        setCalYear(parseInt(y, 10));
        setCalMonth(parseInt(m, 10) - 1);
      }
    } else {
      setCalYear(2026);
      setCalMonth(0);
    }
    setCalTarget(target);
  };

  return (
    <div className="lg-overlay" onClick={onClose}>
      <form
        className="lgr"
        role="dialog"
        aria-modal="true"
        aria-label="Add ledger"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!start) {
            openCalendar("start");
            return;
          }
          if (!deadline) {
            openCalendar("deadline");
            return;
          }
          if (!signature) {
            fileInputRef.current?.click();
            return;
          }
          onCreate({ purpose, goal, recipients: filled, start, deadline, signature });
        }}
      >
        {/* Soft background circles from Figma */}
        <div className="lgr-circle lgr-c1" aria-hidden="true" />
        <div className="lgr-circle lgr-c2" aria-hidden="true" />

        {/* Close Button */}
        <button type="button" className="lgr-close" onClick={onClose} aria-label="Close modal">
          &times;
        </button>

        {/* TOP SECTION: Purpose Saving */}
        <div className="lgr-top">
          {/* Header */}
          <div className="lgr-header">
            <span className="lgr-badge" aria-hidden="true">
              {/* Navigation / Compass Icon */}
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2A3A1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </span>
            <div className="lgr-header-text">
              <h2 className="lgr-title">Purpose Saving</h2>
              <p className="lgr-subtitle">Set a purpose reason of saving</p>
            </div>
          </div>

          {/* Purpose Input Field */}
          <div className="lgr-purpose-box">
            <span className="lgr-input-icon-left" aria-hidden="true">
              {/* Refresh Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </span>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Input purpose"
              className="lgr-input-field"
              required
            />
          </div>

          {/* Savings Jar Illustration (Image 16) */}
          <img
            src="/images/image-16.svg"
            alt="Savings Jar"
            className="lgr-jar-img"
            aria-hidden="true"
          />
        </div>

        {/* INNER PANEL: Frame 37 */}
        <div className="lgr-panel">
          {/* SECTION: Total Shared Savings */}
          <div className="lgr-section">
            <div className="lgr-header">
              <span className="lgr-badge" aria-hidden="true">
                {/* Piggy Bank Icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2A3A1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.5-1 2-3 2-5-1.5 0-3 .5-4 1.5M9 7h1M6 14h.01M10 14h.01M14 14h.01M3 13c0 4 3 7 7 7h4c4 0 7-3 7-7 0-4-3-7-7-7H8L4 9v4z" />
                </svg>
              </span>
              <div className="lgr-header-text">
                <h2 className="lgr-title">Total Shared Savings</h2>
                <p className="lgr-subtitle">Set a goal for how much you want to save together.</p>
              </div>
            </div>

            {/* Goal Input Field */}
            <div className="lgr-goal-box">
              <span className="lgr-input-icon-left" aria-hidden="true">
                {/* Bullseye / Target Icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="2" />
                </svg>
              </span>
              <span className="lgr-v-divider" aria-hidden="true" />
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Input target goal"
                inputMode="decimal"
                pattern="\d+(\.\d{1,2})?"
                className="lgr-input-field"
                required
              />
              <span className="lgr-v-divider" aria-hidden="true" />
              <span className="lgr-peso-sign">₱</span>
            </div>
          </div>

          {/* SECTION: Invite Recipients */}
          <div className="lgr-section">
            <div className="lgr-header">
              <span className="lgr-badge" aria-hidden="true">
                {/* Users / People Plus Icon */}
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2A3A1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </span>
              <div className="lgr-header-text">
                <h2 className="lgr-title">Invite Recipients</h2>
                <p className="lgr-subtitle">Add people who will receive a share of the savings.</p>
              </div>
            </div>

            {/* Recipient Rows */}
            <div className="lgr-recipients-list">
              {rows.map((r, i) => (
                <div className="lgr-recipient-row" key={i}>
                  {/* Email Input */}
                  <div className="lgr-email-box">
                    <span className="lgr-input-icon-left" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <span className="lgr-v-divider" aria-hidden="true" />
                    <input
                      type="email"
                      value={r.email}
                      onChange={(e) => setRow(i, { email: e.target.value })}
                      placeholder="Add recipient email"
                      className="lgr-input-field"
                    />
                  </div>

                  {/* Divided Value Input */}
                  <div className="lgr-share-box">
                    <input
                      type="text"
                      value={r.share}
                      onChange={(e) => setRow(i, { share: e.target.value })}
                      placeholder="Input divided value"
                      inputMode="decimal"
                      pattern="\d+(\.\d{1,2})?"
                      className="lgr-input-field"
                    />
                    <span className="lgr-peso-sign">₱</span>
                  </div>
                </div>
              ))}

              {/* Add New Recipient Button */}
              <div className="lgr-add-row">
                <button
                  type="button"
                  className="lgr-add-btn"
                  onClick={() => setRows((prev) => [...prev, { email: "", share: "" }])}
                >
                  <span className="lgr-add-plus">+</span>
                  <span>Add new recipient</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION: Contract Date */}
          <div className="lgr-section lgr-contract-section" ref={calRef}>
            <div className="lgr-header">
              <span className="lgr-badge" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A3A1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 9h18M6 2v3M10 2v3M14 2v3M18 2v3M7 13h10M7 17h6" />
                </svg>
              </span>
              <div className="lgr-header-text">
                <h2 className="lgr-title">Contract Date</h2>
                <p className="lgr-subtitle">Set a deadline goal</p>
              </div>
            </div>

            <div className="lgr-date-inputs-row">
              {/* Start Date Button */}
              <div
                className={`lgr-date-field ${calTarget === "start" ? "is-focused" : ""}`}
                onClick={() => openCalendar("start")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openCalendar("start")}
              >
                <span className="lgr-date-label">Start date:</span>
                <span className={`lgr-date-val ${!start ? "is-placeholder" : ""}`}>
                  {formatDateDisplay(start)}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A3A1C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="lgr-date-ico" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 9h18M6 2v3M10 2v3M14 2v3M18 2v3M7 13h10M7 17h6" />
                </svg>
              </div>

              {/* Deadline Date Button */}
              <div
                className={`lgr-date-field ${calTarget === "deadline" ? "is-focused" : ""}`}
                onClick={() => openCalendar("deadline")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openCalendar("deadline")}
              >
                <span className="lgr-date-label">Deadline date:</span>
                <span className={`lgr-date-val ${!deadline ? "is-placeholder" : ""}`}>
                  {formatDateDisplay(deadline)}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A3A1C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="lgr-date-ico" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M3 9h18M6 2v3M10 2v3M14 2v3M18 2v3M7 13h10M7 17h6" />
                </svg>
              </div>
            </div>

            {/* Custom 2026 Calendar Popover (Figma Spec) */}
            {calTarget && (
              <div className="lgr-cal-popover" onClick={(e) => e.stopPropagation()}>
                <div className="lgr-cal-header">
                  <span className="lgr-cal-title">
                    {calYear}-{String(calMonth + 1).padStart(2, "0")} ({MONTH_NAMES[calMonth]})
                  </span>
                  <div className="lgr-cal-navs">
                    <button
                      type="button"
                      className="lgr-cal-nav-btn"
                      onClick={() => {
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear((y) => y - 1);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      aria-label="Previous month"
                    >
                      &#x2039;
                    </button>
                    <button
                      type="button"
                      className="lgr-cal-nav-btn"
                      onClick={() => {
                        if (calMonth === 11) {
                          setCalMonth(0);
                          setCalYear((y) => y + 1);
                        } else {
                          setCalMonth((m) => m + 1);
                        }
                      }}
                      aria-label="Next month"
                    >
                      &#x203A;
                    </button>
                  </div>
                </div>

                {/* Weekdays Row: Mon, Tue, Wed, Thu, Fri, Sat, Sun */}
                <div className="lgr-cal-weekdays">
                  <span className="lgr-cal-weekday">Mon</span>
                  <span className="lgr-cal-weekday">Tue</span>
                  <span className="lgr-cal-weekday">Wed</span>
                  <span className="lgr-cal-weekday">Thu</span>
                  <span className="lgr-cal-weekday">Fri</span>
                  <span className="lgr-cal-weekday is-weekend">Sat</span>
                  <span className="lgr-cal-weekday is-weekend">Sun</span>
                </div>

                {/* Cell Divider Line */}
                <div className="lgr-cal-divider" />

                {/* Day Cells Matrix */}
                <div className="lgr-cal-days">
                  {getCalendarDays(calYear, calMonth).map((d) => {
                    const isStart = d.iso === start;
                    const isDeadline = d.iso === deadline;
                    const isSelected = isStart || isDeadline;
                    const isInRange = start && deadline && d.iso > start && d.iso < deadline;

                    return (
                      <button
                        key={d.iso}
                        type="button"
                        className={`lgr-cal-day ${d.isWeekend ? "is-weekend" : ""} ${
                          !d.isCurrentMonth ? "is-other-month" : ""
                        } ${isSelected ? "is-selected" : ""} ${isInRange ? "is-in-range" : ""}`}
                        onClick={() => {
                          if (calTarget === "start") {
                            setStart(d.iso);
                            if (deadline && d.iso > deadline) {
                              setDeadline(d.iso);
                            }
                            setCalTarget("deadline");
                          } else {
                            if (start && d.iso < start) {
                              setStart(d.iso);
                            }
                            setDeadline(d.iso);
                            setCalTarget(null);
                          }
                        }}
                      >
                        {d.day}
                      </button>
                    );
                  })}
                </div>

                <div className="lgr-cal-footer">
                  <span className="lgr-cal-status">
                    Picking: <b>{calTarget === "start" ? "Start Date" : "Deadline Date"}</b>
                  </span>
                  <button
                    type="button"
                    className="lgr-cal-close-btn"
                    onClick={() => setCalTarget(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION: Contract Signature (Below Contract Date) */}
          <div className="lgr-section lgr-sig-section">
            <div className="lgr-header">
              <span className="lgr-badge" aria-hidden="true">
                {/* Pencil / Pen Icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A3A1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </span>
              <div className="lgr-header-text">
                <h2 className="lgr-title">Contract Signature</h2>
                <p className="lgr-subtitle">Set a deadline goal</p>
              </div>
            </div>

            {/* E-Signature Photo Upload */}
            <div
              className={`lgr-signature-box lgr-photo-box ${signaturePhoto ? "has-photo" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              aria-label="Upload signature photo"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: "none" }}
              />

              {signaturePhoto ? (
                <div className="lgr-sig-preview-wrapper">
                  <img src={signaturePhoto} alt="E-signature preview" className="lgr-sig-preview-img" />
                  <span className="lgr-sig-preview-name">Signature photo attached</span>
                  <button
                    type="button"
                    className="lgr-sig-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSignaturePhoto(null);
                      setSignature("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="Remove signature photo"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <>
                  <span className="lgr-sig-placeholder">Input e-signature</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2A3A1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lgr-sig-ico" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </>
              )}
            </div>
          </div>

          {/* FOOTER: Summary Bar & Save Button */}
          <div className="lgr-footer-row">
            <div className="lgr-summary-pill">
              <div className="lgr-summary-left">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <div className="lgr-summary-info">
                  <strong className="lgr-summary-title">
                    {filled.length || rows.length} Total Recipients
                  </strong>
                  <span className="lgr-summary-sub">
                    Total Distributions: {pct}%
                  </span>
                </div>
              </div>

              <div className="lgr-summary-right">
                <strong className="lgr-summary-valid">
                  {signature.trim() ? "Valid E-Signature" : ""}
                </strong>
                <span className="lgr-summary-dates">
                  {start && `Start: ${start}`}{start && deadline && "\u00a0\u00a0"}{deadline && `Till: ${deadline}`}
                </span>
              </div>
            </div>

            <button type="submit" className="lgr-submit-btn">
              Save &amp; Continue
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
