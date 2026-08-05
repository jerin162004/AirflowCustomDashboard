import React from 'react';
import { Sun, Moon, RefreshCw, Zap, ShieldAlert, EyeOff, Pause, Play, Sparkles } from 'lucide-react';

export function Header({ 
  isDark, 
  toggleTheme, 
  secondsUntilNextFetch, 
  isTabHidden, 
  isMock, 
  refetch, 
  loading,
  isAutoRefreshPaused,
  toggleAutoRefresh,
  onOpenChatOps
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/90 px-6 py-3.5 transition-colors duration-200 shadow-xl shadow-slate-950/20">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left: Brand & Airflow Version Badge */}
        <div className="flex items-center space-x-4">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                Airflow Executive Dashboard
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                v3.2
              </span>
            </div>
          </div>
        </div>

        {/* Right: Status Indicators, Auto-Refresh Toggle, Manual Refresh & Theme Toggle */}
        <div className="flex items-center space-x-3">
          
          {/* Tab Hidden Warning Indicator */}
          {isTabHidden ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium border border-amber-500/20">
              <EyeOff className="w-3.5 h-3.5 animate-pulse" />
              <span>Polling Paused (Tab Hidden)</span>
            </div>
          ) : (
            /* Cache TTL Countdown & Auto-Refresh Pause Toggle Button */
            <button
              onClick={toggleAutoRefresh}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 active:scale-95 ${
                isAutoRefreshPaused
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={isAutoRefreshPaused ? "Click to Resume Auto-Refresh" : "Click to Pause Auto-Refresh"}
            >
              {isAutoRefreshPaused ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>Auto-Refresh <strong className="font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Paused</strong></span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Cache Refresh in <strong className="font-mono text-cyan-600 dark:text-cyan-400">{secondsUntilNextFetch}s</strong></span>
                  <Pause className="w-3 h-3 text-slate-400 ml-1 hover:text-cyan-500" />
                </>
              )}
            </button>
          )}

          {/* Mock Fallback Indicator */}
          {isMock && (
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium border border-indigo-500/20" title="Airflow offline - demonstrating with mock data">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Mock API Mode</span>
            </div>
          )}

          {/* AI ChatOps Assistant Button */}
          <button
            onClick={onOpenChatOps}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all duration-150 active:scale-95 shadow-sm"
            title="Open AI Natural Language ChatOps Bar (Ctrl + K)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
            <span className="hidden sm:inline">AI ChatOps</span>
            <span className="text-[10px] opacity-60 font-mono px-1 py-0.5 rounded bg-cyan-500/20">Ctrl+K</span>
          </button>

          {/* Manual Refetch Button */}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-150 disabled:opacity-50"
            title="Force refresh backend summary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-150"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>

      </div>
    </header>
  );
}
