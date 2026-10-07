# Changelog

All notable changes to MLAstroRPA Webserver will be documented in this file.

---

## [1.14.0] - 2026-10-07

- Added — Serial factory reset: the firmware accepts the MLASTRO-FRAM-RESET! token without a handshake and wipes FRAM (used by the Multi-ESP-Flasher right after flashing)

## [1.13.0] - 2026-10-07

- Added — selectable beep volume with four levels (Off / Low / Medium / High) replacing the enable/disable checkbox
- Changed — the max motor RPM setting accepts 50-300 and defaults to 200
- Changed — the motor swap option is enabled by default
- Fixed — APPLY now applies the beep volume change (before it was only applied by SAVE ALL & REBOOT)

## [1.12.1] - 2026-10-06

- Fixed — FACTORY RESET now writes a blank FRAM struct instead of only clearing `magic`: the appended fields (saved WiFi network list, mDNS name, beep, mute-errors, aligned position) used to survive the reset and the two preloaded networks were never restored
- Fixed — `isUsableSubnetMask()` read the mask through a `uint32_t` cast, so every valid mask was rejected: each boot logged `AP subnet empty/invalid in FRAM` and rewrote FRAM
- Changed — the default AP password is `password` (was `MLAstroRPA`)
- Changed — no log prints a WiFi/AP password any more and the `max clients` line is gone; `?` polled before the handshake is answered with silence instead of an error
- Changed — Serial logs: the stored network list is printed once (with passwords) right after the AP IP, `STA connected (SSID: …)` is printed immediately, the internet result follows on its own line, and the mDNS URL line is no longer deferred
- Changed — FRAM writes are aligned to 32-byte pages so a chunk can never wrap inside a FRAM page

---

## [1.12.0] - 2026-10-06

- Added — WiFi history: the firmware keeps the last 5 networks (SSID + password) in FRAM; a newly saved network goes to slot 1, a duplicate SSID is updated and moved up, the oldest entry is evicted but never the network that is currently connected, and an empty list is preloaded with the two factory networks
- Added — the boot sequence walks the stored list and tries every network once (no double retry), logs a separate line per failed network, and moves the network that finally connects to slot 1 so the next boot matches on the first attempt
- Added — new `STOPPING` status while a STOP ramps the axes down and a `STOPPED` status held for 1 s before `READY`
- Changed — FACTORY RESET now asks for the fixed password `password` instead of the admin password, so a forgotten admin password can still be recovered
- Changed — the log channel carries multi-line messages (log buffer 128 → 640 bytes, Web UI keeps the line breaks) and the WiFi retry log no longer prints the password

---

## [1.11.0] - 2026-10-05

- Added — Serial gets the mDNS hostname command `MDns:X` (letters, digits and hyphen, up to 31 characters; the firmware keeps it in RAM and writes FRAM on `Save&Reboot`) and reports the current name in the telemetry as `MDns:`, so the plugin can rename the device over the COM cable exactly like the Web UI does
- Fixed — the name received over Serial was kept in RAM only: `Save&Reboot` now writes it to FRAM, so the device really comes back with the new mDNS name (the first 1.11.0 build accepted `MDns:` but never stored it)
---

## [1.10.0] - 2026-10-01

- Added — Telemetry reports the STA signal strength (`rssi`) so the Web UI header and the plugin grade the signal bars from the real value

- Fixed — STOP decelerates with the configured ramp instead of stopping the axis instantly: both axes ramp down while they are moving, the far target is only cancelled when an axis is already standing, and a 2.5 s safety net hard-cancels a ramp that does not finish

- Changed — FORCE-COPY reads the version from `src/main.cpp` (`FIRMWARE_VERSION`, the single source) instead of the header text, so an export can no longer pick a wrong number
- Added â€” Serial gets the two aligned-position commands `SvPA:1` / `FbPA:1` (save the current PA position / drive back to it), sharing one code path with the WebSocket pair `saveAlignedPosition` / `fallbackAlignedPosition` so both transports behave the same
- Changed — AP icon colour in the header tuned to #3498db

---

## [1.9.0] - 2026-10-01

- Added — Test & monitor group box in Admin Config with "Mute all error alerts (test mode)"

- Added — Jog can be pressed repeatedly; a relative move locks the arrow buttons like an automatic run

- Added — Default mDNS name is now mlastrorpa.local

- Changed — Travel Calibration and Sensorless Auto Tuning hidden from the UI; UI hints are English-only

- Fixed — The [WIFI][MDNS] up: line waits for the STA result and reports the real STA address

---

## [1.8.1] - 2026-09-23

- Added — Web UI: ✨ badge right after the header firmware version when a newer firmware exists — click opens `/?updates=1` (update window); the check reads `meta.json` with a 6 h localStorage cache and runs in the background

- Changed — Web UI: web assets are stored pre-compressed (gzip) — SPIFFS payload 290 KB → 71 KB, so the first load / hard reload (Ctrl+F5) transfers ~4× fewer bytes

- Changed — Web UI: the firmware update check is client-only (firmware no longer polls at boot — machines that run 24/7 would miss releases), has a 1 s timeout, re-checks at most every 30 min, and logs whether the answer came from the cache or a new fetch

- Fixed — Wi-Fi: STA connect is retried only once per boot (`MAX_WIFI_RETRY` 5 → 1), so the AP keeps serving the Web UI/plugin when the router is absent

- Fixed — Web UI: the AP/STA header draws state icons instead of text and the update window picks its mode with radios (OTA / COM port), with clearer network messages

- Fixed — Update URLs after the release repository was renamed from `Update` to `Firmware-Update` (ESP catalog proxy, Beta UI page and repo links)

- Fixed — Web UI: closing the update window drops `?updates=1`, so a reload no longer reopens it

- Fixed — Web UI: long status texts (e.g. `HOME_COMPLETED`) shrink/wrap only on small screens instead of squeezing the logo, and the arrow-pad STOP button stays centred at every screen size

---

## [1.8.0] - 2026-09-19

- Added — OTA: Web UI downloads the `firmware` / `spiffs` `.bin` with the browser's own internet and pushes it to the device (`POST /api/ota/upload`, 64 KB blocks, real progress) — works while the ESP32 has no internet (AP-only, STA lost)

- Added — OTA: `GET /api/ota/catalog` lets the ESP32 fetch the GitHub version list / `meta.json` for a client that has no internet (needs ESP32 STA internet)

- Changed — Web UI / OTA: the update window shows which side provides the internet (browser vs ESP32) and blocks START when neither side has internet

- Changed — Web UI / OTA: failed update check now reads "Cannot fetch firmware from internet" and offers **Update from local .bin** + **Retry** instead of a plain error

- Added — Web UI / OTA: **Update from local .bin over Wi-Fi** (offline, no HTTPS, no USB cable) — needed because Web Serial is blocked on the HTTP device page and the Beta UI page needs internet; bootloader/partitions still require USB

- Added — Web UI / Update (USB): Local update (COM port) accepts the **merged full-flash image** (`MLAstroRPA-full-x.y.z.bin`, generated by the build script) as a single file written at `0x0`; the Wi-Fi local update rejects it (bootloader/partitions cannot be written over Wi-Fi)

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
