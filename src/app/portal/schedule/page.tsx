import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  assignments,
  attorneys,
  timeSlots,
  eventDays,
  companies,
  events,
  companySlotSelections,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import ScheduleClient from "./schedule-client";

export type SlotData = {
  id: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  isSelected: boolean;
  assignment: {
    id: string;
    attorneyId: string;
    attorneyName: string;
    firm: string;
  } | null;
};

export type DayData = {
  id: string;
  label: string;
  format: string;
  slots: SlotData[];
};

export default async function SchedulePage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("tmpc_company_id")?.value;

  if (!companyId) {
    return (
      <div className="text-slate-500">Session expired. Please sign in again.</div>
    );
  }

  const [company, event, allSlots, selections, companyAssignments] =
    await Promise.all([
      db.query.companies.findFirst({ where: eq(companies.id, companyId) }),
      db.query.events.findFirst(),
      db
        .select({
          id: timeSlots.id,
          startTime: timeSlots.startTime,
          endTime: timeSlots.endTime,
          sortOrder: timeSlots.sortOrder,
          dayId: eventDays.id,
          dayLabel: eventDays.label,
          dayDate: eventDays.date,
          dayFormat: eventDays.format,
        })
        .from(timeSlots)
        .innerJoin(eventDays, eq(timeSlots.eventDayId, eventDays.id))
        .orderBy(asc(timeSlots.sortOrder)),
      db
        .select({ timeSlotId: companySlotSelections.timeSlotId })
        .from(companySlotSelections)
        .where(eq(companySlotSelections.companyId, companyId)),
      db
        .select({
          id: assignments.id,
          timeSlotId: assignments.timeSlotId,
          attorneyId: assignments.attorneyId,
          firstName: attorneys.firstName,
          lastName: attorneys.lastName,
          firm: attorneys.firm,
        })
        .from(assignments)
        .innerJoin(attorneys, eq(assignments.attorneyId, attorneys.id))
        .where(eq(assignments.companyId, companyId)),
    ]);

  if (!company || !event) {
    return <div className="text-slate-500">Company or event not found.</div>;
  }

  // Build lookup sets
  const selectedSlotIds = new Set(selections.map((s) => s.timeSlotId));
  const assignmentBySlot = new Map(
    companyAssignments.map((a) => [
      a.timeSlotId,
      {
        id: a.id,
        attorneyId: a.attorneyId,
        attorneyName: `${a.firstName} ${a.lastName}`,
        firm: a.firm,
      },
    ])
  );

  // Group slots by day, preserving sort order
  const dayMap = new Map<
    string,
    { label: string; format: string; slots: SlotData[] }
  >();

  for (const slot of allSlots) {
    if (!dayMap.has(slot.dayId)) {
      dayMap.set(slot.dayId, {
        label: slot.dayLabel,
        format: slot.dayFormat,
        slots: [],
      });
    }
    dayMap.get(slot.dayId)!.slots.push({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      sortOrder: slot.sortOrder,
      isSelected: selectedSlotIds.has(slot.id),
      assignment: assignmentBySlot.get(slot.id) ?? null,
    });
  }

  const days: DayData[] = Array.from(dayMap.entries()).map(([id, d]) => ({
    id,
    ...d,
  }));

  const totalSelected = selections.length;
  const totalAssigned = companyAssignments.length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Select Your Schedule</h1>
          <p className="mt-1 text-slate-500">
            {company.name} · {totalSelected} slots selected · {totalAssigned}{" "}
            attorneys assigned
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/portal/schedule/review"
            className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Print View →
          </Link>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>How to schedule:</strong> Check a time slot to select it, then
        click <strong>Pick Attorney</strong> to choose an available attorney for
        that slot. You can change or remove assignments at any time.
      </div>

      <ScheduleClient days={days} companyId={companyId} />
    </div>
  );
}
