export default {
  app: {
    title: 'System Monitor',
    viewers: 'viewers',
    connected: 'Connected',
    disconnected: 'Disconnected'
  },
  tabs: {
    cpu: 'CPU / Memory',
    gpu: 'GPU',
    network: 'Network',
    disk: 'Disk',
    settings: 'Settings'
  },
  cpu: {
    title: 'CPU Usage',
    overall: 'Overall',
    temperature: 'Temperature',
    package: 'Package',
    core: 'Core',
    loading: 'Loading CPU data…'
  },
  memory: {
    title: 'Memory',
    swap: 'Swap',
    loading: 'Loading Memory data…'
  },
  temperature: {
    title: 'Temperature',
    cpu: 'CPU',
    gpu: 'GPU',
    max: 'Max',
    noData: 'No temperature sensors detected'
  },
  fans: {
    title: 'Fans'
  },
  gpu: {
    title: 'GPU',
    name: 'Name',
    driver: 'Driver',
    cuda: 'CUDA',
    utilization: 'Utilization',
    vram: 'VRAM',
    temp: 'Temperature',
    power: 'Power',
    processes: 'GPU Processes',
    pid: 'PID',
    process: 'Process',
    memoryMB: 'Memory (MB)',
    showRaw: 'Show Raw nvidia-smi',
    hideRaw: 'Hide Raw nvidia-smi',
    notAvailable: 'GPU not available (nvidia-smi not found)',
    loading: 'Loading GPU data…',
    utilizationHistory: 'Utilization History'
  },
  network: {
    title: 'Network',
    ipAddresses: 'IP Addresses',
    publicIpv4: 'Public IPv4',
    publicIpv6: 'Public IPv6',
    tailscaleIp: 'Tailscale IP',
    tailscaleHostname: 'Tailscale Hostname',
    interfaces: 'Network Interfaces',
    name: 'Name',
    ipv4: 'IPv4',
    ipv6: 'IPv6',
    speed: 'Speed',
    state: 'State',
    loading: 'Loading Network data…'
  },
  disk: {
    title: 'Disk',
    filesystems: 'Filesystems',
    mount: 'Mount',
    type: 'Type',
    size: 'Size',
    used: 'Used',
    available: 'Available',
    usePercent: 'Use%',
    smartHealth: 'SMART Health',
    showRaw: 'Show Raw SMART Data',
    hideRaw: 'Hide Raw SMART Data',
    smartAttr: {
      id: 'ID',
      attribute: 'Attribute',
      value: 'Value',
      worst: 'Worst',
      threshold: 'Threshold',
      raw: 'Raw',
      status: 'Status'
    },
    loading: 'Loading Disk data…',
    networkMounts: 'Network Mounts',
    remote: 'Remote'
  },
  settings: {
    title: 'Settings',
    refreshIntervals: 'Refresh Intervals',
    sec: 'sec',
    remoteTargets: 'Remote API Targets',
    local: '(local)',
    testConnection: 'Test',
    connectionOk: 'Connection OK',
    connectionFailed: 'Connection failed',
    addTarget: '+ Add',
    namePlaceholder: 'Name',
    urlPlaceholder: 'https://host:port',
    save: 'Save Settings',
    saving: 'Saving…',
    saved: 'Settings saved!',
    saveFailed: 'Failed to save',
    language: 'Language',
    fieldNames: {
      cpu: 'CPU',
      memory: 'Memory',
      gpu: 'GPU',
      network: 'Network',
      disk: 'Disk',
      smart: 'SMART',
      fans: 'Fans',
      temperature: 'Temperature'
    }
  },
  common: {
    refresh: 'Refresh',
    copy: 'Copy',
    copied: 'Copied'
  }
}
