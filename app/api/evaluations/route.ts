import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../lib/access";

export async function GET(request:NextRequest){
  if(!await authorize(request,"viewer")) return NextResponse.json({error:"forbidden"},{status:403});
  const rows=await env.DB.prepare("SELECT id,media_id as mediaId,athlete_id as athleteId,event_name as eventName,division,result,status,analysis_json as analysisJson,coach_verified_by as coachVerifiedBy,created_at as createdAt FROM video_evaluations WHERE academy_id=? ORDER BY created_at DESC LIMIT 100").bind("pilot").all();
  return NextResponse.json(rows.results);
}
export async function PATCH(request:NextRequest){
  if(!await authorize(request,"coach")) return NextResponse.json({error:"forbidden"},{status:403});
  const body=await request.json() as {id?:string;status?:string;analysis?:unknown};
  const allowed=new Set(["queued","analyzing","coach-review","complete","rejected"]);
  if(!body.id||!allowed.has(String(body.status))) return NextResponse.json({error:"invalid_evaluation_update"},{status:400});
  await env.DB.prepare("UPDATE video_evaluations SET status=?,analysis_json=?,coach_verified_by=? WHERE id=? AND academy_id=?").bind(String(body.status),JSON.stringify(body.analysis??{}).slice(0,12000),body.status==="complete"?identity(request):null,body.id,"pilot").run();
  return NextResponse.json({id:body.id,status:body.status});
}
