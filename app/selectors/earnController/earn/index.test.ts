import {
  AccountTrackerControllerState,
  CurrencyRateState,
  TokensControllerState,
} from '@metamask/assets-controllers';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { earnSelectors } from '.';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../components/UI/Earn/selectors/featureFlags';
import {
  MOCK_LENDING_MARKET_USDC,
  MOCK_LENDING_MARKET_USDT,
  MOCK_LENDING_MARKET_WETH,
} from '../../../components/UI/Stake/__mocks__/earnControllerMockData';
import { mockEarnControllerRootState } from '../../../components/UI/Stake/testUtils';
import { RootState } from '../../../reducers';
// eslint-disable-next-line import/no-namespace
import * as networks from '../../../util/networks';
import {
  internalAccount2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import {
  MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE,
  MOCK_NETWORK_CONTROLLER_STATE,
} from '../../../util/test/confirm-data-helpers';

jest.mock('../../../components/UI/Earn/selectors/featureFlags', () => ({
  __esModule: true,
  selectStablecoinLendingEnabledFlag: jest.fn().mockReturnValue(true),
  selectPooledStakingEnabledFlag: jest.fn().mockReturnValue(true),
  prioritizeFlagsByEnv: jest.fn().mockReturnValue(true),
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
    },
  },
} as unknown as RootState;

describe('Earn Controller Selectors', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(true);

    jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
  });

  describe('selectEarnTokens', () => {
    it('returns empty earn tokens data when no markets are present and pooled staking is disabled', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      (
        selectPooledStakingEnabledFlag as jest.MockedFunction<
          typeof selectPooledStakingEnabledFlag
        >
      ).mockReturnValue(false);
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(false);

      const mockStateWithNoTokens = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            EarnController: {
              ...mockState.engine.backgroundState.EarnController,
              lending: {
                markets: [],
                positions: [],
              },
            },
          },
        },
      };

      const result = earnSelectors.selectEarnTokens(
        mockStateWithNoTokens as unknown as RootState,
      );

      expect(result).toEqual({
        earnTokens: [],
        earnOutputTokens: [],
        earnTokensByChainIdAndAddress: {},
        earnOutputTokensByChainIdAndAddress: {},
        earnTokenPairsByChainIdAndAddress: {},
        earnOutputTokenPairsByChainIdAndAddress: {},
        earnableTotalFiatNumber: 0,
        earnableTotalFiatFormatted: '$0',
      });
    });

    it('returns pooled staking and lending earn tokens when earn and staking are enabled', () => {
      // Override for this test
      (
        selectPooledStakingEnabledFlag as jest.MockedFunction<
          typeof selectPooledStakingEnabledFlag
        >
      ).mockReturnValue(true);
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const result = earnSelectors.selectEarnTokens(
        mockState as unknown as RootState,
      );

      expect(result.earnTokens).toBeDefined();
      expect(result.earnTokens.length).toEqual(4);
      expect(result.earnOutputTokens).toBeDefined();
      expect(result.earnOutputTokens.length).toEqual(4);
      expect(result.earnTokens[0].isStaked).toEqual(false);
      expect(result.earnOutputTokens[0].isStaked).toEqual(true);

      for (const token of [...result.earnOutputTokens, ...result.earnTokens]) {
        expect(token).toEqual(
          expect.objectContaining({
            address: expect.any(String),
            name: expect.any(String),
            symbol: expect.any(String),
            decimals: expect.any(Number),
            chainId: expect.any(String),
            isETH: expect.any(Boolean),
            isNative: expect.any(Boolean),
            balanceFiat: expect.any(String),
            isStaked: expect.any(Boolean),
            balanceMinimalUnit: expect.any(String),
            balanceFormatted: expect.any(String),
            balanceFiatNumber: expect.any(Number),
            tokenUsdExchangeRate: expect.any(Number),
            experience: expect.any(Object),
            experiences: expect.any(Array),
          }),
        );
        expect(token.experience).toEqual(
          expect.objectContaining({
            type: expect.any(String),
            apr: expect.any(String),
            estimatedAnnualRewardsFormatted: expect.any(String),
            estimatedAnnualRewardsFiatNumber: expect.any(Number),
            estimatedAnnualRewardsTokenMinimalUnit: expect.any(String),
            estimatedAnnualRewardsTokenFormatted: expect.any(String),
          }),
        );
      }
    });

    it('sorts tokens by balance, placing zero balance tokens at the end', () => {
      jest.spyOn(networks, 'isPortfolioViewEnabled').mockReturnValue(true);
      (
        selectPooledStakingEnabledFlag as jest.MockedFunction<
          typeof selectPooledStakingEnabledFlag
        >
      ).mockReturnValue(true);
      (
        selectStablecoinLendingEnabledFlag as jest.MockedFunction<
          typeof selectStablecoinLendingEnabledFlag
        >
      ).mockReturnValue(true);

      const result = earnSelectors.selectEarnTokens(
        mockState as unknown as RootState,
      );

      expect(result.earnTokens.length).toBe(4);
      const nonZeroBalances = result.earnTokens.filter((token) =>
        BigNumber(token.balanceMinimalUnit).gt(0),
      );
      const zeroBalances = result.earnTokens.filter((token) =>
        BigNumber(token.balanceMinimalUnit).eq(0),
      );

      // Check that all non-zero balances come before zero balances
      expect(nonZeroBalances.length + zeroBalances.length).toBe(
        result.earnTokens.length,
      );
      expect(result.earnTokens.slice(0, nonZeroBalances.length)).toEqual(
        nonZeroBalances,
      );
      expect(result.earnTokens.slice(nonZeroBalances.length)).toEqual(
        zeroBalances,
      );
    });
  });
});
