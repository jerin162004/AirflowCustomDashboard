import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, X, Play, RefreshCw, Terminal } from 'lucide-react';

export function AiDiagnosisModal({ 
  isOpen, 
  onClose, 
  diagnosis, 
  loading,
  onReTrigger,
  onToast 
}) {
  if (!isOpen) return null;

  const isHighSeverity = diagnosis?.severity === 'HIGH' || diagnosis?.severity === 'CRITICAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-cyan-500/30 bg-slate-900/90 text-slate-100 relative overflow-hidden">
        
        {/* Decorative Top Ambient Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
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

        {/* Modal Body Content */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-300">Retrieving task logs & analyzing stack trace...</p>
            <p className="text-xs text-slate-500 mt-1">Extracting root cause & remediation steps</p>
          </div>
        ) : diagnosis ? (
          <div className="py-5 space-y-4">
            
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

          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
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
