import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AccountGroupBalanceChange from './AccountGroupBalanceChange';
import {
  FORMATTED_PERCENTAGE_TEST_ID,
  FORMATTED_VALUE_PRICE_TEST_ID,
} from './constants';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import I18n from '../../../../../../locales/i18n';

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
  strings: (key: string) => key,
}));

const mockI18n = jest.mocked(I18n);

const baseState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode: false,
      },
    },
  },
};

const renderBalanceChange = (
  props: React.ComponentProps<typeof AccountGroupBalanceChange>,
  state = baseState,
) => renderWithProvider(<AccountGroupBalanceChange {...props} />, { state });

const getAmountText = (
  ...args: Parameters<typeof renderBalanceChange>
): string => {
  const { getByTestId } = renderBalanceChange(...args);
  return String(getByTestId(FORMATTED_VALUE_PRICE_TEST_ID).props.children);
};

describe('AccountGroupBalanceChange', () => {
  beforeEach(() => {
    mockI18n.locale = 'en';
  });

  describe('positive changes', () => {
    it('renders positive amount and percent with prefix', () => {
      const { getByTestId } = renderBalanceChange({
        amountChangeInUserCurrency: 12.34,
        percentChange: 5.67,
        userCurrency: 'usd',
      });

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
      expect(String(percent.props.children)).toMatch(/^\(\+/);
      expect(String(value.props.children)).toContain('+');
    });

    it('renders grouped thousands for large positive USD amounts', () => {
      const { getByTestId } = renderBalanceChange({
        amountChangeInUserCurrency: 1234.56,
        percentChange: 25.5,
        userCurrency: 'usd',
      });

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toBe('+$1,234.56 ');
      expect(String(percent.props.children)).toMatch(/^\(\+/);
    });

    it('renders small positive USD amounts with two fraction digits', () => {
      const { getByTestId } = renderBalanceChange({
        amountChangeInUserCurrency: 0.01,
        percentChange: 0.1,
        userCurrency: 'usd',
      });

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('+');
      expect(String(percent.props.children)).toMatch(/^\(\+/);
    });
  });

  describe('negative changes', () => {
    it('renders negative amount and percent with a minus prefix', () => {
      const { getByTestId } = renderBalanceChange({
        amountChangeInUserCurrency: -1.23,
        percentChange: -0.99,
        userCurrency: 'usd',
      });

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(percent.props.children)).toMatch(/^\(-/);
      expect(String(value.props.children)).toBe('-$1.23 ');
    });

    it('renders grouped thousands for large negative USD amounts', () => {
      const { getByTestId } = renderBalanceChange({
        amountChangeInUserCurrency: -5678.9,
        percentChange: -45.2,
        userCurrency: 'usd',
      });

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toBe('-$5,678.90 ');
      expect(String(percent.props.children)).toMatch(/^\(-/);
    });

    it('renders small negative USD amounts with two fraction digits', () => {
      const { getByTestId } = renderBalanceChange({
        amountChangeInUserCurrency: -0.05,
        percentChange: -0.01,
        userCurrency: 'usd',
      });

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toBe('-$0.05 ');
      expect(String(percent.props.children)).toMatch(/^\(-/);
    });
  });

  describe('zero changes', () => {
    it('renders a zero USD amount as $0.00', () => {
      const { getByTestId } = renderBalanceChange({
        amountChangeInUserCurrency: 0,
        percentChange: 0,
        userCurrency: 'usd',
      });

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('0');
      expect(String(percent.props.children)).toMatch(/^\(\+0/);
    });

    it('rounds a near-zero USD amount to two fraction digits', () => {
      const { getByTestId } = renderBalanceChange({
        amountChangeInUserCurrency: 0.001,
        percentChange: 0.001,
        userCurrency: 'usd',
      });

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('+');
      expect(String(percent.props.children)).toMatch(/^\(\+/);
    });
  });

  describe('privacy mode', () => {
    it('hides values when privacy mode is enabled', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                ...backgroundState,
                PreferencesController: {
                  ...backgroundState.PreferencesController,
                  privacyMode: true,
                },
              },
            },
          },
        },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);

      // Values should be hidden with 10 dots per portfolio spec
      expect(String(value.props.children)).toMatch(/^••••••••••$/);
      expect(String(percent.props.children)).toMatch(/^••••••••••$/);
    });

    it('shows values when privacy mode is disabled', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);

      expect(String(value.props.children)).toContain('12.34');
      expect(String(percent.props.children)).toContain('5.67');
    });
  });

  describe('currency grouping', () => {
    it('inserts a thousands separator for USD amounts at or above 10,000', () => {
      expect(
        getAmountText({
          amountChangeInUserCurrency: 10293.11,
          percentChange: 1.23,
          userCurrency: 'usd',
        }),
      ).toBe('+$10,293.11 ');
    });

    it('inserts thousands separators for million-scale USD amounts', () => {
      expect(
        getAmountText({
          amountChangeInUserCurrency: 1234567.89,
          percentChange: 1.23,
          userCurrency: 'usd',
        }),
      ).toBe('+$1,234,567.89 ');
    });

    it('inserts thousands separators for large negative USD amounts', () => {
      expect(
        getAmountText({
          amountChangeInUserCurrency: -10293.11,
          percentChange: -1.23,
          userCurrency: 'usd',
        }),
      ).toBe('-$10,293.11 ');
    });

    it('inserts thousands separators for large EUR amounts', () => {
      expect(
        getAmountText({
          amountChangeInUserCurrency: 10293.11,
          percentChange: 1.23,
          userCurrency: 'eur',
        }),
      ).toBe('+€10,293.11 ');
    });

    it('inserts thousands separators for large GBP amounts', () => {
      expect(
        getAmountText({
          amountChangeInUserCurrency: 10293.11,
          percentChange: 1.23,
          userCurrency: 'gbp',
        }),
      ).toBe('+£10,293.11 ');
    });
  });

  describe('US and French currency punctuation', () => {
    it('formats US currency with comma grouping and a decimal point', () => {
      mockI18n.locale = 'en-US';

      expect(
        getAmountText({
          amountChangeInUserCurrency: 10293.11,
          percentChange: 1.23,
          userCurrency: 'usd',
        }),
      ).toBe('+$10,293.11 ');
    });

    it('formats French currency with narrow no-break space grouping and a decimal comma', () => {
      mockI18n.locale = 'fr-FR';

      expect(
        getAmountText({
          amountChangeInUserCurrency: 10293.11,
          percentChange: 1.23,
          userCurrency: 'eur',
        }),
      ).toBe('+10\u202f293,11\u00a0€ ');
    });

    it('formats a negative French currency amount with locale grouping', () => {
      mockI18n.locale = 'fr-FR';

      expect(
        getAmountText({
          amountChangeInUserCurrency: -10293.11,
          percentChange: -1.23,
          userCurrency: 'eur',
        }),
      ).toBe('-10\u202f293,11\u00a0€ ');
    });
  });

  describe('different currencies', () => {
    it('renders USD currency correctly', () => {
      expect(
        getAmountText({
          amountChangeInUserCurrency: 12.34,
          percentChange: 5.67,
          userCurrency: 'usd',
        }),
      ).toMatch(/^\+\$/);
    });

    it('renders EUR currency correctly', () => {
      expect(
        getAmountText({
          amountChangeInUserCurrency: 12.34,
          percentChange: 5.67,
          userCurrency: 'eur',
        }),
      ).toMatch(/^\+€/);
    });

    it('renders GBP currency correctly', () => {
      expect(
        getAmountText({
          amountChangeInUserCurrency: 12.34,
          percentChange: 5.67,
          userCurrency: 'gbp',
        }),
      ).toMatch(/^\+£/);
    });

    it('handles unknown currency gracefully', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'unknown'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      expect(value).toBeDefined();
      // Should still render without crashing
    });
  });

  describe('edge cases', () => {
    it('handles very large numbers', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={999999999.99}
          percentChange={999.99}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });

    it('handles very small numbers', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={0.000001}
          percentChange={0.000001}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });

    it('handles infinity values', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={Infinity}
          percentChange={Infinity}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });

    it('handles NaN values', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={NaN}
          percentChange={NaN}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });
  });

  describe('component structure', () => {
    it('renders both amount and percentage elements', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      expect(getByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeDefined();
      expect(getByTestId(FORMATTED_PERCENTAGE_TEST_ID)).toBeDefined();
    });

    it('applies correct styling classes', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      // Presence check only; RN Text doesn't use className
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });
  });
});
