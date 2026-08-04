import React, { useState } from 'react';
import { PieChart, BarChart2, CheckCircle2, PlayCircle, AlertOctagon, PauseCircle, Clock, ShieldCheck, Sparkles, Activity } from 'lucide-react';

export function MetricsCharts({ metrics, dags }) {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const total = metrics?.total_dags || dags.length || 0;
  const success = metrics?.success_dags || 0;
  const running = metrics?.running_dags || 0;
  const failed = metrics?.failed_dags || 0;
  const queued = metrics?.queued_dags || 0;
  const paused = metrics?.paused_dags || 0;

  // Calculate Success Rate Percentage
  const executedCount = success + running + failed + queued;
  const successRate = executedCount > 0 ? Math.round((success / (success + failed || 1)) * 100) : 100;

  const handleFetchAiReport = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/health-summary');
      const data = await res.json();
      setAiReport(data);
    } catch (e) {
      console.error('Failed to fetch AI health summary:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  // Chart data segments
  const segments = [
    { key: 'success', label: 'Success', count: success, color: '#10b981', bgClass: 'bg-emerald-500', icon: CheckCircle2 },
    { key: 'running', label: 'Running', count: running, color: '#0284c7', bgClass: 'bg-sky-500', icon: PlayCircle },
    { key: 'failed', label: 'Failed', count: failed, color: '#f43f5e', bgClass: 'bg-rose-500', icon: AlertOctagon },
    { key: 'queued', label: 'Queued', count: queued, color: '#f59e0b', bgClass: 'bg-amber-500', icon: Clock },
    { key: 'paused', label: 'Paused', count: paused, color: '#64748b', bgClass: 'bg-slate-500', icon: PauseCircle },
  ].filter(s => total > 0);

  // Compute SVG Donut paths
  let cumulativePercent = 0;
  const radius = 65;
  const circumference = 2 * Math.PI * radius; // ~408.4

  const donutSegments = segments.map((seg) => {
    const percent = total > 0 ? seg.count / total : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += percent;
    return { ...seg, percent, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      
      {/* 1. Interactive Donut Distribution Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">DAG State Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Proportional breakdown of current DAG states</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFetchAiReport}
              disabled={loadingAi}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 border border-cyan-500/30 transition active:scale-95"
              title="Generate AI Executive Health Report"
            >
              <Sparkles className={`w-3.5 h-3.5 text-cyan-500 ${loadingAi ? 'animate-spin' : 'animate-pulse'}`} />
              <span>AI Insights</span>
            </button>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{successRate}% Success</span>
            </span>
          </div>
        </div>

        {/* AI Health Report Panel Popup */}
        {aiReport && (
          <div className="mb-4 p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-slate-200 text-xs animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="font-bold text-cyan-400 flex items-center space-x-1">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>AI Executive Cluster Health: {aiReport.health_score}% ({aiReport.status_label})</span>
              </span>
              <button onClick={() => setAiReport(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <ul className="space-y-1 list-disc list-inside text-slate-300 font-mono">
              {aiReport.highlights.map((h, idx) => (
                <li key={idx}>{h}</li>
              ))}
              {aiReport.recommendations.map((r, idx) => (
                <li key={`r-${idx}`} className="text-cyan-300">💡 {r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-around my-2 gap-6">
          {/* SVG Donut */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background Track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="18"
                fill="transparent"
              />
              {/* Segment Arcs */}
              {donutSegments.map((seg, idx) => {
                const isHovered = hoveredSegment === seg.key;
                return (
                  <circle
                    key={idx}
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke={seg.color}
                    strokeWidth={isHovered ? "22" : "18"}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    fill="transparent"
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredSegment(seg.key)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                );
              })}
            </svg>

            {/* Inner Core Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                {hoveredSegment ? (segments.find(s => s.key === hoveredSegment)?.count ?? 0) : total}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {hoveredSegment ? hoveredSegment : 'Total DAGs'}
              </span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            {segments.map((seg, idx) => {
              const Icon = seg.icon;
              const isHovered = hoveredSegment === seg.key;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredSegment(seg.key)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={`flex items-center space-x-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                    isHovered ? 'bg-slate-100 dark:bg-slate-800 scale-105 shadow-sm' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${seg.bgClass}`} />
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                      <span>{seg.label}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                      {seg.count} ({Math.round(seg.percent * 100)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Visual Horizontal Execution Bar Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Execution Volume Comparison</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Comparative workload distribution across status states</p>
            </div>
          </div>
        </div>

        {/* Workload Progress Bars */}
        <div className="space-y-3.5 my-auto">
          {segments.map((seg, idx) => {
            const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span className="flex items-center space-x-1">
                    <span className={`w-2 h-2 rounded-full ${seg.bgClass}`} />
                    <span>{seg.label}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{seg.count} DAGs ({pct}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${seg.bgClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Active Pipeline Cluster Load</span>
          <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{total} Total Tracked DAGs</span>
        </div>
      </div>

    </div>
  );
}
