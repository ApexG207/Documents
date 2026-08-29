"use client";
import { FormEvent, useEffect, useState } from "react";
type Row = Record<string, string | number | null>;
type Data = {
  portfolio: Row | null;
  results: Row[];
  externalProfiles: Row[];
  evidence: Row[];
  summary: Row;
};
const empty: Data = {
  portfolio: null,
  results: [],
  externalProfiles: [],
  evidence: [],
  summary: { events: 0, wins: 0, losses: 0, draws: 0, submissionWins: 0, podiums: 0, verified: 0 },
};
export default function PortfolioClient() {
  const [data, setData] = useState<Data>(empty),
    [notice, setNotice] = useState("");
  async function load() {
    const r = await fetch("/api/competition-portfolio");
    if (r.ok) setData(await r.json());
  }
  useEffect(() => {
    void load();
  }, []);
  async function jsonSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget)),
      r = await fetch("/api/competition-portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      result = await r.json().catch(() => ({}));
    setNotice(
      r.ok
        ? "Competition portfolio updated."
        : String(result.error || "Record could not be saved."),
    );
    if (r.ok) {
      e.currentTarget.reset();
      void load();
    }
  }
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = await fetch("/api/competition-evidence", {
        method: "POST",
        body: new FormData(e.currentTarget),
      }),
      result = await r.json().catch(() => ({}));
    setNotice(
      r.ok
        ? "Evidence secured and queued for verification."
        : String(result.error || "Evidence upload failed."),
    );
    if (r.ok) {
      e.currentTarget.reset();
      void load();
    }
  }
  const s = data.summary,
    total = Number(s.wins || 0) + Number(s.losses || 0) + Number(s.draws || 0),
    rate = total ? Math.round((Number(s.wins || 0) / total) * 100) : 0;
  return (
    <main className="portfolio-shell">
      <header>
        <div>
          <p>ATHLETE COMPETITION INTELLIGENCE</p>
          <h1>Competition Portfolio</h1>
          <span>
            One governed record across events, evidence, video, and official competition sources.
          </span>
        </div>
        <a href="/">Return to performance →</a>
      </header>
      {notice && (
        <div className="portfolio-notice" role="status">
          {notice}
        </div>
      )}
      <section className="portfolio-stats">
        <article>
          <strong>{String(s.events || 0)}</strong>
          <span>Events</span>
        </article>
        <article>
          <strong>
            {String(s.wins || 0)}–{String(s.losses || 0)}
          </strong>
          <span>Win–loss</span>
        </article>
        <article>
          <strong>{rate}%</strong>
          <span>Win rate</span>
        </article>
        <article>
          <strong>{String(s.podiums || 0)}</strong>
          <span>Podiums</span>
        </article>
        <article>
          <strong>{String(s.submissionWins || 0)}</strong>
          <span>Submissions</span>
        </article>
        <article>
          <strong>{String(s.verified || 0)}</strong>
          <span>Verified results</span>
        </article>
      </section>
      <section className="portfolio-grid">
        <form onSubmit={jsonSubmit}>
          <input type="hidden" name="action" value="portfolio" />
          <p>PORTFOLIO IDENTITY</p>
          <h2>{data.portfolio ? "Update athlete record" : "Create athlete record"}</h2>
          <label>
            Display name
            <input
              name="displayName"
              defaultValue={String(data.portfolio?.displayName || "")}
              required
            />
          </label>
          <label>
            Competition name
            <input
              name="competitionName"
              defaultValue={String(data.portfolio?.competitionName || "")}
              required
            />
          </label>
          <div className="form-pair">
            <label>
              Birth year
              <input
                name="birthYear"
                type="number"
                min="1920"
                max={new Date().getFullYear()}
                defaultValue={String(data.portfolio?.birthYear || "")}
              />
            </label>
            <label>
              Current rank
              <input name="currentRank" defaultValue={String(data.portfolio?.currentRank || "")} />
            </label>
          </div>
          <label>
            Academy
            <input name="academyName" defaultValue={String(data.portfolio?.academyName || "")} />
          </label>
          <label>
            Visibility
            <select
              name="visibility"
              defaultValue={String(data.portfolio?.visibility || "private")}
            >
              <option value="private">Private</option>
              <option value="connections">Coaches and connections</option>
              <option value="public">Public portfolio</option>
            </select>
          </label>
          <button>Save portfolio identity</button>
        </form>
        <form onSubmit={jsonSubmit}>
          <input type="hidden" name="action" value="external_profile" />
          <p>OFFICIAL SOURCE LINKS</p>
          <h2>Cross-reference profiles</h2>
          <label>
            Competition platform
            <select name="provider">
              <option>Smoothcomp</option>
              <option>IBJJF</option>
              <option>Jiu-Jitsu World League</option>
              <option>Grappling Industries</option>
              <option>ADCC</option>
              <option>NAGA</option>
              <option>AJP Tour</option>
              <option>Other official source</option>
            </select>
          </label>
          <label>
            Official profile URL
            <input name="profileUrl" type="url" placeholder="https://" required />
          </label>
          <label>
            External athlete ID
            <input name="externalAthleteId" />
          </label>
          <label>
            Name shown by source
            <input name="claimedName" />
          </label>
          <div className="source-rule">
            <b>Provenance control</b>
            <span>
              Links are treated as unverified until identity and record evidence agree. MatIQ does
              not scrape or alter the source platform.
            </span>
          </div>
          <button disabled={!data.portfolio}>Link official profile</button>
          {data.externalProfiles.map((x) => (
            <div className="source-link" key={String(x.id)}>
              <b>{String(x.provider)}</b>
              <span>{String(x.matchStatus)}</span>
              <a href={String(x.profileUrl)} target="_blank" rel="noreferrer">
                Open source ↗
              </a>
            </div>
          ))}
        </form>
      </section>
      <section className="portfolio-grid result-entry">
        <form onSubmit={jsonSubmit}>
          <input type="hidden" name="action" value="result" />
          <p>COMPETITION RESULT</p>
          <h2>Add event record</h2>
          <div className="form-pair">
            <label>
              Event name
              <input name="eventName" required />
            </label>
            <label>
              Organizer
              <input name="organizer" required />
            </label>
          </div>
          <div className="form-pair">
            <label>
              Event date
              <input name="eventDate" type="date" required />
            </label>
            <label>
              Location
              <input name="locationText" />
            </label>
          </div>
          <div className="form-pair">
            <label>
              Discipline
              <select name="discipline">
                <option>Gi</option>
                <option>No-Gi</option>
                <option>Both</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Placement
              <input name="placement" type="number" min="1" />
            </label>
          </div>
          <div className="form-triple">
            <label>
              Age division
              <input name="ageDivision" />
            </label>
            <label>
              Belt division
              <input name="beltDivision" />
            </label>
            <label>
              Weight division
              <input name="weightDivision" />
            </label>
          </div>
          <div className="form-four">
            <label>
              Wins
              <input name="wins" type="number" min="0" defaultValue="0" />
            </label>
            <label>
              Losses
              <input name="losses" type="number" min="0" defaultValue="0" />
            </label>
            <label>
              Draws
              <input name="draws" type="number" min="0" defaultValue="0" />
            </label>
            <label>
              Subs
              <input name="submissionWins" type="number" min="0" defaultValue="0" />
            </label>
          </div>
          <label>
            Official result URL
            <input name="sourceUrl" type="url" placeholder="https://" />
          </label>
          <label>
            Source record ID
            <input name="sourceRecordId" />
          </label>
          <button disabled={!data.portfolio}>Add self-reported result</button>
        </form>
        <form onSubmit={upload}>
          <p>EVIDENCE INTAKE</p>
          <h2>Upload verification evidence</h2>
          <label>
            Associated result
            <select name="resultId">
              <option value="">Portfolio-level evidence</option>
              {data.results.map((x) => (
                <option key={String(x.id)} value={String(x.id)}>
                  {String(x.eventName)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evidence type
            <select name="evidenceType">
              <option value="official_export">Official export</option>
              <option value="result_page">Result-page capture</option>
              <option value="bracket">Bracket</option>
              <option value="medal_certificate">Medal or certificate</option>
              <option value="registration_receipt">Registration receipt</option>
            </select>
          </label>
          <label>
            Source provider
            <input name="sourceProvider" placeholder="Smoothcomp, IBJJF, JJWL…" />
          </label>
          <label>
            File
            <input
              name="evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,text/csv"
              required
            />
          </label>
          <small>JPEG, PNG, WebP, PDF, or CSV · Maximum 10 MB</small>
          <button disabled={!data.portfolio}>Secure evidence upload</button>
          <div className="source-rule">
            <b>Evidence classification</b>
            <span>
              User upload → submitted → source-matched → coach/reviewer verified or conflict
              flagged.
            </span>
          </div>
        </form>
      </section>
      <section className="record-ledger">
        <div>
          <p>COMPETITION LEDGER</p>
          <h2>Chronological record</h2>
        </div>
        {data.results.length === 0 ? (
          <article className="record-empty">No competition results recorded.</article>
        ) : (
          data.results.map((x) => (
            <article key={String(x.id)}>
              <time>{new Date(Number(x.eventDate)).toLocaleDateString()}</time>
              <div>
                <b>{String(x.eventName)}</b>
                <span>
                  {String(x.organizer)} · {String(x.discipline)} ·{" "}
                  {String(x.beltDivision || "Division unlisted")}
                </span>
              </div>
              <strong>{Number(x.placement) ? `#${x.placement}` : "—"}</strong>
              <em>
                {String(x.wins)}W · {String(x.losses)}L · {String(x.submissionWins)} SUB
              </em>
              <small className={`status ${String(x.verificationStatus)}`}>
                {String(x.verificationStatus)}
              </small>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
