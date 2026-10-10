# MLAstroRPA — Firmware & Web UI Update

Official release repository for the **MLAstroRPA** Robotic Polar Alignment mount. This repository hosts the firmware and Web UI (SPIFFS) packages that the device uses when you run an update.

---

## What's in this repository

| Path | Description |
|---|---|
| `firmware X.Y.Z.bin` | ESP32 application firmware (versioned). |
| `spiffs X.Y.Z.bin` | Web UI assets (`index.html`, `script.js`, `style.css`). |
| `bootloader.bin` | ESP32 bootloader (rarely changes). |
| `partitions.bin` | Partition table with OTA support. |
| `meta.json` | Release metadata consumed by the update tool. |
| `CHANGELOG.md` | Version history and release notes. |
| `docs/` | The update web tool (served via GitHub Pages). |

---

## Update the device

There are **two supported ways** to update the mount — pick the one that fits your setup. No developer tools are required for any of them.

| # | Method | When to use |
|---|---|---|
| 1 | **OTA (over Wi-Fi)** — from the Web UI | The device is already joined to your Wi-Fi network. |
| 2 | **USB Serial (Web Serial)** — from the update page | The device is reachable only by USB cable. | 

> 🌐 **Internet connection required.** Both ways download the release from GitHub, so the device and/or the PC must be online:
> - **OTA (over Wi-Fi)** — the **mount** should have internet (it downloads the `.bin` itself — the most reliable path). If the mount is offline, the **browser** (PC/phone) can download the file and push it over Wi-Fi instead.
> - **USB Serial (Web Serial)** — only the **PC** needs internet; the mount can stay offline.

### Connect the mount to the internet (for OTA)

The mount gets internet by joining your Wi-Fi **router** in **Station mode**. Its own AP stays active, so you can configure it from `http://192.168.4.1`.

1. Connect your PC/phone to the mount's AP (`MLAstroRPA-XXXX`, password `MLAstroRPA`) and open **http://192.168.4.1**.
2. Go to **🛠️ CONFIG → 📶 WiFi Configuration → Station Mode**.
3. Press **🔍 Scan** and pick your **router SSID** (the network with internet).
4. Enter the router **Password**, then **⚡ APPLY SETTINGS** to test or **✓ SAVE ALL & REBOOT** to keep it.
5. Confirm **Current STA mode IP** shows a LAN address (e.g. `192.168.1.50`) — the mount is now online.

> 💡 If the mount cannot reach a router, use **USB Serial** — only the PC needs internet.

### 1. OTA (over Wi-Fi) — from the Web UI

1. Open the Web UI → **🛠️ CONFIG → 🚀 System Update**.
2. Click **🔍 CHECK FOR UPDATES**.
3. Pick **Firmware** and/or **Web UI (SPIFFS)** and install over **OTA**.
4. Wait for the progress overlay to finish (~2 minutes).

### 2. USB Serial (Web Serial) — from the update page

1. Connect the device to the PC with a USB cable.
2. Open the update page in a Chromium browser (Chrome / Edge):

   **https://mlastrorpa.github.io/Firmware-Update/?updates=1**

3. Choose the version (also tick `partitions.bin` and `bootloader.bin` if needed). Click [CONNECT] to open USB flash dashboard then follow the on-screen prompts.


> ⚠️ Do not power off or disconnect the device during any update.

---

## Using the MLAstroRPA Webserver

### 1. Power & connect

Power on the mount. The device runs **two network roles at the same time**:

| Role | What it does |
|---|---|
| **AP (Access Point / Hotspot)** | The device broadcasts its own Wi-Fi network — you can connect directly to it even with no router or internet. |
| **STA (Station)** | The device joins a saved Wi-Fi router and becomes reachable from your LAN. |

#### 1.1 Connect to the Access Point (AP)

| Setting | Default value |
|---|---|
| **SSID** | `MLAstroRPA-XXXX` — `XXXX` = last 3 hex of the MAC, **unique per unit** (avoids name collisions when several RPA share the same network) |
| **Password** | `MLAstroRPA` |
| **IP** | `192.168.4.1` |

Steps:

1. Open the Wi-Fi list on your PC / phone.
2. Find the network starting with `MLAstroRPA-` (e.g. `MLAstroRPA-A1B2C3`). If there are several, each RPA has a different suffix — pick the one matching your unit (see *1.3*).
3. Join it with password `MLAstroRPA`.
4. Open a browser and go to **http://192.168.4.1**.
5. The page automatically connects to the WebSocket endpoint `/ws`.

