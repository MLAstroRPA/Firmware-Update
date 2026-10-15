/**
 * MLAstro RPA — Firmware Update Tool
 * Web Serial flasher powered by ESP Web Tools
 */

// ===== CONFIGURATION & CONSTANTS =====
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/MLAstroRPA/Firmware-Update/main/';
const GITHUB_CONTENTS_API = 'https://api.github.com/repos/MLAstroRPA/Firmware-Update/contents/?ref=main';
const ESP_WEB_TOOLS_MODULE_URL = 'https://unpkg.com/esp-web-tools@9/dist/web/install-button.js?module';

// The version list comes from meta.json; each version maps to one merged full-flash image
// (bootloader + partitions + firmware + SPIFFS, written at 0x0).
const FULL_IMAGE_PREFIX = 'MLAstroRPA-full-';
const FULL_IMAGE_SUFFIX = '.bin';
const FULL_IMAGE_OFFSET = '0x0';
const FULL_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

// A blocked or slow host must never leave the release list spinning forever.
const META_TIMEOUT_MS = 8000;
const API_TIMEOUT_MS = 6000;

// Common messages
const MSG_NO_USB_SERIAL = 'Web Serial is not supported on this browser/device. Please use Google Chrome or Microsoft Edge on a PC or Mac with CP2102 drivers installed.';
const MSG_INSECURE_PAGE = 'Web Serial requires a secure context (HTTPS or localhost). Please access this tool over HTTPS.';

// State
let updateCatalog = null;
let activeUsbManifestUrl = null;
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

function buildFullImageUrl(name) {
  return GITHUB_RAW_BASE + encodeURIComponent(name);
}

function versionFromFullImageName(name) {
  const match = /^MLAstroRPA-full-(.+)\.bin$/i.exec(String(name || ''));
  return match ? match[1] : '';
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// meta.json is the version list: every released version maps to one merged full-flash image.
function indexMetaByVersion(meta) {
  const byVersion = new Map();

  Object.keys(meta || {}).forEach((name) => {
    const entry = meta[name] || {};
    const version = entry.version || '';
    if (!version) return;

    const info = byVersion.get(version) || { description: '', releaseDateUtc: '' };
    if (!info.description && entry.description) info.description = entry.description;
    if (!info.releaseDateUtc && entry.release_date_utc) info.releaseDateUtc = entry.release_date_utc;
    byVersion.set(version, info);
  });

  return byVersion;
}

async function fetchReleaseMeta() {
  const sources = [
    GITHUB_RAW_BASE + 'meta.json',
    './meta.json',
    '../meta.json',
  ];

  for (const src of sources) {
    try {
      const res = await fetchWithTimeout(src, META_TIMEOUT_MS);
      if (res.ok) return await res.json();
    } catch (e) {
      // unreachable source, try the next one
    }
  }

  return null;
}

function buildUpdateCatalog(meta) {
  const versions = [];

  indexMetaByVersion(meta).forEach((info, version) => {
    const fileName = `${FULL_IMAGE_PREFIX}${version}${FULL_IMAGE_SUFFIX}`;
    versions.push({
      version,
      fileName,
      size: FULL_IMAGE_SIZE_BYTES,
      url: buildFullImageUrl(fileName),
      description: info.description,
      releaseDateUtc: info.releaseDateUtc,
    });
  });

  if (!versions.length) {
    throw new Error('No firmware release found in meta.json.');
  }

  versions.sort((a, b) => compareVersionsDesc(a.version, b.version));
  return { versions };
}

// Optional: replace the estimated image size with the real file size from the repository listing.
async function refineReleaseSizes(catalog) {
  let images = [];
  try {
    images = await fetchFullImageReleases();
  } catch (e) {
    return;
  }

  const sizeByVersion = new Map(images.map((image) => [image.version, image.size]));
  let changed = false;

  catalog.versions.forEach((entry) => {
    const size = sizeByVersion.get(entry.version);
    if (!size || size === entry.size) return;

    entry.size = size;
    changed = true;
    const sizeEl = document.querySelector(`.version-size[data-version="${entry.version}"]`);
    if (sizeEl) sizeEl.innerHTML = `&bull; ${formatSize(size)}`;
  });

  if (changed) updateUsbDashboard();
}

async function fetchFullImageReleases() {
  const res = await fetchWithTimeout(GITHUB_CONTENTS_API, API_TIMEOUT_MS);
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);

  const entries = await res.json();
  if (!Array.isArray(entries)) throw new Error('Unexpected GitHub API response');

  return entries
    .filter((entry) => entry && entry.type === 'file' && versionFromFullImageName(entry.name))
    .map((entry) => ({
      version: versionFromFullImageName(entry.name),
      fileName: entry.name,
      size: entry.size || 0,
    }));
}

