# TMPC Counsel Connections — MVP Planning Document

> **Project:** A web dashboard to replace the manual PDF/spreadsheet workflow for the TMCP (Texas Minority Counsel Program) Counsel Connections program.
>
> **Two portals:**
> 1. **Admin Dashboard** — TMCP staff configure events, upload attorney rosters, invite companies, monitor/adjust assignments
> 2. **Corporation Portal** — In-house counsel register, select interview slots, pick attorneys, view/export schedules

---

## 1. Background & Current Process

The TMCP Counsel Connections program matches **corporations** (in-house legal departments) with **outside counsel attorneys** for 15-minute one-on-one meetings at an annual conference. Currently this is managed entirely through:

- **PDF forms** emailed back and forth (company registration, availability/selection)
- **Manual Excel spreadsheets** tracking ~85 attorneys × ~15 companies × 4 days of 15-min slots
- **Manual email merge** to notify attorneys of their interview schedules

### Key entities in the current process:
- **Event**: Multi-day conference (e.g., Oct 6-9, 2025 in Dallas). Monday is virtual; Tue-Thu are in-person.
- **Companies**: Corporations like JPMorgan Chase, ExxonMobil, Toyota, etc. (~15 per event)
- **Company Interviewers**: In-house attorneys conducting interviews (1-2 per company, can vary by day)
- **Attorneys**: Outside counsel lawyers registered to participate (~85-100 per event)
- **Time Slots**: 15-minute blocks across the event days
- **Assignments**: The mapping of Attorney → Time Slot → Company → Interviewer

### Critical constraint:
**An attorney can only be in one interview at a time.** When a company selects a time slot and chooses attorneys, they must only see attorneys who are NOT already booked in that slot by any other company.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js 15 (App Router) | React, server components, API routes |
| **Language** | TypeScript | End-to-end type safety |
| **Auth** | Clerk | Gmail/email login, role-based (admin vs company) |
| **Database** | PostgreSQL via Neon | Serverless Postgres, generous free tier |
| **ORM** | Drizzle ORM | Type-safe, lightweight, SQL-like |
| **Styling** | Tailwind CSS + shadcn/ui | Consistent, accessible component library |
| **PDF Export** | @react-pdf/renderer or jsPDF | Company schedule export |
| **Deployment** | Vercel | Automatic preview deploys, edge functions |
| **Repo** | github.com/weaverinnovations/tmpc-counsel-connections | Already created |

---

## 3. Database Schema

### 3.1 `events`
The top-level container for each annual program.

```sql
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                    -- "33rd Annual TMCP 2025"
  description   TEXT,                             -- Optional event description
  location      TEXT,                             -- "Renaissance Dallas Hotel"
  start_date    DATE NOT NULL,                    -- First day of event
  end_date      DATE NOT NULL,                    -- Last day of event
  slot_duration INTEGER NOT NULL DEFAULT 15,      -- Minutes per slot
  status        TEXT NOT NULL DEFAULT 'draft',    -- draft | open | closed
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 `event_days`
Each day of the event, with its own time range and format (virtual vs in-person).

```sql
CREATE TABLE event_days (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  label         TEXT NOT NULL,                    -- "Monday, October 6"
  format        TEXT NOT NULL DEFAULT 'in_person', -- virtual | in_person
  start_time    TIME NOT NULL,                    -- e.g., "09:00"
  end_time      TIME NOT NULL,                    -- e.g., "17:00"
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id, date)
);
```

### 3.3 `break_periods`
Conference-wide breaks where no interviews happen (lunch, keynotes, etc.).

```sql
CREATE TABLE break_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_day_id  UUID NOT NULL REFERENCES event_days(id) ON DELETE CASCADE,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  label         TEXT,                             -- "Conference Break", "Lunch"
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 `time_slots`
Pre-generated from event_days configuration. Each represents one bookable 15-minute window.

```sql
CREATE TABLE time_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_day_id  UUID NOT NULL REFERENCES event_days(id) ON DELETE CASCADE,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  sort_order    INTEGER NOT NULL,                 -- For display ordering

  UNIQUE(event_day_id, start_time)
);
```

**Generation logic:** When an admin configures a day (e.g., Tue Oct 7, 2:00 PM – 5:00 PM, 15-min slots), the system generates slots: 2:00-2:15, 2:15-2:30, ..., 4:45-5:00. Slots overlapping break periods are excluded.

