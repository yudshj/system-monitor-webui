/** SMART attribute explanations (en + zh) */
export const SMART_EXPLANATIONS = {
  1:   { name: 'Raw_Read_Error_Rate',       desc: 'Rate of hardware read errors. Vendor-specific; high raw values may be normal for some drives.', desc_zh: '硬件读取错误率。厂商定义各异，某些硬盘的高原始值属于正常。' },
  2:   { name: 'Throughput_Performance',     desc: 'Overall throughput performance of the drive. Lower values indicate degradation.', desc_zh: '硬盘整体吞吐性能。数值下降表示性能退化。' },
  3:   { name: 'Spin_Up_Time',              desc: 'Average time (ms) for the spindle to spin up to operational speed.', desc_zh: '主轴电机启动到工作转速的平均时间（毫秒）。' },
  4:   { name: 'Start_Stop_Count',          desc: 'Total count of spindle start/stop cycles.', desc_zh: '主轴电机启停次数。' },
  5:   { name: 'Reallocated_Sector_Ct',     desc: 'Count of reallocated (remapped) bad sectors. Rising values indicate disk surface degradation — consider replacement if high.', desc_zh: '重映射坏扇区数。数值上升表示盘面退化，过高建议更换硬盘。' },
  7:   { name: 'Seek_Error_Rate',           desc: 'Rate of seek errors of the magnetic heads. Vendor-specific normalization.', desc_zh: '磁头寻道错误率。厂商定义不同，标准化方式各异。' },
  9:   { name: 'Power_On_Hours',            desc: 'Total hours the drive has been powered on. Useful for estimating drive age.', desc_zh: '硬盘累计通电小时数，可用于估算硬盘使用年限。' },
  10:  { name: 'Spin_Retry_Count',          desc: 'Count of spin start retries. Non-zero values may indicate mechanical issues.', desc_zh: '主轴电机重试启动次数。非零值可能表明机械问题。' },
  11:  { name: 'Calibration_Retry_Count',   desc: 'Count of recalibration retries. Increasing values suggest mechanical problems.', desc_zh: '重新校准重试次数。数值增长暗示机械故障。' },
  12:  { name: 'Power_Cycle_Count',         desc: 'Total number of complete power on/off cycles.', desc_zh: '完整通电/断电循环总次数。' },
  187: { name: 'Reported_Uncorrectable',    desc: 'Count of errors that could not be corrected using ECC. Non-zero values are concerning.', desc_zh: 'ECC 无法纠正的错误数。非零值需要关注。' },
  188: { name: 'Command_Timeout',           desc: 'Count of aborted operations due to timeout. May indicate interface or power issues.', desc_zh: '因超时而中止的操作次数。可能表明接口或供电问题。' },
  190: { name: 'Airflow_Temperature_Cel',   desc: 'Drive temperature in Celsius derived from airflow sensor.', desc_zh: '气流传感器测得的硬盘温度（摄氏度）。' },
  192: { name: 'Power-Off_Retract_Count',   desc: 'Count of emergency head retracts (unclean shutdowns). High values suggest power issues.', desc_zh: '紧急磁头回收次数（非正常断电）。过高说明供电不稳定。' },
  193: { name: 'Load_Cycle_Count',          desc: 'Count of head load/unload cycles. HDDs are rated for a finite number (typically 300k-600k).', desc_zh: '磁头加载/卸载次数。机械硬盘通常额定 30~60 万次。' },
  194: { name: 'Temperature_Celsius',       desc: 'Current drive temperature in Celsius. Safe range: 25-45°C; above 55°C may reduce lifespan.', desc_zh: '硬盘当前温度（摄氏度）。安全范围 25-45°C，超过 55°C 可能缩短寿命。' },
  196: { name: 'Reallocated_Event_Count',   desc: 'Count of remap operations. Different from attr 5 which counts resulting sectors.', desc_zh: '重映射操作次数（与属性 5 计数的是扇区数不同）。' },
  197: { name: 'Current_Pending_Sector',    desc: 'Sectors waiting to be remapped due to read errors. Non-zero values are a warning sign.', desc_zh: '因读取错误等待重映射的扇区数。非零值是警告信号。' },
  198: { name: 'Offline_Uncorrectable',     desc: 'Sectors that could not be corrected during offline scan. Non-zero indicates bad sectors.', desc_zh: '离线扫描中无法修正的扇区数。非零表示存在坏扇区。' },
  199: { name: 'UDMA_CRC_Error_Count',      desc: 'Count of CRC errors during data transfer. Usually caused by bad cables or connectors.', desc_zh: '数据传输中的 CRC 校验错误次数。通常由数据线或接口接触不良导致。' },
  200: { name: 'Multi_Zone_Error_Rate',     desc: 'Rate of errors found when writing to disk. Vendor-specific metric.', desc_zh: '写入磁盘时的错误率。厂商自定义指标。' },
  230: { name: 'Drive_Life_Protection',     desc: 'SSD: Current state of drive life protection. Indicates remaining endurance.', desc_zh: 'SSD：驱动器寿命保护状态，指示剩余耐久度。' },
  231: { name: 'SSD_Life_Left',             desc: 'SSD: Percentage of drive life remaining based on write endurance.', desc_zh: 'SSD：基于写入耐久度的剩余寿命百分比。' },
  232: { name: 'Endurance_Remaining',       desc: 'SSD: Estimated remaining endurance as a percentage.', desc_zh: 'SSD：预估剩余耐久度百分比。' },
  233: { name: 'Media_Wearout_Indicator',   desc: 'SSD: Wear leveling count. Decreasing value indicates flash wear.', desc_zh: 'SSD：磨损均衡计数。数值递减表示闪存磨损。' },
  241: { name: 'Total_LBAs_Written',        desc: 'Total logical block addresses written. Used to calculate total data written to drive.', desc_zh: '写入的逻辑块地址总数，用于计算硬盘总写入数据量。' },
  242: { name: 'Total_LBAs_Read',           desc: 'Total logical block addresses read. Used to estimate total data read from drive.', desc_zh: '读取的逻辑块地址总数，用于估算硬盘总读取数据量。' }
}

