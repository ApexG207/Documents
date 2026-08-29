import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize, identity } from "../../../lib/access";

export async function POST(request:NextRequest){
  if(!await authorize(request,"admin"))return NextResponse.json({error:"forbidden"},{status:403});
  const body=await request.json() as {mediaId?:string;reason?:string}; if(!body.mediaId||!body.reason)return NextResponse.json({error:"media_id_and_reason_required"},{status:400});
  const media=await env.DB.prepare("SELECT id FROM media_objects WHERE id=? LIMIT 1").bind(body.mediaId).first(); if(!media)return NextResponse.json({error:"media_not_found"},{status:404});
  const id=crypto.randomUUID(),now=Date.now(),actor=identity(request)||"unknown";
  await env.DB.batch([env.DB.prepare("INSERT INTO legal_holds (id,academy_id,media_id,reason,status,authorized_by,placed_at) VALUES (?,?,?,?,?,?,?)").bind(id,"pilot",body.mediaId,body.reason.slice(0,500),"active",actor,now),env.DB.prepare("UPDATE media_objects SET legal_hold=1,lifecycle_state='held' WHERE id=?").bind(body.mediaId),env.DB.prepare("INSERT INTO audit_events (id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),"pilot",actor,"place_hold","competition_video",body.mediaId,"completed",now)]);
  return NextResponse.json({id,mediaId:body.mediaId,status:"active"},{status:201});
}

export async function PATCH(request:NextRequest){
  if(!await authorize(request,"admin"))return NextResponse.json({error:"forbidden"},{status:403});
  const body=await request.json() as {holdId?:string}; if(!body.holdId)return NextResponse.json({error:"hold_id_required"},{status:400});
  const hold=await env.DB.prepare("SELECT media_id AS mediaId FROM legal_holds WHERE id=? AND academy_id=? AND status='active'").bind(body.holdId,"pilot").first<{mediaId:string}>(); if(!hold)return NextResponse.json({error:"active_hold_not_found"},{status:404});
  const now=Date.now(),actor=identity(request)||"unknown"; await env.DB.batch([env.DB.prepare("UPDATE legal_holds SET status='released',released_by=?,released_at=? WHERE id=?").bind(actor,now,body.holdId),env.DB.prepare("UPDATE media_objects SET legal_hold=0,lifecycle_state='active' WHERE id=? AND NOT EXISTS (SELECT 1 FROM legal_holds WHERE media_id=? AND status='active' AND id<>?)").bind(hold.mediaId,hold.mediaId,body.holdId),env.DB.prepare("INSERT INTO audit_events (id,academy_id,actor_email,action,object_type,object_id,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),"pilot",actor,"release_hold","competition_video",hold.mediaId,"completed",now)]);
  return NextResponse.json({holdId:body.holdId,status:"released"});
}
