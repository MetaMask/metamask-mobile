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
 *
 * Use cases:
 * - Discovery queries (checking if perps market exists)
 * - Portfolio analytics outside perps context
 * - Price feeds without full initialization
 *
 * @example
 * ```typescript
 * const infoClient = createStandaloneInfoClient({ isTestnet: false });
 * const meta = await infoClient.meta();
 * ```
 */
export const createStandaloneInfoClient = (
  options: StandaloneInfoClientOptions,
): InfoClient => {
  const { isTestnet, timeout = PERPS_CONSTANTS.CONNECTION_TIMEOUT_MS } =
    options;

  const httpTransport = new HttpTransport({
    isTestnet,
    timeout,
  });

  return new InfoClient({ transport: httpTransport });
};
