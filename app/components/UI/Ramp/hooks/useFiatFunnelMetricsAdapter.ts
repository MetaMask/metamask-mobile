import { useEffect } from 'react';
import {
  getFiatFunnelRampSurface,
  useFiatFunnelMetrics,
  type FiatFunnelMetricsResult,
} from './useFiatFunnelMetrics';
import { useRampsUserRegion } from './useRampsUserRegion';
import type { Quote } from '../types';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useAlerts } from '../../../Views/confirmations/context/alert-system-context';
import { AlertKeys } from '../../../Views/confirmations/constants/alerts';

/**
 * Confirmations adapter for the ramps-owned fiat funnel metrics.
 *
 * The hook lives with the ramps metrics ownership, while the imports below are
 * the narrow confirmations state needed to populate the generic funnel input.
 * Money-account deposits are the only wired surface today; other shared-screen
 * flows resolve to undefined and leave the generic hook inert.
 */
export function useFiatFunnelMetricsAdapter(): FiatFunnelMetricsResult {
  const transactionMeta = useTransactionMetadataRequest();
  const fiatPayment = useTransactionPayFiatPayment();
  const { alerts } = useAlerts();
  const { userRegion } = useRampsUserRegion();

  const quoteErrorAlert = alerts.find(
    (candidate) =>
      candidate.key === AlertKeys.NoPayTokenQuotes ||
      candidate.key === AlertKeys.FiatBuyAmountLimit,
  );

  const metrics = useFiatFunnelMetrics({
    rampSurface: getFiatFunnelRampSurface(transactionMeta?.type),
    region: userRegion?.regionCode ?? '',
    selectedPaymentMethodId: fiatPayment?.selectedPaymentMethodId,
    rampsQuote: fiatPayment?.rampsQuote as Quote | undefined,
    amountFiat: fiatPayment?.amountFiat,
    assetId: fiatPayment?.caipAssetId,
    quoteError: quoteErrorAlert
      ? {
          key: quoteErrorAlert.key,
          message:
            typeof quoteErrorAlert.message === 'string'
              ? quoteErrorAlert.message
              : undefined,
        }
      : undefined,
  });
  const { trackScreenViewed } = metrics;

  useEffect(() => {
    trackScreenViewed();
  }, [trackScreenViewed]);

  return metrics;
}
