"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeIndianRupee, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function PaymentPanel({ team, defaultAmount }: { team: { id: string; code: string; name: string; paymentStatus: "UNPAID" | "PAID"; amountPaid: string | null; paymentRef: string; paidAt: string | null }; defaultAmount: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(defaultAmount);
  const [reference, setReference] = useState(team.paymentRef);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paid = team.paymentStatus === "PAID";

  async function verify() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/teams/${team.id}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark-paid", amountPaid: amount.trim() ? Number(amount) : null, paymentRef: reference.trim() || undefined }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { setError(data.error ?? "Payment could not be verified."); return; }
      toast.success(`Payment verified · ${team.code}`, { description: data.sent ? "Registration confirmed and email sent." : data.reason || "Registration confirmed." });
      router.refresh();
    } catch { setError("Could not reach the server."); } finally { setBusy(false); }
  }

  return <Card>
    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
      <div><CardTitle className="text-base">Payment</CardTitle><CardDescription className="mt-1">Verify the entry fee to confirm this registration.</CardDescription></div>
      <Badge variant={paid ? "success" : "muted"}>{paid ? "Paid" : "Unpaid"}</Badge>
    </CardHeader>
    <CardContent className="space-y-4">
      {paid ? <>
        <div className="flex items-start gap-3 border-l-2 border-success bg-success/5 p-3 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /><div><p className="font-medium">Registration confirmed</p><p className="mt-1 text-muted-foreground">Team code <span className="font-mono text-foreground">{team.code}</span> is used for event check-in.</p></div></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2"><Detail label="Amount" value={team.amountPaid ? `₹${team.amountPaid}` : "Not recorded"} /><Detail label="Reference" value={team.paymentRef || "Not recorded"} /><Detail label="Verified" value={team.paidAt ? new Date(team.paidAt).toLocaleString("en-IN") : "Not recorded"} /></dl>
      </> : <>
        <p className="text-sm text-muted-foreground">Confirming payment approves the registration and sends a confirmation email. No ticket or PDF is issued.</p>
        <div className="grid gap-4 sm:grid-cols-[9rem_1fr]"><div><Label htmlFor="pay-amount">Amount (₹)</Label><Input id="pay-amount" className="mt-2" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy} /></div><div><Label htmlFor="pay-reference">UPI / bank reference</Label><Input id="pay-reference" className="mt-2" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="UPI reference or cash" disabled={busy} /></div></div>
        <Button onClick={verify} disabled={busy} className="w-full">{busy ? <Loader2 className="animate-spin" /> : <BadgeIndianRupee />}Verify payment</Button>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </CardContent>
  </Card>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
