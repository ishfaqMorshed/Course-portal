import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// CONNECTION-MAP §2: a successful auth callback emits a `login` event (Phase 3).
// Server-side insert under the just-created session (RLS: events_insert_own).
async function logLogin(supabase: SupabaseClient, method: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("events").insert({ user_id: user.id, type: "login", payload: { method } });
}

// S1b — magic-link / setup-link landing. Handles both flows:
//  - PKCE login link (client signInWithOtp) → ?code=...
//  - admin-generated setup link (wh-purchase-47) → ?token_hash=...&type=magiclink
// On success the session cookie is set and we redirect into the app (dashboard).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await logLogin(supabase, "magic_link");
      return NextResponse.redirect(`${origin}/`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "magiclink" | "email" | "recovery" | "invite" | "signup",
      token_hash: tokenHash,
    });
    if (!error) {
      await logLogin(supabase, type);
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
