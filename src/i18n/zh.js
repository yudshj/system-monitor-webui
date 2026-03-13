export default {
  app: {
    title: '系统监控',
    viewers: '人在看',
    connected: '已连接',
    disconnected: '已断开'
  },
  tabs: {
    cpu: 'CPU / 内存',
    gpu: 'GPU',
    network: '网络',
    disk: '磁盘',
    settings: '设置'
  },
  cpu: {
    title: 'CPU 使用率',
    overall: '总体',
    temperature: '温度',
    package: '封装',
    core: '核心',
    loading: '加载 CPU 数据中…'
  },
  memory: {
    title: '内存',
    swap: '交换空间',
    loading: '加载内存数据中…'
  },
  temperature: {
    title: '温度监控',
    cpu: 'CPU',
    gpu: 'GPU',
    max: '最高',
    noData: '未检测到温度传感器'
  },
  fans: {
    title: '风扇'
  },
  gpu: {
    title: 'GPU',
    name: '名称',
    driver: '驱动',
    cuda: 'CUDA',
    utilization: '利用率',
    vram: '显存',
    temp: '温度',
    power: '功耗',
    processes: 'GPU 进程',
    pid: 'PID',
    process: '进程',
    memoryMB: '显存 (MB)',
    showRaw: '显示 nvidia-smi 原始输出',
    hideRaw: '隐藏 nvidia-smi 原始输出',
    notAvailable: 'GPU 不可用 (未找到 nvidia-smi)',
    loading: '加载 GPU 数据中…',
    utilizationHistory: '利用率历史'
  },
  network: {
    title: '网络',
    ipAddresses: 'IP 地址',
    publicIpv4: '公网 IPv4',
    publicIpv6: '公网 IPv6',
    tailscaleIp: 'Tailscale IP',
    tailscaleHostname: 'Tailscale 域名',
    interfaces: '网络接口',
    name: '名称',
    ipv4: 'IPv4',
    ipv6: 'IPv6',
    speed: '速度',
    state: '状态',
    loading: '加载网络数据中…'
  },
  disk: {
    title: '磁盘',
    filesystems: '文件系统',
    mount: '挂载点',
    type: '类型',
    size: '容量',
    used: '已用',
    available: '可用',
    usePercent: '使用率',
    smartHealth: 'SMART 健康状态',
    showRaw: '显示 SMART 原始数据',
    hideRaw: '隐藏 SMART 原始数据',
    smartAttr: {
      id: 'ID',
      attribute: '属性',
      value: '值',
      worst: '最差',
      threshold: '阈值',
      raw: '原始值',
      status: '状态'
    },
    loading: '加载磁盘数据中…',
    networkMounts: '网络挂载',
    remote: '远程路径'
  },
  settings: {
    title: '设置',
    refreshIntervals: '刷新间隔',
    sec: '秒',
    remoteTargets: '远程 API 目标',
    local: '（本机）',
    testConnection: '测试',
    connectionOk: '连接成功',
    connectionFailed: '连接失败',
    addTarget: '+ 添加',
    namePlaceholder: '名称',
    urlPlaceholder: 'https://主机:端口',
    save: '保存设置',
    saving: '保存中…',
    saved: '设置已保存！',
    saveFailed: '保存失败',
    language: '语言',
    fieldNames: {
      cpu: 'CPU',
      memory: '内存',
      gpu: 'GPU',
      network: '网络',
      disk: '磁盘',
      smart: 'SMART',
      fans: '风扇',
      temperature: '温度'
    }
  },
  common: {
    refresh: '刷新',
    copy: '复制',
    copied: '已复制'
  }
}
