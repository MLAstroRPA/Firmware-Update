/**
 * MLAstro RPA — Firmware Update Tool
 * Web Serial flasher powered by ESP Web Tools
 */

// ===== CONFIGURATION & CONSTANTS =====
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/MLAstroRPA/Firmware-Update/main/';
const ESP_WEB_TOOLS_MODULE_URL = 'https://unpkg.com/esp-web-tools@9/dist/web/install-button.js?module';

const FLASH_OFFSETS = {
  bootloader: '0x1000',
  partitions: '0x8000',
  firmware: '0x10000',
  spiffs: '0x398000',
  merged: '0x0',
};

const FLASH_KIND_ORDER = ['bootloader', 'partitions', 'firmware', 'spiffs'];

// Common messages
const MSG_NO_USB_SERIAL = 'Web Serial is not supported on this browser/device. Please use Google Chrome or Microsoft Edge on a PC or Mac with CP2102 drivers installed.';
const MSG_INSECURE_PAGE = 'Web Serial requires a secure context (HTTPS or localhost). Please access this tool over HTTPS.';

// State
let updateCatalog = null;
let activeUsbManifestUrl = null;
let activeUsbLocalBlobUrls = [];
let espWebToolsLoader = null;
let usbFlashSucceeded = false;
let usbFlashWatchTimer = null;
let usbFlashDialogEl = null;

// ===== BROWSER COMPATIBILITY HELPERS =====

function isMobileClient() {
  const uaData = navigator.userAgentData;
  if (uaData && typeof uaData.mobile === 'boolean') return uaData.mobile;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent || '');
}

const chromiumDesktop = !isMobileClient() && (() => {
  const brands = navigator.userAgentData && navigator.userAgentData.brands;
  if (Array.isArray(brands) && brands.length) {
    return brands.some((b) => /Chromium|Chrome|Edge|Opera/i.test((b && b.brand) || ''));
  }
  return /Chrome|Chromium|Edg|OPR/i.test(navigator.userAgent || '');
})();

function hasWebSerialSupport() {
  return Boolean(window.isSecureContext && 'serial' in navigator);
}

function updateBrowserStatusUI() {
  const pill = document.getElementById('web-serial-pill');
  const supportCard = document.getElementById('browser-support-card');
  if (!pill) return;

  if (isMobileClient()) {
    pill.className = 'pill pill-danger';
    pill.textContent = 'Mobile (No USB)';
    pill.title = 'Web Serial is not available on mobile or tablet devices.';
    if (supportCard) {
      supportCard.className = 'notice-card notice-danger';
      supportCard.querySelector('.notice-title').textContent = 'Mobile Device Detected';
      supportCard.querySelector('.notice-text').innerHTML =
        'Web Serial flashing is <strong>not supported on phones or tablets</strong>. Please open this page on a desktop PC or Mac using Google Chrome or Microsoft Edge to flash your mount via USB.';
    }
  } else if (hasWebSerialSupport()) {
    pill.className = 'pill pill-success';
    pill.textContent = 'Web Serial Ready';
    pill.title = 'Your browser supports Web Serial. Ready to flash via USB.';
  } else if (!window.isSecureContext) {
    pill.className = 'pill pill-warning';
    pill.textContent = 'Insecure Context';
    pill.title = 'Web Serial is blocked on non-HTTPS pages.';
    if (supportCard) {
      supportCard.className = 'notice-card notice-warning';
      supportCard.querySelector('.notice-title').textContent = 'Insecure Context (HTTP)';
      supportCard.querySelector('.notice-text').innerHTML =
        'Web Serial requires HTTPS. Please access this page over HTTPS (e.g. GitHub Pages) or localhost.';
    }
  } else {
    pill.className = 'pill pill-danger';
    pill.textContent = 'Unsupported Browser';
    pill.title = 'This browser does not support Web Serial.';
    if (supportCard) {
      supportCard.className = 'notice-card notice-warning';
      supportCard.querySelector('.notice-title').textContent = 'Browser Notice';
      supportCard.querySelector('.notice-text').innerHTML =
        'Your current browser does not support Web Serial. Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on desktop.';
    }
  }
}

