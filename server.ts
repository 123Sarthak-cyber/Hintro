import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { db, hashPassword } from "./src/server/db.js";
import { analyzeTranscript } from "./src/server/gemini.js";
import { sendThirdPartyReminder } from "./src/server/integrations.js";

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "hintro_meeting_intelligence_secret_key_2026";

// Create custom interface extensions to support traceId and user info
interface CustomRequest extends Request {
  traceId?: string;
  user?: { id: string; email: string };
}

const app = express();

app.use(express.json());

// Enable CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Trace-Id");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Middleware: Request Traceability and Structured Logging
app.use((req: CustomRequest, res: Response, next: NextFunction) => {
  // 1. Generate or extract trace ID
  const traceId = (req.headers["x-trace-id"] as string) || crypto.randomBytes(8).toString("hex");
  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);

  // Capture start time
  const startTime = Date.now();

  // Override standard response formats to ensure traceId is always included if sent via res.json
  const originalJson = res.json;
  res.json = function (body: any) {
    if (body && typeof body === "object" && !("traceId" in body)) {
      body.traceId = traceId;
    }
    return originalJson.call(this, body);
  };

  // Log on request finish
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      traceId: req.traceId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.headers["user-agent"],
    };
    console.log(`[ACCESS_LOG] ${JSON.stringify(logEntry)}`);
  });

  next();
});

// Helper functions for Unified API Response Format
function sendSuccess(res: Response, data: any, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

function sendError(res: Response, statusCode: number, code: string, message: string, details?: any) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

// Authentication Middleware
function authenticateToken(req: CustomRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return sendError(res, 401, "UNAUTHORIZED", "Missing authorization bearer token. Please register or login first.");
  }

  jwt.verify(token, JWT_SECRET, (err: any, decodedUser: any) => {
    if (err) {
      return sendError(res, 403, "FORBIDDEN", "Invalid or expired authorization token.");
    }
    req.user = decodedUser as { id: string; email: string };
    next();
  });
}

// Global/Centralized Error Handling Middleware
app.use((err: any, req: CustomRequest, res: Response, next: NextFunction) => {
  console.error(`[UNHANDLED_ERROR] Trace: ${req.traceId || "N/A"} - Error:`, err);
  const status = err.status || err.statusCode || 500;
  return sendError(
    res,
    status,
    "INTERNAL_SERVER_ERROR",
    err.message || "An unexpected error occurred inside the meeting intelligence service.",
    process.env.NODE_ENV !== "production" ? err.stack : undefined
  );
});

// ==========================================
// PUBLIC HEALTH & EVALUATION ENDPOINTS
// ==========================================

// GET /health - Simple service readiness indicator
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "UP" });
});

// GET /api/evaluation - Evaluator metadata schema
app.get("/api/evaluation", (req: CustomRequest, res: Response) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const scheme = req.headers["x-forwarded-proto"] || "http";
  const currentAppUrl = `${scheme}://${host}`;

  return res.json({
    candidateName: "Sarthak Mazumder",
    email: "sarthakmazumder0901@gmail.com",
    repositoryUrl: "https://github.com/sarthakmazumder0901/hintro-meeting-intelligence-service",
    deployedUrl: currentAppUrl,
    externalIntegration: "Slack and Discord Webhook & SMTP Email Notification Module",
    features: [
      "Authentication",
      "AI Analysis",
      "Reminder Scheduler"
    ]
  });
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST /api/auth/register
app.post("/api/auth/register", (req: CustomRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, "VALIDATION_ERROR", "Email and password are required.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return sendError(res, 400, "VALIDATION_ERROR", "Please provide a valid email address.");
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return sendError(res, 409, "DUPLICATE_ERROR", "A candidate or user with this email already exists.");
  }

  const passwordHash = hashPassword(password);
  const user = db.createUser(email, passwordHash);

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" });

  return sendSuccess(res, {
    user: { id: user.id, email: user.email },
    token,
  }, 201);
});

