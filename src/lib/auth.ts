import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { adminUsers, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "admin" | "company" | "none";

export interface ResolvedUser {
  clerkUserId: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
}

/**
 * Get the current Clerk user ID from the auth session.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Check if a Clerk user ID corresponds to an admin user.
 */
export async function isAdmin(clerkUserId: string): Promise<boolean> {
  const result = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.clerkUserId, clerkUserId))
    .limit(1);
  return result.length > 0;
}

/**
 * Get the company associated with a Clerk user ID.
 * Returns null if the user is not linked to any company.
 */
export async function getCompanyForUser(clerkUserId: string) {
  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.clerkUserId, clerkUserId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Resolve the full role and context for the current authenticated user.
 * Checks admin_users first, then companies.
 */
export async function resolveCurrentUser(): Promise<ResolvedUser | null> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) return null;

  // Check if admin
  const adminCheck = await isAdmin(clerkUserId);
  if (adminCheck) {
    return { clerkUserId, role: "admin" };
  }

  // Check if company user
  const company = await getCompanyForUser(clerkUserId);
  if (company) {
    return {
      clerkUserId,
      role: "company",
      companyId: company.id,
      companyName: company.name,
    };
  }

  // Authenticated but no role assigned
  return { clerkUserId, role: "none" };
}
