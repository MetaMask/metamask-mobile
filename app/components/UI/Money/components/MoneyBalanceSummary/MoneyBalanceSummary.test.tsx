import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyBalanceSummary from './MoneyBalanceSummary';
import { MoneyBalanceSummaryTestIds } from './MoneyBalanceSummary.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyBalanceSummary', () => {
  it('does not render the "Your balance" heading', () => {
    const { queryByText } = render(<MoneyBalanceSummary apy={4} />);

    expect(queryByText(strings('money.your_balance'))).toBeNull();
  });

  it('renders the APY label with "• mUSD" suffix', () => {
    const { getByTestId } = render(<MoneyBalanceSummary apy={5.5} />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.APY)).toHaveTextContent(
      '5.5% APY • mUSD',
    );
  });

  it('renders the default zero balance when no balance prop is provided', () => {
    const { getByTestId } = render(<MoneyBalanceSummary apy={4} />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '$0.00',
    );
  });

  it('renders the provided balance value', () => {
    const { getByTestId } = render(
      <MoneyBalanceSummary apy={4} balance="$123.45" />,
    );

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '$123.45',
    );
  });

  it('renders the unavailable message instead of the balance when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyBalanceSummary
        apy={4}
        balanceUnavailableMessage="Set up your Money account to see your balance"
      />,
    );

    expect(
      getByTestId(MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE),
    ).toHaveTextContent('Set up your Money account to see your balance');
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.BALANCE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.BALANCE_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('does not render the balance skeleton when unavailable even if isLoading is true', () => {
    const { queryByTestId } = render(
      <MoneyBalanceSummary
        apy={4}
        isLoading
        balanceUnavailableMessage="Money account is unavailable"
      />,
    );

    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.BALANCE_SKELETON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('renders the balance skeleton instead of the balance value when loading', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyBalanceSummary apy={4} isLoading />,
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
      <MoneyBalanceSummary apy={4} isLoading />,
    );

    expect(
      getByTestId(MoneyBalanceSummaryTestIds.APY_SKELETON),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyBalanceSummaryTestIds.APY)).not.toBeOnTheScreen();
  });

  it('does not render the info button when no handler is provided', () => {
    const { queryByTestId } = render(<MoneyBalanceSummary apy={4} />);

    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('calls onApyInfoPress when the info button is pressed', () => {
    const mockInfoPress = jest.fn();
    const { getByTestId } = render(
      <MoneyBalanceSummary apy={4} onApyInfoPress={mockInfoPress} />,
    );

    fireEvent.press(getByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON));

    expect(mockInfoPress).toHaveBeenCalledTimes(1);
  });

  it('hides the APY text and tooltip button when apy is undefined', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary apy={undefined} onApyInfoPress={mockInfoPress} />,
    );

    expect(queryByTestId(MoneyBalanceSummaryTestIds.APY)).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides the APY text and tooltip button when apy is zero', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary apy={0} onApyInfoPress={mockInfoPress} />,
    );

    expect(queryByTestId(MoneyBalanceSummaryTestIds.APY)).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides the APY tooltip button when isLoading is true', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary apy={4} isLoading onApyInfoPress={mockInfoPress} />,
    );

    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides the APY text and info button when apy is negative', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary apy={-1} onApyInfoPress={mockInfoPress} />,
    );

    expect(queryByTestId(MoneyBalanceSummaryTestIds.APY)).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
