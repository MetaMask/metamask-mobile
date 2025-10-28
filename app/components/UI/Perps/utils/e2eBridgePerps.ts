/**
 * E2E Bridge - Dynamic Mock Injection
 *
 * This bridge allows production code to conditionally use E2E mocks
 * without direct dependencies on E2E files. The bridge automatically
 * configures itself when the isE2E flag is detected.
 */
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { isE2E } from '../../../../util/test/utils';
import { Linking } from 'react-native';
import axios, { AxiosResponse } from 'axios';
import {
  getCommandQueueServerPort,
  getLocalHost,
} from '../../../../../e2e/framework/fixtures/FixtureUtils';

// Global bridge for E2E mock injection
export interface E2EBridgePerpsStreaming {
  mockStreamManager?: unknown;
  applyControllerMocks?: (controller: unknown) => void;
}

// Global bridge instance
let e2eBridgePerps: E2EBridgePerpsStreaming = {};

// Ensure we only register the deep link handler once
let hasRegisteredDeepLinkHandler = false;
// Track processed URLs to avoid duplicate handling when both initial URL and event fire
const processedDeepLinks = new Set<string>();

// E2E HTTP polling state
let hasStartedPolling = false;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;
let consecutivePollFailures = 0;
let pollingDisabled = false;
const MAX_CONSECUTIVE_POLL_FAILURES = 2;

/**
 * Register a lightweight deep link handler for E2E-only schema (e2e://perps/*)
 * This avoids touching production deeplink parsing while enabling deterministic
 * E2E commands like price push and forced liquidation.
 * !! TODO: E2E perps deeplink handler can be later removed if HTTP polling is stable !!
 */
function registerE2EPerpsDeepLinkHandler(): void {
  if (hasRegisteredDeepLinkHandler || !isE2E) {
    return;
  }

  try {
    const handleUrl = (incomingUrl?: string) => {
      try {
        const url = incomingUrl || '';
        if (!url) return;

        const isExpoMappedScheme = url.startsWith('metamask://e2e/perps/');
        // Backward-compat: tolerate accidental double-colon variant
        if (!isExpoMappedScheme) {
          return;
        }

        if (processedDeepLinks.has(url)) {
          return; // Avoid duplicate processing
        }
        processedDeepLinks.add(url);

        // Lazy require to keep bridge tree-shakeable in prod and avoid ESM import in Jest
        /* eslint-disable @typescript-eslint/no-require-imports */
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require('../../../../../e2e/controller-mocking/mock-responses/perps/perps-e2e-mocks');
          const service = mod?.PerpsE2EMockService?.getInstance?.();

          // Parse path and query
          const withoutScheme = isExpoMappedScheme
            ? url.replace('metamask://e2e/perps/', '')
            : url.replace('e2e://perps/', '');
          const [path, queryString] = withoutScheme.split('?');
          const params = new URLSearchParams(queryString || '');
          const symbol = params.get('symbol') || '';

          if (path === 'push-price') {
            const price = params.get('price') || '';
            DevLogger.log('[E2E Bridge] push-price', symbol, price);
            service.mockPushPrice(symbol, price);
            return;
          }

          if (path === 'mock-deposit') {
            const amount = params.get('amount') || '';
            DevLogger.log('[E2E Bridge] mock-deposit', amount);
            service.mockDepositUSD(amount);
            return;
          }

          if (path === 'force-liquidation') {
            DevLogger.log('[E2E Bridge] force-liquidation', symbol);
            service.mockForceLiquidation(symbol);
            return;
          }
        } catch (e) {
          DevLogger.log('[E2E Bridge] E2E mocks not available');
        } finally {
          /* eslint-enable @typescript-eslint/no-require-imports */
        }
      } catch (err) {
        DevLogger.log('[E2E Bridge] Error handling E2E perps deeplink', err);
      }
    };

    // Listen to runtime deep links
    Linking.addEventListener('url', (event: { url: string }) => {
      handleUrl(event?.url);
    });

    // Also process the initial URL if present (e.g., app launched via link)
    // This ensures E2E commands are honored even if delivered as initial URL
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          DevLogger.log('[E2E Bridge] Processing initial URL', initialUrl);
          handleUrl(initialUrl);
        }
      })
      .catch(() => {
        // no-op
      });

    hasRegisteredDeepLinkHandler = true;
    DevLogger.log('[E2E Bridge] Registered E2E perps deep link handler');
  } catch (error) {
    DevLogger.log(
      '[E2E Bridge] Failed to register E2E perps deep link handler',
    );
  }
}

