import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, UsersRound } from "lucide-react";
import { requireActor } from "@/lib/guards";
import { getPublicRegistrationAnalytics } from "@/lib/public-registration-analytics";
import { FEST_EVENTS } from "@/lib/fest-events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/charts/stat-card";
import { DailySignupsChart, TeamSizeChart, TrackDonut } from "@/components/charts/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/fields";
import { formatNumber, pct } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_VERIFICATION: "Awaiting verification",
  PAYMENT_REJECTED: "Payment rejected",
  RESUBMISSION_REQUIRED: "Resubmission required",
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export default async function AnalyticsPage() {
  await requireActor();
  const { headline, eventStats, daily, paymentMix, registrationMix, colleges, sizes } = await getPublicRegistrationAnalytics(30);
  const peak = Math.max(...daily.map((day) => day.teams), 0);
  const thisWeek = daily.slice(-7).reduce((sum, day) => sum + day.teams, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Analytics" description="Live registration and payment data from the shared TechSiege event database." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered teams" value={headline.totalTeams} hint="excluding cancelled registrations" />
        <StatCard label="Participants" value={headline.totalParticipants} hint={`across ${headline.totalColleges} colleges`} />
        <StatCard label="Payment verified" value={headline.verifiedTeams} tone={headline.pendingTeams === 0 ? "success" : "warning"} hint={`${headline.pendingTeams} awaiting action`} />
        <StatCard label="Colleges" value={headline.totalColleges} hint="unique registered institutions" />
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle>Events</CardTitle>
          <CardDescription>Registration and participant totals for every TechSiege arena.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {eventStats.map((event, index) => {
            const definition = FEST_EVENTS[index];
            return (
              <Link key={event.id} href={`/admin/events/${event.id}`} className="group border border-border bg-muted/20 p-4 transition-colors hover:border-primary/60 hover:bg-muted/40" style={{ borderTopColor: definition.accent, borderTopWidth: 3 }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Event {definition.number}</p>
                    <h2 className="mt-2 font-semibold leading-tight">{event.name}</h2>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <p className="mt-5 text-3xl font-semibold tabular-nums" style={{ color: definition.accent }}>{event.teams}</p>
                <p className="text-xs text-muted-foreground">registered teams</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{event.participants} participants</span>
                  <span>{event.verified} verified</span>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div><CardTitle>Registrations over time</CardTitle><CardDescription>Last 30 days · peak {peak} team{peak === 1 ? "" : "s"} in one day</CardDescription></div>
              <Badge variant="muted">{thisWeek} this week</Badge>
            </div>
          </CardHeader>
          <CardContent><DailySignupsChart data={daily} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0"><CardTitle>Event mix</CardTitle><CardDescription>Share of registered teams</CardDescription></CardHeader>
          <CardContent>
            <TrackDonut data={eventStats} />
            <ul className="mt-2 space-y-2">
              {eventStats.map((event, index) => (
                <li key={event.id} className="flex items-center gap-2 text-sm">
                  <span className="size-2 shrink-0" style={{ backgroundColor: FEST_EVENTS[index].accent }} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{event.name}</span>
                  <span className="tabular-nums">{event.teams}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle>Team size</CardTitle><CardDescription>Actual participants per registered team</CardDescription></CardHeader>
          <CardContent><TeamSizeChart data={sizes} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Payment status</CardTitle><CardDescription>Verification state in the event backend</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {paymentMix.map((item) => <StatusRow key={item.status} icon={item.status === "VERIFIED" ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />} label={STATUS_LABELS[item.status] ?? item.status} count={item.count} total={headline.totalTeams} success={item.status === "VERIFIED"} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Registration status</CardTitle><CardDescription>Current registration lifecycle</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {registrationMix.map((item) => <StatusRow key={item.status} icon={<UsersRound className="size-4" />} label={STATUS_LABELS[item.status] ?? item.status.replaceAll("_", " ").toLowerCase()} count={item.count} total={headline.totalTeams} success={item.status === "CONFIRMED"} />)}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div><CardTitle>Colleges</CardTitle><CardDescription>Institutions represented by active registrations.</CardDescription></div>
            <Badge variant="muted">{headline.totalColleges} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>College</TableHead><TableHead>City</TableHead><TableHead className="text-right">Teams</TableHead><TableHead className="text-right">Participants</TableHead><TableHead className="text-right">Share</TableHead></TableRow></TableHeader>
            <TableBody>
              {colleges.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No registrations yet.</TableCell></TableRow> : colleges.map((college) => (
                <TableRow key={`${college.college}-${college.city ?? ""}`}>
                  <TableCell className="font-medium">{college.college}</TableCell>
                  <TableCell className="text-muted-foreground">{college.city ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{college.teams}</TableCell>
                  <TableCell className="text-right tabular-nums">{college.participants}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{pct(college.teams, headline.totalTeams)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({ icon, label, count, total, success }: { icon: ReactNode; label: string; count: number; total: number; success: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className={success ? "text-success" : "text-muted-foreground"}>{icon}</span>
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      <span className="font-medium tabular-nums">{formatNumber(count)}</span>
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{pct(count, total)}%</span>
    </div>
  );
}
