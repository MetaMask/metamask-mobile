import React from 'react';
import { render } from '@testing-library/react-native';
import VipSwapTransactionRow from './VipSwapTransactionRow';
import type { VipTransactionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.vip_transactions.swap_title': 'Swap',
    };
    return translations[key] ?? key;
  },
}));

jest.mock('../../utils/formatUtils', () => ({
  formatUsd: (value: string) => `$${value}`,
  formatRewardsTimeOnly: () => '2:30 PM',
}));

const MOCK_TX: VipTransactionDto = {
  id: 'tx-1',
  type: 'SWAP',
  timestamp: '2026-03-28T14:30:00.000Z',
  feeUsd: '0.50',
  volumeUsd: '250.00',
  swap: {
    quoteId: 'quote-1',
    srcChainId: '1',
    srcAssetSymbol: 'ETH',
    destChainId: '1',
    destAssetSymbol: 'USDC',
  },
};

describe('VipSwapTransactionRow', () => {
  it('renders swap title, pair detail, volume, and time', () => {
    const { getByText, getByTestId } = render(
      <VipSwapTransactionRow transaction={MOCK_TX} testID="swap-row" />,
    );

    expect(getByTestId('swap-row')).toBeOnTheScreen();
    expect(getByText('Swap')).toBeOnTheScreen();
    expect(getByText('ETH → USDC')).toBeOnTheScreen();
    expect(getByText('$250.00')).toBeOnTheScreen();
    expect(getByText('2:30 PM')).toBeOnTheScreen();
  });
});
