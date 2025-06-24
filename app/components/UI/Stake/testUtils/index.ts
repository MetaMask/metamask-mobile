import {
  EarnControllerState,
  LendingMarketWithPosition,
} from '@metamask/earn-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  MOCK_EXCHANGE_RATE,
  MOCK_LENDING_MARKETS,
  MOCK_LENDING_POSITIONS,
  MOCK_POOLED_STAKES_DATA,
  MOCK_VAULT_DATA,
} from '../__mocks__/earnControllerMockData';
import {
  MOCK_VAULT_APY_AVERAGES,
  MOCK_VAULT_DAILY_APYS,
} from '../components/PoolStakingLearnMoreModal/mockVaultRewards';
import {
  CreateMockTokenOptions,
  TOKENS_WITH_DEFAULT_OPTIONS,
} from './testUtils.types';
import { EarnTokenDetails } from '../../Earn/types/lending.types';
import { EARN_EXPERIENCES } from '../../Earn/constants/experiences';
import { VaultData } from '@metamask/stake-sdk';

export const HOODI_CHAIN_ID = '0x88BB0'; // Chain id 560048

export const createMockToken = (options: CreateMockTokenOptions) => {
  const {
    chainId,
    name,
    symbol,
    address = '0xaBc',
    decimals = 0,
    isStaked = false,
    ticker = '',
    balance = '',
    balanceFiat = '',
  } = options;

  const isETH = symbol === 'ETH' || symbol === 'Ethereum';

  const nativeChainIds = [CHAIN_IDS.MAINNET, CHAIN_IDS.SEPOLIA, HOODI_CHAIN_ID];
  const isNative = nativeChainIds.includes(chainId) && isETH;

  return {
    address,
    aggregators: [],
    balance,
    balanceFiat,
    chainId,
    decimals: decimals ?? 0,
    image: '',
    isETH,
    isNative,
    isStaked,
    logo: '',
    name,
    symbol,
    ticker: ticker ?? symbol,
  };
};

export const getCreateMockTokenOptions = (
  chainId: (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS],
  token: TOKENS_WITH_DEFAULT_OPTIONS,
) => {
  const tokenOptions: Record<
    TOKENS_WITH_DEFAULT_OPTIONS,
    Omit<CreateMockTokenOptions, 'chainId'>
  > = {
    ETH: {
      name: 'Ethereum',
      symbol: 'Ethereum',
      ticker: 'ETH',
      isStaked: false,
      decimals: 18,
    },
    STAKED_ETH: {
      name: 'Staked Ethereum',
      symbol: 'Ethereum',
      ticker: 'ETH',
      isStaked: true,
      decimals: 18,
    },
    USDC: {
      name: 'USDC',
      symbol: 'USDC',
      ticker: 'USDC',
      isStaked: false,
      decimals: 6,
    },
    USDT: {
      name: 'Tether USD',
      symbol: 'USDT',
      ticker: 'USDT',
      isStaked: false,
      decimals: 6,
    },
    DAI: {
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      ticker: 'DAI',
      isStaked: false,
      decimals: 18,
    },
    LINK: {
      name: 'Chainlink Token',
      symbol: 'LINK',
      ticker: 'LINK',
      isStaked: false,
      decimals: 18,
    },
    MATIC: {
      name: 'Matic Network Token',
      symbol: 'MATIC',
      ticker: 'MATIC',
      isStaked: false,
      decimals: 18,
    },
  };

  return {
    chainId,
    ...tokenOptions[token],
  };
};

export const mockEarnControllerRootState = ({
  chainId = 1,
  isEligible = true,
  pooledStakes = MOCK_POOLED_STAKES_DATA,
  vaultMetadata = MOCK_VAULT_DATA,
  exchangeRate = MOCK_EXCHANGE_RATE,
  vaultApyAverages = MOCK_VAULT_APY_AVERAGES,
  vaultDailyApys = MOCK_VAULT_DAILY_APYS,
  markets = MOCK_LENDING_MARKETS,
  positions = MOCK_LENDING_POSITIONS,
}: {
  chainId?: number;
  isEligible?: boolean;
  pooledStakes?: EarnControllerState['pooled_staking'][0]['pooledStakes'];
  vaultMetadata?: EarnControllerState['pooled_staking'][0]['vaultMetadata'];
  exchangeRate?: EarnControllerState['pooled_staking'][0]['exchangeRate'];
  vaultApyAverages?: EarnControllerState['pooled_staking'][0]['vaultApyAverages'];
  vaultDailyApys?: EarnControllerState['pooled_staking'][0]['vaultDailyApys'];
  markets?: EarnControllerState['lending']['markets'];
  positions?: EarnControllerState['lending']['positions'];
} = {}) => ({
  engine: {
    backgroundState: {
      EarnController: {
        lastUpdated: 0,
        pooled_staking: {
          isEligible,
          [chainId]: {
            pooledStakes,
            vaultMetadata,
            exchangeRate,
            vaultApyAverages,
            vaultDailyApys,
          },
        },
        lending: {
          isEligible,
          markets,
          positions,
        },
      },
    },
  },
});

type CreateMockEarnTokenOptions = CreateMockTokenOptions &
  Partial<
    Pick<
      EarnTokenDetails,
      | 'balanceFormatted'
      | 'balanceMinimalUnit'
      | 'balanceFiat'
      | 'balanceFiatNumber'
      | 'tokenUsdExchangeRate'
      | 'experiences'
      | 'experience'
    >
  >;

/**
 * Creates a mock EarnTokenDetails object for testing.
 */
export const createMockEarnToken = (
  options: CreateMockEarnTokenOptions,
): EarnTokenDetails => {
  const {
    balanceFormatted = '0.0',
    balanceMinimalUnit = '0',
    balanceFiat = '0',
    balanceFiatNumber = 0,
    tokenUsdExchangeRate = 1,
    experiences,
    experience,
    ...tokenOptions
  } = options;

  const baseToken = createMockToken(tokenOptions);

  // Provide a default experience if not supplied
  const defaultExperience = {
    type:
      tokenOptions.name === 'Ethereum' ||
      tokenOptions.name === 'Staked Ethereum'
        ? EARN_EXPERIENCES.POOLED_STAKING
        : EARN_EXPERIENCES.STABLECOIN_LENDING,
    apr: '5.00',
    estimatedAnnualRewardsFormatted: '0.00',
    estimatedAnnualRewardsFiatNumber: 0,
    estimatedAnnualRewardsTokenMinimalUnit: '0',
    estimatedAnnualRewardsTokenFormatted: '0.00',
    market: undefined as LendingMarketWithPosition | undefined,
    vault: undefined as VaultData | undefined,
  };

  const experiencesArr = experiences ?? [defaultExperience];

  return {
    ...baseToken,
    balanceFormatted,
    balanceMinimalUnit,
    balanceFiat,
    balanceFiatNumber,
    tokenUsdExchangeRate,
    experiences: experiencesArr,
    experience: experience ?? experiencesArr[0],
  };
};