### 3.5 `attorneys`
The pool of outside counsel available for interviews.

```sql
CREATE TABLE attorneys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  firm            TEXT NOT NULL,
  city            TEXT,
  organization_type TEXT,                         -- "Minority or Woman-owned law firm", etc.
  practice_areas  JSONB DEFAULT '[]',             -- [{area: "Commercial Litigation", percent: 0.5}]
  partner_count   INTEGER,
  associate_count INTEGER,
  of_counsel_count INTEGER,
  is_unavailable  BOOLEAN DEFAULT false,          -- Global unavailability flag
  unavailable_note TEXT,                          -- Admin note, e.g., "Speaking 10/7, 2:00 - 2:45"
  status          TEXT NOT NULL DEFAULT 'active', -- active | withdrawn
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id, email)
);
```

### 3.6 `attorney_unavailability`
Specific time-based unavailability (an attorney can't do a specific slot or day).

```sql
CREATE TABLE attorney_unavailability (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_id     UUID NOT NULL REFERENCES attorneys(id) ON DELETE CASCADE,
  time_slot_id    UUID REFERENCES time_slots(id) ON DELETE CASCADE,  -- NULL = whole day
  event_day_id    UUID REFERENCES event_days(id) ON DELETE CASCADE,  -- For day-level blocks
  note            TEXT,                           -- "Speaking at panel"
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 3.7 `companies`
Corporations participating in the event.

```sql
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                  -- "JPMorgan Chase"
  website         TEXT,
  street_address  TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  description     TEXT,                           -- Brief description
  legal_staff_count INTEGER,
  practice_areas  JSONB DEFAULT '[]',             -- ["Commercial Litigation", "Labor & Employment"]
  outside_counsel_need TEXT,                      -- low | medium | high
  preferred_platform TEXT,                        -- For virtual days: zoom | teams | webex | phone | other
  clerk_user_id   TEXT,                           -- Linked Clerk user (company contact)
  contact_name    TEXT,
  contact_title   TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  invite_code     TEXT UNIQUE,                    -- Unique code for initial sign-up link
  status          TEXT NOT NULL DEFAULT 'invited', -- invited | registered | selections_complete
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id, name)
);
```

### 3.8 `company_interviewers`
In-house attorneys conducting interviews for a company.

```sql
CREATE TABLE company_interviewers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 3.9 `company_slot_selections`
Which time slots a company has selected for conducting interviews.

```sql
CREATE TABLE company_slot_selections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  time_slot_id    UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  interviewer_id  UUID REFERENCES company_interviewers(id) ON DELETE SET NULL, -- Who's interviewing
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, time_slot_id)
);
```

### 3.10 `assignments`
The core table — maps an attorney to a company at a specific time slot.

```sql
CREATE TABLE assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  attorney_id       UUID NOT NULL REFERENCES attorneys(id) ON DELETE CASCADE,
  time_slot_id      UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  interviewer_id    UUID REFERENCES company_interviewers(id) ON DELETE SET NULL,
  source            TEXT NOT NULL DEFAULT 'company',  -- company | admin (who made this assignment)
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  -- AN ATTORNEY CAN ONLY BE IN ONE INTERVIEW PER SLOT
  UNIQUE(attorney_id, time_slot_id),
  -- A COMPANY CAN ONLY INTERVIEW ONE ATTORNEY PER SLOT
  UNIQUE(company_id, time_slot_id)
);
```

**This is the critical constraint.** The `UNIQUE(attorney_id, time_slot_id)` ensures no double-booking. The `UNIQUE(company_id, time_slot_id)` ensures a company only has one attorney per slot.

### 3.11 `admin_users`
Track which Clerk users are admins.

