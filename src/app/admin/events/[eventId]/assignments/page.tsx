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

type AssignmentCell = {
  companyId: string;
  timeSlotId: string;
  attorneyName: string;
  firm: string;
};

function fmt(t: string) {
  // Convert "14:00:00" → "2:00 PM"
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

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
        companyId: assignments.companyId,
        timeSlotId: assignments.timeSlotId,
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

  // Build assignment lookup: slotId -> companyId -> {name, firm}
  const cellMap = new Map<string, Map<string, { name: string; firm: string }>>();
  for (const a of rawAssignments) {
    if (!cellMap.has(a.timeSlotId)) {
      cellMap.set(a.timeSlotId, new Map());
    }
    cellMap.get(a.timeSlotId)!.set(a.companyId, {
      name: `${a.firstName} ${a.lastName}`,
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

  // Count filled cells
  const totalAssigned = rawAssignments.length;
  const totalPossible = rawSlots.length * companyList.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Master Schedule</h1>
        <p className="mt-1 text-slate-500">
          {event.name} · {totalAssigned} interviews assigned ·{" "}
          {companyList.length} companies · {rawSlots.length} time slots
        </p>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" />
          Assigned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-200" />
          Open
        </span>
      </div>

      {days.map((day) => (
        <div key={day.id} className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">
              {day.label}
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                day.format === "virtual"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {day.format === "virtual" ? "Virtual" : "In-Person"}
            </span>
            <span className="text-xs text-slate-400">
              {day.slots.length} slots ·{" "}
              {day.slots.reduce(
                (sum, s) => sum + (cellMap.get(s.id)?.size ?? 0),
                0
              )}{" "}
              interviews
            </span>
          </div>

          {/* Horizontally scrollable table */}
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="border-collapse text-xs">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="sticky left-0 z-10 min-w-[90px] border-r bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">
                    Time
                  </th>
                  {companyList.map((c) => (
                    <th
                      key={c.id}
                      className="min-w-[130px] border-r px-2 py-2 text-left font-semibold text-slate-600 last:border-r-0"
                    >
                      <span className="line-clamp-2">{c.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {day.slots.map((slot) => {
                  const slotAssignments = cellMap.get(slot.id);
                  return (
                    <tr key={slot.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="sticky left-0 z-10 border-r bg-white px-3 py-2 font-medium text-slate-600 group-hover:bg-slate-50">
                        {fmt(slot.startTime)}
                      </td>
                      {companyList.map((c) => {
                        const cell = slotAssignments?.get(c.id);
                        return (
                          <td
                            key={c.id}
                            className={`border-r px-2 py-1.5 last:border-r-0 ${
                              cell
                                ? "bg-emerald-50"
                                : "bg-white"
                            }`}
                          >
                            {cell ? (
                              <div>
                                <p className="font-medium text-slate-800 leading-tight">
                                  {cell.name}
                                </p>
                                <p className="text-slate-500 truncate max-w-[120px] leading-tight mt-0.5">
                                  {cell.firm}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
