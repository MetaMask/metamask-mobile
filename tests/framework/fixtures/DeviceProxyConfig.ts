/* eslint-disable import/no-nodejs-modules */
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { FrameworkDetector } from '../FrameworkDetector';

const execAsync = promisify(exec);

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
}

/**
 * Removes the global HTTP proxy setting from the Android emulator.
 */
export async function removeAndroidProxy(deviceId: string): Promise<void> {
  const deviceFlag = deviceId ? `-s ${deviceId}` : getAdbDeviceFlag();
  await execAsync(`adb ${deviceFlag} shell settings delete global http_proxy`);
}

/**
 * Installs the proxy CA certificate into the Android emulator's system trust store.
 *
 * Requires the emulator to be running with a writable system partition.
 * Typical flags: `-writable-system` or the AVD must be a "user debug" build.
 */
export async function installCACertAndroid(
  deviceId: string,
  certPem: string,
): Promise<void> {
  const certPath = await writeCertToTempFile(certPem);
  const deviceFlag = deviceId ? `-s ${deviceId}` : getAdbDeviceFlag();

  // Compute the OpenSSL subject_hash_old (the filename Android expects)
  const { stdout: hashOutput } = await execAsync(
    `openssl x509 -subject_hash_old -noout -in "${certPath}"`,
  );
  const certHash = hashOutput.trim();

  const remotePath = `/system/etc/security/cacerts/${certHash}.0`;

  await execAsync(`adb ${deviceFlag} root`);
  await execAsync(`adb ${deviceFlag} remount`);
  await execAsync(`adb ${deviceFlag} push "${certPath}" "${remotePath}"`);
  await execAsync(`adb ${deviceFlag} shell chmod 644 "${remotePath}"`);
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
 * Configures the iOS simulator to route HTTP and HTTPS traffic through the
 * transparent proxy and installs the CA certificate into the simulator keychain.
 *
 * NOTE: The proxy is set on the Mac's network interface so the simulator (which
 * shares the host network stack) picks it up automatically.
 */
export async function configureIOSProxy(
  simulatorId: string,
  proxyPort: number,
  certPem: string,
): Promise<void> {
  // Install CA cert into the simulator's keychain
  const certPath = await writeCertToTempFile(certPem);
  await execAsync(
    `xcrun simctl keychain ${simulatorId} add-root-cert "${certPath}"`,
  );

  const service = await getActiveNetworkService();
  await execAsync(
    `networksetup -setwebproxy "${service}" localhost ${proxyPort}`,
  );
  await execAsync(
    `networksetup -setsecurewebproxy "${service}" localhost ${proxyPort}`,
  );
}

/**
 * Disables the HTTP/HTTPS system proxy that was set by configureIOSProxy().
 */
export async function removeIOSProxy(): Promise<void> {
  const service = await getActiveNetworkService();
  await execAsync(`networksetup -setwebproxystate "${service}" off`);
  await execAsync(`networksetup -setsecurewebproxystate "${service}" off`);
}
