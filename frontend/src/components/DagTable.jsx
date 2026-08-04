import React, { useState } from 'react';
import { Play, Pause, Power, Clock, Tag, User, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Copy, Check, Square, Sparkles } from 'lucide-react';
import { formatRelativeTime, formatAbsoluteDate, getStateBadgeConfig } from '../utils/formatters';

export function DagTable({ 
  dags, 
  loading, 
  onTogglePause, 
  onOpenTriggerModal,
  onStopDag,
  onDiagnose,
  sortBy,
  setSortBy,
  onToast
}) {
  const [togglingDagId, setTogglingDagId] = useState(null);
  const [copiedDagId, setCopiedDagId] = useState(null);
  const [stoppingDagId, setStoppingDagId] = useState(null);

  const handleStop = async (dagId, dagRunId) => {
    setStoppingDagId(dagId);
    try {
      if (onStopDag) {
        await onStopDag(dagId, dagRunId);
      }
    } finally {
      setStoppingDagId(null);
    }
  };

  const handleToggle = async (dagId, isPaused) => {
    setTogglingDagId(dagId);
    try {
      await onTogglePause(dagId, isPaused);
      if (onToast) {
        onToast({
          type: 'success',
          message: `DAG "${dagId}" ${isPaused ? 'unpaused' : 'paused'} successfully!`
        });
      }
    } catch (err) {
      if (onToast) {
        onToast({
          type: 'error',
          message: err.message || `Failed to update pause state for ${dagId}`
        });
      }
    } finally {
      setTogglingDagId(null);
    }
  };

  const handleCopyDagId = (dagId) => {
    try {
      navigator.clipboard.writeText(dagId);
      setCopiedDagId(dagId);
      if (onToast) {
        onToast({ type: 'success', message: `Copied "${dagId}" to clipboard!` });
      }
      setTimeout(() => setCopiedDagId(null), 2000);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  const handleToggleDateSort = () => {
    if (!setSortBy) return;
    setSortBy(prev => prev === 'date-desc' ? 'date-asc' : 'date-desc');
  };

  if (loading && dags.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading Airflow DAG metrics...</p>
      </div>
    );
  }

  if (dags.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center">
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No DAGs found</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try clearing your search query or selecting a different status filter.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800/80 relative z-10">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <th className="py-4 px-6">DAG Identifier</th>
              <th className="py-4 px-4 text-center">State / Pause</th>
              <th className="py-4 px-4">Last Run State</th>
              <th className="py-4 px-4">Relative Time</th>
              <th className="py-4 px-4">Schedule</th>
              <th 
                onClick={handleToggleDateSort}
                className="py-4 px-4 cursor-pointer select-none hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                title="Click to toggle sorting by Last Run Date"
              >
                <div className="flex items-center space-x-1">
                  <span>Last Run Date</span>
                  {sortBy === 'date-desc' && <ArrowDown className="w-3.5 h-3.5 text-cyan-500 font-bold" />}
                  {sortBy === 'date-asc' && <ArrowUp className="w-3.5 h-3.5 text-cyan-500 font-bold" />}
                  {sortBy !== 'date-desc' && sortBy !== 'date-asc' && <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
                </div>
              </th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-sm">
            {dags.map((dag) => {
              const stateConfig = getStateBadgeConfig(dag.last_run_state);
              const isToggling = togglingDagId === dag.dag_id;

              return (
                <tr 
                  key={dag.dag_id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150 group"
                >
                  {/* DAG ID + Copy Button + Tags & Owner */}
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {dag.dag_id}
                        </span>
                        <button
                          onClick={() => handleCopyDagId(dag.dag_id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-500"
                          title="Copy DAG ID"
                        >
                          {copiedDagId === dag.dag_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {dag.owners && dag.owners.length > 0 && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{dag.owners.join(', ')}</span>
                          </span>
                        )}
                        {dag.tags && dag.tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                            <Tag className="w-2.5 h-2.5 opacity-60" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Pause / Unpause Toggle Switch */}
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleToggle(dag.dag_id, dag.is_paused)}
                      disabled={isToggling}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                        !dag.is_paused ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={dag.is_paused ? "Click to Unpause DAG" : "Click to Pause DAG"}
                    >
                      <span className="sr-only">Toggle DAG Pause</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          !dag.is_paused ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div className="text-[10px] font-semibold tracking-wider uppercase mt-1 text-slate-400">
                      {dag.is_paused ? 'Paused' : 'Active'}
                    </div>
                  </td>

                  {/* Last Run State Badge + AI Diagnose Button */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${stateConfig.bgClass}`}>
                        <span className={`w-2 h-2 rounded-full ${stateConfig.dotClass}`} />
                        <span>{stateConfig.label}</span>
                      </span>

                      {((dag.last_run_state || '').toLowerCase() === 'failed' || (dag.last_run_state || '').toLowerCase() === 'upstream_failed') && (
                        <button
                          onClick={() => onDiagnose && onDiagnose(dag.dag_id, dag.last_run_id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition active:scale-95 shadow-sm"
                          title="Diagnose error root cause with AI"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                          <span>Diagnose</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Relative Last Run Time */}
                  <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatRelativeTime(dag.last_run_time)}</span>
                    </div>
                  </td>

                  {/* Schedule Interval */}
                  <td className="py-4 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {dag.schedule_interval || '@daily'}
                  </td>

                  {/* Last Run Date */}
                  <td className="py-4 px-4 font-mono text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                    {formatAbsoluteDate(dag.last_run_time)}
                  </td>

                  {/* Action Button: Dynamic Stop DAG (when running) vs Trigger DAG (when idle) */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end">
                      {((dag.last_run_state || '').toLowerCase() === 'running' || (dag.last_run_state || '').toLowerCase() === 'queued') ? (
                        /* Stop / Cancel DAG Run Button (Visible only when DAG is running or queued) */
                        <button
                          onClick={() => handleStop(dag.dag_id, dag.last_run_id)}
                          disabled={stoppingDagId === dag.dag_id}
                          className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-95 shadow-sm shadow-rose-500/20 transition-all duration-150 whitespace-nowrap disabled:opacity-50"
                          title="Stop / Cancel active DAG execution"
                        >
                          {stoppingDagId === dag.dag_id ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Square className="w-3 h-3 fill-current" />
                          )}
                          <span>Stop DAG</span>
                        </button>
                      ) : (
                        /* Trigger DAG Execution Button (Visible when DAG is not running) */
                        <button
                          onClick={() => onOpenTriggerModal(dag.dag_id)}
                          className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 active:scale-95 shadow-sm shadow-cyan-500/20 transition-all duration-150 whitespace-nowrap"
                          title="Trigger DAG Execution"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Trigger DAG</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
