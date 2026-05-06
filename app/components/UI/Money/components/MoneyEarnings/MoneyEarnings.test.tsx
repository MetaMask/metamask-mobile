import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyEarnings from './MoneyEarnings';
import { MoneyEarningsTestIds } from './MoneyEarnings.testIds';
import { strings } from '../../../../../../locales/i18n';

const ZERO_VALUE = '$0.00';
const MONTHLY_VALUE = '$1.23';
const YEARLY_VALUE = '$14.76';

describe('MoneyEarnings', () => {
  it('renders the section title', () => {
    const { getByText } = render(
      <MoneyEarnings
        monthlyEarnings={ZERO_VALUE}
        yearlyEarnings={ZERO_VALUE}
      />,
    );

    expect(getByText(strings('money.earnings.title'))).toBeOnTheScreen();
  });

  it('renders the estimated monthly and yearly labels', () => {
    const { getByText } = render(
      <MoneyEarnings
        monthlyEarnings={ZERO_VALUE}
        yearlyEarnings={ZERO_VALUE}
      />,
    );

    expect(
      getByText(strings('money.earnings.estimated_monthly')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.earnings.estimated_yearly')),
    ).toBeOnTheScreen();
  });

  it('renders the provided zero values when no real earnings exist', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        monthlyEarnings={ZERO_VALUE}
        yearlyEarnings={ZERO_VALUE}
      />,
    );

    expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
      ZERO_VALUE,
    );
    expect(getByTestId(MoneyEarningsTestIds.YEARLY_VALUE)).toHaveTextContent(
      ZERO_VALUE,
    );
  });

  it('renders the provided monthly and yearly earnings values', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        monthlyEarnings={MONTHLY_VALUE}
        yearlyEarnings={YEARLY_VALUE}
      />,
    );

    expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
      MONTHLY_VALUE,
    );
    expect(getByTestId(MoneyEarningsTestIds.YEARLY_VALUE)).toHaveTextContent(
      YEARLY_VALUE,
    );
  });

  it('renders skeletons instead of values when loading', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyEarnings
        monthlyEarnings={ZERO_VALUE}
        yearlyEarnings={ZERO_VALUE}
        isLoading
      />,
    );

    expect(
      getByTestId(MoneyEarningsTestIds.MONTHLY_SKELETON),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneyEarningsTestIds.YEARLY_SKELETON)).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsTestIds.MONTHLY_VALUE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsTestIds.YEARLY_VALUE),
    ).not.toBeOnTheScreen();
  });

  it('renders value text in default color regardless of sign', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        monthlyEarnings={MONTHLY_VALUE}
        yearlyEarnings={YEARLY_VALUE}
      />,
    );

    expect(getByTestId(MoneyEarningsTestIds.MONTHLY_VALUE)).toHaveTextContent(
      MONTHLY_VALUE,
    );
    expect(getByTestId(MoneyEarningsTestIds.YEARLY_VALUE)).toHaveTextContent(
      YEARLY_VALUE,
    );
  });
});
