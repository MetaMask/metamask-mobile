import React from 'react';
import { render } from '@testing-library/react-native';
import AccountGroupBalanceChange from './AccountGroupBalanceChange';
import {
  FORMATTED_PERCENTAGE_TEST_ID,
  FORMATTED_VALUE_PRICE_TEST_ID,
} from './constants';

describe('AccountGroupBalanceChange', () => {
  describe('positive changes', () => {
    it('renders positive amount and percent with prefix', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
      expect(String(percent.props.children)).toMatch(/^\(\+/);
      expect(String(value.props.children)).toContain('+');
    });

    it('renders large positive values correctly', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={1234.56}
          percentChange={25.5}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('+');
      expect(String(percent.props.children)).toMatch(/^\(\+/);
    });

    it('renders small positive values correctly', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={0.01}
          percentChange={0.1}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('+');
      expect(String(percent.props.children)).toMatch(/^\(\+/);
    });
  });

  describe('negative changes', () => {
    it('renders negative amount and percent with minus prefix', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={-1.23}
          percentChange={-0.99}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(percent.props.children)).toMatch(/^\(-/);
      expect(String(value.props.children)).toContain('-');
    });

    it('renders large negative values correctly', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={-5678.9}
          percentChange={-45.2}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('-');
      expect(String(percent.props.children)).toMatch(/^\(-/);
    });

    it('renders small negative values correctly', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={-0.05}
          percentChange={-0.01}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('-');
      expect(String(percent.props.children)).toMatch(/^\(-/);
    });
  });

  describe('zero changes', () => {
    it('renders zero amount and percent correctly', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={0}
          percentChange={0}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('0');
      expect(String(percent.props.children)).toMatch(/^\(0/);
    });

    it('renders near-zero values correctly', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={0.001}
          percentChange={0.001}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(String(value.props.children)).toContain('+');
      expect(String(percent.props.children)).toMatch(/^\(\+/);
    });
  });

  describe('privacy mode', () => {
    it('hides values when privacy mode is enabled', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);

      // Values should be hidden with dots
      expect(String(value.props.children)).toMatch(/^••••••••••••$/);
      expect(String(percent.props.children)).toMatch(/^••••••••••••$/);
    });

    it('shows values when privacy mode is disabled', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
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
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      expect(String(value.props.children)).toMatch(/USD$/);
    });

    it('renders EUR currency correctly', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'eur'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      expect(String(value.props.children)).toMatch(/EUR$/);
    });

    it('renders GBP currency correctly', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'gbp'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      expect(String(value.props.children)).toMatch(/GBP$/);
    });

    it('handles unknown currency gracefully', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'unknown'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      expect(value).toBeDefined();
      // Should still render without crashing
    });
  });

  describe('edge cases', () => {
    it('handles very large numbers', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={999999999.99}
          percentChange={999.99}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });

    it('handles very small numbers', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={0.000001}
          percentChange={0.000001}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });

    it('handles infinity values', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={Infinity}
          percentChange={Infinity}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });

    it('handles NaN values', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={NaN}
          percentChange={NaN}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
      expect(value).toBeDefined();
      expect(percent).toBeDefined();
    });
  });

  describe('component structure', () => {
    it('renders both amount and percentage elements', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
      );

      expect(getByTestId(FORMATTED_VALUE_PRICE_TEST_ID)).toBeDefined();
      expect(getByTestId(FORMATTED_PERCENTAGE_TEST_ID)).toBeDefined();
    });

    it('applies correct styling classes', () => {
      const { getByTestId } = render(
        <AccountGroupBalanceChange
          privacyMode={false}
          amountChangeInUserCurrency={12.34}
          percentChange={5.67}
          userCurrency={'usd'}
        />,
      );

      const value = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);
      const percent = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);

      // Both elements should have the same styling class for consistency
      expect(value.props.className).toBeDefined();
      expect(percent.props.className).toBeDefined();
    });
  });
});