/**
 * E2E-only: Poll external command API to apply mock updates
 * Avoids deep links; relies on tests posting commands to a standalone service
 *
 * @returns void
 */
function startE2EPerpsCommandPolling(): void {
  if (!isE2E || hasStartedPolling) {
    return;
  }

  hasStartedPolling = true;

  const pollIntervalMs = Number(process.env.E2E_POLL_INTERVAL_MS || 2000);
  const host = getLocalHost();
  const port = getCommandQueueServerPort();
  // Change isDebug while developing E2E for Perps to avoid emptying out the queue
  const isDebug = false;
  const baseUrl = isDebug
    ? `http://${host}:${port}/debug.json`
    : `http://${host}:${port}/queue.json`;
  const FETCH_TIMEOUT = 40000; // Timeout in milliseconds

  function scheduleNext(delay: number): void {
    if (!isE2E || pollingDisabled) return;
    if (pollTimeout) clearTimeout(pollTimeout);
    pollTimeout = setTimeout(pollOnce, delay);
  }

  async function pollOnce(): Promise<void> {
    try {
      // Lazy require to keep bridge tree-shakeable in prod and avoid ESM import in Jest
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
      const mod = require('../../../../../e2e/controller-mocking/mock-responses/perps/perps-e2e-mocks');
      const service = mod?.PerpsE2EMockService?.getInstance?.();
      /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
      if (!service) {
        scheduleNext(pollIntervalMs);
        return;
      }

      DevLogger.log('[E2E Perps Bridge - HTTP Polling] Poll URL', baseUrl);

      const response = await new Promise<AxiosResponse>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, FETCH_TIMEOUT);

        axios
          .get(baseUrl)
          .then((res) => {
            clearTimeout(timeoutId);
            resolve(res);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });

      if ((response as AxiosResponse).status !== 200) {
        DevLogger.log(
          '[E2E Perps Bridge - HTTP Polling] Poll non-200',
          (response as AxiosResponse).status,
        );
        consecutivePollFailures += 1;
        if (consecutivePollFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          pollingDisabled = true;
          DevLogger.log(
            '[E2E Perps Bridge - HTTP Polling] Disabling polling due to repeated non-200 responses',
          );
          return;
        }
        scheduleNext(pollIntervalMs);
        return;
      }

      const data = ((await response) as AxiosResponse).data?.queue as
        | (
            | {
                type: 'push-price';
                symbol: string;
                price: string | number;
              }
            | {
                type: 'force-liquidation';
                symbol: string;
              }
            | {
                type: 'mock-deposit';
                amount: string;
              }
          )[]
        | null
        | undefined;

      if (!Array.isArray(data) || data.length === 0) {
        consecutivePollFailures = 0;
        scheduleNext(pollIntervalMs);
        return;
      }

      consecutivePollFailures = 0;
      DevLogger.log('[E2E Perps Bridge - HTTP Polling] Poll data', data);

      for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        if (item.type === 'push-price') {
          const sym = (item as { symbol: string }).symbol;
          const price = String((item as { price: string | number }).price);
          try {
            if (typeof service.mockPushPrice === 'function') {
              service.mockPushPrice(sym, price);
            }
          } catch (e) {
            // no-op
          }
        } else if (item.type === 'force-liquidation') {
          const sym = (item as { symbol: string }).symbol;
          try {
            if (typeof service.mockForceLiquidation === 'function') {
              service.mockForceLiquidation(sym);
            }
          } catch (e) {
            // no-op
          }
        } else if (item.type === 'mock-deposit') {
          const amount = (item as { amount: string }).amount;
          try {
            if (typeof service.mockDepositUSD === 'function') {
              service.mockDepositUSD(amount);
            }
          } catch (e) {
            // no-op
          }
        }

        // no cursor handling
      }

      scheduleNext(0);
    } catch (err) {
      DevLogger.log('[E2E Perps Bridge - HTTP Polling] Poll error', err);
      consecutivePollFailures += 1;
      if (consecutivePollFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
        pollingDisabled = true;
        DevLogger.log(
          '[E2E Perps Bridge - HTTP Polling] Disabling polling due to repeated errors',
        );
        return;
      }
      scheduleNext(pollIntervalMs);
    }
  }

  DevLogger.log(
    '[E2E Perps Bridge - HTTP Polling] Starting E2E perps HTTP polling',
  );
  scheduleNext(0);
}

