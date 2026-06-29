import Link from "next/link";
import { redirect } from "next/navigation";
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

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
      cta: "Choose Starter",
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
      cta: "Choose Growth",
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
      cta: "Choose Agency",
    },
  ];

  const billingNotes = [
    {
      title: "Current status",
      description:
        "Billing is prepared for MVP positioning. Stripe checkout can be connected after the core audit workflow is fully tested.",
    },
    {
      title: "Recommended plan",
      description:
        "Growth is the best default plan for SEO specialists managing multiple client websites.",
    },
    {
      title: "Next billing step",
      description:
        "After MVP QA, connect Stripe products, checkout sessions, and subscription status checks.",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e6dcc8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">← Back to Dashboard</Link>
            </Button>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Billing
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Plans and subscription
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Choose the plan structure for RankCraft Audit. Billing checkout is
              not connected yet, but the SaaS pricing layout is ready for MVP
              validation.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
            <Button asChild>
              <Link href="/dashboard/projects/new">Add Project</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/dashboard/projects">SEO Audit</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
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

                  <p className="pb-2 text-sm text-slate-500">{plan.period}</p>
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
                  Stripe checkout will be connected after MVP QA.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="border-b border-[#eee5d4] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Included
            </p>

            <CardTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              What each plan supports
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
              MVP Billing
            </p>

            <CardTitle className="mt-2 text-xl font-bold tracking-tight text-white">
              Billing is staged for later
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-5 md:p-6">
            {billingNotes.map((note) => (
              <div
                key={note.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-sm font-semibold text-white">
                  {note.title}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {note.description}
                </p>
              </div>
            ))}

            <Button asChild className="w-full">
              <Link href="/dashboard/projects">Open SEO Audit</Link>
            </Button>

            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}