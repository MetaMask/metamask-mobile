import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyBalanceSummary from './MoneyBalanceSummary';
import { MoneyBalanceSummaryTestIds } from './MoneyBalanceSummary.testIds';
import { strings } from '../../../../../../locales/i18n';
import { MoneyBalanceDisplayState } from '../../types';

const balanceState = (value = '$0.00'): MoneyBalanceDisplayState => ({
  kind: 'balance',
  value,
});
const unavailableState = (
  lastKnownValue?: string,
): MoneyBalanceDisplayState => ({
  kind: 'unavailable',
  lastKnownValue,
});

describe('MoneyBalanceSummary', () => {
  it('does not render the "Your balance" heading', () => {
    const { queryByText } = render(
      <MoneyBalanceSummary apy={4} displayState={balanceState()} />,
    );

    expect(queryByText(strings('money.your_balance'))).toBeNull();
  });

  it('renders the APY label with "• mUSD" suffix', () => {
    const { getByTestId } = render(
      <MoneyBalanceSummary apy={5.5} displayState={balanceState()} />,
    );

    expect(getByTestId(MoneyBalanceSummaryTestIds.APY)).toHaveTextContent(
      '5.5% APY • mUSD',
    );
  });

  it('renders the provided balance value', () => {
    const { getByTestId } = render(
      <MoneyBalanceSummary apy={4} displayState={balanceState('$123.45')} />,
    );

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '$123.45',
    );
  });

  it('does not render the info button when no handler is provided', () => {
    const { queryByTestId } = render(
      <MoneyBalanceSummary apy={4} displayState={balanceState()} />,
    );

    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('calls onApyInfoPress when the info button is pressed', () => {
    const mockInfoPress = jest.fn();
    const { getByTestId } = render(
      <MoneyBalanceSummary
        apy={4}
        displayState={balanceState()}
        onApyInfoPress={mockInfoPress}
      />,
    );

    fireEvent.press(getByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON));

    expect(mockInfoPress).toHaveBeenCalledTimes(1);
  });

  it('hides the APY text and tooltip button when apy is undefined', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary
        apy={undefined}
        displayState={balanceState()}
        onApyInfoPress={mockInfoPress}
      />,
    );

    expect(queryByTestId(MoneyBalanceSummaryTestIds.APY)).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('shows the APY text and tooltip button when apy is zero', () => {
    const mockInfoPress = jest.fn();
    const { getByTestId } = render(
      <MoneyBalanceSummary
        apy={0}
        displayState={balanceState()}
        onApyInfoPress={mockInfoPress}
      />,
    );

    expect(getByTestId(MoneyBalanceSummaryTestIds.APY)).toBeOnTheScreen();
    expect(
      getByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).toBeOnTheScreen();
  });

  it('hides the APY text and info button when apy is negative', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary
        apy={-1}
        displayState={balanceState()}
        onApyInfoPress={mockInfoPress}
      />,
    );

    expect(queryByTestId(MoneyBalanceSummaryTestIds.APY)).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  describe('noAccount state', () => {
    const noAccountState: MoneyBalanceDisplayState = { kind: 'noAccount' };

    it('renders the no-account message', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={noAccountState} />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_NO_ACCOUNT),
      ).toHaveTextContent(strings('money.balance_no_account'));
    });

    it('does not render the balance text', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={noAccountState} />,
      );

      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('hides the APY row', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={noAccountState}
          onApyInfoPress={jest.fn()}
        />,
      );

      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.APY),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('unavailable state', () => {
    it('renders a dash when there is no last known balance', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={unavailableState()} />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
      ).toHaveTextContent(strings('money.balance_unavailable_value'));
    });

    it('renders the last known balance when one is available', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={unavailableState('$2,384.34')}
        />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
      ).toHaveTextContent('$2,384.34');
    });

    it('does not render the regular balance text', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={unavailableState()} />,
      );

      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('keeps the APY row visible', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={unavailableState('$2,384.34')}
          onApyInfoPress={jest.fn()}
        />,
      );

      expect(getByTestId(MoneyBalanceSummaryTestIds.APY)).toBeOnTheScreen();
      expect(
        getByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('privacy mode', () => {
    it('shows the real balance when privacyMode is false', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={balanceState('$123.45')}
          privacyMode={false}
        />,
      );

      expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
        '$123.45',
      );
    });

    it('masks the balance when privacyMode is true', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={balanceState('$123.45')}
          privacyMode
        />,
      );

      expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
        '•'.repeat(12),
      );
    });

    it('calls onBalancePress when the balance is pressed', () => {
      const mockBalancePress = jest.fn();
      const { getByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={balanceState('$123.45')}
          onBalancePress={mockBalancePress}
        />,
      );

      fireEvent.press(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_PRESSABLE),
      );

      expect(mockBalancePress).toHaveBeenCalledTimes(1);
    });

    it('does not render a pressable balance when onBalancePress is not provided', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={balanceState('$123.45')} />,
      );

      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE_PRESSABLE),
      ).not.toBeOnTheScreen();
    });

    it('does not render a pressable balance in the noAccount state even when onBalancePress is provided', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={{ kind: 'noAccount' }}
          onBalancePress={jest.fn()}
        />,
      );

      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE_PRESSABLE),
      ).not.toBeOnTheScreen();
    });

    it('masks the last known balance when privacy mode is enabled', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={unavailableState('$2,384.34')}
          privacyMode
        />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
      ).toHaveTextContent('•'.repeat(12));
    });
  });
});
