import { db } from "@/lib/db";
import { attorneys, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AttorneySearch from "./attorney-search";
import AttorneyAdminClient from "./attorney-admin-client";

export default async function AttorneysPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [event, attorneyList] = await Promise.all([
    db.query.events.findFirst({ where: eq(events.id, eventId) }),
    db
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
        status: attorneys.status,
        isUnavailable: attorneys.isUnavailable,
        unavailableNote: attorneys.unavailableNote,
      })
      .from(attorneys)
      .where(eq(attorneys.eventId, eventId))
      .orderBy(attorneys.lastName, attorneys.firstName),
  ]);

  if (!event) notFound();

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attorney Roster</h1>
          <p className="mt-1 text-slate-500">
            {event.name} · {attorneyList.length} attorneys registered
          </p>
        </div>
        <AttorneyAdminClient eventId={eventId} />
      </div>

      <AttorneySearch attorneys={attorneyList} eventId={eventId} />
    </div>
  );
}