```sql
CREATE TABLE admin_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id   TEXT NOT NULL UNIQUE,
  name            TEXT,
  email           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Application Routes & Pages

### 4.1 Public / Auth

| Route | Description |
|-------|-------------|
| `/` | Landing page with sign-in options |
| `/sign-in` | Clerk sign-in (Gmail / email) |
| `/sign-up` | Clerk sign-up |
| `/invite/[code]` | Company invite link — signs up and links to company |

### 4.2 Admin Dashboard (`/admin/*`)

Protected by Clerk middleware — only users in `admin_users` table.

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard home — list of events, quick stats |
| `/admin/events/new` | Create new event |
| `/admin/events/[eventId]` | Event overview — status, stats, quick actions |
| `/admin/events/[eventId]/days` | Configure event days (dates, times, breaks) |
| `/admin/events/[eventId]/attorneys` | Attorney roster — upload CSV, view/edit/flag unavailability |
| `/admin/events/[eventId]/companies` | Company list — invite, view status, manage |
| `/admin/events/[eventId]/companies/[companyId]` | Single company detail — their selections, assignments |
| `/admin/events/[eventId]/assignments` | Master assignments view — grid/table of all assignments |
| `/admin/events/[eventId]/assignments/edit` | Manual assignment editor — drag-drop or form-based |

### 4.3 Corporation Portal (`/portal/*`)

Protected by Clerk middleware — user linked to a company.

| Route | Description |
|-------|-------------|
| `/portal` | Company home — shows their event, status, next steps |
| `/portal/register` | Company registration form (company info, practice areas, etc.) |
| `/portal/interviewers` | Add/edit interviewer names and contact info |
| `/portal/schedule` | **Core page:** Select time slots, then assign attorneys to each |
| `/portal/schedule/review` | Review all selections before confirming |
| `/portal/schedule/final` | View final schedule (read-only once confirmed / admin-adjusted) |
| `/portal/schedule/export` | Download schedule as PDF |

---

## 5. Detailed User Flows

### 5.1 Admin: Create & Configure Event

```
1. Admin signs in → lands on /admin
2. Clicks "New Event" → fills in:
   - Event name, location, description
   - Start date, end date
   - Slot duration (default 15 min)
3. Redirected to /admin/events/[id]/days
4. For each day, configures:
   - Date (auto-populated from start/end range)
   - Label ("Monday, October 6")
   - Format: virtual or in-person
   - Available time range (start, end)
   - Break periods (start, end, label) — repeatable
5. System auto-generates time_slots for each day, excluding breaks
6. Admin reviews the generated slot grid visually
```

### 5.2 Admin: Upload Attorney Roster

```
1. Navigate to /admin/events/[id]/attorneys
2. Click "Upload CSV" — expects columns:
   - first_name, last_name, email, phone, firm, city,
     organization_type, practice_areas, partner_count,
     associate_count, of_counsel_count
3. System parses and shows preview with row count, sample rows
4. Admin confirms import → attorneys created
5. Admin can then:
   - View full roster in a searchable/filterable table
   - Click any attorney to edit details
   - Toggle "unavailable" flag + add note
   - Add specific time-based unavailability (day or slot)
   - Remove an attorney (set withdrawn status)
```

**CSV format example:**
```csv
first_name,last_name,email,phone,firm,city,organization_type,practice_areas,partner_count,associate_count,of_counsel_count
Melissa,Ackie,mackie@littler.com,512-982-7255,Littler Mendelson,Austin,Majority-owned law firm,"Labor & Employment Law:100",700,700,250
Karla,Aghedo,aghedolaw@gmail.com,903-521-4837,The Aghedo Firm Pllc,Houston,Minority or Woman-owned law firm,"Commercial Litigation:50;Health Care:50",1,0,0
```

### 5.3 Admin: Invite Companies

```
1. Navigate to /admin/events/[id]/companies
2. Click "Add Company" → enters:
   - Company name
   - Contact email
3. System generates unique invite_code
4. Admin copies invite link: https://app.example.com/invite/[code]
5. Admin emails/sends this link to the company contact
6. Company list shows status for each: invited → registered → selections_complete
```

### 5.4 Company: Registration

```
1. Company contact receives invite link
2. Clicks link → redirected to Clerk sign-in/sign-up (Gmail or email)
3. After auth, system links their Clerk user to the company via invite_code
4. Redirected to /portal/register
5. Fills out company registration form:
   - Corporation name (pre-filled from admin)
   - Website, address, city, state, zip
   - Brief description
   - Number of legal staff
   - Practice areas (checkbox grid — matches the 01 form):
     □ Antitrust          □ Appellate
     □ Commercial Lit.    □ Corporate
     □ Finance            □ Government
     □ Health Care        □ Immigration
     □ Intellectual Prop. □ International
     □ Labor & Employment □ Oil & Gas
     □ Personal Injury    □ Privacy/Cyber
     □ Real Estate        □ Securities
     □ Taxation
   - Current need for outside counsel: Low / Medium / High
6. Clicks "Save & Continue"
7. Company status → "registered"
```

### 5.5 Company: Add Interviewers

```
1. Redirected to /portal/interviewers
2. Adds 1-2 interviewer profiles:
   - Name, email, phone
3. For virtual days: selects preferred platform (Zoom, Teams, Webex, Phone, Other)
4. Clicks "Continue to Schedule"
```

### 5.6 Company: Select Time Slots (Core Flow — Step 1)

```
1. Arrives at /portal/schedule
2. Sees a visual grid of all event days with time slots:

   ┌──────────────────────────────────────────────────────────┐
   │  MONDAY OCT 6 (Virtual)  │  TUESDAY OCT 7 (In-Person)  │
   │  ─────────────────────    │  ─────────────────────       │
   │  ☐ 9:00 - 9:15           │  ☐ 2:00 - 2:15              │
   │  ☐ 9:15 - 9:30           │  ☐ 2:15 - 2:30              │
   │  ☐ 9:30 - 9:45           │  ☐ 2:30 - 2:45              │
   │  ...                     │  ...                         │
   │  ░░ BREAK ░░░░░░         │  ░░ BREAK ░░░░░░            │
   │  ...                     │  ...                         │
   │  ☐ 4:45 - 5:00           │  ☐ 4:45 - 5:00              │
   └──────────────────────────────────────────────────────────┘

   WEDNESDAY OCT 8    THURSDAY OCT 9
   (same pattern)     (same pattern)

3. Company checks/unchecks slots they want
4. Checked slots are highlighted
5. Can optionally assign which of their interviewers handles which slot
6. Clicks "Save Selections" → stored in company_slot_selections
7. UI updates to show selected slots with "Assign Attorney" buttons
```

### 5.7 Company: Select Attorneys for Each Slot (Core Flow — Step 2)

This is the most complex interaction and the heart of the application.

```
1. For each selected time slot, company clicks "Select Attorney"
2. A modal/panel opens showing AVAILABLE attorneys:
   - Full attorney list MINUS:
     a) Attorneys already assigned to ANY company in this exact time slot
     b) Attorneys flagged as unavailable (global or for this slot/day)
   - Each attorney card shows:
     - Name, firm, city
     - Practice areas (with percentages)
     - Firm size (partners/associates/of counsel)
     - Organization type (minority-owned, etc.)
3. List is searchable by name/firm and filterable by:
   - Practice area
   - City
   - Organization type
4. Company clicks an attorney → attorney is assigned to that slot
5. Assignment is immediately saved (optimistic UI with server confirmation)
6. That attorney DISAPPEARS from available lists for this slot in all other
   company portals (real-time or on next load)
7. Company can remove an attorney from a slot (frees them up for others)
8. Repeat for all selected slots
```

**Conflict resolution query (the key SQL):**

```sql
-- Get available attorneys for a given time slot
SELECT a.*
FROM attorneys a
WHERE a.event_id = :eventId
  AND a.status = 'active'
  AND a.is_unavailable = false
  -- Not already assigned in this time slot (by any company)
  AND a.id NOT IN (
    SELECT attorney_id FROM assignments
    WHERE time_slot_id = :timeSlotId
      AND status = 'confirmed'
  )
  -- Not flagged unavailable for this specific slot
  AND a.id NOT IN (
    SELECT attorney_id FROM attorney_unavailability
    WHERE time_slot_id = :timeSlotId
       OR event_day_id = :eventDayId
  )
ORDER BY a.last_name, a.first_name;
```

### 5.8 Company: Review & Export Schedule

```
1. Navigate to /portal/schedule/review
2. Sees their complete schedule:

   ┌──────────────────────────────────────────────────────────────┐
   │  YOUR COUNSEL CONNECTIONS SCHEDULE                           │
   │  ═══════════════════════════════════                         │
   │                                                              │
   │  MONDAY, OCTOBER 6 (Virtual via Zoom)                       │
   │  ┌────────────────┬──────────────────┬────────────────────┐  │
   │  │ 10:30 - 10:45  │ Shelisa Brock    │ Jackson Walker LLP │  │
   │  │ 10:45 - 11:00  │ Melissa Ackie    │ Littler Mendelson  │  │
   │  │ 11:00 - 11:15  │ Priscilla Arthus │ Pierson Ferdinand  │  │
   │  └────────────────┴──────────────────┴────────────────────┘  │
   │                                                              │
   │  TUESDAY, OCTOBER 7 (In-Person)                              │
   │  Interviewer: Karen Whitaker                                 │
   │  ┌────────────────┬──────────────────┬────────────────────┐  │
   │  │ 3:45 - 4:00    │ Stephanie Almeter│ McCathern PLLC     │  │
   │  │ 4:00 - 4:15    │ Nabeela Arshi    │ Porter Hedges      │  │
   │  │ 4:15 - 4:30    │ Melina Bales     │ Bales Law PLLC     │  │
   │  └────────────────┴──────────────────┴────────────────────┘  │
   └──────────────────────────────────────────────────────────────┘

3. "Export PDF" button generates a clean schedule PDF
4. PDF includes: company name, event name, date, interviewer names,
   and the full schedule grid with attorney names, firms, and contact info
```

### 5.9 Admin: Monitor & Adjust Assignments

```
1. Navigate to /admin/events/[id]/assignments
2. Master grid view — rows = time slots, columns = companies:

   ┌──────────┬─────────────┬─────────────┬──────────────┬────────┐
   │ Time     │ JPMorgan    │ ExxonMobil  │ Toyota       │ TDECU  │
   │══════════│═════════════│═════════════│══════════════│════════│
   │ Tue 2:00 │ M. Calaf    │ L. Alaniz   │              │        │
   │ Tue 2:15 │             │ D. Anchondo │              │        │
   │ Tue 2:30 │             │ N. Bennett  │              │        │
   │ ...      │ ...         │ ...         │ ...          │ ...    │
   └──────────┴─────────────┴─────────────┴──────────────┴────────┘

3. Can click any cell to:
   - View assignment details
   - Remove an assignment (frees up the attorney)
   - Reassign a different attorney
   - Add an assignment to an empty cell
4. Can also view per-attorney schedule:
   - Click an attorney name anywhere → see all their assignments across companies
5. Manual override capabilities:
   - Assign an attorney even to a slot where the company didn't select a time
   - Move an assignment from one slot to another
   - Cancel an assignment
   - All manual changes marked with source='admin'
```

---

## 6. API Routes

All API routes under `/api/` using Next.js Route Handlers.

### 6.1 Events
```
GET    /api/events                          — List all events (admin)
POST   /api/events                          — Create event (admin)
GET    /api/events/[eventId]                — Get event details
PATCH  /api/events/[eventId]                — Update event (admin)
```

### 6.2 Event Days & Slots
```
GET    /api/events/[eventId]/days           — List days with slots
POST   /api/events/[eventId]/days           — Create/update day config (admin)
DELETE /api/events/[eventId]/days/[dayId]   — Remove a day (admin)
POST   /api/events/[eventId]/days/[dayId]/generate-slots — Generate time slots (admin)
GET    /api/events/[eventId]/slots          — List all slots (with availability counts)
```

### 6.3 Attorneys
```
GET    /api/events/[eventId]/attorneys                — List attorneys (filterable)
POST   /api/events/[eventId]/attorneys                — Create single attorney (admin)
POST   /api/events/[eventId]/attorneys/import         — Bulk CSV import (admin)
GET    /api/events/[eventId]/attorneys/[id]            — Get attorney detail
PATCH  /api/events/[eventId]/attorneys/[id]            — Update attorney (admin)
POST   /api/events/[eventId]/attorneys/[id]/unavailability — Add unavailability (admin)
DELETE /api/events/[eventId]/attorneys/[id]/unavailability/[uid] — Remove (admin)
```

### 6.4 Companies
```
GET    /api/events/[eventId]/companies                — List companies (admin)
POST   /api/events/[eventId]/companies                — Create/invite company (admin)
GET    /api/events/[eventId]/companies/[id]            — Get company detail
PATCH  /api/events/[eventId]/companies/[id]            — Update company
POST   /api/invite/[code]                              — Claim invite (company auth)
```

### 6.5 Company Interviewers
```
GET    /api/companies/[companyId]/interviewers         — List interviewers
POST   /api/companies/[companyId]/interviewers         — Add interviewer
PATCH  /api/companies/[companyId]/interviewers/[id]    — Update
DELETE /api/companies/[companyId]/interviewers/[id]    — Remove
```

### 6.6 Slot Selections (Company picks time slots)
```
GET    /api/companies/[companyId]/slots                — Get selected slots
PUT    /api/companies/[companyId]/slots                — Bulk update selections (toggle on/off)
```

### 6.7 Assignments (The core)
```
GET    /api/events/[eventId]/assignments               — All assignments (admin grid)
GET    /api/companies/[companyId]/assignments           — Company's assignments
GET    /api/slots/[slotId]/available-attorneys          — Available attorneys for a slot ⭐
POST   /api/assignments                                — Create assignment
PATCH  /api/assignments/[id]                            — Update (change attorney, cancel)
DELETE /api/assignments/[id]                            — Remove assignment
```

### 6.8 Export
```
GET    /api/companies/[companyId]/schedule/pdf          — Generate schedule PDF
GET    /api/events/[eventId]/assignments/export         — Master export (admin, CSV/Excel)
```

---

## 7. Key Technical Details

### 7.1 Preventing Double-Booking (Race Conditions)

The `UNIQUE(attorney_id, time_slot_id)` constraint on `assignments` is the ultimate guard. But for good UX:

1. **Optimistic locking**: When company opens the attorney picker for a slot, we fetch available attorneys. If two companies try to book the same attorney in the same slot simultaneously, the second INSERT will fail on the unique constraint.

2. **Graceful error handling**: On conflict, show a toast: "Sorry, [Attorney Name] was just booked for this slot by another company. Please select a different attorney." Refresh the available list.

3. **Database transaction**: Each assignment creation should be wrapped in a transaction:
   ```sql
   BEGIN;
   -- Verify attorney is still available
   SELECT 1 FROM assignments
     WHERE attorney_id = :attorneyId AND time_slot_id = :slotId AND status = 'confirmed';
   -- If no rows, proceed with insert
   INSERT INTO assignments (...) VALUES (...);
   COMMIT;
   ```

### 7.2 Clerk Auth Integration

**Roles:**
- After Clerk sign-in, check `admin_users` table for `clerk_user_id` match → admin role
- Check `companies` table for `clerk_user_id` match → company role
- No match → show "no access" page

**Middleware:**
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isPortalRoute = createRouteMatcher(['/portal(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request) || isPortalRoute(request)) {
    await auth.protect() // Require sign-in
  }
})
```

**Role checking happens in page/layout server components** by querying the database with the Clerk user ID.

### 7.3 CSV Import Parsing

For attorney roster upload:
1. Accept `.csv` or `.xlsx` files
2. Parse on the server (using `papaparse` for CSV, `xlsx` for Excel)
3. Map columns flexibly (show column mapping UI if headers don't match exactly)
4. Handle practice areas: can be semicolon-separated like `"Commercial Litigation:50;Labor & Employment:50"`
5. Validate: required fields (name, email, firm), email format, no duplicates
6. Show preview with validation errors highlighted
7. Confirm to import

### 7.4 PDF Export

Company schedule PDF should include:
- Event header (name, dates, location)
- Company name and interviewer info
- Per-day schedule table:
  - Time slot
  - Attorney name
  - Attorney firm
  - Attorney email / phone
  - Interviewer name
  - Format (virtual/in-person) + platform for virtual
- Generated timestamp

Use `@react-pdf/renderer` for server-side PDF generation via API route.

### 7.5 Time Slot Generation Algorithm

```typescript
function generateSlots(day: EventDay, breaks: BreakPeriod[], slotDuration: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let current = day.startTime; // e.g., "09:00"
  let order = 0;

  while (current < day.endTime) {
    const slotEnd = addMinutes(current, slotDuration);

    // Check if this slot overlaps any break
    const overlapsBreak = breaks.some(
      b => current < b.endTime && slotEnd > b.startTime
    );

    if (!overlapsBreak) {
      slots.push({
        eventDayId: day.id,
        startTime: current,
        endTime: slotEnd,
        sortOrder: order++,
      });
    }

    current = slotEnd;
  }

  return slots;
}
```

---

## 8. UI Component Plan

### 8.1 Shared Components
- `<TimeSlotGrid>` — Visual grid of time slots for a day (used by both admin and company)
- `<AttorneyCard>` — Compact card showing attorney info (name, firm, practice areas)
- `<AttorneyPicker>` — Modal with searchable/filterable attorney list for assignment
- `<ScheduleTable>` — Read-only schedule view (used for review and PDF)
- `<StatusBadge>` — Shows event/company status with color coding
- `<CSVUploader>` — Drag-drop CSV upload with preview and column mapping

### 8.2 Admin-Specific Components
- `<EventForm>` — Create/edit event
- `<DayConfigurator>` — Configure a single event day (time range, breaks)
- `<AttorneyRoster>` — Searchable table with bulk actions
- `<CompanyList>` — Company cards with status indicators
- `<MasterAssignmentGrid>` — The big grid (slots × companies) for admin overview
- `<AssignmentEditor>` — Inline editing for manual adjustments

### 8.3 Company-Specific Components
- `<RegistrationForm>` — Multi-section company info form
- `<InterviewerForm>` — Add/edit interviewers
- `<SlotSelector>` — Checkbox grid for selecting time slots
- `<SlotAssignmentPanel>` — Per-slot attorney selection interface
- `<ScheduleReview>` — Final schedule before export

---

## 9. Data Seeding (from Sample Data)

For development and demo purposes, create a seed script that loads the 2025 data:

1. **Event**: "33rd Annual TMCP 2025", Oct 6-9, Renaissance Dallas Hotel
2. **Days**:
   - Mon Oct 6: Virtual, 9:00 AM - 5:00 PM
   - Tue Oct 7: In-person, 2:00 PM - 5:00 PM
   - Wed Oct 8: In-person, 1:45 PM - 5:00 PM
   - Thu Oct 9: In-person, 9:00 AM - 12:00 PM
3. **Attorneys**: Import from `03C_Breakdown` spreadsheet (~100 unique attorneys)
4. **Companies**: From assignments spreadsheet:
   - JPMorgan Chase
   - Exxon Mobil Corporation
   - Toyota Motor North America
   - Rice University
   - TDECU
   - McKesson
   - Shell USA, Inc.
   - LyondellBasell
   - Citi
   - Austin City Attorney's Office
   - Jacobs
   - Houston Forensic Science Center
   - Flotek Industries, Inc.
   - Anchor QEA Inc.
5. **Assignments**: Parse from 04_Assignments spreadsheet to populate the assignments table

---

## 10. Project Structure

```
tmpc-counsel-connections/
├── README.md
├── PLAN.md                          ← This document
├── data/                            ← Sample data (gitignored in prod)
├── src/
│   ├── app/
│   │   ├── layout.tsx               ← Root layout (Clerk provider, global styles)
│   │   ├── page.tsx                 ← Landing / sign-in redirect
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx
│   │   ├── sign-up/[[...sign-up]]/
│   │   │   └── page.tsx
│   │   ├── invite/[code]/
│   │   │   └── page.tsx             ← Company invite claim
│   │   ├── admin/
│   │   │   ├── layout.tsx           ← Admin layout (sidebar nav, role check)
│   │   │   ├── page.tsx             ← Dashboard home
│   │   │   └── events/
│   │   │       ├── new/page.tsx
│   │   │       └── [eventId]/
│   │   │           ├── page.tsx     ← Event overview
│   │   │           ├── days/page.tsx
│   │   │           ├── attorneys/page.tsx
│   │   │           ├── companies/
│   │   │           │   ├── page.tsx
│   │   │           │   └── [companyId]/page.tsx
│   │   │           └── assignments/
│   │   │               ├── page.tsx
│   │   │               └── edit/page.tsx
│   │   ├── portal/
│   │   │   ├── layout.tsx           ← Portal layout (company context, role check)
│   │   │   ├── page.tsx             ← Company home
│   │   │   ├── register/page.tsx
│   │   │   ├── interviewers/page.tsx
│   │   │   └── schedule/
│   │   │       ├── page.tsx         ← Slot selection + attorney assignment
│   │   │       ├── review/page.tsx
│   │   │       ├── final/page.tsx
│   │   │       └── export/page.tsx
│   │   └── api/
│   │       ├── events/              ← Event CRUD
│   │       ├── attorneys/           ← Attorney CRUD + import
│   │       ├── companies/           ← Company CRUD + invite
│   │       ├── assignments/         ← Assignment CRUD + availability
│   │       ├── slots/               ← Slot queries
│   │       └── export/              ← PDF/CSV generation
│   ├── components/
│   │   ├── ui/                      ← shadcn/ui components
│   │   ├── admin/                   ← Admin-specific components
│   │   ├── portal/                  ← Company-specific components
│   │   └── shared/                  ← Shared components
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts            ← Drizzle schema (all tables)
│   │   │   ├── index.ts             ← DB connection
│   │   │   └── migrations/          ← Drizzle migrations
│   │   ├── auth.ts                  ← Clerk helpers, role resolution
│   │   ├── utils.ts                 ← General utilities
│   │   └── pdf.ts                   ← PDF generation helpers
│   └── types/
│       └── index.ts                 ← Shared TypeScript types
├── drizzle.config.ts
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.local.example               ← Template for env vars
```

---

## 11. Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database (Neon)
DATABASE_URL=postgresql://...@....neon.tech/tmpc_counsel_connections?sslmode=require

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 12. MVP Scope & Non-Scope

### ✅ In Scope (MVP)
- Admin: Create/configure events with days, time ranges, breaks
- Admin: Upload attorney roster (CSV)
- Admin: Flag attorney unavailability (global + per-slot/day)
- Admin: Invite companies via unique link
- Admin: View master assignment grid
- Admin: Manually adjust assignments (add/remove/move)
- Company: Sign in via Clerk (Gmail/email)
- Company: Fill out registration form (company info, practice areas, hiring need)
- Company: Add interviewers
- Company: Select time slots from visual grid
- Company: Pick attorneys for each slot (with real-time availability filtering)
- Company: View and export schedule as PDF
- Conflict prevention: attorneys can't be double-booked
- Seed data from 2025 sample files

### ❌ Out of Scope (Future)
- Email notifications (invite emails, schedule confirmations, reminders)
- Attorney self-registration portal
- Real-time updates via WebSocket (polling is fine for MVP)
- Multi-user per company (MVP: one user per company)
- Resume upload/management for attorneys
- Mobile app
- Analytics/reporting dashboard
- Integration with conference registration system
- Automated matching/suggestions (AI-powered attorney recommendations)
- Calendar integration (iCal export)
- Waitlist management
- Company-to-company visibility (who else selected this attorney)

---

## 13. Development Phases

### Phase 1: Foundation (scaffold + DB + auth)
1. Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
2. Set up Clerk authentication
3. Set up Neon database + Drizzle ORM
4. Create database schema + run migrations
5. Build admin role check middleware
6. Create seed script from sample data
7. Deploy to Vercel (CI/CD pipeline)

### Phase 2: Admin — Event & Data Management
1. Event CRUD (create, edit, list)
2. Day configuration with slot generation
3. Attorney roster: CSV upload, list, edit, unavailability flags
4. Company management: invite, list, status tracking

### Phase 3: Company Portal — Registration & Scheduling
1. Invite flow (claim code → sign-in → link to company)
2. Registration form
3. Interviewer management
4. Time slot selection grid
5. Attorney selection per slot (with availability query)
6. Schedule review page

### Phase 4: Admin Assignments & Export
1. Master assignment grid view
2. Manual assignment editor
3. Company schedule PDF export
4. Admin CSV/Excel export

### Phase 5: Polish & Deploy
1. Error handling and edge cases
2. Loading states and optimistic UI
3. Empty states and onboarding guidance
4. Responsive design check
5. Production deployment with custom domain

---

## 14. Open Questions for Future Discussion
1. **Domain**: What URL should this live at? (e.g., counsel.txoji.com, connections.texasbar.com)
2. **Who are the initial admin users?** (Need their email addresses to seed admin_users)
3. **Should companies be able to modify selections after submitting?** (MVP: yes, until admin locks the event)
4. **Maximum interviews per company?** (Currently no limit — should there be?)
5. **Maximum interviews per attorney?** (2025 data shows up to 9 slots per attorney — any cap?)
6. **Should attorneys see their own schedule?** (Future feature — attorney portal)
