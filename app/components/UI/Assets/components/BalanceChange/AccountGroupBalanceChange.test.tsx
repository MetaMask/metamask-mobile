import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AccountGroupBalanceChange from './AccountGroupBalanceChange';
import {
  FORMATTED_PERCENTAGE_TEST_ID,
  FORMATTED_VALUE_PRICE_TEST_ID,
} from './constants';
import { backgroundState } from '../../../../../util/test/initial-root-state';

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

describe('AccountGroupBalanceChange', () => {
  describe('positive changes', () => {
    it('renders positive amount and percent with prefix', () => {
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
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
      expect(String(percent.props.children)).toMatch(/^\(\+/);
      expect(String(value.props.children)).toContain('+');
    });

    it('renders large positive values correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={1234.56}
          percentChange={25.5}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('+');
      expect(String(percent.props.children)).toMatch(/^\(\+/);
    });

    it('renders small positive values correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={0.01}
          percentChange={0.1}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('+');
      expect(String(percent.props.children)).toMatch(/^\(\+/);
    });
  });

  describe('negative changes', () => {
    it('renders negative amount and percent with minus prefix', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={-1.23}
          percentChange={-0.99}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(percent.props.children)).toMatch(/^\(-/);
      expect(String(value.props.children)).toContain('-');
    });

    it('renders large negative values correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={-5678.9}
          percentChange={-45.2}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('-');
      expect(String(percent.props.children)).toMatch(/^\(-/);
    });

    it('renders small negative values correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={-0.05}
          percentChange={-0.01}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('-');
      expect(String(percent.props.children)).toMatch(/^\(-/);
    });
  });

  describe('zero changes', () => {
    it('renders zero amount and percent correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={0}
          percentChange={0}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('0');
      expect(String(percent.props.children)).toMatch(/^\(\+0/);
    });

    it('renders near-zero values correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={0.001}
          percentChange={0.001}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

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

      // Values should be visible
      expect(String(value.props.children)).toContain('12.34');
      expect(String(percent.props.children)).toContain('5.67');
    });
  });

  describe('different currencies', () => {
    it('renders USD currency correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      // Symbol-first USD with leading plus, trailing space
      expect(String(value.props.children)).toMatch(/^\+\$/);
    });

    it('renders EUR currency correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'eur'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      // Symbol-first EUR
      expect(String(value.props.children)).toMatch(/^\+€/);
    });

    it('renders GBP currency correctly', () => {
      const { getByTestId } = renderWithProvider(
        <AccountGroupBalanceChange
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'gbp'}
        />,
        { state: baseState },
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      // Code-suffix GBP with trailing space
      expect(String(value.props.children)).toMatch(/ GBP\s$/);
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
