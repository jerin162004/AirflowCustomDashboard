import * as XLSX from 'xlsx';
import { formatAbsoluteDate } from './formatters';

/**
 * Extracts Module and Frequency for a DAG based on user rules (client-side fallback):
 * - Weekly: booking, hotels.com / hotel, priceline
 * - Monthly: tripadvisor, airbnb, google, oag
 */
export function getDagModuleAndFrequency(dagId, scheduleInterval) {
  const lower = (dagId || '').toLowerCase();
  
  // Weekly rules
  if (lower.includes('booking')) return { module: 'booking', frequency: 'Weekly' };
  if (lower.includes('priceline')) return { module: 'priceline', frequency: 'Weekly' };
  if (lower.includes('hotel') || lower.includes('hotels')) return { module: 'hotels.com', frequency: 'Weekly' };

  // Monthly rules
  if (lower.includes('tripadvisor')) return { module: 'tripadvisor', frequency: 'Monthly' };
  if (lower.includes('airbnb')) return { module: 'airbnb', frequency: 'Monthly' };
  if (lower.includes('google')) return { module: 'google', frequency: 'Monthly' };
  if (lower.includes('oag')) return { module: 'oag', frequency: 'Monthly' };

  // Fallback module name from DAG ID prefix
  const parts = lower.split('_');
  let moduleName = parts[0] || 'general';
  if (moduleName.length <= 2 && parts.length > 1) {
    moduleName = `${parts[0]}_${parts[1]}`;
  }

  // Fallback frequency from schedule
  let frequency = 'Daily';
  if (scheduleInterval) {
    const sched = String(scheduleInterval).toLowerCase();
    if (sched.includes('weekly') || sched.includes('@weekly')) frequency = 'Weekly';
    else if (sched.includes('monthly') || sched.includes('@monthly')) frequency = 'Monthly';
    else if (sched.includes('hourly') || sched.includes('@hourly')) frequency = 'Hourly';
  }

  return { module: moduleName, frequency };
}

/**
 * Exports current DAG metrics table data into an Excel (.xlsx) workbook.
 * Columns: Module | Tasks | Frequency | Status | Last run date
 * Uses backend provided module & frequency properties.
 */
export function exportToExcel(dags, filenamePrefix = 'Airflow_DAG_Metrics') {
  if (!dags || dags.length === 0) return;

  // 1. Group DAGs by Module using backend API properties
  const groupedModules = {};
  dags.forEach(dag => {
    const fallback = getDagModuleAndFrequency(dag.dag_id, dag.schedule_interval);
    const module = dag.module || fallback.module;
    const frequency = dag.frequency || fallback.frequency;

    if (!groupedModules[module]) {
      groupedModules[module] = [];
    }
    groupedModules[module].push({
      ...dag,
      module,
      frequency
    });
  });

  // 2. Build rows with Module populated on EVERY row
  const sheet1Data = [];
  const merges = [];
  let currentRowIndex = 1; // Row 0 is header row

  Object.keys(groupedModules).forEach(moduleName => {
    const items = groupedModules[moduleName];
    const groupSize = items.length;

    if (groupSize > 1) {
      merges.push({
        s: { r: currentRowIndex, c: 0 },
        e: { r: currentRowIndex + groupSize - 1, c: 0 }
      });
    }

    items.forEach((item) => {
      sheet1Data.push({
        'Module': item.module,
        'Tasks': item.dag_id,
        'Frequency': item.frequency,
        'Status': item.is_paused ? 'Paused' : 'Active',
        'Last run date': formatAbsoluteDate(item.last_run_time)
      });
    });

    currentRowIndex += groupSize;
  });

  const workbook = XLSX.utils.book_new();

  // Create Worksheet
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);

  // Apply cell merges
  ws1['!merges'] = merges;

  // Auto column widths
  ws1['!cols'] = [
    { wch: 22 }, // Module
    { wch: 38 }, // Tasks
    { wch: 14 }, // Frequency
    { wch: 12 }, // Status
    { wch: 28 }  // Last run date
  ];

  XLSX.utils.book_append_sheet(workbook, ws1, 'DAG Metrics');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${today}.xlsx`);
}
