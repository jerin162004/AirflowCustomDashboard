import * as XLSX from 'xlsx';
import { formatAbsoluteDate } from './formatters';

/**
 * Extracts Module and Frequency for a DAG based on user rules:
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
  const moduleName = parts[0] || 'general';

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
 * Matches exact layout from screenshot:
 * Columns: Module | Tasks | Frequency | Status | Last run date
 * Grouped and merged by Module name.
 */
export function exportToExcel(dags, filenamePrefix = 'Airflow_DAG_Metrics') {
  if (!dags || dags.length === 0) return;

  // 1. Group DAGs by Module
  const groupedModules = {};
  dags.forEach(dag => {
    const { module, frequency } = getDagModuleAndFrequency(dag.dag_id, dag.schedule_interval);
    if (!groupedModules[module]) {
      groupedModules[module] = [];
    }
    groupedModules[module].push({
      ...dag,
      module,
      frequency
    });
  });

  // 2. Build grouped rows and cell merges
  const sheet1Data = [];
  const merges = [];
  let currentRowIndex = 1; // Row 0 is header row

  Object.keys(groupedModules).forEach(moduleName => {
    const items = groupedModules[moduleName];
    const groupSize = items.length;
    const midIndex = Math.floor(groupSize / 2);

    if (groupSize > 1) {
      merges.push({
        s: { r: currentRowIndex, c: 0 },
        e: { r: currentRowIndex + groupSize - 1, c: 0 }
      });
    }

    items.forEach((item, index) => {
      sheet1Data.push({
        'Module': index === midIndex ? moduleName : '',
        'Tasks': item.dag_id,
        'Frequency': item.frequency,
        'Status': item.is_paused ? 'Paused' : 'Active',
        'Last run date': formatAbsoluteDate(item.last_run_time)
      });
    });

    currentRowIndex += groupSize;
  });

  // Sheet 2: Frequency Reference Breakdown
  const weeklyDags = dags.filter(dag => getDagModuleAndFrequency(dag.dag_id, dag.schedule_interval).frequency === 'Weekly');
  const monthlyDags = dags.filter(dag => getDagModuleAndFrequency(dag.dag_id, dag.schedule_interval).frequency === 'Monthly');
  const otherDags = dags.filter(dag => {
    const freq = getDagModuleAndFrequency(dag.dag_id, dag.schedule_interval).frequency;
    return freq !== 'Weekly' && freq !== 'Monthly';
  });

  const sheet2Data = [
    {
      'Frequency Category': 'Weekly Tasks (booking, hotels.com, priceline)',
      'Total Tasks': weeklyDags.length,
      'Task List': weeklyDags.map(d => d.dag_id).join(', ') || 'None'
    },
    {
      'Frequency Category': 'Monthly Tasks (tripadvisor, airbnb, google, oag)',
      'Total Tasks': monthlyDags.length,
      'Task List': monthlyDags.map(d => d.dag_id).join(', ') || 'None'
    },
    {
      'Frequency Category': 'Daily / Other Schedule Tasks',
      'Total Tasks': otherDags.length,
      'Task List': otherDags.map(d => d.dag_id).join(', ') || 'None'
    }
  ];

  const workbook = XLSX.utils.book_new();

  // Create Worksheets
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);

  // Apply cell merges to Sheet 1
  ws1['!merges'] = merges;

  // Auto column widths
  ws1['!cols'] = [
    { wch: 18 }, // Module
    { wch: 38 }, // Tasks
    { wch: 14 }, // Frequency
    { wch: 12 }, // Status
    { wch: 28 }  // Last run date
  ];

  ws2['!cols'] = [
    { wch: 48 }, // Category
    { wch: 14 }, // Total Tasks
    { wch: 80 }  // Task List
  ];

  XLSX.utils.book_append_sheet(workbook, ws1, 'DAG Metrics');
  XLSX.utils.book_append_sheet(workbook, ws2, 'Frequency Reference');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${today}.xlsx`);
}
