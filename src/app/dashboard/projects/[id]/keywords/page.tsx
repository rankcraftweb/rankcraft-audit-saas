import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const keywords = [
  {
    query: "wordpress seo services",
    clicks: 24,
    impressions: 880,
    ctr: "2.7%",
    position: "12.4",
  },
  {
    query: "technical seo specialist",
    clicks: 18,
    impressions: 540,
    ctr: "3.3%",
    position: "9.8",
  },
  {
    query: "website speed optimization",
    clicks: 11,
    impressions: 410,
    ctr: "2.6%",
    position: "15.1",
  },
];

export default function KeywordsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Keyword Visibility</h2>
        <p className="text-muted-foreground">
          Track clicks, impressions, CTR, and average position.
        </p>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Impressions</TableHead>
              <TableHead>CTR</TableHead>
              <TableHead>Position</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.map((keyword) => (
              <TableRow key={keyword.query}>
                <TableCell className="font-medium">{keyword.query}</TableCell>
                <TableCell>{keyword.clicks}</TableCell>
                <TableCell>{keyword.impressions}</TableCell>
                <TableCell>{keyword.ctr}</TableCell>
                <TableCell>{keyword.position}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}