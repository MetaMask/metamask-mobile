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
import { MOCK_ETH_MAINNET_ASSET } from '../../../components/UI/Stake/__mocks__/stakeMockData';
import { mockEarnControllerRootState } from '../../../components/UI/Stake/testUtils';
import { TokenI } from '../../../components/UI/Tokens/types';
import { RootState } from '../../../reducers';
import { EARN_EXPERIENCES } from '../../../components/UI/Earn/constants/experiences';
import { EarnTokenDetails } from '../../../components/UI/Earn/types/lending.types';
import {
  internalAccount2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import {
  MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE,
  MOCK_NETWORK_CONTROLLER_STATE,
} from '../../../util/test/confirm-data-helpers';

import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { getVersion } from 'react-native-device-info';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

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
                chainId: CHAIN_IDS.MAINNET,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDC.underlying.address,
                ),
                name: 'USDC Token',
                symbol: 'USDC',
                decimals: 6,
                chainId: CHAIN_IDS.MAINNET,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_WETH.underlying.address,
                ),
                name: 'WETH Token',
                symbol: 'WETH',
                decimals: 12,
                chainId: CHAIN_IDS.MAINNET,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDT.outputToken.address,
                ),
                name: 'aUSDT Token',
                symbol: 'aUSDT',
                decimals: 6,
                chainId: CHAIN_IDS.MAINNET,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDC.outputToken.address,
                ),
                name: 'aUSDC Token',
                symbol: 'aUSDC',
                decimals: 6,
                chainId: CHAIN_IDS.MAINNET,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_WETH.outputToken.address,
                ),
                name: 'aWETH Token',
                symbol: 'aWETH',
                decimals: 12,
                chainId: CHAIN_IDS.MAINNET,
              },
            ] as TokenI[],
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

