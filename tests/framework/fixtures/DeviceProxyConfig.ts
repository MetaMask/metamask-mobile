/* eslint-disable import/no-nodejs-modules */
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { FrameworkDetector } from '../FrameworkDetector';
import { createLogger } from '../logger';

const execAsync = promisify(exec);
const logger = createLogger({ name: 'DeviceProxyConfig' });

/**
 * Writes a PEM certificate to a stable temp path based on its content hash.
 * Returns the absolute path of the written file.
 */
async function writeCertToTempFile(certPem: string): Promise<string> {
  const hash = createHash('sha1').update(certPem).digest('hex').slice(0, 8);
  const certPath = `/tmp/e2e-proxy-ca-${hash}.pem`;
  await writeFile(certPath, certPem, 'utf8');
  return certPath;
}

// ─── Android ────────────────────────────────────────────────────────────────

function getAdbDeviceFlag(): string {
  if (FrameworkDetector.isDetox()) {
    const deviceId = (device as { id?: string }).id || '';
    return deviceId ? `-s ${deviceId}` : '';
  }
  return '';
}

/**
 * Configures the Android emulator to route all HTTP/HTTPS traffic through the
 * transparent proxy running on the host machine.
 *
 * 10.0.2.2 is the emulator's alias for the host loopback — no adb reverse needed.
 */
export async function configureAndroidProxy(
  deviceId: string,
  proxyPort: number,
): Promise<void> {
  const deviceFlag = deviceId ? `-s ${deviceId}` : getAdbDeviceFlag();
  await execAsync(
    `adb ${deviceFlag} shell settings put global http_proxy 10.0.2.2:${proxyPort}`,
  );

  // IMPORTANT (Android emulator + adb reverse):
  // Our in-app test servers (mock server, fixture server, local nodes) are reached
  // via fixed "fallback" ports on the device (e.g. localhost:8000/12345), then
  // mapped to random host ports using `adb reverse`.
  //
  // If we proxy those localhost requests, the proxy runs on the HOST and will try
  // to connect to its own localhost:8000/12345 (which is NOT where the servers are
  // actually listening) → requests abort → app rehydration/stabilization fails.
  //
  // Exclude local endpoints from the system proxy so adb-reverse continues to work.
  const exclusionList = [
    'localhost',
    '127.0.0.1',
    '127.*',
    // Some parts of the app/tests fall back to the emulator-host alias.
    // If proxied, the host-side proxy cannot reach 10.0.2.2 reliably.
    '10.0.2.2',
  ].join(',');
  await execAsync(
    `adb ${deviceFlag} shell settings put global global_http_proxy_exclusion_list "${exclusionList}"`,
  );
}

/**
 * Removes the global HTTP proxy setting from the Android emulator.
 */
export async function removeAndroidProxy(deviceId: string): Promise<void> {
  const deviceFlag = deviceId ? `-s ${deviceId}` : getAdbDeviceFlag();
  await execAsync(`adb ${deviceFlag} shell settings delete global http_proxy`);
  await execAsync(
    `adb ${deviceFlag} shell settings delete global global_http_proxy_exclusion_list`,
  );
}

/**
 * Installs the proxy CA certificate into the Android emulator's system trust store.
 *
 * Requires the emulator to be booted with `-writable-system` (and without `-read-only`)
 * so that `adb root` + `adb remount` can make `/system` writable.
 * See `.detoxrc.js` — the CI emulator configs are set up for this.
 *
 * On newer emulators (API 30+) `remount` may fail until dm-verity is disabled
 * and the device is rebooted, so this function handles that automatically.
 */
export async function installCACertAndroid(
  deviceId: string,
  certPem: string,
): Promise<void> {
  const certPath = await writeCertToTempFile(certPem);
  const deviceFlag = deviceId ? `-s ${deviceId}` : getAdbDeviceFlag();

  const { stdout: hashOutput } = await execAsync(
    `openssl x509 -subject_hash_old -noout -in "${certPath}"`,
  );
  const certHash = hashOutput.trim();
  const remotePath = `/system/etc/security/cacerts/${certHash}.0`;

  // Check if the cert is already installed — avoids `adb root` which restarts
  // adbd and breaks Detox's WebSocket connection to the running app.
  try {
    const { stdout: checkOutput } = await execAsync(
      `adb ${deviceFlag} shell "ls ${remotePath} 2>/dev/null"`,
    );
    if (checkOutput.trim() === remotePath) {
      logger.info(`CA cert already installed at ${remotePath}, skipping`);
      return;
    }
  } catch {
    // File doesn't exist — proceed with installation
  }

  // Only call `adb root` if not already running as root — restarting adbd
  // after Detox has connected would break its WebSocket handle.
  const { stdout: whoamiOut } = await execAsync(
    `adb ${deviceFlag} shell whoami`,
  );
  if (whoamiOut.trim() !== 'root') {
    await execAsync(`adb ${deviceFlag} root`);
    await execAsync(`adb ${deviceFlag} wait-for-device`);
  }

  const pushCert = async () => {
    await execAsync(`adb ${deviceFlag} push "${certPath}" "${remotePath}"`);
    await execAsync(`adb ${deviceFlag} shell chmod 644 "${remotePath}"`);
  };

  // Try remount + push directly first (fast path).
  try {
    await execAsync(`adb ${deviceFlag} remount`);
    await pushCert();
    return;
  } catch {
    logger.info('remount failed, attempting disable-verity + reboot cycle...');
  }

  // Disable dm-verity, reboot, then remount.
  try {
    await execAsync(`adb ${deviceFlag} disable-verity`);
  } catch {
    logger.info('disable-verity not needed or already disabled');
  }
  await execAsync(`adb ${deviceFlag} reboot`);
  await execAsync(`adb ${deviceFlag} wait-for-device`);
  // wait-for-device returns as soon as ADB sees the device, but the
  // system may not be fully booted. Poll getprop to confirm boot.
  const waitForBoot = async (timeoutMs = 120000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const { stdout } = await execAsync(
          `adb ${deviceFlag} shell getprop sys.boot_completed`,
        );
        if (stdout.trim() === '1') return;
      } catch {
        /* device still booting */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Android emulator did not finish booting after reboot');
  };
  await waitForBoot();
  await execAsync(`adb ${deviceFlag} root`);
  // Same wait after the post-reboot root to ensure adbd is ready before remount.
  await execAsync(`adb ${deviceFlag} wait-for-device`);
  await execAsync(`adb ${deviceFlag} remount`);
  await pushCert();
}

