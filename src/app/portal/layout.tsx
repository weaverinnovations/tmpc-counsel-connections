import Link from "next/link";
import { cookies } from "next/headers";
import { logoutAction } from "@/app/login/actions";

const navItems = [
  { href: "/portal", label: "Home" },
  { href: "/portal/register", label: "Registration" },
  { href: "/portal/interviewers", label: "Interviewers" },
  { href: "/portal/schedule", label: "Select Schedule" },
  { href: "/portal/schedule/review", label: "Schedule Review" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const companyName =
    cookieStore.get("tmpc_company_name")?.value ?? "Company Portal";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r bg-slate-900 text-slate-100">
        <div className="border-b border-slate-700 p-5">
          <Link href="/portal">
            <h2 className="text-base font-bold leading-tight text-white">
              {companyName}
            </h2>
          </Link>
          <p className="text-xs text-slate-400">Counsel Connections Portal</p>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-1.5 text-left text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}
