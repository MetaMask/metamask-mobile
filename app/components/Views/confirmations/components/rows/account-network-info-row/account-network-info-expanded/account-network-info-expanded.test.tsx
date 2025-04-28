import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoExpanded from './account-network-info-expanded';
import { isPortfolioViewEnabled } from '../../../../../../../util/networks';
import { useSelectedAccountMultichainBalances } from '../../../../../../../components/hooks/useMultichainBalances';

jest.mock('../../../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../../../util/networks'),
  isPortfolioViewEnabled: jest.fn(),
}));

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
  const mockIsPortfolioViewEnabled = jest.mocked(isPortfolioViewEnabled);
  const mockUseSelectedAccountMultichainBalances = jest.mocked(
    useSelectedAccountMultichainBalances,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPortfolioViewEnabled.mockReturnValue(false);
    mockUseSelectedAccountMultichainBalances.mockReturnValue({
      selectedAccountMultichainBalance: {
        displayBalance: '$0.00',
        displayCurrency: 'USD',
        totalFiatBalance: 0,
        totalNativeTokenBalance: '0',
        nativeTokenUnit: 'ETH',
        tokenFiatBalancesCrossChains: [],
        shouldShowAggregatedPercentage: false,
        isPortfolioVieEnabled: true,
        aggregatedBalance: {
          ethFiat: 0,
          tokenFiat: 0,
          tokenFiat1dAgo: 0,
          ethFiat1dAgo: 0,
        },
      },
    });
  });

  it('should match snapshot when isPortfolioViewEnabled is true', () => {
    mockIsPortfolioViewEnabled.mockReturnValue(true);
    const { toJSON, getByText } = renderWithProvider(
      <AccountNetworkInfoExpanded />,
      {
        state: personalSignatureConfirmationState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
    expect(getByText('Account')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('$0.00')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