// ===== THEME MANAGEMENT =====

function initTheme() {
  const select = document.getElementById('theme-select');
  const saved = localStorage.getItem('mlastro-theme') || 'auto';

  applyTheme(saved);
  if (select) {
    select.value = saved;
    select.addEventListener('change', (e) => {
      const chosen = e.target.value;
      localStorage.setItem('mlastro-theme', chosen);
      applyTheme(chosen);
    });
  }
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// ===== SEMVER & DATE HELPERS =====

function compareVersionsDesc(v1, v2) {
  const parse = (v) => String(v || '').split('.').map((n) => parseInt(n, 10) || 0);
  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return -1;
    if (n1 < n2) return 1;
  }
  return 0;
}

function formatReleaseDate(raw) {
  if (!raw) return 'Unknown date';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ===== CATALOG & RELEASE FETCHING =====

function buildEntryFromMetaName(name, meta) {
  const entry = (meta && meta[name]) || {};
  return {
    name,
    type: entry.type || '',
    version: entry.version || '',
    size: entry.size_bytes || 0,
    download_url: GITHUB_RAW_BASE + encodeURIComponent(name),
    url: GITHUB_RAW_BASE + encodeURIComponent(name),
    description: entry.description || '',
    releaseDateUtc: entry.release_date_utc || '',
  };
}

function buildUpdateCatalog(meta) {
  const groups = new Map();
  const extras = { bootloader: null, partitions: null };

  const list = Object.keys(meta || {}).map((name) => buildEntryFromMetaName(name, meta));

  list.forEach((file) => {
    const isFw = file.type === 'firmware' || file.name.startsWith('firmware');
    const isSpiffs = file.type === 'spiffs' || file.name.startsWith('spiffs');

    if (!isFw && !isSpiffs) {
      if (file.name.includes('bootloader')) extras.bootloader = file;
      if (file.name.includes('partition')) extras.partitions = file;
      return;
    }

    const version = file.version || 'unknown';
    if (!groups.has(version)) {
      groups.set(version, {
        version,
        firmware: null,
        spiffs: null,
        description: '',
        releaseDateUtc: '',
      });
    }

    const group = groups.get(version);
    if (isFw) group.firmware = file;
    if (isSpiffs) group.spiffs = file;

    if (!group.description && file.description) group.description = file.description;
    if (!group.releaseDateUtc && file.releaseDateUtc) group.releaseDateUtc = file.releaseDateUtc;
  });

  if (!extras.bootloader) extras.bootloader = buildEntryFromMetaName('bootloader.bin', meta);
  if (!extras.partitions) extras.partitions = buildEntryFromMetaName('partitions.bin', meta);

  const versions = Array.from(groups.values()).sort((a, b) => compareVersionsDesc(a.version, b.version));
  return { versions, extras };
}

async function fetchReleaseCatalog() {
  const sources = [
    GITHUB_RAW_BASE + 'meta.json',
    './meta.json',
    '../meta.json',
  ];

  let rawMeta = null;
  let lastError = null;

  for (const src of sources) {
    try {
      const res = await fetch(src, { cache: 'no-store' });
      if (res.ok) {
        rawMeta = await res.json();
        break;
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!rawMeta) {
    throw new Error(lastError ? lastError.message : 'Could not fetch meta.json from repository or local host.');
  }

  return buildUpdateCatalog(rawMeta);
}

// ===== RENDER VERSION LIST =====

function renderVersionList(catalog) {
  const container = document.getElementById('online-version-list');
  if (!container) return;

  if (!catalog.versions.length) {
    container.innerHTML = '<div class="empty-state">No release packages found in meta.json.</div>';
    return;
  }

  let html = '';
  catalog.versions.forEach((group, index) => {
    const isLatest = index === 0;
    const checked = isLatest ? 'checked' : '';
    const dateFormatted = formatReleaseDate(group.releaseDateUtc);

    const sizeParts = [];
    if (group.firmware) sizeParts.push(`FW ${(group.firmware.size / 1024).toFixed(0)} KB`);
    if (group.spiffs) sizeParts.push(`SPIFFS ${(group.spiffs.size / 1024).toFixed(0)} KB`);
    const sizeStr = sizeParts.join(' &bull; ');

    html += `
      <label class="version-item ${isLatest ? 'is-latest' : ''}">
        <input type="radio" name="update-version" value="${group.version}" ${checked}>
        <div class="version-info-box">
          <div class="version-head">
            <span class="version-num">v${group.version}</span>
            ${isLatest ? '<span class="badge badge-success">Latest</span>' : ''}
            <span class="version-date text-muted">${dateFormatted}</span>
          </div>
          <div class="version-meta text-muted">
            <span>Packages: <strong>${group.firmware ? 'Firmware' : ''}${group.firmware && group.spiffs ? ' + ' : ''}${group.spiffs ? 'SPIFFS' : ''}</strong></span>
            ${sizeStr ? `&bull; <span>${sizeStr}</span>` : ''}
          </div>
          ${group.description ? `<div class="version-desc">${group.description}</div>` : ''}
        </div>
      </label>
    `;
  });

  container.innerHTML = html;

  // Listen for changes
  const radios = container.querySelectorAll('input[name="update-version"]');
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      updateUsbDashboard();
    });
  });
}