async function fetchReleaseCatalog() {
  const meta = await fetchReleaseMeta();
  const catalog = buildUpdateCatalog(meta);

  refineReleaseSizes(catalog);

  return catalog;
}

// ===== RENDER VERSION LIST =====

function formatSize(bytes) {
  if (!bytes) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderVersionList(catalog) {
  const container = document.getElementById('online-version-list');
  if (!container) return;

  if (!catalog.versions.length) {
    container.innerHTML = '<div class="empty-state">No release found in meta.json.</div>';
    return;
  }

  let html = '';
  catalog.versions.forEach((release, index) => {
    const isLatest = index === 0;
    const checked = isLatest ? 'checked' : '';
    const dateFormatted = formatReleaseDate(release.releaseDateUtc);
    const sizeStr = formatSize(release.size);

    html += `
      <label class="version-item ${isLatest ? 'is-latest' : ''}">
        <input type="radio" name="update-version" value="${release.version}" ${checked}>
        <div class="version-info-box">
          <div class="version-head">
            <span class="version-num">v${release.version}</span>
            ${isLatest ? '<span class="badge badge-success">Latest</span>' : ''}
            <span class="version-date text-muted">${dateFormatted}</span>
          </div>
          <div class="version-meta text-muted">
            <span><code>${release.fileName}</code></span>
            <span>&bull; Full flash image (bootloader + partitions + firmware + SPIFFS)</span>
            <span class="version-size" data-version="${release.version}">${sizeStr ? `&bull; ${sizeStr}` : ''}</span>
          </div>
          ${release.description ? `<div class="version-desc">${release.description}</div>` : ''}
        </div>
      </label>
    `;
  });

  container.innerHTML = html;

  const syncSelection = () => {
    container.querySelectorAll('.version-item').forEach((item) => {
      const input = item.querySelector('input[name="update-version"]');
      item.classList.toggle('is-selected', Boolean(input && input.checked));
    });
  };

  // Listen for changes
  const radios = container.querySelectorAll('input[name="update-version"]');
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      syncSelection();
      updateUsbDashboard();
    });
  });

  syncSelection();
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
}

function createEspWebToolsManifestUrl(release) {
  const manifest = {
    name: `MLAstro RPA ${release.version}`,
    version: release.version,
    new_install_prompt_erase: true,
    new_install_improv_wait_time: 0,
    builds: [
      {
        chipFamily: 'ESP32',
        parts: [{ path: release.url, offset: FULL_IMAGE_OFFSET }],
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

  let selectedGroup = null;
  let packageSummary = '';

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
        <div class="usb-flash-help">Please choose a release from the list above.</div>
      </div>`;
    return;
  }

  packageSummary = `${selectedGroup.fileName}${selectedGroup.size ? ` (${formatSize(selectedGroup.size)})` : ''}`;

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

  const manifestUrl = createEspWebToolsManifestUrl(selectedGroup);

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
          <small>Check your internet connection and reload the page.</small>
        </div>`;
    }
    updateUsbDashboard();
  }
});
