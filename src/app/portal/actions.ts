"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  companySlotSelections,
  assignments,
  companies,
  companyInterviewers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireCompanyId(): Promise<string> {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("tmpc_company_id")?.value;
  if (!companyId) throw new Error("Not authenticated");
  return companyId;
}

// ── Slot Selections ──────────────────────────────────────────────────────────

export async function toggleSlotSelection(slotId: string, makeSelected: boolean) {
  const companyId = await requireCompanyId();

  if (makeSelected) {
    await db
      .insert(companySlotSelections)
      .values({ companyId, timeSlotId: slotId })
      .onConflictDoNothing();
  } else {
    // Remove any assignment for this slot first, then the selection
    await db
      .delete(assignments)
      .where(
        and(
          eq(assignments.companyId, companyId),
          eq(assignments.timeSlotId, slotId)
        )
      );
    await db
      .delete(companySlotSelections)
      .where(
        and(
          eq(companySlotSelections.companyId, companyId),
          eq(companySlotSelections.timeSlotId, slotId)
        )
      );
  }

  revalidatePath("/portal/schedule");
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function assignAttorney(
  slotId: string,
  attorneyId: string
): Promise<{ success: boolean; conflict?: boolean; message?: string }> {
  const companyId = await requireCompanyId();

  // Check if another company has already booked this attorney in this slot
  const conflictRow = await db.query.assignments.findFirst({
    where: and(
      eq(assignments.attorneyId, attorneyId),
      eq(assignments.timeSlotId, slotId)
    ),
  });

  if (conflictRow && conflictRow.companyId !== companyId) {
    return {
      success: false,
      conflict: true,
      message:
        "This attorney was just booked by another company for this slot. Please select a different attorney.",
    };
  }

  try {
    // Remove any existing assignment the company has in this slot
    await db
      .delete(assignments)
      .where(
        and(
          eq(assignments.companyId, companyId),
          eq(assignments.timeSlotId, slotId)
        )
      );

    // Create the new assignment
    await db.insert(assignments).values({
      companyId,
      attorneyId,
      timeSlotId: slotId,
      source: "company",
      status: "confirmed",
    });

    // Ensure the slot is marked as selected
    await db
      .insert(companySlotSelections)
      .values({ companyId, timeSlotId: slotId })
      .onConflictDoNothing();

    revalidatePath("/portal/schedule");
    return { success: true };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "23505" || err.message?.includes("unique")) {
      return {
        success: false,
        conflict: true,
        message:
          "This attorney was just booked by another company. Please choose someone else.",
      };
    }
    throw e;
  }
}

export async function removeAssignment(slotId: string) {
  const companyId = await requireCompanyId();

  await db
    .delete(assignments)
    .where(
      and(
        eq(assignments.companyId, companyId),
        eq(assignments.timeSlotId, slotId)
      )
    );

  revalidatePath("/portal/schedule");
}

// ── Company Profile ──────────────────────────────────────────────────────────

export async function updateCompanyProfile(
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const companyId = await requireCompanyId();

  const practiceAreas = formData.getAll("practiceAreas") as string[];
  const legalStaffRaw = formData.get("legalStaffCount") as string;

  try {
    await db
      .update(companies)
      .set({
        website: (formData.get("website") as string) || null,
        streetAddress: (formData.get("streetAddress") as string) || null,
        city: (formData.get("city") as string) || null,
        state: (formData.get("state") as string) || null,
        zip: (formData.get("zip") as string) || null,
        description: (formData.get("description") as string) || null,
        legalStaffCount: legalStaffRaw ? parseInt(legalStaffRaw, 10) : null,
        practiceAreas,
        outsideCounselNeed:
          (formData.get("outsideCounselNeed") as string) || null,
        preferredPlatform:
          (formData.get("preferredPlatform") as string) || null,
        contactName: (formData.get("contactName") as string) || null,
        contactTitle: (formData.get("contactTitle") as string) || null,
        contactEmail: (formData.get("contactEmail") as string) || null,
        contactPhone: (formData.get("contactPhone") as string) || null,
        status: "registered",
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    revalidatePath("/portal");
    revalidatePath("/portal/register");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save. Please try again." };
  }
}

// ── Interviewers ─────────────────────────────────────────────────────────────

export async function addInterviewer(
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const companyId = await requireCompanyId();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { success: false, error: "Name is required." };

  try {
    await db.insert(companyInterviewers).values({
      companyId,
      name,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
    });

    revalidatePath("/portal/interviewers");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add interviewer." };
  }
}

export async function updateInterviewer(
  id: string,
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const companyId = await requireCompanyId();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { success: false, error: "Name is required." };

  try {
    await db
      .update(companyInterviewers)
      .set({
        name,
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
      })
      .where(
        and(
          eq(companyInterviewers.id, id),
          eq(companyInterviewers.companyId, companyId)
        )
      );

    revalidatePath("/portal/interviewers");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update interviewer." };
  }
}

export async function removeInterviewer(id: string) {
  const companyId = await requireCompanyId();

  await db
    .delete(companyInterviewers)
    .where(
      and(
        eq(companyInterviewers.id, id),
        eq(companyInterviewers.companyId, companyId)
      )
    );

  revalidatePath("/portal/interviewers");
}
