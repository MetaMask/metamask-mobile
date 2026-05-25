import { DepositOrderType } from '@consensys/native-ramps-sdk';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders';
import { MOCK_USDC_TOKEN } from '../Deposit/constants/mockCryptoCurrencies';

const DEBUG_WALLET = '0x1234567890123456789012345678901234567890';

/**
 * Builds a {@link FiatOrder} for __DEV__ Order Processing previews (no Redux seed).
 */
export function createDebugFiatOrder(
  orderId: string,
  state: FIAT_ORDER_STATES,
): FiatOrder {
  return {
    id: orderId,
    provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
    createdAt: Date.now(),
    amount: 100,
    fee: 2.5,
    cryptoAmount: 98.5,
    cryptoFee: 0,
    currency: 'USD',
    cryptocurrency: MOCK_USDC_TOKEN.symbol,
    state,
    account: DEBUG_WALLET,
    walletAddress: DEBUG_WALLET,
    network: '1',
    orderType: DepositOrderType.BUY,
    excludeFromPurchases: false,
    data: {
      id: orderId,
      status: state,
      fiatCurrency: 'USD',
      fiatAmount: 100,
      cryptoCurrency: MOCK_USDC_TOKEN.symbol,
      cryptoAmount: 98.5,
      walletAddress: DEBUG_WALLET,
      network: 'ethereum',
    },
  };
}
