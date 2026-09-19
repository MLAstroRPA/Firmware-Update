# Changelog

All notable changes to MLAstroRPA Webserver will be documented in this file.

---

## [1.8.0] - 2026-09-19

- Added — OTA: Web UI downloads the `firmware` / `spiffs` `.bin` with the browser's own internet and pushes it to the device (`POST /api/ota/upload`, 64 KB blocks, real progress) — works while the ESP32 has no internet (AP-only, STA lost)

- Added — OTA: `GET /api/ota/catalog` lets the ESP32 fetch the GitHub version list / `meta.json` for a client that has no internet (needs ESP32 STA internet)

- Changed — Web UI / OTA: the update window shows which side provides the internet (browser vs ESP32) and blocks START when neither side has internet

- Changed — Web UI / OTA: failed update check now reads "Cannot fetch firmware from internet" and offers **Update from local .bin** + **Retry** instead of a plain error

- Added — Web UI / OTA: **Update from local .bin over Wi-Fi** (offline, no HTTPS, no USB cable) — needed because Web Serial is blocked on the HTTP device page and the Beta UI page needs internet; bootloader/partitions still require USB

---

## [1.7.0] - 2026-09-19

- Added — Network: STA connection quality (`WQu` / `sta_qual`: 0 none / 1 router-only / 2 internet, TCP-probe every 10 s) + per-client AP/STA link in `handshakeResult` (`link`) + live STA IP (`sta_ip`)

- Added — Network: AP (hotspot) state over both transports — `ap_ready` / `ap_ip` on WebSocket and token `APrd` on Serial — so the PC can show `AP: Connected / Ready / Error <IP>`

- Added — Web UI + plugin header: three stacked rows (Status / AP / STA) with `AP: connected|ready|error <IP>` and `STA: 📶/📶!/📶x <IP>`, plus the theme dropdown moved below the `STA` row; `link` is now also sent in the first WebSocket frame of each client

---

## [1.6.0] - 2026-09-17

- Added — Web UI / Admin: option to reject a second web client (applies after SAVE & REBOOT); with the option OFF every web client can control, configure and monitor

- Added — Web UI / Beta: `?updates=1` opens the CONFIG tab and the "Available Updates" modal automatically

- Changed — Web UI: logo removed (keeps the SPIFFS image inside its 384 KB partition)

## [1.5.0] - 2026-09-17

- Added — Web UI / OTA: cho phép cài đè cùng version

- Changed — mDNS: dựng lại định kỳ 6 phút KỂ CẢ khi có client, và im lặng

- Fixed — bớt log rác lúc boot

## [1.4.1] - 2026-09-16

- Fixed — panic `Stack canary watchpoint triggered (NetworkTask)` when a WS client dropped

- Added — mDNS refresh định kỳ (lưới an toàn chống responder "chết âm thầm")

## [1.4.0] - 2026-09-15

- Added — boot status beep + panic core dump

- Fixed — mDNS: self-probe removed (it rebuilt mDNS every 10 minutes)

- Changed — flash offsets follow the new partition table

## [1.3.1] - 2026-09-14

- Fixed — mDNS: no periodic restarts any more, rebuild only when it matters

---

## [1.3.0] - 2026-09-12

- Added — mDNS hostname `MLAstroRPA.local`

- Added — PC (plugin) control over WebSocket (handshake `MLAstroRPA-TC`)

- Changed — log replay + RAM (serial-log queue is now allocated on demand)

- Added — WebSocket command & alarm channel for PC clients

- Changed — Two-way setting sync (Relative mode, speed level, config)

- Changed — Identical logs on every control path (Serial / Web / PC-over-WebSocket)

- Changed — Jog & soft limits: refuse only at the limit, warn on every refusal

- Changed — One config JSON for every client (connect snapshot + config pushes)

- Changed — WiFi STA failure diagnostics + passwords are no longer broadcast

---

## [1.2.72] - 2026-09-11

- Fixed — Backlash Compensation Now Really Moves the Axis on Relative (Step) Moves

- Changed — Relative-Move Logs Now Report the Backlash Compensation (Web + Serial)

---

## [1.2.71] - 2026-09-08

- Fixed — Open-Load Detection Now Reads the Driver's OLA/OLB Flags (SG_RESULT Dropped)

---

## [1.2.70] - 2026-09-07
- hotfix: remove openload detect

## [1.2.69] - 2026-09-07
- fix: Bug reset ESP when press APPLY

## [1.2.68] - 2026-09-07

- Fixed — Web APPLY / SAVE & REBOOT Did Nothing (Large WebSocket Messages Lost)

- Changed — Web SAVE & REBOOT Confirms the Save Before Rebooting

- Changed — Serial `Save&Reboot` No Longer Auto-Reboots

- Changed — Backlash Logs Now Show Compensated Steps and Arc-Minutes

- Changed — Web UI Fully Read-Only While Serial Holds Control

---

## [1.2.67] - 2026-09-03

- Changed — Faster & More Reliable Open-Load (Motor-Not-Connected) Detection

- Changed — Driver Error Handling (Removes False "Not Connected" / False Open-Load)

- Added — Web UI Resets Page Scroll on Tab Switch

---

## [1.2.66] - 2026-08-28

- Changed — Serial Handshake Takes Priority Over Web

- Fixed — Serial Handshake Dropped When Communication Watchdog Disabled

- Added — Serial `Disconnect` Command (Graceful Handshake Release)

- Added — Independent Error Telemetry over Serial (`ERROR:` line)

- Added — Post-Start Driver Connectivity Check + System Lock

- Changed — Main Telemetry Cleaned Up (protocol-accurate)

- Added — Web System Log: replay, dedup and Reset cleanup

- Added — Web "Enable Communication Watchdog" quick toggle

---

## [1.2.65] - 2026-08-27

- Fixed — Alignment Values Not Updating While Running (Telemetry Cache)

- Added — Open-Load / Motor-Not-Connected Detection (StallGuard Back-EMF)

- Changed — Driver Reads Gated to Boot + Open-Load Window (fixes false "Driver communication lost")

- Fixed — Open-Load No Longer Misreported as Hard Limit (no reverse-run)

- Changed — Hard Limits UI Reorganized under Admin Config

---

## [1.2.64] - 2026-08-26

- Fixed — 3-Beep ERROR Alert for Hardlimit & Motor Error

- Added — Serial RESET ERROR Command (`ReER:1`)

---

## [1.2.59] - 2026-08-18

- Added — Alt P.A Overshoot Direction Checkboxes

- Changed — Backlash & P.A Overshoot UI

- Fixed — Intermittent FRAM Save (SAVE ALL & REBOOT)

- ⚡ Changed — Auto-center FRAM Write Moved to Core 0

## [1.2.58] - 2026-08-17

- Added — Swap Az-Alt Motor Ports

- Changed — 5 s Non-Blocking Reboot Countdown

- Fixed — REBOOTING Status Maintained Until Reboot

## [1.2.57] - 2026-08-17

- Changed — Explicit Handshake Ownership (Serial vs Web)

- Added — Read-Only Web Access During Serial Control

- Added — Serial Log (TX/RX) Panel

- Added — Serial Command Replies Logged to Web

- Changed — UI & Log Panel Usability

---

## [1.2.43] - 2026-07-07

- Changed — Single-Session Connection Control

-  Added — Serial Handshake Returns Device Identity

-  Changed — WiFi Passwords Removed from Telemetry; MAC Addresses Added

-  Added — Standalone Password Query Commands

-  Added — Build Script Copies CHANGELOG.md to HardwareUpdate

---

## [1.2.42] and earlier

See git history for changes prior to this version.
