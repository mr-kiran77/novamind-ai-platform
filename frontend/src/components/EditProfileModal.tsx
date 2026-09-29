import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Trash2,
  Save,
  Loader2,
  Lock,
  Globe,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar';
import { api } from '../services/api';
import type { User } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated: (updatedUser: User) => void;
  showToast: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  showToast,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.display_name || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [occupation, setOccupation] = useState(currentUser.occupation || '');
  const [education, setEducation] = useState(currentUser.education || '');
  const [skillsStr, setSkillsStr] = useState(
    Array.isArray(currentUser.skills) ? currentUser.skills.join(', ') : ''
  );
  const [interestsStr, setInterestsStr] = useState(
    Array.isArray(currentUser.interests) ? currentUser.interests.join(', ') : ''
  );
  const [linksStr, setLinksStr] = useState(
    Array.isArray(currentUser.links) ? currentUser.links.join(', ') : ''
  );
  const [isPrivate, setIsPrivate] = useState(Boolean(currentUser.is_private));

  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.display_name || '');
      setBio(currentUser.bio || '');
      setLocation(currentUser.location || '');
      setOccupation(currentUser.occupation || '');
      setEducation(currentUser.education || '');
      setSkillsStr(Array.isArray(currentUser.skills) ? currentUser.skills.join(', ') : '');
      setInterestsStr(Array.isArray(currentUser.interests) ? currentUser.interests.join(', ') : '');
      setLinksStr(Array.isArray(currentUser.links) ? currentUser.links.join(', ') : '');
      setIsPrivate(Boolean(currentUser.is_private));
      setAvatarUrl(currentUser.avatar_url || '');
      setError(null);
    }
  }, [isOpen, currentUser]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle avatar upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be under 5 MB');
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    try {
      const res = await api.uploadAvatar(file);
      if (res && res.avatar_url) {
        setAvatarUrl(res.avatar_url);
        if (res.user) {
          onUserUpdated(res.user);
        }
        showToast('Profile photo updated successfully!');
      }
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle remove avatar
  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setError(null);
    try {
      const res = await api.removeAvatar();
      if (res && res.avatar_url) {
        setAvatarUrl(res.avatar_url);
        if (res.user) {
          onUserUpdated(res.user);
        }
        showToast('Profile photo removed.');
      }
    } catch (err: any) {
      console.error('Failed to remove avatar:', err);
      setError(err.message || 'Failed to remove photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save profile changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const skillsArray = skillsStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const interestsArray = interestsStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const linksArray = linksStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const updated = await api.updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim(),
        location: location.trim(),
        occupation: occupation.trim(),
        education: education.trim(),
        skills: skillsArray,
        interests: interestsArray,
        links: linksArray,
        is_private: isPrivate,
      });

      if (updated) {
        onUserUpdated(updated);
        showToast('Profile changes saved successfully!');
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Edit Profile"
    >
      <div className="relative w-full max-w-2xl my-auto rounded-3xl bg-[#0f111e] border border-white/15 shadow-2xl shadow-purple-950/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Profile Details</h3>
              <p className="text-[11px] text-gray-400">Update your public innovator identity &amp; presence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Photo Management Section */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row items-center gap-4">
            <ProfileAvatar
              name={displayName}
              username={currentUser.username}
              avatarUrl={avatarUrl}
              size="lg"
            />
            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <h4 className="text-xs font-bold text-white">Profile Photo</h4>
              <p className="text-[11px] text-gray-400">
                Upload a custom picture or let NovaMind generate a futuristic persona. PNG, JPG or WebP up to 5 MB.
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Upload Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-rose-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Remove custom photo and use default initials"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>

          {/* Display Name & Username (Readonly) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Dr. Maya Lin"
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300 flex items-center justify-between">
                <span>Unique Innovator ID</span>
                <span className="text-[10px] text-gray-500">Immutable</span>
              </label>
              <input
                type="text"
                value={`@${currentUser.username}`}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-gray-400 font-mono select-none"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-300">Biography</label>
              <span className="text-[10px] text-gray-500">{bio.length}/500</span>
            </div>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, 500))}
              placeholder="Tell other innovators about your research focus, passion projects, or areas of collaboration..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 leading-relaxed resize-none"
            />
          </div>

          {/* Location, Occupation, Education */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>Location</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                <span>Occupation</span>
              </label>
              <input
                type="text"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                placeholder="Neuroscience Researcher"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>Education</span>
              </label>
              <input
                type="text"
                value={education}
                onChange={e => setEducation(e.target.value)}
                placeholder="Ph.D. Neurobiology, MIT"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Skills & Interests (comma-separated inputs with chip previews) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300">
                Skills &amp; Expertise <span className="text-gray-500 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={skillsStr}
                onChange={e => setSkillsStr(e.target.value)}
                placeholder="BCI Hardware, Python, Machine Learning, Signal Processing"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300">
                Interests &amp; Fields <span className="text-gray-500 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={interestsStr}
                onChange={e => setInterestsStr(e.target.value)}
                placeholder="Neural Engineering, Clean Energy, Space Exploration"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Social & Web Links */}
          <div className="space-y-1.5">
            <label className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Website &amp; Social Links <span className="text-gray-500 font-normal">(comma-separated URLs)</span></span>
            </label>
            <input
              type="text"
              value={linksStr}
              onChange={e => setLinksStr(e.target.value)}
              placeholder="https://github.com/drmayalin, https://linkedin.com/in/drmayalin"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <div className="font-bold text-gray-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Private Profile</span>
              </div>
              <p className="text-[11px] text-gray-400">
                When enabled, only accepted connections can view your full blueprints and metrics.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
            </label>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="gradient-btn text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/25"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
