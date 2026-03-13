import si from 'systeminformation'
import { execSync } from 'child_process'
import { parseSmartData } from './parsers.js'
import os from 'os'

export const IS_MACOS = os.platform() === 'darwin'

export function execQuiet(cmd, timeout = 10000) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch { return '' }
}

// Allow tests to override execQuiet
let _exec = execQuiet
export function setExecFn(fn) { _exec = fn }
export function resetExecFn() { _exec = execQuiet }

// Allow tests to override platform detection
let _isMacOS = IS_MACOS
export function setPlatform(mac) { _isMacOS = mac }
export function resetPlatform() { _isMacOS = IS_MACOS }
export function isMacOS() { return _isMacOS }

export async function collectCpu() {
  const [load, temp] = await Promise.all([
    si.currentLoad(),
    si.cpuTemperature()
  ])
  return {
    usage: Math.round(load.currentLoad * 100) / 100,
    cores: (load.cpus || []).map((c, i) => ({ core: i, load: Math.round(c.load * 100) / 100 })),
    temperature: {
      main: temp.main,
      cores: temp.cores || [],
      max: temp.max
    },
    timestamp: Date.now()
  }
}

export async function collectMemory() {
  const mem = await si.mem()
  return {
    total: mem.total,
    used: mem.used,
    free: mem.free,
    available: mem.available,
    usagePercent: Math.round((mem.used / mem.total) * 10000) / 100,
    swap: {
      total: mem.swaptotal,
      used: mem.swapused,
      free: mem.swapfree
    },
    timestamp: Date.now()
  }
}

export async function collectGpu() {
  if (_isMacOS) return collectGpuMacOS()
  return collectGpuNvidia()
}

function collectGpuNvidia() {
  const csvOutput = _exec(
    'nvidia-smi --query-gpu=name,driver_version,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,temperature.gpu,power.draw,power.limit --format=csv,noheader,nounits'
  )
  const rawOutput = _exec('nvidia-smi')

  if (!csvOutput) {
    return { available: false, raw: rawOutput || 'nvidia-smi not available', timestamp: Date.now() }
  }

  const gpus = csvOutput.split('\n').filter(Boolean).map(line => {
    const parts = line.split(', ').map(s => s.trim())
    return {
      name: parts[0] || 'Unknown',
      driverVersion: parts[1] || '',
      utilization: parseFloat(parts[2]) || 0,
      memoryUtilization: parseFloat(parts[3]) || 0,
      memoryTotal: parseFloat(parts[4]) || 0,
      memoryUsed: parseFloat(parts[5]) || 0,
      memoryFree: parseFloat(parts[6]) || 0,
      temperature: parseFloat(parts[7]) || 0,
      powerDraw: parseFloat(parts[8]) || 0,
      powerLimit: parseFloat(parts[9]) || 0
    }
  })

  // Get CUDA version
  const cudaMatch = (rawOutput || '').match(/CUDA Version:\s*([\d.]+)/)
  const cudaVersion = cudaMatch ? cudaMatch[1] : ''

  // Get GPU processes
  const procOutput = _exec(
    'nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv,noheader,nounits'
  )
  const processes = procOutput ? procOutput.split('\n').filter(Boolean).map(line => {
    const parts = line.split(', ').map(s => s.trim())
    return { pid: parts[0], name: parts[1], memoryMB: parseFloat(parts[2]) || 0 }
  }) : []

  return { available: true, gpus, cudaVersion, processes, raw: rawOutput, timestamp: Date.now() }
}

