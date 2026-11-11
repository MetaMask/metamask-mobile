import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { completedVbaDepositDisplayInfo } from './completedVbaDepositDisplayInfo';
import { moneyFormatUsd } from './moneyFormatFiat';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../Earn/constants/musd', () => ({
  MUSD_TOKEN: { symbol: 'mUSD' },
}));

jest.mock('../../../../util/intl', () => ({
  getIntlNumberFormatter: () =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }),
}));

jest.mock('./moneyFormatFiat', () => ({
  moneyFormatUsd: jest.fn(
    (amount: { toFixed: (places: number) => string }) =>
      `$${amount.toFixed(2)}`,
  ),
}));

const mockStrings = jest.mocked(strings);
const mockMoneyFormatUsd = jest.mocked(moneyFormatUsd);

describe('completedVbaDepositDisplayInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStrings.mockImplementation((key) => key);
    mockMoneyFormatUsd.mockImplementation((amount) => `$${amount.toFixed(2)}`);
  });

  it('formats a six-decimal settled deposit as positive mUSD and fiat amounts', () => {
    const result = completedVbaDepositDisplayInfo({
      amount: '12345678',
      decimals: 6,
    });

    expect(result).toEqual({
      description: 'money.transaction.bank_transfer',
      label: 'money.transaction.deposited',
      primaryAmount: '+12.35 mUSD',
      fiatAmount: '+$12.35',
      isIncoming: true,
      icon: IconName.Add,
      status: 'confirmed',
    });
  });

  it('formats a zero deposit with positive signs', () => {
    const result = completedVbaDepositDisplayInfo({ amount: '0', decimals: 6 });

    expect(result.primaryAmount).toBe('+0.00 mUSD');
    expect(result.fiatAmount).toBe('+$0.00');
  });

  it('scales amounts with a non-standard token precision', () => {
    const result = completedVbaDepositDisplayInfo({
      amount: '12345',
      decimals: 3,
    });

    expect(result.primaryAmount).toBe('+12.35 mUSD');
    expect(result.fiatAmount).toBe('+$12.35');
  });

  it.each(['not-a-number', 'Infinity', '-1', '1.5'])(
    'returns unavailable amounts for base-unit value %s',
    (amount) => {
      const result = completedVbaDepositDisplayInfo({ amount, decimals: 6 });

      expect(result.primaryAmount).toBe(
        'money.api_activity_details.amount_unavailable',
      );
      expect(result.fiatAmount).toBe(
        'money.api_activity_details.amount_unavailable',
      );
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 19])(
    'returns unavailable amounts for decimal count %s',
    (decimals) => {
      const result = completedVbaDepositDisplayInfo({
        amount: '1000000',
        decimals,
      });

      expect(result.primaryAmount).toBe(
        'money.api_activity_details.amount_unavailable',
      );
      expect(result.fiatAmount).toBe(
        'money.api_activity_details.amount_unavailable',
      );
    },
  );
});
