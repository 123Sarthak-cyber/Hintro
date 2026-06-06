import React, { useState } from "react";
import { AppSettings } from "../types";
import { Save, HelpCircle, Check, Construction } from "lucide-react";

interface IntegrationSettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  isSaving: boolean;
}

export const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({ settings, onSave, isSaving }) => {
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || "");
  const [webhookType, setWebhookType] = useState<AppSettings["webhookType"]>(settings.webhookType || "Slack");
  const [emailTarget, setEmailTarget] = useState(settings.emailTarget || "reviewer@hintro.com");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      webhookUrl: webhookUrl.trim(),
      webhookType,
      emailTarget: emailTarget.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 max-w-xl mx-auto space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-base font-semibold text-slate-800">Integration Configuration Panel</h3>
        <p className="text-xs text-slate-500 mt-1">Configure your Slack, Discord, or Email credentials below to verify outbound follow-up alerts.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-normal">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Alert Endpoint Provider</label>
          <select
            value={webhookType}
            onChange={(e) => setWebhookType(e.target.value as AppSettings["webhookType"])}
            className="w-full border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-hidden text-slate-700 font-medium"
          >
            <option value="Slack">Slack Webhook Integration</option>
            <option value="Discord">Discord Webhook Integration</option>
            <option value="EmailSimulator">SMTP Email Simulator</option>
          </select>
        </div>

        {webhookType !== "EmailSimulator" ? (
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Webhook endpoint URL</label>
            <input
              type="url"
              placeholder={
                webhookType === "Slack"
                  ? "https://hooks.slack.com/services/..."
                  : "https://discord.com/api/webhooks/..."
              }
              className="w-full border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-hidden font-mono text-[11px] text-slate-800"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Generate a webhook URL inside Slack/Discord and paste it here. When the scheduler triggers, a JSON digest alert of overdue action items is POSTed live!
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-slate-700 font-semibold mb-1">SMTP Notification Destination Address</label>
            <input
              type="email"
              required
              className="w-full border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-hidden text-slate-800"
              value={emailTarget}
              onChange={(e) => setEmailTarget(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              If an email server is selected, logs of the simulated SMTP transaction details (including headers and body) are captured and displayed real-time in the log console!
            </p>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs text-indigo-700">
            <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Format Specimen Preview</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            The external webhook body payload is rendered formatted to the spec:
          </p>
          <pre className="bg-slate-950 text-slate-300 font-mono text-[10px] p-3 rounded-lg border border-slate-900 leading-relaxed select-all">
{`Reminder: Prepare release notes
Assigned To: Alice
Due Date: 2026-05-25`}
          </pre>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-4">
          {savedSuccess && (
            <span className="text-emerald-600 font-medium text-xs flex items-center gap-1">
              <Check className="w-4 h-4" /> Credentials Saved Successfully!
            </span>
          )}
          <span />

          <button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};
