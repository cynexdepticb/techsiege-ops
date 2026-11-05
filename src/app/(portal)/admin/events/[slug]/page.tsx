import { notFound } from "next/navigation";
import { requireActor } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { findFestEvent } from "@/lib/fest-events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegistrationReview } from "@/components/events/registration-review";

export const dynamic = "force-dynamic";

type Registration = {
  id: string;
  team_code: string;
  team_name: string;
  institution: string;
  track_id: string;
  registration_status: string;
  payment_status: string;
  payment_reference: string;
  screenshot_present: boolean;
  created_at: Date;
  member_count: number;
  leader_name: string | null;
  leader_email: string | null;
};

export default async function EventOpsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireActor();
  const { slug } = await params;
  const event = findFestEvent(slug);
  if (!event) notFound();

  const registrations = await prisma.$queryRaw<Registration[]>`
    SELECT
      t.id,
      t.team_code,
      t.team_name,
      t.institution,
      t.track_id,
      t.registration_status,
      t.payment_status,
      t.payment_reference,
      (t.payment_screenshot_path <> '') AS screenshot_present,
      t.created_at,
      COUNT(m.id)::int AS member_count,
      MAX(m.full_name) FILTER (WHERE m.is_lead) AS leader_name,
      MAX(m.email) FILTER (WHERE m.is_lead) AS leader_email
    FROM public.teams t
    LEFT JOIN public.members m ON m.team_id = t.id
    WHERE t.event_slug = ${event.slug}
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `;

  const paid = registrations.filter((registration) => registration.payment_status === "VERIFIED").length;
  const pending = registrations.length - paid;

  return <div className="p-4 sm:p-6 lg:p-8">
    <div className="ops-page">
      <div className="border-l-4 p-5" style={{ borderColor: event.accent, backgroundColor: `${event.accent}10` }}>
        <p className="ops-kicker">Event {event.number}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{event.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{event.description}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Registrations" value={registrations.length} accent={event.accent} />
        <Metric label="Payment verified" value={paid} accent={event.accent} />
        <Metric label="Awaiting verification" value={pending} accent={event.accent} />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Registration queue</CardTitle><CardDescription>Teams registered for {event.name}. Payment verification and confirmation email are handled through the event backend.</CardDescription></CardHeader>
        <CardContent className="p-0">
          {registrations.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No registrations have arrived for this event yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-180 text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Team</th><th className="px-5 py-3 font-medium">Leader</th><th className="px-5 py-3 font-medium">College</th><th className="px-5 py-3 font-medium">Track</th><th className="px-5 py-3 font-medium">Payment</th><th className="px-5 py-3 font-medium">Registered</th></tr></thead><tbody>{registrations.map((registration) => <tr key={registration.team_code} className="border-b border-border/70 last:border-0"><td className="px-5 py-4"><RegistrationReview registration={{ id: registration.id, teamCode: registration.team_code, teamName: registration.team_name, institution: registration.institution, leaderName: registration.leader_name, leaderEmail: registration.leader_email, trackId: registration.track_id, memberCount: registration.member_count, paymentStatus: registration.payment_status, paymentReference: registration.payment_reference, hasScreenshot: registration.screenshot_present }} /><p className="mt-1 font-mono text-xs text-muted-foreground">{registration.team_code} · {registration.member_count} members</p></td><td className="px-5 py-4"><p>{registration.leader_name ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{registration.leader_email ?? "—"}</p></td><td className="px-5 py-4 text-muted-foreground">{registration.institution}</td><td className="px-5 py-4 text-muted-foreground">{registration.track_id}</td><td className="px-5 py-4"><Badge variant={registration.payment_status === "VERIFIED" ? "success" : "muted"}>{registration.payment_status === "VERIFIED" ? "Verified" : "Pending"}</Badge></td><td className="px-5 py-4 whitespace-nowrap text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(registration.created_at)}</td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>
    </div>
  </div>;
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) { return <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: accent }}>{value}</p></CardContent></Card>; }
