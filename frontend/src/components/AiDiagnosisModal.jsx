import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, X, Play, Send, Terminal, MessageSquare, Code, Copy } from 'lucide-react';

export function AiDiagnosisModal({ 
  isOpen, 
  onClose, 
  diagnosis, 
  loading,
  onReTrigger,
  onToast 
}) {
  const [chatMessages, setChatMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setChatMessages([]);
      setInputPrompt('');
    }
  }, [isOpen, diagnosis]);

  if (!isOpen) return null;

  const isHighSeverity = diagnosis?.severity === 'HIGH' || diagnosis?.severity === 'CRITICAL';

  const handleSendChat = async (targetText = inputPrompt) => {
    const q = targetText.trim();
    if (!q || loadingChat || !diagnosis?.dag_id) return;

    const userMsg = { sender: 'user', text: q };
    setChatMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setLoadingChat(true);

    try {
      const res = await fetch(`/api/dags/${encodeURIComponent(diagnosis.dag_id)}/chat-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dag_run_id: diagnosis.dag_run_id,
          prompt: q
        })
      });
      const json = await res.json();
      if (json.success) {
        setChatMessages(prev => [...prev, {
          sender: 'ai',
          text: json.answer,
          model: json.ai_model
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          sender: 'ai',
          text: 'Failed to get answer for this follow-up query.'
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: 'ai',
        text: 'Error communicating with AI follow-up assistant.'
      }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const suggestions = [
    'Give me SQL migration command to fix this',
    'How do I test this DAG locally?',
    'Explain the root cause in simple terms'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-cyan-500/30 bg-slate-900/95 text-slate-100 relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Decorative Top Ambient Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-white flex items-center space-x-2">
                <span>AI Automated Error Diagnosis</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                DAG: <strong className="text-cyan-400">{diagnosis?.dag_id || 'Analyzing...'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content (Scrollable) */}
        {loading ? (
          <div className="py-16 text-center shrink-0">
            <div className="inline-block w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-300">Retrieving task logs & analyzing stack trace...</p>
            <p className="text-xs text-slate-500 mt-1">Extracting root cause & remediation steps</p>
          </div>
        ) : diagnosis ? (
          <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1">
            
            {/* Root Cause Banner */}
            <div className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
              isHighSeverity 
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' 
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isHighSeverity ? 'text-rose-400' : 'text-amber-400'}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider">
                    {diagnosis.root_cause}
                  </h4>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                    isHighSeverity ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {diagnosis.severity || 'MEDIUM'} SEVERITY
                  </span>
                </div>
                <p className="text-xs mt-1.5 text-slate-300 leading-relaxed font-medium">
                  {diagnosis.explanation}
                </p>
              </div>
            </div>

            {/* Recommended Remediation Steps */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Recommended Remediation Actions</span>
              </h5>
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                {diagnosis.recommended_action}
              </div>
            </div>

            {/* Interactive AI Follow-Up Chat Thread Section */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span>Ask AI Follow-Up Question</span>
                </h5>
                <span className="text-[10px] text-slate-400 font-mono">
                  {diagnosis.ai_model || 'Gemini AI'}
                </span>
              </div>

              {/* Chat Thread Messages */}
              {chatMessages.length > 0 && (
                <div className="space-y-2.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  {chatMessages.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30 font-medium'
                          : 'bg-slate-900 text-slate-200 border border-slate-800 font-mono whitespace-pre-line'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] opacity-60 mb-1 font-sans">
                          <strong>{m.sender === 'user' ? 'You' : 'AI Assistant'}</strong>
                          {m.model && <span>{m.model}</span>}
                        </div>
                        <p>{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestion Prompt Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Try:</span>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(s)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Ask follow-up question (e.g. 'Give me SQL migration command')..."
                  className="flex-1 bg-slate-900 text-xs text-slate-100 placeholder-slate-500 p-2.5 rounded-xl border border-slate-800 focus:border-cyan-500/60 focus:outline-none font-medium"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={loadingChat || !inputPrompt.trim()}
                  className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 disabled:opacity-40 transition active:scale-95"
                  title="Send follow-up question"
                >
                  {loadingChat ? (
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Close Diagnosis
          </button>

          {diagnosis && (
            <button
              onClick={() => {
                onClose();
                if (onReTrigger) onReTrigger(diagnosis.dag_id);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 active:scale-95 shadow-md shadow-cyan-500/20 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Re-trigger DAG Now</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
