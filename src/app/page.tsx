import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Site Audit",
    description: "Scan technical SEO issues, page health, and optimization gaps.",
  },
  {
    title: "Keyword Visibility",
    description: "Track clicks, impressions, CTR, and average ranking position.",
  },
  {
    title: "PageSpeed Insights",
    description: "Review performance, accessibility, best practices, and SEO scores.",
  },
  {
    title: "Client Reports",
    description: "Generate clean SEO summaries for clients and monthly updates.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-bold">
            RankCraft Audit
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="#features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>

          <Button asChild>
            <Link href="/dashboard">Open App</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border px-4 py-2 text-sm text-muted-foreground">
            Technical SEO SaaS Dashboard
          </div>

          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
              Audit websites, track SEO visibility, and send cleaner client reports.
            </h1>

            <p className="max-w-2xl text-lg text-muted-foreground">
              RankCraft Audit helps SEO specialists monitor site health,
              keyword performance, PageSpeed scores, and technical issues in one dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">View Dashboard</Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-4 shadow-sm">
          <div className="rounded-xl border bg-background p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SEO Health</p>
                <p className="text-4xl font-bold">82</p>
              </div>

              <div className="rounded-full border px-3 py-1 text-sm">
                Good
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Top Keywords</p>
                <p className="text-2xl font-bold">36</p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Open Issues</p>
                <p className="text-2xl font-bold">14</p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">PageSpeed SEO</p>
                <p className="text-2xl font-bold">91</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold">Built for SEO workflows</h2>
          <p className="mt-3 text-muted-foreground">
            A focused toolkit for audits, visibility tracking, and client-ready reporting.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}