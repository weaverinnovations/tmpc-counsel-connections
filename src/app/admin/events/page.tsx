import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export default async function EventsPage() {
  const event = await db.query.events.findFirst();
  if (event) {
    redirect(`/admin/events/${event.id}/attorneys`);
  }
  return (
    <div className="text-slate-500">
      No events found. Run the seed script to populate data.
    </div>
  );
}
