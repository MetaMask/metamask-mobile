import { EarnControllerState } from '@metamask/earn-controller';
import { EarnLaunchDarklyFlag } from '../selectors/featureFlags/types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { hexToDecimal } from '../../../../util/conversions';

const mockEnabledEarnLDFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
};

const mockedPooledStakingFeatureFlagState: Record<
  string,
  EarnLaunchDarklyFlag
> = {
  earnPooledStakingEnabled: mockEnabledEarnLDFlag,
  earnPooledStakingServiceInterruptionBannerEnabled: mockEnabledEarnLDFlag,
};

const mockedStablecoinLendingFeatureFlagState: Record<
  string,
  EarnLaunchDarklyFlag
> = {
  earnStablecoinLendingEnabled: mockEnabledEarnLDFlag,
  earnStablecoinLendingServiceInterruptionBannerEnabled: mockEnabledEarnLDFlag,
};

export const mockedEarnFeatureFlagsEnabledState = {
  ...mockedPooledStakingFeatureFlagState,
  ...mockedStablecoinLendingFeatureFlagState,
};

interface GetMockEarnControllerPooledStakingStateOptions {
  chainId: number;
  account: string;
  lifetimeRewards: string;
  assets: string;
  exitRequests: [];
  vaultAddress: string;
}

const getMockEarnControllerPooledStakingState = ({
  chainId = 1,
  account = '0xabc',
  lifetimeRewards = '0',
  assets = '0',
  exitRequests = [],
  vaultAddress = '0xdef',
}: Partial<GetMockEarnControllerPooledStakingStateOptions> = {}): EarnControllerState['pooled_staking'] => ({
  [chainId]: {
    pooledStakes: {
      account,
      lifetimeRewards,
      assets,
      exitRequests,
    },
    exchangeRate: '1.029357216804376409',
    vaultMetadata: {
      apy: '2.344449857296608053097345132743363',
      capacity:
        '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      feePercent: 1500,
      totalAssets: '33962131669935405025831',
      vaultAddress,
    },
    // Only include 7 records to keep things concise
    vaultDailyApys: [
      {
        id: 1385032,
        chain_id: 1,
        vault_address: vaultAddress,
        timestamp: '2025-05-28T00:00:00.000Z',
        daily_apy: '2.761684766061966040',
        created_at: '2025-05-29T01:00:01.647Z',
        updated_at: '2025-05-29T01:00:01.647Z',
      },
      {
        id: 1375197,
        chain_id: 1,
        vault_address: vaultAddress,
        timestamp: '2025-05-27T00:00:00.000Z',
        daily_apy: '2.254981325304014602',
        created_at: '2025-05-28T01:00:00.227Z',
        updated_at: '2025-05-28T01:00:00.227Z',
      },
      {
        id: 1365429,
        chain_id: 1,
        vault_address: vaultAddress,
        timestamp: '2025-05-26T00:00:00.000Z',
        daily_apy: '2.455358672817514712',
        created_at: '2025-05-27T01:00:00.247Z',
        updated_at: '2025-05-27T01:00:00.247Z',
      },
      {
        id: 1355725,
        chain_id: 1,
        vault_address: vaultAddress,
        timestamp: '2025-05-25T00:00:00.000Z',
        daily_apy: '2.171054355556651327',
        created_at: '2025-05-26T01:00:00.204Z',
        updated_at: '2025-05-26T01:00:00.204Z',
      },
      {
        id: 1346004,
        chain_id: 1,
        vault_address: vaultAddress,
        timestamp: '2025-05-24T00:00:00.000Z',
        daily_apy: '1.923545158765472788',
        created_at: '2025-05-25T01:00:00.223Z',
        updated_at: '2025-05-25T01:00:00.223Z',
      },
      {
        id: 1336268,
        chain_id: 1,
        vault_address: vaultAddress,
        timestamp: '2025-05-23T00:00:00.000Z',
        daily_apy: '2.616579553526408131',
        created_at: '2025-05-24T01:00:00.242Z',
        updated_at: '2025-05-24T01:00:00.242Z',
      },
      {
        id: 1326634,
        chain_id: 1,
        vault_address: vaultAddress,
        timestamp: '2025-05-22T00:00:00.000Z',
        daily_apy: '2.208794804288317035',
        created_at: '2025-05-23T01:00:00.363Z',
        updated_at: '2025-05-23T01:00:00.363Z',
      },
    ],
    vaultApyAverages: {
      oneDay: '2.761684766061966040',
      oneWeek: '2.34171409090290637643',
      oneMonth: '2.45892656053427902083',
      threeMonths: '2.750409127460324037',
      sixMonths: '2.64600417752746933531',
      oneYear: '2.59631005003668946572',
    },
  },
  isEligible: true,
});

