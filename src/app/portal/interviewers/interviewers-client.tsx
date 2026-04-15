"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { addInterviewer, updateInterviewer, removeInterviewer } from "../actions";

type Interviewer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

function AddForm() {
  const [state, action, pending] = useActionState(addInterviewer, null);
  const [formKey, setFormKey] = useState(0);
  const prevSuccess = useRef(false);

  useEffect(() => {
    if (state?.success && !prevSuccess.current) {
      setFormKey((k) => k + 1);
    }
    prevSuccess.current = state?.success ?? false;
  }, [state]);

  return (
    <form
      key={formKey}
      action={action}
      className="rounded-lg border bg-white p-5 shadow-sm"
    >
      <h3 className="mb-4 text-sm font-semibold text-slate-700">
        Add Interviewer
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="add-name"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="add-name"
            name="name"
            type="text"
            required
            placeholder="Jane Smith"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label
            htmlFor="add-email"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Email
          </label>
          <input
            id="add-email"
            name="email"
            type="email"
            placeholder="jane@company.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label
            htmlFor="add-phone"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Phone
          </label>
          <input
            id="add-phone"
            name="phone"
            type="tel"
            placeholder="555-555-5555"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>
      {state?.error && (
        <p className="mt-2 text-xs text-red-600">{state.error}</p>
      )}
      <div className="mt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add Interviewer"}
        </button>
      </div>
    </form>
  );
}

function EditRow({
  interviewer,
  onSaved,
  onCancel,
}: {
  interviewer: Interviewer;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const boundAction = updateInterviewer.bind(null, interviewer.id);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.success) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="flex items-end gap-3 py-3 px-4 bg-blue-50 border-b">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={interviewer.name}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={interviewer.email ?? ""}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
        <input
          name="phone"
          type="tel"
          defaultValue={interviewer.phone ?? ""}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div className="flex gap-2 pb-0.5">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
      {state?.error && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}
    </form>
  );
}

function InterviewerRow({
  interviewer,
  onDeleted,
}: {
  interviewer: Interviewer;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeInterviewer(interviewer.id);
      onDeleted();
    } catch {
      setRemoving(false);
    }
  };

  if (editing) {
    return (
      <EditRow
        interviewer={interviewer}
        onSaved={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center border-b px-4 py-3 last:border-b-0 hover:bg-slate-50">
      {/* Avatar */}
      <div className="mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
        {interviewer.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900">{interviewer.name}</p>
        <div className="flex flex-wrap gap-x-4 text-xs text-slate-500 mt-0.5">
          {interviewer.email && <span>{interviewer.email}</span>}
          {interviewer.phone && <span>{interviewer.phone}</span>}
        </div>
      </div>

      <div className="flex gap-2 ml-4">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          Edit
        </button>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="rounded px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-60"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      </div>
    </div>
  );
}

export default function InterviewersClient({
  interviewers: initial,
}: {
  interviewers: Interviewer[];
}) {
  // Track removed IDs client-side for optimistic delete
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const visible = initial.filter((i) => !removedIds.has(i.id));

  return (
    <div className="max-w-2xl space-y-4">
      {/* List */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No interviewers added yet.
          </div>
        ) : (
          visible.map((i) => (
            <InterviewerRow
              key={i.id}
              interviewer={i}
              onDeleted={() =>
                setRemovedIds((prev) => new Set([...prev, i.id]))
              }
            />
          ))
        )}
      </div>

      {/* Add form */}
      <AddForm />
    </div>
  );
}
