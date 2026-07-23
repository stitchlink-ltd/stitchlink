import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
export async function POST(request:Request){if(!env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${env.CRON_SECRET}`)return new Response("Unauthorized",{status:401});const admin=createSupabaseAdminClient();if(!admin)return new Response("Unavailable",{status:503});const [grades,releases]=await Promise.all([admin.rpc("recalculate_tailor_grades"),admin.rpc("mark_eligible_payouts")]);if(grades.error||releases.error)return Response.json({error:"One or more jobs failed"},{status:500});return Response.json({ok:true,ranAt:new Date().toISOString()})}
export const GET=POST;
