"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  BrainCircuit,
  Building2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Users,
  Video as VideoIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
type View =
  | "command"
  | "video"
  | "calendar"
  | "skills"
  | "promotion"
  | "goals"
  | "athletes"
  | "network"
  | "operations";
type Athlete = {
  id: string;
  alias: string;
  birthYear: number;
  belt: string;
  consentStatus: string;
};
type RecordRow = Record<string, string | number | null>;
const nav: [View, string, LucideIcon][] = [
  ["command", "Command", LayoutDashboard],
  ["video", "Video Intelligence", VideoIcon],
  ["calendar", "Training Calendar", CalendarDays],
  ["skills", "Skill Development", BrainCircuit],
  ["promotion", "Promotion Progress", Award],
  ["goals", "Goals & Plans", Target],
  ["athletes", "Athletes", Users],
  ["network", "Academy Network", Building2],
  ["operations", "Operations", ShieldCheck],
];
const endpoint: Record<string, string> = {
  athlete: "/api/athletes",
  training: "/api/training",
  skill: "/api/skills",
  promotion: "/api/promotions",
  video: "/api/media",
  goal: "/api/goals",
  block: "/api/training-blocks",
};
function Meter({ value }: { value: number }) {
  return (
    <span className="x-meter">
      <i style={{ width: `${value}%` }} />
      <b>{Math.round(value)}</b>
    </span>
  );
}
function Lead({
  tag,
  title,
  text,
  action,
  run,
}: {
  tag: string;
  title: string;
  text: string;
  action?: string;
  run?: () => void;
}) {
  return (
    <div className="x-lead">
      <div>
        <p>{tag}</p>
        <h2>{title}</h2>
        <span>{text}</span>
      </div>
      {action && (
        <button className="primary" onClick={run}>
          {action}
        </button>
      )}
    </div>
  );
}
function Empty({ text, action, run }: { text: string; action: string; run: () => void }) {
  return (
    <div className="x-empty">
      <i>
        <Sparkles size={28} />
      </i>
      <h3>{text}</h3>
      <button onClick={run}>{action}</button>
    </div>
  );
}
function Command({ go, counts }: { go: (v: View) => void; counts: Record<string, number> }) {
  const cards: [[string, string], ...[string, string][]] = [
    [String(counts.athletes || 0), "ACTIVE ATHLETES"],
    [String(counts.training || 0), "TRAINING RECORDS"],
    [String(counts.evaluations || 0), "VIDEO REVIEWS"],
    [String(counts.skills || 0), "SKILL EVIDENCE"],
  ];
  const metricIcons = [Users, Activity, VideoIcon, ChartNoAxesColumnIncreasing];
  return (
    <section className="x-page">
      <div className="x-status">
        <span>
          <i />
          LIVE DATA SYSTEM
        </span>
        <b>Evidence-linked athlete development</b>
        <button onClick={() => go("athletes")}>
          Open roster <ArrowRight size={14} />
        </button>
      </div>
      <div className="x-summary">
        {cards.map((x, index) => {
          const Icon = metricIcons[index];
          return (
            <article key={x[1]}>
              <i>
                <Icon size={17} />
              </i>
              <strong>{x[0]}</strong>
              <small>{x[1]}</small>
            </article>
          );
        })}
      </div>
      <div className="x-grid-2">
        <article className="x-card">
          <header>
            <div>
              <p>OPERATING PICTURE</p>
              <h3>Performance domains</h3>
            </div>
          </header>
          {[
            ["Technical capability", 82],
            ["Training consistency", 86],
            ["Competition evidence", 74],
            ["Promotion readiness", 79],
          ].map((x) => (
            <div className="x-line" key={x[0] as string}>
              <span>{x[0]}</span>
              <Meter value={x[1] as number} />
            </div>
          ))}
        </article>
        <article className="x-ai">
          <div className="x-ai-orbit">
            <BrainCircuit size={28} />
          </div>
          <p>MATIQ INTELLIGENCE</p>
          <h3>Evidence-to-action loop</h3>
          <blockquote>
            Capture the match, identify the decisive sequence, prescribe the next training
            constraint, and reassess performance.
          </blockquote>
          <button onClick={() => go("video")}>
            Open intelligence queue <ArrowRight size={14} />
          </button>
        </article>
      </div>
      <div className="x-action-grid">
        {nav.slice(1, 5).map(([key, label, Icon]) => (
          <button key={key} onClick={() => go(key)}>
            <i>
              <Icon size={17} />
            </i>
            <b>{label}</b>
            <small>Open live workspace</small>
            <em>
              <ArrowRight size={14} />
            </em>
          </button>
        ))}
      </div>
    </section>
  );
}
function Athletes({ items, open }: { items: Athlete[]; open: (k: string) => void }) {
  return (
    <section className="x-page">
      <Lead
        tag="WHOLE-CAREER RECORD"
        title="Athlete Registry"
        text="Live governed profiles for youth, adult, masters, recreational, and competitive athletes."
        action="＋ Add athlete"
        run={() => open("athlete")}
      />
      {items.length === 0 ? (
        <Empty
          text="No athlete profiles yet"
          action="Create first athlete"
          run={() => open("athlete")}
        />
      ) : (
        <article className="x-card">
          <header>
            <div>
              <p>LIVE ROSTER</p>
              <h3>{items.length} active athletes</h3>
            </div>
          </header>
          {items.map((a) => {
            const age = new Date().getFullYear() - a.birthYear;
            return (
              <div className="x-athlete" key={a.id}>
                <i>{a.alias.slice(0, 2).toUpperCase()}</i>
                <div>
                  <b>{a.alias}</b>
                  <small>
                    {age < 18 ? "Youth" : age >= 35 ? "Masters" : "Adult"} · {a.belt}
                  </small>
                </div>
                <Meter value={age < 18 ? 74 : 82} />
                <em>{a.consentStatus}</em>
                <button onClick={() => open(`profile:${a.id}`)}>Profile →</button>
              </div>
            );
          })}
        </article>
      )}
    </section>
  );
}
function Training({ items, open }: { items: RecordRow[]; open: (k: string) => void }) {
  const minutes = items.reduce((s, x) => s + Number(x.durationMinutes || 0), 0);
  return (
    <section className="x-page">
      <Lead
        tag="TRAINING CONTROL"
        title="Training Calendar"
        text="Live attendance, workload, intensity, and development-focus records."
        action="＋ Log session"
        run={() => open("training")}
      />
      <div className="x-summary">
        <article>
          <strong>{items.length}</strong>
          <small>SESSIONS LOGGED</small>
        </article>
        <article>
          <strong>{minutes}</strong>
          <small>MINUTES</small>
        </article>
        <article>
          <strong>
            {items.length
              ? Math.round(
                  (items.reduce((s, x) => s + Number(x.intensity || 0), 0) / items.length) * 10,
                ) / 10
              : 0}
          </strong>
          <small>AVG INTENSITY</small>
        </article>
        <article>
          <strong>{new Set(items.map((x) => x.athleteId)).size}</strong>
          <small>ATHLETES TRAINING</small>
        </article>
      </div>
      {items.length === 0 ? (
        <Empty
          text="No training sessions recorded"
          action="Log first session"
          run={() => open("training")}
        />
      ) : (
        <article className="x-card">
          <header>
            <div>
              <p>RECENT SESSIONS</p>
              <h3>Training ledger</h3>
            </div>
          </header>
          {items.slice(0, 12).map((x) => (
            <div className="x-review" key={String(x.id)}>
              <span className="x-play">▦</span>
              <div>
                <b>{String(x.sessionType)}</b>
                <small>{String(x.focus)}</small>
              </div>
              <Meter value={Number(x.intensity) * 10} />
              <em>{String(x.durationMinutes)} min</em>
            </div>
          ))}
        </article>
      )}
    </section>
  );
}
function Skills({ items, open }: { items: RecordRow[]; open: (k: string) => void }) {
  const domains = ["Takedowns", "Guard", "Passing", "Control", "Escapes", "Submissions"];
  return (
    <section className="x-page">
      <Lead
        tag="CAPABILITY DEVELOPMENT"
        title="Skill Development Matrix"
        text="Live coach assessments supported by observable evidence."
        action="＋ Add assessment"
        run={() => open("skill")}
      />
      <div className="x-skill-grid">
        {domains.map((d) => {
          const found = items.filter((x) => x.domain === d);
          const score = found.length
            ? found.reduce((s, x) => s + Number(x.level) * 20, 0) / found.length
            : 0;
          return (
            <article className="x-card" key={d}>
              <header>
                <div>
                  <p>DOMAIN</p>
                  <h3>{d}</h3>
                </div>
                <strong className="x-score">{Math.round(score)}</strong>
              </header>
              <Meter value={score} />
              <small>{found.length} evidence records</small>
              <footer>
                <span>{score >= 80 ? "Applied" : score >= 60 ? "Functional" : "Developing"}</span>
                <button onClick={() => open("skill")}>Assess →</button>
              </footer>
            </article>
          );
        })}
      </div>
      {items.length === 0 && (
        <Empty
          text="No skill evidence recorded"
          action="Create first assessment"
          run={() => open("skill")}
        />
      )}
    </section>
  );
}
function Promotions({ items, open }: { items: RecordRow[]; open: (k: string) => void }) {
  const latest = items[0];
  const score = latest
    ? [
        latest.technicalScore,
        latest.attendanceScore,
        latest.competitionScore,
        latest.characterScore,
      ].reduce<number>((sum, value) => sum + Number(value ?? 0), 0) / 4
    : 0;
  return (
    <section className="x-page">
      <Lead
        tag="RANK GOVERNANCE"
        title="Promotion Readiness"
        text="Evidence-informed progression with sole decision authority retained by the instructor."
        action="Start coach review"
        run={() => open("promotion")}
      />
      {!latest ? (
        <Empty
          text="No promotion review recorded"
          action="Start first review"
          run={() => open("promotion")}
        />
      ) : (
        <>
          <div className="x-grid-3">
            <article className="x-rank">
              <p>CURRENT</p>
              <h3>{String(latest.currentRank)}</h3>
            </article>
            <article className="x-rank">
              <p>TARGET</p>
              <h3>{String(latest.targetRank)}</h3>
            </article>
            <article className="x-rank">
              <p>READINESS</p>
              <strong>{Math.round(score)}</strong>
              <h3>{String(latest.coachStatus)}</h3>
            </article>
          </div>
          <article className="x-card">
            {[
              ["Technical", latest.technicalScore],
              ["Attendance", latest.attendanceScore],
              ["Competition", latest.competitionScore],
              ["Character", latest.characterScore],
            ].map((x) => (
              <div className="x-line" key={x[0] as string}>
                <span>{x[0]}</span>
                <Meter value={Number(x[1])} />
              </div>
            ))}
            <div className="x-callout">
              <strong>Instructor authority retained</strong>
              <p>Readiness indices organize evidence; they never award rank.</p>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
function Video({ items, open }: { items: RecordRow[]; open: (k: string) => void }) {
  return (
    <section className="x-page">
      <Lead
        tag="COMPETITION INTELLIGENCE"
        title="Video Review Portal"
        text="Secure match footage and a coach-controlled evaluation lifecycle."
        action="＋ Upload match"
        run={() => open("video")}
      />
      {items.length === 0 ? (
        <Empty
          text="No competition reviews queued"
          action="Upload first match"
          run={() => open("video")}
        />
      ) : (
        <article className="x-card">
          <header>
            <div>
              <p>LIVE EVALUATION QUEUE</p>
              <h3>{items.length} reviews</h3>
            </div>
          </header>
          {items.map((x) => (
            <div className="x-review" key={String(x.id)}>
              <span className="x-play">▶</span>
              <div>
                <b>{String(x.eventName)}</b>
                <small>
                  {String(x.division || "Division not set")} ·{" "}
                  {String(x.result || "Result pending")}
                </small>
              </div>
              <Meter
                value={x.status === "complete" ? 100 : x.status === "coach-review" ? 85 : 45}
              />
              <em>{String(x.status)}</em>
            </div>
          ))}
        </article>
      )}
    </section>
  );
}
function Goals({
  goals,
  blocks,
  open,
}: {
  goals: RecordRow[];
  blocks: RecordRow[];
  open: (k: string) => void;
}) {
  return (
    <section className="x-page">
      <Lead
        tag="DEVELOPMENT CONTROL"
        title="Goals & Periodization"
        text="Convert evidence into measurable objectives and time-bounded training blocks."
        action="＋ Add goal"
        run={() => open("goal")}
      />
      <div className="x-summary">
        <article>
          <strong>{goals.filter((x) => x.status === "active").length}</strong>
          <small>ACTIVE GOALS</small>
        </article>
        <article>
          <strong>{goals.filter((x) => x.status === "achieved").length}</strong>
          <small>ACHIEVED</small>
        </article>
        <article>
          <strong>{blocks.filter((x) => x.status === "active").length}</strong>
          <small>ACTIVE BLOCKS</small>
        </article>
        <article>
          <strong>{blocks.reduce((s, x) => s + Number(x.weeklySessions || 0), 0)}</strong>
          <small>PLANNED SESSIONS/WK</small>
        </article>
      </div>
      <div className="x-grid-2">
        <article className="x-card">
          <header>
            <div>
              <p>MEASURABLE OUTCOMES</p>
              <h3>Athlete goals</h3>
            </div>
            <button onClick={() => open("goal")}>Add →</button>
          </header>
          {goals.length ? (
            goals.slice(0, 8).map((x) => {
              const target = Number(x.targetValue || 100),
                current = Number(x.currentValue || 0);
              return (
                <div className="x-line" key={String(x.id)}>
                  <span>
                    {String(x.title)} <small>{String(x.category)}</small>
                  </span>
                  <Meter value={Math.min(100, target ? (current / target) * 100 : 0)} />
                </div>
              );
            })
          ) : (
            <Empty text="No active goals" action="Create goal" run={() => open("goal")} />
          )}
        </article>
        <article className="x-card">
          <header>
            <div>
              <p>PERIODIZATION</p>
              <h3>Training blocks</h3>
            </div>
            <button onClick={() => open("block")}>Plan →</button>
          </header>
          {blocks.length ? (
            blocks.slice(0, 8).map((x) => (
              <div className="x-review" key={String(x.id)}>
                <span className="x-play">▦</span>
                <div>
                  <b>{String(x.name)}</b>
                  <small>{String(x.objective)}</small>
                </div>
                <em>{String(x.weeklySessions)} / wk</em>
              </div>
            ))
          ) : (
            <Empty text="No training blocks" action="Plan first block" run={() => open("block")} />
          )}
        </article>
      </div>
    </section>
  );
}
function Operations({ data }: { data: Record<string, unknown> }) {
  const a = (data.athletes || {}) as RecordRow,
    e = (data.engagement || {}) as RecordRow,
    j = (data.jobs || {}) as RecordRow,
    s = (data.storage || {}) as RecordRow,
    sub = (data.subscription || {}) as RecordRow,
    inc = (data.incidents || {}) as RecordRow,
    events = (data.events || {}) as RecordRow,
    launch = (data.launch || {}) as {
      score?: number;
      ready?: boolean;
      gates?: { code: string; name: string; pass: boolean; evidence: string }[];
    };
  const active = Number(a.total || 0),
    monthly = Number(e.monthlyActive || 0),
    athleteLimit = Number(sub.athleteLimit || 10),
    storageLimit = Number(sub.storageLimitBytes || 10 * 1024 ** 3);
  return (
    <section className="x-page">
      <Lead
        tag="ENTERPRISE CONTROL"
        title="Commercial & Service Operations"
        text="Revenue readiness, adoption, AI workflow health, storage control, and reliability in one operating picture."
      />
      <div className="x-summary">
        <article>
          <strong>{String(sub.planCode || "pilot")}</strong>
          <small>ACTIVE PLAN</small>
        </article>
        <article>
          <strong>{active}</strong>
          <small>ATHLETES / {athleteLimit}</small>
        </article>
        <article>
          <strong>{monthly}</strong>
          <small>30-DAY ACTIVE</small>
        </article>
        <article>
          <strong>{Number(launch.score || 0)}</strong>
          <small>LAUNCH READINESS</small>
        </article>
      </div>
      <div className="x-grid-2">
        <article className="x-card">
          <header>
            <div>
              <p>REVENUE & ADOPTION</p>
              <h3>Commercial readiness</h3>
            </div>
          </header>
          <div className="x-line">
            <span>Athlete capacity</span>
            <Meter value={athleteLimit ? (active / athleteLimit) * 100 : 0} />
          </div>
          <div className="x-line">
            <span>Monthly athlete activation</span>
            <Meter value={active ? (monthly / active) * 100 : 0} />
          </div>
          <div className="x-line">
            <span>Tracked product events</span>
            <b>{Number(events.total || 0)}</b>
          </div>
          <div className="x-callout">
            <strong>Payment rail</strong>
            <p>
              {sub.status
                ? `Subscription status: ${String(sub.status)}.`
                : "Billing provider configuration remains an external deployment control."}
            </p>
          </div>
        </article>
        <article className="x-card">
          <header>
            <div>
              <p>SERVICE HEALTH</p>
              <h3>AI & storage operations</h3>
            </div>
          </header>
          <div className="x-line">
            <span>AI jobs queued</span>
            <b>{Number(j.queued || 0)}</b>
          </div>
          <div className="x-line">
            <span>AI jobs failed</span>
            <b>{Number(j.failed || 0)}</b>
          </div>
          <div className="x-line">
            <span>Governed objects</span>
            <b>{Number(s.objects || 0)}</b>
          </div>
          <div className="x-line">
            <span>Storage utilization</span>
            <Meter value={storageLimit ? (Number(s.bytes || 0) / storageLimit) * 100 : 0} />
          </div>
          <div className="x-line">
            <span>Open incidents</span>
            <b>{Number(inc.open || 0)}</b>
          </div>
        </article>
      </div>
      <article className="x-card">
        <header>
          <div>
            <p>RELEASE AUTHORITY</p>
            <h3>Production launch gates</h3>
          </div>
          <strong className="x-score">{launch.ready ? "GO" : "HOLD"}</strong>
        </header>
        {(launch.gates || []).map((g) => (
          <div className="x-check" key={g.code}>
            <i>{g.pass ? "✓" : "○"}</i>
            <b>{g.name}</b>
            <em>{g.evidence}</em>
          </div>
        ))}
        <div className="x-callout">
          <strong>Decision rule</strong>
          <p>
            Commercial launch remains HOLD until all six controls pass: identity, billing, AI,
            backup, automation, and reliability.
          </p>
        </div>
      </article>
    </section>
  );
}
function Fields({ kind, athletes }: { kind: string; athletes: Athlete[] }) {
  const picker = (
    <label>
      Athlete
      <select name="athleteId" required>
        {athletes.map((a) => (
          <option value={a.id} key={a.id}>
            {a.alias} · {a.belt}
          </option>
        ))}
      </select>
    </label>
  );
  if (kind === "athlete")
    return (
      <>
        <label>
          Athlete name or alias
          <input name="alias" required minLength={2} />
        </label>
        <label>
          Birth year
          <input
            name="birthYear"
            type="number"
            min="1920"
            max={new Date().getFullYear()}
            required
          />
        </label>
        <label>
          Current rank
          <input name="belt" required />
        </label>
      </>
    );
  if (kind === "training")
    return (
      <>
        {picker}
        <label>
          Session type
          <select name="sessionType">
            <option>Gi class</option>
            <option>No-Gi class</option>
            <option>Competition rounds</option>
            <option>Open mat</option>
          </select>
        </label>
        <label>
          Date
          <input name="sessionDate" type="date" required />
        </label>
        <label>
          Minutes
          <input name="durationMinutes" type="number" min="1" max="300" defaultValue="60" />
        </label>
        <label>
          Intensity
          <input name="intensity" type="number" min="1" max="10" defaultValue="6" />
        </label>
        <label>
          Focus
          <input name="focus" required />
        </label>
        <label>
          Notes
          <textarea name="notes" />
        </label>
      </>
    );
  if (kind === "skill")
    return (
      <>
        {picker}
        <label>
          Domain
          <select name="domain">
            {["Takedowns", "Guard", "Passing", "Control", "Escapes", "Submissions"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Skill
          <input name="skillName" required />
        </label>
        <label>
          Level
          <select name="level">
            {[1, 2, 3, 4, 5].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label>
          Evidence
          <textarea name="evidence" required />
        </label>
      </>
    );
  if (kind === "promotion")
    return (
      <>
        {picker}
        <label>
          Current rank
          <input name="currentRank" required />
        </label>
        <label>
          Target rank
          <input name="targetRank" required />
        </label>
        {["technicalScore", "attendanceScore", "competitionScore", "characterScore"].map((x) => (
          <label key={x}>
            {x.replace("Score", " score")}
            <input name={x} type="number" min="0" max="100" defaultValue="80" required />
          </label>
        ))}
        <label>
          Status
          <select name="coachStatus">
            <option>developing</option>
            <option>review-ready</option>
            <option>hold</option>
          </select>
        </label>
        <label>
          Coach note
          <textarea name="coachNote" />
        </label>
      </>
    );
  if (kind === "video")
    return (
      <>
        {picker}
        <label>
          Event
          <input name="eventName" required />
        </label>
        <label>
          Division
          <input name="division" />
        </label>
        <label>
          Result
          <select name="result">
            <option>Win</option>
            <option>Loss</option>
            <option>Draw</option>
          </select>
        </label>
        <label>
          Video
          <input name="video" type="file" accept="video/mp4,video/quicktime,video/webm" required />
        </label>
      </>
    );
  if (kind === "goal")
    return (
      <>
        {picker}
        <label>
          Goal title
          <input name="title" required />
        </label>
        <label>
          Category
          <select name="category">
            <option>Technical</option>
            <option>Attendance</option>
            <option>Competition</option>
            <option>Conditioning</option>
            <option>Character</option>
          </select>
        </label>
        <label>
          Target value
          <input name="targetValue" type="number" min="1" defaultValue="100" />
        </label>
        <label>
          Current value
          <input name="currentValue" type="number" min="0" defaultValue="0" />
        </label>
        <label>
          Target date
          <input name="targetDate" type="date" />
        </label>
        <label>
          Coach note
          <textarea name="coachNote" />
        </label>
      </>
    );
  if (kind === "block")
    return (
      <>
        {picker}
        <label>
          Block name
          <input name="name" required />
        </label>
        <label>
          Objective
          <textarea name="objective" required />
        </label>
        <label>
          Start date
          <input name="startDate" type="date" required />
        </label>
        <label>
          End date
          <input name="endDate" type="date" required />
        </label>
        <label>
          Weekly sessions
          <input name="weeklySessions" type="number" min="1" max="14" defaultValue="3" />
        </label>
      </>
    );
  return (
    <div className="x-callout">
      <strong>Live athlete profile</strong>
      <p>
        Training, skill, promotion, and competition evidence are consolidated through the athlete
        intelligence service.
      </p>
    </div>
  );
}
function Workflow({
  kind,
  athletes,
  close,
  refresh,
}: {
  kind: string;
  athletes: Athlete[];
  close: () => void;
  refresh: () => void;
}) {
  const base = kind.split(":")[0];
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (base === "profile") {
      setStatus("done");
      return;
    }
    setStatus("saving");
    setError("");
    const fd = new FormData(e.currentTarget);
    let body: BodyInit = fd;
    const headers: HeadersInit = {};
    if (base !== "video") {
      body = JSON.stringify(Object.fromEntries(fd));
      headers["content-type"] = "application/json";
    }
    const response = await fetch(endpoint[base], { method: "POST", headers, body });
    if (response.ok) {
      setStatus("done");
      refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      const reason = String(data.message || data.error || "");
      setError(
        response.status === 403
          ? "Your account is authenticated but does not have the required academy role. Ask an academy administrator to update your access."
          : reason || "Unable to save record.",
      );
      setStatus("idle");
    }
  }
  const title =
    base === "athlete"
      ? "Add athlete"
      : base === "training"
        ? "Log training"
        : base === "skill"
          ? "Assess skill"
          : base === "promotion"
            ? "Promotion review"
            : base === "video"
              ? "Upload competition video"
              : base === "goal"
                ? "Create athlete goal"
                : base === "block"
                  ? "Plan training block"
                  : "Athlete intelligence";
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="workflow-title">
      <form onSubmit={save}>
        <button type="button" className="close" onClick={close} aria-label="Close workflow">
          ×
        </button>
        <p>GOVERNED WORKFLOW</p>
        <h2 id="workflow-title">{title}</h2>
        {status === "done" ? (
          <div className="x-success" role="status">
            <i>✓</i>
            <h3>Record accepted</h3>
            <button type="button" className="primary" onClick={close}>
              Return
            </button>
          </div>
        ) : (
          <>
            <Fields kind={base} athletes={athletes} />
            {athletes.length === 0 && base !== "athlete" && base !== "profile" ? (
              <div className="safety" role="alert">
                <b>Athlete required</b>
                <span>Create an athlete before recording performance evidence.</span>
              </div>
            ) : (
              <>
                {base === "video" && (
                  <div className="safety">
                    <b>Consent control</b>
                    <span>Minor video requires active guardian consent.</span>
                  </div>
                )}
                {error && (
                  <div className="safety" role="alert" aria-live="assertive">
                    <b>Action required</b>
                    <span>{error}</span>
                  </div>
                )}
                {base !== "profile" && (
                  <button className="primary" disabled={status === "saving"}>
                    {status === "saving" ? "Saving…" : "Save governed record"}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
}
export default function PerformanceAppV2() {
  const [view, setView] = useState<View>("command");
  const [workflow, setWorkflow] = useState("");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [data, setData] = useState<Record<string, RecordRow[]>>({
    training: [],
    skills: [],
    promotions: [],
    evaluations: [],
    goals: [],
    blocks: [],
  });
  const [operations, setOperations] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const urls = [
      "/api/athletes",
      "/api/training",
      "/api/skills",
      "/api/promotions",
      "/api/evaluations",
      "/api/goals",
      "/api/training-blocks",
      "/api/operations",
      "/api/launch-readiness",
    ];
    const results = await Promise.all(
      urls.map((x) =>
        fetch(x)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ),
    );
    setAthletes(results[0] as Athlete[]);
    setData({
      training: results[1],
      skills: results[2],
      promotions: results[3],
      evaluations: results[4],
      goals: results[5],
      blocks: results[6],
    });
    setOperations({
      ...((results[7] && !Array.isArray(results[7]) ? results[7] : {}) as Record<string, unknown>),
      launch: results[8] && !Array.isArray(results[8]) ? results[8] : {},
    });
    setLoading(false);
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const title = nav.find((x) => x[0] === view)?.[1];
  const counts = {
    athletes: athletes.length,
    training: data.training.length,
    skills: data.skills.length,
    evaluations: data.evaluations.length,
  };
  return (
    <main className="app-shell" aria-busy={loading}>
      <aside className="sidebar">
        <div className="brand">
          <a
            className="brand-mark"
            href="/governance"
            aria-label="Open MatIQ governance layer"
            title="Governance"
          >
            M
          </a>
          <div>
            <strong>MATIQ</strong>
            <span>JIU-JITSU INTELLIGENCE</span>
          </div>
        </div>
        <nav aria-label="Performance workspaces">
          <p className="nav-label">PERFORMANCE</p>
          {nav.map(([key, label, Icon]) => (
            <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>
              <i>
                <Icon size={17} strokeWidth={1.8} />
              </i>
              <span>{label}</span>
              {key === "video" && data.evaluations.length > 0 && <b>{data.evaluations.length}</b>}
            </button>
          ))}
        </nav>
        <div className="academy-card">
          <span>APEX TRAINING CENTER</span>
          <strong>Performance workspace</strong>
          <small>{athletes.length} live athletes</small>
          <div>
            <em>Coach governed</em>
            <b>PRO</b>
          </div>
        </div>
        <div className="user">
          <div>BB</div>
          <span>
            <strong>Benjamin</strong>
            <small>Administrator</small>
          </span>
        </div>
      </aside>
      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p>
              PERFORMANCE OPERATIONS / <span>{title?.toUpperCase()}</span>
            </p>
            <h1>{view === "command" ? "Athlete Performance Command Center" : title}</h1>
            <small>
              Training journey, competition intelligence, and measurable athlete development.
            </small>
          </div>
          <div className="header-actions">
            <span className="system-state">
              <i />
              {loading ? "Synchronizing" : "Operational"}
            </span>
            <button
              className="primary"
              onClick={() => setWorkflow("video")}
              disabled={!athletes.length}
            >
              <Upload size={15} /> Upload video
            </button>
          </div>
        </header>
        <div className="command-rail">
          <span>
            <i className="rail-seal">M</i>
            <b>TRAIN · JOURNEY · IQ</b>
          </span>
          <span>
            DATA <b>{loading ? "SYNCING" : "LIVE"}</b>
          </span>
          <span>
            AI <b>COACH-VERIFIED</b>
          </span>
          <span>
            ACCESS <b>OWNER</b>
          </span>
          <em>MATIQ v3.0</em>
        </div>
        {view === "command" && <Command go={setView} counts={counts} />}{" "}
        {view === "athletes" && <Athletes items={athletes} open={setWorkflow} />}{" "}
        {view === "calendar" && <Training items={data.training} open={setWorkflow} />}{" "}
        {view === "skills" && <Skills items={data.skills} open={setWorkflow} />}{" "}
        {view === "promotion" && <Promotions items={data.promotions} open={setWorkflow} />}{" "}
        {view === "video" && <Video items={data.evaluations} open={setWorkflow} />}{" "}
        {view === "goals" && <Goals goals={data.goals} blocks={data.blocks} open={setWorkflow} />}{" "}
        {view === "operations" && <Operations data={operations} />}
        <footer className="system-footer">
          <span>
            <i />
            Live records synchronized
          </span>
          <p>
            Age-aware consent · Coach-verified AI · Instructor authority ·{" "}
            <a href="/privacy">Privacy</a>
          </p>
          <b>MATIQ v3.0</b>
        </footer>
      </section>
      {workflow && (
        <Workflow
          kind={workflow}
          athletes={athletes}
          close={() => setWorkflow("")}
          refresh={refresh}
        />
      )}
    </main>
  );
}
