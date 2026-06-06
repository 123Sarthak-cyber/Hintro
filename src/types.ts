export interface TranscriptSegment {
  timestamp: string;
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
  meetingDate: string;
  transcript: TranscriptSegment[];
  createdAt: string;
  analysis?: AIAnalysisResult;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle: string;
  task: string;
  assignee: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string;
  citations: Citation[];
  createdAt: string;
}

export interface ReminderHistory {
  id: string;
  actionItemId: string;
  taskTitle: string;
  assignee: string;
  dueDate: string;
  integrationType: string;
  endpointUrlOrTarget: string;
  sentAt: string;
  status: "SUCCESS" | "FAILED";
  details?: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AppSettings {
  webhookUrl: string;
  webhookType: "Slack" | "Discord" | "Telegram" | "EmailSimulator";
  emailTarget: string;
}
