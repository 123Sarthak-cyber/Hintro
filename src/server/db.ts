import fs from "fs";
import path from "path";
import crypto from "crypto";

// Ensure the data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "db.json");

export interface TranscriptSegment {
  timestamp: string; // e.g., "00:10"
  speaker: string;
  text: string;
}

export interface Citation {
  timestamp: string;
}

export interface AISummaryItem {
  text: string;
  citations: Citation[];
}

export interface AIActionItem {
  task: string;
  assignee: string;
  citations: Citation[];
}

export interface AIDecisionItem {
  text: string;
  citations: Citation[];
}

export interface AIFollowUpItem {
  text: string;
  citations: Citation[];
}

export interface AIAnalysisResult {
  summary: AISummaryItem[];
  actionItems: AIActionItem[];
  decisions: AIDecisionItem[];
  followUpSuggestions: AIFollowUpItem[];
}

export interface Meeting {
  id: string;
  title: string;
  participants: string[];
  meetingDate: string; // ISO string
  transcript: TranscriptSegment[];
  createdAt: string; // ISO string
  analysis?: AIAnalysisResult;
}

export interface ActionItemStatusUpdate {
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

export interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle: string;
  task: string;
  assignee: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string; // ISO string / Date string
  citations: Citation[];
  createdAt: string;
}

export interface ReminderHistory {
  id: string;
  actionItemId: string;
  taskTitle: string;
  assignee: string;
  dueDate: string;
  integrationType: string; // "Slack" | "Discord" | "Email" | "Console"
  endpointUrlOrTarget: string;
  sentAt: string;
  status: "SUCCESS" | "FAILED";
  details?: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  reminders: ReminderHistory[];
  settings: {
    webhookUrl: string;
    webhookType: "Slack" | "Discord" | "Telegram" | "EmailSimulator";
    emailTarget: string;
  };
}

// Simple SHA-256 password hashing helper (Native Node.js, no external deps needed)
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

