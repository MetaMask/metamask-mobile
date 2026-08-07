import { AndroidLaunchError } from '../launcher-types';
import { runDeviceAdb } from './adb';
import { ANDROID_MAIN_ACTIVITY } from './prerequisites';

export interface AndroidMetroAttachment {
  readonly serial: string;
  readonly metroPort: number;
  readonly ownsReverse: boolean;
}

interface ReverseMapping {
  readonly remote: string;
  readonly local: string;
}

export function buildAndroidMetroDeepLink(metroPort: number): {
  devServerUrl: string;
  deepLinkUrl: string;
} {
  // The Expo dev-client expects the dev-server ORIGIN only. It appends
  // /index.bundle and its own parameters internally, which yields the asset
  // registry context React Native's resolveAssetSource needs. Passing a
  // pre-built /index.bundle?... path here breaks asset resolution for custom
  // assetExts like .riv (rive-react-native then throws "Invalid Rive resource"
  // during render, unmounting the tree), so keep this to the origin.
  const devServerUrl = `http://localhost:${metroPort}`;
  return {
    devServerUrl,
    deepLinkUrl:
      'expo-metamask://expo-development-client/?url=' +
      encodeURIComponent(devServerUrl) +
      '&disableOnboarding=1',
  };
}

export async function attachAndroidMetro(
  serial: string,
  metroPort: number,
  fetchImpl: typeof fetch = globalThis.fetch,
  onBeforeOpenApp: () => void = () => undefined,
): Promise<AndroidMetroAttachment> {
  await validateMetro(metroPort, fetchImpl);
  const expected = `tcp:${metroPort}`;
  const existing = findPortMapping(
    parseReverseMappings(runDeviceAdb(serial, ['reverse', '--list'])),
    expected,
  );
  if (existing && existing.local !== expected) {
    throw new AndroidLaunchError({
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: `ADB reverse conflict for ${expected}: currently targets ${existing.local}.`,
      remediation: `Remove or change the existing reverse mapping for ${expected}.`,
    });
  }

  const ownsReverse =
    existing === undefined ? createOwnedReverse(serial, expected) : false;

  const attachment = { serial, metroPort, ownsReverse };
  try {
    const { deepLinkUrl } = buildAndroidMetroDeepLink(metroPort);
    onBeforeOpenApp();
    runDeviceAdb(serial, [
      'shell',
      'am',
      'start',
      '-W',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      shellQuote(deepLinkUrl),
      '-n',
      ANDROID_MAIN_ACTIVITY,
    ]);
    return attachment;
  } catch (error) {
    cleanupAndroidMetro(attachment);
    throw error;
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function createOwnedReverse(serial: string, expected: string): boolean {
  try {
    runDeviceAdb(serial, ['reverse', '--no-rebind', expected, expected]);
    return true;
  } catch (createError) {
    const current = findPortMapping(
      parseReverseMappings(runDeviceAdb(serial, ['reverse', '--list'])),
      expected,
    );
    if (current === undefined) {
      throw createError;
    }
    if (current.local !== expected) {
      throw new AndroidLaunchError({
        code: 'MM_DEVICE_NOT_AVAILABLE',
        message: `ADB reverse conflict for ${expected}: currently targets ${current.local}.`,
        remediation: `Remove or change the existing reverse mapping for ${expected}.`,
      });
    }
    return false;
  }
}

export function cleanupAndroidMetro(attachment: AndroidMetroAttachment): void {
  if (!attachment.ownsReverse) return;
  const expected = `tcp:${attachment.metroPort}`;
  const existing = findPortMapping(
    parseReverseMappings(runDeviceAdb(attachment.serial, ['reverse', '--list'])),
    expected,
  );
  if (existing?.local === expected) {
    runDeviceAdb(attachment.serial, ['reverse', '--remove', expected]);
  }
}

export function parseReverseMappings(output: string): ReverseMapping[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const columns = line.split(/\s+/u);
      if (columns.length === 2) {
        return [{ remote: columns[0], local: columns[1] }];
      }
      if (columns.length >= 3) {
        // Modern ADB identifies the selected transport with a label such as
        // `host-16`, not necessarily the emulator serial passed to `adb -s`.
        return [{ remote: columns[1], local: columns[2] }];
      }
      return [];
    });
}

function findPortMapping(
  mappings: readonly ReverseMapping[],
  remote: string,
): ReverseMapping | undefined {
  // runDeviceAdb invokes `adb -s <serial>`, so this list is already scoped to
  // the selected emulator. Filtering its transport label by serial causes
  // session-owned mappings to be missed and leaked during cleanup.
  return mappings.find((mapping) => mapping.remote === remote);
}

async function validateMetro(
  metroPort: number,
  fetchImpl: typeof fetch,
): Promise<void> {
  try {
    const response = await fetchImpl(`http://localhost:${metroPort}/status`, {
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const status = (await response.text()).trim();
    if (status !== 'packager-status:running') {
      throw new Error(`Unrecognized Metro status: ${status || 'empty'}`);
    }
  } catch {
    throw new AndroidLaunchError({
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: `Metro bundler not reachable or not recognized on port ${metroPort}.`,
      remediation: 'Run `yarn watch:clean` in another terminal.',
    });
  }
}