interface GetMockEarnControllerLendingStateOptions {
  marketAddress: string;
  chainId: number;
  protocol: string;
  underlyingAddress: string;
}

const getMockEarnControllerLendingState = ({
  marketAddress = '0xefg',
  chainId = 1,
  protocol,
  underlyingAddress = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
}: Partial<GetMockEarnControllerLendingStateOptions> = {}): EarnControllerState['lending'] => ({
  markets: [
    {
      id: marketAddress,
      chainId,
      // @ts-expect-error LendingProtocol type not exported from EarnController currently.
      protocol,
      name: marketAddress,
      address: marketAddress,
      netSupplyRate: 3.832457323410055,
      totalSupplyRate: 3.832457323410055,
      rewards: [],
      tvlUnderlying: '80332088627683',
      underlying: {
        address: underlyingAddress,
        chainId,
      },
      outputToken: {
        address: marketAddress,
        chainId,
      },
    },
  ],
  positions: [],
  isEligible: true,
});

interface GetMockEarnControllerStateOptions {
  pooledStaking: GetMockEarnControllerPooledStakingStateOptions;
  lending: GetMockEarnControllerLendingStateOptions;
}

export const getMockEarnControllerState = ({
  pooledStaking,
  lending,
}: Partial<GetMockEarnControllerStateOptions> = {}) => ({
  pooled_staking: getMockEarnControllerPooledStakingState(pooledStaking),
  lending: getMockEarnControllerLendingState(lending),
  lastUpdated: 0,
});

interface GetMockPooledStakingTokenPairOptions {
  vaultAddress: string;
}

const getMockPooledStakingTokenPair = ({
  vaultAddress = '0xabc',
}: Partial<GetMockPooledStakingTokenPairOptions> = {}) => ({
  earnToken: {
    balance: '0.30235',
    stakedBalance: '0x01ca044b756fa87f',
    isStaked: false,
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    chainId: '0x1',
    isNative: true,
    aggregators: [],
    balanceFiat: '$802.68',
    image: '',
    logo: '../images/eth-logo-new.png',
    isETH: true,
    decimals: 18,
    symbol: 'Ethereum',
    ticker: 'ETH',
    balanceMinimalUnit: '302345206021065265',
    balanceFormatted: '0.30235 ETH',
    balanceFiatNumber: 802.68,
    tokenUsdExchangeRate: 2654.006436723641,
    experience: {
      type: 'POOLED_STAKING',
      apr: '2.3',
      estimatedAnnualRewardsFormatted: '$19.00',
      estimatedAnnualRewardsFiatNumber: 18.46164,
      vault: {
        apy: '2.344449857296608053097345132743363',
        capacity:
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        feePercent: 1500,
        totalAssets: '33962845608699712133594',
        vaultAddress,
      },
    },
    experiences: [
      {
        type: 'POOLED_STAKING',
        apr: '2.3',
        estimatedAnnualRewardsFormatted: '$19.00',
        estimatedAnnualRewardsFiatNumber: 18.46164,
        vault: {
          apy: '2.344449857296608053097345132743363',
          capacity:
            '115792089237316195423570985008687907853269984665640564039457584007913129639935',
          feePercent: 1500,
          totalAssets: '33962845608699712133594',
          vaultAddress: '0x4fef9d741011476750a243ac70b9789a63dd47df',
        },
      },
    ],
  },
  outputToken: {
    balance: '0.12892',
    stakedBalance: '0x01ca044b756fa87f',
    isStaked: true,
    name: 'Staked Ethereum',
    nativeAsset: {
      balance: '0.30235',
      stakedBalance: '0x01ca044b756fa87f',
      isStaked: false,
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      isNative: true,
      aggregators: [],
      balanceFiat: '$802.68',
      image: '',
      logo: '../images/eth-logo-new.png',
      isETH: true,
      decimals: 18,
      symbol: 'Ethereum',
      ticker: 'ETH',
    },
    chainId: '0x1',
    address: '0x0000000000000000000000000000000000000000',
    balanceFiat: '$342.26',
    isNative: true,
    aggregators: [],
    image: '',
    logo: '../images/eth-logo-new.png',
    isETH: true,
    decimals: 18,
    symbol: 'Ethereum',
    ticker: 'ETH',
    balanceMinimalUnit: '128920261472790655',
    balanceFormatted: '0.12892 ETH',
    balanceFiatNumber: 802.68,
    tokenUsdExchangeRate: 2654.006436723641,
    experience: {
      type: 'POOLED_STAKING',
      apr: '2.3',
      estimatedAnnualRewardsFormatted: '$19.00',
      estimatedAnnualRewardsFiatNumber: 18.46164,
      vault: {
        apy: '2.344449857296608053097345132743363',
        capacity:
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        feePercent: 1500,
        totalAssets: '33962845608699712133594',
        vaultAddress,
      },
    },
    experiences: [
      {
        type: 'POOLED_STAKING',
        apr: '2.3',
        estimatedAnnualRewardsFormatted: '$19.00',
        estimatedAnnualRewardsFiatNumber: 18.46164,
        vault: {
          apy: '2.344449857296608053097345132743363',
          capacity:
            '115792089237316195423570985008687907853269984665640564039457584007913129639935',
          feePercent: 1500,
          totalAssets: '33962845608699712133594',
          vaultAddress,
        },
      },
    ],
  },
});

