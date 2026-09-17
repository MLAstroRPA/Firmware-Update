# Changelog

All notable changes to MLAstroRPA Webserver will be documented in this file.

---


## [1.4.1] - 2026-09-16

### Fixed — panic `Stack canary watchpoint triggered (NetworkTask)` when a WS client dropped

### Added — mDNS refresh định kỳ (lưới an toàn chống responder "chết âm thầm")

**Files:** `src/Web/WebControl.cpp`, `src/Web/WebControl.h`, `src/main.cpp`, `src/Serial/SerialControl.cpp`,
`src/Wifi/WifiConfig.cpp`, `src/Wifi/WifiConfig.h`, `data/index.html`, `CHANGELOG.md`

## [1.4.0] - 2026-09-15

### Added — boot status beep + panic core dump

### Fixed — mDNS: self-probe removed (it rebuilt mDNS every 10 minutes)

### Changed — flash offsets follow the new partition table

**Files:** `src/main.cpp`, `src/GPIO/BuzzerControl.cpp`, `src/GPIO/BuzzerControl.h`,
`src/Wifi/WifiConfig.cpp`, `src/Wifi/WifiConfig.h`, `partitions_coredump.csv`, `platformio.ini`,
`data/index.html`, `data/script.js`, `.vscode/FORCE-COPY.py`, `.vscode/Flash_*.bat`, `README.MD`,
`Documentation/User manual.md`, `TestTool/mock_server.py`, `CHANGELOG.md`

## [1.3.1] - 2026-09-14

### Fixed — mDNS: no periodic restarts any more, rebuild only when it matters

**Files:** `src/Wifi/WifiConfig.cpp`, `src/Wifi/WifiConfig.h`, `Documentation/Log & Error table.md`

---


## [1.3.0] - 2026-09-12

### Added — mDNS hostname `MLAstroRPA.local`

### Added — PC (plugin) control over WebSocket (handshake `MLAstroRPA-TC`)

**Files:** `src/main.cpp`, `src/Wifi/WifiConfig.cpp`, `src/Wifi/WifiConfig.h`, `src/Web/WebControl.cpp`,
`src/Web/WebControl.h`, `src/Serial/SerialControl.cpp`, `src/Serial/SerialControl.h`, `data/script.js`,
`src/Websocket-protocol.md`

### Changed — log replay + RAM (serial-log queue is now allocated on demand)

**Files:** `src/main.cpp`, `src/Web/WebControl.cpp`

### Added — WebSocket command & alarm channel for PC clients

**Files:** `src/Web/WebControl.cpp`, `src/Serial/SerialControl.cpp`, `src/main.cpp`, `data/script.js`,
`src/Websocket-protocol.md`

### Changed — Two-way setting sync (Relative mode, speed level, config)

**Files:** `src/Web/WebControl.cpp`, `src/Web/WebControl.h`, `src/Serial/SerialControl.cpp`

### Changed — Identical logs on every control path (Serial / Web / PC-over-WebSocket)

**Files:** `src/Serial/SerialControl.cpp`, `src/Web/WebControl.cpp`

### Changed — Jog & soft limits: refuse only at the limit, warn on every refusal

### Changed — One config JSON for every client (connect snapshot + config pushes)

**Files:** `src/Web/WebControl.cpp`, `src/Websocket-protocol.md`

### Changed — WiFi STA failure diagnostics + passwords are no longer broadcast

**Files:** `src/Wifi/WifiConfig.cpp`, `src/Wifi/WifiConfig.h`, `src/Web/WebControl.cpp`,
`src/Serial/SerialControl.cpp`, `src/FRAM/configmanager.cpp`, `src/main.cpp`, `data/index.html`,
`data/script.js`, `src/Serial-protocol.md`, `src/Websocket-protocol.md`, `Documentation/`

---

## [1.2.72] - 2026-09-11

