import { getNgnPerUsd } from "@/lib/fx";
export async function GET() {
  const quote = await getNgnPerUsd();
  return Response.json(quote, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400" },
  });
}
