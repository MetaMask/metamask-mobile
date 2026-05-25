import {
  closeSession,
  createSession,
  getActiveSessionId,
} from '../headless/sessionRegistry';
import type { HeadlessBuyCallbacks } from '../headless/types';
import type { Quote } from '../types';
import { MOCK_USDC_TOKEN } from '../Deposit/constants/mockCryptoCurrencies';

/** CAIP-19 asset used for dev headless previews (USDC on Ethereum). */
export const DEBUG_HEADLESS_ASSET_ID = MOCK_USDC_TOKEN.assetId;

/** Native Transak-style quote — routes to Verify identity / Enter email (no widget API). */
export const DEBUG_HEADLESS_NATIVE_QUOTE = {
  provider: 'transak',
  id: 'debug-headless-quote',
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '100',
  outputCurrency: {
    symbol: 'USDC',
    assetId: DEBUG_HEADLESS_ASSET_ID,
  },
  providerInfo: { type: 'native' as const, name: 'Transak', id: 'transak' },
  quote: {
    paymentMethod: '/payments/debit-credit-card',
    cryptoTranslation: { symbol: 'USDC' },
  },
} as Quote;

const noopCallbacks: HeadlessBuyCallbacks = {
  onOrderCreated: () => undefined,
  onError: () => undefined,
  onClose: () => undefined,
};

/**
 * Registers a fake headless session for __DEV__ Host navigation.
 * Closes any prior active session first.
 */
export function registerDebugHeadlessSession(): string {
  const prior = getActiveSessionId();
  if (prior) {
    closeSession(prior, { reason: 'user_dismissed' });
  }
  const session = createSession(
    {
      quote: DEBUG_HEADLESS_NATIVE_QUOTE,
      assetId: DEBUG_HEADLESS_ASSET_ID,
      amount: 100,
      currency: 'USD',
      paymentMethodId: '/payments/debit-credit-card',
    },
    noopCallbacks,
  );
  return session.id;
}
