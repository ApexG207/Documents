import { env } from "cloudflare:workers";
import { NextRequest,NextResponse } from "next/server";
import { authorize } from "../../lib/access";
export async function GET(request:NextRequest){if(!await authorize(request,"admin"))return NextResponse.json({error:"forbidden"},{status:403});const rows=await env.DB.prepare("SELECT id,actor_email as actorEmail,action,object_type as objectType,object_id as objectId,outcome,created_at as createdAt FROM audit_events WHERE academy_id=? ORDER BY created_at DESC LIMIT 200").bind("pilot").all();return NextResponse.json(rows.results,{headers:{"cache-control":"no-store"}})}
