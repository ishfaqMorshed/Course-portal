"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconZap } from "@/components/icons";

const MIN_PASSWORD = 8;
const NOT_REGISTERED = "Email is not registered.";

// S1c — First-time password setup (Phase 2.5). Mirrors LoginScreen's brand panel.
// Flow: read-only prefilled email + new password → on submit verifyOtp(recovery)
// consumes the one-time token (→ session) → updateUser({password}) → dashboard.
// No token is verified on mount, so opening this page creates no session.
export default function SetupScreen({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    if (!token) {
      setStatus("error");
      setErrorMsg(NOT_REGISTERED);
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setStatus("error");
      setErrorMsg(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setErrorMsg("Passwords don't match.");
      return;
    }

    setStatus("submitting");
    const supabase = createClient();

    // 1. Claim the one-time recovery token → establishes a session.
    const verify = await supabase.auth.verifyOtp({ type: "recovery", token_hash: token });
    if (verify.error) {
      // invalid / expired / tampered / already-claimed token
      setStatus("error");
      setErrorMsg(NOT_REGISTERED);
      return;
    }

    // 2. Attach the password to the now-authenticated account.
    const upd = await supabase.auth.updateUser({ password });
    if (upd.error) {
      // weak password (server policy) etc. — session is live, so they can retry.
      setStatus("error");
      setErrorMsg(upd.error.message || "Couldn't set that password. Try a stronger one.");
      return;
    }

    // 3. Into the app.
    router.push("/");
    router.refresh();
  };

  return (
    <div data-screen-label="S1c Setup" className="min-h-screen flex bg-white">
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
          <h2 className="text-white text-[32px] leading-[40px] font-bold max-w-[360px]">You&apos;re in. Let&apos;s secure your account.</h2>
          <p className="text-white/70 text-[15px] leading-6 mt-4 max-w-[340px]">Set a password once — then you&apos;ll sign straight in every time, no email round-trip.</p>
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
            <h1 className="text-2xl font-bold text-textPrimary leading-8">Set your password</h1>
            <p className="text-sm text-textSecondary leading-[22px] mt-2">Create a password for your account — you&apos;ll use it to log in from now on.</p>

            <div className="mt-7">
              <label htmlFor="setup-email" className="block text-[13px] font-semibold text-textPrimary mb-1.5">Email address</label>
              <input id="setup-email" type="email" value={email} readOnly disabled
                className="w-full bg-subtle rounded-[10px] px-4 py-3 text-sm text-textSecondary outline-none cursor-not-allowed" />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="setup-password" className="block text-[13px] font-semibold text-textPrimary">New password</label>
                <button type="button" onClick={() => setShow((s) => !s)} className="text-[12px] font-semibold text-primary hover:text-primaryHover transition-colors duration-150">{show ? "Hide" : "Show"}</button>
              </div>
              <input id="setup-password" type={show ? "text" : "password"} value={password}
                onChange={(e) => { setPassword(e.target.value); if (status === "error") setStatus("idle"); }}
                placeholder={`At least ${MIN_PASSWORD} characters`}
                className={"w-full bg-subtle rounded-[10px] px-4 py-3 text-sm text-textPrimary placeholder-textSecondary outline-none focus:ring-[1.5px] focus:ring-primary " + (status === "error" ? "ring-[1.5px] ring-danger" : "")} />
            </div>

            <div className="mt-4">
              <label htmlFor="setup-confirm" className="block text-[13px] font-semibold text-textPrimary mb-1.5">Confirm password</label>
              <input id="setup-confirm" type={show ? "text" : "password"} value={confirm}
                onChange={(e) => { setConfirm(e.target.value); if (status === "error") setStatus("idle"); }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Re-enter your password"
                className={"w-full bg-subtle rounded-[10px] px-4 py-3 text-sm text-textPrimary placeholder-textSecondary outline-none focus:ring-[1.5px] focus:ring-primary " + (status === "error" ? "ring-[1.5px] ring-danger" : "")} />
              {status === "error" && <p className="text-[13px] text-danger leading-[18px] mt-2">{errorMsg}</p>}
            </div>

            <button onClick={submit} disabled={status === "submitting"}
              className="w-full mt-5 bg-primary hover:bg-primaryHover disabled:hover:bg-primary transition-colors duration-150 text-white text-sm font-semibold rounded-[10px] px-5 py-3 disabled:opacity-70 flex items-center justify-center gap-2">
              {status === "submitting" ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span><span>Setting password…</span>
                </>
              ) : (
                <span>Set password &amp; continue</span>
              )}
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-textSecondary px-6 pb-12 pt-4">
          © AI Profit Systems · <a href="#" className="hover:text-textPrimary transition-colors duration-150">Privacy</a> · <a href="#" className="hover:text-textPrimary transition-colors duration-150">Terms</a>
        </div>
      </div>
    </div>
  );
}
