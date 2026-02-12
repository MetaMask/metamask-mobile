import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

export interface StandaloneInfoClientOptions {
  /** Whether to use testnet API endpoint */
  isTestnet: boolean;
  /** Request timeout in ms (default: CONNECTION_TIMEOUT_MS) */
  timeout?: number;
}

/**
 * Creates a standalone InfoClient for lightweight read-only queries.
 * Does not require full perps initialization (no wallet, WebSocket, etc.)
 */
export const createStandaloneInfoClient = (
  options: StandaloneInfoClientOptions,
): InfoClient => {
  const { isTestnet, timeout = PERPS_CONSTANTS.ConnectionTimeoutMs } = options;

  const httpTransport = new HttpTransport({
    isTestnet,
    timeout,
  });

  return new InfoClient({ transport: httpTransport });
};
