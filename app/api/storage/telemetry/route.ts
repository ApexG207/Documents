import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../../lib/access";

export async function GET(request:NextRequest){
  if(!await authorize(request,"admin"))return NextResponse.json({error:"forbidden"},{status:403}); const now=Date.now(),soon=now+30*86400000;
  const summary=await env.DB.prepare("SELECT COUNT(*) AS objectCount,COALESCE(SUM(byte_size),0) AS totalBytes,COALESCE(SUM(CASE WHEN storage_class='standard' THEN byte_size ELSE 0 END),0) AS standardBytes,COALESCE(SUM(CASE WHEN storage_class='infrequent' THEN byte_size ELSE 0 END),0) AS infrequentBytes,COALESCE(SUM(CASE WHEN legal_hold=1 THEN 1 ELSE 0 END),0) AS heldObjects,COALESCE(SUM(CASE WHEN retention_until<=? AND legal_hold=0 THEN 1 ELSE 0 END),0) AS dueForDeletion,COALESCE(SUM(CASE WHEN retention_until>? AND retention_until<=? AND legal_hold=0 THEN 1 ELSE 0 END),0) AS expiringWithin30Days FROM media_objects WHERE lifecycle_state<>'deleted'").bind(now,now,soon).first();
  const policy=await env.DB.prepare("SELECT id,name,active_days AS activeDays,retained_days AS retainedDays,delete_after_days AS deleteAfterDays FROM storage_policies WHERE academy_id=? AND status='active' ORDER BY updated_at DESC LIMIT 1").bind("pilot").first();
  return NextResponse.json({capturedAt:now,policy:policy||{id:"rcoa-default-v1",name:"R-COA default",activeDays:90,retainedDays:365,deleteAfterDays:365},summary});
}
