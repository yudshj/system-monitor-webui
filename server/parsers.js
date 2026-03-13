/** SMART attribute explanations */
export const SMART_EXPLANATIONS = {
  1:   { name: 'Raw_Read_Error_Rate',       desc: 'Rate of hardware read errors. Vendor-specific; high raw values may be normal for some drives.' },
  2:   { name: 'Throughput_Performance',     desc: 'Overall throughput performance of the drive. Lower values indicate degradation.' },
  3:   { name: 'Spin_Up_Time',              desc: 'Average time (ms) for the spindle to spin up to operational speed.' },
  4:   { name: 'Start_Stop_Count',          desc: 'Total count of spindle start/stop cycles.' },
  5:   { name: 'Reallocated_Sector_Ct',     desc: 'Count of reallocated (remapped) bad sectors. Rising values indicate disk surface degradation — consider replacement if high.' },
  7:   { name: 'Seek_Error_Rate',           desc: 'Rate of seek errors of the magnetic heads. Vendor-specific normalization.' },
  9:   { name: 'Power_On_Hours',            desc: 'Total hours the drive has been powered on. Useful for estimating drive age.' },
  10:  { name: 'Spin_Retry_Count',          desc: 'Count of spin start retries. Non-zero values may indicate mechanical issues.' },
  11:  { name: 'Calibration_Retry_Count',   desc: 'Count of recalibration retries. Increasing values suggest mechanical problems.' },
  12:  { name: 'Power_Cycle_Count',         desc: 'Total number of complete power on/off cycles.' },
  187: { name: 'Reported_Uncorrectable',    desc: 'Count of errors that could not be corrected using ECC. Non-zero values are concerning.' },
  188: { name: 'Command_Timeout',           desc: 'Count of aborted operations due to timeout. May indicate interface or power issues.' },
  190: { name: 'Airflow_Temperature_Cel',   desc: 'Drive temperature in Celsius derived from airflow sensor.' },
  192: { name: 'Power-Off_Retract_Count',   desc: 'Count of emergency head retracts (unclean shutdowns). High values suggest power issues.' },
  193: { name: 'Load_Cycle_Count',          desc: 'Count of head load/unload cycles. HDDs are rated for a finite number (typically 300k-600k).' },
  194: { name: 'Temperature_Celsius',       desc: 'Current drive temperature in Celsius. Safe range: 25-45°C; above 55°C may reduce lifespan.' },
  196: { name: 'Reallocated_Event_Count',   desc: 'Count of remap operations. Different from attr 5 which counts resulting sectors.' },
  197: { name: 'Current_Pending_Sector',    desc: 'Sectors waiting to be remapped due to read errors. Non-zero values are a warning sign.' },
  198: { name: 'Offline_Uncorrectable',     desc: 'Sectors that could not be corrected during offline scan. Non-zero indicates bad sectors.' },
  199: { name: 'UDMA_CRC_Error_Count',      desc: 'Count of CRC errors during data transfer. Usually caused by bad cables or connectors.' },
  200: { name: 'Multi_Zone_Error_Rate',     desc: 'Rate of errors found when writing to disk. Vendor-specific metric.' },
  230: { name: 'Drive_Life_Protection',     desc: 'SSD: Current state of drive life protection. Indicates remaining endurance.' },
  231: { name: 'SSD_Life_Left',             desc: 'SSD: Percentage of drive life remaining based on write endurance.' },
  232: { name: 'Endurance_Remaining',       desc: 'SSD: Estimated remaining endurance as a percentage.' },
  233: { name: 'Media_Wearout_Indicator',   desc: 'SSD: Wear leveling count. Decreasing value indicates flash wear.' },
  241: { name: 'Total_LBAs_Written',        desc: 'Total logical block addresses written. Used to calculate total data written to drive.' },
  242: { name: 'Total_LBAs_Read',           desc: 'Total logical block addresses read. Used to estimate total data read from drive.' }
}

/**
 * Parse smartctl JSON output into structured data
 */
