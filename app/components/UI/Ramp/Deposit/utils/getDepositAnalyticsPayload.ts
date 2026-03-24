import {
  FiatOrder,
  fiatOrdersRegionSelectorDeposit,
} from '../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../reducers';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { hasDepositOrderField } from './index';
import { AnalyticsEvents } from '../types';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';

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
