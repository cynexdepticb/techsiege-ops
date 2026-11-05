import "server-only";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";

export type PaymentOutcome = { ok: boolean; reason?: string; sent: number; recipients: number; undelivered: string[] };

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

function confirmationMessage(data: { leaderName: string; teamName: string; teamCode: string; college: string; trackName: string }) {
  const subject = "TechSiege 2026 — Registration confirmed";
  const text = `Hi ${data.leaderName},\n\nYour entry fee for ${data.teamName} (${data.teamCode}) has been verified. Your registration is confirmed.\n\nTrack: ${data.trackName}\nCollege: ${data.college}\n\nBring your college ID and quote your team code at check-in. Event-day instructions will be shared separately.\n\nTechSiege Operations`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#101310;color:#f2f4ed"><p style="color:#b8c0ae;font-size:12px">TECHSIEGE // 26</p><h1 style="font-size:24px">Registration confirmed</h1><p>Hi ${data.leaderName},</p><p>Your entry fee for <strong>${data.teamName}</strong> has been verified. Your registration is confirmed.</p><p><strong>Team code:</strong> ${data.teamCode}<br/><strong>Track:</strong> ${data.trackName}<br/><strong>College:</strong> ${data.college}</p><p>Bring your college ID and quote your team code at check-in. Event-day instructions will be shared separately.</p><p>TechSiege Operations</p></div>`;
  return { subject, text, html };
}

export async function markTeamPaid(input: { teamId: string; amountPaid?: number | null; paymentRef?: string; actorId: string; actorEmail?: string }): Promise<PaymentOutcome> {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    include: { track: true, participants: { orderBy: [{ role: "asc" }, { createdAt: "asc" }] } },
  });
  if (!team) return { ok: false, reason: "Team not found.", sent: 0, recipients: 0, undelivered: [] };

  const alreadyPaid = team.paymentStatus === "PAID";
  await prisma.team.update({
    where: { id: team.id },
    data: {
      paymentStatus: "PAID",
      status: "CONFIRMED",
      amountPaid: input.amountPaid ?? undefined,
      paymentRef: input.paymentRef?.trim() || team.paymentRef,
      paidAt: team.paidAt ?? new Date(),
      paidById: input.actorId,
    },
  });
  await audit({ actorId: input.actorId, actorEmail: input.actorEmail, action: alreadyPaid ? "team.payment.reconfirmed" : "team.payment.confirmed", entityType: "team", entityId: team.id, after: { paymentStatus: "PAID", status: "CONFIRMED" } });

  const leader = team.participants.find((participant) => participant.role === "LEADER") ?? team.participants[0];
  const recipientEmail = leader?.email || team.contactEmail;
  if (!recipientEmail) return { ok: true, reason: "Payment verified, but this team has no email address.", sent: 0, recipients: 0, undelivered: [] };

  const message = confirmationMessage({ leaderName: firstName(leader?.name || team.contactName), teamName: team.name, teamCode: team.code, college: team.college, trackName: team.track.name });
  const result = await sendEmail({ to: recipientEmail, subject: message.subject, html: message.html });
  await prisma.communicationLog.create({
    data: { type: "PAYMENT_ACKNOWLEDGEMENT", channel: "email", status: result.status, recipientEmail, recipientName: leader?.name || team.contactName, teamId: team.id, subject: message.subject, body: message.text, templateKey: "payment_confirmation", providerId: result.providerId ?? null, error: result.error ?? null, sentById: input.actorId, sentAt: result.status === "SENT" ? new Date() : null },
  });
  return result.status === "SENT"
    ? { ok: true, sent: 1, recipients: 1, undelivered: [] }
    : { ok: true, reason: result.error || "Confirmation email could not be delivered.", sent: 0, recipients: 1, undelivered: [recipientEmail] };
}
