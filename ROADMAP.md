# TMPC Counsel Connections — Development Roadmap

> Last updated: April 2026  
> Based on team review of the April 2026 demo build.

---

## Current State

### Live Demo (production)
- **URL:** tmpc-counsel-connections.vercel.app  
- Read-only demo with real 2025 conference data (131 attorneys, 16 companies, 130 assignments, 64 time slots across 4 event days)
- Simple password auth: `admin` / `company` (logs in as JPMorgan Chase)

### Interactive Preview (feature branch `claude/dazzling-chatelet`)
- **URL:** tmpc-counsel-connections-gdtdwrs7g-joshua-weavers-projects.vercel.app  
- All features below marked ✅ are live on this branch

| Area | What's built |
|------|-------------|
| **Portal: Schedule** | Checkbox grid to select time slots by day; slide-over attorney picker with search + practice area + org type filters; optimistic UI; conflict detection if two companies book the same attorney simultaneously |
| **Portal: Register** | Full company registration form — address, 17 practice area checkboxes, outside counsel need (low/medium/high), preferred virtual platform, contact info |
| **Portal: Interviewers** | Add / edit / remove interviewers inline |
| **Portal: Schedule Review** | Print-ready view of full schedule grouped by day; browser print button |
| **Admin: Attorney Roster** | Searchable/filterable table; CSV bulk import; per-row toggle for unavailable and withdrawn statuses |
| **Admin: Companies** | Company cards with status badges; "Add Company" modal that generates an invite code |
| **Admin: Master Schedule** | Interactive grid — click any cell to assign, reassign, or remove an attorney; slide-over picker pulls from available-attorney API |
| **API** | `GET /api/slots/[slotId]/available-attorneys` — excludes already-booked, globally unavailable, and slot/day-specific unavailable attorneys |
| **Auth** | Cookie-based password gate (demo mode); no Clerk/OAuth required to test |
| **DB** | Neon Postgres via Drizzle ORM; seeded with 2025 data; schema supports all features below |

---

## Phase A — Core Scheduling & Availability
*Priority: ship before the next event cycle opens*

### Company Scheduling Flow

- 🔧 **Improve scheduling UI** — the checkbox-grid + slide-over approach works but needs polish: clearer visual hierarchy, better empty-state messaging, progress indicator ("X of Y slots filled"), and a confirmation step before finalizing selections.
- 🔧 **Attorney availability filtering** — the available-attorney API already excludes booked and flagged attorneys; surface this context in the UI (e.g., "42 attorneys available for this slot" before opening the picker).
- 🔧 **Filters in attorney picker** — practice area and minority/women-owned filters are built; add city filter and a "match my practice areas" quick-filter based on the company's registered interests.

### Interviewer Management

- 🔧 **Require at least one interviewer** — gate schedule selection behind having at least one interviewer saved; show a prompt if the company tries to select slots with none on file.
- 📋 **Auto-default single interviewer to all slots** — if a company has exactly one interviewer, automatically assign them to every selected slot without requiring per-slot selection.
- 📋 **Per-slot interviewer assignment (multi-interviewer)** — when a company has more than one interviewer, show a "Who's interviewing this slot?" dropdown per slot. Hide this UI entirely when only one interviewer exists.
- 📋 **Interviewer name on attorney-facing schedule** — attorney schedule exports and views should show which company interviewer they'll be meeting (currently only attorney name/company is shown).

### Attorney Unavailability

- 🔧 **Active / unavailable / withdrawn statuses** — toggle buttons exist in admin; withdrawn removes attorney from selection entirely (works today); unavailable globally excludes them (works today).
- 📋 **Date/time-range unavailability** — expand beyond the current slot-level and day-level flags: let admin enter a block like "unavailable Oct 7, 2:00–4:00 PM" and have the system exclude that attorney from all overlapping slots automatically.
- 📋 **Surface unavailability in scheduling flow** — when a company is picking attorneys, show a note if an attorney's availability is limited on that day (e.g., a soft warning rather than just hiding them from certain slots).

---

## Phase B — Admin Event & Data Management
*Priority: needed before admins can self-serve a new event year*

### Event Configuration

