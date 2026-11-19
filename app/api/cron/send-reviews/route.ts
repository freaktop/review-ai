import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const CRON_SECRET = process.env.CRON_SECRET || "";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const requests = await prisma.reviewRequest.findMany({
    where: { status: "pending", scheduledFor: { lte: now } },
    include: { completion: true, business: true },
    take: 50,
  });

  let sent = 0; let failed = 0;
  for (const r of requests) {
    const completion = r.completion;
    const business = r.business;
    const email = completion.customerEmail;
    if (!email) { await prisma.reviewRequest.update({ where: { id: r.id }, data: { status: "canceled", cancelReason: "no_email" } }); continue; }

    // opt-out check
    const optedOut = await prisma.optOut.findUnique({ where: { businessId_email: { businessId: business.id, email } } });
    if (optedOut) { await prisma.reviewRequest.update({ where: { id: r.id }, data: { status: "canceled", cancelReason: "opted_out" } }); continue; }

    // duplicate check
    const already = await prisma.reviewDelivery.findFirst({ where: { requestId: r.id } });
    if (already) { await prisma.reviewRequest.update({ where: { id: r.id }, data: { status: "canceled", cancelReason: "duplicate" } }); continue; }

    const subject = `Thank you for choosing ${business.name}`;
    const body = `Thank you for choosing ${business.name}. We would appreciate your honest feedback about your experience. You can leave a review here: ${business.reviewUrl}`;

    let status = "failed"; let providerId: string | undefined; let error: string | undefined;
    if (resend) {
      try {
        const res = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL || "Review AI <noreply@example.com>", to: email, subject, text: body });
        if (res.error) { error = res.error.message; }
        else { status = "sent"; providerId = res.data?.id; sent++; }
      } catch (e: any) { error = e?.message; failed++; }
    } else { error = "RESEND_API_KEY not configured"; failed++; }

    await prisma.reviewDelivery.create({
      data: { businessId: business.id, requestId: r.id, toEmail: email, status, providerId, error, sentAt: status === "sent" ? new Date() : null },
    });
    await prisma.reviewRequest.update({ where: { id: r.id }, data: { status: status === "sent" ? "sent" : "failed" } });
  }

  return NextResponse.json({ processed: requests.length, sent, failed });
}