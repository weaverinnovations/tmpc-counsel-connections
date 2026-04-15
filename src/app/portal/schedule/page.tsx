import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  assignments,
  attorneys,
  timeSlots,
  eventDays,
  companies,
  events,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default async function SchedulePage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("tmpc_company_id")?.value;

  if (!companyId) {
    return (
      <div className="text-slate-500">Session expired. Please sign in again.</div>
    );
  }

  const [company, event, rows] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, companyId) }),
    db.query.events.findFirst(),
    db
      .select({
        assignmentId: assignments.id,
        timeSlotId: timeSlots.id,
        startTime: timeSlots.startTime,
        endTime: timeSlots.endTime,
        sortOrder: timeSlots.sortOrder,
        dayId: eventDays.id,
        dayLabel: eventDays.label,
        dayDate: eventDays.date,
        dayFormat: eventDays.format,
        firstName: attorneys.firstName,
        lastName: attorneys.lastName,
        firm: attorneys.firm,
        city: attorneys.city,
        email: attorneys.email,
        phone: attorneys.phone,
        organizationType: attorneys.organizationType,
      })
      .from(assignments)
      .innerJoin(attorneys, eq(assignments.attorneyId, attorneys.id))
      .innerJoin(timeSlots, eq(assignments.timeSlotId, timeSlots.id))
      .innerJoin(eventDays, eq(timeSlots.eventDayId, eventDays.id))
      .where(eq(assignments.companyId, companyId))
      .orderBy(asc(timeSlots.sortOrder)),
  ]);

  // Group by day
  const dayMap = new Map<
    string,
    {
      label: string;
      format: string;
      interviews: typeof rows;
    }
  >();

  for (const row of rows) {
    if (!dayMap.has(row.dayId)) {
      dayMap.set(row.dayId, {
        label: row.dayLabel,
        format: row.dayFormat,
        interviews: [],
      });
    }
    dayMap.get(row.dayId)!.interviews.push(row);
  }

  const days = Array.from(dayMap.values());

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
          <p className="mt-1 text-slate-500">
            {company?.name} · {rows.length} interviews across {days.length} days
          </p>
        </div>
        <Link
          href="/portal/schedule/review"
          className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          Print View →
        </Link>
      </div>

      {days.length === 0 && (
        <div className="rounded-lg border bg-white p-12 text-center text-slate-500">
          No interviews scheduled yet.
        </div>
      )}

      {days.map((day) => (
        <div key={day.label} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">{day.label}</h2>
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
              {day.interviews.length} interview{day.interviews.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Time
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Attorney
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Firm
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    City
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {day.interviews.map((row) => (
                  <tr key={row.assignmentId} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                      {fmt(row.startTime)}
                      <span className="text-slate-400"> – </span>
                      {fmt(row.endTime)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.firm}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.city ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.email && (
                        <p className="truncate max-w-[180px]">{row.email}</p>
                      )}
                      {row.phone && <p>{row.phone}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
