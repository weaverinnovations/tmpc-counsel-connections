"use client";

import { useState, useActionState } from "react";
import { createCompany } from "@/app/admin/actions";
import type { CompanyRow } from "./page";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    selections_complete: { label: "Selections Complete", cls: "bg-green-100 text-green-700" },
    registered: { label: "Registered", cls: "bg-blue-100 text-blue-700" },
    invited: { label: "Invited", cls: "bg-yellow-100 text-yellow-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function NeedBadge({ need }: { need: string | null }) {
  if (!need) return null;
  const map: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-orange-100 text-orange-700",
    low: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs capitalize ${map[need] ?? "bg-slate-100 text-slate-600"}`}>
      {need}
    </span>
  );
}

function CreateCompanyModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const boundAction = createCompany.bind(null, eventId);
  const [state, action, pending] = useActionState(boundAction, null);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Add Company</h2>

          {state?.success ? (
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Company created successfully.
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <p className="mb-2 text-xs font-semibold text-blue-700 uppercase">
                  Invite Code
                </p>
                <p className="font-mono text-2xl font-bold tracking-widest text-blue-900">
                  {state.inviteCode}
                </p>
                <p className="mt-2 text-xs text-blue-600">
                  Share this code with the company contact so they can register.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              {state?.error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </div>
              )}

              <div>
                <label
                  htmlFor="company-name"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Corporation Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="company-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g., JPMorgan Chase"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Contact Name
                </label>
                <input
                  id="contact-name"
                  name="contactName"
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Contact Email
                </label>
                <input
                  id="contact-email"
                  name="contactEmail"
                  type="email"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-phone"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Contact Phone
                </label>
                <input
                  id="contact-phone"
                  name="contactPhone"
                  type="tel"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {pending ? "Creating…" : "Create Company"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default function CompaniesAdminClient({
  eventId,
  companies,
}: {
  eventId: string;
  companies: CompanyRow[];
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      {/* Create button */}
      <button
        onClick={() => setShowCreate(true)}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        + Add Company
      </button>

      {/* Company cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => {
          const areas = Array.isArray(company.practiceAreas)
            ? (company.practiceAreas as string[]).slice(0, 3)
            : [];

          return (
            <div key={company.id} className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{company.name}</h3>
                  {(company.city || company.state) && (
                    <p className="text-xs text-slate-500">
                      {[company.city, company.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <StatusBadge status={company.status} />
              </div>

              {company.contactName && (
                <div className="mb-3 text-sm text-slate-600">
                  <p className="font-medium">{company.contactName}</p>
                  {company.contactTitle && (
                    <p className="text-xs text-slate-500">{company.contactTitle}</p>
                  )}
                  {company.contactEmail && (
                    <p className="text-xs text-slate-500 truncate">{company.contactEmail}</p>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-4 border-t pt-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{company.interviewCount}</p>
                  <p className="text-xs text-slate-500">interviews</p>
                </div>
                {company.legalStaffCount != null && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-800">{company.legalStaffCount}</p>
                    <p className="text-xs text-slate-500">legal staff</p>
                  </div>
                )}
                <div className="ml-auto">
                  <NeedBadge need={company.outsideCounselNeed} />
                </div>
              </div>

              {areas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {areas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}

              {company.inviteCode && (
                <div className="mt-3 border-t pt-2.5">
                  <p className="text-xs text-slate-400">
                    Invite code:{" "}
                    <code className="font-mono text-slate-600">{company.inviteCode}</code>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateCompanyModal
          eventId={eventId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
