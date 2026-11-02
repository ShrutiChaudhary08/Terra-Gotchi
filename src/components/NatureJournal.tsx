import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  Trash2,
  X,
  Leaf,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { usePet } from '../context/PetContext.tsx';
import type { JournalEntry } from '../types.ts';

export const NatureJournal: React.FC = () => {
  const { journal, deleteJournalEntryById } = usePet();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(journal.map((j) => j.category)))];

  const filtered = journal.filter((entry) => {
    const matchesCategory = selectedCategory === 'All' || entry.category === selectedCategory;
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.detected_object.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this discovery from your Nature Journal?')) return;
    setDeletingId(id);
    await deleteJournalEntryById(id);
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }
    setDeletingId(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#2c7a4b] text-xs font-bold mb-1 border border-emerald-200">
            <BookOpen size={13} />
            <span>Botanical Archive ({journal.length} Discoveries)</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Nature Journal</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Your personal digital herbarium and record of all verified outdoor nature findings.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-100 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by leaf, bark, rock, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 outline-none focus:border-[#2c7a4b] focus:bg-white transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                selectedCategory === cat
                  ? 'bg-[#2c7a4b] text-white shadow-xs'
                  : 'bg-gray-100/80 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Discoveries Gallery Grid */}
      {filtered.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-center p-6">
          <Leaf size={40} className="mx-auto text-emerald-400 mb-3 opacity-60" />
          <h3 className="font-bold text-gray-800 text-base">No discoveries match your criteria</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            {journal.length === 0
              ? 'Your journal is currently empty. Go outside, photograph a nature craving, and watch your collection grow!'
              : 'Try clearing your search or category filter to view all entries.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className="group bg-white rounded-3xl overflow-hidden border border-emerald-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
            >
              {/* Photo Box */}
              <div className="relative aspect-[4/3] bg-black/10 overflow-hidden">
                <img
                  src={entry.image_url}
                  alt={entry.detected_object}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Category Badge */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Tag size={10} />
                  <span>{entry.category}</span>
                </div>

                {/* XP Badge */}
                <div className="absolute top-3 right-3 bg-amber-400/95 text-amber-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                  +{entry.xp_awarded} XP
                </div>
              </div>

              {/* Details Content */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 leading-tight">
                    {entry.detected_object || entry.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">
                    "{entry.title}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar size={12} />
                    {new Date(entry.discovered_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                      <CheckCircle2 size={12} />
                      {Math.round(entry.confidence * 100)}% Match
                    </span>

                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      disabled={deletingId === entry.id}
                      className="p-1 text-gray-300 hover:text-red-500 rounded-md transition"
                      title="Delete discovery"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh]">
            <div className="relative aspect-[4/3] bg-black">
              <img
                src={selectedEntry.image_url}
                alt={selectedEntry.detected_object}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setSelectedEntry(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-2 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    {selectedEntry.category}
                  </span>
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    +{selectedEntry.xp_awarded} XP Awarded
                  </span>
                </div>
                <h2 className="text-xl font-black text-gray-900">
                  {selectedEntry.detected_object}
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Fulfilling craving: <em>"{selectedEntry.title}"</em>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-500">Discovery Timestamp:</span>
                  <span className="font-bold text-gray-800">
                    {new Date(selectedEntry.discovered_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-500">Gemini Vision Confidence:</span>
                  <span className="font-bold text-emerald-700">
                    {Math.round(selectedEntry.confidence * 100)}% Authenticity Match
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={(e) => handleDelete(selectedEntry.id, e)}
                  className="px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 size={14} />
                  <span>Delete Record</span>
                </button>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="px-5 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
