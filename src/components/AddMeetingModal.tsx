import React, { useState } from "react";
import { Plus, Trash2, HelpCircle, FileSpreadsheet } from "lucide-react";
import { TranscriptSegment } from "../types";

interface AddMeetingModalProps {
  onClose: () => void;
  onSubmit: (meetingData: {
    title: string;
    participants: string[];
    meetingDate: string;
    transcript: TranscriptSegment[];
  }) => void;
}

export const AddMeetingModal: React.FC<AddMeetingModalProps> = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState("Marketing & Engineering Synced Alignment");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 16)); // YYYY-MM-DDTHH:mm
  const [participantsText, setParticipantsText] = useState("alice@example.com, bob@example.com");
  
  // Custom list of transcript segments
  const [segments, setSegments] = useState<TranscriptSegment[]>([
    { timestamp: "00:05", speaker: "Alice", text: "We must confirm our database schema for the submission by tomorrow." },
    { timestamp: "00:25", speaker: "Bob", text: "I can double check the SQLite file database mapping and write automated tests." },
  ]);

  const [rawPastedText, setRawPastedText] = useState("");
  const [showPasteHelper, setShowPasteHelper] = useState(false);

  const handleAddSegment = () => {
    // Generate next stamp
    const lastSeg = segments[segments.length - 1];
    let nextSt = "00:30";
    if (lastSeg) {
      const parts = lastSeg.timestamp.split(":");
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      const nextSecs = secs + 15;
      const finalMins = mins + Math.floor(nextSecs / 60);
      const finalSecs = nextSecs % 60;
      nextSt = `${String(finalMins).padStart(2, "0")}:${String(finalSecs).padStart(2, "0")}`;
    }

    setSegments([...segments, { timestamp: nextSt, speaker: "Alice", text: "" }]);
  };

  const handleRemoveSegment = (idx: number) => {
    setSegments(segments.filter((_, i) => i !== idx));
  };

  const handleSegmentChange = (idx: number, field: keyof TranscriptSegment, value: string) => {
    const updated = [...segments];
    updated[idx] = { ...updated[idx], [field]: value };
    setSegments(updated);
  };

  // Automated smart parser! Parses copied transcript transcripts e.g.:
  // [00:10] Alice: Hey there
  // Bob: We should launch next speed
  const handleParseRawText = () => {
    if (!rawPastedText.trim()) return;

    const lines = rawPastedText.split("\n");
    const parsed: TranscriptSegment[] = [];
    
    let currentMin = 0;
    let currentSec = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract details
      // Pattern 1: [00:15] Speaker: Text
      // Pattern 2: Speaker [00:15]: Text
      // Pattern 3: Speaker: Text
      const timeRegex = /(?:\[?(\d{2}):(\d{2})\]?)/;
      const timeMatch = trimmed.match(timeRegex);

      let timestamp = "";
      let remainingText = trimmed;

      if (timeMatch) {
         timestamp = `${timeMatch[1]}:${timeMatch[2]}`;
         remainingText = trimmed.replace(timeRegex, "").trim();
      } else {
         // Auto increments timestamp by 10 secs
         currentSec += 10;
         if (currentSec >= 60) {
           currentMin += Math.floor(currentSec / 60);
           currentSec = currentSec % 60;
         }
         timestamp = `${String(currentMin).padStart(2, "0")}:${String(currentSec).padStart(2, "0")}`;
      }

      // Find speaker name separator":"
      const colonIdx = remainingText.indexOf(":");
      if (colonIdx !== -1) {
         const speaker = remainingText.substring(0, colonIdx).replace(/[\[\]]/g, "").trim();
         const text = remainingText.substring(colonIdx + 1).trim();
         if (speaker && text) {
           parsed.push({ timestamp, speaker, text });
         }
      } else {
         // Fallback if no colon is present
         parsed.push({
           timestamp,
           speaker: "Speaker",
           text: remainingText
         });
      }
    });

    if (parsed.length > 0) {
      setSegments(parsed);
      setShowPasteHelper(false);
      setRawPastedText("");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse participant list
    const participants = participantsText
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p !== "");

    if (!title || participants.length === 0 || segments.length === 0) {
      alert("Please fill in meeting title, add at least one participant, and one transcript dialog segment.");
      return;
    }

    // Double check email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of participants) {
      if (!emailRegex.test(email)) {
        alert(`Invalid email address: ${email}`);
        return;
      }
    }

    onSubmit({
      title,
      participants,
      meetingDate: new Date(date).toISOString(),
      transcript: segments,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-800">New Meeting Transcription</h3>
            <p className="text-xs text-slate-500">Record a new conversation transcript to perform AI analysis and extract items.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium p-1 bg-slate-100 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Modal Form split */}
        <form onSubmit={handleFormSubmit} className="flex-grow overflow-y-auto p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Meeting Title</label>
            <input
              type="text"
              required
              className="w-full border border-slate-200 outline-hidden focus:border-indigo-500 rounded-lg p-2 text-sm text-slate-800"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Date & Time</label>
              <input
                type="datetime-local"
                required
                className="w-full border border-slate-200 outline-hidden focus:border-indigo-500 rounded-lg p-2 text-sm text-slate-800"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Attendees (Comma separated emails)
              </label>
              <input
                type="text"
                required
                placeholder="alice@example.com, bob@example.com"
                className="w-full border border-slate-200 outline-hidden focus:border-indigo-500 rounded-lg p-2 text-sm text-slate-800"
                value={participantsText}
                onChange={(e) => setParticipantsText(e.target.value)}
              />
            </div>
          </div>

          {/* Transcript Control Area */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700">Conversational Transcript Settings</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteHelper(!showPasteHelper)}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 font-medium px-2.5 py-1 rounded-md text-[11px] hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {showPasteHelper ? "Manual Grid" : "Smart Paste Log"}
                </button>
              </div>
            </div>

            {showPasteHelper ? (
              <div className="bg-white p-3 rounded-lg border border-indigo-100 space-y-2 mb-3">
                <div className="flex items-start gap-1 text-slate-500 mb-1 leading-relaxed">
                  <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    Copy/paste raw text outputs from Zoom, Meet, or Slack. We will automatically extract speaker identifiers and timestamps!
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder={`[00:10] Alice: We should publish the code before Friday\n[00:30] Bob: I will handle the deployment workflow.`}
                  className="w-full border border-slate-200 outline-hidden focus:border-indigo-500 rounded-md p-2 text-xs font-mono"
                  value={rawPastedText}
                  onChange={(e) => setRawPastedText(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteHelper(false)}
                    className="p-1 px-3 text-slate-600 bg-slate-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleParseRawText}
                    className="p-1 px-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Apply Parser
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {segments.map((seg, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                    <input
                      type="text"
                      className="w-16 text-center bg-slate-50 border border-slate-100 rounded-md text-xs py-1 font-mono outline-hidden text-slate-700"
                      value={seg.timestamp}
                      placeholder="Min:Sec"
                      onChange={(e) => handleSegmentChange(idx, "timestamp", e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-24 bg-slate-50 border border-slate-100 rounded-md text-xs py-1 font-semibold outline-hidden text-slate-800"
                      value={seg.speaker}
                      placeholder="Speaker"
                      onChange={(e) => handleSegmentChange(idx, "speaker", e.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-grow border border-slate-100 focus:border-indigo-500 rounded-md text-xs py-1 px-2 outline-hidden text-slate-600"
                      value={seg.text}
                      placeholder="Insert phrase segment..."
                      onChange={(e) => handleSegmentChange(idx, "text", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSegment(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSegment}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 mt-1 border border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Conversation Line
                </button>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg text-sm transition-all"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-xs"
            >
              Draft Meeting Transcript
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
