import React from "react";
import { ActionItem, ReminderHistory } from "../types";
import { CheckCircle2, Clock, AlertCircle, ArrowUpRight, Play, Server, ListCollapse, CheckSquare } from "lucide-react";

interface ActionItemTrackerProps {
  actionItems: ActionItem[];
  reminderLogs: ReminderHistory[];
  onUpdateStatus: (id: string, status: ActionItem["status"]) => void;
  onTriggerScheduler: () => void;
  isTriggeringScheduler: boolean;
  onFilterMeeting: (meetingId: string) => void;
}

export const ActionItemTracker: React.FC<ActionItemTrackerProps> = ({
  actionItems,
  reminderLogs,
  onUpdateStatus,
  onTriggerScheduler,
  isTriggeringScheduler,
  onFilterMeeting,
}) => {
  const isOverdue = (item: ActionItem) => {
    return item.status !== "COMPLETED" && new Date(item.dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Action Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm">
            Core Service Workflow Loader
          </span>
          <h3 className="text-base font-semibold mt-1">Background Reminder Job (node-cron Simulator)</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Trigger active sweeps of action items. Any unresolved task where the <code>dueDate</code> is less than the current time is classified as overdue and alerts the configured third-party app!
          </p>
        </div>

        <button
          onClick={onTriggerScheduler}
          disabled={isTriggeringScheduler}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" />
          {isTriggeringScheduler ? "Processing sweeps..." : "Force Trigger Scheduler Job"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Action Items List Board */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <h4 className="font-semibold text-slate-800 text-sm">Trackable Follow-ups ({actionItems.length})</h4>
          </div>

          {actionItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-slate-100 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">All Set! No Tracked Items Found</p>
              <p className="text-[11px] text-slate-400 max-w-[280px] mx-auto mt-1">
                Once meetings are analyzed, actionable insights will populate here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionItems.map((item) => {
                const overdue = isOverdue(item);
                return (
                  <div
                    key={item.id}
                    className={`p-4 bg-white rounded-xl border transition-all ${
                      overdue
                        ? "border-rose-100 bg-rose-50/10"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        {/* Tags */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <button
                            onClick={() => onFilterMeeting(item.meetingId)}
                            className="bg-slate-100 text-slate-600 font-medium tracking-tight text-[10px] px-2 py-0.5 rounded-md hover:bg-slate-200 flex items-center gap-1 transition-colors"
                          >
                            <ListCollapse className="w-3 h-3" />
                            {item.meetingTitle}
                          </button>

                          {overdue && (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse border border-rose-100">
                              <AlertCircle className="w-2.5 h-2.5" /> OVERDUE
                            </span>
                          )}
                        </div>

                        <h5 className="font-semibold text-slate-800 text-xs">{item.task}</h5>

                        {/* Assignee and Citations info */}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          <span className="bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-sm">
                            👤 {item.assignee}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-slate-400">
                            📆 Deadline: {item.dueDate}
                          </span>
                          {item.citations && item.citations.length > 0 && (
                            <span className="text-slate-400">
                              🔊 Sourced cited: {item.citations.map((c) => c.timestamp).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status select options */}
                      <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                        <span className="text-[10px] text-slate-400 uppercase font-medium">Status</span>
                        <select
                          value={item.status}
                          onChange={(e) => onUpdateStatus(item.id, e.target.value as ActionItem["status"])}
                          className={`text-xs font-semibold rounded-lg p-2.5 outline-hidden border border-slate-100 ${
                            item.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : item.status === "IN_PROGRESS"
                              ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Integration reminder logs queue */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            <h4 className="font-semibold text-slate-800 text-sm">Reminder History Log ({reminderLogs.length})</h4>
          </div>

          <div className="bg-slate-950 text-slate-300 font-mono text-[11px] rounded-xl p-4 border border-slate-900 max-h-[480px] overflow-y-auto space-y-3">
            {reminderLogs.length === 0 ? (
              <div className="text-slate-500 py-6 text-center italic">
                No outbound webhook reminders triggered yet. Initiate force scheduler sweeps or check settings endpoints.
              </div>
            ) : (
              reminderLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-800/80 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-indigo-400 font-bold">[{log.integrationType}]</span>
                    <span className="text-slate-500 text-[10px]">{new Date(log.sentAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-200 line-clamp-2">Task: {log.taskTitle}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                    <span>Assignee: {log.assignee}</span>
                    <span>
                      Status:{" "}
                      <span className={log.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400 font-bold"}>
                        {log.status}
                      </span>
                    </span>
                  </div>
                  <p className="text-slate-500 text-[9px] mt-1 break-all bg-slate-900 p-1.5 rounded-sm line-clamp-2">
                    Dest: {log.endpointUrlOrTarget}
                  </p>
                  {log.details && (
                    <p className="text-slate-500 text-[9px] mt-1 line-clamp-2 italic">
                      Info: {log.details}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
