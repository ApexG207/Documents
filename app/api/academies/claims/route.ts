import {env} from "cloudflare:workers";
import {NextRequest,NextResponse} from "next/server";
import {identity} from "../../../lib/access";
import {governanceUnlocked} from "../../../lib/governance";
import {rateLimit} from "../../../lib/rate-limit";
import {safeText} from "../../../lib/records";

type Claim={id:string;academyId:string;claimantEmail:string;status:string};
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");
async function secretsMatch(candidate:string,configured:string){
  if(!candidate||!configured)return false;
  const [left,right]=await Promise.all([digest(candidate),digest(configured)]);
  let difference=left.length^right.length;
  for(let i=0;i<Math.max(left.length,right.length);i++)difference|=(left.charCodeAt(i)||0)^(right.charCodeAt(i)||0);
  return difference===0;
}
function founder(email:string){
  const configured=(env as unknown as Record<string,string|undefined>).MATIQ_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(configured&&configured===email);
}

export async function GET(request:NextRequest){
  const email=identity(request);
  if(!email)return NextResponse.json({error:"unauthenticated"},{status:401});
  const base="SELECT c.id,c.academy_id AS academyId,a.name AS academyName,c.claimant_name AS claimantName,c.claimant_title AS claimantTitle,c.evidence_type AS evidenceType,c.status,c.risk_status AS riskStatus,c.reviewed_by AS reviewedBy,c.reviewed_at AS reviewedAt,c.created_at AS createdAt FROM academy_claims c JOIN academies a ON a.id=c.academy_id";
  const rows=founder(email)
    ?await env.DB.prepare(`${base} ORDER BY c.created_at DESC LIMIT 200`).all()
    :await env.DB.prepare(`${base} WHERE c.claimant_email=? ORDER BY c.created_at DESC`).bind(email).all();
  return NextResponse.json({claims:rows.results,canExecutiveApprove:founder(email)});
}

export async function POST(request:NextRequest){
  const email=identity(request);
  if(!email)return NextResponse.json({error:"unauthenticated"},{status:401});
  const b=await request.json() as Record<string,unknown>,academyName=safeText(b.academyName,100),claimantName=safeText(b.claimantName,100),title=safeText(b.claimantTitle,80),evidenceType=safeText(b.evidenceType,40),reference=safeText(b.evidenceReference,300);
  if(!academyName||!claimantName||!title||!evidenceType||reference.length<5)return NextResponse.json({error:"claim_evidence_required"},{status:400});
  const existing=await env.DB.prepare("SELECT id FROM academies WHERE lower(name)=lower(?) LIMIT 1").bind(academyName).first<{id:string}>(),academyId=existing?.id||crypto.randomUUID(),claimId=crypto.randomUUID(),now=Date.now();
  const evidenceHash=await digest(reference),statements=[];
  if(!existing)statements.push(env.DB.prepare("INSERT INTO academies (id,name,plan,created_at) VALUES (?,?,'claim-pending',?)").bind(academyId,academyName,now));
  statements.push(
    env.DB.prepare("INSERT INTO academy_claims (id,academy_id,claimant_email,claimant_name,claimant_title,evidence_type,evidence_reference,status,risk_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'submitted','review_required',?,?)").bind(claimId,academyId,email,claimantName,title,evidenceType,reference,now,now),
    env.DB.prepare("INSERT INTO academy_verification_events (id,academy_id,claim_id,event_type,status,evidence_hash,actor_email,note,created_at) VALUES (?,?,?,'claim_submitted','review_required',?,?,NULL,?)").bind(crypto.randomUUID(),academyId,claimId,evidenceHash,email,now)
  );
  await env.DB.batch(statements);
  return NextResponse.json({claimId,academyId,status:"submitted",message:"Claim received for independent verification. No administrative access has been granted."},{status:201});
}

export async function PATCH(request:NextRequest){
  const email=identity(request);
  if(!email)return NextResponse.json({error:"unauthenticated"},{status:401});
  if(!founder(email))return NextResponse.json({error:"founder_authority_required"},{status:403});
  const throttle=await rateLimit(request,"executive-academy-approval",5,3600000);
  if(!throttle.allowed)return NextResponse.json({error:"approval_attempt_limit_reached",resetAt:throttle.resetAt},{status:429});
  const body=await request.json().catch(()=>({})) as Record<string,unknown>,claimId=safeText(body.claimId,80),candidate=String(body.approvalCode||"");
  const configured=(env as unknown as Record<string,string|undefined>).MATIQ_EXECUTIVE_APPROVAL_CODE||"";
  if(!claimId)return NextResponse.json({error:"claim_id_required"},{status:400});
  const sessionAuthorized=await governanceUnlocked(request);
  if(!sessionAuthorized&&!configured)return NextResponse.json({error:"executive_approval_not_configured"},{status:503});
  if(!sessionAuthorized&&!await secretsMatch(candidate,configured))return NextResponse.json({error:"invalid_approval_code"},{status:403});
  const claim=await env.DB.prepare("SELECT id,academy_id AS academyId,claimant_email AS claimantEmail,status FROM academy_claims WHERE id=? LIMIT 1").bind(claimId).first<Claim>();
  if(!claim)return NextResponse.json({error:"claim_not_found"},{status:404});
  if(!["submitted","review_required"].includes(claim.status))return NextResponse.json({error:"claim_decision_locked",status:claim.status},{status:409});
  const now=Date.now(),reviewer="BB · Founder",note="BB · Founder Approved — application accepted and decision locked.";
  await env.DB.batch([
    env.DB.prepare("UPDATE academy_claims SET status='approved',risk_status='founder_approved_locked',reviewed_by=?,reviewed_at=?,decision_note=?,updated_at=? WHERE id=? AND status IN ('submitted','review_required')").bind(reviewer,now,note,now,claim.id),
    env.DB.prepare("INSERT INTO memberships (id,academy_id,email,role,status,created_at) SELECT ?,?,?,'admin','active',? WHERE NOT EXISTS (SELECT 1 FROM memberships WHERE academy_id=? AND lower(email)=lower(?) AND status='active')").bind(crypto.randomUUID(),claim.academyId,claim.claimantEmail,now,claim.academyId,claim.claimantEmail),
    env.DB.prepare("INSERT INTO academy_verification_events (id,academy_id,claim_id,event_type,status,evidence_hash,actor_email,note,created_at) VALUES (?,?,?,'executive_approval','approved_locked',NULL,?,?,?)").bind(crypto.randomUUID(),claim.academyId,claim.id,email,note,now),
    env.DB.prepare("INSERT INTO audit_events (id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,?,?,'executive_application_approved','academy_claim',?,'founder_approved_locked',?)").bind(crypto.randomUUID(),claim.academyId,email,claim.id,now)
  ]);
  return NextResponse.json({claimId:claim.id,academyId:claim.academyId,status:"approved",locked:true,approvedBy:reviewer,message:"Application accepted and locked — BB · Founder Approved."});
}
