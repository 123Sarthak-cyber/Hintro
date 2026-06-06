import React from "react";
import { Meeting, TranscriptSegment } from "../types";
import { BrainCircuit, Clock, Calendar, Users, FileText, CheckCircle2 } from "lucide-react";

interface MeetingCardProps {
  meeting: Meeting;
  currentSegment: string | null;
  onSelectSegment: (timestamp: string) => void;
  onAnalyze: (id: string) => void;
  isAnalyzing: boolean;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  currentSegment,
  onSelectSegment,
  onAnalyze,
  isAnalyzing,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-100 hover:border-slate-200 transition-all overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-50 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium py-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(meeting.meetingDate).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <h3 className="text-lg font-semibold text-slate-800 mt-2">{meeting.title}</h3>
          </div>

          <div>
            {meeting.analysis ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" /> Analyzed with Grounded Citations
              </span>
            ) : (
              <button
                onClick={() => onAnalyze(meeting.id)}
                disabled={isAnalyzing}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-xs disabled:opacity-50"
              >
                <BrainCircuit className="w-4 h-4" />
                {isAnalyzing ? "Processing analysis AI..." : "Perform AI Analysis"}
              </button>
            )}
          </div>
        </div>

        {/* Participants Panel */}
        <div className="flex items-center gap-2 mt-4 text-xs text-slate-600">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="font-semibold">Participants:</span>
          <div className="flex flex-wrap gap-1.5 ml-1">
            {meeting.participants.map((email, idx) => (
              <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                {email}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* Transcript Portion */}
        <div className="p-5 flex flex-col max-h-[380px]">
          <div className="flex items-center gap-2 mb-3 text-slate-700 font-medium text-sm">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>Interactive Transcript ({meeting.transcript.length} segments)</span>
          </div>
          
          <div className="overflow-y-auto space-y-2.5 pr-2 flex-grow">
            {meeting.transcript.map((seg, idx) => {
              const isSelected = currentSegment === seg.timestamp;
              return (
                <div
                  key={idx}
                  id={`transcript-${seg.timestamp}`}
                  onClick={() => onSelectSegment(seg.timestamp)}
                  className={`p-3 rounded-lg border text-sm transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-200 shadow-3xs"
                      : "bg-slate-50/40 border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">{seg.speaker}</span>
                    <span className="font-mono text-xs text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {seg.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">{seg.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Insight Outcomes */}
        <div className="p-5 flex flex-col max-h-[380px] overflow-y-auto">
          {meeting.analysis ? (
            <div className="space-y-4">
              {/* Summary Block */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Meeting Summary</h4>
                <div className="space-y-2">
                  {meeting.analysis.summary.map((item, idx) => (
                    <div key={idx} className="p-3 bg-indigo-50/20 rounded-lg border border-indigo-100/30 text-xs">
                      <p className="text-slate-700 leading-relaxed font-normal">{item.text}</p>
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Citations:</span>
                        {item.citations.map((cit, cidx) => (
                          <button
                            key={cidx}
                            onClick={() => onSelectSegment(cit.timestamp)}
                            className="bg-indigo-100/50 hover:bg-indigo-100 text-indigo-700 font-mono text-[10px] px-1.5 py-0.5 rounded-sm transition-all"
                          >
                            📝 {cit.timestamp}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decisions Block */}
              {meeting.analysis.decisions && meeting.analysis.decisions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Decisions Made</h4>
                  <div className="bg-amber-50/10 border border-amber-100/50 rounded-lg p-3 space-y-2.5">
                    {meeting.analysis.decisions.map((item, idx) => (
                      <div key={idx} className="text-xs flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">📌</span>
                        <div>
                          <p className="text-slate-700 leading-relaxed font-normal">{item.text}</p>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-medium text-slate-400">Cited text:</span>
                            {item.citations.map((cit, cidx) => (
                              <button
                                key={cidx}
                                onClick={() => onSelectSegment(cit.timestamp)}
                                className="bg-amber-100/50 hover:bg-amber-100 text-amber-800 font-mono text-[9px] px-1 py-0.5 rounded-sm transition-all"
                              >
                                {cit.timestamp}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up suggestions */}
              {meeting.analysis.followUpSuggestions && meeting.analysis.followUpSuggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Follow-up Suggestions</h4>
                  <div className="bg-violet-50/10 border border-violet-100/50 rounded-lg p-3 space-y-2.5">
                    {meeting.analysis.followUpSuggestions.map((item, idx) => (
                      <div key={idx} className="text-xs flex items-start gap-2">
                        <span className="text-violet-500 mt-0.5">🚀</span>
                        <div>
                          <p className="text-slate-700 leading-relaxed font-normal">{item.text}</p>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-medium text-slate-400">Source timestamp:</span>
                            {item.citations.map((cit, cidx) => (
                              <button
                                key={cidx}
                                onClick={() => onSelectSegment(cit.timestamp)}
                                className="bg-violet-100/50 hover:bg-violet-100 text-violet-800 font-mono text-[9px] px-1 py-0.5 rounded-sm transition-all"
                              >
                                {cit.timestamp}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-slate-400 border border-dashed border-slate-100 rounded-xl">
              <BrainCircuit className="w-12 h-12 text-slate-200 mb-3 animate-pulse" />
              <p className="text-xs font-medium text-slate-500">Meeting Analysis Not Performed Yet</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                Trigger the Gemini intelligence analyzer on the header to extract grounded action items, summaries, and citations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
