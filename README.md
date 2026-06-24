# Tesla Wall Connector Monitor

Monitor a fleet of Tesla Wall Connectors (Gen 3) and receive alerts via **WhatsApp** and/or **Telegram**.

## Features

- 🔌 **Fleet Monitoring** — Poll multiple Wall Connectors via local REST API
- 🚨 **9 Alert Types** — Offline, faults, temperature, power, charging events, grid anomalies
- 📱 **WhatsApp Notifications** — Via whatsapp-web.js (free, requires QR scan)
- 📬 **Telegram Notifications** — Via official Bot API (free, reliable)
- 📊 **Web Dashboard** — Real-time fleet status at `http://localhost:3000`
- 🗄️ **Alert History** — SQLite database with full alert and notification log
- 🐳 **Docker Ready** — docker-compose with persistent volumes

## Quick Start

### 1. Configure

```bash
cp config/config.example.yaml config/config.yaml
cp .env.example .env
```

Edit `config/config.yaml` with your Wall Connector IPs and notification settings.

### 2. Run with Docker

```bash
# Set your Telegram bot token in .env
echo "TELEGRAM_BOT_TOKEN=your-token-here" > .env

# Build and run
docker compose up -d
```

### 3. Run Locally (Development)

```bash
npm install
npm run build
npm start
```

## Configuration

### Wall Connectors

Each Wall Connector needs its local IP address. Your monitor must be on the same network.

```yaml
wall_connectors:
  - name: "Garage Bay 1"
    host: "192.168.1.100"
    enabled: true
```

**Finding the IP:** Check your router's DHCP client list, or use `nmap -sn 192.168.1.0/24`.

### Alert Thresholds

```yaml
alerts:
  temperature_warning_c: 70     # °C
  temperature_critical_c: 85
  max_power_kw: 11.5
  max_session_energy_kwh: 100
  grid_voltage_range: [210, 250]
  grid_frequency_range: [49.5, 50.5]
  offline_after_misses: 3
  cooldown_minutes: 15          # Prevents alert spam
```

### Notification Groups

Each group can use WhatsApp or Telegram and filter by alert type and severity:

```yaml
notification_groups:
  - name: "Maintenance Team"
    channel: "telegram"
    bot_token: "${TELEGRAM_BOT_TOKEN}"
    chat_id: "-1001234567890"
    alerts: ["device_offline", "charging_fault", "over_temperature"]
    severity_filter: "warning"

  - name: "All Alerts"
    channel: "whatsapp"
    group_id: "120363XXXXX@g.us"
    alerts: ["all"]
    severity_filter: "info"
```

## Setting Up Telegram

1. Open Telegram and chat with [@BotFather](https://t.me/botfather)
2. Send `/newbot`, choose a name and username
3. Copy the bot token to your `.env` file
4. Add the bot to your group
5. Get the group chat ID:
   - Send a message in the group
   - Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Find the `chat.id` (negative number like `-1001234567890`)

## Setting Up WhatsApp

1. Use a **dedicated phone number** (not your personal one)
2. Start the monitor — a QR code will appear in the terminal
3. Scan it with WhatsApp on your phone
4. The session is saved automatically (no re-scan needed on restart)
5. Get group IDs from the logs or dashboard

> ⚠️ **Warning:** whatsapp-web.js is unofficial. WhatsApp may restrict automated accounts. Use a dedicated number.

## Alert Types

| Alert | Severity | Trigger |
|---|---|---|
| `device_offline` | 🔴 Critical | Wall Connector unreachable |
| `charging_fault` | 🔴 Critical | EVSE error state |
| `over_temperature` | 🟡 Warning/Critical | Temp exceeds threshold |
| `high_power` | 🟡 Warning | Power draw above limit |
| `charging_started` | 🟢 Info | Charging session begins |
| `charging_completed` | 🟢 Info | Charging session ends |
| `session_energy` | 🟡 Warning | Session energy above limit |
| `grid_anomaly` | 🟡 Warning | Voltage/frequency out of range |
| `firmware_mismatch` | ℹ️ Info | Different firmware versions |

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Web dashboard |
| `GET /api/devices` | Device states (JSON) |
| `GET /api/alerts?limit=50` | Recent alerts (JSON) |
| `GET /api/stats?hours=24` | Alert statistics (JSON) |
| `GET /api/health` | Health check |

## Requirements

- Tesla Wall Connector **Gen 3** (with WiFi)
- Network access from monitor to Wall Connectors
- Node.js 20+ (or Docker)
- (Optional) Telegram bot token
- (Optional) Dedicated WhatsApp number

## License

MIT
