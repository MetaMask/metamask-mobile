import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoExpanded from './account-network-info-expanded';
import { useSelectedAccountMultichainBalances } from '../../../../../../../components/hooks/useMultichainBalances';
import { MAINNET_DISPLAY_NAME } from '../../../../../../../core/Engine/constants';

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn().mockReturnValue({
    totalNativeTokenBalance: { amount: '0', unit: 'ETH' },
    totalBalanceFiat: 0,
    balances: {
      '0x0': { amount: '0', unit: 'ETH' },
    },
  }),
}));

jest.mock(
  '../../../../../../../components/hooks/useMultichainBalances',
  () => ({
    useSelectedAccountMultichainBalances: jest.fn(),
  }),
);

describe('AccountNetworkInfoExpanded', () => {
  const mockUseSelectedAccountMultichainBalances = jest.mocked(
    useSelectedAccountMultichainBalances,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedAccountMultichainBalances.mockReturnValue({
      selectedAccountMultichainBalance: {
        displayBalance: '$0.00',
        displayCurrency: 'USD',
        totalFiatBalance: 0,
        totalNativeTokenBalance: '0',
        nativeTokenUnit: 'ETH',
        tokenFiatBalancesCrossChains: [],
        shouldShowAggregatedPercentage: false,
        isPortfolioViewEnabled: true,
        aggregatedBalance: {
          ethFiat: 0,
          tokenFiat: 0,
          tokenFiat1dAgo: 0,
          ethFiat1dAgo: 0,
        },
        isLoadingAccount: false,
      },
    });
  });

  it('renders expected elements', () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfoExpanded />, {
      state: personalSignatureConfirmationState,
    });

    expect(getByText('Account')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('$0.00')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText(MAINNET_DISPLAY_NAME)).toBeDefined();
  });
});
