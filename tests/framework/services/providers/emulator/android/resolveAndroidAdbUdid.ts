import { promisify } from 'util';
import { execFile } from 'child_process';
import type { EmulatorConfig } from '../../../../types';

const execFileAsync = promisify(execFile);

const ADB_TIMEOUT_MS = 20_000;
const EMU_AVD_NAME_TIMEOUT_MS = 15_000;

/** Serials shown by `adb devices` for local Android emulators. */
const EMULATOR_SERIAL = /^emulator-\d+$/;

const resolutionCache = new Map<string, Promise<string>>();

/**
 * Extracts emulator serials from the stdout of `adb devices`.
 * Skips offline / unauthorized lines.
 */
export function parseAdbDevicesOutput(stdout: string): string[] {
  const serials: string[] = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'List of devices attached') {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    const serial = parts[0];
    const state = parts[1];
    if (!serial || !EMULATOR_SERIAL.test(serial)) {
      continue;
    }
    if (state === 'offline' || state === 'unauthorized') {
      continue;
    }
    serials.push(serial);
  }
  return serials;
}

/**
 * `adb ... emu avd name` often prints the AVD name on the first line and a
 * literal `OK` on the next line (emulator console protocol). We only keep the
 * AVD name for comparison.
 */
export function parseAvdNameFromEmuOutput(stdout: string): string {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const withoutOk = lines.filter((line) => line.toUpperCase() !== 'OK');
  return withoutOk[0] ?? '';
}

function cacheKeyForDevice(device: EmulatorConfig): string {
  if (device.udid) {
    return `udid:${device.udid}`;
  }
  if (device.name) {
    return `name:${device.name}`;
  }
  return 'empty';
}

async function runAdb(args: string[], timeoutMs: number): Promise<string> {
  const raw = await execFileAsync('adb', args, {
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });
  // Node's real `execFile` uses a promisify symbol that resolves to `{ stdout, stderr }`.
  // Plain mocks (e.g. Jest) fall back to generic promisify and may resolve a Buffer — handle both.
  let stdout: unknown = raw;
  if (
    raw !== null &&
    typeof raw === 'object' &&
    !Buffer.isBuffer(raw) &&
    'stdout' in raw
  ) {
    stdout = (raw as { stdout: Buffer | string }).stdout;
  }
  return String(stdout ?? '');
}

/**
 * Returns AVD name for a running emulator serial (`adb -s <serial> emu avd name`).
 */
export async function getAvdNameForSerial(serial: string): Promise<string> {
  const out = await runAdb(
    ['-s', serial, 'emu', 'avd', 'name'],
    EMU_AVD_NAME_TIMEOUT_MS,
  );
  return parseAvdNameFromEmuOutput(out);
}

/**
 * Lists `emulator-*` serials that are in `device` state (not offline/unauthorized).
 */
export async function listAdbEmulatorSerials(): Promise<string[]> {
  const out = await runAdb(['devices', '-l'], ADB_TIMEOUT_MS);
  return parseAdbDevicesOutput(out);
}

function isLikelyAdbSerial(name: string): boolean {
  return EMULATOR_SERIAL.test(name);
}

/**
 * Resolves the adb serial (udid) for a local Android {@link EmulatorConfig}.
 *
 * - If `udid` is set, returns it. Optionally logs a warning if `name` is set
 *   and `adb -s udid emu avd name` does not match `name`.
 * - If `udid` is unset and `name` looks like `emulator-####`, uses it as the serial.
 * - If `udid` is unset and `name` is an AVD name, finds a running emulator whose
 *   `emu avd name` matches.
 */
export async function resolveAndroidAdbUdidForDevice(
  device: EmulatorConfig,
): Promise<string> {
  const key = cacheKeyForDevice(device);
  const cached = resolutionCache.get(key);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    try {
      if (device.udid) {
        const udid = device.udid;
        if (device.name) {
          try {
            const avd = await getAvdNameForSerial(udid);
            if (avd && avd !== device.name) {
              // eslint-disable-next-line no-console
              console.warn(
                `[resolveAndroidAdbUdid] device.name "${device.name}" does not match adb "emu avd name" for ${udid}: "${avd}"`,
              );
            }
          } catch {
            // ignore; user may use a non-emulator udid in edge cases
          }
        }
        return udid;
      }

      if (!device.name) {
        throw new Error(
          'Android local emulator: set `use.device.udid` (adb serial, e.g. emulator-5554) or `use.device.name` (AVD name from `adb -s <serial> emu avd name`).',
        );
      }

      if (isLikelyAdbSerial(device.name)) {
        return device.name;
      }

      const serials = await listAdbEmulatorSerials();
      if (serials.length === 0) {
        throw new Error(
          'No running Android emulators found (`adb devices`). Start an AVD that matches `use.device.name`, or set `use.device.udid` to the adb serial (e.g. emulator-5554).',
        );
      }

      const candidates: { serial: string; avdName: string }[] = [];
      for (const serial of serials) {
        try {
          const avdName = await getAvdNameForSerial(serial);
          candidates.push({ serial, avdName });
          if (avdName && avdName === device.name.trim()) {
            return serial;
          }
        } catch {
          // skip serials that do not support emu avd name
        }
      }

      const list = candidates
        .map((c) => `  ${c.serial} -> "${c.avdName}"`)
        .join('\n');
      throw new Error(
        `No running emulator has AVD name "${device.name}".\n` +
          (list
            ? `Candidates:\n${list}\n`
            : 'Could not read AVD names for running emulators.\n') +
          'Set `use.device.udid` to the correct serial, or start the matching AVD.',
      );
    } catch (err) {
      // Evict before the rejection is observable so callers do not hit a stale
      // cached rejection; transient adb/emulator failures can retry next call.
      resolutionCache.delete(key);
      throw err;
    }
  })();

  resolutionCache.set(key, promise);
  return promise;
}

export type ApplyAndroidAdbOptions = {
  /** If true, set `process.env.ANDROID_SERIAL` (worker-only; default true for tests). */
  setAndroidSerialEnv: boolean;
};

/**
 * Resolves the adb serial, assigns `device.udid`, and optionally sets
 * `ANDROID_SERIAL` for bare `adb` invocations in the same process.
 */
export async function applyResolvedAndroidAdbToDevice(
  device: EmulatorConfig,
  options: ApplyAndroidAdbOptions = { setAndroidSerialEnv: true },
): Promise<string> {
  const serial = await resolveAndroidAdbUdidForDevice(device);
  // eslint-disable-next-line no-param-reassign
  device.udid = serial;
  if (options.setAndroidSerialEnv) {
    process.env.ANDROID_SERIAL = serial;
  }
  return serial;
}

/**
 * Clears the in-process resolution cache (for tests).
 */
export function __clearAndroidAdbUdidCacheForTests(): void {
  resolutionCache.clear();
}
