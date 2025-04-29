import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  CreateMockTokenOptions,
  TOKENS_WITH_DEFAULT_OPTIONS,
} from './testUtils.types';
import { PooledStakingState } from '@metamask/earn-controller';
import {
  VaultData,
  VaultApyAverages,
  VaultDailyApy,
} from '@metamask/stake-sdk';
import {
  MOCK_POOLED_STAKES_DATA,
  MOCK_VAULT_DATA,
  MOCK_EXCHANGE_RATE,
} from '../__mocks__/earnControllerMockData';
import {
  MOCK_VAULT_APY_AVERAGES,
  MOCK_VAULT_DAILY_APYS,
} from '../components/PoolStakingLearnMoreModal/mockVaultRewards';

export const HOLESKY_CHAIN_ID = '0x4268';

export const createMockToken = (options: CreateMockTokenOptions) => {
  const {
    chainId,
    name,
    symbol,
    address = '0xaBc',
    decimals = 0,
    isStaked = false,
    ticker = '',
    balanceFiat = '',
  } = options;

  const isETH = symbol === 'ETH' || symbol === 'Ethereum';

  const nativeChainIds = [
    CHAIN_IDS.MAINNET,
    CHAIN_IDS.SEPOLIA,
    HOLESKY_CHAIN_ID,
  ];
  const isNative = nativeChainIds.includes(chainId) && isETH;

  return {
    address,
    aggregators: [],
    balance: '',
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
  isEligible = true,
  pooledStakes = MOCK_POOLED_STAKES_DATA,
  vaultMetadata = MOCK_VAULT_DATA,
  exchangeRate = MOCK_EXCHANGE_RATE,
  vaultApyAverages = MOCK_VAULT_APY_AVERAGES,
  vaultDailyApys = MOCK_VAULT_DAILY_APYS,
}: {
  isEligible?: boolean;
  pooledStakes?: PooledStakingState['pooledStakes'];
  vaultMetadata?: VaultData;
  exchangeRate?: string;
  vaultApyAverages?: VaultApyAverages;
  vaultDailyApys?: VaultDailyApy[];
} = {}) => ({
  engine: {
    backgroundState: {
      EarnController: {
        lastUpdated: 0,
        pooled_staking: {
          isEligible,
          pooledStakes,
          vaultMetadata,
          exchangeRate,
          vaultApyAverages,
          vaultDailyApys,
        },
        stablecoin_lending: {},
      },
    },
  },
});
