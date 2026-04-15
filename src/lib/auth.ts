import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { like } from "drizzle-orm";

export type UserRole = "admin" | "company" | null;

export async function getRole(): Promise<UserRole> {
  const cookieStore = await cookies();
  const role = cookieStore.get("tmpc_role")?.value;
  if (role === "admin" || role === "company") return role;
  return null;
}

export async function getCompanyId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("tmpc_company_id")?.value ?? null;
}

/**
 * Called during login — finds JPMorgan Chase (demo company) in DB.
 * Returns its ID to store in the cookie.
 */
export async function findDemoCompany() {
  const result = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(like(companies.name, "%JPMorgan%"))
    .limit(1);

  if (result.length > 0) return result[0];

  // Fallback: first company alphabetically
  const fallback = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .limit(1);

  return fallback[0] ?? null;
}
