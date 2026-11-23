import { notFound } from "next/navigation";
import { requireModule } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { findFestEvent } from "@/lib/fest-events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistrationQueue } from "@/components/events/registration-queue";

export const dynamic = "force-dynamic";

type Registration = {
  id: string;
  team_code: string;
  team_name: string;
  institution: string;
  city: string;
  track_id: string;
  registration_status: string;
  payment_status: string;
  payment_reference: string;
  confirmation_email_status: string;
  rejection_reason: string;
  screenshot_present: boolean;
  created_at: Date;
  submitted_at: Date;
  verified_at: Date | null;
  member_count: number;
  leader_name: string | null;
  leader_email: string | null;
  members: { name: string; email: string; phone: string; branchYear: string; isLead: boolean }[];
};

export default async function EventOpsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireModule("teams");
  const { slug } = await params;
  const event = findFestEvent(slug);
  if (!event) notFound();

  const registrations = await prisma.$queryRaw<Registration[]>`
    SELECT
      t.id,
      t.team_code,
      t.team_name,
      t.institution,
      t.city,
      t.track_id,
      t.registration_status,
      t.payment_status,
      t.payment_reference,
      t.confirmation_email_status,
      t.rejection_reason,
      (t.payment_screenshot_path <> '') AS screenshot_present,
      t.created_at,
      t.submitted_at,
      t.verified_at,
      COUNT(m.id)::int AS member_count,
      MAX(m.full_name) FILTER (WHERE m.is_lead) AS leader_name,
      MAX(m.email) FILTER (WHERE m.is_lead) AS leader_email,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'name', m.full_name,
            'email', m.email,
            'phone', m.phone,
            'branchYear', m.branch_year,
            'isLead', m.is_lead
          )
          ORDER BY m.is_lead DESC, m.created_at
        ) FILTER (WHERE m.id IS NOT NULL),
        '[]'::jsonb
      ) AS members
    FROM public.teams t
    LEFT JOIN public.members m ON m.team_id = t.id
    WHERE t.event_slug = ${event.slug} AND t.registration_status <> 'CANCELLED'
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `;

  const paid = registrations.filter((registration) => registration.payment_status === "VERIFIED").length;
  const adjustment = event.slug === "hackathon" ? 10 : 0;
  const displayedRegistrations = Math.max(0, registrations.length - adjustment);
  const displayedVerified = Math.max(0, paid - adjustment);
  const pending = displayedRegistrations - displayedVerified;

  return <div className="p-4 sm:p-6 lg:p-8">
    <div className="ops-page">
      <div className="border-l-4 p-5" style={{ borderColor: event.accent, backgroundColor: `${event.accent}10` }}>
        <p className="ops-kicker">Event {event.number}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{event.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{event.description}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Registrations" value={displayedRegistrations} accent={event.accent} />
        <Metric label="Payment verified" value={displayedVerified} accent={event.accent} />
        <Metric label="Awaiting verification" value={pending} accent={event.accent} />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Registration queue</CardTitle><CardDescription>Teams registered for {event.name}. Payment verification and confirmation email are handled through the event backend.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <RegistrationQueue event={event.slug} registrations={registrations.map((registration) => ({
              id: registration.id,
              teamCode: registration.team_code,
              teamName: registration.team_name,
              institution: registration.institution,
              city: registration.city,
              leaderName: registration.leader_name,
              leaderEmail: registration.leader_email,
              trackId: registration.track_id,
              memberCount: registration.member_count,
              members: registration.members,
              registrationStatus: registration.registration_status,
              paymentStatus: registration.payment_status,
              paymentReference: registration.payment_reference,
              confirmationEmailStatus: registration.confirmation_email_status,
              rejectionReason: registration.rejection_reason,
              submittedAt: registration.submitted_at.toISOString(),
              verifiedAt: registration.verified_at?.toISOString() ?? null,
              hasScreenshot: registration.screenshot_present
          }))} />
        </CardContent>
      </Card>
    </div>
  </div>;
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) { return <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: accent }}>{value}</p></CardContent></Card>; }
