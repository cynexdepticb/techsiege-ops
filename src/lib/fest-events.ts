export const FEST_EVENTS = [
  { slug: "hackathon", name: "Hackathon", number: "01", accent: "#43dff4", description: "Build and present a working solution." },
  { slug: "ctf", name: "CTF", number: "02", accent: "#ff9a6b", description: "Jeopardy-style security challenges." },
  { slug: "circuit-breaker", name: "Circuit Breaker", number: "03", accent: "#d8ef62", description: "Hands-on circuit and engineering challenge." },
  { slug: "crack-the-code", name: "Crack the Code", number: "04", accent: "#b89cff", description: "Timed collaborative problem solving." },
  { slug: "e-sports", name: "E-sports", number: "05", accent: "#ff67ae", description: "Competitive team gaming arena." },
] as const;

export type FestEventSlug = (typeof FEST_EVENTS)[number]["slug"];

export function findFestEvent(slug: string) {
  return FEST_EVENTS.find((event) => event.slug === slug);
}
