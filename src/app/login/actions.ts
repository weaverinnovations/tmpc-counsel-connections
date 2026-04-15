"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findDemoCompany } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const password = (formData.get("password") as string)?.trim();

  if (password === "admin") {
    const cookieStore = await cookies();
    cookieStore.set("tmpc_role", "admin", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
      sameSite: "lax",
    });
    redirect("/admin");
  }

  if (password === "company") {
    const company = await findDemoCompany();
    const cookieStore = await cookies();
    cookieStore.set("tmpc_role", "company", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
    });
    cookieStore.set("tmpc_company_id", company?.id ?? "", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
    });
    cookieStore.set("tmpc_company_name", company?.name ?? "Company Portal", {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
    });
    redirect("/portal");
  }

  // Invalid — redirect back with error flag
  redirect("/login?error=1");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("tmpc_role");
  cookieStore.delete("tmpc_company_id");
  cookieStore.delete("tmpc_company_name");
  redirect("/login");
}
