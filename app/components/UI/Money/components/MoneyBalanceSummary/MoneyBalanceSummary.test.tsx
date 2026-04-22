import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyBalanceSummary from './MoneyBalanceSummary';
import { MoneyBalanceSummaryTestIds } from './MoneyBalanceSummary.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyBalanceSummary', () => {
  it('renders the title', () => {
    const { getByTestId } = render(<MoneyBalanceSummary apy="4" />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.TITLE)).toBeOnTheScreen();
  });

  it('renders the APY label with the provided percentage', () => {
    const { getByTestId } = render(<MoneyBalanceSummary apy="5.5" />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.APY)).toHaveTextContent(
      strings('money.apy_label', { percentage: '5.5' }),
    );
  });

  it('renders zero balance', () => {
    const { getByTestId } = render(<MoneyBalanceSummary apy="4" />);

    expect(getByTestId(MoneyBalanceSummaryTestIds.BALANCE)).toHaveTextContent(
      '$0.00',
    );
  });
});
