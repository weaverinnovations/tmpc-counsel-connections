"use client";

import { useState, useCallback, useMemo } from "react";
import {
  adminRemoveAssignment,
  adminCreateAssignment,
} from "@/app/admin/actions";

type Company = { id: string; name: string };
type SlotRow = {
  id: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  dayId: string;
  dayLabel: string;
  dayFormat: string;
};
type Cell = {
  assignmentId: string;
  companyId: string;
  timeSlotId: string;
  attorneyName: string;
  firm: string;
  attorneyId: string;
};
type AvailableAttorney = {
  id: string;
  firstName: string;
  lastName: string;
  firm: string;
  city: string | null;
  organizationType: string | null;
  practiceAreas: unknown;
};

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function parseAreas(practiceAreas: unknown): string[] {
  if (!Array.isArray(practiceAreas)) return [];
  return (practiceAreas as { area?: string }[])
    .map((p) => p.area)
    .filter(Boolean) as string[];
}

// ── Cell detail popover ───────────────────────────────────────────────────────

function CellPopover({
  cell,
  slotId,
  companyId,
  companyName,
  timeLabel,
  eventId,
  onClose,
  onRemoved,
  onAssign,
}: {
  cell: Cell | null;
  slotId: string;
  companyId: string;
  companyName: string;
  timeLabel: string;
  eventId: string;
  onClose: () => void;
  onRemoved: (assignmentId: string) => void;
  onAssign: (slotId: string, companyId: string, attorney: AvailableAttorney) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [showPicker, setShowPicker] = useState(!cell);
  const [attorneys, setAttorneys] = useState<AvailableAttorney[]>([]);
  const [loadingAttorneys, setLoadingAttorneys] = useState(false);
  const [query, setQuery] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttorneys = useCallback(async () => {
    setLoadingAttorneys(true);
    try {
      const res = await fetch(`/api/slots/${slotId}/available-attorneys`);
      const data = await res.json();
      setAttorneys(data);
    } catch {
      setError("Failed to load available attorneys.");
    } finally {
      setLoadingAttorneys(false);
    }
  }, [slotId]);

  const handleShowPicker = () => {
    setShowPicker(true);
    loadAttorneys();
  };

  const handleRemove = async () => {
    if (!cell) return;
    setRemoving(true);
    await adminRemoveAssignment(cell.assignmentId, eventId);
    onRemoved(cell.assignmentId);
    onClose();
  };

  const handleAssign = async (attorney: AvailableAttorney) => {
    setAssigning(true);
    setError(null);
    try {
      const result = await adminCreateAssignment(eventId, companyId, slotId, attorney.id);
      if (result.success) {
        onAssign(slotId, companyId, attorney);
        onClose();
      } else {
        setError(result.error ?? "Failed to assign.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setAssigning(false);
    }
  };

  const filteredAttorneys = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return attorneys;
    return attorneys.filter(
      (a) =>
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
        a.firm.toLowerCase().includes(q)
    );
  }, [attorneys, query]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col bg-white shadow-2xl border-l"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              {companyName}
            </p>
            <p className="font-semibold text-slate-900 truncate">{timeLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 flex-shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Current assignment */}
          {cell && !showPicker && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-2">
                  Current Assignment
                </p>
                <p className="font-semibold text-slate-900">{cell.attorneyName}</p>
                <p className="text-sm text-slate-600">{cell.firm}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShowPicker}
                  className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Reassign
                </button>
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="flex-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {removing ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          )}

          {/* Attorney picker */}
          {showPicker && (
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">
                {cell ? "Select replacement attorney:" : "Select attorney to assign:"}
              </p>
              <input
                type="search"
                placeholder="Search by name or firm…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-3 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              {loadingAttorneys ? (
                <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
              ) : filteredAttorneys.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  {attorneys.length === 0
                    ? "No attorneys available for this slot."
                    : "No matches."}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredAttorneys.map((a) => {
                    const areas = parseAreas(a.practiceAreas);
                    return (
                      <button
                        key={a.id}
                        disabled={assigning}
                        onClick={() => handleAssign(a)}
                        className="flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left hover:bg-blue-50 hover:border-blue-200 disabled:opacity-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 text-sm">
                            {a.firstName} {a.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{a.firm}</p>
                          {areas.length > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {areas.slice(0, 2).join(" · ")}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {cell && (
                <button
                  onClick={() => setShowPicker(false)}
                  className="mt-4 text-xs text-slate-500 hover:text-slate-700"
                >
                  ← Back
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main grid ────────────────────────────────────────────────────────────────

export default function AssignmentsGrid({
  companies,
  days,
  initialCellMap,
  eventId,
}: {
  companies: Company[];
  days: { id: string; label: string; format: string; slots: SlotRow[] }[];
  initialCellMap: Map<string, Map<string, Cell>>;
  eventId: string;
}) {
  const [cellMap, setCellMap] = useState(initialCellMap);
  const [openCell, setOpenCell] = useState<{
    slotId: string;
    companyId: string;
  } | null>(null);

  const handleCellClick = (slotId: string, companyId: string) => {
    setOpenCell({ slotId, companyId });
  };

  const handleAssigned = useCallback(
    (slotId: string, companyId: string, attorney: AvailableAttorney) => {
      setCellMap((prev) => {
        const next = new Map(prev);
        if (!next.has(slotId)) next.set(slotId, new Map());
        next.get(slotId)!.set(companyId, {
          assignmentId: "pending",
          companyId,
          timeSlotId: slotId,
          attorneyId: attorney.id,
          attorneyName: `${attorney.firstName} ${attorney.lastName}`,
          firm: attorney.firm,
        });
        return next;
      });
    },
    []
  );

  const handleRemoved = useCallback((assignmentId: string) => {
    setCellMap((prev) => {
      const next = new Map(prev);
      for (const [slotId, companyMap] of next) {
        for (const [companyId, cell] of companyMap) {
          if (cell.assignmentId === assignmentId) {
            const newCompanyMap = new Map(companyMap);
            newCompanyMap.delete(companyId);
            next.set(slotId, newCompanyMap);
          }
        }
      }
      return next;
    });
  }, []);

  const activeCell = openCell
    ? {
        slotId: openCell.slotId,
        companyId: openCell.companyId,
        cell: cellMap.get(openCell.slotId)?.get(openCell.companyId) ?? null,
        company: companies.find((c) => c.id === openCell.companyId)!,
        timeLabel: (() => {
          for (const day of days) {
            const slot = day.slots.find((s) => s.id === openCell.slotId);
            if (slot) return `${fmt(slot.startTime)} – ${fmt(slot.endTime)} · ${day.label}`;
          }
          return openCell.slotId;
        })(),
      }
    : null;

  const totalAssigned = Array.from(cellMap.values()).reduce(
    (sum, m) => sum + m.size,
    0
  );
  const totalPossible = days.reduce((sum, d) => sum + d.slots.length, 0) * companies.length;

  return (
    <div>
      {/* Stats */}
      <div className="mb-4 flex items-center gap-6 rounded-lg border bg-white px-4 py-3 shadow-sm text-sm">
        <span className="text-slate-600">
          <strong className="text-slate-900">{totalAssigned}</strong> assignments
        </span>
        <span className="text-slate-400">of {totalPossible} possible slots</span>
        <div className="flex items-center gap-3 ml-auto text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" />
            Assigned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-200" />
            Open (click to assign)
          </span>
        </div>
      </div>

      {days.map((day) => (
        <div key={day.id} className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">{day.label}</h2>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                day.format === "virtual"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {day.format === "virtual" ? "Virtual" : "In-Person"}
            </span>
            <span className="text-xs text-slate-400">
              {day.slots.length} slots ·{" "}
              {day.slots.reduce((sum, s) => sum + (cellMap.get(s.id)?.size ?? 0), 0)}{" "}
              interviews
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="border-collapse text-xs">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="sticky left-0 z-10 min-w-[90px] border-r bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">
                    Time
                  </th>
                  {companies.map((c) => (
                    <th
                      key={c.id}
                      className="min-w-[130px] border-r px-2 py-2 text-left font-semibold text-slate-600 last:border-r-0"
                    >
                      <span className="line-clamp-2">{c.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {day.slots.map((slot) => {
                  const slotAssignments = cellMap.get(slot.id);
                  return (
                    <tr
                      key={slot.id}
                      className="border-b last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="sticky left-0 z-10 border-r bg-white px-3 py-2 font-medium text-slate-600">
                        {fmt(slot.startTime)}
                      </td>
                      {companies.map((c) => {
                        const cell = slotAssignments?.get(c.id);
                        const isOpen =
                          openCell?.slotId === slot.id &&
                          openCell?.companyId === c.id;
                        return (
                          <td
                            key={c.id}
                            onClick={() => handleCellClick(slot.id, c.id)}
                            className={`cursor-pointer border-r px-2 py-1.5 last:border-r-0 transition-colors ${
                              isOpen
                                ? "bg-blue-100 ring-1 ring-inset ring-blue-400"
                                : cell
                                ? "bg-emerald-50 hover:bg-emerald-100"
                                : "hover:bg-blue-50"
                            }`}
                          >
                            {cell ? (
                              <div>
                                <p className="font-medium text-slate-800 leading-tight">
                                  {cell.attorneyName}
                                </p>
                                <p className="text-slate-500 truncate max-w-[120px] leading-tight mt-0.5">
                                  {cell.firm}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-300 hover:text-blue-400">
                                + Assign
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Cell detail panel */}
      {openCell && activeCell && (
        <CellPopover
          cell={activeCell.cell}
          slotId={openCell.slotId}
          companyId={openCell.companyId}
          companyName={activeCell.company?.name ?? ""}
          timeLabel={activeCell.timeLabel}
          eventId={eventId}
          onClose={() => setOpenCell(null)}
          onRemoved={handleRemoved}
          onAssign={handleAssigned}
        />
      )}
    </div>
  );
}
