"use client";
import { FormEvent, useEffect, useState } from "react";
type State = { founder?: boolean; unlocked?: boolean };
const controls = [
  ["Academy applications", "Review, approve, and lock academy entity applications.", "/academy"],
  [
    "Academy entity profile",
    "Edit organization identity, staff, hours, links, and affiliations.",
    "/academy/profile",
  ],
  [
    "Revenue governance",
    "Review partner economics, payout readiness, and revenue controls.",
    "/academy/payouts",
  ],
  [
    "Data retention",
    "Control local archive, export, storage, and historical recordkeeping.",
    "/archive",
  ],
  [
    "Platform settings",
    "Manage account privacy, consent, deletion, and service settings.",
    "/settings",
  ],
  ["Performance operations", "Return to the operating dashboard and governed workflows.", "/"],
];
export default function GovernanceClient() {
  const [state, setState] = useState<State>({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(true);
  async function status() {
    const r = await fetch("/api/governance/unlock", { cache: "no-store" }),
      body = await r.json().catch(() => ({}));
    setState(r.ok ? body : {});
    setBusy(false);
  }
  useEffect(() => {
    void status();
  }, []);
  async function unlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/governance/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      }),
      body = await r.json().catch(() => ({}));
    setMessage(String(body.message || body.error || "Governance request could not be completed."));
    if (r.ok) e.currentTarget.reset();
    await status();
  }
  async function lock() {
    setBusy(true);
    const r = await fetch("/api/governance/unlock", { method: "DELETE" }),
      body = await r.json().catch(() => ({}));
    setMessage(String(body.message || "Governance authority locked."));
    await status();
  }
  return (
    <main className="governance-shell">
      <header>
        <a
          className="governance-emblem"
          href="/"
          aria-label="Return to MatIQ performance dashboard"
        >
          <img src="/matiq-emblem.png" alt="" />
        </a>
        <div>
          <p>MATIQ GOVERNANCE LAYER</p>
          <h1>Executive Control</h1>
          <span>
            Authenticated, time-bound authority for platform administration and approvals.
          </span>
        </div>
        <a href="/">Return to performance →</a>
      </header>
      {message && (
        <div className="governance-notice" role="status">
          {message}
        </div>
      )}
      {busy ? (
        <section className="governance-lock">
          <p>Verifying governance authority…</p>
        </section>
      ) : !state.founder ? (
        <section className="governance-lock">
          <p>RESTRICTED AUTHORITY</p>
          <h2>Founder authentication required</h2>
          <span>
            This layer is available only to the authenticated MatIQ bootstrap owner. A passcode
            alone cannot grant access.
          </span>
        </section>
      ) : !state.unlocked ? (
        <section className="governance-lock">
          <p>EXECUTIVE STEP-UP</p>
          <h2>Unlock governance controls</h2>
          <span>
            Enter an authorized executive passcode. Five attempts are permitted per hour; successful
            sessions expire automatically after 30 minutes.
          </span>
          <form onSubmit={unlock}>
            <label>
              Governance passcode
              <input name="passcode" type="password" autoComplete="off" required autoFocus />
            </label>
            <button disabled={busy}>Unlock governance</button>
          </form>
          <small>Passcodes are verified server-side and are never stored in browser code.</small>
        </section>
      ) : (
        <>
          <section className="governance-status">
            <div>
              <i />
              GOVERNANCE UNLOCKED
            </div>
            <span>BB · Founder authority active</span>
            <button onClick={lock}>Lock now</button>
          </section>
          <section className="governance-grid">
            {controls.map(([title, text, href]) => (
              <a href={href} key={title}>
                <small>GOVERNED CONTROL</small>
                <h2>{title}</h2>
                <p>{text}</p>
                <b>Open control →</b>
              </a>
            ))}
          </section>
          <section className="governance-guardrail">
            <b>Non-bypassable safeguards</b>
            <span>
              Governance authority does not waive athlete identity verification, age or belt
              validation, guardian consent, media permissions, safeguarding review, instructor
              promotion authority, or payment controls.
            </span>
          </section>
        </>
      )}
    </main>
  );
}
