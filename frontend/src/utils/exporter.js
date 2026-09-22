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
 * Specific DAG frequency overrides provided by user
 */
export const SPECIFIC_DAG_FREQUENCY_OVERRIDES = {
  'priceline_hotels_reviews': 'Monthly',
  'airbnb_listings_reviews': 'Weekly',
  'airbnb_operational_extractor_weekly': 'Weekly',
  'airbnb_weekly_stage_load': 'Weekly',
  'tripadvisor_run_actor_listings': 'Monthly',
  'tripadvisor_run_actor_reviews': 'Monthly',
  'google_maps_run_actor': 'Monthly'
};

/**
 * Strictly maps a DAG ID to its module and frequency using exact dictionary lookup & overrides
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

  // 3. Frequency mapping with specific DAG overrides FIRST
  let frequency = SPECIFIC_DAG_FREQUENCY_OVERRIDES[lower];
  if (!frequency) {
    if (['booking', 'hotelscom', 'priceline'].includes(moduleName)) {
      frequency = 'Weekly';
    } else if (['tripadvisor', 'google', 'oag', 'airbnb'].includes(moduleName)) {
      frequency = 'Monthly';
    } else if (scheduleInterval) {
      const sched = String(scheduleInterval).toLowerCase();
      if (sched.includes('weekly') || sched.includes('@weekly')) frequency = 'Weekly';
      else if (sched.includes('monthly') || sched.includes('@monthly')) frequency = 'Monthly';
      else if (sched.includes('hourly') || sched.includes('@hourly')) frequency = 'Hourly';
      else frequency = 'Daily';
    } else {
      frequency = 'Daily';
    }
  }

  return { module: moduleName, frequency };
}

/**
 * Exports DAG metrics into an Executive Styled Excel Report (.xls / .xlsx).
 * Denotes DAG Run Status as SUCCESS vs FAILED.
 */
