import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return `mailto:rankcraftweb@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatPlanName(plan: string | null | undefined) {
  if (!plan) return "Free";
  return plan.slice(0, 1).toUpperCase() + plan.slice(1);
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Active";
  return status
    .split("_")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatBillingMode(mode: string | null | undefined) {
  if (!mode) return "Manual";
  return mode.slice(0, 1).toUpperCase() + mode.slice(1);
}

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan, status, billing_mode, started_at, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscription = subscriptionData as Subscription | null;

  if (!subscription) {
    const { data: created } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "free",
        status: "active",
        billing_mode: "manual",
      })
      .select("id, user_id, plan, status, billing_mode, started_at, expires_at")
      .single();

    subscription = created as Subscription | null;
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
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Plans and subscription
          </h1>
          <p className="max-w-xl text-xs leading-5 text-slate-500">
            Billing is currently handled manually while online payment checkout
            is being prepared.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/projects/new"
            className="inline-flex h-8 items-center rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black"
          >
            Add Project
          </Link>
          <Link
            href="/dashboard/projects"
            className="inline-flex h-8 items-center rounded-xl border border-[#e6dcc8] bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-[#faf7ef]"
          >
            SEO Audit
          </Link>
        </div>
      </div>

      {/* Current plan stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Current Plan
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {formatPlanName(currentPlan)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active plan for this account</p>
        </div>

        <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
            Status
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {formatStatus(currentStatus)}
          </p>
          <p className="mt-1 text-xs text-[#7a5b00]/70">Subscription status</p>
        </div>

        <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Billing Mode
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {formatBillingMode(currentBillingMode)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Manual until checkout is enabled</p>
        </div>
      </div>

      {/* MVP notice */}
      <div className="rounded-2xl border border-[#d4af37]/40 bg-[#fff8df] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5b00]">
              MVP Billing Mode
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              Manual plan requests are active.
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#7a5b00]/80">
              PayMongo online payments are still being prepared. Upgrade
              requests open an email so plans can be approved manually.
            </p>
          </div>
          <Link
            href="mailto:rankcraftweb@gmail.com?subject=RankCraft%20Audit%20Billing%20Question"
            className="inline-flex h-8 shrink-0 items-center rounded-xl border border-[#d4af37]/40 bg-white px-4 text-xs font-semibold text-[#7a5b00] hover:bg-[#fff8df]"
          >
            Contact Billing
          </Link>
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-3 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.key;

          return (
            <div
              key={plan.name}
              className={`relative rounded-2xl bg-white p-5 ${
                plan.badge ? "border-2 border-[#d4af37]/60" : "border border-[#e6dcc8]"
              }`}
            >
              {isCurrentPlan ? (
                <div className="absolute left-5 top-5 rounded-full border border-[#2b2413] bg-[#111111] px-2.5 py-0.5 text-[10px] font-semibold text-[#d4af37]">
                  Current Plan
                </div>
              ) : null}

              {plan.badge ? (
                <div className="absolute right-5 top-5 rounded-full border border-[#d4af37]/50 bg-[#fff8df] px-2.5 py-0.5 text-[10px] font-semibold text-[#7a5b00]">
                  {plan.badge}
                </div>
              ) : null}

              <div className={isCurrentPlan || plan.badge ? "pt-8" : ""}>
                <p className="text-base font-bold text-slate-950">{plan.name}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {plan.description}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
                <div className="flex items-end gap-1.5">
                  <p className="text-3xl font-bold tracking-tight text-slate-950">
                    {plan.price}
                  </p>
                  <p className="pb-1 text-xs text-slate-500">{plan.period}</p>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Manual billing while checkout is pending.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex gap-2">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/50 bg-[#fff8df] text-[9px] font-bold text-[#7a5b00]">
                      ✓
                    </div>
                    <p className="text-xs leading-5 text-slate-600">{feature}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="flex h-9 w-full items-center justify-center rounded-xl bg-slate-200 text-xs font-semibold text-slate-500"
                  >
                    Current Plan
                  </button>
                ) : (
                  <Link
                    href={buildUpgradeRequestLink(plan.name, user.email)}
                    className="flex h-9 w-full items-center justify-center rounded-xl bg-[#111111] text-xs font-semibold text-white transition hover:bg-black"
                  >
                    {plan.cta}
                  </Link>
                )}
                <p className="mt-2 text-center text-[10px] text-slate-500">
                  Sends a manual upgrade request to RankCraft Web.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Included + payment setup */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-[#e6dcc8] bg-white">
          <div className="border-b border-[#eee5d4] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7a19]">
              Included
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-950">
              What each plan supports
            </p>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2">
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
                className="rounded-xl border border-[#e6dcc8] bg-[#faf7ef] p-3.5"
              >
                <p className="text-xs font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#2b2413] bg-[#111111] text-white">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
              Payment Setup
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">
              Checkout will be added later.
            </p>
          </div>

          <div className="space-y-2.5 p-4">
            {billingNotes.map((note) => (
              <div
                key={note.title}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-xs font-semibold text-white">{note.title}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-300">
                  {note.description}
                </p>
              </div>
            ))}

            <Link
              href="/dashboard/projects"
              className="flex h-9 items-center justify-center rounded-xl bg-[#d4af37] text-xs font-semibold text-black transition hover:bg-[#c9a42e]"
            >
              Open SEO Audit
            </Link>
            <Link
              href="/dashboard"
              className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}