// ===== LOCAL FILE HANDLING =====

function detectFlashKindFromName(filename) {
  const lower = String(filename || '').toLowerCase();
  if (lower.includes('full') || lower.includes('merged')) return 'merged';
  if (lower.includes('bootloader')) return 'bootloader';
  if (lower.includes('partition')) return 'partitions';
  if (lower.includes('firmware')) return 'firmware';
  if (lower.includes('spiffs')) return 'spiffs';
  return '';
}

function collectLocalUpdateFiles() {
  const input = document.getElementById('local-update-files');
  const selected = {
    bootloader: null,
    partitions: null,
    firmware: null,
    spiffs: null,
    merged: null,
  };
  if (!input || !input.files) return selected;

  Array.from(input.files).forEach((file) => {
    const kind = detectFlashKindFromName(file.name);
    if (!kind) return;
    if (!selected[kind]) selected[kind] = file;
  });
  return selected;
}

function renderLocalUpdateFileList() {
  const container = document.getElementById('local-update-file-list');
  if (!container) return;

  const filesByKind = collectLocalUpdateFiles();

  if (filesByKind.merged) {
    const m = filesByKind.merged;
    container.innerHTML = `
      <div class="file-chip chip-highlight">
        <span class="chip-label">Merged Image (@ 0x0):</span>
        <span class="chip-name">${m.name} (${(m.size / 1024).toFixed(0)} KB)</span>
      </div>
      <small class="text-muted" style="display:block; margin-top:4px;">Merged image contains full flash layout (bootloader + partitions + firmware + spiffs).</small>
    `;
    return;
  }

  const chips = [];
  FLASH_KIND_ORDER.forEach((kind) => {
    const f = filesByKind[kind];
    if (f) {
      chips.push(`
        <div class="file-chip">
          <span class="chip-label">${kind} (@ ${FLASH_OFFSETS[kind]}):</span>
          <span class="chip-name">${f.name} (${(f.size / 1024).toFixed(0)} KB)</span>
        </div>
      `);
    }
  });

  if (!chips.length) {
    container.innerHTML = '<span class="text-muted" style="font-size:12px;">No matching .bin files selected yet.</span>';
  } else {
    container.innerHTML = chips.join('');
  }
}