> 💡 The AP needs no internet — it is the quickest way to reach the Web UI in the field or at a star party.

#### 1.2 Join your router (STA / Station mode)

Connecting to your home/observatory Wi-Fi lets you control the mount from any device on the LAN and enables OTA updates.

1. Open the Web UI (via the AP above).
2. Go to **🛠️ CONFIG → 📶 WiFi Configuration → Station Mode**.
3. Press **🔍 Scan** to list nearby networks.
4. Select your router's **SSID** and enter its **Password**.
5. Press **⚡ APPLY SETTINGS** (test now, not saved) or **✓ SAVE ALL & REBOOT** to keep it.
6. Read the **Current STA mode IP** (e.g. `192.168.1.50`) — that is where the device is reachable on the LAN.

The AP stays alive while STA connects, so you can always fall back to `http://192.168.4.1`.

> ⚠️ The STA IP is assigned by the router's DHCP and may change on reboot. If you forget it, open the Web UI via the AP and read it from the **📶 WiFi Configuration** panel.

#### 1.3 Which device is mine?

When several mounts share one location/network, identify a unit by its **3-character MAC suffix** — the same `XXXX` appears in:

- The AP **SSID**: `MLAstroRPA-XXXX`
- The **serial number** reported over USB serial (full MAC, e.g. `A1:B2:C3:D4:E5:F6`)
- A **label** on the unit housing (recommended: print the 3-character suffix on it)

### 2. Open the Web UI

- **Via AP:** open **http://192.168.4.1**.
- **Via LAN (STA):** open the **Current STA mode IP** shown in the WiFi Configuration panel.
- The page automatically connects to the WebSocket endpoint `/ws`.

### 3. Basic workflow

The Web UI is split into two tabs:

- **🎮 CONTROL** — everything you use during a session: moving the mount, monitoring, polar alignment, and logs.
- **🛠️ CONFIG** — all limits, motor, network, calibration and save actions.

A normal session follows the **MAN → AUTO → SAFETY → CONFIG & SAVE** workflow below.

#### 3.1 MAN — Manual movement (🎮 CONTROL → 🕹️ Manual Movement)

1. Pick a **Speed Level (1–5)** — higher levels move faster.
2. Choose a move mode:
   - **Jog (Hold)** — press and hold an arrow to move continuously; release to stop.
   - **Relative (Step)** — set a step size in degrees / arcminutes / arcseconds, then press an arrow once to move exactly that amount.
3. Use the directional pad: **▲/▼ Altitude**, **◄/► Azimuth**, **⏹** to stop.
4. In an emergency, hit the red **FORCE STOP** button in the header — it halts both axes immediately.

The **📐 Position** panel shows current Azimuth/Altitude (from home), step counters, output speed and the **Homed** status. From there you can:

- **🏠 SET HOME HERE** — mark the current position as home.
- **↻ RETURN TO HOME** — move both axes back to home.
- **⚠️ RESET HOME** — clear the home reference.

#### 3.2 AUTO — Polar alignment (🎮 CONTROL → 🎯 Polar Alignment)

1. In **Alt Error** / **Az Error**, enter the measured error in Deg / Min / Sec.
2. Choose the correction direction: **Up/Down** for Alt, **Left/Right** for Az.
3. Click **Align Alt** or **Align Az** to correct a single axis, or **✓ ALIGN ALL** to correct both at once.
4. Watch **Azimuth Moved** / **Altitude Moved** to see the applied correction.

**Automatic calibration** (used to compute exact `steps/degree` after mechanics or microstep changes):

- Go to **🛠️ CONFIG → 🔑 Admin Config → Travel Calibration**.
- Set the **Travel Angle** for Azimuth (default 20°) and Altitude (default 30°).
- Click **AZ Calib**, **ALT Calib** or **Calib All**. The axis travels to both hard limits — **make sure the path is clear**.
- When the result appears, either **Apply Steps/Deg Only** or **Apply result & Auto center** (moves back to center and sets home).

#### 3.3 SAFETY — Limits & monitoring

- **📏 Soft Limits** (🛠️ CONFIG): enable and set the AZ (±9°) and ALT (±14°) travel range in degrees. The mount refuses moves outside this range.
- Header **FORCE STOP** and **⚠️ RESET ERROR** (in **📋 System Log**) let you stop and clear error states after a limit trip.
- In **🔑 Admin Config**, keep **Enable Communication Watchdog** on so the mount performs an E-STOP if the control app loses the heartbeat.

