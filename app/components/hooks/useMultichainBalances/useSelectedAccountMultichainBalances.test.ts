import { renderHook } from '@testing-library/react-hooks';
<<<<<<< HEAD
import useSelectedAccountMultichainBalances from './useSelectedAccountMultichainBalances';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE, MOCK_ACCOUNT_BIP122_P2WPKH } from '../../../util/test/accountsControllerTestUtils';
=======
<<<<<<<< HEAD:app/components/hooks/useMultichainBalances/useMultichainBalancesForAllAccounts.test.ts
import useMultichainBalances from './useMultichainBalancesForAllAccounts';
========
import useSelectedAccountMultichainBalances from './useSelectedAccountMultichainBalances';
>>>>>>>> stable:app/components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.test.ts
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  expectedUuid,
  expectedUuid2,
  internalAccount1,
  internalAccount2,
} from '../../../util/test/accountsControllerTestUtils';
>>>>>>> stable
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

<<<<<<< HEAD
describe('useSelectedAccountMultichainBalances', () => {
=======
<<<<<<<< HEAD:app/components/hooks/useMultichainBalances/useMultichainBalancesForAllAccounts.test.ts
describe('useMultichainBalancesForAllAccounts', () => {
========
describe('useSelectedAccountMultichainBalances', () => {
>>>>>>>> stable:app/components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.test.ts
>>>>>>> stable
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

    const { result } = renderHook(() => useSelectedAccountMultichainBalances());

<<<<<<< HEAD
    expect(result.current.selectedAccountMultichainBalance).toEqual({
=======
    expect(
      result.current.multichainBalancesForAllAccounts[MOCK_SELECTED_ACCOUNT_ID],
    ).toEqual({
>>>>>>> stable
      displayBalance: '$0.00',
      displayCurrency: 'USD',
      isLoadingAccount: false,
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

    const { result } = renderHook(() => useSelectedAccountMultichainBalances());

    expect(
<<<<<<< HEAD
      result.current.selectedAccountMultichainBalance?.displayBalance,
    ).toBe('$150.00');
    expect(
      result.current.selectedAccountMultichainBalance?.aggregatedBalance,
=======
      result.current.multichainBalancesForAllAccounts[MOCK_SELECTED_ACCOUNT_ID]
        ?.displayBalance,
    ).toBe('$150.00');
    expect(
      result.current.multichainBalancesForAllAccounts[MOCK_SELECTED_ACCOUNT_ID]
        ?.aggregatedBalance,
>>>>>>> stable
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

    const { result } = renderHook(() => useSelectedAccountMultichainBalances());

    expect(
<<<<<<< HEAD
      result.current.selectedAccountMultichainBalance?.isPortfolioVieEnabled,
    ).toBe(true);
    expect(
      result.current.selectedAccountMultichainBalance?.totalFiatBalance,
    ).toBe(mockTotalFiatBalance);
    expect(
      result.current.selectedAccountMultichainBalance?.displayBalance,
=======
      result.current.multichainBalancesForAllAccounts[MOCK_SELECTED_ACCOUNT_ID]
        ?.isPortfolioVieEnabled,
    ).toBe(true);
    expect(
      result.current.multichainBalancesForAllAccounts[MOCK_SELECTED_ACCOUNT_ID]
        ?.totalFiatBalance,
    ).toBe(mockTotalFiatBalance);
    expect(
      result.current.multichainBalancesForAllAccounts[MOCK_SELECTED_ACCOUNT_ID]
        ?.displayBalance,
>>>>>>> stable
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

    const { result } = renderHook(() => useSelectedAccountMultichainBalances());

    expect(
<<<<<<< HEAD
      result.current.selectedAccountMultichainBalance
=======
      result.current.multichainBalancesForAllAccounts[MOCK_SELECTED_ACCOUNT_ID]
>>>>>>> stable
        ?.shouldShowAggregatedPercentage,
    ).toBe(false);
  });

<<<<<<< HEAD
=======
<<<<<<<< HEAD:app/components/hooks/useMultichainBalances/useMultichainBalancesForAllAccounts.test.ts
  it('returns balances for all accounts', () => {
    // Use the predefined account IDs from the test utils
    const firstAccountId = expectedUuid;
    const secondAccountId = expectedUuid2;

    // Use the predefined internal accounts from test utils
    const mockInternalAccounts = [internalAccount1, internalAccount2];

    // Override the selector mock to return our test accounts
    mockUseSelector.mockImplementation((selector) => {
      // Check if this is the accounts selector by matching with the state structure
      if (
        selector(MOCK_STORE_STATE) ===
        MOCK_STORE_STATE.engine.backgroundState.AccountsController
          .internalAccounts.accounts
      ) {
        return mockInternalAccounts;
      }
      return selector(MOCK_STORE_STATE);
    });

    const mockBalance = {
      ethFiat: 50,
      tokenFiat: 25,
      tokenFiat1dAgo: 20,
      ethFiat1dAgo: 45,
      totalNativeTokenBalance: '0.025',
      ticker: 'ETH',
    };

    (Engine.getTotalEvmFiatAccountBalance as jest.Mock).mockReturnValue(
      mockBalance,
    );

    // Mock cross chain balances for both accounts
    const mockTotalFiatBalancesCrossChain = {
      [internalAccount1.address]: {
        totalFiatBalance: 75,
        totalTokenFiat: 25,
        tokenFiatBalancesCrossChains: [],
      },
      [internalAccount2.address]: {
        totalFiatBalance: 75,
        totalTokenFiat: 25,
        tokenFiatBalancesCrossChains: [],
      },
    };

    (useGetTotalFiatBalanceCrossChains as jest.Mock).mockReturnValue(
      mockTotalFiatBalancesCrossChain,
    );

    const { result } = renderHook(() => useMultichainBalances());

    // Verify we have balances for both accounts
    expect(
      Object.keys(result.current.multichainBalancesForAllAccounts),
    ).toHaveLength(2);

    // Test for specific account IDs from the test utils
    expect(result.current.multichainBalancesForAllAccounts).toHaveProperty(
      firstAccountId,
    );
    expect(result.current.multichainBalancesForAllAccounts).toHaveProperty(
      secondAccountId,
    );

    // Verify the balances for both accounts
    expect(
      result.current.multichainBalancesForAllAccounts[firstAccountId]
        ?.displayBalance,
    ).toBe('$75.00');
    expect(
      result.current.multichainBalancesForAllAccounts[firstAccountId]
        ?.totalNativeTokenBalance,
    ).toBe('0.025');
    expect(
      result.current.multichainBalancesForAllAccounts[secondAccountId]
        ?.displayBalance,
    ).toBe('$75.00');
    expect(
      result.current.multichainBalancesForAllAccounts[secondAccountId]
        ?.totalNativeTokenBalance,
    ).toBe('0.025');
========
>>>>>>> stable
  it('returns undefined when no selected account is available', () => {
    // Create a modified state with no selected account
    const stateWithNoSelectedAccount = {
      ...MOCK_STORE_STATE,
      engine: {
        ...MOCK_STORE_STATE.engine,
        backgroundState: {
          ...MOCK_STORE_STATE.engine.backgroundState,
          AccountsController: {
            ...MOCK_STORE_STATE.engine.backgroundState.AccountsController,
            internalAccounts: {
              ...MOCK_STORE_STATE.engine.backgroundState.AccountsController
                .internalAccounts,
              // Set selected account to an ID that doesn't exist
              selectedAccount: 'non-existent-id',
            },
          },
        },
      },
    };

    // Reset the mocks to make sure previous test state doesn't affect this one
    jest.clearAllMocks();

    // Use our modified state for this test only
    mockUseSelector.mockImplementation((selector) =>
      selector(stateWithNoSelectedAccount),
    );

    // Reset mock for useGetTotalFiatBalanceCrossChains to ensure we don't
    // have leftover values from other tests
    (useGetTotalFiatBalanceCrossChains as jest.Mock).mockReturnValue({});

    const { result } = renderHook(() => useSelectedAccountMultichainBalances());

    expect(result.current.selectedAccountMultichainBalance).toBeUndefined();
<<<<<<< HEAD
  });

  it('handles non-EVM account display balance conditions', () => {
    // Create state with non-EVM account selected
    const nonEvmState = {
      ...MOCK_STORE_STATE,
      engine: {
        ...MOCK_STORE_STATE.engine,
        backgroundState: {
          ...MOCK_STORE_STATE.engine.backgroundState,
          AccountsController: {
            internalAccounts: {
              selectedAccount: MOCK_ACCOUNT_BIP122_P2WPKH.id,
              accounts: { [MOCK_ACCOUNT_BIP122_P2WPKH.id]: MOCK_ACCOUNT_BIP122_P2WPKH },
            },
          },
          MultichainBalancesController: { balances: {} },
          MultichainAssetsController: { accountsAssets: {} },
          MultichainAssetsRatesController: { conversionRates: {} },
          MultichainNetworkController: { selectedMultichainNetworkChainId: 'bip122:000000000019d6689c085ae165831e93' },
          PreferencesController: { ...MOCK_STORE_STATE.engine.backgroundState.PreferencesController, showFiatInTestnets: false },
        },
      },
    } as unknown as RootState;

    mockUseSelector.mockImplementation((selector) => selector(nonEvmState));
    let { result } = renderHook(() => useSelectedAccountMultichainBalances());

    // Condition 1: No balance data -> "0"
    expect(result.current.selectedAccountMultichainBalance?.displayBalance).toBe('0');

    // Condition 2: With balance but no rates
    const stateWithBalance = {
      ...nonEvmState,
      engine: {
        ...nonEvmState.engine,
        backgroundState: {
          ...nonEvmState.engine.backgroundState,
          MultichainBalancesController: {
            balances: {
              [MOCK_ACCOUNT_BIP122_P2WPKH.id]: {
                'bip122:000000000019d6689c085ae165831e93/slip44:0': { amount: '0.5', unit: 'BTC' },
              },
            },
          },
          MultichainAssetsController: {
            accountsAssets: { [MOCK_ACCOUNT_BIP122_P2WPKH.id]: ['bip122:000000000019d6689c085ae165831e93/slip44:0'] },
          },
        },
      },
    } as unknown as RootState;

    mockUseSelector.mockImplementation((selector) => selector(stateWithBalance));
    ({ result } = renderHook(() => useSelectedAccountMultichainBalances()));
    // This should trigger the non-EVM balance display logic
    expect(result.current.selectedAccountMultichainBalance?.displayBalance).toBe('0.5 BTC');

    // Condition 3: With balance and rates -> should show fiat
    const stateWithFiatBalance = {
      ...stateWithBalance,
      engine: {
        ...stateWithBalance.engine,
        backgroundState: {
          ...stateWithBalance.engine.backgroundState,
          MultichainAssetsRatesController: {
            conversionRates: {
              'bip122:000000000019d6689c085ae165831e93/slip44:0': { rate: '50000', conversionTime: 0 },
            },
          },
          PreferencesController: { ...stateWithBalance.engine.backgroundState.PreferencesController, showFiatInTestnets: true },
        },
      },
    } as unknown as RootState;

    mockUseSelector.mockImplementation((selector) => selector(stateWithFiatBalance));
    ({ result } = renderHook(() => useSelectedAccountMultichainBalances()));
    // This should show a fiat value
    const fiatBalance = result.current.selectedAccountMultichainBalance?.displayBalance;
    expect(fiatBalance).toBeDefined();
    expect(fiatBalance).toBe('$25,000.00');
=======
>>>>>>>> stable:app/components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.test.ts
>>>>>>> stable
  });
});
