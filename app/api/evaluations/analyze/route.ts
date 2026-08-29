import { env } from "cloudflare:workers";
import { NextRequest,NextResponse } from "next/server";
import { authorize,identity } from "../../../lib/access";
import { boundedScore,safeText } from "../../../lib/records";
import { rateLimit } from "../../../lib/rate-limit";

export async function POST(request:NextRequest){
  if(!await authorize(request,"coach"))return NextResponse.json({error:"forbidden"},{status:403});
  const throttle=await rateLimit(request,"ai-analysis",30,3600000);if(!throttle.allowed)return NextResponse.json({error:"rate_limited",resetAt:throttle.resetAt},{status:429});
  const body=await request.json() as Record<string,unknown>;
  const evaluationId=safeText(body.evaluationId,80);
  const evaluation=await env.DB.prepare("SELECT id,event_name as eventName,division,result FROM video_evaluations WHERE id=? AND academy_id=? LIMIT 1").bind(evaluationId,"pilot").first<{id:string;eventName:string;division:string|null;result:string|null}>();
  if(!evaluation)return NextResponse.json({error:"evaluation_not_found"},{status:404});
  const measures={initiation:boundedScore(body.initiation),control:boundedScore(body.control),recovery:boundedScore(body.recovery),conversion:boundedScore(body.conversion),decisions:boundedScore(body.decisions)};
  const observation=safeText(body.observation,1200);
  if(observation.length<10)return NextResponse.json({error:"observable_evidence_required"},{status:400});
  const fallback={summary:"Coach evidence recorded for structured review.",strength:"Highest measured domain should be preserved under representative resistance.",priority:"Lowest measured domain should anchor the next constraint-led training intervention.",intervention:"Two technical rounds, three constraint rounds, and one measurable reassessment.",confidence:"baseline"};
  let analysis=fallback;
  if(env.OPENAI_API_KEY){
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:"gpt-5.4-mini",input:[{role:"system",content:"You are a Brazilian jiu-jitsu competition analysis assistant. Use only anonymized event metadata, bounded coach scores, and observable evidence. Return concise JSON with summary, strength, priority, intervention, confidence. Never diagnose, identify a person, prescribe weight cutting, claim certainty, or make promotion decisions."},{role:"user",content:JSON.stringify({event:evaluation.eventName,division:evaluation.division,result:evaluation.result,measures,observation})}],text:{format:{type:"json_schema",name:"competition_analysis",strict:true,schema:{type:"object",properties:{summary:{type:"string"},strength:{type:"string"},priority:{type:"string"},intervention:{type:"string"},confidence:{type:"string"}},required:["summary","strength","priority","intervention","confidence"],additionalProperties:false}}},max_output_tokens:450})});
    if(response.ok){const payload=await response.json() as {output_text?:string};try{analysis=JSON.parse(payload.output_text||"")}catch{analysis=fallback}}
  }
  await env.DB.batch([
    env.DB.prepare("UPDATE video_evaluations SET status='coach-review',analysis_json=? WHERE id=? AND academy_id=?").bind(JSON.stringify({measures,observation,analysis}),evaluationId,"pilot"),
    env.DB.prepare("UPDATE analysis_jobs SET status='completed',attempts=attempts+1,updated_at=?,completed_at=? WHERE evaluation_id=? AND academy_id=? AND status IN ('queued','processing')").bind(Date.now(),Date.now(),evaluationId,"pilot"),
    env.DB.prepare("INSERT INTO ai_audit (id,academy_id,actor_email,use_case,input_class,output_status,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),"pilot",identity(request),"competition_analysis","anonymized_structured_evidence","draft_created",Date.now())
  ]);
  return NextResponse.json({evaluationId,status:"coach-review",analysis});
}
