import { Linking } from 'react-native';
import Logger from '../../util/Logger';
import { hasTestOverrides } from '../../util/test/utils';
import {
  E2E_SEEDLESS_KILL_METAMASK_SCHEME,
  E2E_SEEDLESS_KILL_RAW_SCHEME,
  isSeedlessPasswordChangeKillAfter,
  type SeedlessPasswordChangeKillAfter,
} from './seedlessPasswordChangeKillSwitch.constants';

export {
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER_IDS,
  SEEDLESS_PASSWORD_CHANGE_KILL_READY_TEST_ID,
  E2E_SEEDLESS_KILL_METAMASK_SCHEME,
  E2E_SEEDLESS_KILL_RAW_SCHEME,
  isSeedlessPasswordChangeKillAfter,
} from './seedlessPasswordChangeKillSwitch.constants';
export type { SeedlessPasswordChangeKillAfter } from './seedlessPasswordChangeKillSwitch.constants';

export class SeedlessPasswordChangeKillHaltError extends Error {
  hop: SeedlessPasswordChangeKillAfter;

  constructor(hop: SeedlessPasswordChangeKillAfter) {
    super(`SEEDLESS_E2E_KILL_HALT:${hop}`);
    this.name = 'SeedlessPasswordChangeKillHaltError';
    this.hop = hop;
  }
}

type KillReadyListener = (hop: SeedlessPasswordChangeKillAfter) => void;

let armedKillAfter: SeedlessPasswordChangeKillAfter | undefined;
let hasRegisteredDeepLinkHandler = false;
const killReadyListeners = new Set<KillReadyListener>();

export const isSeedlessPasswordChangeKillSwitchEnabled = (): boolean =>
  Boolean(__DEV__) || hasTestOverrides || process.env.NODE_ENV === 'test';

export const isSeedlessPasswordChangeKillHalt = (error: unknown): boolean =>
  error instanceof SeedlessPasswordChangeKillHaltError ||
  (error instanceof Error &&
    error.message.startsWith('SEEDLESS_E2E_KILL_HALT:'));

export const setSeedlessPasswordChangeKillAfter = (
  hop: SeedlessPasswordChangeKillAfter | undefined,
): void => {
  if (!isSeedlessPasswordChangeKillSwitchEnabled()) {
    return;
  }
  armedKillAfter = hop;
};

export const getSeedlessPasswordChangeKillAfter = ():
  | SeedlessPasswordChangeKillAfter
  | undefined => armedKillAfter;

export const subscribeSeedlessPasswordChangeKillReady = (
  listener: KillReadyListener,
): (() => void) => {
  killReadyListeners.add(listener);
  return () => {
    killReadyListeners.delete(listener);
  };
};

const notifyKillReady = (hop: SeedlessPasswordChangeKillAfter): void => {
  Logger.log?.(`[SEEDLESS_E2E] kill-ready ${hop}`);
  killReadyListeners.forEach((listener) => listener(hop));
};

export const haltIfSeedlessPasswordChangeKillAfter = (
  hop: SeedlessPasswordChangeKillAfter,
): Promise<void> => {
  if (!isSeedlessPasswordChangeKillSwitchEnabled() || armedKillAfter !== hop) {
    return Promise.resolve();
  }

  notifyKillReady(hop);

  // Halt the spine after persist. ResetPassword keeps the loading
  // screen so Appium can terminate. Tests assert this error.
  return Promise.reject(new SeedlessPasswordChangeKillHaltError(hop));
};

const stripKillScheme = (url: string): string => {
  const prefixes = [
    E2E_SEEDLESS_KILL_METAMASK_SCHEME,
    E2E_SEEDLESS_KILL_RAW_SCHEME,
  ];
  let current = url;
  let matched = true;
  while (matched) {
    matched = false;
    for (const prefix of prefixes) {
      if (current.startsWith(prefix)) {
        current = current.slice(prefix.length);
        matched = true;
        break;
      }
    }
  }
  return current;
};

export const applySeedlessPasswordChangeKillDeepLink = (
  incomingUrl = '',
): void => {
  if (!incomingUrl || !isSeedlessPasswordChangeKillSwitchEnabled()) {
    return;
  }

  const isExpoMappedScheme = incomingUrl.startsWith(
    E2E_SEEDLESS_KILL_METAMASK_SCHEME,
  );
  const isRawScheme = incomingUrl.startsWith(E2E_SEEDLESS_KILL_RAW_SCHEME);
  if (!isExpoMappedScheme && !isRawScheme) {
    return;
  }

  const [path, queryString = ''] = stripKillScheme(incomingUrl).split('?');
  if (path !== 'kill-after') {
    Logger.log(`[SEEDLESS_E2E] Ignoring unknown path: ${path}`);
    return;
  }

  const hop = new URLSearchParams(queryString).get('hop') ?? '';
  if (!isSeedlessPasswordChangeKillAfter(hop)) {
    Logger.log(`[SEEDLESS_E2E] Ignoring unknown kill hop: ${hop}`);
    return;
  }

  setSeedlessPasswordChangeKillAfter(hop);
};

export const registerSeedlessPasswordChangeKillDeepLinkHandler = (): void => {
  if (
    hasRegisteredDeepLinkHandler ||
    !isSeedlessPasswordChangeKillSwitchEnabled()
  ) {
    return;
  }

  Linking.addEventListener('url', (event) => {
    applySeedlessPasswordChangeKillDeepLink(event?.url);
  });
  Linking.getInitialURL()
    .then((url) => {
      if (url) {
        applySeedlessPasswordChangeKillDeepLink(url);
      }
    })
    .catch(() => undefined);
  hasRegisteredDeepLinkHandler = true;
};

export const resetSeedlessPasswordChangeKillSwitchForTests = (): void => {
  armedKillAfter = undefined;
  hasRegisteredDeepLinkHandler = false;
  killReadyListeners.clear();
};
