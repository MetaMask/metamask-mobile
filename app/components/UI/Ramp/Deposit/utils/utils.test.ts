import {
  formatUSPhoneNumber,
  getTransakCryptoCurrencyId,
  getTransakFiatCurrencyId,
  getTransakChainId,
  getTransakPaymentMethodId,
  getNotificationDetails,
} from '.';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
import { DepositOrder, DepositOrderType } from '@consensys/native-ramps-sdk';

// Mock the strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}_${JSON.stringify(params)}`;
    }
    return key;
  }),
}));

// Mock the renderNumber function
jest.mock('../../../../../util/number', () => ({
  renderNumber: jest.fn((value: string) => value),
}));

describe('formatUSPhoneNumber', () => {
  it('should return empty string for empty input', () => {
    expect(formatUSPhoneNumber('')).toBe('');
  });

  it('should format phone number correctly', () => {
    expect(formatUSPhoneNumber('1234567890')).toBe('(123) 456-7890');
    expect(formatUSPhoneNumber('123')).toBe('(123');
    expect(formatUSPhoneNumber('123456')).toBe('(123) 456');
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
        }),
      ).toBe('credit_debit_card');
    });

    it('should throw error for unsupported payment method', () => {
      expect(() =>
        getTransakPaymentMethodId({
          id: 'unsupported',
          name: 'Unsupported',
          duration: 'unknown',
        }),
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
    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: 'deposit.notifications.deposit_failed_title_{"currency":"ETH"}',
      description: 'deposit.notifications.deposit_failed_description',
      status: 'error',
    });
  });

  it('should return cancelled notification details for CANCELLED state', () => {
    const fiatOrder = createMockFiatOrder(FIAT_ORDER_STATES.CANCELLED);
    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: 'deposit.notifications.deposit_cancelled_title',
      description: 'deposit.notifications.deposit_cancelled_description',
      status: 'cancelled',
    });
  });

  it('should return success notification details for COMPLETED state', () => {
    const fiatOrder = createMockFiatOrder(FIAT_ORDER_STATES.COMPLETED);
    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title:
        'deposit.notifications.deposit_completed_title_{"amount":"0.1","currency":"ETH"}',
      description:
        'deposit.notifications.deposit_completed_description_{"currency":"ETH"}',
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
    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: 'deposit.notifications.deposit_pending_title_{"currency":"ETH"}',
      description: 'deposit.notifications.deposit_pending_description',
      status: 'pending',
    });
  });

  it('should return pending notification details for default case', () => {
    const fiatOrder = createMockFiatOrder('UNKNOWN' as FIAT_ORDER_STATES);
    const result = getNotificationDetails(fiatOrder);

    expect(result).toEqual({
      duration: 5000,
      title: 'deposit.notifications.deposit_pending_title_{"currency":"ETH"}',
      description: 'deposit.notifications.deposit_pending_description',
      status: 'pending',
    });
  });
});
