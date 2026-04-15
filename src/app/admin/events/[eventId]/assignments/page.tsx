import { db } from "@/lib/db";
import {
  assignments,
  attorneys,
  companies,
  events,
  eventDays,
  timeSlots,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import AssignmentsGrid from "./assignments-grid";

type SlotRow = {
  id: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  dayId: string;
  dayLabel: string;
  dayDate: string;
  dayFormat: string;
};

export default async function AssignmentsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [event, companyList, rawSlots, rawAssignments] = await Promise.all([
    db.query.events.findFirst({ where: eq(events.id, eventId) }),
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.eventId, eventId))
      .orderBy(companies.name),
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
      .where(eq(eventDays.eventId, eventId))
      .orderBy(asc(timeSlots.sortOrder)),
    db
      .select({
        id: assignments.id,
        companyId: assignments.companyId,
        timeSlotId: assignments.timeSlotId,
        attorneyId: assignments.attorneyId,
        firstName: attorneys.firstName,
        lastName: attorneys.lastName,
        firm: attorneys.firm,
      })
      .from(assignments)
      .innerJoin(attorneys, eq(assignments.attorneyId, attorneys.id))
      .innerJoin(companies, eq(assignments.companyId, companies.id))
      .where(eq(companies.eventId, eventId)),
  ]);

  if (!event) notFound();

  // Build cell map: slotId → companyId → cell
  const cellMap = new Map<
    string,
    Map<
      string,
      {
        assignmentId: string;
        companyId: string;
        timeSlotId: string;
        attorneyName: string;
        firm: string;
        attorneyId: string;
      }
    >
  >();
  for (const a of rawAssignments) {
    if (!cellMap.has(a.timeSlotId)) {
      cellMap.set(a.timeSlotId, new Map());
    }
    cellMap.get(a.timeSlotId)!.set(a.companyId, {
      assignmentId: a.id,
      companyId: a.companyId,
      timeSlotId: a.timeSlotId,
      attorneyId: a.attorneyId,
      attorneyName: `${a.firstName} ${a.lastName}`,
      firm: a.firm,
    });
  }

  // Group slots by day
  const dayMap = new Map<
    string,
    { label: string; format: string; slots: SlotRow[] }
  >();
  for (const slot of rawSlots) {
    if (!dayMap.has(slot.dayId)) {
      dayMap.set(slot.dayId, {
        label: slot.dayLabel,
        format: slot.dayFormat,
        slots: [],
      });
    }
    dayMap.get(slot.dayId)!.slots.push(slot);
  }

  const days = Array.from(dayMap.entries()).map(([id, d]) => ({ id, ...d }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Master Schedule</h1>
        <p className="mt-1 text-slate-500">
          {event.name} · {rawAssignments.length} interviews assigned ·{" "}
          {companyList.length} companies · {rawSlots.length} time slots
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Click any cell to assign an attorney or manage existing assignments.
        </p>
      </div>

      <AssignmentsGrid
        companies={companyList}
        days={days}
        initialCellMap={cellMap}
        eventId={eventId}
      />
    </div>
  );
}
