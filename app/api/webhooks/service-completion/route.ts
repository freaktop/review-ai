import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/webhook";
import crypto from "crypto";

const SECRET = process.env.REBOOK_WEBHOOK_SECRET || process.env.REVIEW_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-review-signature") || req.headers.get("x-rebook-signature");
  if (!verifyWebhookSignature(raw, signature, SECRET)) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const { event, businessSlug, data } = body || {};
  if (event !== "service.completed" || !data) return NextResponse.json({ error: "invalid_event" }, { status: 400 });

  const idempotencyKey = body.idempotencyKey || `svc:${data.externalId || crypto.randomUUID()}`;
  const existing = await prisma.webhookEvent.findUnique({ where: { idempotencyKey } });
  if (existing) return NextResponse.json({ status: "duplicate" });

  const business = businessSlug ? await prisma.business.findUnique({ where: { slug: businessSlug } }) : await prisma.business.findFirst();
  if (!business) return NextResponse.json({ error: "business_not_found" }, { status: 404 });

  const webhookEvent = await prisma.webhookEvent.create({
    data: { businessId: business.id, source: "service-completion", eventType: event, idempotencyKey, payload: body, status: "processing" },
  });

  try {
    const email = data.customerEmail ? String(data.customerEmail).toLowerCase() : null;
    // opt-out check
    let eligible = true;
    if (email) {
      const optedOut = await prisma.optOut.findUnique({ where: { businessId_email: { businessId: business.id, email } } });
      if (optedOut) eligible = false;
    }

    const completion = await prisma.serviceCompletion.create({
      data: {
        businessId: business.id,
        externalId: data.externalId ?? null,
        idempotencyKey,
        customerId: data.customerId ?? null,
        customerEmail: email,
        customerName: data.customerName ?? null,
        serviceName: data.serviceName ?? null,
        completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
      },
    });

    if (eligible && business.enabled && business.reviewUrl) {
      const scheduledFor = new Date((completion.completedAt || new Date()).getTime() + business.delayHours * 60 * 60 * 1000);
      await prisma.reviewRequest.create({
        data: { businessId: business.id, completionId: completion.id, scheduledFor, status: "pending" },
      });
    }

    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { status: "processed", processedAt: new Date() } });
    return NextResponse.json({ status: "processed" });
  } catch (e: any) {
    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { status: "failed", error: e?.message } });
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}