import "server-only";
import { prisma } from "@/lib/prisma";

/** Same name after harmless formatting differences are removed. */
export function normalizeTeamName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks both registration sources. Ops registrations live in ops.teams, while
 * public-site registrations live in public.teams and may not have been synced.
 */
export async function findExistingTeamName(name: string): Promise<string | null> {
  const key = normalizeTeamName(name);
  if (!key) return null;

  const [opsRows, publicRows] = await Promise.all([
    prisma.$queryRaw<{ name: string }[]>`
      SELECT name
      FROM ops.teams
      WHERE trim(regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'), '[[:space:]]+', ' ', 'g')) = ${key}
      LIMIT 1
    `,
    prisma.$queryRaw<{ name: string }[]>`
      SELECT team_name AS name
      FROM public.teams
      WHERE registration_status <> 'CANCELLED'
        AND trim(regexp_replace(regexp_replace(lower(team_name), '[^a-z0-9]+', ' ', 'g'), '[[:space:]]+', ' ', 'g')) = ${key}
      LIMIT 1
    `.catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "42P01"
      ) {
        return [] as { name: string }[];
      }
      throw error;
    }),
  ]);

  return opsRows[0]?.name ?? publicRows[0]?.name ?? null;
}
