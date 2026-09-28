import React, { useState } from 'react';
import { Users, X, Send } from 'lucide-react';
import type { Idea } from '../types';

interface CollabModalProps {
  idea: Idea | null;
  onClose: () => void;
  onSubmit: (ideaId: string, role: string, pitch: string) => Promise<void>;
}

export const CollabModal: React.FC<CollabModalProps> = ({ idea, onClose, onSubmit }) => {
  const [role, setRole] = useState('advanced_version');
  const [pitch, setPitch] = useState('');
  const [loading, setLoading] = useState(false);

  if (!idea) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitch.trim()) return;
    setLoading(true);
    try {
      await onSubmit(idea.id, role, pitch.trim());
      onClose();
      setPitch('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl border-purple-500/30 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Propose Idea Collaboration
            </h3>
            <p className="text-[11px] text-gray-400">Join the builder team with code, resources, or next-gen features</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Idea Banner */}
        <div className="text-xs text-purple-200 bg-purple-950/40 p-2.5 rounded-xl border border-purple-500/30 font-semibold truncate">
          💡 Concept: <span className="text-white font-bold">{idea.title}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">What can you contribute?</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="advanced_version">⚡ Advanced Version / Next-Gen Architecture</option>
              <option value="hardware_materials">🔬 Hardware, Raw Materials &amp; Lab Resources</option>
              <option value="technical">🛠️ Technical / Software Engineering Help</option>
              <option value="design">🎨 UI / UX &amp; Industrial Design</option>
              <option value="research">📚 Scientific &amp; Academic Research</option>
              <option value="business">📈 Business &amp; Commercialization</option>
              <option value="mentorship">🧭 Mentorship &amp; Advisory</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">Your Proposal / Pitch Message</label>
            <textarea
              rows={4}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Explain what you can contribute (e.g., 'I built an advanced routing neural network', 'I have piezoelectric crystals in my university lab', etc.)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-purple-500 text-white leading-relaxed"
              required
            />
          </div>

          <p className="text-[10px] text-gray-500">
            ℹ️ The host creator will review your offer and can accept you into the official collaborator team.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !pitch.trim()}
              className="gradient-btn text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Submitting...' : 'Send Collaboration Offer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
