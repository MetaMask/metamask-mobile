import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyEarnings from './MoneyEarnings';
import { MoneyEarningsTestIds } from './MoneyEarnings.testIds';
import { strings } from '../../../../../../locales/i18n';

const ZERO_VALUE = '$0.00';

describe('MoneyEarnings', () => {
  it('renders the section title', () => {
    const { getByText } = render(
      <MoneyEarnings
        lifetimeEarnings={ZERO_VALUE}
        projectedEarnings={ZERO_VALUE}
      />,
    );

    expect(getByText(strings('money.earnings.title'))).toBeOnTheScreen();
  });

  it('renders the provided zero values when no real earnings exist', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        lifetimeEarnings={ZERO_VALUE}
        projectedEarnings={ZERO_VALUE}
      />,
    );

    expect(getByTestId(MoneyEarningsTestIds.LIFETIME_VALUE)).toHaveTextContent(
      ZERO_VALUE,
    );
    expect(getByTestId(MoneyEarningsTestIds.PROJECTED_VALUE)).toHaveTextContent(
      ZERO_VALUE,
    );
  });

  it('renders the provided lifetime and projected earnings values', () => {
    const { getByTestId } = render(
      <MoneyEarnings lifetimeEarnings="$12.34" projectedEarnings="$56.78" />,
    );

    expect(getByTestId(MoneyEarningsTestIds.LIFETIME_VALUE)).toHaveTextContent(
      '$12.34',
    );
    expect(getByTestId(MoneyEarningsTestIds.PROJECTED_VALUE)).toHaveTextContent(
      '$56.78',
    );
  });

  it('renders skeletons instead of values when loading', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyEarnings
        lifetimeEarnings={ZERO_VALUE}
        projectedEarnings={ZERO_VALUE}
        isLoading
      />,
    );

    expect(
      getByTestId(MoneyEarningsTestIds.LIFETIME_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsTestIds.PROJECTED_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsTestIds.LIFETIME_VALUE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsTestIds.PROJECTED_VALUE),
    ).not.toBeOnTheScreen();
  });

  it('renders lifetime earnings in success color when value starts with +', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        lifetimeEarnings="+$2.84"
        projectedEarnings={ZERO_VALUE}
      />,
    );

    const lifetimeValue = getByTestId(MoneyEarningsTestIds.LIFETIME_VALUE);
    expect(lifetimeValue).toHaveTextContent('+$2.84');
  });
});
