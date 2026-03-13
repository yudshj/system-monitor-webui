# Status Monitor V2 — Full Specification

## Overview
A modern, beautiful system monitoring WebUI. Node.js backend + Vue 3 frontend (Vite build). Deployed behind nginx at `https://arch.anoa-qilin.ts.net/status/`.

## Architecture

```
status-monitor-v2/
├── package.json
├── vite.config.js
├── vitest.config.js
├── index.html              # Vite entry HTML
├── server/
│   ├── index.js            # Express server entry, SSE, static serving
│   ├── collectors.js        # System info collection functions
│   ├── parsers.js           # SMART parsing, field explanations
│   ├── settings.js          # Settings management (read/write JSON)
│   └── routes.js            # Express route definitions
├── src/                     # Vue 3 frontend source
│   ├── main.js
│   ├── App.vue
│   ├── stores/
│   │   ├── metrics.js       # Pinia store for metrics data
│   │   └── settings.js      # Pinia store for settings
│   ├── composables/
│   │   └── useSSE.js        # SSE connection composable
│   ├── components/
│   │   ├── AppHeader.vue    # Top bar with nav tabs + viewer count
│   │   ├── CpuMemoryPanel.vue
│   │   ├── GpuPanel.vue
│   │   ├── NetworkPanel.vue
│   │   ├── DiskPanel.vue
│   │   └── SettingsPanel.vue
│   └── assets/
│       └── style.css        # Global styles (Tailwind or custom)
├── tests/
│   ├── server/
│   │   ├── collectors.test.js
│   │   ├── parsers.test.js
│   │   ├── settings.test.js
│   │   └── routes.test.js
│   └── client/
│       └── stores.test.js
└── public/
    └── favicon.svg
```

## Tech Stack
- **Backend**: Node.js, Express 5, SSE (Server-Sent Events)
- **Frontend**: Vue 3 (Composition API + `<script setup>`), Pinia, Chart.js (via vue-chartjs), Vite
- **Styling**: Custom CSS with CSS variables for theming (dark theme, glassmorphism cards)
- **Testing**: Vitest + @vue/test-utils + supertest + @vitest/coverage-v8
- **Build**: Vite builds frontend → `dist/`, Express serves `dist/` as static + API routes

## Design Language
- **Dark theme** with glassmorphism card panels (semi-transparent bg, blur backdrop, subtle borders)
- **Color palette**: 
  - Background: #0f0f23 (deep navy)
  - Cards: rgba(255,255,255,0.05) with backdrop-filter blur
  - Primary accent: #60a5fa (blue)
  - Success: #34d399 (green)
  - Warning: #fbbf24 (amber)
  - Danger: #f87171 (red)
  - Text: #e2e8f0 (light gray)
  - Muted text: #94a3b8
- **Typography**: Inter font (Google Fonts), monospace for data values (JetBrains Mono)
- **Cards**: Rounded corners (12px), subtle glow on hover
- **Charts**: Smooth gradient fills, animated transitions
- **Responsive**: CSS Grid layout, 2-col on desktop, 1-col on mobile. Tab navigation on mobile.
- **Animations**: Smooth transitions on data updates, subtle pulse on refresh buttons

## Panels

### 1. CPU & Memory Panel
- **CPU Usage**: Current % + sparkline/area chart (last 60 data points)
- **CPU Temperature**: Per-core temps, color-coded (green < 60°C, amber < 80°C, red >= 80°C)
- **Memory**: Used/Total bar + area chart (last 60 data points)
- **Swap**: Used/Total bar
- Each section has a manual refresh button (↻ icon)

### 2. GPU Panel
- **GPU Info**: Name, driver version, CUDA version
- **GPU Utilization**: % + mini chart
- **Memory**: Used/Total + bar
- **Temperature**: Color-coded
- **Power**: Current draw / limit
- **Processes**: Top GPU processes table
- **Raw nvidia-smi**: Collapsible section showing raw text output, with copy button
- Manual refresh button

### 3. Network Panel
- **Interfaces**: Table of network interfaces with name, IPv4, IPv6, speed, state
- **IP Addresses**:
  - Local IPs (all interfaces)
  - Tailscale IP + hostname (from `tailscale status --json`)
  - Public IPv4 (from `curl -4 ifconfig.me`)
  - Public IPv6 (from `curl -6 ifconfig.me`)
- Each IP has a copy button
- Manual refresh button

### 4. Disk Panel
- **Filesystems**: Table with mount point, type, size, used, available, use%
  - Color-coded usage bars (green < 70%, amber < 90%, red >= 90%)
- **SMART Info** (per disk device):
  - Expandable card per device
  - Parsed key SMART attributes with explanations:
    - Reallocated_Sector_Ct: "Number of bad sectors remapped. High values indicate disk degradation."
    - Power_On_Hours: "Total hours the disk has been powered on."
    - Temperature_Celsius: "Current disk temperature."
    - etc. (full list of common attributes with explanations)
  - Health assessment badge (PASSED/FAILED)
  - "Show Raw SMART" toggle → full smartctl output in monospace, with copy button
- Manual refresh button

### 5. Settings Panel
- **Refresh Intervals** (per field, in seconds):
  - CPU: default 2s (min 1s)
  - Memory: default 5s (min 1s)
  - GPU: default 5s (min 1s)
  - Network: default 60s (min 5s)
  - Disk: default 30s (min 10s)
  - SMART: default 300s (min 30s)
  - Fans: default 10s (min 2s)
