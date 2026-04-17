import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyBalanceSummary from './MoneyBalanceSummary';
import { MoneyBalanceSummaryTestIds } from './MoneyBalanceSummary.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyBalanceSummary', () => {
  it('renders the title', () => {
    const { getByTestId } = render(<MoneyBalanceSummary apy={4} />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.TITLE)).toBeOnTheScreen();
  });

  it('renders the APY label inside a tag', () => {
    const { getByTestId } = render(<MoneyBalanceSummary apy={5.5} />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.APY_TAG)).toBeOnTheScreen();
    expect(getByTestId(MoneyBalanceSummaryTestIds.APY)).toHaveTextContent(
      strings('money.apy_label', { percentage: 5.5 }),
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

  it('renders the APY skeleton instead of the APY tag when loading', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyBalanceSummary apy={4} isLoading />,
    );

    expect(
      getByTestId(MoneyBalanceSummaryTestIds.APY_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_TAG),
    ).not.toBeOnTheScreen();
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

  it('hides the APY tag and info tooltip when apy is undefined', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary apy={undefined} onApyInfoPress={mockInfoPress} />,
    );

    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_TAG),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides the APY tag and info button when apy is zero', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary apy={0} onApyInfoPress={mockInfoPress} />,
    );

    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_TAG),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides the APY tag and info button when apy is negative', () => {
    const mockInfoPress = jest.fn();
    const { queryByTestId } = render(
      <MoneyBalanceSummary apy={-1} onApyInfoPress={mockInfoPress} />,
    );

    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_TAG),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyBalanceSummaryTestIds.APY_INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });
});
