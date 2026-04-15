"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  attorneys,
  companies,
  assignments,
  attorneyUnavailability,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const cookieStore = await cookies();
  const role = cookieStore.get("tmpc_role")?.value;
  if (role !== "admin") throw new Error("Not authorized");
}

// ── Attorneys ─────────────────────────────────────────────────────────────────

export async function toggleAttorneyUnavailable(
  id: string,
  eventId: string
): Promise<void> {
  await requireAdmin();

  const attorney = await db.query.attorneys.findFirst({
    where: eq(attorneys.id, id),
  });
  if (!attorney) throw new Error("Attorney not found");

  await db
    .update(attorneys)
    .set({
      isUnavailable: !attorney.isUnavailable,
      updatedAt: new Date(),
    })
    .where(eq(attorneys.id, id));

  revalidatePath(`/admin/events/${eventId}/attorneys`);
}

export async function toggleAttorneyWithdrawn(
  id: string,
  eventId: string
): Promise<void> {
  await requireAdmin();

  const attorney = await db.query.attorneys.findFirst({
    where: eq(attorneys.id, id),
  });
  if (!attorney) throw new Error("Attorney not found");

  const newStatus = attorney.status === "withdrawn" ? "active" : "withdrawn";

  await db
    .update(attorneys)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(attorneys.id, id));

  revalidatePath(`/admin/events/${eventId}/attorneys`);
}

export async function updateAttorney(
  id: string,
  eventId: string,
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await db
      .update(attorneys)
      .set({
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        email: formData.get("email") as string,
        phone: (formData.get("phone") as string) || null,
        firm: formData.get("firm") as string,
        city: (formData.get("city") as string) || null,
        unavailableNote: (formData.get("unavailableNote") as string) || null,
        updatedAt: new Date(),
      })
      .where(eq(attorneys.id, id));

    revalidatePath(`/admin/events/${eventId}/attorneys`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update attorney." };
  }
}

// ── CSV Import ────────────────────────────────────────────────────────────────

type CsvAttorney = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  firm: string;
  city?: string;
  organization_type?: string;
  practice_areas?: string;
  partner_count?: string;
  associate_count?: string;
  of_counsel_count?: string;
};

function parsePracticeAreas(
  raw: string | undefined
): { area: string; percent: number }[] {
  if (!raw?.trim()) return [];
  return raw.split(";").map((part) => {
    const [area, pct] = part.split(":").map((s) => s.trim());
    return { area, percent: pct ? parseInt(pct, 10) / 100 : 0 };
  });
}

function parseCsv(text: string): CsvAttorney[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: CsvAttorney[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle quoted fields
    const values: string[] = [];
    let inQuote = false;
    let cur = "";
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    if (row.email || row.first_name) {
      rows.push(row as CsvAttorney);
    }
  }

  return rows;
}

export async function importAttorneysCsv(
  eventId: string,
  _prev: unknown,
  formData: FormData
): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}> {
  await requireAdmin();

  const file = formData.get("csv") as File | null;
  if (!file || file.size === 0) {
    return { success: false, imported: 0, skipped: 0, errors: ["No file provided."] };
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return { success: false, imported: 0, skipped: 0, errors: ["No data rows found in CSV."] };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.first_name || !row.last_name || !row.firm) {
      errors.push(`Skipped: missing first_name, last_name, or firm`);
      skipped++;
      continue;
    }

    const email = row.email || `${row.first_name.toLowerCase()}.${row.last_name.toLowerCase()}@placeholder.invalid`;

    try {
      await db
        .insert(attorneys)
        .values({
          eventId,
          firstName: row.first_name,
          lastName: row.last_name,
          email,
          phone: row.phone || null,
          firm: row.firm,
          city: row.city || null,
          organizationType: row.organization_type || null,
          practiceAreas: parsePracticeAreas(row.practice_areas),
          partnerCount: row.partner_count ? parseInt(row.partner_count, 10) : null,
          associateCount: row.associate_count ? parseInt(row.associate_count, 10) : null,
          ofCounselCount: row.of_counsel_count ? parseInt(row.of_counsel_count, 10) : null,
          status: "active",
          isUnavailable: false,
        })
        .onConflictDoNothing();
      imported++;
    } catch (e) {
      errors.push(`Error on ${row.first_name} ${row.last_name}: ${(e as Error).message}`);
      skipped++;
    }
  }

  revalidatePath(`/admin/events/${eventId}/attorneys`);
  return { success: true, imported, skipped, errors };
}

// ── Companies ─────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createCompany(
  eventId: string,
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string; inviteCode?: string }> {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { success: false, error: "Company name is required." };

  const inviteCode = generateInviteCode();

  try {
    await db.insert(companies).values({
      eventId,
      name,
      contactName: (formData.get("contactName") as string) || null,
      contactEmail: (formData.get("contactEmail") as string) || null,
      contactPhone: (formData.get("contactPhone") as string) || null,
      inviteCode,
      status: "invited",
    });

    revalidatePath(`/admin/events/${eventId}/companies`);
    return { success: true, inviteCode };
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "23505") {
      return { success: false, error: "A company with that name already exists for this event." };
    }
    return { success: false, error: "Failed to create company. Please try again." };
  }
}

export async function updateCompanyAdmin(
  id: string,
  eventId: string,
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  try {
    await db
      .update(companies)
      .set({
        name: formData.get("name") as string,
        contactName: (formData.get("contactName") as string) || null,
        contactTitle: (formData.get("contactTitle") as string) || null,
        contactEmail: (formData.get("contactEmail") as string) || null,
        contactPhone: (formData.get("contactPhone") as string) || null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id));

    revalidatePath(`/admin/events/${eventId}/companies`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update company." };
  }
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function adminRemoveAssignment(
  assignmentId: string,
  eventId: string
): Promise<void> {
  await requireAdmin();

  await db.delete(assignments).where(eq(assignments.id, assignmentId));

  revalidatePath(`/admin/events/${eventId}/assignments`);
}

export async function adminCreateAssignment(
  eventId: string,
  companyId: string,
  timeSlotId: string,
  attorneyId: string
): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
  await requireAdmin();

  try {
    await db.insert(assignments).values({
      companyId,
      attorneyId,
      timeSlotId,
      source: "admin",
      status: "confirmed",
    });

    revalidatePath(`/admin/events/${eventId}/assignments`);
    return { success: true };
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "23505") {
      return {
        success: false,
        conflict: true,
        error: "This attorney is already booked in this slot.",
      };
    }
    return { success: false, error: "Failed to create assignment." };
  }
}

export async function addAttorneyUnavailability(
  attorneyId: string,
  eventId: string,
  timeSlotId: string | null,
  eventDayId: string | null,
  note: string
): Promise<void> {
  await requireAdmin();

  await db.insert(attorneyUnavailability).values({
    attorneyId,
    timeSlotId: timeSlotId || null,
    eventDayId: eventDayId || null,
    note: note || null,
  });

  revalidatePath(`/admin/events/${eventId}/attorneys`);
}
