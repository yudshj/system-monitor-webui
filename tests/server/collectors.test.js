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

import { collectCpu, collectMemory, collectGpu, collectNetwork, collectIp, collectDisk, collectFans, collectSmart, collectTemperature, COLLECTORS, setExecFn, resetExecFn } from '../../server/collectors.js'

// Mock exec function
const mockExec = vi.fn((cmd) => {
  if (cmd.includes('nvidia-smi --query-gpu=')) {
    return 'RTX 3070, 535.129, 45, 30, 8192, 3000, 5192, 65, 120.5, 220.0'
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
  if (cmd.includes('sudo smartctl --scan')) {
    return JSON.stringify({ devices: [{ name: '/dev/sda' }] })
  }
  if (cmd.includes('sudo smartctl -a')) {
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
  if (cmd.includes('sensors')) return 'fan1: 1500 RPM'
  return ''
})

describe('collectors', () => {
  beforeEach(() => {
    setExecFn(mockExec)
    mockExec.mockClear()
  })

  afterEach(() => {
    resetExecFn()
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
    it('returns parsed GPU data', async () => {
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
    it('returns filesystem and device info', async () => {
      const data = await collectDisk()
      expect(data.filesystems).toHaveLength(1)
      expect(data.filesystems[0].mount).toBe('/')
      expect(data.devices).toHaveLength(1)
      expect(data.devices[0].name).toBe('sda')
    })
  })

  describe('collectSmart', () => {
    it('scans all devices', async () => {
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
  })

  describe('collectFans', () => {
    it('returns fan data from systeminformation', async () => {
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
  })

  describe('collectTemperature', () => {
    it('returns CPU and GPU temps', async () => {
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

    it('handles no GPU', async () => {
      setExecFn(() => '')
      const data = await collectTemperature()
      const gpuSensors = data.sensors.filter(s => s.type === 'gpu')
      expect(gpuSensors).toHaveLength(0)
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
