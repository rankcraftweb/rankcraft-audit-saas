import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "$19",
    description: "For freelancers testing one website.",
    features: [
      "1 website project",
      "5 pages scanned",
      "10 keyword rows",
      "1 report per month",
    ],
  },
  {
    name: "Growth",
    price: "$49",
    description: "For SEO specialists managing clients.",
    features: [
      "10 website projects",
      "100 pages scanned",
      "GSC keyword tracking",
      "Branded client reports",
    ],
  },
  {
    name: "Agency",
    price: "$99",
    description: "For teams needing more capacity.",
    features: [
      "Unlimited projects",
      "Scheduled audits",
      "Advanced reporting",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-bold">
            RankCraft Audit
          </Link>

          <Button asChild>
            <Link href="/dashboard">Open App</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Pricing
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Simple plans for SEO audits and reporting.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Start small, then upgrade when you need more projects,
            scans, and client reporting features.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>

                <ul className="space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>

                <Button className="w-full" asChild>
                  <Link href="/dashboard">Start Plan</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}