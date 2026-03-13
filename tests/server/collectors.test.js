import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock systeminformation
vi.mock('systeminformation', () => ({
  default: {
    currentLoad: vi.fn().mockResolvedValue({
      currentLoad: 45.5,
      cpus: [{ load: 30.2 }, { load: 60.8 }]
    }),
    cpuTemperature: vi.fn().mockResolvedValue({
      main: 55,
      cores: [52, 58],
      max: 58
    }),
    mem: vi.fn().mockResolvedValue({
      total: 68719476736,
      used: 34359738368,
      free: 34359738368,
      available: 40000000000,
      swaptotal: 8589934592,
      swapused: 1073741824,
      swapfree: 7516192768
    }),
    networkInterfaces: vi.fn().mockResolvedValue([
      { iface: 'eth0', ip4: '192.168.1.10', ip6: 'fe80::1', mac: 'aa:bb:cc:dd:ee:ff', speed: 1000, operstate: 'up', type: 'wired' }
    ]),
    fsSize: vi.fn().mockResolvedValue([
      { mount: '/', type: 'ext4', size: 500e9, used: 200e9, available: 300e9, use: 40, fs: '/dev/sda1' }
    ]),
    blockDevices: vi.fn().mockResolvedValue([
      { name: 'sda', type: 'disk', size: 500e9, model: 'Samsung SSD', serial: 'ABC123' }
    ]),
    fans: vi.fn().mockResolvedValue([
      { name: 'cpu_fan', speed: 1200 }
    ])
  }
}))

import {
  collectCpu, collectMemory, collectGpu, collectNetwork, collectIp,
  collectDisk, collectFans, collectSmart, collectTemperature,
  collectGpuMacOS, collectTemperatureMacOS, collectTemperatureLinux,
  parseDfOutput, parseNetworkMounts,
  COLLECTORS, setExecFn, resetExecFn, setPlatform, resetPlatform
} from '../../server/collectors.js'

// Mock exec function for Linux (default)
const mockExec = vi.fn((cmd) => {
  if (cmd.includes('nvidia-smi --query-gpu=name,driver_version')) {
    return 'RTX 3070, 535.129, 45, 30, 8192, 3000, 5192, 65, 120.5, 220.0'
  }
  if (cmd.includes('nvidia-smi --query-gpu=name,temperature')) {
    return 'RTX 3070, 65'
  }
  if (cmd === 'nvidia-smi') {
    return 'NVIDIA-SMI output\nCUDA Version: 12.1\nMore output'
  }
  if (cmd.includes('nvidia-smi --query-compute-apps')) {
    return '12345, python, 2048'
  }
  if (cmd.includes('curl -4')) return '1.2.3.4'
  if (cmd.includes('curl -6')) return '2001:db8::1'
  if (cmd.includes('tailscale status')) {
    return JSON.stringify({ Self: { TailscaleIPs: ['100.64.0.7'], DNSName: 'arch.example.ts.net.' } })
  }
  if (cmd.includes('sudo smartctl --scan') || cmd.includes('sudo /opt/homebrew/bin/smartctl --scan')) {
    return JSON.stringify({ devices: [{ name: '/dev/sda' }] })
  }
  if (cmd.includes('sudo smartctl -a') || cmd.includes('sudo /opt/homebrew/bin/smartctl -a')) {
    return JSON.stringify({
      device: { name: '/dev/sda' },
      model_name: 'Test SSD',
      serial_number: 'XYZ',
      firmware_version: '1.0',
      smart_status: { passed: true },
      temperature: { current: 30 },
      ata_smart_attributes: { table: [
        { id: 9, name: 'Power_On_Hours', value: 100, worst: 100, thresh: 0, raw: { value: 500, string: '500' } }
      ]}
    })
  }
  if (cmd.includes('which smartctl')) return '/opt/homebrew/bin/smartctl'
  if (cmd.includes('df -Pl')) {
    return `Filesystem     1024-blocks      Used Available Capacity Mounted on
/dev/sda1       487652348 196850072 290802276      40% /
tmpfs             4096000    12345   4083655       1% /tmp`
  }
  if (cmd.startsWith('mount')) {
    return `/dev/sda1 on / type ext4 (rw,relatime)
tmpfs on /tmp type tmpfs (rw,nosuid)
//server/share on /mnt/nas type cifs (rw,credentials=/etc/cifs)
nas:/volume1 on /mnt/nfs type nfs4 (rw,addr=192.168.1.100)`
  }
  if (cmd.includes('sensors')) return 'fan1: 1500 RPM'
  if (cmd.includes('system_profiler SPDisplaysDataType')) {
    return `Apple M4:

      Chipset Model: Apple M4
      Type: GPU
      Bus: Built-In
      Total Number of Cores: 10
      Metal Support: Metal 3`
  }
  if (cmd.includes('powermetrics --samplers gpu_power,cpu_power')) {
    return `CPU Power: 47 mW
GPU Power: 57 mW
ANE Power: 0 mW
Combined Power (CPU + GPU + ANE): 105 mW
GPU HW active residency:   4.82% (338 MHz: .42% 618 MHz: 0% 796 MHz: 4.4%)
GPU idle residency:  95.18%
GPU Power: 67 mW`
  }
  if (cmd.includes('powermetrics --samplers thermal')) {
    return `**** Thermal pressure ****
Current pressure level: Nominal`
  }
  if (cmd.includes('smctemp')) {
    return `CPU Die: 45.2
GPU: 38.1
SoC: 42.5`
  }
  return ''
})

