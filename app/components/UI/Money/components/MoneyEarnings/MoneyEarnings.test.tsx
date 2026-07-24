import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyEarnings from './MoneyEarnings';
import { MoneyEarningsTestIds } from './MoneyEarnings.testIds';
import { strings } from '../../../../../../locales/i18n';

const ZERO_VALUE = '$0.00';
const LAST_30_DAYS_VALUE = '$1.23';
const SINCE_INCEPTION_VALUE = '$14.76';

describe('MoneyEarnings', () => {
  it('renders the section title', () => {
    const { getByText } = render(
      <MoneyEarnings
        last30DaysEarnings={ZERO_VALUE}
        sinceInceptionEarnings={ZERO_VALUE}
      />,
    );

    expect(getByText(strings('money.earnings.title'))).toBeOnTheScreen();
  });

  it('renders the estimated monthly and yearly labels', () => {
    const { getByText } = render(
      <MoneyEarnings
        last30DaysEarnings={ZERO_VALUE}
        sinceInceptionEarnings={ZERO_VALUE}
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
        last30DaysEarnings={ZERO_VALUE}
        sinceInceptionEarnings={ZERO_VALUE}
      />,
    );

    expect(
      getByTestId(MoneyEarningsTestIds.LAST_30_DAYS_VALUE),
    ).toHaveTextContent(ZERO_VALUE);
    expect(
      getByTestId(MoneyEarningsTestIds.SINCE_INCEPTION_VALUE),
    ).toHaveTextContent(ZERO_VALUE);
  });

  it('renders the provided earnings values', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        last30DaysEarnings={LAST_30_DAYS_VALUE}
        sinceInceptionEarnings={SINCE_INCEPTION_VALUE}
      />,
    );

    expect(
      getByTestId(MoneyEarningsTestIds.LAST_30_DAYS_VALUE),
    ).toHaveTextContent(LAST_30_DAYS_VALUE);
    expect(
      getByTestId(MoneyEarningsTestIds.SINCE_INCEPTION_VALUE),
    ).toHaveTextContent(SINCE_INCEPTION_VALUE);
  });

  it('renders skeletons instead of values when loading', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyEarnings
        last30DaysEarnings={ZERO_VALUE}
        sinceInceptionEarnings={ZERO_VALUE}
        isLoading
      />,
    );

    expect(
      getByTestId(MoneyEarningsTestIds.LAST_30_DAYS_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsTestIds.SINCE_INCEPTION_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsTestIds.LAST_30_DAYS_VALUE),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsTestIds.SINCE_INCEPTION_VALUE),
    ).not.toBeOnTheScreen();
  });

  it('renders value text in default color regardless of sign', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        last30DaysEarnings={LAST_30_DAYS_VALUE}
        sinceInceptionEarnings={SINCE_INCEPTION_VALUE}
      />,
    );

    expect(
      getByTestId(MoneyEarningsTestIds.LAST_30_DAYS_VALUE),
    ).toHaveTextContent(LAST_30_DAYS_VALUE);
    expect(
      getByTestId(MoneyEarningsTestIds.SINCE_INCEPTION_VALUE),
    ).toHaveTextContent(SINCE_INCEPTION_VALUE);
  });

  it('renders the real earnings values when privacyMode is false', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        last30DaysEarnings={LAST_30_DAYS_VALUE}
        sinceInceptionEarnings={SINCE_INCEPTION_VALUE}
        privacyMode={false}
      />,
    );

    expect(
      getByTestId(MoneyEarningsTestIds.LAST_30_DAYS_VALUE),
    ).toHaveTextContent(LAST_30_DAYS_VALUE);
    expect(
      getByTestId(MoneyEarningsTestIds.SINCE_INCEPTION_VALUE),
    ).toHaveTextContent(SINCE_INCEPTION_VALUE);
  });

  it('masks the earnings values when privacyMode is true', () => {
    const { getByTestId } = render(
      <MoneyEarnings
        last30DaysEarnings={LAST_30_DAYS_VALUE}
        sinceInceptionEarnings={SINCE_INCEPTION_VALUE}
        privacyMode
      />,
    );

    expect(
      getByTestId(MoneyEarningsTestIds.LAST_30_DAYS_VALUE),
    ).toHaveTextContent('•'.repeat(9));
    expect(
      getByTestId(MoneyEarningsTestIds.SINCE_INCEPTION_VALUE),
    ).toHaveTextContent('•'.repeat(9));
  });
});