function getSelectedLocalParts() {
  const filesByKind = collectLocalUpdateFiles();
  const parts = [];

  if (filesByKind.merged) {
    const url = URL.createObjectURL(filesByKind.merged);
    return [{ path: url, offset: FLASH_OFFSETS.merged, _blobUrl: url }];
  }

  FLASH_KIND_ORDER.forEach((kind) => {
    const file = filesByKind[kind];
    if (file) {
      const url = URL.createObjectURL(file);
      parts.push({ path: url, offset: FLASH_OFFSETS[kind], _blobUrl: url });
    }
  });

  return parts;
}

// ===== ESP WEB TOOLS INTEGRATION =====

async function ensureEspWebToolsLoaded() {
  if (customElements.get('esp-web-install-button')) return;
  if (!espWebToolsLoader) {
    espWebToolsLoader = import(ESP_WEB_TOOLS_MODULE_URL);
  }
  await espWebToolsLoader;
}

function releaseActiveUsbArtifacts() {
  if (activeUsbManifestUrl) {
    URL.revokeObjectURL(activeUsbManifestUrl);
    activeUsbManifestUrl = null;
  }
  if (Array.isArray(activeUsbLocalBlobUrls)) {
    activeUsbLocalBlobUrls.forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
  }
  activeUsbLocalBlobUrls = [];
}

function buildEspWebToolsParts(group, catalog) {
  const parts = [];
  const bootloaderChecked = document.getElementById('include-bootloader')?.checked;
  const partitionsChecked = document.getElementById('include-partitions')?.checked;

  if (bootloaderChecked && catalog.extras.bootloader) {
    parts.push({ path: catalog.extras.bootloader.download_url, offset: FLASH_OFFSETS.bootloader });
  }
  if (partitionsChecked && catalog.extras.partitions) {
    parts.push({ path: catalog.extras.partitions.download_url, offset: FLASH_OFFSETS.partitions });
  }
  if (group && group.firmware) {
    parts.push({ path: group.firmware.url, offset: FLASH_OFFSETS.firmware });
  }
  if (group && group.spiffs) {
    parts.push({ path: group.spiffs.url, offset: FLASH_OFFSETS.spiffs });
  }

  return parts;
}

