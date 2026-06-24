import {
  FiatOrder,
  fiatOrdersRegionSelectorDeposit,
} from '../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../reducers';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { hasDepositOrderField } from './index';
import { AnalyticsEvents } from '../types';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';

/**
 * Builds the terminal RAMPS_TRANSACTION_COMPLETED / RAMPS_TRANSACTION_FAILED
 * payload for an order processed by the global FiatOrders observer
 * (`app/components/UI/Ramp/index.tsx`).
 *
 * TRAM-3623 scope note: this is the DEPOSIT path only. The observer polls the
 * redux `fiatOrders` store (`getPendingOrders`), which is fed exclusively by
 * `addFiatOrder` (native Deposit via `useHandleNewOrder`, plus the aggregator
 * paths). Headless buy orders are added through
 * `RampsController.addOrder` (`useTransakRouting` -> `useRampsOrders`) and never
 * enter the redux store, so they do not flow through this observer. Headless
 * terminal success/failure are emitted directly by `useTransakRouting`
 * (`RAMPS_TRANSACTION_CONFIRMED` / `RAMPS_ORDER_FAILED`). Hence `ramp_type`
 * stays hardcoded `'DEPOSIT'` here and no `ramp_surface` is emitted.
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
    ramp_type: 'DEPOSIT' as const,
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
