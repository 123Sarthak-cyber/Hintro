import React, { useState } from "react";
import { Terminal, Copy, Check, Play, ShieldAlert, KeyRound } from "lucide-react";

interface ApiExplorerProps {
  token: string | null;
  activeMeetingId: string;
  activeActionItemId: string;
}

interface EndpointRoute {
  method: "GET" | "POST" | "PATCH";
  path: string;
  description: string;
  requiresAuth: boolean;
  defaultHeaders: Record<string, string>;
  defaultBody?: string;
  category: "Auth" | "Meetings" | "AI & Action Items" | "Health & Eval";
}

export const ApiExplorer: React.FC<ApiExplorerProps> = ({ token, activeMeetingId, activeActionItemId }) => {
  const routes: EndpointRoute[] = [
    {
      category: "Health & Eval",
      method: "GET",
      path: "/health",
      description: "Simple server readiness verification indicator.",
      requiresAuth: false,
      defaultHeaders: { "Content-Type": "application/json" },
    },
    {
      category: "Health & Eval",
      method: "GET",
      path: "/api/evaluation",
      description: "Evaluator metadata configuration containing candidate email, name, repository and deployed status links.",
      requiresAuth: false,
      defaultHeaders: { "Content-Type": "application/json" },
    },
    {
      category: "Auth",
      method: "POST",
      path: "/api/auth/register",
      description: "Register a new secure account on the platform with automated login.",
      requiresAuth: false,
      defaultHeaders: { "Content-Type": "application/json" },
      defaultBody: JSON.stringify({ email: "new_candidate@hintro.io", password: "password123" }, null, 2),
    },
    {
      category: "Auth",
      method: "POST",
      path: "/api/auth/login",
      description: "Authenticate email/password credentials and retrieve a JWT authorization token.",
      requiresAuth: false,
      defaultHeaders: { "Content-Type": "application/json" },
      defaultBody: JSON.stringify({ email: "reviewer@hintro.com", password: "password123" }, null, 2),
    },
    {
      category: "Meetings",
      method: "POST",
      path: "/api/meetings",
      description: "Submit a new meeting transcription log document to the database.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
      defaultBody: JSON.stringify(
        {
          title: "Sprint Retrospective & Roadmap",
          participants: ["alice@example.com", "bob@example.com"],
          meetingDate: new Date().toISOString(),
          transcript: [
            { timestamp: "00:10", speaker: "Alice", text: "We should focus on refactoring server.ts next week to support Drizzle DB." },
            { timestamp: "00:25", speaker: "Bob", text: "That is a great plan. I will draft the database schema mapping by Wednesday." },
          ],
        },
        null,
        2
      ),
    },
    {
      category: "Meetings",
      method: "GET",
      path: "/api/meetings?page=1&limit=5",
      description: "List meeting transcripts with support for dynamic cursor Pagination.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
    },
    {
      category: "Meetings",
      method: "GET",
      path: `/api/meetings/${activeMeetingId || "meet_001"}`,
      description: "Retrieve complete structural details of an individual meeting record.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
    },
    {
      category: "AI & Action Items",
      method: "POST",
      path: `/api/meetings/${activeMeetingId || "meet_001"}/analyze`,
      description: "Trigger the Gemini AI engine pipeline to summarize the transcript, log decisions and output citations.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
    },
    {
      category: "AI & Action Items",
      method: "POST",
      path: "/api/action-items",
      description: "Directly submit a trackable action item manually.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
      defaultBody: JSON.stringify(
        {
          meetingId: activeMeetingId || "standalone",
          task: "Write unit test coverage for scheduled cron alerts",
          assignee: "Alice",
          dueDate: "2026-06-15",
          citations: [{ timestamp: "00:10" }],
        },
        null,
        2
      ),
    },
    {
      category: "AI & Action Items",
      method: "GET",
      path: "/api/action-items",
      description: "Retrieve trackable action items with options to filter by assignee, meetingId or status.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
    },
    {
      category: "AI & Action Items",
      method: "PATCH",
      path: `/api/action-items/${activeActionItemId || "act_001"}/status`,
      description: "Transition an action item's status between: PENDING, IN_PROGRESS, COMPLETED.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
      defaultBody: JSON.stringify({ status: "IN_PROGRESS" }, null, 2),
    },
    {
      category: "AI & Action Items",
      method: "GET",
      path: "/api/action-items/overdue",
      description: "Queries all action items where status is uncompleted and deadline is in the past.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
    },
    {
      category: "AI & Action Items",
      method: "POST",
      path: "/api/action-items/trigger-scheduler",
      description: "Forces immediate sweep execution of the background scheduler alerting process.",
      requiresAuth: true,
      defaultHeaders: { "Content-Type": "application/json" },
    },
  ];

  const [selectedRouteIdx, setSelectedRouteIdx] = useState(1); // Evaluation endpoint first
  const currentRoute = routes[selectedRouteIdx];

  const [customBody, setCustomBody] = useState(currentRoute.defaultBody || "");
  const [customPath, setCustomPath] = useState(currentRoute.path);
  const [customHeaders, setCustomHeaders] = useState<string>(
    JSON.stringify(currentRoute.defaultHeaders, null, 2)
  );

  const [isRunning, setIsRunning] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responsePayload, setResponsePayload] = useState<string>("// Send request to display payload output");
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [traceIdCopied, setTraceIdCopied] = useState(false);

  // Sync state when endpoint selection changes
  const handleSelectRouteIdx = (idx: number) => {
    setSelectedRouteIdx(idx);
    const route = routes[idx];
    setCustomPath(
      route.path
        .replace("meet_001", activeMeetingId || "meet_001")
        .replace("act_001", activeActionItemId || "act_001")
    );
    setCustomBody(route.defaultBody || "");
    setCustomHeaders(
      JSON.stringify(
        {
          ...route.defaultHeaders,
          ...(route.requiresAuth && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        null,
        2
      )
    );
  };

  const handleExecute = async () => {
    setIsRunning(true);
    setResponseStatus(null);
    setResponsePayload("Executing request against backend server...");

    try {
      const headersParsed = JSON.parse(customHeaders);
      
      const options: RequestInit = {
        method: currentRoute.method,
        headers: headersParsed,
      };

      if (currentRoute.method !== "GET" && customBody) {
        options.body = customBody;
      }

      const res = await fetch(customPath, options);

      setResponseStatus(res.status);

      // Extract headers
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
         resHeaders[key] = val;
      });
      setResponseHeaders(resHeaders);

      const dataText = await res.text();
      try {
        const parsedJson = JSON.parse(dataText);
        setResponsePayload(JSON.stringify(parsedJson, null, 2));
      } catch {
        setResponsePayload(dataText);
      }
    } catch (err: any) {
      setResponsePayload(`CONNECTION ERROR: Make sure port 3000 is active. Details: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Route Select Drawer */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 lg:col-span-1">
        <h4 className="font-semibold text-slate-800 text-sm mb-1 px-1 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-indigo-600" />
          Interactive API Console
        </h4>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {["Health & Eval", "Auth", "Meetings", "AI & Action Items"].map((cat) => {
            const catRoutes = routes.map((r, i) => ({ ...r, index: i })).filter((r) => r.category === cat);
            return (
              <div key={cat} className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">
                  {cat}
                </span>
                <div className="space-y-1">
                  {catRoutes.map((r) => {
                    const isSelected = selectedRouteIdx === r.index;
                    return (
                      <button
                        key={r.index}
                        onClick={() => handleSelectRouteIdx(r.index)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all relative ${
                          isSelected
                            ? "bg-indigo-600 text-white font-semibold"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">{r.method} {r.path.split("?")[0]}</span>
                          {r.requiresAuth && (
                            <span className={`text-[9px] px-1 rounded-sm ${isSelected ? "bg-indigo-500 text-indigo-100" : "bg-slate-200 text-slate-600"}`}>
                              AUTH
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                          {r.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sandbox Controller Console */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800 font-mono text-xs">
        {/* Editor Split */}
        <div className="p-4 flex flex-col space-y-3 max-h-[580px] overflow-y-auto text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-indigo-400 font-bold">REQUEST EDITOR</span>
            <button
              onClick={handleExecute}
              disabled={isRunning}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md flex items-center gap-1 font-sans font-semibold disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {isRunning ? "Sending..." : "Send HTTP"}
            </button>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">METHOD & ENDPOINT PATH</span>
            <div className="flex gap-2.5 mt-1">
              <span className="bg-indigo-950 font-bold text-indigo-400 px-2 py-1 rounded-sm">
                {currentRoute.method}
              </span>
              <input
                type="text"
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded-sm py-1 px-2.5 flex-grow font-mono text-xs focus:outline-hidden"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center justify-between">
              HTTP Headers
              {currentRoute.requiresAuth && !token && (
                <span className="text-amber-400 lowercase font-medium flex items-center gap-0.5 font-sans">
                  <ShieldAlert className="w-3 h-3 text-amber-400" /> Bearer token missing, please sign in first
                </span>
              )}
            </span>
            <textarea
              rows={4}
              className="w-full bg-slate-950 text-emerald-400 border border-slate-800 rounded-sm p-2 mt-1 focus:outline-hidden text-[10px]"
              value={customHeaders}
              onChange={(e) => setCustomHeaders(e.target.value)}
            />
          </div>

          {currentRoute.method !== "GET" && (
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">REQUEST BODY (raw JSON)</span>
              <textarea
                rows={5}
                className="w-full bg-slate-950 text-indigo-300 border border-slate-800 rounded-sm p-2 mt-1 focus:outline-hidden text-[10px]"
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Output Split */}
        <div className="p-4 flex flex-col space-y-3 max-h-[580px] overflow-y-auto text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-zinc-400 font-bold">RESPONSE VIEW</span>
            {responseStatus !== null && (
              <span
                className={`font-semibold text-xs px-2 py-0.5 rounded-sm font-sans ${
                  responseStatus >= 200 && responseStatus < 300
                    ? "bg-emerald-950/50 text-emerald-400"
                    : "bg-rose-950/50 text-rose-400"
                }`}
              >
                STATUS {responseStatus}
              </span>
            )}
          </div>

          {/* Trace ID inspector panel */}
          {responseHeaders["x-trace-id"] && (
            <div className="bg-slate-950/80 border border-slate-800/60 rounded-md p-2 flex items-center justify-between gap-4">
              <div className="truncate">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Audit Trace ID Header</span>
                <span className="text-indigo-400 font-semibold text-[10px] truncate">{responseHeaders["x-trace-id"]}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(responseHeaders["x-trace-id"]);
                  setTraceIdCopied(true);
                  setTimeout(() => setTraceIdCopied(false), 2000);
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy trace identifier"
              >
                {traceIdCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          <div className="flex-grow flex flex-col min-h-[160px]">
            <span className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Payload JSON</span>
            <pre className="bg-slate-950 text-slate-100 flex-grow p-3 rounded-lg border border-slate-800 font-mono text-[10px] overflow-auto select-all leading-relaxed">
              {responsePayload}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
