import { getLocaleLanguageCode } from '../../../hooks/useFormatters';
import { formatWithThreshold } from '../../../../util/assets';

/** Price and period change the header shows when the chart is not being scrubbed. */
export interface RestingHeader {
  price: number;
  percent?: number;
}

export interface RestingHeaderStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RestingHeader | undefined;
  set: (next: RestingHeader) => void;
}

const FIAT_DISPLAY_THRESHOLD = 0.01;

/**
 * Holds the chart header's resting price outside React state so a tick
 * rerenders the balance row and not the rest of the token page.
 */
export const emptyRestingHeaderStore: RestingHeaderStore = {
  subscribe: () => () => undefined,
  getSnapshot: () => undefined,
  set: () => undefined,
};

export function createRestingHeaderStore(): RestingHeaderStore {
  let current: RestingHeader | undefined;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => current,
    set(next) {
      if (current?.price === next.price && current?.percent === next.percent) {
        return;
      }
      current = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

/**
 * Fiat value of a token amount at a unit price, formatted the same way as
 * the polled `balanceFiat` string.
 */
export function formatBalanceAtPrice(
  balanceAmount: number | undefined,
  unitPrice: number | undefined,
  currency: string | undefined,
): string | undefined {
  if (
    balanceAmount === undefined ||
    !Number.isFinite(balanceAmount) ||
    unitPrice === undefined ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0 ||
    !currency
  ) {
    return undefined;
  }

  const formatted = formatWithThreshold(
    balanceAmount * unitPrice,
    FIAT_DISPLAY_THRESHOLD,
    getLocaleLanguageCode(),
    { style: 'currency', currency },
  );

  return formatted === '' ? undefined : formatted;
}

/** Signed percent matching the balance row, e.g. `+1.20%` or `-2.34%`. */
export function formatSignedPercent(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}
