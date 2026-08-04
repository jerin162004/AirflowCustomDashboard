import React from 'react';
import { PlayCircle, AlertTriangle, CheckCircle2, PauseCircle, Layers, Filter } from 'lucide-react';

export function KpiCards({ metrics, statusFilter, setStatusFilter }) {
  const cards = [
    {
      filterKey: 'all',
      title: 'Total Active DAGs',
      value: metrics.active_dags ?? 0,
      subtext: `${metrics.paused_dags ?? 0} paused DAGs`,
      icon: Layers,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-500 dark:text-cyan-400',
      bgGlow: 'bg-cyan-500/10'
    },
    {
      filterKey: 'running',
      title: 'Currently Running',
      value: metrics.running_dags ?? 0,
      subtext: `${metrics.queued_dags ?? 0} queued in pipeline`,
      icon: PlayCircle,
      color: 'from-sky-500 to-indigo-600',
      textColor: 'text-sky-500 dark:text-sky-400',
      bgGlow: 'bg-sky-500/10',
      pulse: (metrics.running_dags ?? 0) > 0
    },
    {
      filterKey: 'failed',
      title: 'Failed DAGs Count',
      value: metrics.failed_dags ?? 0,
      subtext: (metrics.failed_dags ?? 0) > 0 ? 'Requires attention' : 'All systems operational',
      icon: AlertTriangle,
      color: 'from-rose-500 to-red-600',
      textColor: (metrics.failed_dags ?? 0) > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400',
      bgGlow: (metrics.failed_dags ?? 0) > 0 ? 'bg-rose-500/10' : 'bg-slate-500/5'
    },
    {
      filterKey: 'success',
      title: 'Successful DAG Runs',
      value: metrics.success_dags ?? 0,
      subtext: `Out of ${metrics.total_dags ?? 0} total DAGs`,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-500 dark:text-emerald-400',
      bgGlow: 'bg-emerald-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isSelected = statusFilter === card.filterKey;

        return (
          <div 
            key={idx}
            onClick={() => setStatusFilter && setStatusFilter(card.filterKey)}
            className={`glass-panel rounded-2xl p-5 relative overflow-hidden transition-all duration-200 cursor-pointer group hover:translate-y-[-2px] ${
              isSelected 
                ? 'ring-2 ring-cyan-500 shadow-cyan-500/20 shadow-lg scale-[1.02] bg-cyan-500/5' 
                : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
            }`}
            title={`Click to filter table by ${card.title}`}
          >
            {/* Top right icon badge */}
            <div className={`absolute top-4 right-4 p-2.5 rounded-xl transition-transform group-hover:scale-110 ${card.bgGlow}`}>
              <Icon className={`w-5 h-5 ${card.textColor} ${card.pulse ? 'animate-pulse' : ''}`} />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <span>{card.title}</span>
            </p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                {card.value}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
              <span>{card.subtext}</span>
              {isSelected && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 flex items-center space-x-0.5">
                  <Filter className="w-3 h-3" />
                  <span>Filtered</span>
                </span>
              )}
            </p>

            {/* Decorative bottom gradient bar */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />
          </div>
        );
      })}
    </div>
  );
}
