import { db } from "@/lib/db";
import { companies, events, assignments } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import CompaniesAdminClient from "./companies-admin-client";

export type CompanyRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  outsideCounselNeed: string | null;
  legalStaffCount: number | null;
  status: string;
  practiceAreas: unknown;
  inviteCode: string | null;
  interviewCount: number;
};

export default async function CompaniesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [event, companyList, assignmentCounts] = await Promise.all([
    db.query.events.findFirst({ where: eq(events.id, eventId) }),
    db
      .select({
        id: companies.id,
        name: companies.name,
        city: companies.city,
        state: companies.state,
        contactName: companies.contactName,
        contactTitle: companies.contactTitle,
        contactEmail: companies.contactEmail,
        contactPhone: companies.contactPhone,
        outsideCounselNeed: companies.outsideCounselNeed,
        legalStaffCount: companies.legalStaffCount,
        status: companies.status,
        practiceAreas: companies.practiceAreas,
        inviteCode: companies.inviteCode,
      })
      .from(companies)
      .where(eq(companies.eventId, eventId))
      .orderBy(companies.name),
    db
      .select({ companyId: assignments.companyId, count: count() })
      .from(assignments)
      .groupBy(assignments.companyId),
  ]);

  if (!event) notFound();

  const countMap = new Map(assignmentCounts.map((r) => [r.companyId, r.count]));

  const rows: CompanyRow[] = companyList.map((c) => ({
    ...c,
    interviewCount: countMap.get(c.id) ?? 0,
  }));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="mt-1 text-slate-500">
            {event.name} · {companyList.length} participating corporations
          </p>
        </div>
        <CompaniesAdminClient eventId={eventId} companies={rows} />
      </div>
    </div>
  );
}
