import FixtureBuilder, {
  type MusdFixtureOptions,
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../../framework/fixtures/FixtureBuilder.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils.js';
import { AnvilManager } from '../../../seeder/anvil-manager.js';
import { USDC_MAINNET, MUSD_MAINNET } from '../../../constants/musd-mainnet.js';
import type { Hex } from '@metamask/utils';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { merge } from 'lodash';

const USDC_DECIMALS = 6;
const MUSD_DECIMALS = 6;
const ETH_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAINNET_NATIVE_ASSET_ID = 'eip155:1/slip44:60';
const USDC_ASSET_ID = `eip155:1/erc20:${USDC_MAINNET}`;
const MUSD_ASSET_ID = `eip155:1/erc20:${MUSD_MAINNET}`;

/**
 * Minimal EVM bytecode that returns 10 000 USDC (10 000 000 000 raw) for any
 * call, including `balanceOf(address)`. Deployed at the USDC contract address
 * on Anvil to satisfy the TransactionPayController balance validation.
 */
const ERC20_STUB_BYTECODE =
  '0x7f00000000000000000000000000000000000000000000000000000002540be40060005260206000f3';

/**
 * Same flags as setupMusdMocks — seeded in fixture to avoid first-paint race
 * with the remote flag API mock (same pattern as lending-fixture).
 * Classic mUSD conversion keeps Money Hub off so confirm returns to wallet.
 */
const MUSD_REMOTE_FEATURE_FLAGS = {
  earnMoneyHubEnabled: { enabled: false, minimumVersion: '0.0.0' },
  earnMusdConversionFlowEnabled: { enabled: true, minimumVersion: '0.0.0' },
  earnMusdCtaEnabled: { enabled: true, minimumVersion: '0.0.0' },
  earnMusdConversionTokenListItemCtaEnabled: {
    enabled: true,
    minimumVersion: '0.0.0',
  },
  earnMusdConversionAssetOverviewCtaEnabled: {
    enabled: true,
    minimumVersion: '0.0.0',
  },
  earnMusdConversionCtaTokens: { '*': ['USDC'] },
  earnMusdConvertibleTokensAllowlist: { '*': ['USDC'] },
  earnMusdConversionMinAssetBalanceRequired: 0.01,
  earnMusdConversionGeoBlockedCountries: { blockedRegions: ['GB'] },
};

export type { MusdFixtureOptions };

/**
 * Builds a fixture for mUSD conversion E2E tests using FixtureBuilder:
 * Mainnet, ETH/USDC/mUSD tokens, rates, balances, and mUSD eligibility state.
 */
export async function createMusdFixture(
  node: AnvilManager,
  options: MusdFixtureOptions,
): Promise<ReturnType<FixtureBuilder['build']>> {
  const rpcPort = node?.getPort?.() ?? AnvilPort();

  if (node) {
    await seedErc20Stub(node, USDC_MAINNET);
    await node.setAccountBalance('10', DEFAULT_FIXTURE_ACCOUNT_CHECKSUM as Hex);
  }

  const usdcBalance = options.usdcBalance ?? 100;
  const musdBalance = options.musdBalance ?? 10;

  const baseTokens = [
    {
      address: toChecksumHexAddress(ETH_NATIVE_ADDRESS),
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum',
    },
    {
      address: toChecksumHexAddress(USDC_MAINNET),
      symbol: 'USDC',
      decimals: USDC_DECIMALS,
      name: 'USDCoin',
    },
    ...(options.hasMusdBalance
      ? [
          {
            address: toChecksumHexAddress(MUSD_MAINNET),
            symbol: 'MUSD',
            decimals: MUSD_DECIMALS,
            name: 'MUSD',
          },
        ]
      : []),
  ];

  const fixture = new FixtureBuilder()
    .withPopularNetworks()
    .withNetworkController({
      chainId: CHAIN_IDS.MAINNET,
      rpcUrl: `http://localhost:${rpcPort}`,
      type: 'custom',
      nickname: 'Ethereum Mainnet',
      ticker: 'ETH',
    })
    .withMetaMetricsOptIn()
    .withTokensForAllPopularNetworks(baseTokens)
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumHexAddress(ETH_NATIVE_ADDRESS),
      3000.0,
    )
    .withTokenRates(CHAIN_IDS.MAINNET, toChecksumHexAddress(USDC_MAINNET), 1.0)
    .withTokenRates(CHAIN_IDS.MAINNET, toChecksumHexAddress(MUSD_MAINNET), 1.0)
    .withMusdConversion(options)
    .build();

  const backgroundState = fixture.state.engine.backgroundState;

  // Seed feature flags directly so they're available on first render
  // (API mock has a race condition with the initial paint — same as lending-fixture)
  merge(backgroundState, {
    RemoteFeatureFlagController: {
      remoteFeatureFlags: MUSD_REMOTE_FEATURE_FLAGS,
    },
  });

  // Homepage / TokensFullView read AssetsController; seed balances for first paint
  const selectedAccountId =
    backgroundState.AccountsController.internalAccounts.selectedAccount;
  const existingAssetsController = (backgroundState.AssetsController ??
    {}) as Partial<AssetsControllerState>;
  const existingCustomAssets =
    existingAssetsController.customAssets?.[selectedAccountId] ?? [];
  const now = Date.now();

  backgroundState.AssetsController = {
    ...existingAssetsController,
    selectedCurrency: 'usd',
    assetsInfo: {
      ...existingAssetsController.assetsInfo,
      [MAINNET_NATIVE_ASSET_ID]: {
        type: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
      [USDC_ASSET_ID]: {
        type: 'erc20',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: USDC_DECIMALS,
      },
      ...(options.hasMusdBalance
        ? {
            [MUSD_ASSET_ID]: {
              type: 'erc20',
              symbol: 'MUSD',
              name: 'MUSD',
              decimals: MUSD_DECIMALS,
            },
          }
        : {}),
    },
    assetsBalance: {
      ...existingAssetsController.assetsBalance,
      [selectedAccountId]: {
        ...existingAssetsController.assetsBalance?.[selectedAccountId],
        [MAINNET_NATIVE_ASSET_ID]: { amount: '10' },
        ...(options.hasUsdcBalance !== false
          ? { [USDC_ASSET_ID]: { amount: String(usdcBalance) } }
          : {}),
        ...(options.hasMusdBalance
          ? { [MUSD_ASSET_ID]: { amount: String(musdBalance) } }
          : {}),
      },
    },
    assetsPrice: {
      ...existingAssetsController.assetsPrice,
      [MAINNET_NATIVE_ASSET_ID]: {
        assetPriceType: 'fungible' as const,
        price: 3000,
        usdPrice: 3000,
        lastUpdated: now,
      },
      [USDC_ASSET_ID]: {
        assetPriceType: 'fungible' as const,
        price: 1,
        usdPrice: 1,
        lastUpdated: now,
      },
      ...(options.hasMusdBalance
        ? {
            [MUSD_ASSET_ID]: {
              assetPriceType: 'fungible' as const,
              price: 1,
              usdPrice: 1,
              lastUpdated: now,
            },
          }
        : {}),
    },
    customAssets: {
      ...existingAssetsController.customAssets,
      [selectedAccountId]: [
        ...new Set([
          ...existingCustomAssets,
          USDC_ASSET_ID,
          ...(options.hasMusdBalance ? [MUSD_ASSET_ID] : []),
        ]),
      ],
    },
  };

  return fixture;
}

async function seedErc20Stub(
  node: AnvilManager,
  tokenAddress: string,
): Promise<void> {
  const { testClient } = node.getProvider();

  await testClient.setCode({
    address: tokenAddress as `0x${string}`,
    bytecode: ERC20_STUB_BYTECODE as `0x${string}`,
  });
}