- **Remote API Target**:
  - Target URL input (default: empty = local)
  - "Test Connection" button
  - Dropdown to switch between saved targets
  - Add/remove target buttons
- Settings persist to server-side JSON file
- Save button with success toast notification

## API Design (RESTful)

Base path: `/status/api`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status/api/metrics/cpu` | CPU usage, temps, load |
| GET | `/status/api/metrics/memory` | Memory + swap info |
| GET | `/status/api/metrics/gpu` | GPU info (nvidia-smi parsed) |
| GET | `/status/api/metrics/network` | Interfaces, IPs |
| GET | `/status/api/metrics/disk` | Filesystem usage |
| GET | `/status/api/metrics/smart` | SMART data for all disks |
| GET | `/status/api/metrics/smart/:device` | SMART for specific device |
| GET | `/status/api/metrics/fans` | Fan speeds |
| GET | `/status/api/metrics/ip` | Public IPv4, IPv6, Tailscale |
| GET | `/status/api/refresh/:field` | Force refresh a specific field |
| GET | `/status/api/settings` | Get current settings |
| PUT | `/status/api/settings` | Update settings |
| GET | `/status/api/viewers` | Current SSE viewer count |
| GET | `/status/api/stream` | SSE stream (all metrics) |

### SSE Stream Format
```
event: cpu
data: {"usage": 45.2, "cores": [...], "temps": [...]}

event: memory
data: {"total": 64000, "used": 32000, "free": 32000, "swap": {...}}

event: gpu
data: {"name": "RTX 3070", "utilization": 80, ...}

event: viewers
data: {"count": 2}
```

Each event type fires at its configured interval, ONLY when ≥1 SSE client is connected.

### Proxy Support for Remote API
When a remote target is configured in settings, the backend should proxy API requests to the remote target's `/status/api/` endpoints. The frontend always talks to the local backend.

## Collection Strategy ("Collect only when watched")
- Backend tracks SSE connection count
- When count goes from 0→1, start all collection intervals
- When count goes to 0, stop all intervals
- Manual refresh via `/status/api/refresh/:field` always works regardless of viewer count
- Each field has its own `setInterval` with configurable period

## System Information Collection

### CPU
```js
// Use systeminformation package
si.currentLoad() → { currentLoad, cpus: [{load}] }
si.cpuTemperature() → { main, cores: [] }
```

### Memory
```js
si.mem() → { total, used, free, available, swaptotal, swapused, swapfree }
```

### GPU (nvidia-smi)
```bash
nvidia-smi --query-gpu=name,driver_version,utilization.gpu,utilization.memory,memory.total,memory.used,memory.free,temperature.gpu,power.draw,power.limit --format=csv,noheader,nounits
```
Also collect raw `nvidia-smi` output for display.

### Network
```js
si.networkInterfaces() → [{iface, ip4, ip6, speed, operstate}]
```
```bash
tailscale status --json   # → parse .Self.TailscaleIPs, .Self.DNSName
curl -4 -s --max-time 5 ifconfig.me   # public IPv4
curl -6 -s --max-time 5 ifconfig.me   # public IPv6
```

### Disk
```js
si.fsSize() → [{fs, type, size, used, available, use, mount}]
si.blockDevices() → [{name, type, size, model}]
```

### SMART
```bash
smartctl -a /dev/sda --json   # or -j flag
smartctl --scan --json        # list devices
```
Parse JSON output. Provide human-readable explanations for each SMART attribute.

### Fans
```js
si.fans() → [{name, speed}]
```
Fallback: parse `sensors` command output.

## Settings File Format (server/settings.json)
```json
{
  "intervals": {
    "cpu": 2,
    "memory": 5,
    "gpu": 5,
    "network": 60,
    "disk": 30,
    "smart": 300,
    "fans": 10
  },
  "targets": [
    { "name": "Local", "url": "" }
  ],
  "activeTarget": 0
}
```

## Testing Requirements
- **Backend tests**: Mock systeminformation, test each collector, test API routes, test SSE connection counting, test settings CRUD
- **Parser tests**: Test SMART parsing with sample data, test all field explanations
- **Coverage target**: ≥ 95% statements, ≥ 90% branches, 100% lines
- **Framework**: Vitest + supertest for API tests

## Deployment (arch)
1. Build frontend: `npm run build` (Vite → dist/)
2. Copy project to arch: `rsync -avP /tmp/status-monitor-v2/ arch:~/status-monitor-v2/`
3. Install deps on arch: `cd ~/status-monitor-v2 && npm ci --production`
4. Run server: `node server/index.js` (port 3001)
5. Nginx config: proxy `/status/` to localhost:3001
6. HTTPS: tailscale cert → `/etc/nginx/certs/`
7. Process manager: systemd service or pm2

## Nginx Config
```nginx
location /status/ {
    proxy_pass http://127.0.0.1:3001/status/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection '';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache off;
    proxy_buffering off;         # Critical for SSE
    proxy_read_timeout 86400s;   # Keep SSE alive
}
```

## Important Notes
- All API paths MUST be prefixed with `/status/api/` (nginx proxies /status/ → app)
- The Express app should mount routes at `/status/api/` and serve static files at `/status/`
- Frontend must use relative paths or `/status/` prefix for all API calls
- CORS not needed (same origin via nginx proxy)
- The server should listen on `0.0.0.0:3001` (not just localhost, for testing)