### Fixed — Backlash Compensation Now Really Moves the Axis on Relative (Step) Moves

### Changed — Relative-Move Logs Now Report the Backlash Compensation (Web + Serial)

**Files:** `src/Steper/Steper.cpp`, `src/Steper/Steper.h`, `src/Web/WebControl.cpp`, `src/Serial/SerialControl.cpp`, `src/main.cpp`, `data/index.html`

---

## [1.2.71] - 2026-09-08

### Fixed — Open-Load Detection Now Reads the Driver's OLA/OLB Flags (SG_RESULT Dropped)

**Files:** `src/Steper/Steper.cpp`

---

## [1.2.70] - 2026-09-07
### hotfix: remove openload detect

## [1.2.69] - 2026-09-07
### fix: Bug reset ESP when press APPLY

## [1.2.68] - 2026-09-07

### Fixed — Web APPLY / SAVE & REBOOT Did Nothing (Large WebSocket Messages Lost)

**Files:** `src/Web/WebControl.cpp`

### Changed — Web SAVE & REBOOT Confirms the Save Before Rebooting

**Files:** `data/script.js`, `src/Web/WebControl.cpp`

### Changed — Serial `Save&Reboot` No Longer Auto-Reboots

**Files:** `src/Serial/SerialControl.cpp`, `src/Serial-protocol.md`

### Changed — Backlash Logs Now Show Compensated Steps and Arc-Minutes

**Files:** `src/Web/WebControl.cpp`, `src/Serial/SerialControl.cpp`, `src/main.cpp`

### Changed — Web UI Fully Read-Only While Serial Holds Control

**Files:** `data/style.css`, `data/script.js`

---

## [1.2.67] - 2026-09-03

### Changed — Faster & More Reliable Open-Load (Motor-Not-Connected) Detection

**Files:** `src/Steper/Steper.cpp`, `src/Steper/Steper.h`

### Changed — Driver Error Handling (Removes False "Not Connected" / False Open-Load)

**Files:** `src/Steper/Steper.cpp`

### Added — Web UI Resets Page Scroll on Tab Switch

**Files:** `data/script.js`

---

## [1.2.66] - 2026-08-28

### Changed — Serial Handshake Takes Priority Over Web

**Files:** `src/main.cpp`, `data/script.js`

### Fixed — Serial Handshake Dropped When Communication Watchdog Disabled

**Files:** `src/main.cpp`, `src/Serial/SerialControl.cpp`, `src/Serial/SerialControl.h`

### Added — Serial `Disconnect` Command (Graceful Handshake Release)

**Files:** `src/Serial/SerialControl.cpp`, `Services/SerialConnectionService.cs`, `src/Serial-protocol.md`

### Added — Independent Error Telemetry over Serial (`ERROR:` line)

**Files:** `src/Serial/SerialControl.cpp`, `src/Serial/SerialControl.h`, `src/main.cpp`

### Added — Post-Start Driver Connectivity Check + System Lock

**Files:** `src/Serial/SerialControl.cpp`, `src/Steper/Steper.cpp`, `src/Steper/Steper.h`, `src/Web/WebControl.cpp`, `src/main.cpp`

### Changed — Main Telemetry Cleaned Up (protocol-accurate)

**Files:** `src/Serial/SerialControl.cpp`

### Added — Web System Log: replay, dedup and Reset cleanup

**Files:** `src/Web/WebControl.cpp`, `src/main.cpp`, `src/Serial/SerialControl.cpp`, `data/script.js`

### Added — Web "Enable Communication Watchdog" quick toggle

**Files:** `data/index.html`, `data/script.js`, `src/Web/WebControl.cpp`

---

## [1.2.65] - 2026-08-27

### Fixed — Alignment Values Not Updating While Running (Telemetry Cache)

**Files:** `src/Serial/SerialControl.cpp`

### Added — Open-Load / Motor-Not-Connected Detection (StallGuard Back-EMF)

