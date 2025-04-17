import {
  ChainId,
  StakingType,
  type PooledStakes,
  type VaultData,
} from '@metamask/stake-sdk';
import { TokenI } from '../../Tokens/types';
import { Contract } from 'ethers';
import { Stake } from '../sdk/stakeSdkProvider';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { createMockToken, getCreateMockTokenOptions } from '../testUtils';
import { TOKENS_WITH_DEFAULT_OPTIONS } from '../testUtils/testUtils.types';

export const MOCK_GET_POOLED_STAKES_API_RESPONSE: PooledStakes = {
  accounts: [
    {
      account: '0x0123456789abcdef0123456789abcdef01234567',
      lifetimeRewards: '43927049303048',
      assets: '5791332670714232000',
      exitRequests: [
        {
          // Unstaking
          positionTicket: '2153260738145148336740',
          timestamp: '1727110415000',
          totalShares: '989278156820374',
          withdrawalTimestamp: null,
          exitQueueIndex: '-1',
          claimedAssets: null,
          leftShares: null,
        },
        // Requests below are claimable.
        {
          positionTicket: '515964521392314631201',
          timestamp: '1720539311000',
          totalShares: '99473618267007',
          withdrawalTimestamp: '0',
          exitQueueIndex: '57',
          claimedAssets: '100006626507361',
          leftShares: '0',
        },
        {
          positionTicket: '515964620865932898208',
          timestamp: '1720541495000',
          totalShares: '99473618267007',
          withdrawalTimestamp: '0',
          exitQueueIndex: '57',
          claimedAssets: '100006626507361',
          leftShares: '0',
        },
        {
          positionTicket: '516604671289934191921',
          timestamp: '1720607327000',
          totalShares: '1929478758729790',
          withdrawalTimestamp: '0',
          exitQueueIndex: '58',
          claimedAssets: '1939870510970987',
          leftShares: '0',
        },
      ],
    },
  ],
  exchangeRate: '1.010906701603882254',
};

export const MOCK_GET_POOLED_STAKES_API_RESPONSE_HIGH_ASSETS_AMOUNT: PooledStakes =
  {
    accounts: [
      {
        account: '0x0111111111abcdef2222222222abcdef33333333',
        lifetimeRewards: '0',
        assets: '99999999990000000000000',
        exitRequests: [],
      },
    ],
    exchangeRate: '1.010906701603882254',
  };

export const MOCK_GET_VAULT_RESPONSE: VaultData = {
  apy: '2.853065141088762750393474836309926',
  capacity:
    '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456',
  feePercent: 1500,
  totalAssets: '7723070453364602130892',
  vaultAddress: '0x0a1b2c3d4e5f6a7b8c9dabecfd0123456789abcd',
};

const MOCK_POOLED_STAKING_CONTRACT_SERVICE = {
  chainId: ChainId.ETHEREUM,
  connectSignerOrProvider: jest.fn(),
  contract: new Contract('0x0000000000000000000000000000000000000000', []),
  convertToShares: jest.fn(),
  encodeClaimExitedAssetsTransactionData: jest.fn(),
  encodeDepositTransactionData: jest.fn(),
  encodeEnterExitQueueTransactionData: jest.fn(),
  encodeMulticallTransactionData: jest.fn(),
  estimateClaimExitedAssetsGas: jest.fn(),
  estimateDepositGas: jest.fn(),
  estimateEnterExitQueueGas: jest.fn(),
  estimateMulticallGas: jest.fn(),
  getShares: jest.fn(),
};

export const MOCK_POOL_STAKING_SDK: Stake = {
  stakingContract: MOCK_POOLED_STAKING_CONTRACT_SERVICE,
  sdkType: StakingType.POOLED,
  setSdkType: jest.fn(),
};

export const MOCK_ETH_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(CHAIN_IDS.MAINNET, TOKENS_WITH_DEFAULT_OPTIONS.ETH),
);

export const MOCK_STAKED_ETH_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(
    CHAIN_IDS.MAINNET,
    TOKENS_WITH_DEFAULT_OPTIONS.STAKED_ETH,
  ),
);

export const MOCK_USDC_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(
    CHAIN_IDS.MAINNET,
    TOKENS_WITH_DEFAULT_OPTIONS.USDC,
  ),
);

export const MOCK_USDT_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(
    CHAIN_IDS.MAINNET,
    TOKENS_WITH_DEFAULT_OPTIONS.USDT,
  ),
);

export const MOCK_DAI_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(CHAIN_IDS.MAINNET, TOKENS_WITH_DEFAULT_OPTIONS.DAI),
);

const MOCK_LINK_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(
    CHAIN_IDS.MAINNET,
    TOKENS_WITH_DEFAULT_OPTIONS.LINK,
  ),
);

const MOCK_MATIC_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(
    CHAIN_IDS.MAINNET,
    TOKENS_WITH_DEFAULT_OPTIONS.MATIC,
  ),
);

const MOCK_ETH_BASE_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(CHAIN_IDS.BASE, TOKENS_WITH_DEFAULT_OPTIONS.ETH),
);

export const MOCK_USDC_BASE_MAINNET_ASSET = createMockToken(
  getCreateMockTokenOptions(CHAIN_IDS.BASE, TOKENS_WITH_DEFAULT_OPTIONS.USDC),
);

export const MOCK_ACCOUNT_MULTI_CHAIN_TOKENS = [
  MOCK_ETH_MAINNET_ASSET,
  MOCK_STAKED_ETH_MAINNET_ASSET,
  MOCK_LINK_MAINNET_ASSET,
  MOCK_DAI_MAINNET_ASSET,
  MOCK_MATIC_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
  MOCK_USDT_MAINNET_ASSET,
] as unknown as TokenI[];

export const MOCK_SUPPORTED_EARN_TOKENS_NO_FIAT_BALANCE = [
  MOCK_ETH_MAINNET_ASSET,
  MOCK_DAI_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
  MOCK_USDT_MAINNET_ASSET,
] as unknown as TokenI[];

export const MOCK_SUPPORTED_EARN_TOKENS_WITH_FIAT_BALANCE = [
  {
    ...MOCK_ETH_MAINNET_ASSET,
    tokenBalanceFormatted: '0.29166 ETH',
  },
  { ...MOCK_DAI_MAINNET_ASSET, tokenBalanceFormatted: '108.06408 DAI' },
  {
    ...MOCK_USDC_MAINNET_ASSET,
    tokenBalanceFormatted: '6.84314 USDC',
  },
  {
    ...MOCK_USDT_MAINNET_ASSET,
    tokenBalanceFormatted: '0 USDT',
  },
  {
    ...MOCK_ETH_BASE_MAINNET_ASSET,
    tokenBalanceFormatted: '390.76791 ETH',
  },
  {
    ...MOCK_USDC_BASE_MAINNET_ASSET,
    tokenBalanceFormatted: '33.39041 USDC',
  },
];

export const MOCK_SELECT_POOLED_STAKING_VAULT_APY = {
  apyDecimal: 0.03257560263513173,
  apyPercentString: '3.3%',
};
