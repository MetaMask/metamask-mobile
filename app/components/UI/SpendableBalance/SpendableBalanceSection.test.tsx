import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';

import {
  SpendableBalanceSection,
  SpendableBalanceSectionTestIds,
} from './SpendableBalanceSection';

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'asset_overview.your_balance': 'Your balance',
      'asset_spendable_balance.total_balance': 'Total balance',
      'asset_spendable_balance.fiat_value': 'Value',
      'asset_spendable_balance.spendable': 'Spendable',
      'asset_spendable_balance.base_reserved': 'Reserved (locked)',
    };

    return translations[key] ?? key;
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('SpendableBalanceSection', () => {
  const defaultProps = {
    minimumReserveBalance: '2.5',
    spendableBalance: '247.5',
    totalBalance: '250',
    symbol: 'XLM',
    fiatValue: '$105.00',
  };

  beforeEach(() => {
    mockUseSelector.mockReturnValue(false);
  });

  it('renders total, spendable, reserved, and fiat balances', () => {
    const { getByTestId, getByText } = render(
      <SpendableBalanceSection {...defaultProps} />,
    );

    expect(
      getByTestId(SpendableBalanceSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Your balance')).toBeOnTheScreen();
    expect(getByTestId(SpendableBalanceSectionTestIds.TOTAL)).toHaveTextContent(
      '250 XLM',
    );
    expect(
      getByTestId(SpendableBalanceSectionTestIds.SPENDABLE),
    ).toHaveTextContent('247.5 XLM');
    expect(
      getByTestId(SpendableBalanceSectionTestIds.RESERVED),
    ).toHaveTextContent('2.5 XLM');
    expect(getByTestId(SpendableBalanceSectionTestIds.FIAT)).toHaveTextContent(
      '$105.00',
    );
  });

  it('renders em dash when fiat value is undefined', () => {
    const { getByTestId } = render(
      <SpendableBalanceSection {...defaultProps} fiatValue={undefined} />,
    );

    expect(getByTestId(SpendableBalanceSectionTestIds.FIAT)).toHaveTextContent(
      '—',
    );
  });

  it('masks balances when privacy mode is enabled', () => {
    mockUseSelector.mockReturnValue(true);

    const { getByTestId, queryByText } = render(
      <SpendableBalanceSection {...defaultProps} />,
    );

    const maskedBalance = '•••••••••';
    expect(getByTestId(SpendableBalanceSectionTestIds.TOTAL)).toHaveTextContent(
      maskedBalance,
    );
    expect(
      getByTestId(SpendableBalanceSectionTestIds.SPENDABLE),
    ).toHaveTextContent(maskedBalance);
    expect(
      getByTestId(SpendableBalanceSectionTestIds.RESERVED),
    ).toHaveTextContent(maskedBalance);
    expect(getByTestId(SpendableBalanceSectionTestIds.FIAT)).toHaveTextContent(
      maskedBalance,
    );
    expect(queryByText('250 XLM')).toBeNull();
    expect(queryByText('247.5 XLM')).toBeNull();
    expect(queryByText('2.5 XLM')).toBeNull();
    expect(queryByText('$105.00')).toBeNull();
  });
});
