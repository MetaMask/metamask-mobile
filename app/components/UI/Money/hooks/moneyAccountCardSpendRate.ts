import type {
  RateHistoryEntry,
  RateHistoryResponse,
} from '@metamask/money-account-api-data-service';

export type { RateHistoryEntry } from '@metamask/money-account-api-data-service';

export const CARD_SPEND_RATE_HISTORY_INITIAL_LOOKBACK_MS =
  30 * 24 * 60 * 60 * 1000;
export const CARD_SPEND_RATE_HISTORY_MAX_LOOKBACK_MS =
  365 * 24 * 60 * 60 * 1000;
const RATE_DECIMALS = 18;
const RATE_PATTERN = /^(\d+)(?:\.(\d{1,18}))?$/u;

/**
 * Parses the API's fixed-point decimal rate into an 18-decimal integer.
 *
 * @param rate - The rate string returned by rate-history.
 * @returns The scaled rate, or undefined for unsupported precision/format.
 */
export function parseRate18(rate: string): bigint | undefined {
  const match = RATE_PATTERN.exec(rate);
  if (!match) {
    return undefined;
  }
  const [, whole, fractional = ''] = match;
  return BigInt(`${whole}${fractional.padEnd(RATE_DECIMALS, '0')}`);
}

/**
 * Selects the latest indexed vault rate at or before a transaction's block.
 * This is block-level valuation; rate-history does not include log ordering.
 *
 * @param rates - Rate-history entries for the configured vault and chain.
 * @param blockNumber - The activity transaction's block number.
 * @returns The selected 18-decimal rate, or undefined when no prior rate exists.
 */
export function selectHistoricalRateForBlock(
  rates: readonly RateHistoryEntry[],
  blockNumber: number | undefined,
): string | undefined {
  if (blockNumber === undefined || !Number.isSafeInteger(blockNumber)) {
    return undefined;
  }

  return rates
    .filter(
      (entry) =>
        Number.isSafeInteger(entry.block_number) &&
        entry.block_number <= blockNumber &&
        parseRate18(entry.rate) !== undefined,
    )
    .sort(
      (left, right) =>
        left.block_number - right.block_number ||
        left.timestamp.localeCompare(right.timestamp),
    )
    .map(({ rate }) => parseRate18(rate))
    .at(-1)
    ?.toString();
}

/**
 * Fetches a bounded rate-history window, expanding its lower time bound when
 * the earliest matching rate predates the initial window. Returned rates are
 * scoped to the requested chain and vault. The upper bound intentionally
 * includes only the activity period, not a current-rate fallback.
 *
 * @param fetchRange - Typed Money Account API service method.
 * @param vaultAddress - Configured vmUSD vault address.
 * @param chainId - Configured vault chain ID.
 * @param activities - Activity rows needing a block-level rate.
 * @returns Rate entries within the final bounded range.
 */
export async function fetchCardSpendRateHistory(
  fetchRange: (
    vaultAddress: string,
    options: { chainId: number; from: string; to: string },
  ) => Promise<RateHistoryResponse>,
  vaultAddress: string,
  chainId: number,
  activities: readonly { blockNumber?: number; time: number }[],
): Promise<RateHistoryEntry[]> {
  const oldestActivityTime = Math.min(...activities.map(({ time }) => time));
  const latestActivityTime = Math.max(...activities.map(({ time }) => time));
  if (
    !Number.isFinite(oldestActivityTime) ||
    !Number.isFinite(latestActivityTime)
  ) {
    return [];
  }

  const to = new Date(latestActivityTime + 24 * 60 * 60 * 1000).toISOString();
  let lookbackMs = CARD_SPEND_RATE_HISTORY_INITIAL_LOOKBACK_MS;

  while (true) {
    const from = new Date(oldestActivityTime - lookbackMs).toISOString();
    const response = await fetchRange(vaultAddress, { chainId, from, to });
    if (
      response.chain_id !== chainId ||
      response.vault_address.toLowerCase() !== vaultAddress.toLowerCase()
    ) {
      throw new Error('Rate history response did not match configured vault');
    }

    const rates = response.rates;
    const hasUnmatchedEarlierBlock = activities.some(
      ({ blockNumber, time }) =>
        blockNumber !== undefined &&
        selectHistoricalRateForBlock(
          rates.filter(
            (entry) =>
              Date.parse(entry.timestamp) <= time + 24 * 60 * 60 * 1000,
          ),
          blockNumber,
        ) === undefined,
    );
    if (
      lookbackMs >= CARD_SPEND_RATE_HISTORY_MAX_LOOKBACK_MS ||
      !hasUnmatchedEarlierBlock
    ) {
      return rates;
    }

    lookbackMs = Math.min(
      lookbackMs * 2,
      CARD_SPEND_RATE_HISTORY_MAX_LOOKBACK_MS,
    );
  }
}
