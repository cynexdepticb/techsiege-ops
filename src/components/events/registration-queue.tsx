"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RegistrationReview, type Registration } from "./registration-review";
import { Button } from "@/components/ui/button";

const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const control = "border border-border bg-background px-3 py-2 text-sm";

export function RegistrationQueue({ event, registrations }: { event: string; registrations: Registration[] }) {
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState("");
  const [track, setTrack] = useState("");
  const [busy, setBusy] = useState(false);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = registrations.filter(r => {
    if ((payment && r.paymentStatus !== payment) || (track && r.trackId !== track)) return false;
    const text = [r.teamName, r.teamCode, r.institution, r.city, ...r.members.flatMap(m => [m.name, m.email, m.phone])].join(" ").toLowerCase();
    return terms.every(term => text.includes(term));
  });

  async function download(format: "xlsx" | "csv" | "pdf") {
    setBusy(true);
    try {
      const { exportRegistrations } = await import("./registration-export");
      await exportRegistrations(event, matches, format);
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="flex flex-wrap items-end gap-3 p-4">
      <label className="grid gap-1 text-sm">Search teams
        <input type="search" className={control} value={query} onChange={e => setQuery(e.target.value)} placeholder="Team, code, college or member" />
      </label>
      <label className="grid gap-1 text-sm">Payment
        <select className={control} value={payment} onChange={e => setPayment(e.target.value)}>
          <option value="">All payments</option>
          {[...new Set(registrations.map(r => r.paymentStatus))].sort().map(p => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Track
        <select className={control} value={track} onChange={e => setTrack(e.target.value)}>
          <option value="">All tracks</option>
          {[...new Set(registrations.map(r => r.trackId))].filter(Boolean).sort().map(t => <option key={t}>{t}</option>)}
        </select>
      </label>
      <Button variant="ghost" disabled={!query && !payment && !track} onClick={() => { setQuery(""); setPayment(""); setTrack(""); }}>Clear filters</Button>
    </div>
    <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
      <span aria-live="polite" className="mr-auto text-sm">{matches.length} matching teams</span>
      {(["xlsx", "csv", "pdf"] as const).map(format => <Button key={format} variant="outline" size="sm" disabled={busy || !matches.length} onClick={() => download(format)}>Export {format === "xlsx" ? "Excel" : format.toUpperCase()}</Button>)}
    </div>
    {matches.length === 0 ? <p className="p-5">No matching registrations.</p> :
      <div className="overflow-x-auto"><table className="w-full min-w-180 text-left text-sm">
        <thead className="bg-muted/40"><tr>{["Team", "Leader", "College", "Track", "Payment", "Registered"].map(h => <th key={h} className="px-5 py-3">{h}</th>)}</tr></thead>
        <tbody>{matches.map(r => <tr key={r.id} className="border-t border-border">
          <td className="px-5 py-4"><RegistrationReview registration={r} /><p className="text-xs text-muted-foreground">{r.teamCode} · {r.memberCount} members</p></td>
          <td className="px-5 py-4">{r.leaderName}<p className="text-xs">{r.leaderEmail}</p></td>
          <td className="px-5 py-4">{r.institution}</td><td className="px-5 py-4">{r.trackId}</td>
          <td className="px-5 py-4">{r.paymentStatus}</td><td className="px-5 py-4">{date.format(new Date(r.submittedAt))}</td>
        </tr>)}</tbody>
      </table></div>}
  </>;
}
