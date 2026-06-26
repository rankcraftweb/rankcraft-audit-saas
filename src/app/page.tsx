import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/");
}

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const features = [
    {
      title: "Run SEO audits",
      description:
        "Check titles, descriptions, headings, canonical tags, mobile setup, and basic technical SEO issues.",
    },
    {
      title: "Review keyword data",
      description:
        "Use Google Search Console data to see clicks, impressions, CTR, and average position.",
    },
    {
      title: "Create clean reports",
      description:
        "Generate client-ready reports with scores, issues, keyword opportunities, and action steps.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="border-b border-white/10 bg-[#0f0f0f]/90 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-5 md:px-6">
          <Link href="/" className="flex items-center gap-3 justify-self-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-xs font-bold text-[#f5d56a]">
              RC
            </div>

            <div>
              <p className="text-sm font-bold text-white">RankCraft Audit</p>
              <p className="text-xs text-slate-400">SEO audit software</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 justify-self-center text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-[#f5d56a]">
              Features
            </a>

            <Link href="/pricing" className="hover:text-[#f5d56a]">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3 justify-self-end">
            {user ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#d4af37]/40 hover:bg-white/10"
                >
                  Logout
                </button>
              </form>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm font-medium text-slate-300 transition hover:text-[#f5d56a] sm:inline-flex"
                >
                  Login
                </Link>

                <Button asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-5 text-sm text-slate-300">
            <a href="#features" className="hover:text-[#f5d56a]">
              Features
            </a>

            <Link href="/pricing" className="hover:text-[#f5d56a]">
              Pricing
            </Link>

            {user ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm text-slate-300 hover:text-[#f5d56a]"
                >
                  Logout
                </button>
              </form>
            ) : (
              <Link href="/login" className="hover:text-[#f5d56a]">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <section
        className="relative overflow-hidden border-b border-white/10"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15,15,15,0.96) 0%, rgba(15,15,15,0.88) 45%, rgba(15,15,15,0.68) 100%), url('/rankcraft-home-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(212,175,55,0.12),transparent_35%),radial-gradient(circle_at_80%_60%,rgba(212,175,55,0.08),transparent_35%)]" />

        <div className="relative mx-auto flex min-h-[680px] max-w-6xl items-center px-4 py-20 md:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Technical SEO reporting
            </p>

            <h1 className="mt-5 text-5xl font-bold tracking-tight text-white md:text-6xl">
              Simple SEO audits and cleaner client reports.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
              RankCraft Audit helps SEO specialists run website audits, review
              keyword visibility, and prepare clear reports without bloated
              tools.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/signup"}>
                  {user ? "View Dashboard" : "Get Started"}
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/pricing">See Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-white/10 bg-[#0f0f0f]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Features
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Focused tools for the SEO audit workflow.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <h3 className="text-lg font-bold text-white">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="rounded-3xl border border-[#d4af37]/30 bg-[#151515] p-6 text-white md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d4af37]">
                Ready for MVP testing
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                Start with one project and run your first audit.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Create a project, run the audit, review keywords, then export a
                compact report.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={user ? "/dashboard/projects/new" : "/signup"}>
                  {user ? "Add Project" : "Create Account"}
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}