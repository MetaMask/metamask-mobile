import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { createMockToken } from '../../Stake/testUtils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { TokenI } from '../../Tokens/types';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { Hex } from '@metamask/utils';
import { useEarnTokenDetails } from './useEarnTokenDetails';
import { MOCK_ETH_MAINNET_ASSET } from '../../Stake/__mocks__/stakeMockData';
import useBalance from '../../Stake/hooks/useBalance';
import { EARN_EXPERIENCES } from '../constants/experiences';

jest.mock('../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn().mockReturnValue(true),
}));

jest.mock('../../Stake/hooks/useBalance', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    balance: '100',
    balanceFiat: '$100',
  }),
}));

const mockAddress = '0x0000000000000000000000000000000000000000' as Hex;
const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      TokenBalancesController: {
        tokenBalances: {
          [mockAddress]: {
            [CHAIN_IDS.MAINNET]: {
              [mockAddress]: '0x56bc75e2d63100000' as Hex, // 100 ETH
              [usdcAddress]: '0x5f5e100' as Hex, // 100 USDC
            },
          },
        },
      },
      TokenRatesController: {
        marketData: {
          [CHAIN_IDS.MAINNET]: {
            [mockAddress]: {
              tokenAddress: mockAddress,
              price: 2000,
              currency: 'USD',
            },
            [usdcAddress]: {
              tokenAddress: usdcAddress,
              price: 1,
              currency: 'USD',
            },
          },
        },
      },
      CurrencyRateController: {
        conversionRate: 1,
        currentCurrency: 'USD',
        nativeCurrency: 'ETH',
        currencyRates: {
          ETH: {
            conversionRate: 2000,
          },
          USDC: {
            conversionRate: 1,
          },
        },
      },
      NetworkController: {
        selectedNetworkClientId: CHAIN_IDS.MAINNET,
        networkConfigurationsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            chainId: CHAIN_IDS.MAINNET,
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: CHAIN_IDS.MAINNET,
              },
            ],
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: mockAddress,
          accounts: {
            [mockAddress]: {
              address: mockAddress,
            },
          },
        },
      },
    },
  },
};

const mockEthToken: TokenI = {
  ...MOCK_ETH_MAINNET_ASSET,
  balance: '100',
  balanceFiat: '$200,000.00',
};

const mockUSDCToken: TokenI = {
  address: usdcAddress,
  symbol: 'USDC',
  decimals: 6,
  isETH: false,
  isNative: false,
  chainId: CHAIN_IDS.MAINNET,
  ticker: 'USDC',
  balance: '100',
  aggregators: [],
  image: '',
  name: 'USD Coin',
  balanceFiat: '$100.00',
  logo: '',
};

describe('useEarnTokenDetails', () => {
  it('returns token details with balance and APR for ETH', () => {
    (useBalance as jest.Mock).mockReturnValue({
      balanceFiatNumber: 200000,
      balanceWei: '1000000000000000000',
    });

    const { result } = renderHookWithProvider(() => useEarnTokenDetails(), {
      state: mockInitialState,
    });

    const tokenDetails = result.current.getTokenWithBalanceAndApr(mockEthToken);

    expect(tokenDetails).toEqual({
      ...mockEthToken,
      apr: '2.3',
      balanceFormatted: '100 ETH',
      balanceFiat: '$200,000.00',
      balanceFiatNumber: 200000,
      balanceMinimalUnit: '1000000000000000000',
      estimatedAnnualRewardsFormatted: '$4600',
      experience: EARN_EXPERIENCES.POOLED_STAKING,
    });
  });

  it('returns token details with balance and APR for USDC', () => {
    const { result } = renderHookWithProvider(() => useEarnTokenDetails(), {
      state: mockInitialState,
    });

    const tokenDetails =
      result.current.getTokenWithBalanceAndApr(mockUSDCToken);

    expect(tokenDetails).toEqual({
      ...mockUSDCToken,
      apr: '4.5',
      balanceFormatted: '100 USDC',
      balanceFiat: '$100',
      balanceFiatNumber: 100,
      balanceMinimalUnit: '100000000',
      estimatedAnnualRewardsFormatted: '$5',
      experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
    });
  });

  it('returns 0.0 APR for unsupported tokens', () => {
    const mockToken = {
      ...createMockToken({
        chainId: CHAIN_IDS.MAINNET,
        name: 'Unsupported Token',
        symbol: 'UNS',
        decimals: 18,
        address: '0x123' as Hex,
        ticker: 'UNS',
      }),
      isNative: false,
      isETH: false,
      balanceFiat: '$0.00',
    };

    const { result } = renderHookWithProvider(() => useEarnTokenDetails(), {
      state: mockInitialState,
    });

    const tokenDetails = result.current.getTokenWithBalanceAndApr(mockToken);

    expect(tokenDetails.apr).toBe('0.0');
  });

  it('returns estimatedAnnualRewardsFormatted with two decimal places for rewards under one dollar', () => {
    const usdcTokenWithSmallBalance = {
      ...mockUSDCToken,
      balanceFiat: '$5.00',
    };

    const { result } = renderHookWithProvider(() => useEarnTokenDetails(), {
      state: mockInitialState,
    });

    const { estimatedAnnualRewardsFormatted } =
      result.current.getTokenWithBalanceAndApr(usdcTokenWithSmallBalance);

    expect(estimatedAnnualRewardsFormatted).toBe('$0.23');
  });

  it('returns estimatedAnnualRewardsFormatted rounded up to nearest dollar for rewards greater than one dollar', () => {
    const { result } = renderHookWithProvider(() => useEarnTokenDetails(), {
      state: mockInitialState,
    });

    const { estimatedAnnualRewardsFormatted } =
      result.current.getTokenWithBalanceAndApr(mockUSDCToken);

    expect(estimatedAnnualRewardsFormatted).toBe('$5');
  });

  it('returns estimatedAnnualRewardsFormatted as empty string when token balance is empty', () => {
    const { result } = renderHookWithProvider(() => useEarnTokenDetails(), {
      state: {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokenBalancesController: {
              ...mockInitialState.engine.backgroundState
                .TokenBalancesController,
              tokenBalances: {
                ...mockInitialState.engine.backgroundState
                  .TokenBalancesController.tokenBalances,
                [mockAddress]: {
                  ...mockInitialState.engine.backgroundState
                    .TokenBalancesController.tokenBalances[mockAddress],
                  [CHAIN_IDS.MAINNET]: {
                    ...mockInitialState.engine.backgroundState
                      .TokenBalancesController.tokenBalances[mockAddress][
                      CHAIN_IDS.MAINNET
                    ],
                    [usdcAddress]: '0x0',
                  },
                },
              },
            },
          },
        },
      },
    });

    const { estimatedAnnualRewardsFormatted } =
      result.current.getTokenWithBalanceAndApr({
        ...mockUSDCToken,
        balance: '',
        balanceFiat: '',
      });

    expect(estimatedAnnualRewardsFormatted).toBe('');
  });
});
