import {env} from "cloudflare:workers";
import {NextRequest,NextResponse} from "next/server";
import {identity} from "../../../lib/access";
import {createGovernanceToken,governanceCodeAccepted,governanceCookie,governanceUnlocked,isFounder} from "../../../lib/governance";
import {rateLimit} from "../../../lib/rate-limit";

export async function GET(request:NextRequest){
  if(!identity(request))return NextResponse.json({error:"unauthenticated"},{status:401});
  return NextResponse.json({founder:isFounder(request),unlocked:await governanceUnlocked(request)},{headers:{"cache-control":"no-store"}});
}
export async function POST(request:NextRequest){
  const email=identity(request);if(!email)return NextResponse.json({error:"unauthenticated"},{status:401});
  if(!isFounder(request))return NextResponse.json({error:"founder_authority_required"},{status:403});
  const throttle=await rateLimit(request,"governance-unlock",5,3600000);if(!throttle.allowed)return NextResponse.json({error:"unlock_attempt_limit_reached",resetAt:throttle.resetAt},{status:429});
  const body=await request.json().catch(()=>({})) as {passcode?:string};
  if(!await governanceCodeAccepted(String(body.passcode||"")))return NextResponse.json({error:"invalid_governance_passcode"},{status:403});
  const token=await createGovernanceToken(request);if(!token)return NextResponse.json({error:"governance_session_not_configured"},{status:503});
  const now=Date.now();
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO academies(id,name,plan,created_at) VALUES ('pilot','Apex Training Center','pilot',?)").bind(now),
    env.DB.prepare("INSERT INTO audit_events(id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,'pilot',?,'governance_session_unlocked','governance_session',NULL,'authorized',?)").bind(crypto.randomUUID(),email,now)
  ]);
  const response=NextResponse.json({unlocked:true,expiresInSeconds:1800,message:"Governance authority unlocked for 30 minutes."});
  response.cookies.set(governanceCookie,token,{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:1800});return response;
}
export async function DELETE(){
  const response=NextResponse.json({unlocked:false,message:"Governance authority locked."});
  response.cookies.set(governanceCookie,"",{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:0});return response;
}
