"use client";

import { useActionState, useRef } from "react";
import { updateCompanyProfile } from "../actions";

const PRACTICE_AREAS = [
  "Antitrust",
  "Appellate",
  "Commercial Litigation",
  "Corporate",
  "Finance",
  "Government",
  "Health Care",
  "Immigration",
  "Intellectual Property",
  "International",
  "Labor & Employment",
  "Oil & Gas",
  "Personal Injury",
  "Privacy/Cybersecurity",
  "Real Estate",
  "Securities",
  "Taxation",
];

type Company = {
  id: string;
  name: string;
  website: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  description: string | null;
  legalStaffCount: number | null;
  practiceAreas: unknown;
  outsideCounselNeed: string | null;
  preferredPlatform: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
};

export default function RegisterForm({ company }: { company: Company }) {
  const [state, action, pending] = useActionState(updateCompanyProfile, null);

  const existingAreas = Array.isArray(company.practiceAreas)
    ? (company.practiceAreas as string[])
    : [];

  return (
    <form action={action} className="space-y-8 max-w-2xl">
      {/* Success / Error banner */}
      {state?.success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Profile saved successfully.
        </div>
      )}
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Company Identity */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Corporation Information
        </h2>
        <div className="space-y-4">
          {/* Name (read-only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Corporation Name
            </label>
            <input
              type="text"
              value={company.name}
              disabled
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="website"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              defaultValue={company.website ?? ""}
              placeholder="https://example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="streetAddress"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Street Address
              </label>
              <input
                id="streetAddress"
                name="streetAddress"
                type="text"
                defaultValue={company.streetAddress ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label
                htmlFor="city"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={company.city ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="state"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  maxLength={2}
                  defaultValue={company.state ?? ""}
                  placeholder="TX"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm uppercase placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label
                  htmlFor="zip"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  ZIP Code
                </label>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  defaultValue={company.zip ?? ""}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Brief Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={company.description ?? ""}
              placeholder="A brief description of your corporation and legal department…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="legalStaffCount"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Number of Legal Staff
            </label>
            <input
              id="legalStaffCount"
              name="legalStaffCount"
              type="number"
              min={0}
              defaultValue={company.legalStaffCount ?? ""}
              className="w-full max-w-[160px] rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>
      </section>

      {/* Primary Contact */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Primary Contact
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="contactName"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Full Name
            </label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              defaultValue={company.contactName ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label
              htmlFor="contactTitle"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Title
            </label>
            <input
              id="contactTitle"
              name="contactTitle"
              type="text"
              defaultValue={company.contactTitle ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label
              htmlFor="contactEmail"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={company.contactEmail ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label
              htmlFor="contactPhone"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Phone
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={company.contactPhone ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>
      </section>

      {/* Practice Areas */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-800">
          Practice Areas of Interest
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Select the practice areas you are looking to hire outside counsel for.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRACTICE_AREAS.map((area) => (
            <label
              key={area}
              className="flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="practiceAreas"
                value={area}
                defaultChecked={existingAreas.includes(area)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{area}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Outside Counsel Need */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Preferences
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Current need for outside counsel
            </label>
            <div className="flex gap-4">
              {["low", "medium", "high"].map((level) => (
                <label key={level} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="outsideCounselNeed"
                    value={level}
                    defaultChecked={company.outsideCounselNeed === level}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm capitalize text-slate-700">{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="preferredPlatform"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Preferred virtual meeting platform (for virtual days)
            </label>
            <select
              id="preferredPlatform"
              name="preferredPlatform"
              defaultValue={company.preferredPlatform ?? ""}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Select a platform…</option>
              <option value="zoom">Zoom</option>
              <option value="teams">Microsoft Teams</option>
              <option value="webex">WebEx</option>
              <option value="phone">Phone</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Registration"}
        </button>
        {state?.success && (
          <span className="text-sm text-emerald-600 font-medium">Saved!</span>
        )}
      </div>
    </form>
  );
}
