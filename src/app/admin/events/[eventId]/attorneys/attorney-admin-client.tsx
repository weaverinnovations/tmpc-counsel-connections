"use client";

import { useState, useActionState } from "react";
import { importAttorneysCsv } from "@/app/admin/actions";

export default function AttorneyAdminClient({ eventId }: { eventId: string }) {
  const [showImport, setShowImport] = useState(false);

  const boundAction = importAttorneysCsv.bind(null, eventId);
  const [result, action, pending] = useActionState(boundAction, null);

  return (
    <div className="relative">
      <button
        onClick={() => setShowImport((v) => !v)}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        Import CSV
      </button>

      {showImport && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowImport(false)}
          />
          {/* Modal */}
          <div className="absolute right-0 top-9 z-50 w-96 rounded-lg border bg-white p-5 shadow-xl">
            <h3 className="mb-3 font-semibold text-slate-800">
              Import Attorneys from CSV
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              CSV must have columns:{" "}
              <code className="rounded bg-slate-100 px-1">
                first_name, last_name, email, firm
              </code>{" "}
              (required). Optional:{" "}
              <code className="rounded bg-slate-100 px-1">
                phone, city, organization_type, practice_areas, partner_count,
                associate_count, of_counsel_count
              </code>
            </p>
            <p className="mb-3 text-xs text-slate-500">
              Practice areas format:{" "}
              <code className="rounded bg-slate-100 px-1">
                Commercial Litigation:50;Health Care:50
              </code>
            </p>

            <form action={action} className="space-y-3">
              <input
                type="file"
                name="csv"
                accept=".csv,text/csv"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-600 hover:file:bg-slate-200"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {pending ? "Importing…" : "Import"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImport(false)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>

            {result && (
              <div
                className={`mt-3 rounded-md border px-3 py-2 text-xs ${
                  result.success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {result.success ? (
                  <>
                    <p className="font-medium">
                      Imported {result.imported} attorneys, skipped{" "}
                      {result.skipped}.
                    </p>
                    {result.errors.slice(0, 3).map((e, i) => (
                      <p key={i} className="mt-1 text-xs opacity-75">
                        {e}
                      </p>
                    ))}
                  </>
                ) : (
                  <p>{result.errors[0] ?? "Import failed."}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
