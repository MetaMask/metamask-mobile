import {
  getTransakCryptoCurrencyId,
  getTransakFiatCurrencyId,
  getTransakChainId,
  getTransakPaymentMethodId,
  getNotificationDetails,
  formatCurrency,
  hasDepositOrderField,
} from '.';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
import { DepositOrder, DepositOrderType } from '@consensys/native-ramps-sdk';
import { strings } from '../../../../../../locales/i18n';
import { DepositPaymentMethod } from '../constants';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

describe('formatCurrency', () => {
  it('should format currency amounts correctly', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100.00');
    expect(formatCurrency('50.5', 'EUR')).toBe('€50.50');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('should handle custom options', () => {
    const result = formatCurrency(100, 'USD', {
      currencyDisplay: 'narrowSymbol',
    });
    expect(result).toBe('$100.00');
  });

  it('should default to USD when no currency provided', () => {
    expect(formatCurrency(100, '')).toBe('$100.00');
  });
});

describe('Transak Utils', () => {
  describe('getTransakCryptoCurrencyId', () => {
    it('should return correct Transak crypto currency ID for USDC', () => {
      expect(
        getTransakCryptoCurrencyId({
          assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          logo: 'usdc-logo',
          iconUrl: 'usdc-icon',
          name: 'USD Coin',
          chainId: 'eip155:1',
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
        }),
      ).toBe('USDC');
    });

    it('should return correct Transak crypto currency ID for USDT', () => {
      expect(
        getTransakCryptoCurrencyId({
          assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
          logo: 'usdt-logo',
          iconUrl: 'usdt-icon',
          name: 'Tether USD',
          chainId: 'eip155:1',
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          symbol: 'USDT',
          decimals: 6,
        }),
      ).toBe('USDT');
    });

    it('should throw error for unsupported crypto currency', () => {
      expect(() =>
        getTransakCryptoCurrencyId({
          assetId: 'unsupported',
          logo: 'unsupported-logo',
          iconUrl: 'unsupported-icon',
          name: 'Unsupported',
          chainId: 'eip155:1',
          address: '0x123',
          symbol: 'UNS',
          decimals: 18,
        }),
      ).toThrow('Unsupported crypto currency: unsupported');
    });
  });

  describe('getTransakFiatCurrencyId', () => {
    it('should return correct Transak fiat currency ID for USD', () => {
      expect(
        getTransakFiatCurrencyId({
          id: 'USD',
          name: 'US Dollar',
          symbol: 'USD',
          emoji: '💵',
        }),
      ).toBe('USD');
    });

    it('should return correct Transak fiat currency ID for EUR', () => {
      expect(
        getTransakFiatCurrencyId({
          id: 'EUR',
          name: 'Euro',
          symbol: 'EUR',
          emoji: '💶',
        }),
      ).toBe('EUR');
    });

    it('should throw error for unsupported fiat currency', () => {
      expect(() =>
        getTransakFiatCurrencyId({
          id: 'unsupported',
          name: 'Unsupported',
          symbol: 'UNS',
          emoji: '❓',
        }),
      ).toThrow('Unsupported fiat currency: unsupported');
    });
  });

  describe('getTransakChainId', () => {
    it('should return correct Transak chain ID for Ethereum mainnet', () => {
      expect(getTransakChainId('eip155:1')).toBe('ethereum');
    });

    it('should throw error for unsupported chain', () => {
      expect(() => getTransakChainId('unsupported')).toThrow(
        'Unsupported chain: unsupported',
      );
    });
  });

  describe('getTransakPaymentMethodId', () => {
    it('should return correct Transak payment method ID for credit/debit card', () => {
      expect(
        getTransakPaymentMethodId({
          id: 'credit_debit_card',
          name: 'Credit/Debit Card',
          duration: 'instant',
          icon: IconName.Card,
        }),
      ).toBe('credit_debit_card');
    });

    it('should throw error for unsupported payment method', () => {
      expect(() =>
        getTransakPaymentMethodId({
          id: 'unsupported',
          name: 'Unsupported',
          duration: 'unknown',
        } as unknown as DepositPaymentMethod),
      ).toThrow('Unsupported payment method: unsupported');
    });
  });
});

describe('getNotificationDetails', () => {
  const createMockFiatOrder = (state: FIAT_ORDER_STATES): FiatOrder => ({
    id: 'test-order-id',
    provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
    createdAt: Date.now(),
    amount: 100,
    fee: 5,
    cryptoAmount: 0.1,
    cryptoFee: 0.005,
    currency: 'USD',
    cryptocurrency: 'ETH',
    currencySymbol: '$',
    state,
    account: '0x123456789',
    network: 'ethereum',
    txHash: '0xabcdef',
    excludeFromPurchases: false,
    orderType: 'BUY' as DepositOrderType,
    errorCount: 0,
    lastTimeFetched: Date.now(),
    data: {} as DepositOrder,
  });

  it('should return error notification details for FAILED state', () => {
    const fiatOrder = createMockFiatOrder(FIAT_ORDER_STATES.FAILED);
    (strings as jest.Mock)
      .mockReturnValueOnce('ETH deposit failed')
      .mockReturnValueOnce(
        'Your ETH deposit could not be completed. Please try again.',
      );

    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: 'ETH deposit failed',
      description: 'Your ETH deposit could not be completed. Please try again.',
      status: 'error',
    });
  });

  it('should return cancelled notification details for CANCELLED state', () => {
    const fiatOrder = createMockFiatOrder(FIAT_ORDER_STATES.CANCELLED);
    (strings as jest.Mock)
      .mockReturnValueOnce('Deposit cancelled')
      .mockReturnValueOnce('Your deposit has been cancelled.');

    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: 'Deposit cancelled',
      description: 'Your deposit has been cancelled.',
      status: 'cancelled',
    });
  });

  it('should return success notification details for COMPLETED state', () => {
    const fiatOrder = createMockFiatOrder(FIAT_ORDER_STATES.COMPLETED);
    (strings as jest.Mock)
      .mockReturnValueOnce('0.1 ETH received')
      .mockReturnValueOnce('Your ETH deposit has been completed successfully.');

    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: '0.1 ETH received',
      description: 'Your ETH deposit has been completed successfully.',
      status: 'success',
    });
  });

  it('should return null for CREATED state', () => {
    const fiatOrder = createMockFiatOrder(FIAT_ORDER_STATES.CREATED);
    const result = getNotificationDetails(fiatOrder);

    expect(result).toBeNull();
  });

  it('should return pending notification details for PENDING state', () => {
    const fiatOrder = createMockFiatOrder(FIAT_ORDER_STATES.PENDING);
    (strings as jest.Mock)
      .mockReturnValueOnce('ETH deposit pending')
      .mockReturnValueOnce('Your ETH deposit is being processed.');

    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: 'ETH deposit pending',
      description: 'Your ETH deposit is being processed.',
      status: 'pending',
    });
  });

  it('should return pending notification details for default case', () => {
    const fiatOrder = createMockFiatOrder('UNKNOWN' as FIAT_ORDER_STATES);
    (strings as jest.Mock)
      .mockReturnValueOnce('ETH deposit pending')
      .mockReturnValueOnce('Your ETH deposit is being processed.');

    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: 'ETH deposit pending',
      description: 'Your ETH deposit is being processed.',
      status: 'pending',
    });
  });
});

