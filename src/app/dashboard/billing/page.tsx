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
  key: "starter" | "growth" | "agency";
  name: string;
  description: string;
  price: string;
  period: string;
  badge?: string;
  features: string[];
  cta: string;
};

type Subscription = {
  id: string;
  user_id: string;
  plan: "free" | "starter" | "growth" | "agency";
  status: "active" | "inactive" | "cancelled" | "past_due";
  billing_mode: "manual" | "paymongo" | "stripe";
  started_at: string | null;
  expires_at: string | null;
};

function buildUpgradeRequestLink(planName: string, userEmail?: string) {
  const subject = `RankCraft Audit ${planName} Plan Request`;

  const body = `Hi RankCraft Web,

I would like to request access to the ${planName} plan for RankCraft Audit.

Account email: ${userEmail || ""}
Plan: ${planName}

Please send me the next steps for billing and activation.

Thank you.`;

  return `mailto:rankcraftweb@gmail.com?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function formatPlanName(plan: string | null | undefined) {
  if (!plan) {
    return "Free";
  }

  return plan.slice(0, 1).toUpperCase() + plan.slice(1);
}

function formatStatus(status: string | null | undefined) {
  if (!status) {
    return "Active";
  }

  return status
    .split("_")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatBillingMode(mode: string | null | undefined) {
  if (!mode) {
    return "Manual";
  }

  return mode.slice(0, 1).toUpperCase() + mode.slice(1);
}

function getPlanBadgeClass(plan: string | null | undefined) {
  if (plan === "free") {
    return "border-[#e6dcc8] bg-[#faf7ef] text-slate-600";
  }

  if (plan === "growth") {
    return "border-[#d4af37]/50 bg-[#fff8df] text-[#7a5b00]";
  }

  return "border-[#2b2413] bg-[#111111] text-[#d4af37]";
}

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan, status, billing_mode, started_at, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscription = subscriptionData as Subscription | null;

  if (!subscription) {
    const { data: createdSubscription } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "free",
        status: "active",
        billing_mode: "manual",
      })
      .select("id, user_id, plan, status, billing_mode, started_at, expires_at")
      .single();

    subscription = createdSubscription as Subscription | null;
  }

  const currentPlan = subscription?.plan || "free";
  const currentStatus = subscription?.status || "active";
  const currentBillingMode = subscription?.billing_mode || "manual";

  const plans: Plan[] = [
    {
      key: "starter",
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
      cta: "Request Starter",
    },
    {
      key: "growth",
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
      cta: "Request Growth",
    },
    {
      key: "agency",
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
      cta: "Request Agency",
    },
  ];

  const billingNotes = [
    {
      title: "Manual billing for MVP",
      description:
        "Plan upgrades are handled manually while online payments are being verified and prepared.",
    },
    {
      title: "Recommended plan",
      description:
        "Growth is the best default plan for SEO specialists managing multiple client websites.",
    },
    {
      title: "Payment integration later",
      description:
        "PayMongo checkout, webhooks, and subscription status can be connected after online payments are fully enabled.",
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
              Choose the plan you want to request. Billing is currently handled
              manually while online payment checkout is being prepared.
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

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Current Plan
            </CardTitle>
          </CardHeader>

          <CardContent>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPlanBadgeClass(
                currentPlan
              )}`}
            >
              {formatPlanName(currentPlan)}
            </span>

            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {formatPlanName(currentPlan)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Active plan for this account.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#d4af37]/50 bg-[#fff8df] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
              Status
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-slate-950">
              {formatStatus(currentStatus)}
            </p>

            <p className="mt-2 text-sm text-[#7a5b00]/80">
              Subscription status from Supabase.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#e6dcc8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Billing Mode
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-slate-950">
              {formatBillingMode(currentBillingMode)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Manual until online checkout is enabled.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-[#d4af37]/50 bg-[#fff8df] p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b00]">
              MVP Billing Mode
            </p>

            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Manual plan requests are active.
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7a5b00]/80">
              PayMongo online payments are still being prepared. For now,
              upgrade requests open an email so plans can be approved and billed
              manually.
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href="mailto:rankcraftweb@gmail.com?subject=RankCraft%20Audit%20Billing%20Question">
              Contact Billing
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.key;

          return (
            <Card
              key={plan.name}
              className={`relative rounded-3xl bg-white shadow-sm ${
                plan.badge
                  ? "border-[#d4af37]/70 ring-4 ring-[#d4af37]/10"
                  : "border-[#e6dcc8]"
              }`}
            >
              {isCurrentPlan ? (
                <div className="absolute left-5 top-5 rounded-full border border-[#2b2413] bg-[#111111] px-3 py-1 text-xs font-semibold text-[#d4af37]">
                  Current Plan
                </div>
              ) : null}

              {plan.badge ? (
                <div className="absolute right-5 top-5 rounded-full border border-[#d4af37]/50 bg-[#fff8df] px-3 py-1 text-xs font-semibold text-[#7a5b00]">
                  {plan.badge}
                </div>
              ) : null}

              <CardHeader className="border-b border-[#eee5d4] p-5 pt-14 md:p-6 md:pt-14">
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

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Manual billing while online checkout is pending.
                  </p>
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
                  {isCurrentPlan ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href={buildUpgradeRequestLink(plan.name, user.email)}>
                        {plan.cta}
                      </Link>
                    </Button>
                  )}

                  <p className="mt-3 text-center text-xs text-slate-500">
                    This sends a manual upgrade request to RankCraft Web.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
              Payment Setup
            </p>

            <CardTitle className="mt-2 text-xl font-bold tracking-tight text-white">
              Checkout will be added later.
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