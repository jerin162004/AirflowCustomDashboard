import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = '/api';
const POLL_INTERVAL_MS = 15000; // 15 Seconds

export function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTabHidden, setIsTabHidden] = useState(document.hidden);
  const [secondsUntilNextFetch, setSecondsUntilNextFetch] = useState(15);
  const [isAutoRefreshPaused, setIsAutoRefreshPaused] = useState(false);
  
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard-summary`);
      if (!response.ok) {
        throw new Error(`Proxy backend error: ${response.statusText}`);
      }
      const json = await response.json();
      setData(json);
      setError(null);
      setSecondsUntilNextFetch(15);
    } catch (err) {
      console.error('Failed to fetch Airflow dashboard summary:', err);
      setError(err.message || 'Unable to connect to backend caching proxy');
    } finally {
      setLoading(false);
    }
  }, []);

  // Action: Toggle DAG Pause state
  const togglePause = async (dagId, currentIsPaused) => {
    // Optimistic UI update
    setData(prev => {
      if (!prev) return prev;
      const updatedDags = prev.dags.map(d => 
        d.dag_id === dagId ? { ...d, is_paused: !currentIsPaused, is_active: currentIsPaused } : d
      );
      const activeCount = updatedDags.filter(d => !d.is_paused).length;
      const pausedCount = updatedDags.filter(d => d.is_paused).length;

      return {
        ...prev,
        metrics: { ...prev.metrics, active_dags: activeCount, paused_dags: pausedCount },
        dags: updatedDags
      };
    });

    try {
      const res = await fetch(`${API_BASE_URL}/dags/${encodeURIComponent(dagId)}/pause`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paused: !currentIsPaused })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Failed to toggle pause');
      }
      // Re-sync with backend summary
      await fetchData(false);
    } catch (err) {
      console.error(`Failed to toggle pause for ${dagId}:`, err);
      // Rollback on error
      await fetchData(false);
      throw err;
    }
  };

  // Action: Trigger DAG Run
  const triggerDag = async (dagId, logicalDate = null, conf = null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/dags/${encodeURIComponent(dagId)}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logical_date: logicalDate, conf: conf })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.detail || 'Failed to trigger DAG');
      }
      // Re-sync immediately
      await fetchData(false);
      return resData;
    } catch (err) {
      console.error(`Failed to trigger DAG ${dagId}:`, err);
      throw err;
    }
  };

  // Action: Stop / Cancel DAG Run
  const stopDag = async (dagId, dagRunId = null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/dags/${encodeURIComponent(dagId)}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dag_run_id: dagRunId })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.detail || 'Failed to stop DAG run');
      }
      // Re-sync immediately
      await fetchData(false);
      return resData;
    } catch (err) {
      console.error(`Failed to stop DAG ${dagId}:`, err);
      throw err;
    }
  };

  // Tab visibility listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setIsTabHidden(hidden);
      if (!hidden && !isAutoRefreshPaused) {
        // Tab became visible again - fetch fresh summary immediately
        fetchData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, isAutoRefreshPaused]);

  // Polling mechanism (15s) with document.hidden & isAutoRefreshPaused guards
  useEffect(() => {
    // Initial fetch on mount
    fetchData(true);

    // Setup 1s countdown timer for UI
    countdownRef.current = setInterval(() => {
      if (!document.hidden && !isAutoRefreshPaused) {
        setSecondsUntilNextFetch(prev => (prev > 1 ? prev - 1 : 15));
      }
    }, 1000);

    // Setup 15s API polling interval
    timerRef.current = setInterval(() => {
      if (!document.hidden && !isAutoRefreshPaused) {
        fetchData(false);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchData, isAutoRefreshPaused]);

  return {
    metrics: data?.metrics || { total_dags: 0, active_dags: 0, paused_dags: 0, running_dags: 0, failed_dags: 0, success_dags: 0 },
    dags: data?.dags || [],
    cachedAt: data?.cached_at,
    expiresInSeconds: data?.expires_in_seconds,
    isCached: data?.is_cached,
    isMock: data?.is_mock,
    loading,
    error,
    isTabHidden,
    secondsUntilNextFetch,
    isAutoRefreshPaused,
    toggleAutoRefresh: () => setIsAutoRefreshPaused(prev => !prev),
    refetch: () => fetchData(true),
    togglePause,
    triggerDag,
    stopDag
  };
}