#### 3.4 CONFIG & SAVE (🛠️ CONFIG tab)

- **⚙️ Motor Driver (TMC2209)** — per-axis **Run/Hold current**, **Start-up Booster**, **Soft CoolStep**, **Microsteps**, **Accel/Decel**, **Steps/Degree**, **StealthChop / SpreadCycle** mode and **Reverse Direction**.
- **↔️ Backlash** — anti-backlash compensation in steps.
- **📶 WiFi Configuration** — Access Point (SSID/password/IP) and Station mode (connect to your router, scan for networks, see connected clients).
- **🔑 Admin Config** — serial port settings, swap Az-Alt motor ports (reboot required), show current step, factory zero, max motor RPM, travel calibration, and password change.

Finally, use **💾 Configuration Management** to commit your changes:

| Button | What it does |
|---|---|
| **⚡ APPLY SETTINGS** | Apply to RAM only — lost on reboot. Good for quick tests. |
| **✓ SAVE ALL & REBOOT** | Persist everything to FRAM and reboot. Use this to keep changes. |
| **⏻ REBOOT** | Reboot without saving (discards unapplied changes). |
| **⚠️ FACTORY RESET** | Restore factory defaults. The confirmation modal asks for the **admin password** (default: `password`) so it cannot be triggered by accident. |

##### 3.4.1 CONFIG reference (in detail)

The CONFIG tab is split into seven collapsible panels. All values are stored in non-volatile FRAM memory and only become permanent when you press **✓ SAVE ALL & REBOOT**.

######  Soft Limits (Degrees)

Software limits — the mount refuses to move outside the configured angle range (measured from home).

- **Enable Soft Limit** — turn software limits on/off.
- **AZ Min / Max** — azimuth range (default ±9°).
- **ALT Min / Max** — altitude range (default ±14°).

> Min must be smaller than Max — the Web UI validates this before applying/saving.

###### ⚙️ Motor Driver (TMC2209)

Configured independently for the **AZ Motor** and **ALT Motor** (tick **Reverse Direction** if a motor spins the wrong way).

| Setting | Meaning |
|---|---|
| **Run Current (mA)** | Current while the motor is moving. |
| **Hold Current (mA)** | Current while the motor is stationary (auto-capped at Run Current). |
| **Start-up Booster (%)** | Extra current at start-up (100–150%) to overcome inertia, then reduced. |
| **Soft CoolStep (%)** | Minimum current scale at high speed (10–120%) — current is gradually lowered as the motor reaches speed, keeping it cool and quiet. |
| **Microsteps** | 2–256 microsteps (8–16 is typical). |
| **Accel / Decel (steps/s²)** | Acceleration / deceleration rate. |
| **Steps/Degree** | Steps per degree (5-decimal precision). If unknown, run **Travel Calibration**. |
| **Mode: StealthChop / SpreadCycle** | StealthChop = quiet, for light load. SpreadCycle = stronger, more precise at speed, better for stall detection. |

###### ↔️ Backlash

- **Enable Anti Backlash on firmware** — compensate for gear backlash in firmware.
- **AZ Backlash / ALT Backlash (steps)** — compensation steps applied on every direction change.


**How it works — Backlash compensation**

There is always a small amount of play between the motor shaft and the output (gearbox / lead screw). When the direction reverses, the first few motor steps only take up that play — the output does not move yet — so without compensation the final position ends up short by exactly the play amount.

The firmware tracks the last travel direction of each axis. When a new move is in the **opposite direction**, it shifts the position counter by the configured `backlash` steps in the reverse direction *before* computing the move distance:

```
distanceToGo = target − (currentPosition ∓ backlashSteps)
```

This commands the motor to travel `backlashSteps` **extra** steps — exactly what is needed to take up the mechanical play — so the output lands precisely on the target. The compensation is applied on every direction change during **Align Az/Alt** and **Return to Home**. To tune it, measure the play of each axis and enter it as steps; too small leaves residual error, too large overshoots.

###### 📶 WiFi Configuration

- **Access Point (Hotspot)** — AP **SSID**, **Password** (min 8 chars), **IP Address**, **Subnet Mask**. Defaults: SSID/password `MLAstro RPA`, IP `192.168.4.1`.
- **Connected Clients** — live list of devices connected to the AP (name, IP, MAC).
- **Station Mode** — connect the device to your router: enter the **WiFi SSID**, press **🔍 Scan** to list networks, enter the **Password**. **Current STA mode IP** shows the address once connected.