export function exportToExcel(dags, filenamePrefix = 'Airflow_DAG_Metrics') {
  if (!dags || dags.length === 0) return;

  // 1. Group DAGs by Module and calculate KPI totals
  const groupedModules = {};
  let totalActive = 0;
  let totalPaused = 0;
  let totalWeekly = 0;
  let totalMonthly = 0;

  dags.forEach(dag => {
    const { module, frequency } = getDagModuleAndFrequency(dag.dag_id, dag.schedule_interval);
    
    if (dag.is_paused) totalPaused++;
    else totalActive++;

    if (frequency === 'Weekly') totalWeekly++;
    else if (frequency === 'Monthly') totalMonthly++;

    if (!groupedModules[module]) {
      groupedModules[module] = [];
    }
    groupedModules[module].push({
      ...dag,
      module,
      frequency
    });
  });

  const nowStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Order modules logically according to dictionary keys
  const orderedModuleKeys = [
    ...Object.keys(MODULE_DAG_ID).filter(k => k in groupedModules),
    ...Object.keys(groupedModules).filter(k => !(k in MODULE_DAG_ID))
  ];

  // 2. Build HTML Excel content with rich executive styling
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Executive DAG Metrics</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
                <x:FreezePanes/>
                <x:FrozenNoSplit/>
                <x:SplitHorizontal>7</x:SplitHorizontal>
                <x:TopRowBottomPane>7</x:TopRowBottomPane>
                <x:ActivePane>2</x:ActivePane>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        .banner { background-color: #0f172a; color: #ffffff; font-size: 15pt; font-weight: bold; padding: 14px; text-align: center; letter-spacing: 1px; }
        .kpi-title { background-color: #f1f5f9; color: #475569; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; padding: 6px; border: 1px solid #cbd5e1; text-align: center; }
        .kpi-val { background-color: #ffffff; color: #0f172a; font-size: 13pt; font-weight: bold; padding: 8px; border: 1px solid #cbd5e1; text-align: center; }
        th { background-color: #1e293b; color: #ffffff; font-size: 10.5pt; font-weight: bold; padding: 10px; border: 1px solid #334155; text-align: left; }
        td { font-size: 9.5pt; padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
        .row-even { background-color: #ffffff; }
        .row-odd { background-color: #f8fafc; }
        .module-cell { background-color: #f1f5f9; color: #0f172a; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; font-size: 10pt; }
        .badge-active { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; padding: 4px 10px; border: 1px solid #a7f3d0; }
        .badge-failed { background-color: #ffe4e6; color: #9f1239; font-weight: bold; text-align: center; padding: 4px 10px; border: 1px solid #fecdd3; }
        .badge-running { background-color: #cffafe; color: #155e75; font-weight: bold; text-align: center; padding: 4px 10px; border: 1px solid #a5f3fc; }
        .badge-queued { background-color: #fef3c7; color: #92400e; font-weight: bold; text-align: center; padding: 4px 10px; border: 1px solid #fde68a; }
        .badge-weekly { background-color: #e0f2fe; color: #0369a1; font-weight: bold; text-align: center; padding: 4px 10px; border: 1px solid #bae6fd; }
        .badge-monthly { background-color: #f3e8ff; color: #6b21a8; font-weight: bold; text-align: center; padding: 4px 10px; border: 1px solid #e9d5ff; }
        .task-cell { font-family: 'Consolas', 'Courier New', monospace; font-weight: bold; color: #1e293b; }
        .date-cell { color: #64748b; font-size: 9pt; }
      </style>
    </head>
    <body>
      <table>
        <!-- Executive Title Banner -->
        <tr>
          <td colspan="5" class="banner">
            AIRFLOW 3.2 EXECUTIVE OBSERVABILITY REPORT
          </td>
        </tr>

        <!-- Spacing Row -->
        <tr><td colspan="5" style="border:none; height:6px;"></td></tr>

        <!-- KPI Summary Cards Header -->
        <tr>
          <td class="kpi-title">TOTAL WORKFLOWS</td>
          <td class="kpi-title">ACTIVE WORKFLOWS</td>
          <td class="kpi-title">PAUSED WORKFLOWS</td>
          <td class="kpi-title">SCHEDULE FREQUENCY</td>
          <td class="kpi-title">EXPORT TIMESTAMP</td>
        </tr>
        <tr>
          <td class="kpi-val">${dags.length}</td>
          <td class="kpi-val" style="color:#059669;">${totalActive}</td>
          <td class="kpi-val" style="color:#d97706;">${totalPaused}</td>
          <td class="kpi-val" style="font-size:11pt;">${totalWeekly} Weekly / ${totalMonthly} Monthly</td>
          <td class="kpi-val" style="font-size:10pt; color:#475569;">${nowStr}</td>
        </tr>

        <!-- Spacing Row -->
        <tr><td colspan="5" style="border:none; height:10px;"></td></tr>

        <!-- Main Data Table Header -->
        <tr>
          <th style="width:160px; text-align:center;">Module</th>
          <th style="width:360px;">Tasks (DAG Identifier)</th>
          <th style="width:140px; text-align:center;">Frequency</th>
          <th style="width:120px; text-align:center;">Status</th>
          <th style="width:240px;">Last Run Date</th>
        </tr>
  `;

  let globalRowCounter = 0;

  orderedModuleKeys.forEach((moduleName) => {
    const items = groupedModules[moduleName];
    const groupSize = items.length;

    items.forEach((item, idx) => {
      const isEven = globalRowCounter % 2 === 0;
      const rowClass = isEven ? 'row-even' : 'row-odd';
      globalRowCounter++;

      const runState = (item.last_run_state || '').toLowerCase();
      let statusBadge = '<span class="badge-active">SUCCESS</span>';
      
      if (runState === 'failed' || runState === 'upstream_failed') {
        statusBadge = '<span class="badge-failed">FAILED</span>';
      } else if (runState === 'running') {
        statusBadge = '<span class="badge-running">RUNNING</span>';
      } else if (runState === 'queued') {
        statusBadge = '<span class="badge-queued">QUEUED</span>';
      } else if (item.is_paused) {
        statusBadge = '<span class="badge-failed">FAILED</span>';
      } else {
        statusBadge = '<span class="badge-active">SUCCESS</span>';
      }

      const freqBadge = item.frequency === 'Weekly'
        ? '<span class="badge-weekly">Weekly</span>'
        : (item.frequency === 'Monthly' ? '<span class="badge-monthly">Monthly</span>' : item.frequency);

      const formattedDate = formatAbsoluteDate(item.last_run_time);

      html += `<tr class="${rowClass}">`;

      // Merged Module cell for the group
      if (idx === 0) {
        html += `<td rowspan="${groupSize}" class="module-cell">${moduleName}</td>`;
      }

      html += `
        <td class="task-cell">${item.dag_id}</td>
        <td style="text-align:center;">${freqBadge}</td>
        <td style="text-align:center;">${statusBadge}</td>
        <td class="date-cell">${formattedDate}</td>
      </tr>`;
    });
  });

  html += `
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const today = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${today}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
