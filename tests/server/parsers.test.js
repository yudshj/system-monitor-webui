import { describe, it, expect } from 'vitest'
import { parseSmartData, getSmartExplanation, SMART_EXPLANATIONS } from '../../server/parsers.js'

const SAMPLE_ATA = {
  device: { name: '/dev/sda' },
  model_name: 'Samsung SSD 870 EVO',
  serial_number: 'S5Y1NJ0T123456',
  firmware_version: 'SVT02B6Q',
  smart_status: { passed: true },
  temperature: { current: 35 },
  ata_smart_attributes: {
    table: [
      { id: 5, name: 'Reallocated_Sector_Ct', value: 100, worst: 100, thresh: 10, raw: { value: 0, string: '0' } },
      { id: 9, name: 'Power_On_Hours', value: 99, worst: 99, thresh: 0, raw: { value: 1234, string: '1234' } },
      { id: 194, name: 'Temperature_Celsius', value: 65, worst: 55, thresh: 0, raw: { value: 35, string: '35' } },
      { id: 197, name: 'Current_Pending_Sector', value: 100, worst: 100, thresh: 0, raw: { value: 0, string: '0' } },
      { id: 199, name: 'UDMA_CRC_Error_Count', value: 200, worst: 200, thresh: 0, raw: { value: 0, string: '0' } }
    ]
  }
}

const SAMPLE_NVME = {
  device: { name: '/dev/nvme0n1' },
  model_name: 'Samsung 980 PRO',
  serial_number: 'S69ENF0T456789',
  firmware_version: '5B2QGXA7',
  smart_status: { passed: true },
  nvme_smart_health_information_log: {
    critical_warning: 0,
    temperature: 42,
    available_spare: 100,
    available_spare_threshold: 10,
    percentage_used: 3,
    power_on_hours: 5678,
    data_units_written: 50000000,
    data_units_read: 30000000,
    media_errors: 0,
    num_err_log_entries: 0
  }
}

describe('parsers', () => {
  describe('SMART_EXPLANATIONS', () => {
    it('has at least 20 attributes', () => {
      expect(Object.keys(SMART_EXPLANATIONS).length).toBeGreaterThanOrEqual(20)
    })

    it('each entry has name and desc', () => {
      for (const [id, entry] of Object.entries(SMART_EXPLANATIONS)) {
        expect(entry).toHaveProperty('name')
        expect(entry).toHaveProperty('desc')
        expect(entry.name).toBeTruthy()
        expect(entry.desc).toBeTruthy()
      }
    })
  })

  describe('getSmartExplanation', () => {
    it('returns explanation for known ID', () => {
      const e = getSmartExplanation(5)
      expect(e.name).toBe('Reallocated_Sector_Ct')
      expect(e.desc).toContain('bad sectors')
    })

    it('returns null for unknown ID', () => {
      expect(getSmartExplanation(9999)).toBeNull()
    })
  })

  describe('parseSmartData — ATA', () => {
    it('parses ATA SMART data correctly', () => {
      const result = parseSmartData(SAMPLE_ATA)
      expect(result.device).toBe('/dev/sda')
      expect(result.model).toBe('Samsung SSD 870 EVO')
      expect(result.serial).toBe('S5Y1NJ0T123456')
      expect(result.health).toBe('PASSED')
      expect(result.powerOnHours).toBe(1234)
      expect(result.attributes).toHaveLength(5)
    })

    it('parses attribute status correctly', () => {
      const result = parseSmartData(SAMPLE_ATA)
      const attr5 = result.attributes.find(a => a.id === 5)
      expect(attr5.status).toBe('ok') // value 100 > thresh 10
      expect(attr5.explanation).toContain('bad sectors')
    })

    it('handles string input', () => {
      const result = parseSmartData(JSON.stringify(SAMPLE_ATA))
      expect(result.model).toBe('Samsung SSD 870 EVO')
    })

    it('returns null for null input', () => {
      expect(parseSmartData(null)).toBeNull()
    })

    it('marks failed health', () => {
      const failed = { ...SAMPLE_ATA, smart_status: { passed: false } }
      const result = parseSmartData(failed)
      expect(result.health).toBe('FAILED')
    })

    it('handles missing device name', () => {
      const noDevice = { ...SAMPLE_ATA, device: undefined }
      const result = parseSmartData(noDevice)
      expect(result.device).toBe('unknown')
    })

    it('handles attribute with no raw string', () => {
      const data = {
        ...SAMPLE_ATA,
        ata_smart_attributes: {
          table: [{ id: 999, name: 'Custom', value: 50, worst: 50, thresh: 60, raw: { value: 42 } }]
        }
      }
      const result = parseSmartData(data)
      expect(result.attributes[0].rawValue).toBe('42')
      expect(result.attributes[0].status).toBe('warning') // value 50 <= thresh 60
    })
  })

  describe('parseSmartData — NVMe', () => {
    it('parses NVMe SMART data correctly', () => {
      const result = parseSmartData(SAMPLE_NVME)
      expect(result.device).toBe('/dev/nvme0n1')
      expect(result.model).toBe('Samsung 980 PRO')
      expect(result.health).toBe('PASSED')
      expect(result.temperature).toBe(42)
      expect(result.powerOnHours).toBe(5678)
      expect(result.attributes.length).toBeGreaterThan(0)
    })

    it('sets critical_warning status correctly', () => {
      const result = parseSmartData(SAMPLE_NVME)
      const cw = result.attributes.find(a => a.id === 'critical_warning')
      expect(cw.status).toBe('ok')
    })

    it('calculates TB written/read', () => {
      const result = parseSmartData(SAMPLE_NVME)
      const written = result.attributes.find(a => a.id === 'data_units_written')
      expect(written.rawValue).toContain('TB')
    })

    it('handles NVMe with critical warnings', () => {
      const warn = JSON.parse(JSON.stringify(SAMPLE_NVME))
      warn.nvme_smart_health_information_log.critical_warning = 1
      warn.nvme_smart_health_information_log.media_errors = 5
      const result = parseSmartData(warn)
      const cw = result.attributes.find(a => a.id === 'critical_warning')
      expect(cw.status).toBe('warning')
      const me = result.attributes.find(a => a.id === 'media_errors')
      expect(me.status).toBe('warning')
    })
  })
})