###### 🔑 Admin Config

This panel is locked — press **🔑 Admin Config** in *Configuration Management* and enter the password (default: `password`).

| Setting | Meaning |
|---|---|
| **🔌 Serial Setting** | Serial port for external control (N.I.N.A, etc.): **Baud** (default 115200), **Data Bits** (8), **Stop Bits** (1), **Parity** (None). |
| **Enable Communication Watchdog** | If the control software loses the heartbeat, the mount performs an **E-STOP**. |
| **Enable Simply polling telemetry while running motor** | Reduce telemetry load while a motor is running. |
| **Show Serial logs** | Forward Serial TX/RX logs over WebSocket (debugging aid). |
| **Swap Az-Alt motor ports** | Swap the two motor port assignments (**requires reboot**). |
| **Show current step in Control tab** | Show step counters on the CONTROL tab. |
| **📍 SET FACTORY ZERO** | Set the soft-limit reference at the current physical position **and apply SET HOME HERE** at the same time. |
| **Max Motor RPM (Speed Level 5)** | Maximum RPM of speed level 5 (50–400); lower levels are derived from it. |
| **Travel Calibration** | Measure exact `Steps/Degree` by driving to both hard limits. |
| **🔒 Change Admin Password** | Change the admin password (max 63 chars). |

**Travel Calibration** — measure `Steps/Degree` automatically:

- Set the **Travel Angle** (Azimuth default 20°, Altitude default 30°).
- Press **STOP**, **AZ Calib**, **ALT Calib** or **Calib All**. The axis drives until it hits both hard limits, then the firmware computes the real `Steps/Degree`.
- On completion choose **Apply Steps/Deg Only** or **Apply result & Auto center** (returns to center and sets home).

> ⚠️ Make sure the travel path is clear — the axis runs the full range.

###### 🚀 System Update

- **🔍 CHECK FOR UPDATES** — compares against the release repository (`MLAstroRPA/Firmware-Update`) via `meta.json` (**internet required**).
- Choose **Firmware** and/or **Web UI (SPIFFS)** and install over **OTA (Wi-Fi)** or **USB Serial (Web Serial)**.
- A progress overlay shows the update (~2 minutes) — **do not power off or refresh** during installation.

###### 💾 Configuration Management

| Button | When to use |
|---|---|
| **⚡ APPLY SETTINGS** | Quick test — applies to RAM only, lost on reboot. |
| **✓ SAVE ALL & REBOOT** | Persist everything to FRAM and reboot — the required final step to keep changes. |
| **⏻ REBOOT** | Reboot without saving (discards unapplied changes). |
| **🔑 Admin Config** | Unlock the Admin panel (password prompt). |
| **⚠️ FACTORY RESET** | Erase **all** settings (WiFi, motor, limits, tuning, password) and restore factory defaults — **cannot be undone**. The confirmation modal asks for the **admin password** (default: `password`). |

#### 3.5 First-time setup — quick sequence

1. Open the Web UI and go to **🛠️ CONFIG**.
2. Set **Soft Limits**.
3. Verify **Motor Driver** parameters; if `Steps/Degree` is unknown, run **Travel Calibration** and **Apply result & Auto center**.
4. Click **✓ SAVE ALL & REBOOT** to persist.
5. Use **🎮 CONTROL → 🕹️ Manual Movement** (or **Return to Home**) to position the mount, then apply corrections with **🎯 Polar Alignment**.
6. When aligned, click **🏠 SET HOME HERE**, then **✓ SAVE ALL & REBOOT**.
7. Optionally integrate with **N.I.N.A / custom software** via USB Serial (see section 4) or the WebSocket API.

### 4. Serial control (PC / N.I.N.A)

- Baud: `115200`, 8 data bits, no parity (`8N1`).
- Start a session with the handshake command:

```text
[MLAstroRPA-TC]
```

- Once Serial control is active, the Web UI is locked to avoid command collision.

---

## Versioning

- The latest release is **`1.2.61`** (see `CHANGELOG.md` for the full history).
- Firmware and Web UI are released together; install both from the same version.

---

## Support

- Report issues: https://github.com/MLAstroRPA/Firmware-Update/issues
- Contact: `trong.minh@mlastro.com`
