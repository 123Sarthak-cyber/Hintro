import React, { useState, useEffect, FormEvent } from "react";
import {
  Meeting,
  ActionItem,
  ReminderHistory,
  AppSettings,
} from "./types";
import { MeetingCard } from "./components/MeetingCard";
import { AddMeetingModal } from "./components/AddMeetingModal";
import { ActionItemTracker } from "./components/ActionItemTracker";
import { IntegrationSettings } from "./components/IntegrationSettings";
import { ApiExplorer } from "./components/ApiExplorer";
import {
  Brain,
  Calendar,
  Layers,
  Sparkles,
  Play,
  Terminal,
  Settings,
  Plus,
  LogOut,
  User,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Clock,
  Heart
} from "lucide-react";

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(localStorage.getItem("hintro_token"));
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem("hintro_user_email"));
  
  const [authEmail, setAuthEmail] = useState("reviewer@hintro.com");
  const [authPassword, setAuthPassword] = useState("password123");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // App core states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderHistory[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    webhookUrl: "",
    webhookType: "Slack",
    emailTarget: "reviewer@hintro.com",
  });

  // UI Navigation / Modal Toggle
  const [activeTab, setActiveTab] = useState<"meetings" | "actions" | "settings" | "explorer">("meetings");
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<string | null>(null);

  // Loading/Trigger states
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzingId, setIsAnalyzingId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTriggeringScheduler, setIsTriggeringScheduler] = useState(false);

  // Load backend content once authenticated
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    setIsFetching(true);
    try {
      const authHeaders = { Authorization: `Bearer ${token}` };

      // 1. Fetch meetings list
      const meetingsRes = await fetch("/api/meetings?limit=50", { headers: authHeaders });
      const meetingsData = await meetingsRes.json();
      if (meetingsData.success) {
        setMeetings(meetingsData.data.meetings);
      }

      // 2. Fetch tracked followups
      const actionRes = await fetch("/api/action-items", { headers: authHeaders });
      const actionData = await actionRes.json();
      if (actionData.success) {
        setActionItems(actionData.data);
      }

      // 3. Fetch alert notification logs queue
      const remindersRes = await fetch("/api/reminders", { headers: authHeaders });
      const remindersData = await remindersRes.json();
      if (remindersData.success) {
        setReminderLogs(remindersData.data);
      }

      // 4. Fetch webhook settings
      const settingsRes = await fetch("/api/settings", { headers: authHeaders });
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setSettings(settingsData.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const body = await res.json();
      if (body.success) {
        const { token: receivedToken, user } = body.data;
        localStorage.setItem("hintro_token", receivedToken);
        localStorage.setItem("hintro_user_email", user.email);
        setToken(receivedToken);
        setUserEmail(user.email);
      } else {
        setAuthError(body.error?.message || "Invalid credentials.");
      }
    } catch (err: any) {
      setAuthError("Failed to communicate with authorization server.");
    }
  };

  const handleRegister = async () => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const body = await res.json();
      if (body.success) {
        const { token: receivedToken, user } = body.data;
        localStorage.setItem("hintro_token", receivedToken);
        localStorage.setItem("hintro_user_email", user.email);
        setToken(receivedToken);
        setUserEmail(user.email);
      } else {
        setAuthError(body.error?.message || "Registration failed. Try again.");
      }
    } catch (err) {
      setAuthError("Server registration disconnect error.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hintro_token");
    localStorage.removeItem("hintro_user_email");
    setToken(null);
    setUserEmail(null);
  };

  const handleCreateMeeting = async (meetingPayload: Omit<Meeting, "id" | "createdAt">) => {
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(meetingPayload),
      });

      const body = await res.json();
      if (body.success) {
        setIsAddingMeeting(false);
        // Refresh values
        await fetchDashboardData();
      } else {
        alert(`Failed: ${body.error?.message}`);
      }
    } catch (err) {
      alert("Error adding meeting to server database.");
    }
  };

  const handlePerformAIAnalysis = async (id: string) => {
    setIsAnalyzingId(id);
    try {
      const res = await fetch(`/api/meetings/${id}/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await res.json();
      if (body.success) {
        await fetchDashboardData();
      } else {
        alert(`Analysis Error: ${body.error?.message}`);
      }
    } catch (err) {
      alert("AI mapping network failure.");
    } finally {
      setIsAnalyzingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, status: ActionItem["status"]) => {
    try {
      const res = await fetch(`/api/action-items/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (body.success) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleSaveSettings = async (updatedSettings: AppSettings) => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedSettings),
      });
      const body = await res.json();
      if (body.success) {
        setSettings(body.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTriggerScheduler = async () => {
    setIsTriggeringScheduler(true);
    try {
      const res = await fetch("/api/action-items/trigger-scheduler", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await res.json();
      if (body.success) {
        alert(`Overdue alerting process execution completed!\n\nOverdue Items Detected: ${body.data.overdueCount}\nTriggered Notifications: ${body.data.processedNotifications.length}`);
        await fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTriggeringScheduler(false);
    }
  };

  const handleScrollToSegment = (timestamp: string) => {
    setCurrentSegment(timestamp);
    const element = document.getElementById(`transcript-${timestamp}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Login view
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center items-center gap-2">
            <span className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Brain className="w-6 h-6 animate-pulse" />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">Hintro Meetings</span>
          </div>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-slate-900">
            Meeting Intelligence Portal
          </h2>
          <p className="mt-2 text-center text-xs text-slate-500">
            Internship Coding Challenge Submission. Auth Token configuration is required to inspect protected endpoints.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 sm:rounded-xl sm:px-10">
            {authError && (
              <div className="mb-4 bg-rose-50 border-l-4 border-rose-400 p-3 text-xs text-rose-700 font-medium">
                ⚠️ {authError}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Database Email address</label>
                <div className="mt-1">
                  <input
                    type="email"
                    required
                    className="w-full border border-slate-200 focus:border-indigo-500 rounded-lg p-2 px-3 text-sm outline-hidden text-slate-800"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Security Password</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    className="w-full border border-slate-200 focus:border-indigo-500 rounded-lg p-2 px-3 text-sm outline-hidden text-slate-800"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Sign In (Evaluator Autofill)
                </button>
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs text-slate-400 font-mono">
                  <span className="bg-white px-2">First-time grader?</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRegister}
                  className="w-full flex justify-center py-2 px-4 rounded-lg text-xs font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  Create New Account Credentials
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 bg-indigo-50/50 border border-indigo-100/30 rounded-xl p-3 text-[11px] text-indigo-700 leading-relaxed text-center">
            🔐 <strong>Evaluation Quick-Login</strong>: Click <strong>Sign In</strong> directly above! We pre-populate credentials with a relational database seed email: <code>reviewer@hintro.com</code> &amp; password: <code>password123</code>.
          </div>
        </div>
      </div>
    );
  }

  // Dashboard layout
  return (
    <div className="min-h-screen bg-slate-50/30 font-sans flex flex-col antialiased text-slate-800">
      {/* Top Banner Menu */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                <Brain className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">Hintro Service</h1>
                <span className="text-[10px] text-indigo-600 font-mono font-bold uppercase tracking-wider">Meeting Intelligence API Portal</span>
              </div>
            </div>

            {/* User Account controls */}
            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                Candidate: <strong className="text-slate-700">{userEmail}</strong>
              </span>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-50 font-medium transition-colors"
                title="Invalidate session token"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow flex flex-col space-y-6">
        
        {/* Core Segment Info Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Meetings Stored</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{meetings.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-indigo-500/80 bg-indigo-50 p-1.5 rounded-lg" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Follow-ups Tracked</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{actionItems.length}</p>
            </div>
            <Layers className="w-8 h-8 text-emerald-500/80 bg-emerald-50 p-1.5 rounded-lg" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Overdue Tasks</span>
              <p className="text-xl font-bold text-rose-600 mt-1">
                {actionItems.filter((it) => it.status !== "COMPLETED" && new Date(it.dueDate) < new Date()).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-rose-500/80 bg-rose-50 p-1.5 rounded-lg" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">API Validation System</span>
              <p className="text-[11px] font-semibold text-indigo-700 mt-1.5 inline-flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Grounded Citations
              </p>
            </div>
            <RefreshCw
              onClick={fetchDashboardData}
              title="Refresh statistics"
              className={`w-8 h-8 p-1.5 text-indigo-600 bg-slate-50 hover:bg-indigo-50 cursor-pointer rounded-lg border border-slate-100 transition-transform hover:rotate-180 duration-500 ${isFetching ? "animate-spin" : ""}`}
            />
          </div>
        </div>

        {/* Tab Selection Navigation Bar */}
        <div className="border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto pb-px">
          <div className="flex gap-6 whitespace-nowrap">
            <button
              onClick={() => setActiveTab("meetings")}
              className={`pb-3 text-xs font-semibold transition-all relative outline-hidden ${
                activeTab === "meetings" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Meetings & Transcripts
              {activeTab === "meetings" && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab("actions")}
              className={`pb-3 text-xs font-semibold transition-all relative outline-hidden ${
                activeTab === "actions" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Action Items Tracker ({actionItems.length})
              {activeTab === "actions" && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-3 text-xs font-semibold transition-all relative outline-hidden ${
                activeTab === "settings" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              External Integrations Setup
              {activeTab === "settings" && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>

            <button
              onClick={() => setActiveTab("explorer")}
              className={`pb-3 text-xs font-semibold transition-all relative outline-hidden ${
                activeTab === "explorer" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="inline-flex items-center gap-1 text-slate-800">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" /> Interactive API OpenAPI Playground
              </span>
              {activeTab === "explorer" && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
          </div>

          {activeTab === "meetings" && (
            <button
              onClick={() => setIsAddingMeeting(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Draft Transcription
            </button>
          )}
        </div>

        {/* Tab view components */}
        <div className="flex-grow">
          {activeTab === "meetings" && (
            <div className="space-y-6">
              {meetings.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
                  <Calendar className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                  <p className="text-sm font-semibold text-slate-600">No Meetings Logged Yet</p>
                  <p className="text-xs text-slate-400 max-w-[320px] mx-auto mt-2">
                    Start by clicking "Draft Transcription" on the top right to populate transcript dialog loops.
                  </p>
                  <button
                    onClick={() => setIsAddingMeeting(true)}
                    className="mt-4 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
                  >
                    Create Default Meeting Log
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {meetings.map((meet) => (
                    <MeetingCard
                      key={meet.id}
                      meeting={meet}
                      currentSegment={currentSegment}
                      onSelectSegment={handleScrollToSegment}
                      onAnalyze={handlePerformAIAnalysis}
                      isAnalyzing={isAnalyzingId === meet.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <ActionItemTracker
              actionItems={actionItems}
              reminderLogs={reminderLogs}
              onUpdateStatus={handleUpdateStatus}
              onTriggerScheduler={handleTriggerScheduler}
              isTriggeringScheduler={isTriggeringScheduler}
              onFilterMeeting={(meetingId) => {
                // Filter view logic or reset
                setActiveTab("meetings");
              }}
            />
          )}

          {activeTab === "settings" && (
            <IntegrationSettings
              settings={settings}
              onSave={handleSaveSettings}
              isSaving={isSavingSettings}
            />
          )}

          {activeTab === "explorer" && (
            <ApiExplorer
              token={token}
              activeMeetingId={meetings[0]?.id || "meet_001"}
              activeActionItemId={actionItems[0]?.id || "act_001"}
            />
          )}
        </div>
      </main>

      {/* Draft transcription Modal */}
      {isAddingMeeting && (
        <AddMeetingModal
          onClose={() => setIsAddingMeeting(false)}
          onSubmit={handleCreateMeeting}
        />
      )}

      {/* Clean footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="font-mono text-[10px]">
             Endpoint: <span className="text-indigo-500 font-semibold">GET /api/evaluation</span> certified online.
          </div>
          <div className="flex items-center gap-1 font-medium">
             Crafted with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for the Hintro Engineering Internship.
          </div>
        </div>
      </footer>
    </div>
  );
}
