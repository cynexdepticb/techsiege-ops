import fs from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";
import { fail, guard } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await guard("teams");
  if ("response" in auth) return auth.response;
  const { id } = await context.params;
  const rows = await prisma.$queryRaw<{ payment_screenshot_path: string; payment_screenshot_mime: string }[]>`SELECT payment_screenshot_path, payment_screenshot_mime FROM public.teams WHERE id = ${id} LIMIT 1`;
  const receipt = rows[0];
  if (!receipt?.payment_screenshot_path) return fail(404, "No payment receipt is available.");

  // New uploads are stored as private Vercel Blobs by the event backend. Ops
  // reads them with the same store token, while retaining the local-file path
  // below for existing development receipts.
  if (receipt.payment_screenshot_path.startsWith("https://")) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      return fail(503, "Payment receipt storage is not configured for Ops.");
    }

    const blob = await get(receipt.payment_screenshot_path, {
      access: "private",
      token,
    }).catch(() => null);
    if (!blob?.stream || blob.statusCode !== 200) {
      return fail(404, "The uploaded payment receipt is no longer available.");
    }

    return new Response(blob.stream, {
      headers: {
        "Content-Type": receipt.payment_screenshot_mime || blob.blob.contentType || "image/png",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="payment-${id}"`,
      },
    });
  }

  const backendRoot = process.env.BACKEND_DATA_ROOT?.trim() || path.resolve(process.cwd(), "../backend");
  const paymentsRoot = path.resolve(backendRoot, "data", "payments");
  const absolute = path.resolve(backendRoot, receipt.payment_screenshot_path);
  if (!absolute.startsWith(`${paymentsRoot}${path.sep}`)) return fail(400, "Invalid payment receipt path.");
  const data = await fs.readFile(absolute).catch(() => null);
  if (!data) return fail(404, "The uploaded payment receipt is no longer available.");
  return new Response(new Uint8Array(data), { headers: { "Content-Type": receipt.payment_screenshot_mime || "image/png", "Cache-Control": "no-store", "Content-Disposition": `inline; filename="payment-${id}"` } });
}
