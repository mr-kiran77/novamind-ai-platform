import React, { useState, useEffect } from 'react';
import { Compass, Search, Sparkles, Filter, Layers, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { IdeaCard } from './IdeaCard';
import type { Idea } from '../types';

interface DiscoverViewProps {
  onLike: (id: string) => void;
  onComment: (idea: Idea) => void;
  onShare: (idea: Idea) => void;
  onSave: (id: string) => void;
  onFollow: (userId: string) => void;
  onCollaborate: (idea: Idea) => void;
  onViewDetail: (idea: Idea) => void;
  allIdeas: Idea[];
}

const SAMPLE_QUERIES = [
  { label: '⚡ Piezoelectric road energy', query: 'harvesting kinetic energy from highway vehicle traffic' },
  { label: '🤖 Tactile haptic surgery', query: 'surgical robotics tactile haptics for VR immersion' },
  { label: '🐝 Drone micro-pollination', query: 'crop pollination with micro autonomous drone swarms' },
  { label: '🧬 Bio-concrete self-healing', query: 'bacterial limestone precipitation for crack self-healing' },
  { label: '🛰️ Low-earth mesh network', query: 'decentralized satellite inter-constellation telemetry' },
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  onLike,
  onComment,
  onShare,
  onSave,
  onFollow,
  onCollaborate,
  onViewDetail,
  allIdeas,
}) => {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [results, setResults] = useState<Idea[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // Load categories
    api.getCategories().then((res) => {
      if (res && res.categories) {
        setCategories(res.categories);
      }
    }).catch((err) => console.error('Error fetching categories:', err));
  }, []);

  const handleSearch = async (searchQuery: string, cat?: string | null) => {
    const q = searchQuery.trim();
    if (!q && !cat) {
      setResults([]);
      setSearched(false);
      return;
    }

    try {
      setIsSearching(true);
      setSearched(true);
      const res = await api.semanticSearch(q || cat || '', cat || undefined);
      if (res && res.results) {
        setResults(res.results);
      } else {
        // Fallback local filter
        const filtered = allIdeas.filter((item) => {
          const matchQ = !q || (item.title + ' ' + item.raw_content + ' ' + (item.category || '')).toLowerCase().includes(q.toLowerCase());
          const matchCat = !cat || item.category === cat;
          return matchQ && matchCat;
        });
        setResults(filtered);
      }
    } catch (err) {
      console.warn('Semantic search backend fallback to local match:', err);
      const filtered = allIdeas.filter((item) => {
        const matchQ = !q || (item.title + ' ' + item.raw_content + ' ' + (item.category || '')).toLowerCase().includes(q.toLowerCase());
        const matchCat = !cat || item.category === cat;
        return matchQ && matchCat;
      });
      setResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChipClick = (chipQuery: string) => {
    setQuery(chipQuery);
    handleSearch(chipQuery, selectedCategory);
  };

  const handleCategorySelect = (catName: string) => {
    const newCat = selectedCategory === catName ? null : catName;
    setSelectedCategory(newCat);
    handleSearch(query, newCat);
  };

  const displayedIdeas = searched ? results : allIdeas;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="glass-panel p-6 lg:p-8 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>High-Dimensional Concept Explorer</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Discover Breakthrough Ideas &amp; Cross-Discipline Concepts
          </h1>

          <p className="text-sm text-gray-300 leading-relaxed">
            Search using natural concepts rather than rigid keywords. Our Gemini vector pipeline matches concepts based on underlying engineering principles, target domains, and technological architectures.
          </p>

          {/* Search Box */}
          <div className="pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query, selectedCategory)}
                placeholder="Type a concept, e.g. 'harvesting energy from traffic vibrations' or 'VR haptic feedback'..."
                className="w-full bg-black/60 border border-white/20 rounded-2xl pl-12 pr-32 py-3.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
              />
              <button
                onClick={() => handleSearch(query, selectedCategory)}
                disabled={isSearching}
                className="absolute right-2 gradient-btn text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Vector Search</span>
              </button>
            </div>
          </div>

          {/* Sample Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-gray-400 font-medium">Try concepts:</span>
            {SAMPLE_QUERIES.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(sq.query)}
                className="text-xs bg-white/5 hover:bg-purple-500/20 text-purple-200 border border-white/10 hover:border-purple-500/40 px-3 py-1 rounded-xl transition-all font-medium"
              >
                {sq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Discipline / Category Pills */}
      {categories.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Explore by Scientific &amp; Engineering Discipline</span>
            </h2>
            {selectedCategory && (
              <button
                onClick={() => handleCategorySelect(selectedCategory)}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                Clear Filter ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 15).map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => handleCategorySelect(cat.name)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.count > 0 && (
                    <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded-full text-purple-200">
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white">
            {searched ? `Search Results (${displayedIdeas.length})` : `Featured Discoveries (${displayedIdeas.length})`}
          </h2>
          {searched && (
            <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
              Matched via Concept Vector
            </span>
          )}
        </div>
        {searched && (
          <button
            onClick={() => {
              setQuery('');
              setSelectedCategory(null);
              setSearched(false);
            }}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            Reset to All
          </button>
        )}
      </div>

      {/* Results Grid */}
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm text-gray-300">Scanning vector embeddings across published blueprints...</p>
        </div>
      ) : displayedIdeas.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/10 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h3 className="text-base font-bold text-white">No concept matches found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            We couldn't find published ideas matching "{query}". Try broadening your prompt or browse through the discipline pills above.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setSelectedCategory(null);
              setSearched(false);
            }}
            className="gradient-btn text-white px-4 py-2 rounded-xl text-xs font-semibold"
          >
            Show All Ideas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onLike={onLike}
              onComment={onComment}
              onShare={onShare}
              onSave={onSave}
              onFollow={onFollow}
              onCollaborate={onCollaborate}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
};
