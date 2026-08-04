import React, { useState } from 'react';
import { Play, X, AlertCircle } from 'lucide-react';

export function TriggerModal({ isOpen, onClose, dagId, onTrigger }) {
  const [logicalDate, setLogicalDate] = useState('');
  const [confJson, setConfJson] = useState('{}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    let parsedConf = null;
    if (confJson.trim()) {
      try {
        parsedConf = JSON.parse(confJson);
      } catch (err) {
        setErrorMsg('Invalid JSON format in configuration object');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await onTrigger(dagId, logicalDate || null, parsedConf);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to trigger DAG execution');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Trigger DAG Run</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[220px]">{dagId}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {errorMsg && (
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Logical Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={logicalDate}
              onChange={(e) => setLogicalDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">Leave empty to run with current UTC timestamp.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Configuration JSON (conf)
            </label>
            <textarea
              rows={4}
              value={confJson}
              onChange={(e) => setConfJson(e.target.value)}
              placeholder='{"key": "value"}'
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-md shadow-cyan-500/20 disabled:opacity-50 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSubmitting ? 'Triggering...' : 'Trigger DAG'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
