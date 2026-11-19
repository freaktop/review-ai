import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });
  let businessId: string; let email: string;
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [b, e, ts, sig] = decoded.split(":");
    const expected = crypto.createHmac("sha256", SECRET).update(`${b}:${e}:${ts}`).digest("hex");
    if (sig !== expected) return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return NextResponse.json({ error: "expired" }, { status: 400 });
    businessId = b; email = e;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  await prisma.optOut.upsert({ where: { businessId_email: { businessId, email } }, update: {}, create: { businessId, email } });
  // cancel pending requests for this email's completions
  const completions = await prisma.serviceCompletion.findMany({ where: { businessId, customerEmail: email } });
  for (const c of completions) {
    await prisma.reviewRequest.updateMany({ where: { completionId: c.id, status: "pending" }, data: { status: "canceled", cancelReason: "opted_out" } });
  }
  await prisma.auditLog.create({ data: { businessId, action: "opt_out", metadata: { email } } });
  return NextResponse.redirect(new URL("/unsubscribed", req.url));
}