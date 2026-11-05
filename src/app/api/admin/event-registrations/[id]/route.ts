import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, fail, zodFail } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendEmail, toHtml } from "@/lib/email/send";

const inputSchema = z.object({ decision: z.enum(["VERIFY", "REJECT"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await guard("teams", "write");
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return zodFail(parsed.error);

  const rows = await prisma.$queryRaw<{ team_name: string; team_code: string; institution: string; payment_screenshot_path: string; full_name: string | null; email: string | null }[]>`
    SELECT t.team_name, t.team_code, t.institution, t.payment_screenshot_path, m.full_name, m.email
    FROM public.teams t
    LEFT JOIN public.members m ON m.team_id = t.id AND m.is_lead = true
    WHERE t.id = ${id}
    LIMIT 1
  `;
  const team = rows[0];
  if (!team) return fail(404, "Registration not found.");

  if (parsed.data.decision === "REJECT") {
    await prisma.$executeRaw`UPDATE public.teams SET registration_status = 'PAYMENT_REJECTED', payment_status = 'REJECTED', updated_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true, emailSent: false, message: "Payment marked as rejected." });
  }
  if (!team.payment_screenshot_path) return fail(422, "No payment receipt was uploaded for this registration.");
  if (!team.email) return fail(422, "No team-leader email is available for this registration.");

  await prisma.$executeRaw`UPDATE public.teams SET registration_status = 'CONFIRMED', payment_status = 'VERIFIED', verified_at = now(), verified_by = ${auth.actor.email}, rejection_reason = '', updated_at = now() WHERE id = ${id}`;
  const firstName = (team.full_name ?? "there").trim().split(/\s+/)[0] || "there";
  const body = `Hi ${firstName},\n\nYour payment has been verified and your registration for TechSiege 2026 is confirmed.\n\nTeam: ${team.team_name}\nTeam code: ${team.team_code}\nCollege: ${team.institution}\n\nPlease bring your college ID and quote your team code at the event desk. Final event instructions will be shared shortly.\n\nTechSiege Operations`;
  const sent = await sendEmail({ to: team.email, subject: "TechSiege 2026 — Registration confirmed", html: toHtml(body) });
  await prisma.$executeRaw`UPDATE public.teams SET confirmation_email_status = ${sent.status === "SENT" ? "SENT" : "FAILED"} WHERE id = ${id}`;
  return NextResponse.json({ ok: true, emailSent: sent.status === "SENT", message: sent.status === "SENT" ? "Final confirmation email sent to the team leader." : sent.error ?? "Payment verified, but email delivery failed." });
}
