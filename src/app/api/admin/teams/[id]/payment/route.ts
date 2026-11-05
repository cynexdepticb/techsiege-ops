import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { fail, guard, zodFail } from "@/lib/http";
import { markTeamPaid } from "@/lib/payment";
import { paymentSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/teams/[id]/payment
 *
 *   { action: "mark-paid", amountPaid?: number, paymentRef?: string }
 * Payment verification confirms the registration and sends a simple
 * acknowledgement to the team lead. Admission tickets are not part of Ops.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await guard("teams", "write");
  if ("response" in auth) return auth.response;

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Invalid request.");
  }

  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return zodFail(parsed.error as ZodError);
  const input = parsed.data;

  const result = await markTeamPaid({
    teamId: id,
    amountPaid: input.amountPaid,
    paymentRef: input.paymentRef,
    actorId: auth.actor.id,
    actorEmail: auth.actor.email,
  });
  if (!result.ok) return fail(404, result.reason ?? "Could not record the payment.");

  return NextResponse.json({ ...result, ok: true });
}