/** NVMe attribute descriptions */
const NVME_DESCS = {
  critical_warning:  { en: 'Bitmap of critical warnings. 0 = no warnings.', zh: '关键警告位图。0 = 无警告。' },
  temperature:       { en: 'Current composite temperature.', zh: '当前综合温度。' },
  available_spare:   { en: 'Percentage of remaining spare blocks.', zh: '剩余备用块百分比。' },
  percentage_used:   { en: 'Estimated percentage of NVM life used. Can exceed 100%.', zh: 'NVM 寿命已使用百分比（可超过 100%）。' },
  power_on_hours:    { en: 'Total hours of drive operation.', zh: '硬盘累计工作小时数。' },
  data_units_written:{ en: 'Total data written (in 512KB units, shown as TB).', zh: '总写入数据量（以 512KB 为单位，显示为 TB）。' },
  data_units_read:   { en: 'Total data read (in 512KB units, shown as TB).', zh: '总读取数据量（以 512KB 为单位，显示为 TB）。' },
  media_errors:      { en: 'Count of unrecovered data integrity errors.', zh: '无法恢复的数据完整性错误次数。' },
  num_err_log_entries:{ en: 'Number of error log entries.', zh: '错误日志条目数。' }
}

/**
 * Parse smartctl JSON output into structured data
 * @param {string|object} jsonOutput
 * @param {string} lang - 'en' or 'zh'
 */
export function parseSmartData(jsonOutput, lang = 'en') {
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
    const info = SMART_EXPLANATIONS[id] || { name: attr.name || `Attribute_${id}`, desc: 'No description available.', desc_zh: '暂无说明。' }
    const explanation = lang === 'zh' ? (info.desc_zh || info.desc) : info.desc
    const parsed = {
      id,
      name: attr.name || info.name,
      value: attr.value,
      worst: attr.worst,
      threshold: attr.thresh,
      rawValue: attr.raw?.string || String(attr.raw?.value ?? ''),
      explanation,
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

    function nvmeDesc(key) {
      const d = NVME_DESCS[key]
      return d ? (lang === 'zh' ? d.zh : d.en) : ''
    }

    result.attributes = [
      { id: 'critical_warning', name: 'Critical Warning', value: nvme.critical_warning, rawValue: String(nvme.critical_warning), explanation: nvmeDesc('critical_warning'), status: nvme.critical_warning === 0 ? 'ok' : 'warning' },
      { id: 'temperature', name: 'Temperature', value: nvme.temperature, rawValue: `${nvme.temperature}°C`, explanation: nvmeDesc('temperature'), status: nvme.temperature < 70 ? 'ok' : 'warning' },
      { id: 'available_spare', name: 'Available Spare', value: nvme.available_spare, rawValue: `${nvme.available_spare}%`, explanation: nvmeDesc('available_spare'), status: nvme.available_spare > nvme.available_spare_threshold ? 'ok' : 'warning' },
      { id: 'percentage_used', name: 'Percentage Used', value: nvme.percentage_used, rawValue: `${nvme.percentage_used}%`, explanation: nvmeDesc('percentage_used'), status: nvme.percentage_used < 100 ? 'ok' : 'warning' },
      { id: 'power_on_hours', name: 'Power On Hours', value: nvme.power_on_hours, rawValue: String(nvme.power_on_hours), explanation: nvmeDesc('power_on_hours'), status: 'ok' },
      { id: 'data_units_written', name: 'Data Written', value: nvme.data_units_written, rawValue: `${((nvme.data_units_written || 0) * 512000 / 1e12).toFixed(2)} TB`, explanation: nvmeDesc('data_units_written'), status: 'ok' },
      { id: 'data_units_read', name: 'Data Read', value: nvme.data_units_read, rawValue: `${((nvme.data_units_read || 0) * 512000 / 1e12).toFixed(2)} TB`, explanation: nvmeDesc('data_units_read'), status: 'ok' },
      { id: 'media_errors', name: 'Media Errors', value: nvme.media_errors, rawValue: String(nvme.media_errors), explanation: nvmeDesc('media_errors'), status: nvme.media_errors === 0 ? 'ok' : 'warning' },
      { id: 'num_err_log_entries', name: 'Error Log Entries', value: nvme.num_err_log_entries, rawValue: String(nvme.num_err_log_entries), explanation: nvmeDesc('num_err_log_entries'), status: 'ok' }
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
