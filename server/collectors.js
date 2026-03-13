import si from 'systeminformation'
import { execSync } from 'child_process'
import { parseSmartData } from './parsers.js'

export function execQuiet(cmd, timeout = 10000) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch { return '' }
}

// Allow tests to override execQuiet
let _exec = execQuiet
export function setExecFn(fn) { _exec = fn }
export function resetExecFn() { _exec = execQuiet }

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

export async function collectSmart(device) {
  if (device) {
    const output = _exec(`smartctl -a ${device} --json`, 15000)
    if (!output) return null
    return parseSmartData(output)
  }

  // Scan all devices
  const scanOutput = _exec('smartctl --scan --json', 15000)
  if (!scanOutput) return { devices: [], timestamp: Date.now() }

  let scan
  try { scan = JSON.parse(scanOutput) } catch { return { devices: [], timestamp: Date.now() } }

  const devices = []
  for (const dev of (scan.devices || [])) {
    const devPath = dev.name
    const output = _exec(`smartctl -a ${devPath} --json`, 15000)
    if (output) {
      const parsed = parseSmartData(output)
      if (parsed) devices.push(parsed)
    }
  }
  return { devices, timestamp: Date.now() }
}

export async function collectFans() {
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

// Map of field names to collector functions
export const COLLECTORS = {
  cpu: collectCpu,
  memory: collectMemory,
  gpu: collectGpu,
  network: collectNetwork,
  ip: collectIp,
  disk: collectDisk,
  smart: collectSmart,
  fans: collectFans
}
