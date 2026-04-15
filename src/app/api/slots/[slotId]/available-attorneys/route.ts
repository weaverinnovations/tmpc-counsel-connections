import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  attorneys,
  assignments,
  attorneyUnavailability,
  timeSlots,
  eventDays,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const { slotId } = await params;

  // Resolve the slot → event day → event
  const slot = await db
    .select({
      id: timeSlots.id,
      eventDayId: timeSlots.eventDayId,
      eventId: eventDays.eventId,
    })
    .from(timeSlots)
    .innerJoin(eventDays, eq(timeSlots.eventDayId, eventDays.id))
    .where(eq(timeSlots.id, slotId))
    .limit(1);

  if (!slot.length) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const { eventId, eventDayId } = slot[0];

  // Attorneys already booked in this slot (any company)
  const bookedRows = await db
    .select({ id: assignments.attorneyId })
    .from(assignments)
    .where(
      and(
        eq(assignments.timeSlotId, slotId),
        eq(assignments.status, "confirmed")
      )
    );

  // Attorneys specifically unavailable for this slot
  const unavailSlot = await db
    .select({ id: attorneyUnavailability.attorneyId })
    .from(attorneyUnavailability)
    .where(eq(attorneyUnavailability.timeSlotId, slotId));

  // Attorneys unavailable for the whole day
  const unavailDay = await db
    .select({ id: attorneyUnavailability.attorneyId })
    .from(attorneyUnavailability)
    .where(eq(attorneyUnavailability.eventDayId, eventDayId));

  const excludedIds = new Set([
    ...bookedRows.map((r) => r.id),
    ...unavailSlot.map((r) => r.id),
    ...unavailDay.map((r) => r.id),
  ]);

  const allAttorneys = await db
    .select({
      id: attorneys.id,
      firstName: attorneys.firstName,
      lastName: attorneys.lastName,
      firm: attorneys.firm,
      city: attorneys.city,
      organizationType: attorneys.organizationType,
      practiceAreas: attorneys.practiceAreas,
      email: attorneys.email,
      phone: attorneys.phone,
    })
    .from(attorneys)
    .where(
      and(
        eq(attorneys.eventId, eventId),
        eq(attorneys.status, "active"),
        eq(attorneys.isUnavailable, false)
      )
    )
    .orderBy(attorneys.lastName, attorneys.firstName);

  const available = allAttorneys.filter((a) => !excludedIds.has(a.id));

  return NextResponse.json(available);
}