function createEspWebToolsManifestUrl(group, catalog, localParts = null) {
  const parts = localParts || buildEspWebToolsParts(group, catalog);
  if (!parts.length) return null;

  const manifest = {
    name: `MLAstro RPA ${group?.version || 'local'}`,
    version: group?.version || 'local',
    new_install_prompt_erase: true,
    new_install_improv_wait_time: 0,
    builds: [
      {
        chipFamily: 'ESP32',
        parts: parts.map((p) => ({ path: p.path, offset: p.offset })),
      },
    ],
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

async function updateUsbDashboard() {
  const host = document.getElementById('usb-flash-host');
  if (!host) return;

  releaseActiveUsbArtifacts();

  if (isMobileClient()) {
    host.innerHTML = `
      <div class="usb-flash-card">
        <div class="usb-flash-title">USB Serial Unavailable</div>
        <div class="usb-flash-help">${MSG_NO_USB_SERIAL}</div>
      </div>`;
    return;
  }

  if (!hasWebSerialSupport()) {
    const help = !window.isSecureContext ? MSG_INSECURE_PAGE : MSG_NO_USB_SERIAL;
    host.innerHTML = `
      <div class="usb-flash-card">
        <div class="usb-flash-title">Web Serial Unavailable</div>
        <div class="usb-flash-help">${help}</div>
      </div>`;
    return;
  }

  const isLocalMode = Boolean(document.getElementById('update-local-offline')?.checked);
  let selectedGroup = null;
  let localParts = null;
  let packageSummary = '';

  if (isLocalMode) {
    localParts = getSelectedLocalParts();
    if (!localParts.length) {
      host.innerHTML = `
        <div class="usb-flash-card">
          <div class="usb-flash-title">Select Local Files</div>
          <div class="usb-flash-help">Please select at least one valid <code>.bin</code> file above to enable the CONNECT button.</div>
        </div>`;
      return;
    }
    activeUsbLocalBlobUrls = localParts.map((p) => p._blobUrl).filter(Boolean);
    packageSummary = `${localParts.length} local file(s)`;
  } else {
    if (!updateCatalog || !updateCatalog.versions.length) {
      host.innerHTML = `
        <div class="usb-flash-card">
          <div class="usb-flash-title">No Version Selected</div>
          <div class="usb-flash-help">Waiting for releases to load...</div>
        </div>`;
      return;
    }

    const selectedVersion = document.querySelector('input[name="update-version"]:checked')?.value;
    selectedGroup = updateCatalog.versions.find((g) => g.version === selectedVersion);
    if (!selectedGroup) {
      host.innerHTML = `
        <div class="usb-flash-card">
          <div class="usb-flash-title">Select a Version</div>
          <div class="usb-flash-help">Please choose a firmware version from the list above.</div>
        </div>`;
      return;
    }

    const partsLabel = [];
    if (document.getElementById('include-bootloader')?.checked) partsLabel.push('bootloader');
    if (document.getElementById('include-partitions')?.checked) partsLabel.push('partitions');
    if (selectedGroup.firmware) partsLabel.push('firmware');
    if (selectedGroup.spiffs) partsLabel.push('spiffs');
    packageSummary = `Version ${selectedGroup.version} (${partsLabel.join(' + ')})`;
  }

  try {
    await ensureEspWebToolsLoaded();
  } catch (err) {
    host.innerHTML = `
      <div class="usb-flash-card">
        <div class="usb-flash-title">Error Loading Flasher</div>
        <div class="usb-flash-help">Could not load ESP Web Tools installer: ${err.message || err}</div>
      </div>`;
    return;
  }

  const manifestUrl = createEspWebToolsManifestUrl(selectedGroup, updateCatalog, localParts);
  if (!manifestUrl) {
    host.innerHTML = `
      <div class="usb-flash-card">
        <div class="usb-flash-title">No Flash Files</div>
        <div class="usb-flash-help">No firmware or assets selected to flash.</div>
      </div>`;
    return;
  }

  activeUsbManifestUrl = manifestUrl;

  host.innerHTML = `
    <div class="usb-flash-card">
      <div class="usb-flash-summary">
        Package ready: <strong>${packageSummary}</strong>
      </div>
      <div class="usb-flash-action">
        <esp-web-install-button id="esp-install-btn" manifest="${manifestUrl}"></esp-web-install-button>
      </div>
      <div class="usb-flash-help">
        Click <strong>CONNECT</strong> to choose your device's COM port. Make sure no other program (N.I.N.A, serial monitor) is holding the port.
      </div>
    </div>`;
}

// ===== WATCH ESP WEB TOOLS INSTALL DIALOG =====

function readUsbFlashSuccess(dialogEl) {
  if (!dialogEl) return false;
  const installState = dialogEl._installState;
  if (installState && installState.state === 'finished') return true;
  const shadowText = dialogEl.shadowRoot ? dialogEl.shadowRoot.textContent : '';
  return Boolean(shadowText) && shadowText.indexOf('Installation complete') >= 0;
}

function stopUsbFlashWatch() {
  if (usbFlashWatchTimer) {
    clearInterval(usbFlashWatchTimer);
    usbFlashWatchTimer = null;
  }
}

function onUsbFlashDialogClosed(dialogEl) {
  const succeeded = usbFlashSucceeded || readUsbFlashSuccess(dialogEl);
  stopUsbFlashWatch();
  usbFlashDialogEl = null;

  const msgEl = document.getElementById('flash-status-message');
  if (msgEl) {
    if (succeeded) {
      msgEl.className = 'inline-message msg-success';
      msgEl.innerHTML = '✔ <strong>Installation complete!</strong> Your MLAstro RPA mount has been flashed and is rebooting.';
    } else {
      msgEl.className = 'inline-message msg-warning';
      msgEl.textContent = 'USB flashing dialog closed or cancelled.';
    }
  }
}

function watchUsbFlashDialog(dialogEl) {
  if (!dialogEl || dialogEl === usbFlashDialogEl) return;
  usbFlashDialogEl = dialogEl;
  usbFlashSucceeded = false;
  stopUsbFlashWatch();
  dialogEl.addEventListener('closed', () => onUsbFlashDialogClosed(dialogEl), { once: true });

  usbFlashWatchTimer = setInterval(() => {
    if (readUsbFlashSuccess(dialogEl)) {
      usbFlashSucceeded = true;
    }
  }, 400);
}

function setupUsbFlashDialogWatcher() {
  const scan = () => watchUsbFlashDialog(document.querySelector('ewt-install-dialog'));
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true });
  scan();
}

