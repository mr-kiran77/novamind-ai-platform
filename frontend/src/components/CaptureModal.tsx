import React, { useState } from 'react';
import { Sparkles, X, Mic, FileText, Loader2, Wand2, BarChart3, Plus } from 'lucide-react';
import { api } from '../services/api';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIdeaCreated: (newIdea: any) => void;
}

const CATEGORIES = [
  'CleanTech',
  'Biotech',
  'AI / ML',
  'Neurotech',
  'Robotics',
  'SpaceTech',
  'EdTech',
  'FinTech',
  'HealthTech',
];

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onIdeaCreated,
}) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [rawFormat, setRawFormat] = useState<'text' | 'voice' | 'image'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Community Poll state (Feature 1)
  const [attachPoll, setAttachPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [pollClosesAt, setPollClosesAt] = useState('');

  // Idea Copilot Jurisdiction state
  const [jurisdiction, setJurisdiction] = useState('');

  if (!isOpen) return null;

  // Simulate voice speech-to-text recording
  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRawFormat('voice');
      setTimeout(() => {
        setContent(prev =>
          prev
            ? `${prev} Voice thought: We need self-healing solar panels using bio-engineered fungal mycelium...`
            : 'Voice thought: We need self-healing solar panels using bio-engineered fungal mycelium that regenerates after sandstorms.'
        );
        setIsRecording(false);
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    let pollPayload = undefined;
    if (attachPoll && pollQuestion.trim()) {
      const cleanOpts = pollOptions.map(o => o.trim()).filter(Boolean);
      if (cleanOpts.length >= 2) {
        pollPayload = {
          question: pollQuestion.trim(),
          options: cleanOpts.slice(0, 6),
          closes_at: pollClosesAt ? new Date(pollClosesAt).toISOString() : undefined,
        };
      }
    }

    try {
      const response = await api.captureIdea({
        raw_content: content.trim(),
        raw_format: rawFormat,
        title: title.trim() || undefined,
        category: category,
        jurisdiction: jurisdiction.trim() || undefined,
        poll: pollPayload,
      });

      onIdeaCreated(response.idea || response);
      onClose();
      setContent('');
      setTitle('');
      setJurisdiction('');
      setAttachPoll(false);
      setPollQuestion('');
      setPollOptions(['Option 1', 'Option 2']);
      setPollClosesAt('');
    } catch (err: any) {
      setError(err.message || 'Failed to structure and publish idea. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl border-purple-500/30 p-6 space-y-4 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Capture Raw Innovation Thought</h3>
              <p className="text-[11px] text-gray-400">
                Gemini 3.8 Flash automatically turns messy ideas into 22-field execution blueprints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="text-xs bg-red-950/60 border border-red-500/40 text-red-300 p-2.5 rounded-xl">
            {error}
          </div>
        )}

        {/* Input Format Bar */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 text-[11px]">Format:</span>
          <button
            type="button"
            onClick={() => setRawFormat('text')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              rawFormat === 'text'
                ? 'bg-purple-600/30 border border-purple-500/50 text-purple-200'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Text Note
          </button>
          <button
            type="button"
            onClick={toggleRecording}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              isRecording
                ? 'bg-red-500/30 border border-red-500 text-red-200 animate-pulse'
                : rawFormat === 'voice'
                ? 'bg-purple-600/30 border border-purple-500/50 text-purple-200'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            {isRecording ? 'Listening (AI Transcribing...)' : 'Voice Thought'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Title / Quick Concept Name (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., MycoSolar Self-Regenerating Cells"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Innovation Domain / Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#11131f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-300">
                Declared Geographic Jurisdiction (Optional)
              </label>
              <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Idea Copilot Grounding
              </span>
            </div>
            <input
              type="text"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g. India, United States, Germany, European Union (Leave blank for Global)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Idea Copilot will ground government grants, legal compliance, and tax incentives for this jurisdiction.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Describe your idea, napkin sketch, or problem
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Don't worry about clean formatting! Dump whatever is in your head:
- What is the problem?
- How could it be solved?
- What made you think of this?
Nova's AI engine will structure this into problem, solution, risks, tech stack, and practical use cases."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
              required
            />
          </div>

          {/* Community Poll Accordion (Feature 1) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setAttachPoll(!attachPoll)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Attach Community Poll (2 to 6 Options)</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-all ${
                attachPoll ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-gray-400 border-white/10'
              }`}>
                {attachPoll ? '✓ Poll Attached' : '+ Add Poll'}
              </span>
            </button>

            {attachPoll && (
              <div className="p-3.5 border-t border-white/10 space-y-3 bg-black/40">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    Poll Question
                  </label>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="e.g. Which hardware sensor or design approach should we prioritize?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-gray-300">
                      Options ({pollOptions.length}/6)
                    </label>
                    <span className="text-[10px] text-gray-500">Min 2, Max 6</span>
                  </div>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-4 text-center font-mono">{idx + 1}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[idx] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          className="text-gray-500 hover:text-red-400 p-1"
                          title="Remove option"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    Optional Closing Date
                  </label>
                  <input
                    type="datetime-local"
                    value={pollClosesAt}
                    onChange={(e) => setPollClosesAt(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    Leave blank to keep poll open indefinitely.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AI Structuring Status Banner */}
          <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-300">
              <Wand2 className="w-4 h-4 text-cyan-400" />
              <span>Multi-Agent Swarm Structuring Engine Active</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">Gemini 3.8 Flash</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="gradient-btn text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/25"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Structuring Blueprint with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Structure &amp; Publish Idea</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
