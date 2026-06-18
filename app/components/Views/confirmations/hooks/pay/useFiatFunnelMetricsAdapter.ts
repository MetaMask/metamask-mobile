import { TransactionType } from '@metamask/transaction-controller';
import {
  useFiatFunnelMetrics,
  type FiatFunnelMetricsResult,
} from '../../../../UI/Ramp/hooks/useFiatFunnelMetrics';
import {
  RAMP_SURFACE,
  type RampSurface,
} from '../../../../UI/Ramp/Deposit/types/analytics';
import type { Quote } from '../../../../UI/Ramp/types';
import { useRampsUserRegion } from '../../../../UI/Ramp/hooks/useRampsUserRegion';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useAlerts } from '../../context/alert-system-context';
import { AlertKeys } from '../../constants/alerts';

/**
 * Confirmations adapter for the ramps-owned {@link useFiatFunnelMetrics}: derives
 * `ramp_surface` from the tx type, resolves the active quote-error alert, and
 * forwards the inputs to the generic hook so the shared components stay thin.
 *
 * Money-account deposits are the only surface wired today, so every other flow
 * that renders the shared screen (perps / prediction deposits, withdraw,
 * `musdConversion`) resolves to `undefined` and leaves the generic hook inert.
 * The generic hook stays surface-agnostic, so perps / prediction can be enabled
 * later by adding an entry here.
 */
const TRANSACTION_TYPE_TO_RAMP_SURFACE: Partial<
  Record<TransactionType, RampSurface>
> = {
  [TransactionType.moneyAccountDeposit]: RAMP_SURFACE.MONEY_ACCOUNT,
};

export function useFiatFunnelMetricsAdapter(): FiatFunnelMetricsResult {
  const transactionMeta = useTransactionMetadataRequest();
  const rampSurface = transactionMeta?.type
    ? TRANSACTION_TYPE_TO_RAMP_SURFACE[transactionMeta.type]
    : undefined;

  const fiatPayment = useTransactionPayFiatPayment();
  const { alerts } = useAlerts();
  const { userRegion } = useRampsUserRegion();

  const quoteErrorAlert = alerts.find(
    (candidate) =>
      candidate.key === AlertKeys.NoPayTokenQuotes ||
      candidate.key === AlertKeys.FiatBuyAmountLimit,
  );

  return useFiatFunnelMetrics({
    rampSurface,
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
}
