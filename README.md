# System Monitor WebUI

Real-time system monitoring dashboard with Vue 3 + Express 5 + Chart.js + SSE.

![](https://img.shields.io/badge/platform-linux%20%7C%20macOS-blue)
![](https://img.shields.io/badge/node-%3E%3D18-green)

## Features

- **5 panels**: CPU/Memory, GPU, Network, Disk/SMART, Settings
- **Real-time updates** via Server-Sent Events (SSE)
- **Smart collection**: only collects data when viewers are connected
- **Per-field configurable refresh intervals**
- **Token-based auth**: protects API and HTML entry; static assets bypass auth
- **i18n**: Chinese (default) + English
- **Cross-platform**: Linux (full support) + macOS/Apple Silicon (see below)
- **Glassmorphism dark theme**, responsive (mobile + desktop)

## Quick Start

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start server
AUTH_TOKEN=your-secret-token PORT=3001 node server/index.js
```

Visit `http://localhost:3001/status/?token=your-secret-token`

### Development

```bash
npm run dev  # Starts Vite dev server + Express backend concurrently
```

## Deployment

### systemd Service

```ini
[Unit]
Description=System Monitor WebUI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/status-monitor-v2
ExecStart=/usr/bin/node server/index.js
Environment=AUTH_TOKEN=your-secret-token
Environment=PORT=3001
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Reverse Proxy (with HTTPS)

```nginx
location /status/ {
    proxy_pass http://127.0.0.1:3001/status/;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
    # Required for SSE
    proxy_set_header X-Accel-Buffering no;
}
```

## Authentication

Set the `AUTH_TOKEN` environment variable. Requests must include the token via:

- URL parameter: `?token=your-secret-token`
- HTTP header: `Authorization: Bearer your-secret-token`

Static assets (JS, CSS, SVG, fonts) bypass auth. Only the HTML entry point and API endpoints are protected. Missing or invalid tokens receive `403 Forbidden`.

## Platform Support

### Linux (Full Support)

All collectors work out of the box. For SMART and temperature data, configure sudoers:

```bash
sudo visudo -f /etc/sudoers.d/status-monitor
```

Add the following line (replace `YOUR_USER` with the user running the service):

```
YOUR_USER ALL=(root) NOPASSWD: /usr/sbin/smartctl
```

Verify:

```bash
sudo -n smartctl --scan --json
```

### macOS / Apple Silicon

The monitor supports macOS with platform-specific adaptations:

| Feature | Status | Source |
|---------|--------|--------|
| CPU load + per-core | ✅ | systeminformation |
| Memory | ✅ | systeminformation |
| Disk / Filesystem | ✅ | systeminformation |
| Network interfaces | ✅ | systeminformation |
| IP / Tailscale | ✅ | curl + tailscale CLI |
| GPU model + cores | ✅ | `system_profiler` |
| GPU utilization + frequency | ✅ | `powermetrics` (requires sudo) |
| CPU/GPU/ANE power (mW) | ✅ | `powermetrics` (requires sudo) |
| Thermal pressure | ✅ | `powermetrics` (requires sudo) |
| CPU temperature (°C) | ⚠️ | Requires `smctemp` CLI helper (see below) |
| Fan speed (RPM) | ⚠️ | Requires `smctemp` CLI helper (see below) |
| SMART | ⚠️ | Requires `brew install smartmontools` |

#### macOS sudoers Configuration

```bash
sudo visudo -f /etc/sudoers.d/status-monitor
```

Add:

```
YOUR_USER ALL=(root) NOPASSWD: /usr/bin/powermetrics, /usr/local/bin/smartctl, /opt/homebrew/bin/smartctl
```

Verify:

```bash
sudo -n powermetrics --samplers thermal -n1 -i500
```

If data is printed without a password prompt, you're good.

#### Temperature & Fan Data on Apple Silicon

Apple Silicon Macs do not expose CPU/GPU temperature through standard APIs (`systeminformation` returns `null`, `powermetrics` only reports thermal pressure level, not °C).

To get actual temperature readings and fan speed, install the **`smctemp` CLI helper** (a small Swift binary that reads SMC keys directly):

> 🚧 **Coming soon** — A dedicated Swift CLI helper is planned. It will output sensor data in a simple `Key: Value` format that the monitor parses automatically.

Expected output format:

```
CPU Die: 45.2
GPU: 38.1
SoC: 42.5
Fan 0: 1800
```

Once installed, place it in your `$PATH` as `smctemp`. The monitor will automatically detect and use it.

Without `smctemp`, the temperature panel will show **thermal pressure level** (Nominal / Fair / Serious / Critical) instead of °C values, and the fan panel will be empty.

## API Reference

All endpoints are prefixed with `/status/api/`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metrics/:field` | Get cached metric data |
| GET | `/refresh/:field` | Force-refresh a metric and broadcast via SSE |
| GET | `/metrics/smart/:device` | SMART data for a specific device |
| GET | `/settings` | Get current settings |
| PUT | `/settings` | Update settings |
| GET | `/viewers` | Current viewer count |
| GET | `/stream` | SSE event stream |

**Available fields**: `cpu`, `memory`, `gpu`, `network`, `ip`, `disk`, `smart`, `fans`, `temperature`

### macOS-specific API Response Fields

When running on macOS, some responses include additional fields:

**GPU** (`/metrics/gpu`):
```json
{
  "available": true,
  "platform": "macos",
  "gpus": [{
    "name": "Apple M4",
    "cores": 10,
    "metalSupport": "Metal 3",
    "utilization": 4.82,
    "idleResidency": 95.18,
    "powerMw": 67,
    "cpuPowerMw": 47,
    "anePowerMw": 0,
    "combinedPowerMw": 105,
    "frequencyResidency": [
      { "mhz": 338, "percent": 0.42 },
      { "mhz": 618, "percent": 0 }
    ]
  }]
}
```

**Temperature** (`/metrics/temperature`):
```json
{
  "sensors": [
    { "name": "CPU Die", "value": 45.2, "type": "cpu" },
    { "name": "GPU", "value": 38.1, "type": "gpu" }
  ],
  "thermalPressure": "Nominal",
  "platform": "macos",
  "max": 45.2
}
```

## Project Structure

```
├── server/
│   ├── index.js          # Express app + SSE management
│   ├── routes.js         # API routes
│   ├── collectors.js     # Data collectors (Linux + macOS)
│   ├── parsers.js        # SMART data parser
│   ├── settings.js       # Settings persistence
│   └── auth.js           # Token auth middleware
├── src/
│   ├── App.vue           # Main app
│   ├── components/       # Panel components
│   ├── composables/      # useSSE hook
│   ├── stores/           # Pinia stores
│   ├── i18n/             # zh.js + en.js
│   └── utils/            # Token helper
├── tests/
│   ├── server/           # Backend tests
│   └── client/           # Frontend tests
└── README.md
```

## Testing

```bash
npm test              # Run all tests with coverage
npm run test:watch    # Watch mode
```

114 tests, ~97% statement coverage.

## License

MIT
