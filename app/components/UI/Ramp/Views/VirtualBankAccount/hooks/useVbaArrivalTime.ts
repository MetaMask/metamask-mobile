import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { PaymentMethod } from '@metamask/ramps-controller';
import { strings } from '../../../../../../../locales/i18n';
import { selectMoneyMovementNeobank } from '../../../../../../selectors/featureFlagController/moneyAccount';
import { getVbaSourceCurrencyForCountry } from '../../../../../../util/region/getVbaSourceCurrency';
import { formatDelayFromArray } from '../../../Aggregator/utils';
import { useMoneyAccountDepositAssetId } from '../../../../Money/hooks/useMoneyAccountDepositAssetId';
import { useRampsPaymentMethodsForContext } from '../../../hooks/useRampsPaymentMethods';
import { useVbaEligibility } from './useVbaEligibility';

export interface VbaArrivalTime {
  /**
   * Localized title for the arrival row: Pix copy, the catalog's arrival window
   * for the region, or static copy while there is none (loading, error, no data).
   */
  arrivalTitle: string;
}

const getVbaArrivalTitle = (
  isPixDeposit: boolean,
  arrivalTimeframe: string | undefined,
): string => {
  if (isPixDeposit) {
    return strings(
      'virtual_bank_account.create_virtual_bank_account.feature_arrives_title_pix',
    );
  }
  return arrivalTimeframe
    ? strings(
        'virtual_bank_account.create_virtual_bank_account.feature_arrives_title',
        { timeframe: arrivalTimeframe },
      )
    : strings(
        'virtual_bank_account.create_virtual_bank_account.feature_arrives_title_no_timeframe',
      );
};

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
 * Arrival row title for the VBA intro screen. Pix regions use static copy; other
 * regions use the ramps payment-methods catalog (`PaymentMethod.delay`, in
 * minutes).
 *
 * Region comes from the same GeolocationController IP lookup that gates VBA
 * entry (`useVbaEligibility`), scoped to the Money Account deposit asset so
 * the controller resolves the providers that serve it. Read-only: the shared
 * catalog is never re-scoped by this screen.
 *
 * @returns The localized arrival title.
 */
export function useVbaArrivalTime(): VbaArrivalTime {
  const { location, isRegionEligible } = useVbaEligibility();
  const { chooseCurrency, regionCurrencies, regions, defaultCurrency } =
    useSelector(selectMoneyMovementNeobank);
  const depositAssetId = useMoneyAccountDepositAssetId();

  // With chooseCurrency on, the rail is unknown until the user picks a currency.
  const isPixDeposit =
    !chooseCurrency &&
    getVbaSourceCurrencyForCountry(
      location,
      regionCurrencies,
      regions,
      defaultCurrency,
    ) === 'BRL';

  // Only fetch for countries `moneyMovementNeobank.regions` allows (same gate as
  // entry). Under the dev geo bypass the IP lookup can be unknown or outside
  // that list, and the ramps API has no catalog for it. Geolocation returns
  // "US" or "US-CA"; the ramps API indexes country-level regions by lowercase
  // ISO code ("us"). Pix skips the fetch: its copy is static, because no Brazil
  // provider lists the deposit asset and the catalog delay would read "instant".
  const regionCode =
    isRegionEligible && !isPixDeposit
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
    () => ({
      arrivalTitle: getVbaArrivalTitle(
        isPixDeposit,
        getVbaArrivalTimeframe(paymentMethods),
      ),
    }),
    [paymentMethods, isPixDeposit],
  );
}

export default useVbaArrivalTime;
