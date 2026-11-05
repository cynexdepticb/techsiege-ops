import type { Role } from "@/generated/prisma/enums";

export type NavItem = {
  href: string;
  label: string;
  /** lucide-react icon name, resolved by components/shell/NavIcon */
  icon: string;
  /** Roles that can see this entry at all. */
  roles: Role[];
  /** Team-lead vertical that owns it (MODULE_VERTICAL in lib/authz). */
  module?: string;
  description: string;
  /** Present on routes reachable by URL but not listed in the sidebar. */
  hidden?: boolean;
};

/** Single source of truth for the sidebar. `lib/authz.ts` enforces access. */
export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Events",
    items: [
      {
        href: "/admin/events/hackathon",
        label: "Hackathon",
        icon: "Compass",
        roles: ["SUPER_ADMIN", "TEAM_LEAD"],
        description: "Hackathon registrations and payment queue",
      },
      {
        href: "/admin/events/ctf",
        label: "CTF",
        icon: "Compass",
        roles: ["SUPER_ADMIN", "TEAM_LEAD"],
        description: "CTF registrations and payment queue",
      },
      {
        href: "/admin/events/circuit-breaker",
        label: "Circuit Breaker",
        icon: "Compass",
        roles: ["SUPER_ADMIN", "TEAM_LEAD"],
        description: "Circuit Breaker registrations and payment queue",
      },
      {
        href: "/admin/events/crack-the-code",
        label: "Crack the Code",
        icon: "Compass",
        roles: ["SUPER_ADMIN", "TEAM_LEAD"],
        description: "Crack the Code registrations and payment queue",
      },
      {
        href: "/admin/events/e-sports",
        label: "E-sports",
        icon: "Compass",
        roles: ["SUPER_ADMIN", "TEAM_LEAD"],
        description: "E-sports registrations and payment queue",
      },
    ],
  },
];

/** Personal portals — a different shell, not part of the admin sidebar. */
export const PORTAL_NAV: NavItem[] = [
  {
    href: "/judge",
    label: "My teams",
    icon: "Scale",
    roles: ["JUDGE"],
    description: "Score the teams assigned to you",
  },
  {
    href: "/mentor",
    label: "My teams",
    icon: "MessagesSquare",
    roles: ["MENTOR"],
    description: "Checkpoints and feedback for your teams",
  },
];

export function visibleNav(roles: Role[]): { group: string; items: NavItem[] }[] {
  return NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !("hidden" in item && item.hidden) && item.roles.some((r) => roles.includes(r)),
    ),
  })).filter((section) => section.items.length > 0);
}
