# OnboardFlow AI

Project Overview
Build a production-quality React + TypeScript + Vite frontend called OnboardFlow AI for Acme Corp's AI-powered HR onboarding system.

The backend is a REST API running at http://localhost:4000. There are two distinct user views:

Employee Portal — Submit an onboarding request in plain English and watch the AI agent process it in real time.
Manager Dashboard — View all requests awaiting approval, approve or reject them with a reason, see a live Agent Activity Log, and manually trigger the SLA escalation sweep.
The app should feel like a premium internal enterprise tool — dark mode, glassmorphism cards, smooth transitions, polished typography. Think Notion meets Linear meets an AI-native product.

Tech Stack
Framework: Vite + React 18 + TypeScript
Styling: Tailwind CSS (dark mode, class strategy)
State: React Query (@tanstack/react-query) for all API calls with polling
Routing: React Router v6 — two top-level routes: /employee and /manager
Icons: Lucide React
Fonts: Inter (from Google Fonts)
HTTP: Native fetch (no axios)
Notifications: react-hot-toast
Design System
Colors

Background:  #0a0a0f (near-black)
Surface:     #13131a (card backgrounds)
Border:      #1e1e2e
Accent:      #7c3aed (violet-600 — primary brand)
Accent glow: rgba(124, 58, 237, 0.15)
Text primary:#f1f0ff
Text muted:  #6b6b8a
Status colors:
  draft            → #64748b (slate)
  pending_info     → #f59e0b (amber)
  pending_approval → #a855f7 (purple)
  approved         → #22c55e (green)
  escalated        → #ef4444 (red)
  done             → #3b82f6 (blue)
