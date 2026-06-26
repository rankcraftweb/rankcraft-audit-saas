import Link from "next/link";
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

export default function PricingPage() {
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
      <header className="border-b border-[#e6dcc8] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4af37]/50 bg-[#111111] text-sm font-bold text-[#f5d56a]">
              RC
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-slate-950">
                RankCraft Audit
              </p>
              <p className="text-xs text-slate-500">
                SEO SaaS Dashboard
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>

            <Button asChild>
              <Link href="/dashboard">Open App</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="overflow-hidden rounded-3xl border border-[#e6dcc8] bg-white shadow-sm">
          <div className="relative p-6 text-center md:p-10">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#d4af37]/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-slate-100 blur-3xl" />

            <div className="relative mx-auto max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
                Pricing
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Simple plans for SEO audits and reporting.
              </h1>

              <p className="mt-4 text-sm leading-6 text-slate-500 md:text-base">
                Start small, then upgrade when you need more projects, scans,
                keyword tracking, and client reporting features.
              </p>
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

              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-950">
                  {plan.name}
                </CardTitle>

                <p className="max-w-sm text-sm leading-6 text-slate-500">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="flex min-h-[430px] flex-col">
                <div className="rounded-3xl border border-[#e6dcc8] bg-[#faf7ef] p-5">
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
                    <Link href="/dashboard">{plan.cta}</Link>
                  </Button>

                  <p className="mt-3 text-center text-xs text-slate-500">
                    Billing connection can be added after MVP validation.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-950">
                What is included?
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-3 md:grid-cols-2">
              {[
                {
                  title: "SEO audit runner",
                  description:
                    "Run checks for metadata, headings, canonical tags, mobile setup, and basic technical SEO issues.",
                },
                {
                  title: "PageSpeed scores",
                  description:
                    "Store performance, accessibility, best practices, and SEO scores from PageSpeed scans.",
                },
                {
                  title: "Keyword tracking",
                  description:
                    "Use Google Search Console keyword data to review clicks, impressions, CTR, and average position.",
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
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b6a46a]">
                MVP Billing Note
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                Pricing page is ready for SaaS positioning.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                For now, the plan buttons open the app. Later, Stripe checkout
                can be connected to these plans once the MVP audit flow is fully
                tested.
              </p>

              <div className="mt-5 grid gap-3">
                {[
                  "Keep plan structure simple for MVP",
                  "Validate audit/report workflow first",
                  "Add Stripe after core flow is stable",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/10 p-3 text-sm text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <Button asChild className="mt-6 w-full">
                <Link href="/dashboard">Open Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}