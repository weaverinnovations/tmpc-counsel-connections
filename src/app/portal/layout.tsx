import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { resolveCurrentUser } from "@/lib/auth";

const navItems = [
  { href: "/portal", label: "Home" },
  { href: "/portal/register", label: "Registration" },
  { href: "/portal/interviewers", label: "Interviewers" },
  { href: "/portal/schedule", label: "Schedule" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await resolveCurrentUser();
  } catch {
    // DB not connected yet — allow access in development
    user = null;
  }

  // If DB is connected and user is not a company user, redirect
  if (user && user.role !== "company") {
    if (user.role === "admin") {
      redirect("/admin");
    }
    redirect("/");
  }

  const companyName = user?.companyName ?? "Company Portal";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-slate-50 p-6">
        <div className="mb-8">
          <Link href="/portal">
            <h2 className="text-lg font-bold text-slate-900">{companyName}</h2>
          </Link>
          <p className="text-xs text-slate-500">Counsel Connections Portal</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-8">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
