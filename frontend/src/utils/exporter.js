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
 * Exports current DAG metrics table data into an Excel (.xlsx) workbook with 2 sheets:
 * Sheet 1: "DAG Metrics" (Module, Tasks, Frequency, Status, Last Run State, Last run date)
 * Sheet 2: "Frequency Reference" (Weekly vs Monthly schedule breakdown reference)
 */
export function exportToExcel(dags, filenamePrefix = 'Airflow_DAG_Metrics') {
  if (!dags || dags.length === 0) return;

  // Sheet 1: Main DAG Metrics (matching user reference CSV format)
  const sheet1Data = dags.map(dag => {
    const { module, frequency } = getDagModuleAndFrequency(dag.dag_id, dag.schedule_interval);
    return {
      'Module': module,
      'Tasks': dag.dag_id,
      'Frequency': frequency,
      'Status': dag.is_paused ? 'Paused' : 'Active',
      'Last Run State': dag.last_run_state || 'none',
      'Last run date': formatAbsoluteDate(dag.last_run_time)
    };
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

  // Auto column widths
  ws1['!cols'] = [
    { wch: 18 }, // Module
    { wch: 38 }, // Tasks
    { wch: 14 }, // Frequency
    { wch: 12 }, // Status
    { wch: 16 }, // Last Run State
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