/**
 * Removes the proxy CA certificate from the Android emulator's system trust store.
 */
export async function removeCACertAndroid(
  deviceId: string,
  certPem: string,
): Promise<void> {
  const certPath = await writeCertToTempFile(certPem);
  const deviceFlag = deviceId ? `-s ${deviceId}` : getAdbDeviceFlag();

  const { stdout: hashOutput } = await execAsync(
    `openssl x509 -subject_hash_old -noout -in "${certPath}"`,
  );
  const certHash = hashOutput.trim();
  const remotePath = `/system/etc/security/cacerts/${certHash}.0`;

  try {
    await execAsync(`adb ${deviceFlag} root`);
    await execAsync(`adb ${deviceFlag} remount`);
    await execAsync(`adb ${deviceFlag} shell rm -f "${remotePath}"`);
  } catch {
    logger.debug('CA cert removal from Android emulator skipped or not needed');
  }
}

// ─── iOS ─────────────────────────────────────────────────────────────────────

/**
 * Detects the active macOS network interface (e.g. "en0") by inspecting the
 * default route, then maps it to a Network Service name via networksetup.
 *
 * Falls back to the environment variable IOS_PROXY_NETWORK_SERVICE or "Wi-Fi".
 */
async function getActiveNetworkService(): Promise<string> {
  const envOverride = process.env.IOS_PROXY_NETWORK_SERVICE;
  if (envOverride) return envOverride;

  try {
    // Determine active network interface from the default route
    const { stdout: routeOut } = await execAsync('route get default');
    const ifaceMatch = routeOut.match(/interface:\s+(\S+)/);
    if (!ifaceMatch) return 'Wi-Fi';
    const iface = ifaceMatch[1];

    // Map the interface device name to a Network Service name
    const { stdout: serviceList } = await execAsync(
      'networksetup -listnetworkserviceorder',
    );
    const lines = serviceList.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`Device: ${iface}`)) {
        // The service name is on the line above (format: "(N) Service Name")
        const serviceLineMatch = lines[i - 1]?.match(/^\(\d+\)\s+(.+)$/);
        if (serviceLineMatch) return serviceLineMatch[1].trim();
      }
    }
  } catch {
    // Ignore errors — fall back to default
  }

  return 'Wi-Fi';
}

/**
 * Installs the proxy CA certificate into the iOS simulator's keychain.
 * Safe to call before the app is launched.
 *
 * Uses DER-encoded .cer format because xcrun simctl on newer Xcode versions
 * can reject PEM files even when the content is valid.
 */
export async function installCACertIOS(
  simulatorId: string,
  certPem: string,
): Promise<void> {
  const pemPath = await writeCertToTempFile(certPem);
  const cerPath = pemPath.replace(/\.pem$/, '.cer');
  await execAsync(
    `openssl x509 -outform DER -in "${pemPath}" -out "${cerPath}"`,
  );
  await execAsync(
    `xcrun simctl keychain ${simulatorId} add-root-cert "${cerPath}"`,
  );
}

/**
 * Configures the iOS simulator to route HTTP and HTTPS traffic through the
 * transparent proxy.
 *
 * NOTE: The proxy is set on the Mac's network interface so the simulator (which
 * shares the host network stack) picks it up automatically.
 */
export async function configureIOSProxy(proxyPort: number): Promise<void> {
  const service = await getActiveNetworkService();
  await execAsync(
    `networksetup -setwebproxy "${service}" localhost ${proxyPort}`,
  );
  await execAsync(
    `networksetup -setsecurewebproxy "${service}" localhost ${proxyPort}`,
  );
}

/**
 * Removes the proxy CA certificate from the iOS simulator's keychain.
 */
export async function removeCACertIOS(
  simulatorId: string,
  certPem: string,
): Promise<void> {
  const pemPath = await writeCertToTempFile(certPem);
  const cerPath = pemPath.replace(/\.pem$/, '.cer');
  try {
    await execAsync(
      `openssl x509 -outform DER -in "${pemPath}" -out "${cerPath}"`,
    );
    await execAsync(
      `xcrun simctl keychain ${simulatorId} delete-certificate -f "${cerPath}"`,
    );
  } catch {
    logger.debug('CA cert removal from iOS simulator skipped or not needed');
  }
}

/**
 * Disables the HTTP/HTTPS system proxy that was set by configureIOSProxy().
 */
export async function removeIOSProxy(): Promise<void> {
  const service = await getActiveNetworkService();
  await execAsync(`networksetup -setwebproxystate "${service}" off`);
  await execAsync(`networksetup -setsecurewebproxystate "${service}" off`);
}