/**
 * Auto-configure E2E bridge when isE2E is true
 */
function autoConfigureE2EBridge(): void {
  if (!isE2E || e2eBridgePerps.mockStreamManager) {
    return; // Already configured or not in E2E mode
  }

  try {
    // Dynamically import E2E modules to avoid build-time dependencies
    // This will only work in E2E environment where these files exist

    // Try to require the modules directly - if they don't exist, this will throw
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
    const {
      PerpsE2EMockService,
    } = require('../../../../../e2e/controller-mocking/mock-responses/perps/perps-e2e-mocks');
    const {
      applyE2EPerpsControllerMocks,
      createE2EMockStreamManager,
    } = require('../../../../../e2e/controller-mocking/mock-config/perps-controller-mixin');
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

    // Initialize mock service
    const mockService = PerpsE2EMockService.getInstance();
    mockService.reset();

    // Create mock stream manager
    const mockStreamManager = createE2EMockStreamManager();

    // Configure bridge
    e2eBridgePerps = {
      mockStreamManager,
      applyControllerMocks: applyE2EPerpsControllerMocks,
    };

    // Register E2E deep link handler for price/liq commands
    // TODO: E2E perps deeplink handler can be later removed if HTTP polling is stable
    registerE2EPerpsDeepLinkHandler();

    // Start E2E HTTP polling for commands (replaces deeplink handler)
    startE2EPerpsCommandPolling();

    DevLogger.log(
      '[E2E Perps Bridge - HTTP Polling] E2E Bridge auto-configured successfully',
    );
    DevLogger.log('Mock state:', {
      accountBalance: mockService.getMockAccountState().availableBalance,
      positionsCount: mockService.getMockPositions().length,
      marketsCount: mockService.getMockMarkets().length,
    });
    DevLogger.log(
      'Mock markets:',
      mockService
        .getMockMarkets()
        .map(
          (m: { symbol: string; volume: string }) => `${m.symbol}: ${m.volume}`,
        ),
    );
  } catch (error) {
    // This is expected in production builds where E2E files don't exist
    // or when running in environments that don't have the e2e directory
    DevLogger.log(
      'E2E files not found (expected in production) - skipping mock setup',
    );
  }
}

/**
 * Set E2E bridge from external test setup (legacy support)
 */
export function setE2EBridge(bridge: E2EBridgePerpsStreaming): void {
  if (isE2E) {
    e2eBridgePerps = bridge;
    DevLogger.log('E2E Bridge manually configured:', Object.keys(bridge));
  }
}

/**
 * Get mock stream manager if available
 */
export function getE2EMockStreamManager(): unknown {
  if (isE2E) {
    autoConfigureE2EBridge();
    DevLogger.log(
      'E2E Bridge: Returning mock stream manager:',
      !!e2eBridgePerps.mockStreamManager,
    );
    return e2eBridgePerps.mockStreamManager;
  }
  return null;
}

/**
 * Apply controller mocks if available
 */
export function applyE2EControllerMocks(controller: unknown): void {
  // Use unified isE2E flag so CI/local runs with either IS_TEST=true or METAMASK_ENVIRONMENT='e2e'
  if (isE2E) {
    DevLogger.log('[E2E Bridge] Applying E2E PerpsController mocks');
    autoConfigureE2EBridge();
    if (e2eBridgePerps.applyControllerMocks) {
      e2eBridgePerps.applyControllerMocks(controller);
      DevLogger.log('[E2E Bridge] PerpsController mocks applied');
    } else {
      DevLogger.log('[E2E Bridge] applyControllerMocks not available');
    }
  }
}

export default {
  setE2EBridge,
  getE2EMockStreamManager,
  applyE2EControllerMocks,
};
