import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { companies, companyInterviewers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import InterviewersClient from "./interviewers-client";

export default async function InterviewersPage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("tmpc_company_id")?.value;

  if (!companyId) {
    return (
      <div className="text-slate-500">Session expired. Please sign in again.</div>
    );
  }

  const [company, interviewerList] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, companyId) }),
    db
      .select({
        id: companyInterviewers.id,
        name: companyInterviewers.name,
        email: companyInterviewers.email,
        phone: companyInterviewers.phone,
      })
      .from(companyInterviewers)
      .where(eq(companyInterviewers.companyId, companyId)),
  ]);

  if (!company) {
    return <div className="text-slate-500">Company not found.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Interviewers</h1>
        <p className="mt-1 text-slate-500">
          {company.name} · Manage who will conduct your interviews
        </p>
      </div>
      <InterviewersClient interviewers={interviewerList} />
    </div>
  );
}
