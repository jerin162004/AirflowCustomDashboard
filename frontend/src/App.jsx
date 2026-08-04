import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useDashboardData } from './hooks/useDashboardData';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { MetricsCharts } from './components/MetricsCharts';
import { DagFilters } from './components/DagFilters';
import { DagTable } from './components/DagTable';
import { TriggerModal } from './components/TriggerModal';
import { ToastNotification } from './components/ToastNotification';
import { AiDiagnosisModal } from './components/AiDiagnosisModal';
import { ChatOpsBar } from './components/ChatOpsBar';
import { exportToExcel } from './utils/exporter';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const {
    metrics,
    dags,
    isMock,
    loading,
    error,
    isTabHidden,
    secondsUntilNextFetch,
    isAutoRefreshPaused,
    toggleAutoRefresh,
    refetch,
    togglePause,
    triggerDag,
    stopDag
  } = useDashboardData();

  // Local filter & sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Modal & Assistant states
  const [activeTriggerDagId, setActiveTriggerDagId] = useState(null);
  const [isChatOpsOpen, setIsChatOpsOpen] = useState(false);
  const [diagnosisState, setDiagnosisState] = useState({ isOpen: false, loading: false, data: null });
  const [toast, setToast] = useState(null);

  // Keyboard shortcut for ChatOps (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsChatOpsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (toastObj) => {
    setToast(toastObj);
    setTimeout(() => setToast(null), 4000);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredDags);
    showToast({
      type: 'success',
      message: `Exported ${filteredDags.length} DAG record(s) to Excel CSV file!`
    });
  };

  const handleTriggerDag = async (dagId, logicalDate, conf) => {
    try {
      const res = await triggerDag(dagId, logicalDate, conf);
      showToast({
        type: 'success',
        message: `Triggered DAG "${dagId}" successfully!`
      });
      return res;
    } catch (err) {
      showToast({
        type: 'error',
        message: err.message || `Failed to trigger DAG "${dagId}"`
      });
      throw err;
    }
  };

  const handleStopDag = async (dagId, dagRunId) => {
    try {
      const res = await stopDag(dagId, dagRunId);
      showToast({
        type: 'success',
        message: `Stopped DAG "${dagId}" run successfully!`
      });
      return res;
    } catch (err) {
      showToast({
        type: 'error',
        message: err.message || `Failed to stop DAG "${dagId}"`
      });
    }
  };

  const handleOpenDiagnosis = async (dagId, dagRunId) => {
    setDiagnosisState({ isOpen: true, loading: true, data: { dag_id: dagId, dag_run_id: dagRunId } });
    try {
      const res = await fetch(`/api/dags/${encodeURIComponent(dagId)}/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dag_run_id: dagRunId })
      });
      const data = await res.json();
      setDiagnosisState({ isOpen: true, loading: false, data });
    } catch (err) {
      console.error('Diagnosis fetch failed:', err);
      showToast({ type: 'error', message: 'Failed to retrieve AI diagnosis' });
      setDiagnosisState({ isOpen: false, loading: false, data: null });
    }
  };

  const handleExecuteChatOps = (cmd) => {
    if (!cmd || !cmd.action) return;

    if (cmd.action === 'filter_status') {
      setStatusFilter(cmd.details?.status_filter || 'all');
      showToast({ type: 'info', message: cmd.message });
    } else if (cmd.action === 'search_query') {
      setSearchQuery(cmd.details?.search_query || '');
      showToast({ type: 'info', message: cmd.message });
    } else if (cmd.action === 'trigger_dag' && cmd.target_dag_id) {
      setActiveTriggerDagId(cmd.target_dag_id);
      setIsChatOpsOpen(false);
    } else if (cmd.action === 'stop_dag' && cmd.target_dag_id) {
      handleStopDag(cmd.target_dag_id);
      setIsChatOpsOpen(false);
    } else if (cmd.action === 'diagnose_dag' && cmd.target_dag_id) {
      handleOpenDiagnosis(cmd.target_dag_id);
      setIsChatOpsOpen(false);
    }
  };

  // Real-time filtering & sorting logic
  const filteredDags = useMemo(() => {
    const list = dags.filter((dag) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        dag.dag_id.toLowerCase().includes(q) ||
        (dag.tags && dag.tags.some(t => String(t).toLowerCase().includes(q)));

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'paused') return dag.is_paused;
      
      const lastState = (dag.last_run_state || 'none').toLowerCase();
      if (statusFilter === 'running') return lastState === 'running';
      if (statusFilter === 'failed') return lastState === 'failed' || lastState === 'upstream_failed';
      if (statusFilter === 'success') return lastState === 'success';
      if (statusFilter === 'queued') return lastState === 'queued' || lastState === 'scheduled';

      return true;
    });

    return list.sort((a, b) => {
      const timeA = a.last_run_time ? new Date(a.last_run_time).getTime() : 0;
      const timeB = b.last_run_time ? new Date(b.last_run_time).getTime() : 0;

      if (sortBy === 'date-desc') return timeB - timeA;
      if (sortBy === 'date-asc') return timeA - timeB;
      if (sortBy === 'id-asc') return a.dag_id.localeCompare(b.dag_id);
      if (sortBy === 'id-desc') return b.dag_id.localeCompare(a.dag_id);
      return 0;
    });
  }, [dags, searchQuery, statusFilter, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-16">
      
      {/* Top Navigation Header */}
      <Header
        isDark={isDark}
        toggleTheme={toggleTheme}
        secondsUntilNextFetch={secondsUntilNextFetch}
        isTabHidden={isTabHidden}
        isMock={isMock}
        refetch={refetch}
        loading={loading}
        isAutoRefreshPaused={isAutoRefreshPaused}
        toggleAutoRefresh={toggleAutoRefresh}
        onOpenChatOps={() => setIsChatOpsOpen(true)}
      />

      {/* Main Content Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* AI Natural Language ChatOps Assistant Bar (Ctrl + K) */}
        <ChatOpsBar
          isOpen={isChatOpsOpen}
          onClose={() => setIsChatOpsOpen(false)}
          onExecuteCommand={handleExecuteChatOps}
        />

        {/* Error Notification Alert Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <h4 className="text-sm font-bold">Backend Connection Warning</h4>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>
            <button
              onClick={refetch}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold flex items-center space-x-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Top Interactive KPI Cards Overview */}
        <KpiCards 
          metrics={metrics} 
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        {/* Visual Metrics & Graph Section */}
        <MetricsCharts metrics={metrics} dags={dags} />

        {/* Filters & Search Control Bar */}
        <DagFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          totalCount={dags.length}
          filteredCount={filteredDags.length}
          onExportExcel={handleExportExcel}
          dags={dags}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {/* Executive DAGs Table */}
        <DagTable
          dags={filteredDags}
          loading={loading}
          onTogglePause={togglePause}
          onOpenTriggerModal={(dagId) => setActiveTriggerDagId(dagId)}
          onStopDag={handleStopDag}
          onDiagnose={handleOpenDiagnosis}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onToast={showToast}
        />

      </main>

      {/* Trigger DAG Modal */}
      <TriggerModal
        isOpen={Boolean(activeTriggerDagId)}
        onClose={() => setActiveTriggerDagId(null)}
        dagId={activeTriggerDagId}
        onTrigger={handleTriggerDag}
      />

      {/* AI Automated Error Diagnosis Modal */}
      <AiDiagnosisModal
        isOpen={diagnosisState.isOpen}
        onClose={() => setDiagnosisState({ isOpen: false, loading: false, data: null })}
        diagnosis={diagnosisState.data}
        loading={diagnosisState.loading}
        onReTrigger={(dagId) => setActiveTriggerDagId(dagId)}
        onToast={showToast}
      />

      {/* Interactive Floating Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

    </div>
  );
}
