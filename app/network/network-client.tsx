"use client";
import { FormEvent, useEffect, useState } from "react";
type Row = Record<string, string | number | boolean | null>;
const parsed = (value: unknown, fallback: unknown) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value || fallback;
  } catch {
    return fallback;
  }
};
const labels: Record<string, string> = {
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
};
function EntityMeta({ row }: { row: Row }) {
  const links = parsed(row.socialLinks || row.socialLinksJson, {}) as Record<string, string>,
    teams = parsed(row.teamAffiliations || row.teamAffiliationsJson, []) as string[];
  return (
    <div className="entity-meta">
      {teams.length > 0 && (
        <div className="team-affiliations">
          <b>Team affiliation(s)</b>
          {teams.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      )}
      {Object.keys(links).length > 0 && (
        <div className="social-links">
          <b>Social media</b>
          {Object.entries(links).map(([k, v]) => (
            <a key={k} href={v} target="_blank" rel="noreferrer noopener">
              {labels[k] || k} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
export default function NetworkClient() {
  const [directory, setDirectory] = useState<Row[]>([]),
    [athletes, setAthletes] = useState<Row[]>([]),
    [profile, setProfile] = useState<Row>({}),
    [network, setNetwork] = useState<{ connections: Row[]; bookings: Row[] }>({
      connections: [],
      bookings: [],
    }),
    [message, setMessage] = useState("");
  async function load() {
    const [d, a, p, n] = await Promise.all([
      fetch("/api/academies/directory").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/athletes/directory").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/profile").then((r) => (r.ok ? r.json() : {})),
      fetch("/api/network").then((r) => (r.ok ? r.json() : { connections: [], bookings: [] })),
    ]);
    setDirectory(d);
    setAthletes(a);
    setProfile(p);
    setNetwork(n);
  }
  useEffect(() => {
    void load();
  }, []);
  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget)),
      r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, bookingEnabled: true }),
      });
    setMessage(r.ok ? "Athlete intelligence profile saved." : "Profile could not be saved.");
    if (r.ok) void load();
  }
  async function request(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget)),
      r = await fetch("/api/network", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    setMessage(r.ok ? "Request sent to the academy." : "Request could not be completed.");
    if (r.ok) void load();
  }
  const links = parsed(profile.socialLinks, {}) as Record<string, string>,
    teams = parsed(profile.teamAffiliations, []) as string[];
  return (
    <main className="network-shell">
      <header className="network-head">
        <div>
          <p>MATIQ NETWORK</p>
          <h1>Athletes × Academies</h1>
          <span>Find the right room. Connect directly. Train with purpose.</span>
        </div>
        <a href="/">Return to performance →</a>
      </header>
      {message && (
        <div className="network-notice" role="status">
          {message}
        </div>
      )}
      <section className="network-stats">
        <article>
          <strong>{directory.length}</strong>
          <span>Published academies</span>
        </article>
        <article>
          <strong>{athletes.length}</strong>
          <span>Public athletes</span>
        </article>
        <article>
          <strong>{network.connections.length}</strong>
          <span>Direct connections</span>
        </article>
        <article>
          <strong>10%</strong>
          <span>Academy revenue share</span>
        </article>
      </section>
      <section className="network-grid">
        <form className="network-card profile-form" onSubmit={saveProfile}>
          <p>INDIVIDUAL INTELLIGENCE PROFILE</p>
          <h2>Your development picture</h2>
          <label>
            Name
            <input name="displayName" defaultValue={String(profile.displayName || "")} required />
          </label>
          <div className="network-pair">
            <label>
              Location
              <input name="locationText" defaultValue={String(profile.locationText || "")} />
            </label>
            <label>
              Rank
              <input name="belt" defaultValue={String(profile.belt || "")} />
            </label>
          </div>
          <label>
            Goals
            <textarea name="goals" defaultValue={String(profile.goals || "")} />
          </label>
          <label>
            Team affiliation(s)
            <textarea
              name="teamAffiliations"
              defaultValue={teams.join("\n")}
              placeholder="One team, association, or lineage per line"
            />
          </label>
          <div className="network-pair">
            <label>
              Instagram
              <input name="socialInstagram" type="url" defaultValue={links.instagram || ""} />
            </label>
            <label>
              Facebook
              <input name="socialFacebook" type="url" defaultValue={links.facebook || ""} />
            </label>
            <label>
              TikTok
              <input name="socialTiktok" type="url" defaultValue={links.tiktok || ""} />
            </label>
            <label>
              YouTube
              <input name="socialYoutube" type="url" defaultValue={links.youtube || ""} />
            </label>
          </div>
          <label>
            Visibility
            <select name="visibility" defaultValue={String(profile.visibility || "private")}>
              <option value="private">Private</option>
              <option value="connections">Connections</option>
              <option value="public">Public</option>
            </select>
          </label>
          <button>Save governed profile</button>
        </form>
        <aside className="network-card revenue">
          <p>ACADEMY PARTNER ECONOMY</p>
          <h2>Grow the network. Share the value.</h2>
          <strong>10%</strong>
          <p>
            Verified academies can earn ten percent of eligible net MatIQ subscription revenue
            attributable to their members and referrals.
          </p>
          <ul>
            <li>Verified attribution</li>
            <li>Auditable revenue ledger</li>
            <li>Refund and chargeback reversals</li>
            <li>Governed payout approval</li>
          </ul>
          <a href="#directory">Claim or register an academy →</a>
        </aside>
      </section>
      <section className="directory">
        <div className="directory-title">
          <p>ATHLETE DIRECTORY</p>
          <h2>Discover individual athletes</h2>
        </div>
        {athletes.length === 0 ? (
          <div className="network-empty">
            <h3>No public athlete cards yet.</h3>
            <p>Athletes control whether their profile is discoverable.</p>
          </div>
        ) : (
          <div className="academy-grid">
            {athletes.map((a, i) => (
              <article
                className="academy-result athlete-result"
                key={`${String(a.displayName)}-${i}`}
              >
                <small>{String(a.locationText || "Location private")}</small>
                <h3>{String(a.displayName)}</h3>
                <p>{String(a.belt || "Rank not listed")}</p>
                <EntityMeta row={a} />
              </article>
            ))}
          </div>
        )}
      </section>
      <section id="directory" className="directory">
        <div className="directory-title">
          <p>ACADEMY DIRECTORY</p>
          <h2>Discover training partners</h2>
        </div>
        {directory.length === 0 ? (
          <div className="network-empty">
            <h3>The academy network is opening.</h3>
            <p>
              Complete and submit an academy entity profile to become discoverable after
              verification.
            </p>
          </div>
        ) : (
          <div className="academy-grid">
            {directory.map((a) => (
              <article className="academy-result" key={String(a.academyId)}>
                <small>
                  {String(a.city)}, {String(a.region)}
                </small>
                <h3>{String(a.displayName)}</h3>
                <p>{String(a.description)}</p>
                <EntityMeta row={a} />
                <div>
                  <span>★ {String(a.rating || "New")}</span>
                  <span>{String(a.reviewCount || 0)} reviews</span>
                </div>
                <form onSubmit={request}>
                  <input type="hidden" name="kind" value="connection" />
                  <input type="hidden" name="academyId" value={String(a.academyId)} />
                  <input type="hidden" name="connectionType" value="cross_training" />
                  <textarea
                    name="message"
                    placeholder="Introduce yourself or request cross-training."
                    required
                  />
                  <button>Connect directly</button>
                </form>
                <form onSubmit={request}>
                  <input type="hidden" name="kind" value="booking" />
                  <input type="hidden" name="academyId" value={String(a.academyId)} />
                  <input type="hidden" name="offeringType" value="Cross-training" />
                  <input type="datetime-local" name="startAt" required />
                  <input
                    type="number"
                    name="durationMinutes"
                    min="30"
                    max="240"
                    defaultValue="60"
                  />
                  <button>Request booking</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
