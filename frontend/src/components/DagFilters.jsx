import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, X, FileSpreadsheet, Tag as TagIcon, Sparkles, ArrowUpDown } from 'lucide-react';

export function DagFilters({ 
  searchQuery, 
  setSearchQuery, 
  statusFilter, 
  setStatusFilter,
  totalCount,
  filteredCount,
  onExportExcel,
  dags = [],
  sortBy,
  setSortBy
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'running', label: 'Running' },
    { value: 'failed', label: 'Failed' },
    { value: 'success', label: 'Success' },
    { value: 'queued', label: 'Queued' },
    { value: 'paused', label: 'Paused DAGs' },
  ];

  // Extract unique tags dynamically from DAGs list
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    dags.forEach((dag) => {
      if (dag.tags && Array.isArray(dag.tags)) {
        dag.tags.forEach((t) => {
          const name = typeof t === 'object' ? t.name : String(t);
          if (name) tagSet.add(name);
        });
      }
    });
    return Array.from(tagSet);
  }, [dags]);

  // Filter tag suggestions based on user input
  const matchingTagSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return availableTags;
    return availableTags.filter((tag) => tag.toLowerCase().includes(q));
  }, [availableTags, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTag = (tag) => {
    if (searchQuery.toLowerCase().trim() === tag.toLowerCase()) {
      setSearchQuery(''); // Toggle off if already selected
    } else {
      setSearchQuery(tag);
    }
    setIsDropdownOpen(false);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 mb-6 flex flex-col gap-3 relative z-30">
      
      {/* Top Filter Control Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Real-time Search Input with Autocomplete Dropdown */}
        <div className="relative w-full md:w-80" ref={dropdownRef}>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            placeholder="Search by DAG ID or Tag..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsDropdownOpen(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Tag Suggestions Autocomplete Dropdown */}
          {isDropdownOpen && matchingTagSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-2xl">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1 border-b border-slate-100 dark:border-slate-800/60 pb-1 mb-1">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                <span>Suggested Tag Filters</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                {matchingTagSuggestions.map((tag) => {
                  const isSelected = searchQuery.toLowerCase().trim() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      onClick={() => handleSelectTag(tag)}
                      className={`w-full text-left px-3.5 py-2 text-xs font-mono flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <TagIcon className="w-3.5 h-3.5 opacity-60" />
                        <span>{tag}</span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-sans tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Controls: Export Button, Status Filter & Counter */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end flex-wrap gap-2">
          
          {/* Export Excel Button */}
          <button
            onClick={onExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 shadow-sm shadow-emerald-500/20 transition-all duration-150"
            title="Export current DAG data to Excel / CSV file"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {/* Status Dropdown */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy && setSortBy(e.target.value)}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 cursor-pointer"
            >
              <option value="date-desc">Newest First (Date ⬇)</option>
              <option value="date-asc">Oldest First (Date ⬆)</option>
              <option value="id-asc">DAG Name (A-Z)</option>
              <option value="id-desc">DAG Name (Z-A)</option>
            </select>
          </div>

          {/* Counter readout */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{filteredCount}</span> of {totalCount} DAGs
          </div>
        </div>

      </div>

      {/* Quick Tag Suggestion Chips Bar */}
      {availableTags.length > 0 && (
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center space-x-1">
            <TagIcon className="w-3 h-3" />
            <span>Filter by Tag:</span>
          </span>
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            {availableTags.map((tag) => {
              const isSelected = searchQuery.toLowerCase().trim() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => handleSelectTag(tag)}
                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all duration-150 ${
                    isSelected
                      ? 'bg-cyan-500 text-white font-bold shadow-sm shadow-cyan-500/30 scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>#{tag}</span>
                  {isSelected && <X className="w-3 h-3 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
