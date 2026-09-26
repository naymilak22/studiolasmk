import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const savedNext = cookieStore.get("booking_next")?.value;
  const requestedNext = searchParams.get("next") ?? savedNext;
  let decodedNext: string | null = null;
  if (requestedNext) {
    try {
      decodedNext = decodeURIComponent(requestedNext);
    } catch {
      decodedNext = requestedNext;
    }
  }
  const next = safeNextPath(decodedNext);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set("booking_next", "", { path: "/", maxAge: 0 });
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}/login?error=auth`);
  response.cookies.set("booking_next", "", { path: "/", maxAge: 0 });
  return response;
}
