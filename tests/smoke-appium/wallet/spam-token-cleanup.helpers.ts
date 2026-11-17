import type { AssetsControllerState } from '@metamask/assets-controller';
import { parseCaipAssetType } from '@metamask/utils';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import type { TokenHolding } from '../../framework/fixtures/mmpay-token-holdings-registry.js';
import {
  CUSTOM_ASSET,
  LEGITIMATE_ASSET,
  SPAM_ASSETS,
  TRACKED_ASSETS,
  type TrackedAsset,
} from '../../api-mocking/mock-responses/spam-token-cleanup-mocks.js';

export { CUSTOM_ASSET, LEGITIMATE_ASSET, SPAM_ASSETS };

export const ENABLED_NETWORKS = {
  eip155: {
    '0x1': true,
    '0x38': true,
    '0x89': true,
  },
};

/**
 * `assetsUnifyState` override that gates the unlock spam cleanup OFF.
 */
export const CLEANUP_DISABLED_OVERRIDE = {
  assetsUnifyState: {
    versions: {
      '8.3.0': {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '8.3.0',
        useUnlockCleanup: false,
      },
    },
  },
};

/** The cleanup fires off two Token API round trips after `KeyringController:unlock`. */
export const CLEANUP_TIMEOUT_MS = 30_000;

export function seedTrackedAssets(
  fixture: ReturnType<FixtureBuilder['build']>,
) {
  const backgroundState = fixture.state.engine.backgroundState;
  const accountId =
    backgroundState.AccountsController.internalAccounts.selectedAccount;
  const existing = (backgroundState.AssetsController ??
    {}) as Partial<AssetsControllerState>;
  const now = Date.now();

  const byAssetId = <Value>(map: (asset: TrackedAsset) => Value) =>
    Object.fromEntries(
      TRACKED_ASSETS.map((asset) => [asset.assetId, map(asset)]),
    );

  backgroundState.AssetsController = {
    ...existing,
    selectedCurrency: 'usd',
    assetsInfo: {
      ...existing.assetsInfo,
      ...byAssetId(({ name, symbol, decimals }) => ({
        type: 'erc20' as const,
        name,
        symbol,
        decimals,
      })),
    },
    assetsBalance: {
      ...existing.assetsBalance,
      [accountId]: {
        ...existing.assetsBalance?.[accountId],
        ...byAssetId(({ amount }) => ({ amount })),
      },
    },
    assetsPrice: {
      ...existing.assetsPrice,
      [LEGITIMATE_ASSET.assetId]: {
        assetPriceType: 'fungible' as const,
        price: 1,
        usdPrice: 1,
        lastUpdated: now,
      },
    },
    customAssets: {
      ...existing.customAssets,
      [accountId]: [
        ...new Set([
          ...(existing.customAssets?.[accountId] ?? []),
          CUSTOM_ASSET.assetId,
        ]),
      ],
    },
  };
}

export function buildFixture() {
  const fixture = new FixtureBuilder()
    .withPopularNetworks()
    .withNetworkEnabledMap(ENABLED_NETWORKS)
    .build();

  seedTrackedAssets(fixture);

  return fixture;
}

export function trackedAssetsToHoldings(
  assets: TrackedAsset[],
): TokenHolding[] {
  return assets.map(({ assetId, symbol, decimals, amount }) => {
    const { chain, assetReference } = parseCaipAssetType(assetId);
    return {
      symbol,
      address: assetReference,
      decimals,
      chainId: `0x${Number(chain.reference).toString(16)}`,
      isNative: false,
      usdValue: 1,
      amount,
    };
  });
}

/** Survivors after successful unlock cleanup (spam removed). */
export const SURVIVOR_HOLDINGS = trackedAssetsToHoldings([
  LEGITIMATE_ASSET,
  CUSTOM_ASSET,
]);

/** Full tracked set when cleanup does not remove spam. */
export const ALL_HOLDINGS = trackedAssetsToHoldings(TRACKED_ASSETS);
