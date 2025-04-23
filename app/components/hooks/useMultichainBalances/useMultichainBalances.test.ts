import { renderHook } from '@testing-library/react-hooks';
import useMultichainBalances from './useMultichainBalancesForAllAccounts';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import Engine from '../../../core/Engine';
import { isTestNet, isPortfolioViewEnabled } from '../../../util/networks';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { RootState } from '../../../reducers';
import { TokensWithBalances } from '../useGetFormattedTokensPerChain';

const mockUseSelector = jest.fn();

const MOCK_SELECTED_ACCOUNT_ID =
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount;

const MOCK_SELECTED_INTERNAL_ACCOUNT =
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
    MOCK_SELECTED_ACCOUNT_ID
  ];

const MOCK_STORE_STATE = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
          chainId: '0x1',
          ticker: 'ETH',
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 1,
      },
      PreferencesController: {
        isTokenNetworkFilterEqualCurrentNetwork: true,
      },
    },
  },
} as unknown as RootState;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: RootState) => unknown) =>
    mockUseSelector(selector),
}));

jest.mock('../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn(),
}));

jest.mock('../useGetFormattedTokensPerChain', () => ({
  useGetFormattedTokensPerChain: jest.fn().mockReturnValue({}),
}));

jest.mock('../useGetTotalFiatBalanceCrossChains', () => ({
  useGetTotalFiatBalanceCrossChains: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isTestNet: jest.fn().mockReturnValue(false),
  isPortfolioViewEnabled: jest.fn().mockReturnValue(false),
}));

describe('useMultichainBalances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) =>
      selector(MOCK_STORE_STATE),
    );
  });

  it('returns default values when no balances are available', () => {
    const mockBalance = {
      ethFiat: 0,
      tokenFiat: 0,
      tokenFiat1dAgo: 0,
      ethFiat1dAgo: 0,
      totalNativeTokenBalance: '0',
      ticker: 'ETH',
    };

    const aggregatedBalance = {
      ethFiat: 0,
      tokenFiat: 0,
      tokenFiat1dAgo: 0,
      ethFiat1dAgo: 0,
    };

    (Engine.getTotalEvmFiatAccountBalance as jest.Mock).mockReturnValue(
      mockBalance,
    );

    const { result } = renderHook(() => useMultichainBalances());

    expect(result.current.selectedAccountMultichainBalance).toEqual({
      displayBalance: '$0.00',
      displayCurrency: 'USD',
      tokenFiatBalancesCrossChains: [],
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance,
    });
  });

  it('calculates display balance correctly with ETH and token balances', () => {
    const mockBalance = {
      ethFiat: 100,
      tokenFiat: 50,
      tokenFiat1dAgo: 45,
      ethFiat1dAgo: 95,
      totalNativeTokenBalance: '0.05',
      ticker: 'ETH',
    };

    const aggregatedBalance = {
      ethFiat: 100,
      tokenFiat: 50,
      tokenFiat1dAgo: 45,
      ethFiat1dAgo: 95,
    };

    (Engine.getTotalEvmFiatAccountBalance as jest.Mock).mockReturnValue(
      mockBalance,
    );

    const { result } = renderHook(() => useMultichainBalances());

    expect(
      result.current.selectedAccountMultichainBalance?.displayBalance,
    ).toBe('$150.00');
    expect(
      result.current.selectedAccountMultichainBalance?.aggregatedBalance,
    ).toEqual(aggregatedBalance);
  });

  it('handles portfolio view mode correctly', () => {
    (isPortfolioViewEnabled as jest.Mock).mockReturnValue(true);
    const mockTotalFiatBalance = 1000;
    const mockTokenFiatBalance = 500;

    const mockTokensWithBalances: TokensWithBalances[] = [
      {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
        balance: '500',
        tokenBalanceFiat: 500,
      },
    ];

    const mockTotalFiatBalancesCrossChain = {
      [MOCK_SELECTED_INTERNAL_ACCOUNT.address]: {
        totalFiatBalance: mockTotalFiatBalance,
        totalTokenFiat: mockTokenFiatBalance,
        tokenFiatBalancesCrossChains: [
          {
            chainId: '0x1',
            nativeFiatValue: 500,
            tokenFiatBalances: [mockTokenFiatBalance],
            tokensWithBalances: mockTokensWithBalances,
          },
          {
            chainId: '0x89',
            nativeFiatValue: 500,
            tokenFiatBalances: [mockTokenFiatBalance],
            tokensWithBalances: mockTokensWithBalances,
          },
        ],
      },
    };

    const mockBalance = {
      ethFiat: 0,
      tokenFiat: 0,
      tokenFiat1dAgo: 0,
      ethFiat1dAgo: 0,
      totalNativeTokenBalance: '0.5',
      ticker: 'ETH',
    };

    (Engine.getTotalEvmFiatAccountBalance as jest.Mock).mockReturnValue(
      mockBalance,
    );

    (useGetTotalFiatBalanceCrossChains as jest.Mock).mockReturnValue(
      mockTotalFiatBalancesCrossChain,
    );

    const { result } = renderHook(() => useMultichainBalances());

    expect(
      result.current.selectedAccountMultichainBalance?.isPortfolioVieEnabled,
    ).toBe(true);
    expect(
      result.current.selectedAccountMultichainBalance?.totalFiatBalance,
    ).toBe(mockTotalFiatBalance);
    expect(
      result.current.selectedAccountMultichainBalance?.displayBalance,
    ).toBe('$1,000.00');
  });

  it('does not show aggregated percentage on test networks', () => {
    (isTestNet as jest.Mock).mockReturnValue(true);

    const mockBalance = {
      ethFiat: 0,
      tokenFiat: 0,
      tokenFiat1dAgo: 0,
      ethFiat1dAgo: 0,
      totalNativeTokenBalance: '0',
      ticker: 'ETH',
    };

    (Engine.getTotalEvmFiatAccountBalance as jest.Mock).mockReturnValue(
      mockBalance,
    );

    const { result } = renderHook(() => useMultichainBalances());

    expect(
      result.current.selectedAccountMultichainBalance
        ?.shouldShowAggregatedPercentage,
    ).toBe(false);
  });
});
