import {
  getNotificationDetails,
  formatCurrency,
  hasDepositOrderField,
  generateThemeParameters,
  timestampToTransakFormat,
  validateEmail,
  excludeFromArray,
} from '.';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
import { DepositOrder, DepositOrderType } from '@consensys/native-ramps-sdk';
import { strings } from '../../../../../../locales/i18n';
import { darkTheme, lightTheme } from '@metamask/design-tokens';
import { AppThemeKey } from '../../../../../util/theme/models';

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

describe('generateThemeParameters', () => {
  it('should generate correct theme parameters for light mode', () => {
    const themeAppearance = AppThemeKey.light;
    const colors = lightTheme.colors;
    const result = generateThemeParameters(themeAppearance, colors);
    expect(result).toEqual({
      themeColor: colors.primary.default,
      colorMode: 'LIGHT',
      backgroundColors: [
        colors.background.default,
        colors.background.default,
        colors.background.alternative,
      ].join(','),
      textColors: [
        colors.text.default,
        colors.text.default,
        colors.text.alternative,
      ].join(','),
      borderColors: [
        colors.border.default,
        colors.border.muted,
        colors.border.muted,
      ].join(','),
      primaryButtonFillColor: colors.icon.default,
      primaryButtonTextColor: colors.icon.inverse,
      surfaceFillColor: colors.background.muted,
    });
  });

  it('should generate correct theme parameters for dark mode', () => {
    const themeAppearance = AppThemeKey.dark;
    const colors = darkTheme.colors;
    const result = generateThemeParameters(themeAppearance, colors);
    expect(result).toEqual({
      themeColor: colors.primary.default,
      colorMode: 'DARK',
      backgroundColors: [
        colors.background.default,
        colors.background.default,
        colors.background.alternative,
      ].join(','),
      textColors: [
        colors.text.default,
        colors.text.default,
        colors.text.alternative,
      ].join(','),
      borderColors: [
        colors.border.default,
        colors.border.muted,
        colors.border.muted,
      ].join(','),
      primaryButtonFillColor: colors.icon.default,
      primaryButtonTextColor: colors.icon.inverse,
      surfaceFillColor: colors.background.muted,
    });
  });
});

describe('timestampToTransakFormat', () => {
  it.each([
    [new Date(2021, 6, 4).getTime().toString(), '04-07-2021'],
    [new Date(2015, 4, 10).getTime().toString(), '10-05-2015'],
    [new Date(1998, 3, 6).getTime().toString(), '06-04-1998'],
    [new Date(1958, 2, 31).getTime().toString(), '31-03-1958'],
    [new Date(2025, 11, 31).getTime().toString(), '31-12-2025'],
    [new Date(2010, 9, 10).getTime().toString(), '10-10-2010'],
    [new Date(1996, 0, 1).getTime().toString(), '01-01-1996'],
  ])(
    'should return correct Transak format for timestamp %s',
    (timestamp, expected) => {
      expect(timestampToTransakFormat(timestamp)).toBe(expected);
    },
  );
});

describe('validateEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    expect(validateEmail('test+tag@example.org')).toBe(true);
  });

  it('should return false for invalid email addresses', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('test@@example.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('excludeFromArray', () => {
  it('should remove specified item from array', () => {
    const array = ['apple', 'banana', 'orange'];
    const result = excludeFromArray(array, 'banana');
    expect(result).toEqual(['apple', 'orange']);
  });

  it('should return original array if item not found', () => {
    const array = ['apple', 'banana', 'orange'];
    const result = excludeFromArray(array, 'grape');
    expect(result).toEqual(['apple', 'banana', 'orange']);
  });

  it('should handle empty arrays', () => {
    const result = excludeFromArray([], 'item');
    expect(result).toEqual([]);
  });

  it('should remove all instances of the item', () => {
    const array = ['apple', 'banana', 'apple', 'orange'];
    const result = excludeFromArray(array, 'apple');
    expect(result).toEqual(['banana', 'orange']);
  });

  it('should work with numbers', () => {
    const array = [1, 2, 3, 4, 3];
    const result = excludeFromArray(array, 3);
    expect(result).toEqual([1, 2, 4]);
  });
});