function collectGpuMacOS() {
  // Get GPU info from system_profiler
  const spOutput = _exec('system_profiler SPDisplaysDataType 2>/dev/null')
  // Get power/utilization from powermetrics
  const pmOutput = _exec('sudo -n powermetrics --samplers gpu_power,cpu_power -n1 -i500 2>/dev/null')

  if (!spOutput) {
    return { available: false, platform: 'macos', raw: 'system_profiler not available', timestamp: Date.now() }
  }

  // Parse system_profiler for GPU name and cores
  const nameMatch = spOutput.match(/Chipset Model:\s*(.+)/i)
  const coresMatch = spOutput.match(/Total Number of Cores:\s*(\d+)/i)
  const metalMatch = spOutput.match(/Metal.*?:\s*(.+)/i)

  const gpu = {
    name: nameMatch ? nameMatch[1].trim() : 'Apple GPU',
    cores: coresMatch ? parseInt(coresMatch[1]) : null,
    metalSupport: metalMatch ? metalMatch[1].trim() : '',
  }

  // Parse powermetrics for GPU utilization and power
  if (pmOutput) {
    // GPU HW active residency:   4.82% (338 MHz: .42% ...)
    const residencyMatch = pmOutput.match(/GPU HW active residency:\s*([\d.]+)%/)
    if (residencyMatch) gpu.utilization = parseFloat(residencyMatch[1])

    // GPU idle residency:  95.18%
    const idleMatch = pmOutput.match(/GPU idle residency:\s*([\d.]+)%/)
    if (idleMatch) gpu.idleResidency = parseFloat(idleMatch[1])

    // GPU Power: 57 mW
    const gpuPowerLines = pmOutput.match(/^GPU Power:\s*(\d+)\s*mW/gm)
    if (gpuPowerLines && gpuPowerLines.length > 0) {
      // Take the last GPU Power line (the one outside the cluster blocks)
      const lastLine = gpuPowerLines[gpuPowerLines.length - 1]
      const m = lastLine.match(/(\d+)/)
      if (m) gpu.powerMw = parseInt(m[1])
    }

    // CPU Power: 47 mW
    const cpuPowerMatch = pmOutput.match(/^CPU Power:\s*(\d+)\s*mW/m)
    // ANE Power: 0 mW
    const anePowerMatch = pmOutput.match(/^ANE Power:\s*(\d+)\s*mW/m)
    // Combined Power
    const combinedMatch = pmOutput.match(/^Combined Power.*?:\s*(\d+)\s*mW/m)

    gpu.cpuPowerMw = cpuPowerMatch ? parseInt(cpuPowerMatch[1]) : null
    gpu.anePowerMw = anePowerMatch ? parseInt(anePowerMatch[1]) : null
    gpu.combinedPowerMw = combinedMatch ? parseInt(combinedMatch[1]) : null

    // Parse GPU frequency residencies
    const freqMatch = pmOutput.match(/GPU HW active residency:.*?\((.*?)\)/)
    if (freqMatch) {
      const freqs = []
      const freqRegex = /(\d+)\s*MHz:\s*([\d.]+)%/g
      let fm
      while ((fm = freqRegex.exec(freqMatch[1])) !== null) {
        freqs.push({ mhz: parseInt(fm[1]), percent: parseFloat(fm[2]) })
      }
      if (freqs.length) gpu.frequencyResidency = freqs
    }
  }

  return {
    available: true,
    platform: 'macos',
    gpus: [gpu],
    processes: [],
    raw: spOutput,
    timestamp: Date.now()
  }
}

export async function collectNetwork() {
  const ifaces = await si.networkInterfaces()
  const interfaces = (Array.isArray(ifaces) ? ifaces : [ifaces]).map(i => ({
    name: i.iface,
    ip4: i.ip4,
    ip6: i.ip6,
    mac: i.mac,
    speed: i.speed,
    state: i.operstate,
    type: i.type
  }))
  return { interfaces, timestamp: Date.now() }
}

export async function collectIp() {
  const [ipv4, ipv6, tsStatus] = await Promise.all([
    (async () => _exec('curl -4 -s --max-time 5 ifconfig.me'))(),
    (async () => _exec('curl -6 -s --max-time 5 ifconfig.me'))(),
    (async () => {
      const raw = _exec('tailscale status --json')
      if (!raw) return { ip: '', hostname: '' }
      try {
        const data = JSON.parse(raw)
        const self = data.Self || {}
        return {
          ip: (self.TailscaleIPs || [])[0] || '',
          ips: self.TailscaleIPs || [],
          hostname: (self.DNSName || '').replace(/\.$/, '')
        }
      } catch { return { ip: '', hostname: '' } }
    })()
  ])
  return { publicIPv4: ipv4, publicIPv6: ipv6, tailscale: tsStatus, timestamp: Date.now() }
}

export async function collectDisk() {
  const [fsData, blockDevices] = await Promise.all([
    si.fsSize(),
    si.blockDevices()
  ])
  const filesystems = (fsData || []).map(fs => ({
    mount: fs.mount,
    type: fs.type,
    size: fs.size,
    used: fs.used,
    available: fs.available,
    usePercent: fs.use,
    fs: fs.fs
  }))
  const devices = (blockDevices || []).map(d => ({
    name: d.name,
    type: d.type,
    size: d.size,
    model: d.model,
    serial: d.serial,
    device: `/dev/${d.name}`
  }))
  return { filesystems, devices, timestamp: Date.now() }
}

