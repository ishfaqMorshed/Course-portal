"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";
import { useRouter } from "next/navigation";
import { IconMail, IconZap } from "@/components/icons";

// dev-only bar (gated by ?dev=1). Phase 2.5: real auth means we can't fabricate a
// session, so this is just a convenience prefill of the test buyer's email.
function LoginDevBar({ onFillEmail }: { onFillEmail: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-textPrimary text-white/50 font-mono text-[11px] leading-none">
      <div className="flex items-center justify-center gap-2 px-4 py-2 flex-wrap">
        <span>dev:</span>
        <button onClick={onFillEmail} className="text-white/80 underline underline-offset-2 hover:text-white">prefill test email</button>
        <span>· email + password → dashboard · forgot password → magic link</span>
      </div>
    </div>
  );
}

// S1 — Login / Access (only screen WITHOUT shell). Phase 2.5: email + password
// (signInWithPassword) is primary; "email me a link instead" is the magic-link
// (signInWithOtp) forgot-password fallback.
export default function LoginScreen({ dev }: { dev: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendIn, setResendIn] = useState(30);

  useEffect(() => {
    if (status !== "sent") return;
    setResendIn(30);
    const iv = setInterval(() => setResendIn((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, [status]);

  const normalisedEmail = () => email.trim().toLowerCase();

  // Primary path — email + password.
  const login = async () => {
    const e = normalisedEmail();
    if (!e || !e.includes("@")) {
      setStatus("error");
      setErrorMsg("That doesn't look like an email address.");
      return;
    }
    if (!password) {
      setStatus("error");
      setErrorMsg("Enter your password.");
      return;
    }
    setStatus("submitting");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) {
      setStatus("error");
      setErrorMsg("Email or password is incorrect.");
      return;
    }
    // CONNECTION-MAP §2: successful auth → `login` event (may transition
    // never_activated → not_started in Phase 4). Best-effort, before redirect.
    await track("login", { method: "password" });
    // Admins land on the admin dashboard; everyone else on the portal. (Admins
    // keep portal access via the "Portal" link — no forced global redirect.)
    const { data: admin } = await supabase.rpc("is_admin");
    router.push(admin === true ? "/admin" : "/");
    router.refresh(); // re-run the server gate
  };

  // Fallback path — magic link. shouldCreateUser:false → only enrolled (pre-created)
  // users get a link; everyone else surfaces "Email is not registered."
  const sendLink = async () => {
    const e = normalisedEmail();
    if (!e || !e.includes("@")) {
      setStatus("error");
      setErrorMsg("Enter the email you enrolled with first.");
      return;
    }
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg("Email is not registered.");
      return;
    }
    setStatus("sent");
  };

  return (
    <div data-screen-label="S1 Login" className="min-h-screen flex bg-white">
      {/* ---- Left brand panel (hidden on mobile) ---- */}
      <div className="hidden md:flex md:w-[45%] shrink-0 relative bg-primary overflow-hidden flex-col p-10">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-36 -right-44 w-[440px] h-[440px] rounded-full bg-white/[0.06]"></div>
          <div className="absolute top-[40%] -left-52 w-[400px] h-[400px] rounded-[100px] rotate-12 bg-white/[0.05]"></div>
          <div className="absolute -bottom-44 -right-20 w-[480px] h-[480px] rounded-full bg-white/[0.06]"></div>
        </div>

        <div className="relative flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-white/15 text-white flex items-center justify-center"><IconZap size={16} strokeWidth={2} /></div>
          <span className="text-white font-semibold text-[15px]">Design Musketeer</span>
        </div>

        <div className="relative flex-1 flex flex-col justify-center py-10">
          <h2 className="text-white text-[32px] leading-[40px] font-bold max-w-[360px]">Watch the course. Skip the guesswork.</h2>
          <p className="text-white/70 text-[15px] leading-6 mt-4 max-w-[340px]">Every module, template, and worksheet from the program — in one place, ready when you are.</p>
        </div>

        <div className="relative bg-white/10 rounded-2xl p-5 max-w-[400px]">
          <p className="text-white text-sm leading-[22px] italic">&ldquo;I closed my first automation client three weeks after finishing Module 4. The portal made it impossible to lose momentum.&rdquo;</p>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-9 h-9 rounded-full bg-white/20 text-white text-xs font-semibold flex items-center justify-center">MR</div>
            <div className="text-[13px] leading-[18px] text-white/60">
              <div className="font-medium text-white/80">Maya Reyes</div>
              <div>Freelance consultant, cohort 3</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Right form panel ---- */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="md:hidden flex items-center gap-2.5 px-6 pt-6">
          <div className="w-8 h-8 rounded-[10px] bg-primary text-white flex items-center justify-center"><IconZap size={16} strokeWidth={2} /></div>
          <span className="text-textPrimary font-semibold text-[15px]">AI Profit Systems</span>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[380px] mx-auto px-6">
            {status === "sent" ? (
              <div className="flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center"><IconMail size={20} /></div>
                <div>
                  <h1 className="text-2xl font-bold text-textPrimary leading-8">Check your inbox</h1>
                  <p className="text-sm text-textSecondary leading-[22px] mt-2">We sent a one-time login link to <span className="font-semibold text-textPrimary">{email}</span>. It expires in 15 minutes.</p>
                </div>
                <div className="text-[13px] text-textSecondary">
                  Didn&apos;t get it?{" "}
                  {resendIn > 0 ? (
                    <span>Resend in {resendIn}s</span>
                  ) : (
                    <button onClick={sendLink} className="font-semibold text-primary hover:text-primaryHover transition-colors duration-150">Resend link</button>
                  )}
                </div>
                <button onClick={() => { setStatus("idle"); setEmail(""); setPassword(""); }} className="text-[13px] font-semibold text-primary hover:text-primaryHover transition-colors duration-150">Back to login</button>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-textPrimary leading-8">Welcome back</h1>
                <p className="text-sm text-textSecondary leading-[22px] mt-2">Log in with the email and password you set up.</p>

                <div className="mt-7">
                  <label htmlFor="login-email" className="block text-[13px] font-semibold text-textPrimary mb-1.5">Email address</label>
                  <input id="login-email" type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
                    placeholder="you@email.com"
                    className={"w-full bg-subtle rounded-[10px] px-4 py-3 text-sm text-textPrimary placeholder-textSecondary outline-none focus:ring-[1.5px] focus:ring-primary " + (status === "error" ? "ring-[1.5px] ring-danger" : "")} />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-[13px] font-semibold text-textPrimary">Password</label>
                    <button type="button" onClick={() => setShow((s) => !s)} className="text-[12px] font-semibold text-primary hover:text-primaryHover transition-colors duration-150">{show ? "Hide" : "Show"}</button>
                  </div>
                  <input id="login-password" type={show ? "text" : "password"} value={password}
                    onChange={(e) => { setPassword(e.target.value); if (status === "error") setStatus("idle"); }}
                    onKeyDown={(e) => e.key === "Enter" && login()}
                    placeholder="Your password"
                    className={"w-full bg-subtle rounded-[10px] px-4 py-3 text-sm text-textPrimary placeholder-textSecondary outline-none focus:ring-[1.5px] focus:ring-primary " + (status === "error" ? "ring-[1.5px] ring-danger" : "")} />
                  {status === "error" && <p className="text-[13px] text-danger leading-[18px] mt-2">{errorMsg}</p>}
                </div>

                <button onClick={login} disabled={status === "submitting"}
                  className="w-full mt-4 bg-primary hover:bg-primaryHover disabled:hover:bg-primary transition-colors duration-150 text-white text-sm font-semibold rounded-[10px] px-5 py-3 disabled:opacity-70 flex items-center justify-center gap-2">
                  {status === "submitting" ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span><span>Logging in…</span>
                    </>
                  ) : (
                    <span>Log in</span>
                  )}
                </button>

                <div className="border-t border-line mt-7"></div>

                <div className="flex items-center gap-1.5 flex-wrap text-[13px] text-textSecondary mt-5">
                  <span>Forgot your password?</span>
                  <button onClick={sendLink} disabled={status === "sending"} className="font-semibold text-primary hover:text-primaryHover transition-colors duration-150 disabled:opacity-70">
                    {status === "sending" ? "Sending…" : "Email me a login link instead"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-textSecondary px-6 pb-12 pt-4">
          © AI Profit Systems · <a href="#" className="hover:text-textPrimary transition-colors duration-150">Privacy</a> · <a href="#" className="hover:text-textPrimary transition-colors duration-150">Terms</a>
        </div>
      </div>

      {dev && <LoginDevBar onFillEmail={() => { setEmail("nakibworkspace@gmail.com"); setStatus("idle"); }} />}
    </div>
  );
}
