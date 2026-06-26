import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    redirect?: string;
  }>;
};

function getSafeRedirectPath(path: string | undefined) {
  if (!path) {
    return "/dashboard";
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }

  return path;
}

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = getSafeRedirectPath(
    String(formData.get("redirectTo") || "")
  );

  if (!email || !password) {
    redirect("/login?error=missing-fields");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=invalid-login");
  }

  redirect(redirectTo);
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;

  const error = resolvedSearchParams?.error;
  const message = resolvedSearchParams?.message;
  const redirectTo = getSafeRedirectPath(resolvedSearchParams?.redirect);

  const errorMessage =
    error === "missing-fields"
      ? "Please enter your email and password."
      : error === "invalid-login"
        ? "Invalid email or password. Please try again."
        : null;

  const successMessage =
    message === "check-email"
      ? "Account created. Please check your email if confirmation is required, then log in."
      : null;

  return (
    <main
      className="min-h-screen bg-[#0f0f0f] text-white"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(15,15,15,0.97) 0%, rgba(15,15,15,0.9) 48%, rgba(15,15,15,0.72) 100%), url('/rankcraft-home-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_30%,rgba(212,175,55,0.12),transparent_35%),radial-gradient(circle_at_80%_60%,rgba(212,175,55,0.08),transparent_35%)]">
        <header className="border-b border-white/10 bg-[#0f0f0f]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-xs font-bold text-[#f5d56a]">
                RC
              </div>

              <div>
                <p className="text-sm font-bold text-white">RankCraft Audit</p>
                <p className="text-xs text-slate-400">SEO audit software</p>
              </div>
            </Link>

            <Link
              href="/signup"
              className="text-sm font-medium text-slate-300 transition hover:text-[#f5d56a]"
            >
              Create account
            </Link>
          </div>
        </header>

        <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl items-center gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Welcome back
            </p>

            <h1 className="mt-5 text-5xl font-bold tracking-tight text-white md:text-6xl">
              Continue your SEO audit workflow.
            </h1>

            <p className="mt-6 text-base leading-8 text-slate-300">
              Log in to manage projects, run audits, review keyword data, export
              reports, and open prioritized recommendations.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#111111]/85 p-6 shadow-2xl backdrop-blur md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d4af37]">
                Login
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                Sign in to RankCraft Audit
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter your account details to open the dashboard.
              </p>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-200">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-5 rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 p-4 text-sm font-medium text-[#f5d56a]">
                {successMessage}
              </div>
            ) : null}

            <form action={login} className="mt-6 space-y-5">
              <input type="hidden" name="redirectTo" value={redirectTo} />

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-white"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#d4af37]/60 focus:ring-4 focus:ring-[#d4af37]/10"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-white"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#d4af37]/60 focus:ring-4 focus:ring-[#d4af37]/10"
                  required
                />
              </div>

              <Button type="submit" className="h-12 w-full">
                Login
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <p className="text-sm text-slate-400">
                No account yet?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[#f5d56a] hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}