// ===== MODAL FUNCTIONS =====

function showModal(title, content, buttons = []) {
  const modal = document.getElementById('generic-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');
  if (!modal || !modalTitle || !modalBody || !modalFooter) return;

  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modalFooter.innerHTML = '';

  if (!buttons.length) {
    buttons = [{ text: 'Close', class: 'btn-secondary', callback: closeModal }];
  }

  buttons.forEach((btn) => {
    const el = document.createElement('button');
    el.className = `btn ${btn.class || 'btn-primary'}`;
    el.textContent = btn.text;
    el.onclick = () => {
      if (btn.callback) btn.callback();
      closeModal();
    };
    modalFooter.appendChild(el);
  });

  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('generic-modal');
  if (modal) modal.classList.remove('active');
}

// ===== EVENT WIRING & INITIALIZATION =====

function wireUIEvents() {
  // Modal close button & backdrop
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('generic-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'generic-modal') closeModal();
  });

  // Extras checkboxes
  document.getElementById('include-bootloader')?.addEventListener('change', updateUsbDashboard);
  document.getElementById('include-partitions')?.addEventListener('change', updateUsbDashboard);

  // Local update toggle
  const localCheck = document.getElementById('update-local-offline');
  const localContainer = document.getElementById('local-update-options');
  const onlineList = document.getElementById('online-version-list');
  const bootloaderRow = document.getElementById('row-bootloader');
  const partitionsRow = document.getElementById('row-partitions');

  localCheck?.addEventListener('change', (e) => {
    const isLocal = e.target.checked;
    if (localContainer) localContainer.classList.toggle('hidden', !isLocal);
    if (onlineList) onlineList.classList.toggle('hidden', isLocal);
    if (bootloaderRow) bootloaderRow.style.display = isLocal ? 'none' : '';
    if (partitionsRow) partitionsRow.style.display = isLocal ? 'none' : '';
    updateUsbDashboard();
  });

  // Local file picker
  const pickBtn = document.getElementById('pick-local-update-files');
  const fileInput = document.getElementById('local-update-files');

  pickBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    renderLocalUpdateFileList();
    updateUsbDashboard();
  });

  // Refresh releases button
  document.getElementById('btn-refresh-releases')?.addEventListener('click', async () => {
    const listEl = document.getElementById('online-version-list');
    if (listEl) {
      listEl.innerHTML = '<div class="loading-state"><span class="spinner"></span> Refreshing releases...</div>';
    }
    try {
      updateCatalog = await fetchReleaseCatalog();
      renderVersionList(updateCatalog);
      updateUsbDashboard();
    } catch (err) {
      if (listEl) {
        listEl.innerHTML = `<div class="empty-state text-danger">Failed to load releases: ${err.message}</div>`;
      }
    }
  });
}

// Initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateBrowserStatusUI();
  wireUIEvents();
  setupUsbFlashDialogWatcher();

  // Load catalog
  try {
    updateCatalog = await fetchReleaseCatalog();
    renderVersionList(updateCatalog);
    updateUsbDashboard();
  } catch (err) {
    const listEl = document.getElementById('online-version-list');
    if (listEl) {
      listEl.innerHTML = `
        <div class="empty-state text-danger">
          <strong>Cannot fetch releases:</strong> ${err.message}<br><br>
          <small>Check your internet connection, or tick <strong>Local update</strong> above to flash offline files.</small>
        </div>`;
    }
    updateUsbDashboard();
  }
});
