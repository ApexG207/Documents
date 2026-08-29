import {env} from "cloudflare:workers";
import {NextRequest,NextResponse} from "next/server";
import {identity} from "../../../lib/access";
import {safeText} from "../../../lib/records";
export async function GET(request:NextRequest){if(!identity(request))return NextResponse.json({error:"unauthenticated"},{status:401});const q=safeText(request.nextUrl.searchParams.get("q"),80),like=`%${q}%`;const rows=await env.DB.prepare("SELECT display_name AS displayName,belt,location_text AS locationText,goals,social_links_json AS socialLinksJson,team_affiliations_json AS teamAffiliationsJson,updated_at AS updatedAt FROM user_profiles WHERE visibility='public' AND (?='' OR display_name LIKE ? OR location_text LIKE ? OR belt LIKE ?) ORDER BY updated_at DESC LIMIT 100").bind(q,like,like,like).all();return NextResponse.json(rows.results)}