export function parseSmartData(jsonOutput) {
  if (!jsonOutput) return null

  const data = typeof jsonOutput === 'string' ? JSON.parse(jsonOutput) : jsonOutput
  const result = {
    device: data.device?.name || 'unknown',
    model: data.model_name || data.model_family || 'Unknown',
    serial: data.serial_number || 'N/A',
    firmware: data.firmware_version || 'N/A',
    health: data.smart_status?.passed ? 'PASSED' : 'FAILED',
    temperature: data.temperature?.current || null,
    powerOnHours: null,
    attributes: [],
    raw: typeof jsonOutput === 'string' ? jsonOutput : JSON.stringify(jsonOutput, null, 2)
  }

  const attrs = data.ata_smart_attributes?.table || []
  for (const attr of attrs) {
    const id = attr.id
    const info = SMART_EXPLANATIONS[id] || { name: attr.name || `Attribute_${id}`, desc: 'No description available.' }
    const parsed = {
      id,
      name: attr.name || info.name,
      value: attr.value,
      worst: attr.worst,
      threshold: attr.thresh,
      rawValue: attr.raw?.string || String(attr.raw?.value ?? ''),
      explanation: info.desc,
      status: attr.value > attr.thresh ? 'ok' : 'warning'
    }
    result.attributes.push(parsed)
    if (id === 9) result.powerOnHours = parseInt(parsed.rawValue) || null
  }

  // NVMe support
  if (data.nvme_smart_health_information_log) {
    const nvme = data.nvme_smart_health_information_log
    result.temperature = nvme.temperature || result.temperature
    result.powerOnHours = nvme.power_on_hours || result.powerOnHours
    result.attributes = [
      { id: 'critical_warning', name: 'Critical Warning', value: nvme.critical_warning, rawValue: String(nvme.critical_warning), explanation: 'Bitmap of critical warnings. 0 = no warnings.', status: nvme.critical_warning === 0 ? 'ok' : 'warning' },
      { id: 'temperature', name: 'Temperature', value: nvme.temperature, rawValue: `${nvme.temperature}°C`, explanation: 'Current composite temperature.', status: nvme.temperature < 70 ? 'ok' : 'warning' },
      { id: 'available_spare', name: 'Available Spare', value: nvme.available_spare, rawValue: `${nvme.available_spare}%`, explanation: 'Percentage of remaining spare blocks.', status: nvme.available_spare > nvme.available_spare_threshold ? 'ok' : 'warning' },
      { id: 'percentage_used', name: 'Percentage Used', value: nvme.percentage_used, rawValue: `${nvme.percentage_used}%`, explanation: 'Estimated percentage of NVM life used. Can exceed 100%.', status: nvme.percentage_used < 100 ? 'ok' : 'warning' },
      { id: 'power_on_hours', name: 'Power On Hours', value: nvme.power_on_hours, rawValue: String(nvme.power_on_hours), explanation: 'Total hours of drive operation.', status: 'ok' },
      { id: 'data_units_written', name: 'Data Written', value: nvme.data_units_written, rawValue: `${((nvme.data_units_written || 0) * 512000 / 1e12).toFixed(2)} TB`, explanation: 'Total data written (in 512KB units, shown as TB).', status: 'ok' },
      { id: 'data_units_read', name: 'Data Read', value: nvme.data_units_read, rawValue: `${((nvme.data_units_read || 0) * 512000 / 1e12).toFixed(2)} TB`, explanation: 'Total data read (in 512KB units, shown as TB).', status: 'ok' },
      { id: 'media_errors', name: 'Media Errors', value: nvme.media_errors, rawValue: String(nvme.media_errors), explanation: 'Count of unrecovered data integrity errors.', status: nvme.media_errors === 0 ? 'ok' : 'warning' },
      { id: 'num_err_log_entries', name: 'Error Log Entries', value: nvme.num_err_log_entries, rawValue: String(nvme.num_err_log_entries), explanation: 'Number of error log entries.', status: 'ok' }
    ]
  }

  return result
}

/**
 * Get explanation for a SMART attribute by ID
 */
export function getSmartExplanation(id) {
  return SMART_EXPLANATIONS[id] || null
}
