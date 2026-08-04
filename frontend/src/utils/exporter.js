import { formatRelativeTime, formatAbsoluteDate } from './formatters';

/**
 * Exports current DAG metrics table data into an Excel-compatible CSV file.
 */
export function exportToExcel(dags, filenamePrefix = 'Airflow_DAG_Metrics') {
  if (!dags || dags.length === 0) return;

  const headers = [
    'DAG Identifier',
    'State / Pause',
    'Last Run State',
    'Relative Time',
    'Schedule',
    'Last Run Date'
  ];

  const rows = dags.map(dag => {
    const dagId = `"${(dag.dag_id || '').replace(/"/g, '""')}"`;
    const statePause = dag.is_paused ? 'Paused' : 'Active';
    const lastRunState = dag.last_run_state || 'none';
    const relativeTime = `"${formatRelativeTime(dag.last_run_time)}"`;
    const schedule = `"${(dag.schedule_interval || '@daily').replace(/"/g, '""')}"`;
    const lastRunDate = `"${formatAbsoluteDate(dag.last_run_time)}"`;

    return [dagId, statePause, lastRunState, relativeTime, schedule, lastRunDate].join(',');
  });

  // CSV content with UTF-8 BOM so Excel opens it with proper encoding & formatting
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const today = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
