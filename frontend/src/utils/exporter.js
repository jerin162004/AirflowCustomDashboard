import * as XLSX from 'xlsx';
import { formatAbsoluteDate } from './formatters';

/**
 * Authoritative Module to DAG ID Mapping Dictionary provided by user
 */
export const MODULE_DAG_ID = {
  'tripadvisor': [
    'tripadvisor_archieve_load',
    'tripadvisor_transform_data',
    'tripadvisor_reviews_extractor',
    'tripadvisor_run_actor_reviews',
    'tripadvisor_listings_extractor',
    'tripadvisor_run_actor_listings'
  ],
  'booking': [
    'booking_hotels_rooms',
    'booking_hotels_extractor',
    'booking_hotels_license',
    'booking_hotels_details',
    'booking_hotels_search',
    'booking_download_cities',
    'booking_hotels_reviews',
    'booking_archieve_load',
    'booking_hotels_review_categories'
  ],
  'hotelscom': [
    'hotelscom_hotels_extractor',
    'hotelscom_hotels_reviews',
    'hotelscom_hotels_rooms',
    'hotelscom_hotels_details',
    'hotelscom_hotels_search',
    'hotelscom_download_regions',
    'hotelscom_archieve_load'
  ],
  'priceline': [
    'priceline_hotels_extractor',
    'priceline_hotels_details',
    'priceline_hotels_search',
    'priceline_hotels_locations',
    'priceline_hotels_reviews',
    'priceline_download_cities',
    'priceline_archieve_load'
  ],
  'google': [
    'google_maps_run_actor',
    'google_maps_stage_load',
    'google_maps_extractor',
    'google_maps_archieve_load'
  ],
  'oag': [
    'oag_stage_load',
    'oag_archieve_load'
  ],
  'airbnb': [
    'airbnb_operational_extractor_weekly',
    'airbnb_operational_extractor_monthly',
    'airbnb_listings_reviews',
    'airbnb_metabase_listings_extractor',
    'airbnb_metabase_operational_extractor',
    'airbnb_operational_extractor_daily',
    'airbnb_weekly_archieve_load',
    'airbnb_weekly_stage_load'
  ]
};

/**
 * Strictly maps a DAG ID to its module and frequency using exact dictionary lookup
 */
export function getDagModuleAndFrequency(dagId, scheduleInterval) {
  const cleanId = (dagId || '').trim();
  const lower = cleanId.toLowerCase();

  // 1. Strict exact dictionary lookup FIRST
  let moduleName = null;
  for (const [mod, dagList] of Object.entries(MODULE_DAG_ID)) {
    if (dagList.some(d => d.toLowerCase() === lower)) {
      moduleName = mod;
      break;
    }
  }

  // 2. Strict prefix matching fallback if exact match not found
  if (!moduleName) {
    if (lower.startsWith('priceline')) moduleName = 'priceline';
    else if (lower.startsWith('hotelscom')) moduleName = 'hotelscom';
    else if (lower.startsWith('booking')) moduleName = 'booking';
    else if (lower.startsWith('tripadvisor')) moduleName = 'tripadvisor';
    else if (lower.startsWith('google')) moduleName = 'google';
    else if (lower.startsWith('oag')) moduleName = 'oag';
    else if (lower.startsWith('airbnb')) moduleName = 'airbnb';
    else {
      const parts = lower.split('_');
      moduleName = parts[0] || 'general';
    }
  }

  // Frequency mapping:
  // Weekly: booking, hotelscom, priceline
  // Monthly: tripadvisor, google, oag, airbnb
  let frequency = 'Daily';
  if (['booking', 'hotelscom', 'priceline'].includes(moduleName)) {
    frequency = 'Weekly';
  } else if (['tripadvisor', 'google', 'oag', 'airbnb'].includes(moduleName)) {
    frequency = 'Monthly';
  } else if (scheduleInterval) {
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
 * Uses strict dictionary lookup so priceline DAGs are NEVER placed under hotelscom.
 */
export function exportToExcel(dags, filenamePrefix = 'Airflow_DAG_Metrics') {
  if (!dags || dags.length === 0) return;

  // 1. Group DAGs by Module using strict dictionary mapping
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

  // 2. Build rows with Module populated on EVERY row
  const sheet1Data = [];
  const merges = [];
  let currentRowIndex = 1; // Row 0 is header row

  // Order modules logically according to dictionary keys
  const orderedModuleKeys = [
    ...Object.keys(MODULE_DAG_ID).filter(k => k in groupedModules),
    ...Object.keys(groupedModules).filter(k => !(k in MODULE_DAG_ID))
  ];

  orderedModuleKeys.forEach(moduleName => {
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
    { wch: 42 }, // Tasks
    { wch: 14 }, // Frequency
    { wch: 12 }, // Status
    { wch: 28 }  // Last run date
  ];

  XLSX.utils.book_append_sheet(workbook, ws1, 'DAG Metrics');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${today}.xlsx`);
}
