import { useSyncExternalStore } from 'react';
import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  type PricingResponse,
} from '@metamask/subscription-controller';

/**
 * DEMO ONLY — do not merge.
 *
 * Single switch for the Pro end-to-end UI demo build. While `true`, the Pro
 * A/B flag is forced on so `Join Pro` renders in the Money header; pricing
 * falls back to {@link PRO_DEMO_PRICING} so the Benefits CTA is never blocked
 * by the pricing API; tapping the Benefits CTA marks the user as a subscriber
 * in memory so the Money header flips to `Pro` and opens Pro Hub; and Pro Hub
 * renders a membership-state switcher so every banner state can be previewed
 * in one install.
 *
 * Remove this file and every `proDemo` import to restore production behaviour.
 */
export const PRO_DEMO_MODE = true;

/** Pricing shown when the real pricing API is unavailable or not ready. */
export const PRO_DEMO_PRICING: PricingResponse = {
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      prices: [
        {
          interval: RECURRING_INTERVALS.month,
          unitAmount: 499,
          unitDecimals: 2,
          currency: 'usd',
          trialPeriodDays: 0,
          minBillingCycles: 1,
          minBillingCyclesForBalance: 1,
        },
        {
          interval: RECURRING_INTERVALS.year,
          unitAmount: 4999,
          unitDecimals: 2,
          currency: 'usd',
          trialPeriodDays: 0,
          minBillingCycles: 1,
          minBillingCyclesForBalance: 1,
        },
      ],
    },
  ],
  paymentMethods: [],
};

// ─── In-memory subscriber state ──────────────────────────────────────────────
// Reset on every cold start so testers can replay the flow from `Join Pro`.

let isDemoSubscriber = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): boolean => isDemoSubscriber;

/** Marks the demo user as subscribed (or not) and re-renders subscribers. */
export const setProDemoSubscriber = (value: boolean): void => {
  if (isDemoSubscriber === value) {
    return;
  }
  isDemoSubscriber = value;
  listeners.forEach((listener) => listener());
};

/** True once the tester has tapped the Benefits CTA in this session. */
export const useProDemoSubscriber = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