**Files:** `src/Steper/Steper.cpp`, `src/Serial/SerialControl.cpp`, `src/Steper/Steper.h`

### Changed — Driver Reads Gated to Boot + Open-Load Window (fixes false "Driver communication lost")

**Files:** `src/Steper/Steper.h`, `src/Steper/Steper.cpp`

### Fixed — Open-Load No Longer Misreported as Hard Limit (no reverse-run)

**Files:** `src/Steper/Steper.cpp`, `src/Steper/Steper.h`, `src/main.cpp`

### Changed — Hard Limits UI Reorganized under Admin Config

**Files:** `data/index.html`

---

## [1.2.64] - 2026-08-26

### Fixed — 3-Beep ERROR Alert for Hardlimit & Motor Error

**Files:** `src/main.cpp`, `src/Web/WebControl.cpp`, `src/Serial/SerialControl.cpp`

### Added — Serial RESET ERROR Command (`ReER:1`)

**Files:** `src/Serial/SerialControl.cpp`, `src/Serial-protocol.md`

---

## [1.2.59] - 2026-08-18

### Added — Alt P.A Overshoot Direction Checkboxes

**Files:** `src/FRAM/ConfigManager.h`, `src/main.cpp`, `src/Serial/SerialControl.cpp`, `src/Web/WebControl.cpp`, `data/index.html`, `data/script.js`

### Changed — Backlash & P.A Overshoot UI

**Files:** `data/index.html`

### Fixed — Intermittent FRAM Save (SAVE ALL & REBOOT)

**Files:** `src/Web/WebControl.cpp`, `src/main.cpp`

### ⚡ Changed — Auto-center FRAM Write Moved to Core 0

**Files:** `src/main.cpp`

## [1.2.58] - 2026-08-17

### Added — Swap Az-Alt Motor Ports

**Files:** `lib/AccelStepper/src/AccelStepper.{h,cpp}`, `src/FRAM/ConfigManager.h`, `src/Steper/Steper.{h,cpp}`, `src/main.cpp`, `src/Serial/SerialControl.cpp`, `src/Web/WebControl.cpp`, `data/index.html`, `data/script.js`

### Changed — 5 s Non-Blocking Reboot Countdown

**Files:** `src/Serial/SerialControl.cpp`, `src/Serial/SerialControl.h`, `src/main.cpp`, `data/script.js`

### Fixed — REBOOTING Status Maintained Until Reboot

**Files:** `src/main.cpp`, `data/script.js`

## [1.2.57] - 2026-08-17

### Changed — Explicit Handshake Ownership (Serial vs Web)

**Files:** `src/main.cpp`, `src/Web/WebControl.cpp`, `src/Serial/SerialControl.cpp`, `src/Serial/SerialControl.h`

### Added — Read-Only Web Access During Serial Control

**Files:** `src/Web/WebControl.cpp`, `src/main.cpp`, `data/script.js`, `data/style.css`

### Added — Serial Log (TX/RX) Panel

**Files:** `src/main.cpp`, `src/Serial/SerialControl.cpp`, `src/Serial/SerialControl.h`, `src/FRAM/ConfigManager.h`, `src/Web/WebControl.cpp`, `data/index.html`, `data/script.js`, `data/style.css`

### Added — Serial Command Replies Logged to Web

**Files:** `src/Serial/SerialControl.cpp`

### Changed — UI & Log Panel Usability

**Files:** `data/script.js`, `data/style.css`

---

## [1.2.43] - 2026-07-07

### Changed — Single-Session Connection Control

###  Added — Serial Handshake Returns Device Identity

###  Changed — WiFi Passwords Removed from Telemetry; MAC Addresses Added

###  Added — Standalone Password Query Commands

###  Added — Build Script Copies CHANGELOG.md to HardwareUpdate

---

## [1.2.42] and earlier

See git history for changes prior to this version.
