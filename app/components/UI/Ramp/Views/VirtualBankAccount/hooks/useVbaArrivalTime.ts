import { useMemo } from 'react';
import type { PaymentMethod } from '@metamask/ramps-controller';
import { formatDelayFromArray } from '../../../Aggregator/utils';
import { useMoneyAccountDepositAssetId } from '../../../../Money/hooks/useMoneyAccountDepositAssetId';
import { useRampsPaymentMethodsForContext } from '../../../hooks/useRampsPaymentMethods';
import { useVbaEligibility } from './useVbaEligibility';

export interface VbaArrivalTime {
  /**
   * Human-readable arrival window for a bank-transfer deposit in the user's
   * region (e.g. "2 - 3 business days"), or `undefined` when the ramps
   * catalog has no bank-transfer delay for this context. Callers fall back to
   * static copy while `undefined` (loading, error, or no data).
   */
  arrivalTimeframe: string | undefined;
}

/**
 * Pure arrival-window resolution so the rule can be unit tested without hooks.
 *
 * Prefers the explicit manual bank transfer entry, then any bank-transfer
 * payment type, and only reports a window when the catalog provides a
 * `delay` range (a minutes pair). VBA deposits are bank transfers, so other
 * methods (cards, instant transfers) do not describe this row.
 */
export function getVbaArrivalTimeframe(
  paymentMethods: PaymentMethod[],
): string | undefined {
  const method =
    paymentMethods.find(({ isManualBankTransfer }) => isManualBankTransfer) ??
    paymentMethods.find(({ paymentType }) => paymentType === 'bank-transfer');
  const { delay } = method ?? {};

  return Array.isArray(delay) && delay.length >= 2
    ? formatDelayFromArray(delay)
    : undefined;
}

/**
 * Per-region bank-transfer arrival window for the VBA intro screen, from the
 * ramps payment-methods catalog (`PaymentMethod.delay`, in minutes).
 *
 * Region comes from the same GeolocationController IP lookup that gates VBA
 * entry (`useVbaEligibility`), scoped to the Money Account deposit asset so
 * the controller resolves the providers that serve it. Read-only: the shared
 * catalog is never re-scoped by this screen.
 *
 * @returns The formatted arrival window, `undefined` until a fetch succeeds.
 */
export function useVbaArrivalTime(): VbaArrivalTime {
  const { location } = useVbaEligibility();
  const depositAssetId = useMoneyAccountDepositAssetId();

  // The geolocation API returns "BR" or "BR-SP"; the ramps API indexes
  // country-level regions by lowercase ISO code ("br").
  const regionCode = location?.split('-')[0].toLowerCase() ?? '';

  const context = useMemo(
    () => ({
      regionCode,
      assetId: depositAssetId,
      autoSelectProvider: true,
      restrictToKnownOrNativeProviders: true,
      updateState: false,
    }),
    [regionCode, depositAssetId],
  );
  const { paymentMethods } = useRampsPaymentMethodsForContext(context);

  return useMemo(
    () => ({ arrivalTimeframe: getVbaArrivalTimeframe(paymentMethods) }),
    [paymentMethods],
  );
}

export default useVbaArrivalTime;
