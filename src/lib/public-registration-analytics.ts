import "server-only";
import { prisma } from "@/lib/prisma";
import { FEST_EVENTS } from "@/lib/fest-events";

export type RegistrationHeadline = {
  totalTeams: number;
  totalParticipants: number;
  verifiedTeams: number;
  pendingTeams: number;
  totalColleges: number;
};

export type EventRegistrationStat = {
  id: string;
  name: string;
  teams: number;
  participants: number;
  verified: number;
};

export type DailyRegistration = {
  date: string;
  label: string;
  teams: number;
  cumulative: number;
};

export type RegistrationStatusStat = { status: string; count: number };
export type RegistrationCollegeStat = { college: string; city: string; teams: number; participants: number };
export type RegistrationSizeStat = { size: number; teams: number };

type CountRow = { count: number };

function kolkataDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function collegeKey(value: string) {
  return value
    .toLocaleLowerCase("en-IN")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalCollegeName(value: string) {
  const key = collegeKey(value);

  if (key.includes("a j institute of engineering and technology") || key.includes("aj institute of engineering and technology")) {
    return "A J Institute of Engineering and Technology";
  }
  if (key === "a i e t" || key.startsWith("aiet ") || key.includes("alvas")) {
    return "Alva's Institute of Engineering and Technology";
  }
  if (key.includes("canara engineering college")) {
    return "Canara Engineering College";
  }
  if (key.includes("atme college of engineering")) {
    return "ATME College of Engineering, Mysore";
  }
  if (key === "nmamit" || key.includes("nmam institute of technology")) {
    return "NMAM Institute of Technology, Nitte";
  }
  if (key.includes("dr nsam") || key.includes("dr nsam first grade college")) {
    return "Dr NSAM First Grade College";
  }
  if (key.includes("yenepoya institute of technology") || key.includes("yenepoya institution of technology")) {
    return "Yenepoya Institute of Technology";
  }
  return value.trim().replace(/\s+/g, " ");
}

function mergeCollegeRows(rows: RegistrationCollegeStat[]) {
  const merged = new Map<string, RegistrationCollegeStat>();
  for (const row of rows) {
    const college = canonicalCollegeName(row.college);
    const key = collegeKey(college);
    const current = merged.get(key);
    if (current) {
      current.teams += row.teams;
      current.participants += row.participants;
      if (!current.city && row.city) current.city = row.city;
    } else {
      merged.set(key, { college, city: row.city, teams: row.teams, participants: row.participants });
    }
  }
  return [...merged.values()].sort((a, b) => b.teams - a.teams || a.college.localeCompare(b.college));
}

export async function getPublicRegistrationAnalytics(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [teamRows, participantRows, verifiedRows, collegeRows, events, dailyRows, paymentMix, registrationMix, sizes] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`SELECT COUNT(*)::int AS count FROM public.teams WHERE registration_status <> 'CANCELLED'`,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(m.id)::int AS count
      FROM public.members m
      JOIN public.teams t ON t.id = m.team_id
      WHERE t.registration_status <> 'CANCELLED'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM public.teams
      WHERE registration_status <> 'CANCELLED' AND payment_status = 'VERIFIED'
    `,
    prisma.$queryRaw<RegistrationCollegeStat[]>`
      SELECT
        t.institution AS college,
        NULLIF(trim(t.city), '') AS city,
        COUNT(DISTINCT t.id)::int AS teams,
        COUNT(m.id)::int AS participants
      FROM public.teams t
      LEFT JOIN public.members m ON m.team_id = t.id
      WHERE t.registration_status <> 'CANCELLED'
      GROUP BY t.institution, t.city
      ORDER BY teams DESC, t.institution ASC
    `,
    prisma.$queryRaw<{ event_slug: string; teams: number; participants: number; verified: number }[]>`
      SELECT
        t.event_slug,
        COUNT(DISTINCT t.id)::int AS teams,
        COUNT(m.id)::int AS participants,
        COUNT(DISTINCT t.id) FILTER (WHERE t.payment_status = 'VERIFIED')::int AS verified
      FROM public.teams t
      LEFT JOIN public.members m ON m.team_id = t.id
      WHERE t.registration_status <> 'CANCELLED'
      GROUP BY t.event_slug
    `,
    prisma.$queryRaw<{ date: string; teams: number }[]>`
      SELECT
        (submitted_at AT TIME ZONE 'Asia/Kolkata')::date::text AS date,
        COUNT(*)::int AS teams
      FROM public.teams
      WHERE registration_status <> 'CANCELLED' AND submitted_at >= ${since}
      GROUP BY (submitted_at AT TIME ZONE 'Asia/Kolkata')::date
      ORDER BY (submitted_at AT TIME ZONE 'Asia/Kolkata')::date
    `,
    prisma.$queryRaw<RegistrationStatusStat[]>`
      SELECT payment_status AS status, COUNT(*)::int AS count
      FROM public.teams
      WHERE registration_status <> 'CANCELLED'
      GROUP BY payment_status
      ORDER BY payment_status
    `,
    prisma.$queryRaw<RegistrationStatusStat[]>`
      SELECT registration_status AS status, COUNT(*)::int AS count
      FROM public.teams
      WHERE registration_status <> 'CANCELLED'
      GROUP BY registration_status
      ORDER BY registration_status
    `,
    prisma.$queryRaw<RegistrationSizeStat[]>`
      SELECT member_count AS size, COUNT(*)::int AS teams
      FROM (
        SELECT t.id, COUNT(m.id)::int AS member_count
        FROM public.teams t
        LEFT JOIN public.members m ON m.team_id = t.id
        WHERE t.registration_status <> 'CANCELLED'
        GROUP BY t.id
      ) team_sizes
      GROUP BY member_count
      ORDER BY member_count
    `,
  ]);

  const totalTeams = teamRows[0]?.count ?? 0;
  const verifiedTeams = verifiedRows[0]?.count ?? 0;
  const allColleges = mergeCollegeRows(collegeRows);
  const colleges = allColleges.slice(0, 10);
  const eventMap = new Map(events.map((row) => [row.event_slug, row]));
  const eventStats: EventRegistrationStat[] = FEST_EVENTS.map((event) => {
    const row = eventMap.get(event.slug);
    return {
      id: event.slug,
      name: event.name,
      teams: row?.teams ?? 0,
      participants: row?.participants ?? 0,
      verified: row?.verified ?? 0,
    };
  });

  const dailyMap = new Map(dailyRows.map((row) => [row.date, row.teams]));
  const daily: DailyRegistration[] = [];
  let cumulative = Math.max(0, totalTeams - dailyRows.reduce((sum, row) => sum + row.teams, 0));
  for (let offset = 0; offset <= days; offset += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + offset);
    const key = kolkataDateKey(date);
    const teams = dailyMap.get(key) ?? 0;
    cumulative += teams;
    daily.push({
      date: key,
      label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(date),
      teams,
      cumulative,
    });
  }

  const headline: RegistrationHeadline = {
    totalTeams,
    totalParticipants: participantRows[0]?.count ?? 0,
    verifiedTeams,
    pendingTeams: Math.max(0, totalTeams - verifiedTeams),
    totalColleges: allColleges.length,
  };

  return { headline, eventStats, daily, paymentMix, registrationMix, colleges, sizes };
}

