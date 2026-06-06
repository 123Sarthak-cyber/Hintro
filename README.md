# Hintro Meeting Intelligence Service

An AI-powered Meeting Intelligence Service designed to store meeting transcripts, extract grounded insights (summaries, decisions, action items), track action item statuses, detect overdue tasks, and trigger external Slack, Discord, or Email reminders.

Developed as a highly structured, scalable Full-stack solution for the Hintro Backend/Fullstack Engineering Internship.

---

## 🚀 Key Service Capabilities

1.  **Grounded Gemini AI Analysis**: Leverages `gemini-3.5-flash` to extract summaries, key decisions, and follow-ups. Every generated insight is strictly grounded in the transcript, accompanied by verified timestamp citations.
2.  **Strict Grounding Guard**: Filters out any hallucinated timestamps, ensuring 100% citation accuracy.
3.  **Action Item Tracking**: Auto-populates and tracks status transitions (`PENDING`, `IN_PROGRESS`, `COMPLETED`).
4.  **Scheduled Reminder Sweeps**: Background daemon threads identify overdue items (`status !== 'COMPLETED'` and `dueDate < current time`) and dispatch formatted third-party reminders.
5.  **Outbound Connections**: Supports active Webhook requests to real Slack and Discord channel integrations, with fully transparent log records.
6.  **Unified Traceability & Logging**: Injects UUID trace trackers (`X-Trace-Id`) across all endpoints and logs, complying with enterprise microservice standards.
7.  **Interactive Sandbox UI**: Full-fledged Swagger-style testing playground directly inside the web browser dashboard to test endpoints, authorization, and trace logs instantly!

---

## 🛠️ Tech Stack & Architecture

*   **Runtime Environment**: Node.js v18+ (ES modules)
*   **Web Framework**: Express (Express.js) for robust REST routing and middlewares
*   **Front-End Dashboard**: React 19, Tailwind CSS, Lucide icons, Framer Motion
*   **AI Engine**: `@google/genai` TypeScript SDK (model: `gemini-3.5-flash`)
*   **Authentication**: Stateless JWT (`jsonwebtoken`)
*   **Local Storage**: Portable file-based relational schema simulation in `/data/db.json`

---

## ⚙️ Environment Variables

Copy `.env.example` into a local `.env` and fill out the values:

```env
# Required for real AI-powered transcripts analysis
GEMINI_API_KEY="your_google_ai_studio_gemini_key"

# App listening URL 
APP_URL="http://localhost:3000"

# Optional JWT secret passphrase overrides
JWT_SECRET="hintro_meeting_intelligence_secret_key"
```

---

## 💻 Local Execution Steps

Ensure all dependencies are configured, then execute the following:

```bash
# 1. Install required packages
npm install

# 2. Boot development server (Express backend + Vite client multiplexed on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to inspect the interactive dashboard portal.

### Build and Start for Production:

```bash
# Compile client assets and bundle backend server using esbuild CJS adapter 
npm run build

# Start stand-alone bundled server
npm run start
```

---

## 🎯 Primary API Endpoints Reference

All API endpoints return the **Unified Response Format**:
*   **Success**: `{ "traceId": "abc123", "success": true, "data": { ... } }`
*   **Error**: `{ "traceId": "abc123", "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }`

### Public Service Indicators
*   `GET /health` — Check server status (returns `{"status":"UP"}`)
*   `GET /api/evaluation` — Returns information required for submission scoring

### Authentication Services
*   `POST /api/auth/register` — Create a new account (`{ email, password }`)
*   `POST /api/auth/login` — Login and retrieve JWT Bearer token

### Meetings Storage & Analysis
*   `POST /api/meetings` — Store standard meeting transcripts
*   `GET /api/meetings` — List paginated meeting logs
*   `GET /api/meetings/:id` — Retrieve an individual meeting
*   `POST /api/meetings/:id/analyze` — Trigger grounded Gemini insight extraction

### Action Items Workflow
*   `GET /api/action-items` — Retrieve action items with status or assignee filtering
*   `PATCH /api/action-items/:id/status` — Toggle status (`PENDING`, `IN_PROGRESS`, `COMPLETED`)
*   `GET /api/action-items/overdue` — Overdue items query
*   `POST /api/action-items/trigger-scheduler` — Execute immediate cron reminder sweeps

---

## 🔬 Interactive Endpoint Testing

1.  Launch the app and click onto the **Interactive API OpenAPI Playground** navigation tab.
2.  Use the **API Request Editor** to pick endpoints (like Evaluation, Login, or Analyze).
3.  Inject parameters or bodies, and hit **Send HTTP** to watch unified JSON responses, statuses, and logs update live!
