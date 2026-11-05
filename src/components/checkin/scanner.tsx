"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Search, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Participant = { id: string; name: string; email: string; role: string; checkedIn?: boolean; checkedInAt?: string | null };
type Result =
  | { kind: "ok"; duplicate: boolean; message?: string; team: { code: string; name: string; college: string; track: { name: string }; _count: { participants: number }; participants?: Participant[] }; matchedParticipant?: Participant }
  | { kind: "error"; message: string };

export function CheckinScanner({ actorName }: { actorName: string }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function checkIn(event: FormEvent) {
    event.preventDefault();
    const payload = query.trim();
    if (!payload || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        const message = data.error ?? "No matching team or attendee was found.";
        setResult({ kind: "error", message }); toast.error(message); return;
      }
      const next = { kind: "ok" as const, duplicate: Boolean(data.duplicate), message: data.message, team: data.team, matchedParticipant: data.matchedParticipant };
      setResult(next);
      toast[next.duplicate ? "warning" : "success"](next.duplicate ? "Already checked in" : "Check-in recorded", { description: next.message });
      setQuery("");
    } catch { setResult({ kind: "error", message: "Could not reach the check-in service." }); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
    <Card>
      <CardHeader><CardTitle className="text-base">Desk check-in</CardTitle><CardDescription>Search by team code or attendee email. Tickets and QR passes are not used.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={checkIn} className="space-y-4">
          <label htmlFor="checkin-query" className="text-sm font-medium">Team code or attendee email</label>
          <Input id="checkin-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="AGX-XXXX or attendee@college.edu" autoComplete="off" />
          <p className="text-xs text-muted-foreground">Logged in as {actorName}. Enter the attendee email for individual check-in; enter a team code to check in the team.</p>
          <Button type="submit" className="w-full" disabled={busy || !query.trim()}>{busy ? "Checking in…" : <><Search />Find and check in</>}</Button>
        </form>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="text-base">Admission result</CardTitle><CardDescription>Live desk confirmation.</CardDescription></CardHeader>
      <CardContent>
        {!result && <div className="grid min-h-56 place-items-center border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><div><UserCheck className="mx-auto mb-3 size-7 text-primary" /><p className="font-medium text-foreground">Ready for a lookup</p><p className="mt-1">Enter a team code or attendee email to begin.</p></div></div>}
        {result?.kind === "error" && <div role="alert" className="flex min-h-56 flex-col items-center justify-center border border-destructive/50 bg-destructive/10 p-8 text-center"><XCircle className="size-7 text-destructive" /><p className="mt-3 font-semibold">Check-in unavailable</p><p className="mt-1 text-sm text-muted-foreground">{result.message}</p></div>}
        {result?.kind === "ok" && <div className="space-y-5"><div className="flex items-start justify-between gap-4 border-l-2 border-success bg-success/5 p-4"><div><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-success" /><p className="font-semibold">{result.duplicate ? "Already checked in" : "Check-in confirmed"}</p></div><p className="mt-2 text-sm text-muted-foreground">{result.message}</p></div><Badge variant={result.duplicate ? "muted" : "success"}>{result.duplicate ? "Existing" : "Admitted"}</Badge></div><dl className="grid gap-4 text-sm sm:grid-cols-2"><Detail label="Team" value={result.team.name} /><Detail label="Team code" value={result.team.code} mono /><Detail label="Track" value={result.team.track.name} /><Detail label="College" value={result.team.college} /></dl>{result.matchedParticipant && <div className="border-t border-border pt-4"><p className="text-xs font-semibold text-muted-foreground">Attendee</p><p className="mt-1 font-medium">{result.matchedParticipant.name}</p><p className="text-sm text-muted-foreground">{result.matchedParticipant.email}</p></div>}</div>}
      </CardContent>
    </Card>
  </div>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className={mono ? "mt-1 font-mono font-semibold" : "mt-1 font-medium"}>{value}</dd></div>; }
