import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ratelimit } from "./lib/ratelimit";

export async function middleware(request: NextRequest) {
  // Sirf API routes ko protect karte hain
  if (request.nextUrl.pathname.startsWith("/api")) {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Too Many Requests" }), 
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};