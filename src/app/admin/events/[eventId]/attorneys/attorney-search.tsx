"use client";

import { useState, useMemo, useTransition } from "react";
import { toggleAttorneyUnavailable, toggleAttorneyWithdrawn } from "@/app/admin/actions";

type Attorney = {
  id: string;
  firstName: string;
  lastName: string;
  firm: string;
  city: string | null;
  organizationType: string | null;
  practiceAreas: unknown;
  email: string;
  phone: string | null;
  status: string;
  isUnavailable: boolean | null;
  unavailableNote: string | null;
};

function OrgTypeBadge({ orgType }: { orgType: string | null }) {
  if (!orgType) return null;
  const isMinority =
    orgType.toLowerCase().includes("minority") ||
    orgType.toLowerCase().includes("woman");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isMinority
          ? "bg-purple-100 text-purple-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {isMinority ? "MWB" : "Other"}
    </span>
  );
}

function AttorneyRow({
  attorney,
  eventId,
}: {
  attorney: Attorney;
  eventId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const areas = Array.isArray(attorney.practiceAreas)
    ? (attorney.practiceAreas as { area?: string }[])
        .map((p) => p.area)
        .filter(Boolean)
        .join(", ")
    : "";

  const handleToggleUnavailable = () => {
    startTransition(() => toggleAttorneyUnavailable(attorney.id, eventId));
  };
  const handleToggleWithdrawn = () => {
    startTransition(() => toggleAttorneyWithdrawn(attorney.id, eventId));
  };

  return (
    <tr
      className={`border-b last:border-b-0 hover:bg-slate-50 ${
        attorney.isUnavailable || attorney.status === "withdrawn" ? "opacity-60" : ""
      }`}
    >
      <td className="px-4 py-2.5 font-medium text-slate-800">
        {attorney.lastName}, {attorney.firstName}
      </td>
      <td className="px-4 py-2.5 text-slate-600">{attorney.firm}</td>
      <td className="px-4 py-2.5 text-slate-500">{attorney.city ?? "—"}</td>
      <td className="px-4 py-2.5">
        <OrgTypeBadge orgType={attorney.organizationType} />
      </td>
      <td className="max-w-xs px-4 py-2.5 text-slate-500 truncate">
        {areas || "—"}
      </td>
      <td className="px-4 py-2.5">
        {attorney.isUnavailable ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
            Unavailable
          </span>
        ) : attorney.status === "withdrawn" ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Withdrawn
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            Active
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button
            disabled={isPending}
            onClick={handleToggleUnavailable}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              attorney.isUnavailable
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            title={attorney.isUnavailable ? "Mark as available" : "Mark as unavailable"}
          >
            {attorney.isUnavailable ? "Unavail ✓" : "Unavail"}
          </button>
          <button
            disabled={isPending}
            onClick={handleToggleWithdrawn}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              attorney.status === "withdrawn"
                ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            title={attorney.status === "withdrawn" ? "Reactivate" : "Mark as withdrawn"}
          >
            {attorney.status === "withdrawn" ? "Withdrawn ✓" : "Withdraw"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AttorneySearch({
  attorneys: initialAttorneys,
  eventId,
}: {
  attorneys: Attorney[];
  eventId: string;
}) {
  const [query, setQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const orgTypes = useMemo(() => {
    const types = new Set<string>();
    initialAttorneys.forEach((a) => {
      if (a.organizationType) types.add(a.organizationType);
    });
    return Array.from(types).sort();
  }, [initialAttorneys]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return initialAttorneys.filter((a) => {
      const matchesQuery =
        !q ||
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        a.firm.toLowerCase().includes(q) ||
        (a.city ?? "").toLowerCase().includes(q) ||
        (a.email ?? "").toLowerCase().includes(q);
      const matchesOrg =
        orgFilter === "all" || a.organizationType === orgFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          !a.isUnavailable &&
          a.status !== "withdrawn") ||
        (statusFilter === "unavailable" && a.isUnavailable) ||
        (statusFilter === "withdrawn" && a.status === "withdrawn");
      return matchesQuery && matchesOrg && matchesStatus;
    });
  }, [initialAttorneys, query, orgFilter, statusFilter]);

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <input
          type="search"
          placeholder="Search by name, firm, or city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 min-w-48"
        />
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="all">All org types</option>
          {orgTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="unavailable">Unavailable</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <span className="text-sm text-slate-500">
          {filtered.length} of {initialAttorneys.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Firm</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">City</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Org Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Practice Areas</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-3 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((a) => (
              <AttorneyRow key={a.id} attorney={a} eventId={eventId} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">
            No attorneys match your search.
          </p>
        )}
      </div>
    </div>
  );
}
