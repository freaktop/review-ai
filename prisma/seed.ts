import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const business = await prisma.business.upsert({ where: { slug: "demo-business" }, update: {}, create: { name: "Demo Business", slug: "demo-business", reviewUrl: "https://example.com/review", delayHours: 24 } });
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await prisma.businessAdmin.upsert({ where: { email: "admin@review.ai" }, update: {}, create: { businessId: business.id, email: "admin@review.ai", passwordHash, name: "Demo Admin" } });
  console.log("Seed complete. Login: admin@review.ai / demo1234");
}
main().catch((e)=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());