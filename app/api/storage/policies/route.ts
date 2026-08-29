import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../../lib/access";

export async function GET(request:NextRequest){
  if(!await authorize(request,"admin"))return NextResponse.json({error:"forbidden"},{status:403});
  const rows=await env.DB.prepare("SELECT id,name,active_days AS activeDays,retained_days AS retainedDays,delete_after_days AS deleteAfterDays,temporary_days AS temporaryDays,draft_evaluation_days AS draftEvaluationDays,verified_evaluation_days AS verifiedEvaluationDays,status,created_by AS createdBy,created_at AS createdAt,updated_at AS updatedAt FROM storage_policies WHERE academy_id=? ORDER BY updated_at DESC").bind("pilot").all();
  return NextResponse.json({policies:rows.results});
}

export async function POST(request:NextRequest){
  if(!await authorize(request,"admin"))return NextResponse.json({error:"forbidden"},{status:403});
  const body=await request.json() as Record<string,unknown>; const now=Date.now(); const id=crypto.randomUUID();
  const days=(key:string,fallback:number)=>Math.max(1,Math.min(3650,Number(body[key])||fallback));
  const activeDays=days("activeDays",90),retainedDays=days("retainedDays",365),deleteAfterDays=days("deleteAfterDays",365);
  if(!(activeDays<=retainedDays&&retainedDays<=deleteAfterDays))return NextResponse.json({error:"invalid_policy_sequence"},{status:400});
  await env.DB.batch([
    env.DB.prepare("UPDATE storage_policies SET status='superseded',updated_at=? WHERE academy_id=? AND status='active'").bind(now,"pilot"),
    env.DB.prepare("INSERT INTO storage_policies (id,academy_id,name,active_days,retained_days,delete_after_days,temporary_days,draft_evaluation_days,verified_evaluation_days,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,"pilot",String(body.name||"R-COA Governed Storage").slice(0,80),activeDays,retainedDays,deleteAfterDays,days("temporaryDays",7),days("draftEvaluationDays",90),days("verifiedEvaluationDays",1095),"active",identity(request)||"unknown",now,now),
    env.DB.prepare("INSERT INTO audit_events (id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),"pilot",identity(request)||"unknown","activate","storage_policy",id,"completed",now)
  ]);
  return NextResponse.json({id,status:"active",activeDays,retainedDays,deleteAfterDays},{status:201});
}
