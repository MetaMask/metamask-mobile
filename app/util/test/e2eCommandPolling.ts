import axios, { AxiosResponse } from 'axios';
import { isE2E, getCommandQueueServerPortInApp } from './utils';
import DevLogger from '../../core/SDKConnect/utils/DevLogger';

let hasStartedPolling = false;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;
let consecutiveFailures = 0;
let pollingDisabled = false;
const MAX_CONSECUTIVE_FAILURES = 2;
const POLL_INTERVAL_MS = 2000;
const FETCH_TIMEOUT = 40000;

function scheduleNext(delay: number): void {
  if (!isE2E || pollingDisabled) return;
  if (pollTimeout) clearTimeout(pollTimeout);
  pollTimeout = setTimeout(pollOnce, delay);
}

let isPollingInFlight = false;

function dispatchPerpsCommand(item: {
  type: string;
  args: Record<string, unknown>;
}): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod = require('../../../tests/controller-mocking/mock-responses/perps/perps-e2e-mocks');
    const service = mod?.PerpsE2EMockService?.getInstance?.();
    if (!service) return;

    if (item.type === 'push-price') {
      const sym = item.args.symbol as string;
      const price = String(item.args.price);
      if (typeof service.mockPushPrice === 'function') {
        service.mockPushPrice(sym, price);
      }
    } else if (item.type === 'force-liquidation') {
      const sym = item.args.symbol as string;
      if (typeof service.mockForceLiquidation === 'function') {
        service.mockForceLiquidation(sym);
      }
    } else if (item.type === 'mock-deposit') {
      const amount = item.args.amount as string;
      if (typeof service.mockDepositUSD === 'function') {
        service.mockDepositUSD(amount);
      }
    }
  } catch (e) {
    // Perps mocks not available — expected in non-perps tests
  }
}

async function pollOnce(): Promise<void> {
  if (isPollingInFlight) return;
  isPollingInFlight = true;

  try {
    const port = getCommandQueueServerPortInApp();
    const baseUrl = `http://localhost:${port}/queue.json`;

    DevLogger.log('[E2E Command Server Polling] Polling', baseUrl);

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

    if (response.status !== 200) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        pollingDisabled = true;
        DevLogger.log(
          '[E2E Command Server Polling] Disabling polling due to repeated non-200 responses',
        );
        return;
      }
      scheduleNext(POLL_INTERVAL_MS);
      return;
    }

    const data = response.data?.queue as
      | { type: string; args: Record<string, unknown> }[]
      | null
      | undefined;

    if (!Array.isArray(data) || data.length === 0) {
      consecutiveFailures = 0;
      scheduleNext(POLL_INTERVAL_MS);
      return;
    }

    consecutiveFailures = 0;
    DevLogger.log('[E2E Command Server Polling] Received commands', data);

    for (const item of data) {
      if (!item || typeof item !== 'object') continue;

      if (item.type === 'export-state') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
          const { handleExportStateCommand } = require('./e2eStateExport');
          await handleExportStateCommand();
        } catch (e) {
          DevLogger.log(
            '[E2E Command Server Polling] Error handling export-state',
            e,
          );
        }
      } else if (
        item.type === 'push-price' ||
        item.type === 'force-liquidation' ||
        item.type === 'mock-deposit'
      ) {
        dispatchPerpsCommand(item);
      }
    }

    scheduleNext(POLL_INTERVAL_MS);
  } catch (err) {
    DevLogger.log('[E2E Command Server Polling] Poll error', err);
    consecutiveFailures += 1;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      pollingDisabled = true;
      DevLogger.log(
        '[E2E Command Server Polling] Disabling polling due to repeated errors',
      );
      return;
    }
    scheduleNext(POLL_INTERVAL_MS);
  } finally {
    isPollingInFlight = false;
  }
}

/**
 * Start polling the command queue for E2E commands.
 * Handles all command types (generic + perps).
 * Probes the server first — if unreachable, polling never starts.
 * Should only be called once, guarded by isE2E.
 */
export async function startE2ECommandPolling(): Promise<void> {
  if (!isE2E || hasStartedPolling) return;

  // If the server isn't running (test didn't opt in with useCommandQueueServer),
  // we skip polling entirely instead of making wasted requests.
  const port = getCommandQueueServerPortInApp();
  try {
    await axios.get(`http://localhost:${port}/debug.json`, { timeout: 3000 });
  } catch {
    DevLogger.log(
      '[E2E Command Server Polling] Server not reachable, skipping polling',
    );
    return;
  }

  hasStartedPolling = true;
  DevLogger.log('[E2E Command Server Polling] Starting command polling');
  scheduleNext(0);
}
