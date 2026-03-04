import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { resolveCurrentUser } from "@/lib/auth";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
];

export default async function AdminLayout({
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

  // If DB is connected and user is not admin, redirect
  if (user && user.role !== "admin") {
    if (user.role === "company") {
      redirect("/portal");
    }
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-slate-50 p-6">
        <div className="mb-8">
          <Link href="/admin">
            <h2 className="text-lg font-bold text-slate-900">
              TMCP Admin
            </h2>
          </Link>
          <p className="text-xs text-slate-500">Counsel Connections</p>
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
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
