import {
  FiatOrder,
  fiatOrdersRegionSelectorDeposit,
} from '../../../../reducers/fiatOrders';
import { RootState } from '../../../../reducers';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import { hasDepositOrderField } from './depositUtils';
import { AnalyticsEvents } from '../types/depositAnalytics';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController';

/**
 * Builds the terminal RAMPS_TRANSACTION_COMPLETED / RAMPS_TRANSACTION_FAILED
 * payload for an order processed by the global FiatOrders observer
 * (`app/components/UI/Ramp/index.tsx`).
 *
 * TRAM-3755: this observer path covers legacy/native orders in the redux
 * `fiatOrders` store (`getPendingOrders`), fed by `addFiatOrder`. Headless buy
 * orders go through `RampsController.addOrder` and emit terminal analytics from
 * `useTransakRouting` instead. Non-headless terminal events here use
 * `ramp_type: 'UNIFIED_BUY_2'` (Deposit funnel literal retired) and no
 * `ramp_surface`.
 */
function getDepositAnalyticsPayload(
  fiatOrder: FiatOrder,
  state: RootState,
): [
  'RAMPS_TRANSACTION_COMPLETED' | 'RAMPS_TRANSACTION_FAILED' | null,
  (
    | AnalyticsEvents['RAMPS_TRANSACTION_COMPLETED']
    | AnalyticsEvents['RAMPS_TRANSACTION_FAILED']
    | null
  ),
] {
  if (
    fiatOrder.state !== FIAT_ORDER_STATES.COMPLETED &&
    fiatOrder.state !== FIAT_ORDER_STATES.FAILED
  ) {
    return [null, null];
  }

  if (!hasDepositOrderField(fiatOrder.data, 'cryptoCurrency')) {
    return [null, null];
  }

  const order = fiatOrder.data;

  const selectedRegion = fiatOrdersRegionSelectorDeposit(state);
  const networkConfigurations = selectNetworkConfigurationsByCaipChainId(state);

  const chainId =
    order?.network?.chainId || order?.cryptoCurrency?.chainId || '';

  const getNetworkName = (depositOrder: typeof order) => {
    if (!depositOrder?.network) {
      return 'Unknown Network';
    }
    const depositNetwork = depositOrder.network;
    const networkChainId = depositNetwork.chainId;
    return (
      depositNetwork.name ||
      networkConfigurations[networkChainId as `${string}:${string}`]?.name ||
      'Unknown Network'
    );
  };

  const baseAnalyticsData = {
    ramp_type: 'UNIFIED_BUY_2' as const,
    // TRAM-3696: join key back to the provider order. Never emit empty string.
    ...((order.providerOrderId || fiatOrder.id) && {
      provider_order_id: order.providerOrderId || fiatOrder.id,
    }),
    amount_source: Number(order.fiatAmount),
    amount_destination: Number(fiatOrder.cryptoAmount),
    exchange_rate: Number(order.exchangeRate),
    payment_method_id: order?.paymentMethod?.id || '',
    country: selectedRegion?.isoCode || '',
    chain_id: chainId,
    currency_destination: order?.cryptoCurrency?.assetId || '',
    currency_destination_symbol: order?.cryptoCurrency?.symbol,
    currency_destination_network: getNetworkName(order),
    currency_source: order?.fiatCurrency || '',
    provider_onramp: order?.provider || '',
  };

  if (fiatOrder.state === FIAT_ORDER_STATES.COMPLETED) {
    return [
      'RAMPS_TRANSACTION_COMPLETED',
      {
        ...baseAnalyticsData,
        gas_fee: order.networkFees ? Number(order.networkFees) : 0,
        processing_fee: order.partnerFees ? Number(order.partnerFees) : 0,
        total_fee: Number(order.totalFeesFiat),
      },
    ];
  } else if (fiatOrder.state === FIAT_ORDER_STATES.FAILED) {
    return [
      'RAMPS_TRANSACTION_FAILED',
      {
        ...baseAnalyticsData,
        gas_fee: order.networkFees ? Number(order.networkFees) : 0,
        processing_fee: order.partnerFees ? Number(order.partnerFees) : 0,
        total_fee: Number(order.totalFeesFiat),
        error_message: order.statusDescription || 'transaction_failed',
      },
    ];
  }

  return [null, null];
}

export default getDepositAnalyticsPayload;
