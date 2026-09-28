import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, ExternalLink } from 'lucide-react';
import { LinkedInIcon, TwitterIcon } from './SocialIcons';
import type { Idea } from '../types';

interface ShareModalProps {
  idea: Idea | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ idea, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!idea) return null;

  const shareUrl = `${window.location.origin}/ideas/${idea.id}`;
  const shareText = `🚀 Check out this innovation concept on NovaMind: "${idea.title}" — structured with Gemini AI 22-field execution blueprint!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: idea.title,
        text: shareText,
        url: shareUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl border-purple-500/30 p-5 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Share Innovation Blueprint</h3>
              <p className="text-[10px] text-gray-400">Collaborate with developers, co-founders &amp; friends</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Idea Preview Card */}
        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">{idea.category}</span>
          <h4 className="font-bold text-white text-xs line-clamp-1">{idea.title}</h4>
          <p className="text-[11px] text-gray-400 line-clamp-2">
            {idea.structured_data?.one_line_summary || idea.raw_content}
          </p>
        </div>

        {/* Copy Link Input Bar */}
        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl p-1.5">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent px-2.5 text-xs text-gray-300 focus:outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="gradient-btn text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Social Share Buttons */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0077b5]/15 hover:bg-[#0077b5]/30 border border-[#0077b5]/40 text-blue-300 text-xs font-semibold gap-1.5 transition-all"
          >
            <LinkedInIcon className="w-5 h-5 text-[#0077b5]" />
            <span className="text-[11px]">LinkedIn</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#25d366]/15 hover:bg-[#25d366]/30 border border-[#25d366]/40 text-green-300 text-xs font-semibold gap-1.5 transition-all"
          >
            <MessageCircle className="w-5 h-5 text-[#25d366]" />
            <span className="text-[11px]">WhatsApp</span>
          </a>

          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1da1f2]/15 hover:bg-[#1da1f2]/30 border border-[#1da1f2]/40 text-cyan-300 text-xs font-semibold gap-1.5 transition-all"
          >
            <TwitterIcon className="w-5 h-5 text-[#1da1f2]" />
            <span className="text-[11px]">Twitter / X</span>
          </a>
        </div>

        {/* Mobile Native Share Trigger */}
        {'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Device Share Menu (AirDrop, Telegram, SMS)</span>
          </button>
        )}
      </div>
    </div>
  );
};
