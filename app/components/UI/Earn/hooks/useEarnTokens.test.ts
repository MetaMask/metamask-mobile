import {
  AccountTrackerControllerState,
  CurrencyRateState,
  TokensControllerState,
} from '@metamask/assets-controllers';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import {
  internalAccount2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../util/test/accountsControllerTestUtils';
import {
  MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE,
  MOCK_NETWORK_CONTROLLER_STATE,
} from '../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  MOCK_LENDING_MARKET_USDC,
  MOCK_LENDING_MARKET_USDT,
  MOCK_LENDING_MARKET_WETH,
} from '../../Stake/__mocks__/earnControllerMockData';
import {
  createMockToken,
  mockEarnControllerRootState,
} from '../../Stake/testUtils';
import { TokenI } from '../../Tokens/types';
import useEarnTokens from './useEarnTokens';

const mockSelectPooledStakingEnabledFlag = jest.fn();
const mockSelectStablecoinLendingEnabledFlag = jest.fn();

jest.mock('../selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: () => mockSelectPooledStakingEnabledFlag(),
  selectStablecoinLendingEnabledFlag: () =>
    mockSelectStablecoinLendingEnabledFlag(),
}));

const MOCK_ROOT_STATE_WITH_EARN_CONTROLLER = mockEarnControllerRootState();
const MOCK_RATE = {
  price: 0.99,
  currency: 'ETH',
  allTimeHigh: 1,
  allTimeLow: 1,
  marketCap: 1,
  circulatingSupply: 1,
  dilutedMarketCap: 1,
  high1d: 1,
  low1d: 1,
  marketCapPercentChange1d: 0,
  priceChange1d: 0,
  pricePercentChange1d: 0,
  pricePercentChange1h: 0,
  pricePercentChange14d: 0,
  pricePercentChange30d: 0,
  pricePercentChange7d: 0,
  pricePercentChange200d: 0,
  pricePercentChange1y: 0,
  totalVolume: 1,
};
const mockState = {
  ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER,
  engine: {
    ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER.engine,
    backgroundState: {
      ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          USD: {
            conversionDate: 1717334400000,
            conversionRate: 1,
            usdConversionRate: 1,
          },
          ETH: {
            conversionDate: 1717334400000,
            conversionRate: 1,
            usdConversionRate: 1,
          },
        },
      } as CurrencyRateState,
      AccountTrackerController: {
        accountsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            [toChecksumHexAddress(internalAccount2.address)]: {
              balance: '0x15345543',
              stakedBalance: '0x1',
            },
          },
        },
      } as AccountTrackerControllerState,
      NetworkController: {
        ...MOCK_NETWORK_CONTROLLER_STATE,
        networkConfigurationsByChainId: {
          ...MOCK_NETWORK_CONTROLLER_STATE.networkConfigurationsByChainId,
          '0x1': {
            blockExplorerUrls: [],
            chainId: '0x1',
            defaultRpcEndpointIndex: 0,
            name: 'Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                failoverUrls: [],
                networkClientId: 'mainnet',
                type: 'infura',
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
              },
            ],
          },
        },
      },
      TokensController: {
        allTokens: {
          [CHAIN_IDS.MAINNET as Hex]: {
            [internalAccount2.address as string]: [
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDT.underlying.address,
                ),
                name: 'USDT Token',
                symbol: 'USDT',
                decimals: 6,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDC.underlying.address,
                ),
                name: 'USDC Token',
                symbol: 'USDC',
                decimals: 6,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_WETH.underlying.address,
                ),
                name: 'WETH Token',
                symbol: 'WETH',
                decimals: 12,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDT.outputToken.address,
                ),
                name: 'aUSDT Token',
                symbol: 'aUSDT',
                decimals: 6,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDC.outputToken.address,
                ),
                name: 'aUSDC Token',
                symbol: 'aUSDC',
                decimals: 6,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_WETH.outputToken.address,
                ),
                name: 'aWETH Token',
                symbol: 'aWETH',
                decimals: 12,
              },
            ],
          },
        },
        allIgnoredTokens: {},
        allDetectedTokens: {},
      } as TokensControllerState,
      TokenBalancesController: {
        tokenBalances: {
          [internalAccount2.address as Hex]: {
            [CHAIN_IDS.MAINNET]: {
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_USDT.underlying.address,
              )]: '0x112379784235',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_USDC.underlying.address,
              )]: '0x0',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_WETH.underlying.address,
              )]: '0x312379784235',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_USDT.outputToken.address,
              )]: '0x412379784235',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_USDC.outputToken.address,
              )]: '0x512379784235',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_WETH.outputToken.address,
              )]: '0x612379784235',
            },
          },
        },
      },
      MultichainNetworkController: MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE,
      TokenRatesController: {
        marketData: {
          [CHAIN_IDS.MAINNET]: {
            [toChecksumHexAddress(MOCK_LENDING_MARKET_USDT.underlying.address)]:
              { ...MOCK_RATE, price: 0.000005123 },
            [toChecksumHexAddress(MOCK_LENDING_MARKET_USDC.underlying.address)]:
              { ...MOCK_RATE, price: 0.0000000123 },
            [toChecksumHexAddress(MOCK_LENDING_MARKET_WETH.underlying.address)]:
              { ...MOCK_RATE, price: 0.0000654123 },
            [toChecksumHexAddress(
              MOCK_LENDING_MARKET_USDT.outputToken.address,
            )]: { ...MOCK_RATE, price: 0.0000654123 },
            [toChecksumHexAddress(
              MOCK_LENDING_MARKET_USDC.outputToken.address,
            )]: { ...MOCK_RATE, price: 0.003654123 },
            [toChecksumHexAddress(
              MOCK_LENDING_MARKET_WETH.outputToken.address,
            )]: { ...MOCK_RATE, price: 0.00040123 },
          },
        },
      },
      KeyringController: {
        isUnlocked: true,
        keyrings: [],
      },
    },
  },
} as unknown as RootState;