interface GetMockStablecoinLendingTokenPairOptions {
  accountAddress: string;
  chainId: string;
  underlyingTokenAddress: string;
  outputTokenAddress: string;
  protocol: string;
}

const getMockStablecoinLendingTokenPair = ({
  accountAddress = '0xdef',
  chainId = '0x1',
  underlyingTokenAddress = '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  outputTokenAddress = '0x724dc807b04555b71ed48a6896b6f41593b8c637',
  protocol = 'aave',
}: Partial<GetMockStablecoinLendingTokenPairOptions> = {}) => ({
  earnToken: {
    address: underlyingTokenAddress,
    symbol: 'USDC',
    decimals: 6,
    image: `https://static.cx.metamask.io/api/v1/tokenIcons/${hexToDecimal(
      chainId,
    )}/${underlyingTokenAddress}.png`,
    aggregators: [
      'CoinGecko',
      'TraderJoe',
      'UniswapLabs',
      '1inch',
      'LiFi',
      'XSwap',
      'Socket',
      'Rubic',
      'Squid',
      'Rango',
      'Sonarwatch',
      'SushiSwap',
    ],
    name: 'USDC',
    token: 'USDC',
    chainId,
    isETH: false,
    isNative: false,
    balanceFiat: '$103.69',
    isStaked: false,
    balanceMinimalUnit: '103786045',
    balanceFormatted: '103.78605 USDC',
    balanceFiatNumber: 103.68688,
    tokenUsdExchangeRate: 0.9990444771786842,
    experience: {
      type: 'STABLECOIN_LENDING',
      apr: '4.0',
      estimatedAnnualRewardsFormatted: '$5.00',
      estimatedAnnualRewardsFiatNumber: 4.147826431784605,
      market: {
        id: outputTokenAddress,
        chainId: Number(chainId),
        protocol,
        name: outputTokenAddress,
        address: outputTokenAddress,
        netSupplyRate: 4.000338742746049,
        totalSupplyRate: 4.000338742746049,
        rewards: [],
        tvlUnderlying: '224292167592556',
        underlying: {
          address: underlyingTokenAddress,
          chainId: Number(chainId),
        },
        outputToken: {
          address: outputTokenAddress,
          chainId: Number(chainId),
        },
        position: {
          id: `${accountAddress}-${outputTokenAddress}-COLLATERAL-0`,
          chainId: Number(chainId),
          market: {
            id: outputTokenAddress,
            chainId: Number(chainId),
            protocol,
            name: outputTokenAddress,
            address: outputTokenAddress,
            netSupplyRate: 4.000338742746049,
            totalSupplyRate: 4.000338742746049,
            rewards: [],
            tvlUnderlying: '224292167592556',
            underlying: {
              address: underlyingTokenAddress,
              chainId: Number(chainId),
            },
            outputToken: {
              address: outputTokenAddress,
              chainId: Number(chainId),
            },
          },
          assets: '10351931',
          marketId: outputTokenAddress,
          marketAddress: outputTokenAddress,
          protocol,
        },
      },
    },
    experiences: [
      {
        type: 'STABLECOIN_LENDING',
        apr: '4.0',
        estimatedAnnualRewardsFormatted: '$5.00',
        estimatedAnnualRewardsFiatNumber: 4.147826431784605,
        market: {
          id: outputTokenAddress,
          chainId: Number(chainId),
          protocol,
          name: outputTokenAddress,
          address: outputTokenAddress,
          netSupplyRate: 4.000338742746049,
          totalSupplyRate: 4.000338742746049,
          rewards: [],
          tvlUnderlying: '224292167592556',
          underlying: {
            address: underlyingTokenAddress,
            chainId: Number(chainId),
          },
          outputToken: {
            address: outputTokenAddress,
            chainId: Number(chainId),
          },
          position: {
            id: `${accountAddress}-${outputTokenAddress}-COLLATERAL-0`,
            chainId: Number(chainId),
            market: {
              id: outputTokenAddress,
              chainId: Number(chainId),
              protocol,
              name: outputTokenAddress,
              address: outputTokenAddress,
              netSupplyRate: 4.000338742746049,
              totalSupplyRate: 4.000338742746049,
              rewards: [],
              tvlUnderlying: '224292167592556',
              underlying: {
                address: underlyingTokenAddress,
                chainId: Number(chainId),
              },
              outputToken: {
                address: outputTokenAddress,
                chainId: Number(chainId),
              },
            },
            assets: '10351931',
            marketId: outputTokenAddress,
            marketAddress: outputTokenAddress,
            protocol,
          },
        },
      },
    ],
  },
  outputToken: {
    address: outputTokenAddress,
    symbol: 'AUSDC',
    decimals: 6,
    image: `https://static.cx.metamask.io/api/v1/tokenIcons/${hexToDecimal(
      chainId,
    )}/${outputTokenAddress}.png`,
    aggregators: [
      'CoinGecko',
      'TraderJoe',
      'LiFi',
      'Rubic',
      'Rango',
      'Sonarwatch',
    ],
    name: 'Aave v3 USDC',
    token: 'Aave v3 USDC',
    chainId: '0xa4b1',
    isETH: false,
    isNative: false,
    balanceFiat: '$10.34',
    isStaked: false,
    balanceMinimalUnit: '10351932',
    balanceFormatted: '10.35193 AUSDC',
    balanceFiatNumber: 10.34203,
    tokenUsdExchangeRate: 0.9990444771786839,
    experience: {
      type: 'STABLECOIN_LENDING',
      apr: '4.000338742746049',
      estimatedAnnualRewardsFormatted: '$0.42',
      estimatedAnnualRewardsFiatNumber: 0.41371623287641923,
      market: {
        id: outputTokenAddress,
        chainId: 42161,
        protocol,
        name: outputTokenAddress,
        address: outputTokenAddress,
        netSupplyRate: 4.000338742746049,
        totalSupplyRate: 4.000338742746049,
        rewards: [],
        tvlUnderlying: '224292167592556',
        underlying: {
          address: underlyingTokenAddress,
          chainId: 42161,
        },
        outputToken: {
          address: outputTokenAddress,
          chainId: 42161,
        },
        position: {
          id: `${accountAddress}-${outputTokenAddress}-COLLATERAL-0`,
          chainId: 42161,
          market: {
            id: outputTokenAddress,
            chainId: 42161,
            protocol,
            name: outputTokenAddress,
            address: outputTokenAddress,
            netSupplyRate: 4.000338742746049,
            totalSupplyRate: 4.000338742746049,
            rewards: [],
            tvlUnderlying: '224292167592556',
            underlying: {
              address: underlyingTokenAddress,
              chainId: 42161,
            },
            outputToken: {
              address: outputTokenAddress,
              chainId: 42161,
            },
          },
          assets: '10351931',
          marketId: outputTokenAddress,
          marketAddress: outputTokenAddress,
          protocol,
        },
      },
    },
    experiences: [
      {
        type: 'STABLECOIN_LENDING',
        apr: '4.000338742746049',
        estimatedAnnualRewardsFormatted: '$0.42',
        estimatedAnnualRewardsFiatNumber: 0.41371623287641923,
        market: {
          id: outputTokenAddress,
          chainId: 42161,
          protocol,
          name: outputTokenAddress,
          address: outputTokenAddress,
          netSupplyRate: 4.000338742746049,
          totalSupplyRate: 4.000338742746049,
          rewards: [],
          tvlUnderlying: '224292167592556',
          underlying: {
            address: underlyingTokenAddress,
            chainId: 42161,
          },
          outputToken: {
            address: outputTokenAddress,
            chainId: 42161,
          },
          position: {
            id: `${accountAddress}-${outputTokenAddress}-COLLATERAL-0`,
            chainId: 42161,
            market: {
              id: outputTokenAddress,
              chainId: 42161,
              protocol,
              name: outputTokenAddress,
              address: outputTokenAddress,
              netSupplyRate: 4.000338742746049,
              totalSupplyRate: 4.000338742746049,
              rewards: [],
              tvlUnderlying: '224292167592556',
              underlying: {
                address: underlyingTokenAddress,
                chainId: 42161,
              },
              outputToken: {
                address: outputTokenAddress,
                chainId: 42161,
              },
            },
            assets: '10351931',
            marketId: outputTokenAddress,
            marketAddress: outputTokenAddress,
            protocol,
          },
        },
      },
    ],
  },
});

export const getMockUseEarnTokens = (tokenType: EARN_EXPERIENCES) => {
  if (tokenType === EARN_EXPERIENCES.POOLED_STAKING) {
    return getMockPooledStakingTokenPair();
  }
  return getMockStablecoinLendingTokenPair();
};