- 📋 **Create new events in-app** — currently the event is seeded directly into the DB; build an event creation form (name, year, location/hotel, dates).
- 📋 **Calendar day selection** — for each event, select which days are active and whether they're virtual or in-person.
- 📋 **Define time slots per day** — configure start time, end time, slot duration (default 15 min), and break periods; auto-generate the slot grid.
- 📋 **Adjust attorneys and companies per event** — ability to copy or re-invite participants from a prior year's event.
- 📋 **Edit event details** — name, dates, hotel/venue, slot duration.

### Attorney Management

- ✅ **CSV bulk import** — live; handles practice areas in `Area:Percent;Area:Percent` format; skips duplicates.
- 📋 **Single-attorney add form** — add one attorney at a time without a CSV file; useful for late additions.
- 📋 **Attorney self-entry via link** — optional: generate a link attorneys can use to submit their own profile (name, firm, practice areas, contact info) for admin review before activation.

### Company Management

- ✅ **Manual company creation with invite code** — live; generates an 8-char alphanumeric code for sharing.
- 📋 **Company CSV import** — bulk-create companies from a spreadsheet export of the existing intake form.
- 📋 **Company self-entry via link** — intake form accessible at `/invite/[code]`; company fills in details directly; matches fields to the existing TMCP paper/PDF intake form.

---

## Phase C — Resume Handling *(new)*
*Priority: high value for companies; requires new storage layer*

- 📋 **Resume link on attorney card** — show a resume link or embedded PDF viewer in the attorney picker and schedule review so companies can review attorneys before/after selecting them.
- 📋 **Attorney records: resume attachments** — add a `resume_url` field to the attorneys table; standardize to PDF format.
- 📋 **Host resumes within the tool** — upload PDFs to object storage (e.g., Vercel Blob or S3); serve via signed URLs.
- 📋 **Bulk ingestion workflow** — admin uploads a ZIP of attorney PDFs; system attempts to match filenames to existing attorney records (by name or email); flags unmatched files for manual review.
- 📋 **Handle inconsistent filenames** — parser to normalize common filename patterns (e.g., `Firstname_Lastname_Resume.pdf`, `LastnameFirstname.pdf`) before attempting matching.

---

## Phase D — Exports & Mail Merge
*Priority: needed before first event using the new tool*

- 🔧 **Company schedule PDF export** — the schedule review page (`/portal/schedule/review`) is print-ready today via browser print; a proper server-side PDF (e.g., via `@react-pdf/renderer`) would be more reliable and allow emailing directly.
- 📋 **Attorney-specific schedule export** — each attorney gets a PDF/email showing their full day: time, company name, interviewer name. Currently no attorney-facing view exists.
- 📋 **Mail merge structure** — design the data shape for outbound notifications: attorney schedules emailed to each attorney, company schedules emailed to each company contact. Initial version can be a CSV export + external mail merge; later version sends directly from the app.

---

## Phase E — Workflow & Intake
*Priority: reduces coordination friction for admins*

- 📋 **Lower-friction intake flow** — first screen asks only for company name and contact email; full intake form link is sent to that email. Avoids asking for everything up front before the person is oriented.
- 📋 **Separate intake vs. scheduling roles** — the person who fills out the intake form (HR/coordinator) is often not the in-house attorney who does the scheduling. Design the flow so these can be different people under the same company account.

---

## Phase F — Production Auth *(defer)*
*Priority: defer until the tool is used beyond internal/demo testing*

- ✅ **Demo mode** — password-based auth (`admin` / `company`) is live and sufficient for demos and internal review sessions.
- 📋 **Magic link login** — when real companies log in, send a login link to their contact email rather than a shared password. No account creation required; low friction.
- 📋 **Role-based views** — `admin` (TMCP staff), `company` (in-house counsel), with structure to add more roles later (e.g., read-only observer, attorney-facing view).
- 📋 **Keep Clerk as an option** — the Clerk integration scaffolding exists in the codebase; can be re-enabled when production auth is prioritized.

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Done — live on the preview branch |
| 🔧 | Partially built — foundation exists, needs refinement |
| 📋 | New — not yet started |
