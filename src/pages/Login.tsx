import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Mail, Lock, ArrowRight, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { friendlyAuthError } from "../lib/authErrors";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const notice = (location.state as { notice?: string } | null)?.notice ?? null;

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || !password || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0B0C] px-6 text-white antialiased">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="mx-auto mb-8 flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E50914] text-lg font-black text-white">
            G
          </div>
          <span className="text-2xl font-black tracking-tight">GRAPH</span>
        </button>

        {notice && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-[#E50914]/25 bg-[#E50914]/[0.08] px-4 py-3">
            <Info size={15} className="shrink-0 text-[#E50914]" />
            <p className="text-sm font-semibold text-white/85">{notice}</p>
          </div>
        )}

        <div className="rounded-[1.75rem] border border-white/[0.08] bg-[#141416] p-8">
          <h1 className="text-2xl font-black tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {mode === "signin"
              ? "Pick up where you left off."
              : "Start your road to mortgage-ready."}
          </p>

          <button
            onClick={google}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/[0.08] disabled:opacity-40"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/30">
              or
            </span>
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">
                Email
              </label>
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 focus-within:border-[#E50914]/60">
                <Mail size={16} className="mr-2 shrink-0 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">
                Password
              </label>
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 focus-within:border-[#E50914]/60">
                <Lock size={16} className="mr-2 shrink-0 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder={
                    mode === "signup" ? "At least 6 characters" : "••••••••"
                  }
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
              </div>
            </div>

            <button
              onClick={submit}
              disabled={loading || !email || !password}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#E50914] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#c90812] disabled:opacity-30"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {error && (
              <p className="text-center text-sm font-semibold text-[#E50914]">
                {error}
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-white/50">
            {mode === "signin" ? "New to GRAPH?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-bold text-[#E50914] hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-white/30">
          GRAPH is a prototype. Don't upload real credit reports containing
          sensitive personal information.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.22V7.04H2.18a11 11 0 0 0 0 9.92l3.66-2.86Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.04L5.84 8.9c.87-2.6 3.3-4.15 6.16-4.15Z"
      />
    </svg>
  );
}