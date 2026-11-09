"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, ImageOff, Loader2, Maximize2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Registration = {
  id: string;
  teamCode: string;
  teamName: string;
  institution: string;
  city: string;
  leaderName: string | null;
  leaderEmail: string | null;
  trackId: string;
  memberCount: number;
  members: { name: string; email: string; phone: string; branchYear: string; isLead: boolean }[];
  registrationStatus: string;
  paymentStatus: string;
  paymentReference: string;
  confirmationEmailStatus: string;
  rejectionReason: string;
  submittedAt: string;
  verifiedAt: string | null;
  hasScreenshot: boolean;
};
type Decision = "VERIFY" | "REJECT";

export function RegistrationReview({ registration }: { registration: Registration }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"verify" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Decision | null>(null);
  const [receiptFailed, setReceiptFailed] = useState(false);
  const screenshotUrl = `/api/admin/event-registrations/${registration.id}/screenshot`;

  function close() {
    setConfirmation(null);
    setOpen(false);
  }

  async function decide(decision: Decision) {
    setBusy(decision === "VERIFY" ? "verify" : "reject");
    setError("");

    try {
      const response = await fetch(`/api/admin/event-registrations/${registration.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "The registration could not be updated.");
        return;
      }
      toast.success(decision === "VERIFY" ? "Payment verified" : "Payment rejected", {
        description: data.emailSent ? "Final confirmation email sent to the team leader." : data.message,
      });
      close();
      router.refresh();
    } catch {
      setError("Could not reach the verification service.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirmation(null);
          setReceiptFailed(false);
          setOpen(true);
        }}
        className="text-left font-medium hover:text-primary hover:underline"
      >
        {registration.teamName}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Review ${registration.teamName}`}>
          <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <p className="ops-kicker">Payment review</p>
                <h2 className="mt-2 text-xl font-semibold">{registration.teamName}</h2>
                <p className="mt-1 font-mono text-sm text-muted-foreground">{registration.teamCode}</p>
              </div>
              <button type="button" onClick={close} className="text-sm text-muted-foreground hover:text-foreground" disabled={busy !== null}>
                Close
              </button>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,.85fr)]">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Payment receipt</p>
                  {registration.hasScreenshot && !receiptFailed && (
                    <a href={screenshotUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      Full size <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>

                {registration.hasScreenshot && !receiptFailed ? (
                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative mt-2 block overflow-hidden border border-border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open the payment receipt at full size"
                  >
                    <img
                      src={screenshotUrl}
                      alt={`Payment receipt uploaded by ${registration.teamName}`}
                      className="h-64 w-full object-contain"
                      onError={() => setReceiptFailed(true)}
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/75 py-2 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Maximize2 className="size-3.5" /> View full size
                    </span>
                  </a>
                ) : (
                  <div className="mt-2 grid min-h-64 place-items-center border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    <div>
                      <ImageOff className="mx-auto mb-3 size-5" />
                      <p>{registration.hasScreenshot ? "The payment receipt could not be loaded." : "No payment receipt was uploaded."}</p>
                      {registration.hasScreenshot && <p className="mt-1 text-xs">Check that shared receipt storage is configured.</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={registration.registrationStatus === "CONFIRMED" ? "success" : "muted"}>{formatStatus(registration.registrationStatus)}</Badge>
                  <Badge variant={registration.paymentStatus === "VERIFIED" ? "success" : "muted"}>{registration.paymentStatus === "VERIFIED" ? "Payment verified" : formatStatus(registration.paymentStatus)}</Badge>
                </div>
                <Detail label="Leader" value={registration.leaderName ?? "—"} />
                <Detail label="Email" value={registration.leaderEmail ?? "—"} />
                <Detail label="College" value={registration.institution} />
                <Detail label="City" value={registration.city || "Not provided"} />
                <Detail label="Track" value={registration.trackId} />
                <Detail label="Team size" value={`${registration.memberCount} members`} />
                <Detail label="UPI reference" value={registration.paymentReference || "Not provided"} />
                <Detail label="Confirmation email" value={formatStatus(registration.confirmationEmailStatus)} />
                <Detail label="Submitted" value={formatTimestamp(registration.submittedAt)} />
                <Detail label="Verified" value={registration.verifiedAt ? formatTimestamp(registration.verifiedAt) : "Not verified"} />
                {registration.rejectionReason && <Detail label="Rejection reason" value={registration.rejectionReason} />}
              </div>
            </div>

            <section className="mx-5 mb-5 border-t border-border pt-5" aria-labelledby={`members-${registration.id}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 id={`members-${registration.id}`} className="font-semibold">Team members</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Full roster and participant contact details.</p>
                </div>
                <Badge variant="muted">{registration.members.length} people</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {registration.members.map((member, index) => (
                  <article key={`${member.email}-${index}`} className="border border-border bg-muted/20 p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{member.name}</p>
                      {member.isLead && <Badge variant="default">Team leader</Badge>}
                    </div>
                    <dl className="mt-3 space-y-2 text-xs">
                      <MemberDetail label="Email" value={member.email} />
                      <MemberDetail label="Phone" value={member.phone} />
                      <MemberDetail label="Branch / year" value={member.branchYear || "Not provided"} />
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            {confirmation && (
              <div className="mx-5 border border-warning/60 bg-warning/10 p-4 text-sm" role="alert">
                <p className="font-semibold">{confirmation === "VERIFY" ? "Verify this payment and send the final email?" : "Reject this payment?"}</p>
                <p className="mt-1 text-muted-foreground">This action changes the registration status. Confirm once more to continue.</p>
              </div>
            )}
            {error && <p role="alert" className="mx-5 mt-4 text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap justify-end gap-3 border-t border-border p-5">
              {confirmation ? (
                <>
                  <Button variant="outline" onClick={() => setConfirmation(null)} disabled={busy !== null}>Cancel</Button>
                  <Button variant={confirmation === "REJECT" ? "destructive" : "default"} onClick={() => decide(confirmation)} disabled={busy !== null}>
                    {busy ? <Loader2 className="animate-spin" /> : confirmation === "VERIFY" ? <CheckCircle2 /> : <XCircle />}
                    {confirmation === "VERIFY" ? "Confirm verification" : "Confirm rejection"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setConfirmation("REJECT")} disabled={busy !== null}>Reject</Button>
                  <Button onClick={() => setConfirmation("VERIFY")} disabled={busy !== null || !registration.hasScreenshot || receiptFailed || registration.paymentStatus === "VERIFIED"}>
                    <CheckCircle2 />Verify &amp; send final email
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

function MemberDetail({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[5.5rem_1fr] gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
