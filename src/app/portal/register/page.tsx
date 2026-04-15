import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import RegisterForm from "./register-form";

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("tmpc_company_id")?.value;

  if (!companyId) {
    return (
      <div className="text-slate-500">Session expired. Please sign in again.</div>
    );
  }

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });

  if (!company) {
    return <div className="text-slate-500">Company not found.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Company Registration</h1>
        <p className="mt-1 text-slate-500">
          Complete your profile for the Counsel Connections program.
        </p>
      </div>
      <RegisterForm company={company} />
    </div>
  );
}
