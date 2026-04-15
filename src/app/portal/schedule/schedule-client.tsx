"use client";

import { useState, useCallback, useMemo } from "react";
import { toggleSlotSelection, assignAttorney, removeAssignment } from "../actions";
import type { DayData, SlotData } from "./page";

// ── Types ─────────────────────────────────────────────────────────────────────

type AvailableAttorney = {
  id: string;
  firstName: string;
  lastName: string;
  firm: string;
  city: string | null;
  organizationType: string | null;
  practiceAreas: unknown;
  email: string;
  phone: string | null;
};

type PickerState = {
  slotId: string;
  slotLabel: string;
  attorneys: AvailableAttorney[];
  loading: boolean;
  error: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Attorney Picker Panel ─────────────────────────────────────────────────────

function AttorneyPicker({
  picker,
  onClose,
  onAssign,
  assigning,
}: {
  picker: PickerState;
  onClose: () => void;
  onAssign: (attorney: AvailableAttorney) => void;
  assigning: boolean;
}) {
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");

  const allAreas = useMemo(() => {
    const s = new Set<string>();
    picker.attorneys.forEach((a) => parseAreas(a.practiceAreas).forEach((p) => s.add(p)));
    return Array.from(s).sort();
  }, [picker.attorneys]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return picker.attorneys.filter((a) => {
      const name = `${a.firstName} ${a.lastName}`.toLowerCase();
      const matchQ =
        !q ||
        name.includes(q) ||
        a.firm.toLowerCase().includes(q) ||
        (a.city ?? "").toLowerCase().includes(q);
      const matchArea =
        areaFilter === "all" ||
        parseAreas(a.practiceAreas).includes(areaFilter);
      const matchOrg =
        orgFilter === "all" || a.organizationType === orgFilter;
      return matchQ && matchArea && matchOrg;
    });
  }, [picker.attorneys, query, areaFilter, orgFilter]);

  const orgTypes = useMemo(() => {
    const s = new Set<string>();
    picker.attorneys.forEach((a) => {
      if (a.organizationType) s.add(a.organizationType);
    });
    return Array.from(s).sort();
  }, [picker.attorneys]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Pick an Attorney</h2>
            <p className="text-xs text-slate-500">{picker.slotLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="border-b px-4 py-3 space-y-2">
          <input
            type="search"
            placeholder="Search by name, firm, or city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <div className="flex gap-2">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="all">All practice areas</option>
              {allAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="all">All org types</option>
              {orgTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">
            {filtered.length} of {picker.attorneys.length} available
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {picker.loading && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Loading available attorneys…
            </div>
          )}
          {picker.error && (
            <div className="m-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {picker.error}
            </div>
          )}
          {!picker.loading && !picker.error && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-400">
              {picker.attorneys.length === 0
                ? "No attorneys available for this time slot."
                : "No attorneys match your search."}
            </div>
          )}
          {!picker.loading &&
            filtered.map((a) => {
              const areas = parseAreas(a.practiceAreas);
              const isMWB =
                a.organizationType?.toLowerCase().includes("minority") ||
                a.organizationType?.toLowerCase().includes("woman");

              return (
                <button
                  key={a.id}
                  disabled={assigning}
                  onClick={() => onAssign(a)}
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-blue-50 disabled:opacity-50 last:border-b-0"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {a.firstName[0]}{a.lastName[0]}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {a.firstName} {a.lastName}
                      </span>
                      {isMWB && (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                          MWB
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{a.firm}</p>
                    {a.city && (
                      <p className="text-xs text-slate-400">{a.city}</p>
                    )}
                    {areas.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {areas.slice(0, 3).map((ar) => (
                          <span
                            key={ar}
                            className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                          >
                            {ar}
                          </span>
                        ))}
                        {areas.length > 3 && (
                          <span className="text-xs text-slate-400">+{areas.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-xs font-medium text-blue-600">
                    Select →
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </>
  );
}

// ── Slot Row ──────────────────────────────────────────────────────────────────

function SlotRow({
  slot,
  onToggle,
  onPickAttorney,
  onRemove,
  pending,
}: {
  slot: SlotData;
  onToggle: (slotId: string, value: boolean) => void;
  onPickAttorney: (slotId: string, label: string) => void;
  onRemove: (slotId: string) => void;
  pending: boolean;
}) {
  const timeLabel = `${fmt(slot.startTime)} – ${fmt(slot.endTime)}`;

  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-3 last:border-b-0 transition-colors ${
        slot.isSelected
          ? slot.assignment
            ? "bg-emerald-50"
            : "bg-blue-50"
          : "bg-white hover:bg-slate-50"
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={slot.isSelected}
        disabled={pending}
        onChange={(e) => onToggle(slot.id, e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
      />

      {/* Time */}
      <span className="w-32 flex-shrink-0 font-mono text-sm font-medium text-slate-700">
        {timeLabel}
      </span>

      {/* Assignment area */}
      <div className="flex flex-1 items-center gap-2">
        {slot.isSelected ? (
          slot.assignment ? (
            <>
              <div className="flex items-center gap-2 rounded-md bg-emerald-100 px-2.5 py-1">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-emerald-800">
                  {slot.assignment.attorneyName}
                </span>
                <span className="text-xs text-emerald-600">
                  · {slot.assignment.firm}
                </span>
              </div>
              <button
                disabled={pending}
                onClick={() =>
                  onPickAttorney(slot.id, timeLabel)
                }
                className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 disabled:opacity-50"
              >
                Change
              </button>
              <button
                disabled={pending}
                onClick={() => onRemove(slot.id)}
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 disabled:opacity-50"
              >
                Remove
              </button>
            </>
          ) : (
            <button
              disabled={pending}
              onClick={() => onPickAttorney(slot.id, timeLabel)}
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              + Pick Attorney
            </button>
          )
        ) : (
          <span className="text-xs text-slate-400">Select to schedule</span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ScheduleClient({
  days: initialDays,
  companyId,
}: {
  days: DayData[];
  companyId: string;
}) {
  // ── Local state (optimistic) ────────────────────────────────────────────────
  const [days, setDays] = useState<DayData[]>(initialDays);
  const [pendingSlotIds, setPendingSlotIds] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [assigningFor, setAssigningFor] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 4000);
    },
    []
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const updateSlot = useCallback(
    (slotId: string, update: Partial<SlotData>) => {
      setDays((prev) =>
        prev.map((d) => ({
          ...d,
          slots: d.slots.map((s) =>
            s.id === slotId ? { ...s, ...update } : s
          ),
        }))
      );
    },
    []
  );

  const setPending = useCallback((slotId: string, value: boolean) => {
    setPendingSlotIds((prev) => {
      const next = new Set(prev);
      value ? next.add(slotId) : next.delete(slotId);
      return next;
    });
  }, []);

  // ── Toggle slot selection ────────────────────────────────────────────────────

  const handleToggle = useCallback(
    async (slotId: string, value: boolean) => {
      setPending(slotId, true);

      // Optimistic update
      updateSlot(slotId, {
        isSelected: value,
        assignment: value ? undefined : null, // keep assignment when selecting, clear when deselecting
      });
      if (!value) {
        updateSlot(slotId, { isSelected: false, assignment: null });
      } else {
        updateSlot(slotId, { isSelected: true });
      }

      try {
        await toggleSlotSelection(slotId, value);
      } catch {
        // Revert
        updateSlot(slotId, { isSelected: !value });
        showNotification("error", "Failed to update selection. Please try again.");
      } finally {
        setPending(slotId, false);
      }
    },
    [updateSlot, setPending, showNotification]
  );

  // ── Open attorney picker ─────────────────────────────────────────────────────

  const handlePickAttorney = useCallback(
    async (slotId: string, slotLabel: string) => {
      setPicker({
        slotId,
        slotLabel,
        attorneys: [],
        loading: true,
        error: null,
      });

      try {
        const res = await fetch(`/api/slots/${slotId}/available-attorneys`);
        if (!res.ok) throw new Error("Failed to load attorneys");
        const data: AvailableAttorney[] = await res.json();
        setPicker((prev) =>
          prev ? { ...prev, attorneys: data, loading: false } : null
        );
      } catch {
        setPicker((prev) =>
          prev
            ? { ...prev, loading: false, error: "Failed to load attorneys. Please close and try again." }
            : null
        );
      }
    },
    []
  );

  // ── Assign attorney ──────────────────────────────────────────────────────────

  const handleAssign = useCallback(
    async (attorney: AvailableAttorney) => {
      if (!picker) return;
      const { slotId } = picker;

      setAssigningFor(slotId);

      // Optimistic update — close picker immediately
      const optimisticAssignment = {
        id: "optimistic",
        attorneyId: attorney.id,
        attorneyName: `${attorney.firstName} ${attorney.lastName}`,
        firm: attorney.firm,
      };
      updateSlot(slotId, { assignment: optimisticAssignment, isSelected: true });
      setPicker(null);

      try {
        const result = await assignAttorney(slotId, attorney.id);
        if (!result.success) {
          // Revert optimistic update
          updateSlot(slotId, { assignment: null });
          showNotification("error", result.message ?? "Could not book this attorney.");

          // Re-open picker with fresh data so user can choose someone else
          await handlePickAttorney(slotId, `${fmt("")}–`);
        } else {
          showNotification(
            "success",
            `${attorney.firstName} ${attorney.lastName} booked!`
          );
        }
      } catch {
        updateSlot(slotId, { assignment: null });
        showNotification("error", "An error occurred. Please try again.");
      } finally {
        setAssigningFor(null);
      }
    },
    [picker, updateSlot, showNotification, handlePickAttorney]
  );

  // ── Remove assignment ────────────────────────────────────────────────────────

  const handleRemove = useCallback(
    async (slotId: string) => {
      setPending(slotId, true);

      // Optimistic: clear assignment, keep slot selected
      const currentSlot = days
        .flatMap((d) => d.slots)
        .find((s) => s.id === slotId);
      const prevAssignment = currentSlot?.assignment ?? null;
      updateSlot(slotId, { assignment: null });

      try {
        await removeAssignment(slotId);
        showNotification("success", "Attorney removed from slot.");
      } catch {
        updateSlot(slotId, { assignment: prevAssignment });
        showNotification("error", "Failed to remove assignment. Please try again.");
      } finally {
        setPending(slotId, false);
      }
    },
    [days, updateSlot, setPending, showNotification]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalSelected = days.flatMap((d) => d.slots).filter((s) => s.isSelected).length;
  const totalAssigned = days.flatMap((d) => d.slots).filter((s) => s.assignment).length;

  return (
    <div className="relative">
      {/* Notification toast */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border px-4 py-3 shadow-lg text-sm font-medium ${
            notification.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Summary bar */}
      <div className="mb-4 flex items-center gap-6 rounded-lg border bg-white px-4 py-3 shadow-sm text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-blue-200 ring-1 ring-blue-400" />
          <span className="text-slate-600">{totalSelected} slots selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-200 ring-1 ring-emerald-400" />
          <span className="text-slate-600">{totalAssigned} attorneys assigned</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-amber-200 ring-1 ring-amber-400" />
          <span className="text-slate-600">
            {totalSelected - totalAssigned} still need an attorney
          </span>
        </div>
      </div>

      {/* Days */}
      {days.map((day) => {
        const daySelected = day.slots.filter((s) => s.isSelected).length;
        const dayAssigned = day.slots.filter((s) => s.assignment).length;

        return (
          <div key={day.id} className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-800">
                {day.label}
              </h2>
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
                {daySelected} selected · {dayAssigned} assigned
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              {day.slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  onToggle={handleToggle}
                  onPickAttorney={handlePickAttorney}
                  onRemove={handleRemove}
                  pending={
                    pendingSlotIds.has(slot.id) || assigningFor === slot.id
                  }
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Attorney Picker Panel */}
      {picker && (
        <AttorneyPicker
          picker={picker}
          onClose={() => setPicker(null)}
          onAssign={handleAssign}
          assigning={assigningFor !== null}
        />
      )}
    </div>
  );
}
