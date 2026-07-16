/**
 * E2E bridge for QR sync — injects a sync-ready payload without MWP pairing.
 *
 * Enabled only when HAS_TEST_OVERRIDES=true (Detox/Appium e2e builds).
 *
 * Deep links:
 * - `metamask://e2e/qr-sync/apply-sync-ready?mnemonic=...&walletName=...&accountName=...&isPrimary=true`
 * - `e2e://qr-sync/apply-sync-ready?...` (mapped by tests/framework/DeepLink.ts)
 */

import { Linking } from 'react-native';
import { hasTestOverrides } from '../../util/test/utils';
import Logger from '../../util/Logger';
import type { QrSyncController } from './QrSyncController';
import type { QrSyncTestSyncReadyPayload } from './types';

export const E2E_QR_SYNC_METAMASK_SCHEME = 'metamask://e2e/qr-sync/';
export const E2E_QR_SYNC_RAW_SCHEME = 'e2e://qr-sync/';

export type { QrSyncTestSyncReadyPayload };

type QrSyncControllerResolver = () => QrSyncController | undefined;

let hasRegisteredDeepLinkHandler = false;
let controllerResolver: QrSyncControllerResolver | null = null;
const processedDeepLinks = new Set<string>();

function stripE2EQrSyncScheme(url: string): string {
  const prefixes = [E2E_QR_SYNC_METAMASK_SCHEME, E2E_QR_SYNC_RAW_SCHEME];
  let current = url;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let matched = false;
    for (const prefix of prefixes) {
      if (current.startsWith(prefix)) {
        current = current.slice(prefix.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      break;
    }
  }
  return current;
}

function parseBoolParam(value: string | null, defaultValue: boolean): boolean {
  if (value === null || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

function parseApplySyncReadyPayload(
  queryString: string,
): QrSyncTestSyncReadyPayload {
  const params = new URLSearchParams(queryString);
  return {
    mnemonic: params.get('mnemonic') ?? '',
    isPrimary: parseBoolParam(params.get('isPrimary'), true),
    walletName: params.get('walletName') ?? undefined,
    accountName: params.get('accountName') ?? undefined,
  };
}

function handleE2EQrSyncUrl(incomingUrl = ''): void {
  if (!incomingUrl) {
    return;
  }

  const isExpoMappedScheme = incomingUrl.startsWith(
    E2E_QR_SYNC_METAMASK_SCHEME,
  );
  const isRawScheme = incomingUrl.startsWith(E2E_QR_SYNC_RAW_SCHEME);
  if (!isExpoMappedScheme && !isRawScheme) {
    return;
  }

  if (processedDeepLinks.has(incomingUrl)) {
    return;
  }
  processedDeepLinks.add(incomingUrl);

  const withoutScheme = stripE2EQrSyncScheme(incomingUrl);
  const [path, queryString = ''] = withoutScheme.split('?');

  if (path !== 'apply-sync-ready') {
    Logger.log(`[E2E QR Sync] Ignoring unknown path: ${path}`);
    return;
  }

  const controller = controllerResolver?.();
  if (!controller) {
    Logger.error(
      new Error('QrSyncController unavailable'),
      'E2E QR Sync apply-sync-ready',
    );
    return;
  }

  try {
    const payload = parseApplySyncReadyPayload(queryString);
    controller.applyTestSyncReadyPayload(payload);
    Logger.log('[E2E QR Sync] Applied test sync-ready payload');
  } catch (error) {
    Logger.error(error as Error, 'E2E QR Sync apply-sync-ready failed');
  }
}

/**
 * Registers the E2E QR sync deep-link handler once per process.
 * Call from controller init when HAS_TEST_OVERRIDES is enabled.
 */
export function registerE2EQrSyncDeepLinkHandler(
  resolveController: QrSyncControllerResolver,
): void {
  controllerResolver = resolveController;

  if (hasRegisteredDeepLinkHandler || !hasTestOverrides) {
    return;
  }

  try {
    Linking.addEventListener('url', (event) => {
      handleE2EQrSyncUrl(event?.url);
    });

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          handleE2EQrSyncUrl(url);
        }
      })
      .catch(() => undefined);

    hasRegisteredDeepLinkHandler = true;
    Logger.log('[E2E QR Sync] Deep link handler registered');
  } catch (error) {
    Logger.error(
      error as Error,
      '[E2E QR Sync] Failed to register deep link handler',
    );
  }
}

/** @internal test helper */
export function __resetE2EQrSyncBridgeForTests(): void {
  hasRegisteredDeepLinkHandler = false;
  controllerResolver = null;
  processedDeepLinks.clear();
}

/** @internal test helper */
export function __handleE2EQrSyncUrlForTests(url: string): void {
  handleE2EQrSyncUrl(url);
}
