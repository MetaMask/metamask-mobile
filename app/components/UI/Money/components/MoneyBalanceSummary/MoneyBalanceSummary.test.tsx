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
const loadingState: MoneyBalanceDisplayState = { kind: 'loading' };
const retryingState: MoneyBalanceDisplayState = { kind: 'retrying' };
const errorState = (onRetry = jest.fn()): MoneyBalanceDisplayState => ({
  kind: 'error',
  onRetry,
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

  it('renders the balance skeleton instead of the balance value when loading', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyBalanceSummary apy={4} displayState={loadingState} />,
    );

    expect(
      getByTestId(MoneyBalanceSummaryTestIds.BALANCE_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
    ).not.toBeOnTheScreen();
  });

  it('renders the APY skeleton instead of the APY text when loading', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyBalanceSummary apy={4} displayState={loadingState} />,
    );

    expect(
      getByTestId(MoneyBalanceSummaryTestIds.APY_SKELETON),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyBalanceSummaryTestIds.APY)).not.toBeOnTheScreen();
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

  it('hides the APY tooltip button when in loading state', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary
        apy={4}
        displayState={loadingState}
        onApyInfoPress={mockInfoPress}
      />,
    );

    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
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

  describe('error state', () => {
    it('renders the balance-unavailable message when balance fetch fails', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={errorState()} />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_ERROR),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_ERROR),
      ).toHaveTextContent(/Balance unavailable/);
    });

    it('renders the retry icon button', () => {
      const { getByLabelText, getByTestId, queryByText } = render(
        <MoneyBalanceSummary apy={4} displayState={errorState()} />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_RETRY),
      ).toBeOnTheScreen();
      expect(getByLabelText(strings('money.balance_retry'))).toBeOnTheScreen();
      expect(queryByText(strings('money.balance_retry'))).not.toBeOnTheScreen();
    });

    it('calls onRetry when the retry icon button is pressed', () => {
      const mockRetry = jest.fn();
      const { getByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={errorState(mockRetry)} />,
      );

      fireEvent.press(getByTestId(MoneyBalanceSummaryTestIds.BALANCE_RETRY));

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render the balance text', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={errorState()} />,
      );

      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('hides the APY row', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={errorState()}
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

  describe('retrying state', () => {
    it('renders the balance skeleton', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={retryingState} />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_SKELETON),
      ).toBeOnTheScreen();
    });

    it('does not render the balance text or error message', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={retryingState} />,
      );

      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  describe('featureDisabled state', () => {
    const featureDisabledState: MoneyBalanceDisplayState = {
      kind: 'featureDisabled',
    };

    it('renders the feature-disabled message', () => {
      const { getByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={featureDisabledState} />,
      );

      expect(
        getByTestId(MoneyBalanceSummaryTestIds.BALANCE_FEATURE_DISABLED),
      ).toHaveTextContent(strings('money.balance_feature_disabled'));
    });

    it('does not render the balance text', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary apy={4} displayState={featureDisabledState} />,
      );

      expect(
        queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('hides the APY row', () => {
      const { queryByTestId } = render(
        <MoneyBalanceSummary
          apy={4}
          displayState={featureDisabledState}
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
});