export async function collectSmart(device, lang = 'en') {
  // On macOS, smartctl may be at /opt/homebrew/bin/smartctl or /usr/local/bin/smartctl
  const smartctl = _isMacOS
    ? (_exec('which smartctl 2>/dev/null') || '/opt/homebrew/bin/smartctl')
    : 'smartctl'

  if (device) {
    const output = _exec(`sudo ${smartctl} -a ${device} --json`, 15000)
    if (!output) return null
    return parseSmartData(output, lang)
  }

  // Scan all devices
  const scanOutput = _exec(`sudo ${smartctl} --scan --json`, 15000)
  if (!scanOutput) return { devices: [], timestamp: Date.now() }

  let scan
  try { scan = JSON.parse(scanOutput) } catch { return { devices: [], timestamp: Date.now() } }

  const devices = []
  for (const dev of (scan.devices || [])) {
    const devPath = dev.name
    const output = _exec(`sudo ${smartctl} -a ${devPath} --json`, 15000)
    if (output) {
      const parsed = parseSmartData(output, lang)
      if (parsed) devices.push(parsed)
    }
  }
  return { devices, timestamp: Date.now() }
}

export async function collectFans() {
  // macOS Apple Silicon: no user-accessible fan data
  if (_isMacOS) {
    return { fans: [], platform: 'macos', note: 'Fan data requires Swift CLI helper on macOS', timestamp: Date.now() }
  }

  // Try systeminformation first
  const fans = await si.fans()
  if (fans && fans.length > 0) {
    return {
      fans: fans.map(f => ({ name: f.name || 'Fan', speed: f.speed })),
      timestamp: Date.now()
    }
  }

  // Fallback: parse sensors output
  const sensorsOutput = _exec('sensors 2>/dev/null')
  const fanLines = (sensorsOutput || '').split('\n').filter(l => /fan\d*|Fan/i.test(l))
  const parsedFans = fanLines.map(line => {
    const match = line.match(/(.*?):\s*(\d+)\s*RPM/i)
    if (match) return { name: match[1].trim(), speed: parseInt(match[2]) }
    return null
  }).filter(Boolean)

  return { fans: parsedFans, timestamp: Date.now() }
}

export async function collectTemperature() {
  if (_isMacOS) return collectTemperatureMacOS()
  return collectTemperatureLinux()
}

async function collectTemperatureLinux() {
  const [cpuTemp, gpuRaw] = await Promise.all([
    si.cpuTemperature(),
    (async () => _exec(
      'nvidia-smi --query-gpu=name,temperature.gpu --format=csv,noheader,nounits'
    ))()
  ])

  const sensors = []

  // CPU temps
  if (cpuTemp.main != null) {
    sensors.push({ name: 'CPU Package', value: cpuTemp.main, type: 'cpu' })
  }
  for (let i = 0; i < (cpuTemp.cores || []).length; i++) {
    if (cpuTemp.cores[i] != null) {
      sensors.push({ name: `CPU Core ${i}`, value: cpuTemp.cores[i], type: 'cpu' })
    }
  }

  // GPU temps
  if (gpuRaw) {
    gpuRaw.split('\n').filter(Boolean).forEach((line, i) => {
      const parts = line.split(', ').map(s => s.trim())
      const temp = parseFloat(parts[1])
      if (!isNaN(temp)) {
        sensors.push({ name: parts[0] || `GPU ${i}`, value: temp, type: 'gpu' })
      }
    })
  }

  return {
    sensors,
    max: sensors.length ? Math.max(...sensors.map(s => s.value)) : null,
    timestamp: Date.now()
  }
}

async function collectTemperatureMacOS() {
  const sensors = []
  const result = { sensors, platform: 'macos', timestamp: Date.now() }

  // Try Swift CLI helper first (if installed)
  const swiftOutput = _exec('smctemp 2>/dev/null')
  if (swiftOutput) {
    // Expected format: "CPU: 45.2\nGPU: 38.1\n..." (one sensor per line)
    swiftOutput.split('\n').filter(Boolean).forEach(line => {
      const match = line.match(/^(.+?):\s*([\d.]+)/)
      if (match) {
        const name = match[1].trim()
        const value = parseFloat(match[2])
        const type = /gpu/i.test(name) ? 'gpu' : /cpu|die|soc/i.test(name) ? 'cpu' : 'other'
        sensors.push({ name, value, type })
      }
    })
  }

  // Always get thermal pressure from powermetrics
  const pmOutput = _exec('sudo -n powermetrics --samplers thermal -n1 -i500 2>/dev/null')
  if (pmOutput) {
    const pressureMatch = pmOutput.match(/Current pressure level:\s*(\w+)/)
    if (pressureMatch) {
      result.thermalPressure = pressureMatch[1] // Nominal, Fair, Serious, Critical
    }
  }

  result.max = sensors.length ? Math.max(...sensors.map(s => s.value)) : null
  return result
}

// Exported for testing
export { collectGpuMacOS, collectTemperatureMacOS, collectTemperatureLinux }

// Map of field names to collector functions
export const COLLECTORS = {
  cpu: collectCpu,
  memory: collectMemory,
  gpu: collectGpu,
  network: collectNetwork,
  ip: collectIp,
  disk: collectDisk,
  smart: collectSmart,
  fans: collectFans,
  temperature: collectTemperature
}