class JSONDatabase {
  private schema: DatabaseSchema = {
    users: [],
    meetings: [],
    actionItems: [],
    reminders: [],
    settings: {
      webhookUrl: "",
      webhookType: "Slack",
      emailTarget: "reviewer@hintro.com",
    },
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        this.schema = JSON.parse(data);
      } else {
        this.seed();
      }
    } catch (err) {
      console.error("Failed to load JSON database, resetting to default schema:", err);
      this.seed();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save JSON database database file:", err);
    }
  }

  private seed() {
    console.log("Seeding Database...");
    const reviewerPasswordHash = hashPassword("password123");
    
    const defaultUser: User = {
      id: "u_reviewer",
      email: "reviewer@hintro.com",
      passwordHash: reviewerPasswordHash,
      createdAt: new Date().toISOString(),
    };

    // Pre-populate standard sample meeting
    const sampleMeetingId = "meet_001";
    const defaultMeeting: Meeting = {
      id: sampleMeetingId,
      title: "Sprint Planning - Hintro Launch",
      participants: ["alice@example.com", "bob@example.com", "sarthak@hintro.io"],
      meetingDate: "2026-05-20T10:00:00Z",
      transcript: [
        {
          timestamp: "00:10",
          speaker: "Sarthak",
          text: "We should launch our beta application next Friday so we can gather early reviews."
        },
        {
          timestamp: "00:20",
          speaker: "Alice",
          text: "I will prepare release notes and publish them on GitHub."
        },
        {
          timestamp: "00:45",
          speaker: "Bob",
          text: "Perfect. Sarthak, could you make sure that the server schema matches the evaluation format by Sunday?"
        },
        {
          timestamp: "01:15",
          speaker: "Sarthak",
          text: "Yes, I will finalize the unified API structure and deployment configurations."
        },
        {
          timestamp: "01:40",
          speaker: "Alice",
          text: "Let's align again on Monday morning to do a final pre-flight check."
        }
      ],
      createdAt: new Date().toISOString(),
      analysis: {
        summary: [
          {
            text: "The team is prepping a launch next Friday and discussed finalizing backend APIs and release notes prior to alignment on Monday.",
            citations: [{ timestamp: "00:10" }, { timestamp: "01:40" }]
          }
        ],
        actionItems: [
          {
            task: "Prepare release notes and publish on GitHub",
            assignee: "Alice",
            citations: [{ timestamp: "00:20" }]
          },
          {
            task: "Match the server schema with evaluation format by Sunday",
            assignee: "Sarthak",
            citations: [{ timestamp: "00:45" }]
          }
        ],
        decisions: [
          {
            text: "Launch application beta next Friday.",
            citations: [{ timestamp: "00:10" }]
          }
        ],
        followUpSuggestions: [
          {
            text: "Sync meeting on Monday morning for pre-flight checklist review.",
            citations: [{ timestamp: "01:40" }]
          }
        ]
      }
    };

    // Create action items corresponding to the seeded meeting
    const defaultActionItems: ActionItem[] = [
      {
        id: "act_001",
        meetingId: sampleMeetingId,
        meetingTitle: defaultMeeting.title,
        task: "Prepare release notes and publish on GitHub",
        assignee: "Alice",
        status: "PENDING",
        dueDate: "2026-05-25", // Overdue in June 2026!
        citations: [{ timestamp: "00:20" }],
        createdAt: new Date().toISOString()
      },
      {
        id: "act_002",
        meetingId: sampleMeetingId,
        meetingTitle: defaultMeeting.title,
        task: "Match the server schema with evaluation format by Sunday",
        assignee: "Sarthak",
        status: "COMPLETED",
        dueDate: "2026-05-22",
        citations: [{ timestamp: "00:45" }],
        createdAt: new Date().toISOString()
      }
    ];

    this.schema = {
      users: [defaultUser],
      meetings: [defaultMeeting],
      actionItems: defaultActionItems,
      reminders: [],
      settings: {
        webhookUrl: "", // Users can fill in UI
        webhookType: "Slack",
        emailTarget: "reviewer@hintro.com"
      }
    };
    
    this.save();
  }

  // --- Users Operations ---
  public getUsers(): User[] {
    return this.schema.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.schema.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(email: string, passwordHash: string): User {
    const newUser: User = {
      id: "u_" + Math.random().toString(36).substr(2, 9),
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString()
    };
    this.schema.users.push(newUser);
    this.save();
    return newUser;
  }

  // --- Meetings Operations ---
  public getMeetings(): Meeting[] {
    return this.schema.meetings;
  }

  public getMeetingById(id: string): Meeting | undefined {
    return this.schema.meetings.find((m) => m.id === id);
  }

  public createMeeting(meeting: Omit<Meeting, "id" | "createdAt">): Meeting {
    const newMeeting: Meeting = {
      ...meeting,
      id: "meet_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    this.schema.meetings.unshift(newMeeting); // Add to the start
    this.save();
    return newMeeting;
  }

  public updateMeeting(meeting: Meeting) {
    const idx = this.schema.meetings.findIndex((m) => m.id === meeting.id);
    if (idx !== -1) {
      this.schema.meetings[idx] = meeting;
      this.save();
    }
  }

  // --- Action Item Operations ---
  public getActionItems(): ActionItem[] {
    return this.schema.actionItems;
  }

  public getActionItemById(id: string): ActionItem | undefined {
    return this.schema.actionItems.find((item) => item.id === id);
  }

  public createActionItem(item: Omit<ActionItem, "id" | "createdAt">): ActionItem {
    const newItem: ActionItem = {
      ...item,
      id: "act_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    this.schema.actionItems.unshift(newItem);
    this.save();
    return newItem;
  }

  public updateActionItemStatus(id: string, status: "PENDING" | "IN_PROGRESS" | "COMPLETED"): ActionItem | undefined {
    const item = this.schema.actionItems.find((item) => item.id === id);
    if (item) {
      item.status = status;
      this.save();
      return item;
    }
    return undefined;
  }

  // --- Settings ---
  public getSettings() {
    return this.schema.settings;
  }

  public updateSettings(settings: DatabaseSchema["settings"]) {
    this.schema.settings = settings;
    this.save();
    return this.schema.settings;
  }

  // --- Reminder History Operations ---
  public getReminders(): ReminderHistory[] {
    return this.schema.reminders;
  }

  public addReminder(reminder: Omit<ReminderHistory, "id" | "sentAt">): ReminderHistory {
    const newReminder: ReminderHistory = {
      ...reminder,
      id: "rem_" + Math.random().toString(36).substr(2, 9),
      sentAt: new Date().toISOString()
    };
    this.schema.reminders.unshift(newReminder);
    this.save();
    return newReminder;
  }
}

export const db = new JSONDatabase();
