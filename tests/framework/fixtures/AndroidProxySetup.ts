/* eslint-disable import-x/no-nodejs-modules */
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

const SUBJECT_HASH_PATTERN = /^[0-9a-f]{8}$/i;

const ADB_TIMEOUT_MS = 20_000;
const ANDROID_USER_TRUST_DIR = '/data/misc/user/0/cacerts-added';
const ANDROID_TMP_DIR = '/data/local/tmp';

// Hosts that must bypass the OS proxy. Detox communicates from the app's
// Espresso instrumentation back to the host machine on 10.0.2.2; OkHttp
// honours Android's global http_proxy, so without this exclusion Detox's
// handshake traffic gets pushed through mockttp and the launchApp
// connection hangs ("Detox can't seem to connect to the test app(s)").
// 127.0.0.1 covers anything the app sends to its own loopback that adb
// reverse maps to the host (e.g. fixture/dapp/anvil ports).
const PROXY_EXCLUSION_LIST = '10.0.2.2,127.0.0.1,localhost';

/**
 * Parses the stdout of `openssl x509 -subject_hash_old -noout`, which is a
 * single 8-character hex line. This hash is the legacy MD5-based subject hash
 * Android uses to name files in its user-trust store
 * (`<hash>.0` under `cacerts-added`).
 */
export function parseOpensslSubjectHashOldOutput(stdout: string): string {
  const trimmed = stdout.trim();
  if (!SUBJECT_HASH_PATTERN.test(trimmed)) {
    throw new Error(`Invalid subject hash output: ${JSON.stringify(stdout)}`);
  }
  return trimmed.toLowerCase();
}

async function run(cmd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(cmd, args, {
    timeout: ADB_TIMEOUT_MS,
  });
  return stdout;
}

/**
 * Installs `caCertPath` into the emulator's user-trust store and configures
 * `http_proxy` to point at `<proxyHost>:<proxyPort>`. Requires a rooted
 * (userdebug) emulator and `openssl` + `adb` on PATH.
 */
export async function setupAndroidProxy(opts: {
  udid: string;
  caCertPath: string;
  proxyHost: string;
  proxyPort: number;
}): Promise<void> {
  const { udid, caCertPath, proxyHost, proxyPort } = opts;

  const hashOutput = await run('openssl', [
    'x509',
    '-in',
    caCertPath,
    '-subject_hash_old',
    '-noout',
  ]);
  const hash = parseOpensslSubjectHashOldOutput(hashOutput);
  const installedCertPath = `${ANDROID_USER_TRUST_DIR}/${hash}.0`;
  const stagedCertPath = `${ANDROID_TMP_DIR}/${hash}.0`;

  // `adb root` restarts the on-device adbd, which briefly drops Detox's adb
  // session and corrupts element references in tests already in flight
  // (observed: `DetoxRuntimeError: waitFor() argument is invalid, got object`
  // on the first spec after this helper ran). Skip the root call when adbd
  // is already running as root, and `adb wait-for-device` afterwards
  // otherwise to ensure adbd is back online before subsequent commands.
  const whoamiOutput = await run('adb', ['-s', udid, 'shell', 'whoami']);
  if (whoamiOutput.trim() !== 'root') {
    await run('adb', ['-s', udid, 'root']);
    await run('adb', ['-s', udid, 'wait-for-device']);
  }

  await run('adb', ['-s', udid, 'push', caCertPath, stagedCertPath]);
  await run('adb', [
    '-s',
    udid,
    'shell',
    'mkdir',
    '-p',
    ANDROID_USER_TRUST_DIR,
  ]);
  await run('adb', [
    '-s',
    udid,
    'shell',
    'mv',
    stagedCertPath,
    installedCertPath,
  ]);
  await run('adb', ['-s', udid, 'shell', 'chmod', '644', installedCertPath]);
  await run('adb', [
    '-s',
    udid,
    'shell',
    'settings',
    'put',
    'global',
    'http_proxy',
    `${proxyHost}:${proxyPort}`,
  ]);
  await run('adb', [
    '-s',
    udid,
    'shell',
    'settings',
    'put',
    'global',
    'global_http_proxy_exclusion_list',
    PROXY_EXCLUSION_LIST,
  ]);
}

/**
 * Clears the emulator's `http_proxy` global setting. Safe to call even when no
 * proxy is set.
 */
export async function teardownAndroidProxy(opts: {
  udid: string;
}): Promise<void> {
  await run('adb', [
    '-s',
    opts.udid,
    'shell',
    'settings',
    'put',
    'global',
    'http_proxy',
    ':0',
  ]);
}