// POST /api/auth/login
app.post("/api/auth/login", (req: CustomRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, "VALIDATION_ERROR", "Email and password are required.");
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return sendError(res, 401, "AUTHENTICATION_FAILED", "Invalid email or password.");
  }

  const inputHash = hashPassword(password);
  if (user.passwordHash !== inputHash) {
    return sendError(res, 401, "AUTHENTICATION_FAILED", "Invalid email or password.");
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" });

  return sendSuccess(res, {
    user: { id: user.id, email: user.email },
    token,
  });
});

// ==========================================
// MEETING MANAGEMENT ENDPOINTS
// ==========================================

// POST /api/meetings - Store meeting information and transcripts
app.post("/api/meetings", authenticateToken, (req: CustomRequest, res: Response) => {
  const { title, participants, meetingDate, transcript } = req.body;

  // Validation
  if (!title || typeof title !== "string" || title.trim() === "") {
    return sendError(res, 400, "VALIDATION_ERROR", "Meeting title is required and must be a string.");
  }

  if (!participants || !Array.isArray(participants)) {
    return sendError(res, 400, "VALIDATION_ERROR", "Participants must be provided as an array.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const attendee of participants) {
    if (!emailRegex.test(attendee)) {
      return sendError(res, 400, "VALIDATION_ERROR", `Invalid participant email address found: ${attendee}`);
    }
  }

  if (!meetingDate || isNaN(Date.parse(meetingDate))) {
    return sendError(res, 400, "VALIDATION_ERROR", "Please provide a valid ISO format meetingDate.");
  }

  if (!transcript || !Array.isArray(transcript)) {
    return sendError(res, 400, "VALIDATION_ERROR", "Transcript must be provided as an array of segments.");
  }

  for (let i = 0; i < transcript.length; i++) {
    const seg = transcript[i];
    if (!seg.timestamp || !seg.speaker || !seg.text) {
      return sendError(res, 400, "VALIDATION_ERROR", `Transcript segment at index ${i} is missing timestamp, speaker or text parameters.`);
    }
  }

  const meeting = db.createMeeting({
    title,
    participants,
    meetingDate,
    transcript,
  });

  return sendSuccess(res, meeting, 201);
});

// GET /api/meetings - List meetings with Pagination support & search
app.get("/api/meetings", authenticateToken, (req: CustomRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string || "").toLowerCase();

  const allMeetings = db.getMeetings();
  
  // Filtering path
  const filtered = allMeetings.filter((m) => 
    m.title.toLowerCase().includes(search) || 
    m.participants.some(p => p.toLowerCase().includes(search))
  );

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginatedMeetings = filtered.slice(startIndex, startIndex + limit);

  return sendSuccess(res, {
    meetings: paginatedMeetings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// GET /api/meetings/:id - Retrieve an individual meeting details
app.get("/api/meetings/:id", authenticateToken, (req: CustomRequest, res: Response) => {
  const meeting = db.getMeetingById(req.params.id);
  if (!meeting) {
    return sendError(res, 404, "NOT_FOUND", `Meeting with ID ${req.params.id} could not be successfully located.`);
  }
  return sendSuccess(res, meeting);
});

// ==========================================
// AI CORE MEETING ANALYSIS ENDPOINT
// ==========================================

// POST /api/meetings/:id/analyze - Generates grounded citations & insights using Gemini API
app.post("/api/meetings/:id/analyze", authenticateToken, async (req: CustomRequest, res: Response) => {
  const meetingId = req.params.id;
  const meeting = db.getMeetingById(meetingId);

  if (!meeting) {
    return sendError(res, 404, "NOT_FOUND", `Unable to analyze. Meeting with ID ${meetingId} does not exist.`);
  }

  if (!meeting.transcript || meeting.transcript.length === 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "Cannot analyze a meeting with an empty transcript.");
  }

  try {
    console.log(`Starting server-side transcripts grounding analysis for meeting "${meeting.title}" (ID: ${meetingId})...`);
    
    // Call our grounded Gemini analyzer to process the speech segments
    const analysisResult = await analyzeTranscript(meeting.transcript);

    // Save generated analytical outcomes inside the meeting document
    meeting.analysis = analysisResult;
    db.updateMeeting(meeting);

    // Automatically convert newly analyzed action items into trackable records
    analysisResult.actionItems.forEach((aiItem) => {
      // Check if this action item already exists to prevent duplicate generation
      const existing = db.getActionItems().find(
        (existingItem) => 
          existingItem.meetingId === meetingId && 
          existingItem.task.toLowerCase() === aiItem.task.toLowerCase()
      );

      if (!existing) {
        db.createActionItem({
          meetingId,
          meetingTitle: meeting.title,
          task: aiItem.task,
          assignee: aiItem.assignee,
          status: "PENDING",
          // Assign default due date: 7 days from meeting date or today
          dueDate: new Date(new Date(meeting.meetingDate).getTime() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          citations: aiItem.citations,
        });
      }
    });

    return sendSuccess(res, analysisResult);
  } catch (err: any) {
    console.error(`AI analysis pipeline error for meeting ${meetingId}:`, err);
    return sendError(res, 500, "ANALYSIS_FAILED", `Gemini intelligence engine failed: ${err.message || err}`);
  }
});

// ==========================================
// ACTION ITEM MANAGEMENT ENDPOINTS
// ==========================================

// POST /api/action-items - Create action item manually
app.post("/api/action-items", authenticateToken, (req: CustomRequest, res: Response) => {
  const { meetingId, task, assignee, dueDate, citations } = req.body;

  if (!task || typeof task !== "string" || task.trim() === "") {
    return sendError(res, 400, "VALIDATION_ERROR", "Action task title is required.");
  }

  if (!assignee || typeof assignee !== "string" || assignee.trim() === "") {
    return sendError(res, 400, "VALIDATION_ERROR", "Action assignee is required.");
  }

  if (!dueDate || isNaN(Date.parse(dueDate))) {
    return sendError(res, 400, "VALIDATION_ERROR", "Please provide a valid action dueDate.");
  }

  let meetingTitle = "Standalone Task";
  if (meetingId) {
    const meeting = db.getMeetingById(meetingId);
    if (!meeting) {
      return sendError(res, 400, "VALIDATION_ERROR", `Meeting with ID ${meetingId} does not exist.`);
    }
    meetingTitle = meeting.title;
  }

  const actionItem = db.createActionItem({
    meetingId: meetingId || "standalone",
    meetingTitle,
    task,
    assignee,
    status: "PENDING",
    dueDate,
    citations: citations || [],
  });

  return sendSuccess(res, actionItem, 201);
});

// PATCH /api/action-items/:id/status - Update Status
app.patch("/api/action-items/:id/status", authenticateToken, (req: CustomRequest, res: Response) => {
  const { status } = req.body;
  const id = req.params.id;

  const validStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];
  if (!status || !validStatuses.includes(status)) {
    return sendError(res, 400, "VALIDATION_ERROR", "Status is required and must be one of: PENDING, IN_PROGRESS, COMPLETED.");
  }

  const updated = db.updateActionItemStatus(id, status);
  if (!updated) {
    return sendError(res, 404, "NOT_FOUND", `Action item with ID ${id} was not found.`);
  }

  return sendSuccess(res, updated);
});

// GET /api/action-items - Get Action Items with filtering
app.get("/api/action-items", authenticateToken, (req: CustomRequest, res: Response) => {
  const { status, assignee, meetingId } = req.query;
  let items = db.getActionItems();

  if (status) {
    items = items.filter((item) => item.status === (status as string).toUpperCase());
  }
  if (assignee) {
    items = items.filter((item) => item.assignee.toLowerCase() === (assignee as string).toLowerCase());
  }
  if (meetingId) {
    items = items.filter((item) => item.meetingId === (meetingId as string));
  }

  return sendSuccess(res, items);
});

// ==========================================
// OVERDUE DETECTION & SCHEDULER ENDPOINTS
// ==========================================

// GET /api/action-items/overdue - Get Overdue Action Items
app.get("/api/action-items/overdue", authenticateToken, (req: CustomRequest, res: Response) => {
  const now = new Date();
  const items = db.getActionItems();

  // "An action item is considered overdue when: status != COMPLETED AND dueDate < current time"
  const overdueItems = items.filter((item) => {
    const isCompleted = item.status === "COMPLETED";
    // Convert dueDate to start-of-day or handle full calendar parsing safely
    const dueDateObj = new Date(item.dueDate);
    // Be lenient: if absolute date limit passed
    return !isCompleted && dueDateObj < now;
  });

  return sendSuccess(res, overdueItems);
});

// POST /api/action-items/trigger-scheduler - Actively runs the scheduled overdue items notification job
app.post("/api/action-items/trigger-scheduler", authenticateToken, async (req: CustomRequest, res: Response) => {
  const now = new Date();
  const items = db.getActionItems();

  // Find overdue items
  const overdueItems = items.filter((item) => {
    return item.status !== "COMPLETED" && new Date(item.dueDate) < now;
  });

  console.log(`[SCHEDULER] Running background overdue check. Found ${overdueItems.length} overdue action items.`);

  const triggerHistory: any[] = [];

  for (const item of overdueItems) {
    // Fire real third-party alert integrations
    const result = await sendThirdPartyReminder(item);
    triggerHistory.push({
      actionItemId: item.id,
      task: item.task,
      assignee: item.assignee,
      result,
    });
  }

  return sendSuccess(res, {
    checkedAt: now.toISOString(),
    overdueCount: overdueItems.length,
    processedNotifications: triggerHistory,
  });
});

// GET /api/reminders - Inspect notification delivery history logs
app.get("/api/reminders", authenticateToken, (req: CustomRequest, res: Response) => {
  return sendSuccess(res, db.getReminders());
});

// ==========================================
// SETTINGS ENDPOINTS (WEBHOOK CONFIG)
// ==========================================

app.get("/api/settings", authenticateToken, (req: CustomRequest, res: Response) => {
  return sendSuccess(res, db.getSettings());
});

app.post("/api/settings", authenticateToken, (req: CustomRequest, res: Response) => {
  const { webhookUrl, webhookType, emailTarget } = req.body;

  const validTypes = ["Slack", "Discord", "Telegram", "EmailSimulator"];
  if (webhookType && !validTypes.includes(webhookType)) {
    return sendError(res, 400, "VALIDATION_ERROR", "Webhook type must be one of: Slack, Discord, Telegram, EmailSimulator");
  }

  const updated = db.updateSettings({
    webhookUrl: webhookUrl || "",
    webhookType: webhookType || "Slack",
    emailTarget: emailTarget || "reviewer@hintro.com",
  });

  return sendSuccess(res, updated);
});

// ==========================================
// FULL-STACK VITE MULTIPLEXING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // 1. Mount Vite dev server middleware so index.html/React assets compile on-the-fly!
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware successfully integrated in Development mode.");
  } else {
    // 2. Production mode: Static file server serving compiled dist output
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Express static server serving compiled static files from: ${distPath}`);
  }

  // 3. Start listening on Port 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Meeting Intelligence Service actively running on HTTP port: ${PORT}`);
  });

  // 4. Start active background scheduler thread (polls for overdue records every 10 minutes)
  setInterval(async () => {
    try {
      const now = new Date();
      const overdueItems = db.getActionItems().filter((item) => {
        return item.status !== "COMPLETED" && new Date(item.dueDate) < now;
      });

      if (overdueItems.length > 0) {
        console.log(`[CRON_SCHEDULER] Periodic sweep found ${overdueItems.length} overdue task items. Issuing alerts...`);
        for (const item of overdueItems) {
          await sendThirdPartyReminder(item);
        }
      }
    } catch (sweepErr) {
      console.error("[CRON_SCHEDULER] Error during periodic sweeping:", sweepErr);
    }
  }, 10 * 60 * 1000); // 10 Minutes sweep
}

// Global exception boundary
startServer().catch((bootstrapErr) => {
  console.error("FATAL: Failed to bootstrap Meeting Intelligence Server:", bootstrapErr);
  process.exit(1);
});