describe('hasDepositOrderField', () => {
  it('should return true when object has the specified field', () => {
    const validDepositOrder: DepositOrder = {
      id: 'test-id',
      provider: 'test-provider',
      createdAt: 1673886669608,
      fiatAmount: 123,
      fiatCurrency: 'USD',
      cryptoCurrency: 'ETH',
      network: 'ethereum',
      status: 'COMPLETED',
      orderType: 'DEPOSIT',
      walletAddress: '0x1234',
      txHash: '0x987654321',
    } as DepositOrder;

    const result = hasDepositOrderField(validDepositOrder, 'cryptoCurrency');

    expect(result).toBe(true);
  });

  it('should return false for null or undefined data', () => {
    expect(hasDepositOrderField(null, 'cryptoCurrency')).toBe(false);
    expect(hasDepositOrderField(undefined, 'cryptoCurrency')).toBe(false);
  });

  it('should return false for non-object data', () => {
    expect(hasDepositOrderField('string', 'cryptoCurrency')).toBe(false);
    expect(hasDepositOrderField(123, 'cryptoCurrency')).toBe(false);
    expect(hasDepositOrderField([], 'cryptoCurrency')).toBe(false);
  });

  it('should return false when field does not exist', () => {
    const objectWithoutField = {
      id: 'test-id',
      provider: 'test-provider',
    };

    const result = hasDepositOrderField(objectWithoutField, 'cryptoCurrency');

    expect(result).toBe(false);
  });

  it('should return false when field exists but is undefined', () => {
    const objectWithUndefinedField = {
      id: 'test-id',
      provider: 'test-provider',
      cryptoCurrency: undefined,
    };

    const result = hasDepositOrderField(
      objectWithUndefinedField,
      'cryptoCurrency',
    );

    expect(result).toBe(false);
  });

  it('should return true for different valid fields', () => {
    const validDepositOrder: DepositOrder = {
      id: 'test-id',
      provider: 'test-provider',
      createdAt: 1673886669608,
      fiatAmount: 123,
      fiatCurrency: 'USD',
      cryptoCurrency: 'ETH',
      network: 'ethereum',
      status: 'COMPLETED',
      orderType: 'DEPOSIT',
      walletAddress: '0x1234',
    } as DepositOrder;

    expect(hasDepositOrderField(validDepositOrder, 'id')).toBe(true);
    expect(hasDepositOrderField(validDepositOrder, 'fiatAmount')).toBe(true);
    expect(hasDepositOrderField(validDepositOrder, 'network')).toBe(true);
    expect(hasDepositOrderField(validDepositOrder, 'status')).toBe(true);
  });
});
