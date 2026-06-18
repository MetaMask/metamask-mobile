import { useEffect, useMemo, useRef } from 'react';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../../core/Engine';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { formatDelayFromArray } from '../../../../UI/Ramp/Aggregator/utils';
import { buildSelectorOpenedPayload } from '../../../../UI/Ramp/hooks/useFiatFunnelMetrics';
import useRampsAnalytics from '../../../../UI/Ramp/hooks/useAnalytics';
import { RAMP_SURFACE } from '../../../../UI/Ramp/Deposit/types/analytics';
import { useRampsUserRegion } from '../../../../UI/Ramp/hooks/useRampsUserRegion';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useIsFiatPaymentAvailable } from './useIsFiatPaymentAvailable';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { HighlightedItem } from '../../types/token';

/**
 * Converts available Ramps payment methods into {@link HighlightedItem}s for
 * the Pay-With modal. Returns `[]` when the fiat feature flag is off or no
 * payment methods are available. Selecting an item toggles
 * `fiatPayment.selectedPaymentMethodId` on the current transaction.
 */
export function useFiatPaymentHighlightedActions(): HighlightedItem[] {
  const { maxDelayMinutesForPaymentMethods } = useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();
  const fiatPayment = useTransactionPayFiatPayment();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
  const isFiatAvailable = useIsFiatPaymentAvailable();

  useTrackSelectorOpened(transactionMeta?.type, selectedPaymentMethodId);

  return useMemo(() => {
    if (!isFiatAvailable) {
      return [];
    }

    return paymentMethods
      .filter((pm) => isWithinDelayLimit(pm, maxDelayMinutesForPaymentMethods))
      .map((pm) =>
        toHighlightedItem(pm, transactionId, selectedPaymentMethodId),
      );
  }, [
    isFiatAvailable,
    maxDelayMinutesForPaymentMethods,
    paymentMethods,
    transactionId,
    selectedPaymentMethodId,
  ]);
}

function toHighlightedItem(
  paymentMethod: PaymentMethod,
  transactionId: string,
  selectedPaymentMethodId?: string,
): HighlightedItem {
  const isSelected = paymentMethod.id === selectedPaymentMethodId;

  return {
    position: 'outside_of_asset_list',
    icon: paymentMethod.icon,
    paymentType: paymentMethod.paymentType,
    name: paymentMethod.name,
    name_description: paymentMethod.delay
      ? formatDelayFromArray(paymentMethod.delay)
      : '',
    action: () => {
      Engine.context.TransactionPayController.updateFiatPayment({
        transactionId,
        callback: (fiatPayment) => {
          fiatPayment.selectedPaymentMethodId = isSelected
            ? undefined
            : paymentMethod.id;
        },
      });
    },
    isSelected,
  };
}

function isWithinDelayLimit(
  pm: PaymentMethod,
  maxDelayMinutesForPaymentMethods: number,
): boolean {
  return !pm.delay || pm.delay[1] <= maxDelayMinutesForPaymentMethods;
}

/**
 * TRAM-3623 (FIX 3): emit RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED from the
 * fiat-options path (mounted only when the Pay-With sheet opens), via the
 * dedicated tracker rather than the full funnel hook (which would re-run the
 * reactive effects and reintroduce the FIX 2 double-emit). Money-account only.
 */
function useTrackSelectorOpened(
  transactionType: TransactionType | undefined,
  currentPaymentMethodId: string | undefined,
): void {
  const trackEvent = useRampsAnalytics();
  const { userRegion } = useRampsUserRegion();
  const region = userRegion?.regionCode ?? '';
  const rampSurface =
    transactionType === TransactionType.moneyAccountDeposit
      ? RAMP_SURFACE.MONEY_ACCOUNT
      : undefined;

  // Latch only once a money surface resolves, so a late-resolving surface still
  // emits once and non-money flows never latch (stay inert).
  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (hasTrackedRef.current || !rampSurface) return;
    hasTrackedRef.current = true;
    trackEvent(
      'RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED',
      buildSelectorOpenedPayload(rampSurface, region, currentPaymentMethodId),
    );
  }, [rampSurface, region, currentPaymentMethodId, trackEvent]);
}