Typography
Font: Inter, imported from Google Fonts
Headings: font-semibold tracking-tight
Body: text-sm text-[#6b6b8a]
All cards: rounded-xl border border-[#1e1e2e] bg-[#13131a]
Component patterns
Glassmorphism header: backdrop-blur-md bg-black/40 border-b border-[#1e1e2e]
Status badge: pill with colored dot + label, uses the status color map above
Animated loading skeleton: pulse animation, same card shape as loaded state
Smooth page transitions using CSS fade-in keyframe (opacity 0→1, translateY 8px→0, 300ms)
Routing & Navigation

/                  → redirect to /employee
/employee          → Employee Portal
/manager           → Manager Dashboard
Top Navigation Bar (shared)
Left: "⬡ OnboardFlow AI" logo text in violet
Right: Two nav links — "Employee Portal" and "Manager Dashboard" — with active underline indicator
Height: 56px, sticky, glassmorphism
Page 1 — Employee Portal (/employee)
Layout
Two-column layout on desktop (≥ 768px), stacked on mobile:

Left column (40%): Submit request form
Right column (60%): Live status tracker (appears after submission)
Left Column — "Submit Your Request"
Card with:

Heading: "Submit an Onboarding Request"
Subtext: "Describe what you need in plain English. Our AI agent will handle the rest."
Form fields:

Your Name — text input, placeholder: "e.g. Sarah Chen"
Describe your request — textarea (5 rows), placeholder: "e.g. I'm joining the engineering team on October 1st and need my laptop, email setup, and access to GitHub and Jira. Also want to know about the 30/60/90 plan."
Submit button:

Label: "Send to AI Agent →"
Violet gradient background, full width, rounded-lg
Shows spinner + "Processing…" while the POST is in-flight
Disabled while a request is already being tracked
Example prompts (3 clickable chips below the textarea that autofill it):

"I need my laptop and email set up before my start date next Monday."
"Can you walk me through the Day 1 onboarding schedule?"
"I haven't received my NDA or emergency contact form yet."
Right Column — Live Status Tracker
Initial state (no request yet):

Illustrated empty state: a soft violet glow circle, icon of a robot/sparkle, text: "Submit a request to see your AI agent in action."
After submission — Request Status Card: Shows:

Request ID (truncated, monospace, copy-to-clipboard button)
Employee name
Status badge (animated pulse if draft, pending_info, or pending_approval)
Type & Department (shown once extracted by agent, otherwise "—")
Created timestamp (relative: "2 minutes ago")
Agent Progress Timeline (below the card): Vertical stepper showing all statuses in order:


● Received          (always completed after submit)
● AI Processing     (active when: draft or pending_info)
● Awaiting Approval (active when: pending_approval)
● Completed         (active when: approved / escalated / done)
Each step has an icon, label, and brief description.

Latest Agent Reasoning box:

Dark code-like box with monospace font
Shows latestLog.reasoning from GET /api/requests/:id
Label: "🤖 Agent says:"
Scrollable, max-height 120px
Refresh animation (subtle fade) when text changes
Approved state: When status = approved or done, show a full-width green banner: "✅ Your request has been approved! The HR team will follow up shortly."

Escalated state: When status = escalated, show a red banner: "⚠️ This request has been escalated due to SLA breach. HR has been notified."

Polling: Poll GET /api/requests/:id every 3 seconds using React Query's refetchInterval. Stop polling when status is approved, escalated, or done.

Page 2 — Manager Dashboard (/manager)
Layout
Full-width, three sections stacked vertically:

Header stats bar
Pending Approvals queue
Agent Activity Log
Section 1 — Stats Bar (top of page)
Four stat cards in a row:

Stat	Source
Pending Approvals	Count of cards in the queue
Total Requests	Count of all requests in the log
Escalations Today	Count of escalated entries in logs
Last Sweep	Relative timestamp from last sweep log
Each card: dark surface, large number, muted label, subtle violet left-border accent.

Section 2 — Pending Approvals Queue
Heading: "Pending Approvals" + refresh icon button (triggers manual refetch).

Data source: Poll GET /api/logs?requestId= (all logs) every 5 seconds to find all pending_approval status items. Actually, for this section, the manager view should maintain its own list of known requestIds — fetched from logs (filter nodeName = 'routeForApproval' entries where result.status = 'pending_approval'). Extract unique requestId values and then fetch each via GET /api/requests/:id.

Simpler alternative the app should use: Fetch GET /api/logs (no requestId filter) every 5s. From the logs, extract all unique requestId values. For each, fetch GET /api/requests/:id. Display only those with status = 'pending_approval'.

Each Approval Card shows:

Employee name (large, semibold)
Request ID (small, muted, monospace)
Type + Department badges
Status badge: "⏳ Pending Approval" in purple
Assigned approver role (from latestApproval.approverRole)
Time waiting: relative timestamp of updatedAt
details object rendered as key-value pairs (e.g. "start_date: Oct 1")
Latest agent reasoning (collapsible, "Show AI reasoning" toggle, shows latestLog.reasoning)
Action buttons (two per card):

✅ Approve — green outline button → opens Approve modal
❌ Reject — red outline button → opens Reject modal
Empty state: "No requests pending approval. All clear! 🎉" with a green checkmark illustration.

Approve Modal
Triggered by clicking "Approve" on a card.

Fields:

Read-only: Employee name, Request type
Your Role — text input, pre-filled with latestApproval.approverRole, editable
Submit button: "Confirm Approval" (green)
On submit: POST /api/requests/:id/approve with body { approverRole }. Show success toast: "✅ Request approved! Agent will continue processing." Close modal, remove card from queue after 1s.

Reject Modal
Fields:

Read-only: Employee name, Request type
Your Role — text input, pre-filled with latestApproval.approverRole, editable
Reason for rejection — textarea, required, placeholder: "e.g. Missing NDA form — please resubmit with documentation."
Submit button: "Confirm Rejection" (red)
On submit: POST /api/requests/:id/reject with body { approverRole, reason }. Show toast: "Request rejected. Agent will re-process." Close modal, remove card from queue.

Section 3 — Agent Activity Log
Heading: "Agent Activity Log" + badge showing total log count.

Sub-tabs:

All Logs
By Request (shows a dropdown to pick a requestId from known requests)
Data source: GET /api/logs (no filter for "All") — poll every 5 seconds.

Each log row (newest first):


[timestamp]  [nodeName badge]  reasoning text
             toolCalled (if present, shown as a purple chip: "🔧 tool-name")
             result (collapsible JSON viewer, "Show details" toggle)
nodeName badge colors:

checkMissingInfo → amber
createDraft → blue
routeForApproval → purple
close → green
escalate / escalateRequest → red
anything else → slate
Log row: border-b divider, hover highlight, smooth fade-in on new entries.

Virtualize or paginate if > 50 rows (show "Load more" button).

Run Sweep Button
Sticky floating button in the bottom-right corner of the Manager Dashboard only:

Icon: ⚡ + label "Run SLA Sweep"
Violet background, shadow-lg, rounded-full pill shape
On click: POST /api/agent/run
Shows spinner while running
On success: toast "Sweep complete. X requests escalated." (use result.escalated)
On error: toast "Sweep failed. Check server logs."
API Reference
Base URL: http://localhost:4000

POST /api/requests
json

Request body:
{ "employeeName": "string", "message": "string" }
Response 201:
{ "requestId": "uuid" }
GET /api/requests/:id
json

Response 200:
{
  "id": "uuid",
  "employeeName": "string",
  "type": "string",           // e.g. "equipment_request", "general"
  "status": "draft" | "pending_info" | "pending_approval" | "approved" | "escalated" | "done",
  "department": "string",
  "details": {},              // JSON object with request specifics
  "createdAt": "ISO string",
  "updatedAt": "ISO string",
  "latestApproval": {
    "id": "uuid",
    "approverRole": "string",
    "decision": "pending" | "approved" | "rejected",
    "decidedAt": "ISO string | null",
    "reason": "string | null"
  } | null,
  "latestLog": {
    "id": "uuid",
    "nodeName": "string",
    "toolCalled": "string | null",
    "reasoning": "string",
    "result": {},
    "timestamp": "ISO string"
  } | null
}
POST /api/requests/:id/approve
json

Request body: { "approverRole": "string" }
Response 200: { "message": "string", "requestId": "uuid" }
POST /api/requests/:id/reject
json

Request body: { "approverRole": "string", "reason": "string" }
Response 200: { "message": "string", "requestId": "uuid" }
GET /api/logs?requestId=:id (requestId optional)
json

Response 200:
{
  "logs": [
    {
      "id": "uuid",
      "requestId": "uuid | null",
      "nodeName": "string",
      "toolCalled": "string | null",
      "reasoning": "string",
      "result": {},
      "timestamp": "ISO string"
    }
  ]
}
GET /api/approvals?requestId=:id
json

Response 200:
{
  "requestId": "uuid",
  "approvals": [
    {
      "id": "uuid",
      "approverRole": "string",
      "decision": "pending" | "approved" | "rejected",
      "decidedAt": "ISO string | null",
      "reason": "string | null"
    }
  ]
}
POST /api/agent/run
json

Response 200:
{ "message": "Sweep completed.", "escalated": number, "checked": number }
Request Status Lifecycle

draft → pending_info → pending_approval → approved → done
                                        ↘ rejected → (back to pending_info)
                                        ↘ escalated (SLA breach via sweep)
Error Handling
All API errors: show react-hot-toast error toast with the error field from response body
Network errors: "Connection error — is the backend running?"
Loading states: use skeleton placeholders (not spinners) for card-level loading
404 on request poll: show "Request not found" error state with a retry button
Responsive Behavior
Desktop (≥ 1024px): Two-column employee view, full manager dashboard
Tablet (768–1023px): Stacked employee view, manager cards 2-per-row
Mobile (< 768px): Single column, manager cards full width, log rows condensed
Accessibility
All buttons have aria-label
Modals trap focus and close on Escape key
Status badges have role="status" and descriptive aria-label
Color is never the only indicator (also use icons + text)
File Structure

src/
  api/
    client.ts          # base fetch wrapper with error handling
    requests.ts        # all /api/requests/* calls
    logs.ts            # all /api/logs calls
    approvals.ts       # all /api/approvals calls
    agent.ts           # POST /api/agent/run
  components/
    layout/
      Navbar.tsx
    ui/
      StatusBadge.tsx
      LogRow.tsx
      Skeleton.tsx
      Modal.tsx
      JsonViewer.tsx
    employee/
      RequestForm.tsx
      StatusTracker.tsx
      AgentTimeline.tsx
    manager/
      ApprovalCard.tsx
      ApproveModal.tsx
      RejectModal.tsx
      ActivityLog.tsx
      StatsBar.tsx
      RunSweepFab.tsx
  pages/
    EmployeePage.tsx
    ManagerPage.tsx
  hooks/
    useRequestPolling.ts
    useManagerData.ts
  App.tsx
  main.tsx
  index.css
Additional Notes
Store the active requestId in localStorage so it persists across page refreshes on the Employee portal (key: onboardflow_request_id). Show a "Clear / start over" link when a stored ID exists.
The app company name is Acme Corp — use this in any placeholder text or branding copy.
Approver role examples to use as placeholders: "HR Coordinator", "HR Business Partner", "IT Manager", "Hiring Manager"
When details is an empty {}, don't render the details section at all.
All timestamps: use a relative format like "3 minutes ago" (implement a simple timeAgo(date) util).
The log's result field is a JSON object — render it in a collapsible 

 block with syntax-highlighted JSON (use a simple recursive renderer or just JSON.stringify(result, null, 2) in a styled 

 tag).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/881f9220-bcef-4561-a3fe-2a8ff5db21ae).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
