import React from 'react';
import { render } from '@testing-library/react-native';
import VipPerpsTransactionRow from './VipPerpsTransactionRow';
import type { VipTransactionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../../../Perps/components/PerpsTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ symbol }: { symbol: string }) =>
      ReactActual.createElement(View, { testID: `token-logo-${symbol}` }),
  };
});

jest.mock('../../utils/formatUtils', () => ({
  formatUsd: (value: string) => `$${value}`,
  formatRewardsTimeOnly: () => '2:30 PM',
}));

const MOCK_TX: VipTransactionDto = {
  id: 'tx-1',
  type: 'PERPS',
  timestamp: '2026-03-28T14:30:00.000Z',
  feeUsd: '1.25',
  volumeUsd: '1000.00',
  perps: {
    coin: 'ETH',
    feeCoin: 'USDC',
    rawFee: '1250000',
    rawNotionalVolume: '1000000000',
    tradeId: 'trade-1',
    orderId: 'order-1',
  },
};

describe('VipPerpsTransactionRow', () => {
  it('renders coin, volume, and time without fee', () => {
    const { getByText, getByTestId, queryByText } = render(
      <VipPerpsTransactionRow transaction={MOCK_TX} testID="perps-row" />,
    );

    expect(getByTestId('perps-row')).toBeOnTheScreen();
    expect(getByTestId('token-logo-ETH')).toBeOnTheScreen();
    expect(getByText('ETH')).toBeOnTheScreen();
    expect(getByText('$1000.00')).toBeOnTheScreen();
    expect(getByText('2:30 PM')).toBeOnTheScreen();
    expect(queryByText(/Fee/)).toBeNull();
  });
});
