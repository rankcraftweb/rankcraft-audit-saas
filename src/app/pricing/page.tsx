import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Plan = {
  name: string;
  description: string;
  price: string;
  period: string;
  badge?: string;
  features: string[];
  cta: string;
};

export default async function PricingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans: Plan[] = [
    {
      name: "Starter",
      description: "For freelancers testing one website.",
      price: "$19",
      period: "/ month",
      features: [
        "1 website project",
        "5 pages scanned",
        "10 keyword rows",
        "1 report per month",
      ],
      cta: "Start Starter",
    },
    {
      name: "Growth",
      description: "For SEO specialists managing client websites.",
      price: "$49",
      period: "/ month",
      badge: "Recommended",
      features: [
        "10 website projects",
        "100 pages scanned",
        "GSC keyword tracking",
        "Branded client reports",
      ],
      cta: "Start Growth",
    },
    {
      name: "Agency",
      description: "For teams needing more capacity and reporting.",
      price: "$99",
      period: "/ month",
      features: [
        "Unlimited projects",
        "Scheduled audits",
        "Advanced reporting",
        "Priority support",
      ],
      cta: "Start Agency",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-slate-950">
      <header className="border-b border-[#e6dcc8] bg-[#f7f3ea]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4af37]/50 bg-[#111111] text-sm font-bold text-[#f5d56a]">
              RC
            </div>

            <p className="text-sm font-bold tracking-tight text-slate-950">
              RankCraft Audit
            </p>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/#features"
              className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
            >
              Features
            </Link>

            <Link
              href="/pricing"
              className="text-sm font-semibold text-[#7a5b00]"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/login">Login</Link>
                </Button>

                <Button asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="overflow-hidden rounded-3xl border border-[#2b2413] bg-[#111111] shadow-sm">
          <div className="relative p-6 text-center md:p-12">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#d4af37]/20 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

            <div className="relative mx-auto max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                Pricing
              </p>

              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
                Simple plans for SEO audits and client reports.
              </h1>

              <p className="mt-5 text-sm leading-6 text-slate-300 md:text-base">
                Start with one website, then upgrade when you need more audits,
                keyword data, and client-ready reporting capacity.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link href={user ? "/dashboard" : "/signup"}>
                    {user ? "Open Dashboard" : "Start Free"}
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent text-white hover:bg-white/10"
                >
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative rounded-3xl bg-white shadow-sm ${
                plan.badge
                  ? "border-[#d4af37]/70 ring-4 ring-[#d4af37]/10"
                  : "border-[#e6dcc8]"
              }`}
            >
              {plan.badge ? (
                <div className="absolute right-5 top-5 rounded-full border border-[#d4af37]/50 bg-[#fff8df] px-3 py-1 text-xs font-semibold text-[#7a5b00]">
                  {plan.badge}
                </div>
              ) : null}

              <CardHeader className="border-b border-[#eee5d4] p-5 md:p-6">
                <CardTitle className="text-xl font-bold text-slate-950">
                  {plan.name}
                </CardTitle>

                <p className="max-w-sm text-sm leading-6 text-slate-500">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="flex min-h-[430px] flex-col p-5 md:p-6">
                <div
                  className={
                    plan.badge
                      ? "rounded-3xl border border-[#d4af37]/50 bg-[#fff8df] p-5"
                      : "rounded-3xl border border-[#e6dcc8] bg-[#faf7ef] p-5"
                  }
                >
                  <div className="flex items-end gap-2">
                    <p className="text-5xl font-bold tracking-tight text-slate-950">
                      {plan.price}
                    </p>

                    <p className="pb-2 text-sm text-slate-500">
                      {plan.period}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/50 bg-[#fff8df] text-xs font-bold text-[#7a5b00]">
                        ✓
                      </div>

                      <p className="text-sm leading-6 text-slate-600">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-8">
                  <Button asChild className="w-full">
                    <Link href={user ? "/dashboard/billing" : "/signup"}>
                      {plan.cta}
                    </Link>
                  </Button>

                  <p className="mt-3 text-center text-xs text-slate-500">
                    Stripe checkout will be connected after MVP validation.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
          <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
            <CardHeader className="border-b border-[#eee5d4] p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Included
              </p>

              <CardTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                Built for SEO audit delivery
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-3 p-5 md:grid-cols-2 md:p-6">
              {[
                {
                  title: "SEO audit runner",
                  description:
                    "Run checks for metadata, headings, canonical tags, mobile setup, and technical SEO issues.",
                },
                {
                  title: "PageSpeed scores",
                  description:
                    "Store performance, accessibility, best practices, and SEO scores from PageSpeed scans.",
                },
                {
                  title: "Keyword tracking",
                  description:
                    "Use Google Search Console data to review clicks, impressions, CTR, and average position.",
                },
                {
                  title: "Client reports",
                  description:
                    "Export compact reports with scores, issues, keyword opportunities, and action steps.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4"
                >
                  <p className="font-semibold text-slate-950">{item.title}</p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-[#2b2413] bg-[#111111] text-white shadow-sm">
            <CardHeader className="border-b border-white/10 p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                MVP Note
              </p>

              <CardTitle className="mt-2 text-xl font-bold tracking-tight text-white">
                Pricing is ready for validation.
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 p-5 md:p-6">
              {[
                "Keep plan structure simple for MVP.",
                "Validate audit, keyword, report, and recommendations flow first.",
                "Connect Stripe after the core workflow is stable.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300"
                >
                  {item}
                </div>
              ))}

              <Button asChild className="w-full">
                <Link href={user ? "/dashboard" : "/signup"}>
                  {user ? "Open Dashboard" : "Create Account"}
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/">Back to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}