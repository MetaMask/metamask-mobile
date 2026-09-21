import { execFileSync } from 'node:child_process';

/**
 * Conservative settle wait after writing the accessibility flag, pending the
 * Task 0 empirical probe that determines whether `defaults write` propagates
 * into the app sandbox synchronously enough before a subsequent
 * `simctl launch`. Trivially tunable — set to 0 once the probe confirms
 * synchronous propagation, or raise if collapsed a11y trees are observed.
 */
export const ACCESSIBILITY_SETTLE_MS = 250;

const ACCESSIBILITY_DOMAIN = 'com.apple.Accessibility';
const ACCESSIBILITY_KEY = 'ApplicationAccessibilityEnabled';

/**
 * Reads the current value of the simulator's
 * `ApplicationAccessibilityEnabled` preference.
 *
 * Returns `false` when the key does not exist (fresh-booted sim) or when the
 * `defaults read` command fails for any other reason — this is the one
 * tolerated-error case (the key is absent on a fresh sim).
 *
 * @param udid - The simulator UDID to spawn the command on.
 * @returns `true` if the flag is already enabled, `false` otherwise.
 */
export function readAccessibilityBridge(udid: string): boolean {
  try {
    const output = execFileSync(
      'xcrun',
      [
        'simctl',
        'spawn',
        udid,
        'defaults',
        'read',
        ACCESSIBILITY_DOMAIN,
        ACCESSIBILITY_KEY,
      ],
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return output === '1' || output.toLowerCase() === 'true';
  } catch {
    return false;
  }
}

/**
 * Ensures the accessibility bridge is enabled on the simulator, proactively
 * setting the flag at boot (before any launch decision) so that
 * `IdbBackend.ensureConnected()` finds it already on.
 *
 * Uses `execFileSync` to guarantee write-before-launch ordering. The prior
 * value is captured so the caller knows whether a one-time relaunch is needed
 * (only the pre-existing-app-on-fresh-boot case requires it).
 *
 * @param udid - The simulator UDID to spawn the command on.
 * @returns `{ wasAlreadyOn: boolean }` — the prior value of the flag.
 */
export function ensureAccessibilityBridgeEnabled(
  udid: string,
): { wasAlreadyOn: boolean } {
  const wasAlreadyOn = readAccessibilityBridge(udid);

  if (!wasAlreadyOn) {
    execFileSync(
      'xcrun',
      [
        'simctl',
        'spawn',
        udid,
        'defaults',
        'write',
        ACCESSIBILITY_DOMAIN,
        ACCESSIBILITY_KEY,
        '-bool',
        'true',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
  }

  return { wasAlreadyOn };
}
