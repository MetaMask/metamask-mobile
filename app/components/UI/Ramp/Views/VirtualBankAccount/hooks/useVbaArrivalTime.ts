import { useMemo } from 'react';
import type { PaymentMethod } from '@metamask/ramps-controller';
import { formatDelayFromArray } from '../../../Aggregator/utils';
import { useMoneyAccountDepositAssetId } from '../../../../Money/hooks/useMoneyAccountDepositAssetId';
import { useRampsPaymentMethodsForContext } from '../../../hooks/useRampsPaymentMethods';
import { useVbaEligibility } from './useVbaEligibility';
import { isVbaRegionSupported } from '../../../../../../util/region/isVbaRegionSupported';

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
 *
 * The result is lowercased because the intro row embeds it mid-sentence
 * ("Arrives in …"), while locale delay tokens like "Instant" and
 * "Less than" are sentence-cased for standalone display.
 */
export function getVbaArrivalTimeframe(
  paymentMethods: PaymentMethod[],
): string | undefined {
  const method =
    paymentMethods.find(({ isManualBankTransfer }) => isManualBankTransfer) ??
    paymentMethods.find(({ paymentType }) => paymentType === 'bank-transfer');
  const { delay } = method ?? {};

  return Array.isArray(delay) && delay.length >= 2
    ? formatDelayFromArray(delay).toLowerCase()
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

  // Only fetch for regions VBA actually serves (same gate as entry): under
  // the dev geo bypass the IP lookup can be unknown or non-BR, and the ramps
  // API has no catalog for it. The geolocation API returns "BR" or "BR-SP";
  // the ramps API indexes country-level regions by lowercase ISO code ("br").
  const regionCode = isVbaRegionSupported(location)
    ? (location?.split('-')[0].toLowerCase() ?? '')
    : '';

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
