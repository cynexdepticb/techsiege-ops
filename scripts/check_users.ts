import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "/home/santhosh/Work/agentx/ops/src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }, { schema: "ops" }),
});

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, active: true, name: true, passwordHash: true } });
  console.log(JSON.stringify(users.map(u => ({ ...u, passwordHash: u.passwordHash ? u.passwordHash.slice(0, 20) + "..." : null })), null, 2));
  await prisma.$disconnect();
}

main().catch((e) => { console.error("ERR", e); process.exit(1); });