describe('Earn Controller Selectors', () => {
  beforeEach(() => {
    jest.resetAllMocks();

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
  });

  describe('selectEarnTokens', () => {
    it('returns pooled staking earn tokens data when no markets are present and pooled staking is disabled', () => {
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

      expect(result.earnTokens.length).toEqual(1);
      expect(result.earnTokens[0].isETH).toEqual(true);
      expect(result.earnTokens[0].isStaked).toEqual(false);
      expect(result.earnTokens[0].experience).toEqual({
        type: EARN_EXPERIENCES.POOLED_STAKING,
        apr: expect.any(String),
        estimatedAnnualRewardsFormatted: expect.any(String),
        estimatedAnnualRewardsFiatNumber: expect.any(Number),
        estimatedAnnualRewardsTokenMinimalUnit: expect.any(String),
        estimatedAnnualRewardsTokenFormatted: expect.any(String),
        vault: expect.any(Object),
      });
      expect(result.earnOutputTokens.length).toEqual(1);
      expect(result.earnOutputTokens[0].isETH).toEqual(true);
      expect(result.earnOutputTokens[0].isStaked).toEqual(true);
      expect(result.earnOutputTokens[0].experience).toEqual({
        type: EARN_EXPERIENCES.POOLED_STAKING,
        apr: expect.any(String),
        estimatedAnnualRewardsFormatted: expect.any(String),
        estimatedAnnualRewardsFiatNumber: expect.any(Number),
        estimatedAnnualRewardsTokenMinimalUnit: expect.any(String),
        estimatedAnnualRewardsTokenFormatted: expect.any(String),
        vault: expect.any(Object),
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

  describe('selectEarnToken', () => {
    it('returns undefined when asset is not provided', () => {
      const result = earnSelectors.selectEarnToken(
        mockState as unknown as RootState,
        undefined as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when asset chainId is not provided', () => {
      const result = earnSelectors.selectEarnToken(
        mockState as unknown as RootState,
        { address: '0x123' } as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when asset address is not provided', () => {
      const result = earnSelectors.selectEarnToken(
        mockState as unknown as RootState,
        { chainId: '0x1' } as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when ETH token staked status does not match', () => {
      const result = earnSelectors.selectEarnToken(
        mockState as unknown as RootState,
        {
          ...MOCK_ETH_MAINNET_ASSET,
          address: '0x0000000000000000000000000000000000000000',
          isStaked: true,
        } as TokenI,
      );
      expect(result).toBeUndefined();
    });

    it('returns earn token when valid asset is provided', () => {
      // USDT underlying token (index 0)
      const token =
        mockState.engine.backgroundState.TokensController.allTokens['0x1'][
          internalAccount2.address
        ][0];

      const result = earnSelectors.selectEarnToken(
        mockState as unknown as RootState,
        token as TokenI,
      );

      expect(result).toBeDefined();
      expect(result?.address.toLowerCase()).toBe(
        MOCK_LENDING_MARKET_USDT.underlying.address.toLowerCase(),
      );
    });
  });

  describe('selectEarnOutputToken', () => {
    it('returns undefined when asset is not provided', () => {
      const result = earnSelectors.selectEarnOutputToken(
        mockState as unknown as RootState,
        undefined as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when asset chainId is not provided', () => {
      const result = earnSelectors.selectEarnOutputToken(
        mockState as unknown as RootState,
        { address: '0x123' } as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when asset address is not provided', () => {
      const result = earnSelectors.selectEarnOutputToken(
        mockState as unknown as RootState,
        { chainId: '0x1' } as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when ETH token staked status does not match', () => {
      const result = earnSelectors.selectEarnOutputToken(
        mockState as unknown as RootState,
        {
          ...MOCK_ETH_MAINNET_ASSET,
          address: '0x0000000000000000000000000000000000000000',
          isStaked: false,
        } as TokenI,
      );
      expect(result).toBeUndefined();
    });

    it('returns earn output token when valid asset is provided', () => {
      // aUSDT underlying token (index 3)
      const token =
        mockState.engine.backgroundState.TokensController.allTokens['0x1'][
          internalAccount2.address
        ][3];
      const result = earnSelectors.selectEarnOutputToken(
        mockState as unknown as RootState,
        token as TokenI,
      );
      expect(result).toBeDefined();
      expect(result?.address.toLowerCase()).toBe(
        MOCK_LENDING_MARKET_USDT.outputToken.address.toLowerCase(),
      );
    });
  });

  describe('selectPairedEarnToken', () => {
    it('returns undefined when asset is not provided', () => {
      const result = earnSelectors.selectPairedEarnToken(
        mockState as unknown as RootState,
        undefined as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when asset chainId is not provided', () => {
      const result = earnSelectors.selectPairedEarnToken(
        mockState as unknown as RootState,
        { address: '0x123' } as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when asset address is not provided', () => {
      const result = earnSelectors.selectPairedEarnToken(
        mockState as unknown as RootState,
        { chainId: '0x1' } as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when ETH token staked status matches', () => {
      const result = earnSelectors.selectPairedEarnToken(
        mockState as unknown as RootState,
        {
          ...MOCK_ETH_MAINNET_ASSET,
          address: '0x0000000000000000000000000000000000000000',
          isStaked: false,
        } as TokenI,
      );
      expect(result).toBeUndefined();
    });

    it('returns paired earn token when valid output token is provided', () => {
      // USDT output token (index 3)
      const outputToken =
        mockState.engine.backgroundState.TokensController.allTokens['0x1'][
          internalAccount2.address
        ][3];
      const result = earnSelectors.selectPairedEarnToken(
        mockState as unknown as RootState,
        outputToken as TokenI,
      );
      expect(result).toBeDefined();
      expect(result?.address.toLowerCase()).toBe(
        MOCK_LENDING_MARKET_USDT.underlying.address.toLowerCase(),
      );
    });
  });

  describe('selectPairedEarnOutputToken', () => {
    it('returns undefined when asset is not provided', () => {
      const result = earnSelectors.selectPairedEarnOutputToken(
        mockState as unknown as RootState,
        undefined as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when asset chainId is not provided', () => {
      const result = earnSelectors.selectPairedEarnOutputToken(
        mockState as unknown as RootState,
        { address: '0x123' } as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when asset address is not provided', () => {
      const result = earnSelectors.selectPairedEarnOutputToken(
        mockState as unknown as RootState,
        { chainId: '0x1' } as unknown as EarnTokenDetails,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when ETH token staked status matches', () => {
      const result = earnSelectors.selectPairedEarnOutputToken(
        mockState as unknown as RootState,
        {
          ...MOCK_ETH_MAINNET_ASSET,
          address: '0x0000000000000000000000000000000000000000',
          isStaked: true,
        } as TokenI,
      );
      expect(result).toBeUndefined();
    });

    it('returns paired earn output token when valid token is provided', () => {
      // USDT underlying token (index 0)
      const token =
        mockState.engine.backgroundState.TokensController.allTokens['0x1'][
          internalAccount2.address
        ][0];
      const result = earnSelectors.selectPairedEarnOutputToken(
        mockState as unknown as RootState,
        token as TokenI,
      );
      expect(result).toBeDefined();
      expect(result?.address.toLowerCase()).toBe(
        MOCK_LENDING_MARKET_USDT.outputToken.address.toLowerCase(),
      );
    });
  });

  describe('selectEarnTokenPair', () => {
    it('returns undefined earn token and output token when no valid tokens are provided', () => {
      const result = earnSelectors.selectEarnTokenPair(
        mockState as unknown as RootState,
        {
          chainId: '0x1',
          address: '0x234245346536',
          isETH: false,
          isStaked: false,
        } as unknown as EarnTokenDetails,
      );
      expect(result.earnToken).toBeUndefined();
      expect(result.outputToken).toBeUndefined();
    });

    it('returns earn token and paired output token when valid earn token is provided', () => {
      // USDT underlying token (index 0)
      const token =
        mockState.engine.backgroundState.TokensController.allTokens['0x1'][
          internalAccount2.address
        ][0];
      const result = earnSelectors.selectEarnTokenPair(
        mockState as unknown as RootState,
        token as TokenI,
      );
      expect(result.earnToken).toBeDefined();
      expect(result.outputToken).toBeDefined();
      expect(result.earnToken?.address.toLowerCase()).toBe(
        MOCK_LENDING_MARKET_USDT.underlying.address.toLowerCase(),
      );
      expect(result.outputToken?.address.toLowerCase()).toBe(
        MOCK_LENDING_MARKET_USDT.outputToken.address.toLowerCase(),
      );
    });

    it('returns paired earn token and output token when valid output token is provided', () => {
      // USDT output token (index 3)
      const outputToken =
        mockState.engine.backgroundState.TokensController.allTokens['0x1'][
          internalAccount2.address
        ][3];
      const result = earnSelectors.selectEarnTokenPair(
        mockState as unknown as RootState,
        outputToken as TokenI,
      );
      expect(result.earnToken).toBeDefined();
      expect(result.outputToken).toBeDefined();
      expect(result.earnToken?.address.toLowerCase()).toBe(
        MOCK_LENDING_MARKET_USDT.underlying.address.toLowerCase(),
      );
      expect(result.outputToken?.address.toLowerCase()).toBe(
        MOCK_LENDING_MARKET_USDT.outputToken.address.toLowerCase(),
      );
    });
  });

  describe('selectPrimaryEarnExperienceTypeForAsset', () => {
    let mockHasMinimumRequiredVersion: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      mockHasMinimumRequiredVersion = jest.spyOn(
        remoteFeatureFlagModule,
        'hasMinimumRequiredVersion',
      );
      mockHasMinimumRequiredVersion.mockReturnValue(true);
      (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
        '1.0.0',
      );
    });

    afterEach(() => {
      mockHasMinimumRequiredVersion?.mockRestore();
    });

    const createBaseState = (remoteFlags: Record<string, unknown>) => ({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: remoteFlags,
            cacheTimestamp: 0,
          },
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: '',
            },
          },
          AccountTreeController: {
            accountTree: {
              wallets: {},
              selectedAccountGroup: null,
            },
          },
          MultichainNetworkController: {
            isEvmSelected: true,
            selectedMultichainNetworkChainId: 'eip155:1',
            multichainNetworkConfigurationsByChainId: {},
            networksWithTransactionActivity: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {},
          },
          EarnController: {
            pooled_staking: {
              isEligible: false,
            },
          },
          TokenBalancesController: {
            tokenBalances: {},
          },
          TokenRatesController: {
            marketData: {},
          },
          AccountTrackerController: {
            accountsByChainId: {},
          },
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurationsByChainId: {},
            networksMetadata: {},
          },
          KeyringController: {
            isUnlocked: true,
            keyrings: [],
          },
        },
      },
      settings: {
        showFiatOnTestnets: false,
      },
    });

    const tronNativeAsset = {
      address: 'TTrxNative',
      chainId: 'tron:0x2b6653dc',
      ticker: 'TRX',
      symbol: 'TRX',
      isNative: true,
      isETH: false,
      isStaked: false,
      decimals: 6,
      balance: '0',
    } as const;

    it('returns pooled staking for TRX when metadata is missing and flag is enabled', () => {
      const state = createBaseState({
        trxStakingEnabled: { enabled: true, minimumVersion: '1.0.0' },
      });

      const result = earnSelectors.selectPrimaryEarnExperienceTypeForAsset(
        state as unknown as RootState,
        tronNativeAsset as unknown as TokenI,
      );

      expect(result).toBe(EARN_EXPERIENCES.POOLED_STAKING);
    });

    it('returns undefined for TRX when flag is disabled', () => {
      const state = createBaseState({
        trxStakingEnabled: { enabled: false, minimumVersion: '0.0.0' },
      });

      const result = earnSelectors.selectPrimaryEarnExperienceTypeForAsset(
        state as unknown as RootState,
        tronNativeAsset as unknown as TokenI,
      );

      expect(result).toBeUndefined();
    });
  });
});