describe('useEarnTokens', () => {
  const mockEthToken: TokenI = {
    ...createMockToken({
      address: '0x0000000000000000000000000000000000000000',
      chainId: CHAIN_IDS.MAINNET,
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
      balance: '0',
      balanceFiat: '0',
    }),
    isStaked: false,
  };

  const mockStakedEthToken: TokenI = {
    ...createMockToken({
      address: '0x0000000000000000000000000000000000000000',
      chainId: CHAIN_IDS.MAINNET,
      decimals: 18,
      name: 'Staked Ethereum',
      symbol: 'ETH',
      balance: '0',
      balanceFiat: '0',
    }),
    isStaked: true,
  };

  const mockUsdcToken: TokenI = {
    ...createMockToken({
      address: toChecksumHexAddress(
        MOCK_LENDING_MARKET_USDC.underlying.address,
      ),
      chainId: CHAIN_IDS.MAINNET,
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      balance: '0',
      balanceFiat: '0',
    }),
  };

  const mockAUsdcToken: TokenI = {
    ...createMockToken({
      address: toChecksumHexAddress(
        MOCK_LENDING_MARKET_USDC.outputToken.address,
      ),
      chainId: CHAIN_IDS.MAINNET,
      decimals: 6,
      name: 'aUSDC',
      symbol: 'aUSDC',
      balance: '0',
      balanceFiat: '0',
    }),
  };

  const mockUsdtToken: TokenI = {
    ...createMockToken({
      address: toChecksumHexAddress(
        MOCK_LENDING_MARKET_USDT.underlying.address,
      ),
      chainId: CHAIN_IDS.MAINNET,
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT',
      balance: '0',
      balanceFiat: '0',
    }),
  };

  const mockAUsdtToken: TokenI = {
    ...createMockToken({
      address: toChecksumHexAddress(
        MOCK_LENDING_MARKET_USDT.outputToken.address,
      ),
      chainId: CHAIN_IDS.MAINNET,
      decimals: 6,
      name: 'aUSDT',
      symbol: 'aUSDT',
    }),
  };

  const mockWethToken: TokenI = {
    ...createMockToken({
      address: toChecksumHexAddress(
        MOCK_LENDING_MARKET_WETH.underlying.address,
      ),
      chainId: CHAIN_IDS.MAINNET,
      decimals: 12,
      name: 'Wrapped Ether',
      symbol: 'WETH',
      balance: '0',
      balanceFiat: '0',
    }),
  };

  const mockAWethToken: TokenI = {
    ...createMockToken({
      address: toChecksumHexAddress(
        MOCK_LENDING_MARKET_WETH.outputToken.address,
      ),
      chainId: CHAIN_IDS.MAINNET,
      decimals: 12,
      name: 'aWrapped Ether',
      symbol: 'aWETH',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectPooledStakingEnabledFlag.mockReturnValue(true);
    mockSelectStablecoinLendingEnabledFlag.mockReturnValue(true);
  });

  describe('All Tokens', () => {
    it('returns all pooled-staking and lending tokens when all feature flags enabled and user is eligible', () => {
      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: mockState,
      });

      expect(result.current.getEarnToken(mockEthToken)).toBeDefined();
      expect(result.current.getEarnToken(mockStakedEthToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockEthToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockStakedEthToken)).toBeDefined();

      expect(result.current.getPairedEarnTokens(mockEthToken)).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockStakedEthToken),
      ).toBeDefined();

      expect(result.current.getEarnToken(mockUsdcToken)).toBeDefined();
      expect(result.current.getEarnToken(mockUsdtToken)).toBeDefined();
      expect(result.current.getEarnToken(mockWethToken)).toBeDefined();
      expect(result.current.getEarnToken(mockAUsdcToken)).toBeUndefined();
      expect(result.current.getEarnToken(mockAUsdtToken)).toBeUndefined();
      expect(result.current.getEarnToken(mockAWethToken)).toBeUndefined();

      expect(result.current.getOutputToken(mockUsdcToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockUsdtToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockWethToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockAUsdcToken)).toBeDefined();
      expect(result.current.getOutputToken(mockAUsdtToken)).toBeDefined();
      expect(result.current.getOutputToken(mockAWethToken)).toBeDefined();

      expect(result.current.getPairedEarnTokens(mockUsdcToken)).toBeDefined();
      expect(result.current.getPairedEarnTokens(mockUsdtToken)).toBeDefined();
      expect(result.current.getPairedEarnTokens(mockWethToken)).toBeDefined();
      expect(result.current.getPairedEarnTokens(mockAUsdcToken)).toBeDefined();
      expect(result.current.getPairedEarnTokens(mockAUsdtToken)).toBeDefined();
      expect(result.current.getPairedEarnTokens(mockAWethToken)).toBeDefined();
    });

    it('returns undefined for non eth earn tokens when pooled-staking and stablecoin lending are disabled', () => {
      mockSelectPooledStakingEnabledFlag.mockReturnValue(false);
      mockSelectStablecoinLendingEnabledFlag.mockReturnValue(false);

      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: mockState,
      });

      expect(result.current.getEarnToken(mockEthToken)).toBeDefined();
      expect(result.current.getEarnToken(mockStakedEthToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockEthToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockStakedEthToken)).toBeDefined();
      expect(result.current.getEarnToken(mockUsdcToken)).toBeUndefined();
      expect(result.current.getEarnToken(mockUsdtToken)).toBeUndefined();
      expect(result.current.getEarnToken(mockWethToken)).toBeUndefined();
      expect(result.current.getEarnToken(mockAUsdcToken)).toBeUndefined();
    });
  });

  describe('Pooled-Staking Tokens', () => {
    it('does not filter out pooled-staking tokens when pooled-staking feature flag is disabled', () => {
      mockSelectPooledStakingEnabledFlag.mockReturnValue(false);

      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: mockState,
      });

      expect(result.current.getEarnToken(mockEthToken)).toBeDefined();
      expect(result.current.getEarnToken(mockStakedEthToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockEthToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockStakedEthToken)).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockEthToken).earnToken,
      ).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockEthToken).outputToken,
      ).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockStakedEthToken).outputToken,
      ).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockStakedEthToken).earnToken,
      ).toBeDefined();
    });

    it("does not filter out pooled-staking tokens when user isn't eligible to pool-stake", () => {
      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: {
          ...mockState,
          engine: {
            ...mockState.engine,
            backgroundState: {
              ...mockState.engine.backgroundState,
              EarnController: {
                ...mockState.engine.backgroundState.EarnController,
                pooled_staking: {
                  ...mockState.engine.backgroundState.EarnController
                    .pooled_staking,
                  isEligible: false,
                },
              },
            },
          },
        },
      });

      expect(result.current.getEarnToken(mockEthToken)).toBeDefined();
      expect(result.current.getEarnToken(mockStakedEthToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockEthToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockStakedEthToken)).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockEthToken).earnToken,
      ).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockEthToken).outputToken,
      ).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockStakedEthToken).outputToken,
      ).toBeDefined();
      expect(
        result.current.getPairedEarnTokens(mockStakedEthToken).earnToken,
      ).toBeDefined();
    });
  });

  describe('Lending Tokens', () => {
    it('filters out lending tokens, but not lending output tokens when stablecoin lending feature flag is disabled', () => {
      mockSelectStablecoinLendingEnabledFlag.mockReturnValue(false);

      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: mockState,
      });

      expect(result.current.getEarnToken(mockUsdcToken)).toBeUndefined();
      expect(result.current.getEarnToken(mockUsdtToken)).toBeUndefined();
      expect(result.current.getEarnToken(mockWethToken)).toBeUndefined();
      expect(result.current.getOutputToken(mockAUsdcToken)).toBeDefined();
      expect(result.current.getOutputToken(mockAUsdtToken)).toBeDefined();
      expect(result.current.getOutputToken(mockAWethToken)).toBeDefined();

      expect(
        result.current.getPairedEarnTokens(mockUsdcToken).earnToken,
      ).toBeUndefined();
      expect(
        result.current.getPairedEarnTokens(mockUsdtToken).earnToken,
      ).toBeUndefined();
      expect(
        result.current.getPairedEarnTokens(mockWethToken).earnToken,
      ).toBeUndefined();
      expect(
        result.current.getPairedEarnTokens(mockAUsdcToken).earnToken,
      ).toBeUndefined();
      expect(
        result.current.getPairedEarnTokens(mockAUsdtToken).earnToken,
      ).toBeUndefined();
      expect(
        result.current.getPairedEarnTokens(mockAWethToken).earnToken,
      ).toBeUndefined();
    });

    it('returns no output tokens for lending tokens', () => {
      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: mockState,
      });

      const outputToken = result.current.getOutputToken(mockUsdcToken);
      expect(outputToken).toBeUndefined();
    });

    it('returns no lending tokens for output tokens', () => {
      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: mockState,
      });

      const earnToken = result.current.getEarnToken(mockAUsdcToken);
      expect(earnToken).toBeUndefined();
    });

    it('returns correct paired tokens for receipt tokens', () => {
      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: mockState,
      });

      const pairedTokens = result.current.getPairedEarnTokens(mockUsdcToken);
      expect(pairedTokens).toBeDefined();
      expect(pairedTokens.outputToken?.symbol).toBe('aUSDC');
      expect(pairedTokens.earnToken?.symbol).toBe('USDC');
    });

    it('returns correct paired tokens for lending tokens', () => {
      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: mockState,
      });

      const pairedTokens = result.current.getPairedEarnTokens(mockAUsdcToken);
      expect(pairedTokens).toBeDefined();
      expect(pairedTokens.outputToken?.symbol).toBe('aUSDC');
      expect(pairedTokens.earnToken?.symbol).toBe('USDC');
    });
  });
});
