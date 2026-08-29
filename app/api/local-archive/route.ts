import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { identity, selectedAcademy } from "../../lib/access";

type Row = Record<string, unknown>;
const digest = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");

export async function GET(request: NextRequest) {
  if (!(await selectedAcademy(request, "admin")))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(
    {
      mode: "administrator-controlled",
      destination: "user-selected local or mapped network folder",
      encryption: "AES-256-GCM with locally entered passphrase",
      minorPolicy: "excluded",
      excludedClasses: [
        "minor profiles",
        "guardian records",
        "minor training records",
        "minor competition records",
        "raw media",
        "emails",
        "social links",
        "payment identifiers",
        "authentication tokens",
      ],
      automaticWrite: false,
      installationBehavior: "open archive setup after PWA installation",
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const academyContext = await selectedAcademy(request, "admin");
  if (!academyContext) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const academyId = academyContext.academyId;
  const year = new Date().getUTCFullYear();
  const athleteResult = await env.DB.prepare(
    "SELECT id,alias,birth_year AS birthYear,belt,active,created_at AS createdAt FROM athletes WHERE academy_id=? AND active=1 ORDER BY created_at",
  )
    .bind(academyId)
    .all<Row>();
  const adults = athleteResult.results.filter(
    (row) => Number(row.birthYear) > 0 && year - Number(row.birthYear) >= 18,
  );
  const excludedMinorCount = athleteResult.results.length - adults.length;
  const adultIds = adults.map((row) => String(row.id));
  const tables: Record<string, unknown[]> = {};
  if (adultIds.length) {
    const placeholders = adultIds.map(() => "?").join(",");
    const scopedQueries: Record<string, string> = {
      trainingSessions: `SELECT athlete_id AS athleteId,session_type AS sessionType,session_date AS sessionDate,duration_minutes AS durationMinutes,intensity,focus,notes,created_at AS createdAt FROM training_sessions WHERE academy_id=? AND athlete_id IN (${placeholders}) ORDER BY session_date`,
      skillProgress: `SELECT athlete_id AS athleteId,domain,skill_name AS skillName,level,evidence,assessed_at AS assessedAt FROM skill_progress WHERE academy_id=? AND athlete_id IN (${placeholders}) ORDER BY assessed_at`,
      promotionProgress: `SELECT athlete_id AS athleteId,current_rank AS currentRank,target_rank AS targetRank,technical_score AS technicalScore,attendance_score AS attendanceScore,competition_score AS competitionScore,character_score AS characterScore,coach_status AS coachStatus,coach_note AS coachNote,reviewed_at AS reviewedAt,created_at AS createdAt FROM promotion_progress WHERE academy_id=? AND athlete_id IN (${placeholders}) ORDER BY created_at`,
      videoEvaluations: `SELECT id,athlete_id AS athleteId,event_name AS eventName,division,result,status,analysis_json AS analysis,coach_verified_by AS coachVerifiedBy,created_at AS createdAt FROM video_evaluations WHERE academy_id=? AND athlete_id IN (${placeholders}) ORDER BY created_at`,
      videoMarkers: `SELECT evaluation_id AS evaluationId,athlete_id AS athleteId,second,category,outcome,note,created_at AS createdAt FROM video_markers WHERE academy_id=? AND athlete_id IN (${placeholders}) ORDER BY created_at`,
      goals: `SELECT athlete_id AS athleteId,title,category,target_value AS targetValue,current_value AS currentValue,target_date AS targetDate,status,created_at AS createdAt FROM athlete_goals WHERE academy_id=? AND athlete_id IN (${placeholders}) ORDER BY created_at`,
      trainingBlocks: `SELECT athlete_id AS athleteId,name,objective,start_date AS startDate,end_date AS endDate,status,created_at AS createdAt FROM training_blocks WHERE academy_id=? AND athlete_id IN (${placeholders}) ORDER BY created_at`,
      attendance: `SELECT athlete_id AS athleteId,session_date AS sessionDate,class_type AS classType,status,created_at AS createdAt FROM attendance WHERE academy_id=? AND athlete_id IN (${placeholders}) ORDER BY session_date`,
    };
    for (const [name, sql] of Object.entries(scopedQueries)) {
      const result = await env.DB.prepare(sql)
        .bind(academyId, ...adultIds)
        .all();
      tables[name] = result.results;
    }
  }
  const academy = await env.DB.prepare(
    "SELECT id,name,plan,created_at AS createdAt FROM academies WHERE id=?",
  )
    .bind(academyId)
    .first<Row>();
  const exportedAt = Date.now();
  const recordCount =
    adults.length + Object.values(tables).reduce((sum, rows) => sum + rows.length, 0);
  const archive = {
    format: "matiq-local-history-v1",
    release: "3.0.0-beta.1",
    exportedAt,
    academy,
    policy: {
      classification: "adult-only historical record",
      minors: "excluded without exception",
      rawMedia: "excluded",
      directIdentifiers: "excluded",
      encryption: "performed locally before filesystem write",
    },
    safeguards: { excludedMinorCount, adultAthleteCount: adults.length, recordCount },
    athletes: adults.map((row) => ({
      id: row.id,
      alias: row.alias,
      birthYear: row.birthYear,
      belt: row.belt,
      createdAt: row.createdAt,
    })),
    tables,
  };
  const payload = JSON.stringify(archive, null, 2);
  const checksum = await digest(payload);
  await env.DB.prepare(
    "INSERT INTO audit_events(id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      academyId,
      identity(request) || "unknown",
      "local_archive_generated",
      "adult_only_history",
      checksum,
      "success",
      exportedAt,
    )
    .run();
  const stamp = new Date(exportedAt).toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return new NextResponse(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="matiq-adult-history-${stamp}.json"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-matiq-checksum": checksum,
      "x-matiq-minors-excluded": String(excludedMinorCount),
    },
  });
}
