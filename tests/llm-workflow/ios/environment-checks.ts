/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import { IOSLaunchError } from '../launcher-types';

// device-mcp's IdbBackend shells out to `idb` (fb-idb), which in turn talks to
// the `idb_companion` daemon. This single hint installs both.
export const IDB_INSTALL_HINT =
  'brew tap facebook/fb && brew install idb-companion && pip3 install fb-idb';

// A binary is "installed" when it can be spawned at all. We only treat ENOENT
// (not found) as missing — a non-zero exit still means the binary exists, which
// matters because probe flags differ: `idb --help` exits 0 but `idb --version`
// exits 2, while `idb_companion --help` exits 1 but `idb_companion --version`
// exits 0.
function isBinaryInstalled(file: string, args: string[]): boolean {
  try {
    execFileSync(file, args, { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ENOENT';
  }
}

/**
 * @throws {IOSLaunchError} `MM_IOS_RUNNER_NOT_READY` when Xcode tools are absent.
 */
export function validateSimctlAvailable(): void {
  if (!isBinaryInstalled('xcrun', ['simctl', 'help'])) {
    throw new IOSLaunchError({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: '`xcrun simctl` not available. Is Xcode installed?',
      remediation:
        'Install Xcode from the Mac App Store and run `xcode-select --install`.',
    });
  }
}

// Probe order mirrors device-mcp's resolveIdbPath: PATH first, then Homebrew.
export function isIdbAvailable(): boolean {
  const candidates = ['idb', '/opt/homebrew/bin/idb', '/usr/local/bin/idb'];
  return candidates.some((candidate) =>
    isBinaryInstalled(candidate, ['--help']),
  );
}

export function isIdbCompanionAvailable(): boolean {
  const candidates = [
    'idb_companion',
    '/opt/homebrew/bin/idb_companion',
    '/usr/local/bin/idb_companion',
  ];
  return candidates.some((candidate) =>
    isBinaryInstalled(candidate, ['--version']),
  );
}

/**
 * @throws {IOSLaunchError} `MM_IOS_DEPENDENCY_MISSING` when `idb` is not found.
 */
export function validateIdbAvailable(): void {
  if (!isIdbAvailable()) {
    throw new IOSLaunchError({
      code: 'MM_IOS_DEPENDENCY_MISSING',
      message:
        '`idb` (Facebook iOS Debug Bridge) not found. It is required to drive ' +
        'the iOS Simulator (tap, type, snapshot, screenshot).',
      remediation: `Install idb: ${IDB_INSTALL_HINT}`,
    });
  }
}
