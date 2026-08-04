import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastNotification({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md">
      <div className={`glass-panel p-4 rounded-2xl shadow-2xl border flex items-center space-x-3.5 backdrop-blur-2xl transition-all ${
        isSuccess
          ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-200'
          : isError
          ? 'bg-rose-900/40 border-rose-500/40 text-rose-200'
          : 'bg-slate-900/40 border-cyan-500/40 text-cyan-200'
      }`}>
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-cyan-400 shrink-0" />}
        
        <div className="flex-1">
          <p className="text-xs font-semibold">{toast.message}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
