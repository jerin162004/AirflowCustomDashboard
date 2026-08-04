import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Command, ArrowRight, X, Play, Square, Filter, Search, Stethoscope } from 'lucide-react';

export function ChatOpsBar({ 
  onExecuteCommand, 
  isOpen, 
  onClose 
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSuggest = (text) => {
    setPrompt(text);
    handleSubmitPrompt(text);
  };

  const handleSubmitPrompt = async (targetPrompt = prompt) => {
    const q = targetPrompt.trim();
    if (!q || loading) return;

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/chatops/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q })
      });
      const json = await res.json();
      setFeedback(json);

      if (json.success && onExecuteCommand) {
        onExecuteCommand(json);
        
        // Auto-dismiss ChatOps bar after 600ms so user immediately sees results on main dashboard!
        setTimeout(() => {
          onClose();
          setFeedback(null);
          setPrompt('');
        }, 600);
      }
    } catch (err) {
      setFeedback({
        success: false,
        message: err.message || 'Failed to process ChatOps command'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const suggestions = [
    { label: 'Show failed DAGs', prompt: 'show failed dags', icon: Filter },
    { label: 'Trigger first_dag', prompt: 'trigger first_dag', icon: Play },
    { label: 'Diagnose errors', prompt: 'diagnose first_dag', icon: Stethoscope },
    { label: 'Show all DAGs', prompt: 'show all dags', icon: Search }
  ];

  return (
    <div className="mb-6 animate-fade-in">
      <div className="glass-panel w-full rounded-3xl p-4 shadow-xl border border-cyan-500/50 bg-slate-900/90 text-slate-100 relative overflow-hidden backdrop-blur-xl">
        
        {/* Top Ambient Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 animate-pulse" />

        {/* Command Bar Header Input */}
        <div className="flex items-center space-x-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 focus-within:border-cyan-500/60 transition">
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitPrompt()}
            placeholder="Ask AI ChatOps Assistant... (e.g. 'show failed dags', 'trigger first_dag', 'diagnose failure')"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-medium"
          />
          {loading ? (
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <button
              onClick={() => handleSubmitPrompt()}
              className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition"
              title="Execute ChatOps Command"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Try:</span>
          {suggestions.map((s, idx) => {
            const Icon = s.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSuggest(s.prompt)}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition active:scale-95"
              >
                <Icon className="w-3 h-3 text-cyan-400" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Execution Feedback Result */}
        {feedback && (
          <div className="mt-3 p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs font-medium flex items-center space-x-2.5 animate-fade-in">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <p className="flex-1 font-mono">{feedback.message}</p>
          </div>
        )}

      </div>
    </div>
  );
}