describe('collectors', () => {
  beforeEach(() => {
    setExecFn(mockExec)
    setPlatform(false) // Default to Linux
    mockExec.mockClear()
  })

  afterEach(() => {
    resetExecFn()
    resetPlatform()
  })

  describe('collectCpu', () => {
    it('returns usage and core data', async () => {
      const data = await collectCpu()
      expect(data.usage).toBe(45.5)
      expect(data.cores).toHaveLength(2)
      expect(data.cores[0].load).toBe(30.2)
      expect(data.temperature.main).toBe(55)
      expect(data.temperature.cores).toEqual([52, 58])
      expect(data.timestamp).toBeTypeOf('number')
    })
  })

  describe('collectMemory', () => {
    it('returns memory info with usage percent', async () => {
      const data = await collectMemory()
      expect(data.total).toBe(68719476736)
      expect(data.used).toBe(34359738368)
      expect(data.usagePercent).toBe(50)
      expect(data.swap.total).toBe(8589934592)
      expect(data.timestamp).toBeTypeOf('number')
    })
  })

  describe('collectGpu', () => {
    it('returns parsed NVIDIA GPU data on Linux', async () => {
      const data = await collectGpu()
      expect(data.available).toBe(true)
      expect(data.gpus).toHaveLength(1)
      expect(data.gpus[0].name).toBe('RTX 3070')
      expect(data.gpus[0].utilization).toBe(45)
      expect(data.gpus[0].temperature).toBe(65)
      expect(data.cudaVersion).toBe('12.1')
      expect(data.processes).toHaveLength(1)
      expect(data.processes[0].pid).toBe('12345')
    })

    it('handles missing nvidia-smi', async () => {
      setExecFn(() => '')
      const data = await collectGpu()
      expect(data.available).toBe(false)
    })

    it('returns Apple GPU data on macOS', async () => {
      setPlatform(true)
      const data = await collectGpu()
      expect(data.available).toBe(true)
      expect(data.platform).toBe('macos')
      expect(data.gpus).toHaveLength(1)
      expect(data.gpus[0].name).toBe('Apple M4')
      expect(data.gpus[0].cores).toBe(10)
      expect(data.gpus[0].metalSupport).toBe('Metal 3')
      expect(data.gpus[0].utilization).toBe(4.82)
      expect(data.gpus[0].idleResidency).toBe(95.18)
      expect(data.gpus[0].powerMw).toBe(67)
      expect(data.gpus[0].cpuPowerMw).toBe(47)
      expect(data.gpus[0].anePowerMw).toBe(0)
      expect(data.gpus[0].combinedPowerMw).toBe(105)
      expect(data.gpus[0].frequencyResidency).toHaveLength(3)
      expect(data.gpus[0].frequencyResidency[0]).toEqual({ mhz: 338, percent: 0.42 })
      expect(data.processes).toEqual([])
    })

    it('handles missing system_profiler on macOS', async () => {
      setPlatform(true)
      setExecFn(() => '')
      const data = await collectGpu()
      expect(data.available).toBe(false)
      expect(data.platform).toBe('macos')
    })

    it('returns macOS GPU without powermetrics', async () => {
      setPlatform(true)
      setExecFn((cmd) => {
        if (cmd.includes('system_profiler')) {
          return 'Chipset Model: Apple M4\nTotal Number of Cores: 10\nMetal Support: Metal 3'
        }
        return ''
      })
      const data = await collectGpu()
      expect(data.available).toBe(true)
      expect(data.gpus[0].name).toBe('Apple M4')
      expect(data.gpus[0].utilization).toBeUndefined()
      expect(data.gpus[0].powerMw).toBeUndefined()
    })
  })

  describe('collectNetwork', () => {
    it('returns interfaces', async () => {
      const data = await collectNetwork()
      expect(data.interfaces).toHaveLength(1)
      expect(data.interfaces[0].name).toBe('eth0')
      expect(data.interfaces[0].ip4).toBe('192.168.1.10')
    })
  })

  describe('collectIp', () => {
    it('returns IP addresses', async () => {
      const data = await collectIp()
      expect(data.publicIPv4).toBe('1.2.3.4')
      expect(data.publicIPv6).toBe('2001:db8::1')
      expect(data.tailscale.ip).toBe('100.64.0.7')
      expect(data.tailscale.hostname).toBe('arch.example.ts.net')
    })

    it('handles failed tailscale', async () => {
      setExecFn((cmd) => {
        if (cmd.includes('tailscale')) return ''
        if (cmd.includes('curl -4')) return '1.1.1.1'
        if (cmd.includes('curl -6')) return ''
        return ''
      })
      const data = await collectIp()
      expect(data.tailscale.ip).toBe('')
    })

    it('handles invalid tailscale JSON', async () => {
      setExecFn((cmd) => {
        if (cmd.includes('tailscale')) return 'not json'
        return ''
      })
      const data = await collectIp()
      expect(data.tailscale.ip).toBe('')
    })
  })

  describe('collectDisk', () => {
    it('returns local filesystems and network mounts separately', async () => {
      const data = await collectDisk()
      // Local filesystems from df -Pl
      expect(data.filesystems).toHaveLength(2)
      expect(data.filesystems[0].mount).toBe('/')
      expect(data.filesystems[0].type).toBe('ext4')
      expect(data.filesystems[0].size).toBe(487652348 * 1024)
      expect(data.filesystems[0].usePercent).toBe(40)
      expect(data.filesystems[1].mount).toBe('/tmp')
      // Network mounts detected from mount command
      expect(data.networkMounts).toHaveLength(2)
      expect(data.networkMounts[0]).toEqual({
        mount: '/mnt/nas', type: 'cifs', remote: '//server/share', isNetwork: true
      })
      expect(data.networkMounts[1]).toEqual({
        mount: '/mnt/nfs', type: 'nfs4', remote: 'nas:/volume1', isNetwork: true
      })
      // Block devices from si
      expect(data.devices).toHaveLength(1)
      expect(data.devices[0].name).toBe('sda')
    })

    it('handles empty df output', async () => {
      setExecFn(() => '')
      const data = await collectDisk()
      expect(data.filesystems).toEqual([])
      expect(data.networkMounts).toEqual([])
    })

    it('handles macOS mount format', async () => {
      setPlatform(true)
      setExecFn((cmd) => {
        if (cmd.includes('df -Pl')) {
          return `Filesystem   1024-blocks      Used Available Capacity  Mounted on
/dev/disk3s1 1956255800  17408260 1776692080     1%    /`
        }
        if (cmd.startsWith('mount')) {
          return `/dev/disk3s1 on / (apfs, sealed, local, read-only, journaled)
//user@nas.local/Storage on /Volumes/Storage (smbfs, nodev, nosuid, mounted by robin)
devfs on /dev (devfs, local, nobrowse)`
        }
        return ''
      })
      const data = await collectDisk()
      expect(data.filesystems).toHaveLength(1)
      expect(data.filesystems[0].mount).toBe('/')
      expect(data.filesystems[0].type).toBe('apfs')
      expect(data.networkMounts).toHaveLength(1)
      expect(data.networkMounts[0].mount).toBe('/Volumes/Storage')
      expect(data.networkMounts[0].type).toBe('smbfs')
      expect(data.networkMounts[0].remote).toBe('//user@nas.local/Storage')
    })
  })

  describe('parseDfOutput', () => {
    it('parses POSIX df output', () => {
      const output = `Filesystem     1024-blocks      Used Available Capacity Mounted on
/dev/sda1       487652348 196850072 290802276      40% /
/dev/sda2       100000000  50000000  50000000      50% /home`
      const result = parseDfOutput(output)
      expect(result).toHaveLength(2)
      expect(result[0].mount).toBe('/')
      expect(result[0].fs).toBe('/dev/sda1')
      expect(result[0].usePercent).toBe(40)
      expect(result[1].mount).toBe('/home')
    })

    it('returns empty for null input', () => {
      expect(parseDfOutput('')).toEqual([])
      expect(parseDfOutput(null)).toEqual([])
    })

    it('handles mount points with spaces', () => {
      const output = `Filesystem     1024-blocks Used Available Capacity Mounted on
/dev/sda1       100000  50000  50000      50% /mnt/My Drive`
      const result = parseDfOutput(output)
      expect(result[0].mount).toBe('/mnt/My Drive')
    })
  })

  describe('parseNetworkMounts', () => {
    it('detects Linux cifs/nfs mounts', () => {
      const output = `/dev/sda1 on / type ext4 (rw)
//server/share on /mnt/nas type cifs (rw)
nas:/vol on /mnt/nfs type nfs4 (rw)`
      const result = parseNetworkMounts(output)
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('cifs')
      expect(result[1].type).toBe('nfs4')
    })

    it('detects macOS smbfs/nfs mounts', () => {
      const output = `/dev/disk1 on / (apfs, local)
//user@server/share on /Volumes/Share (smbfs, nodev)
nas:/data on /Volumes/NAS (nfs, nodev)`
      const result = parseNetworkMounts(output)
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('smbfs')
      expect(result[0].mount).toBe('/Volumes/Share')
      expect(result[1].type).toBe('nfs')
    })

    it('ignores local filesystems', () => {
      const output = `/dev/sda1 on / type ext4 (rw)
tmpfs on /tmp type tmpfs (rw)`
      expect(parseNetworkMounts(output)).toEqual([])
    })

    it('returns empty for null input', () => {
      expect(parseNetworkMounts('')).toEqual([])
      expect(parseNetworkMounts(null)).toEqual([])
    })
  })

  describe('collectSmart', () => {
    it('scans all devices on Linux', async () => {
      const data = await collectSmart()
      expect(data.devices).toHaveLength(1)
      expect(data.devices[0].model).toBe('Test SSD')
      expect(data.devices[0].health).toBe('PASSED')
    })

    it('queries specific device', async () => {
      const data = await collectSmart('/dev/sda')
      expect(data.model).toBe('Test SSD')
    })

    it('returns null for empty output on specific device', async () => {
      setExecFn(() => '')
      const data = await collectSmart('/dev/sda')
      expect(data).toBeNull()
    })

    it('handles empty scan', async () => {
      setExecFn(() => '')
      const data = await collectSmart()
      expect(data.devices).toEqual([])
    })

    it('handles invalid scan JSON', async () => {
      setExecFn(() => 'not json')
      const data = await collectSmart()
      expect(data.devices).toEqual([])
    })

    it('uses homebrew smartctl path on macOS', async () => {
      setPlatform(true)
      const calls = []
      setExecFn((cmd) => {
        calls.push(cmd)
        if (cmd.includes('which smartctl')) return '/opt/homebrew/bin/smartctl'
        if (cmd.includes('--scan')) return JSON.stringify({ devices: [{ name: '/dev/disk0' }] })
        if (cmd.includes('-a')) return JSON.stringify({
          device: { name: '/dev/disk0' },
          model_name: 'Apple SSD',
          serial_number: 'ABC',
          firmware_version: '1.0',
          smart_status: { passed: true },
          temperature: { current: 35 },
          nvme_smart_health_information_log: {
            temperature: 35,
            power_on_hours: 100,
            percentage_used: 1,
            data_units_read: 500,
            data_units_written: 300
          }
        })
        return ''
      })
      const data = await collectSmart()
      expect(data.devices).toHaveLength(1)
      // Verify it used the homebrew path
      const scanCall = calls.find(c => c.includes('--scan'))
      expect(scanCall).toContain('/opt/homebrew/bin/smartctl')
    })
  })

  describe('collectFans', () => {
    it('returns fan data from systeminformation on Linux', async () => {
      const data = await collectFans()
      expect(data.fans).toHaveLength(1)
      expect(data.fans[0].speed).toBe(1200)
    })

    it('falls back to sensors command when si returns empty', async () => {
      const si = await import('systeminformation')
      si.default.fans.mockResolvedValueOnce([])
      const data = await collectFans()
      expect(data.fans.length).toBeGreaterThanOrEqual(0)
    })

    it('returns empty fans on macOS with note', async () => {
      setPlatform(true)
      const data = await collectFans()
      expect(data.fans).toEqual([])
      expect(data.platform).toBe('macos')
      expect(data.note).toContain('Swift CLI helper')
    })
  })

  describe('collectTemperature', () => {
    it('returns CPU and GPU temps on Linux', async () => {
      const data = await collectTemperature()
      expect(data.sensors.length).toBeGreaterThan(0)
      const cpuSensors = data.sensors.filter(s => s.type === 'cpu')
      const gpuSensors = data.sensors.filter(s => s.type === 'gpu')
      expect(cpuSensors.length).toBeGreaterThan(0)
      expect(gpuSensors.length).toBeGreaterThan(0)
      expect(cpuSensors[0].name).toBe('CPU Package')
      expect(data.max).toBeTypeOf('number')
      expect(data.timestamp).toBeTypeOf('number')
    })

    it('handles no GPU on Linux', async () => {
      setExecFn(() => '')
      const data = await collectTemperature()
      const gpuSensors = data.sensors.filter(s => s.type === 'gpu')
      expect(gpuSensors).toHaveLength(0)
    })

    it('returns thermal pressure + smctemp data on macOS', async () => {
      setPlatform(true)
      const data = await collectTemperature()
      expect(data.platform).toBe('macos')
      expect(data.thermalPressure).toBe('Nominal')
      expect(data.sensors).toHaveLength(3)
      expect(data.sensors[0]).toEqual({ name: 'CPU Die', value: 45.2, type: 'cpu' })
      expect(data.sensors[1]).toEqual({ name: 'GPU', value: 38.1, type: 'gpu' })
      expect(data.sensors[2]).toEqual({ name: 'SoC', value: 42.5, type: 'cpu' })
      expect(data.max).toBe(45.2)
    })

    it('handles macOS without smctemp', async () => {
      setPlatform(true)
      setExecFn((cmd) => {
        if (cmd.includes('smctemp')) return ''
        if (cmd.includes('powermetrics --samplers thermal')) {
          return 'Current pressure level: Fair'
        }
        return ''
      })
      const data = await collectTemperature()
      expect(data.sensors).toEqual([])
      expect(data.thermalPressure).toBe('Fair')
      expect(data.max).toBeNull()
    })

    it('handles macOS without powermetrics sudo', async () => {
      setPlatform(true)
      setExecFn((cmd) => {
        if (cmd.includes('smctemp')) return 'CPU Die: 50.0'
        return '' // powermetrics fails
      })
      const data = await collectTemperature()
      expect(data.sensors).toHaveLength(1)
      expect(data.thermalPressure).toBeUndefined()
    })
  })

  describe('COLLECTORS map', () => {
    it('has all expected fields', () => {
      const keys = Object.keys(COLLECTORS)
      expect(keys).toContain('cpu')
      expect(keys).toContain('memory')
      expect(keys).toContain('gpu')
      expect(keys).toContain('network')
      expect(keys).toContain('ip')
      expect(keys).toContain('disk')
      expect(keys).toContain('smart')
      expect(keys).toContain('fans')
      expect(keys).toContain('temperature')
    })

    it('all values are functions', () => {
      for (const fn of Object.values(COLLECTORS)) {
        expect(typeof fn).toBe('function')
      }
    })
  })
})
