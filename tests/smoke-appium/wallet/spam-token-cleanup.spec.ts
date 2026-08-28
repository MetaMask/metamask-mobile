import type { Mockttp } from 'mockttp';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  CUSTOM_ASSET,
  LEGITIMATE_ASSET,
  mockOccurrenceApis,
  SPAM_ASSETS,
  TRACKED_ASSETS,
  type TrackedAsset,
} from '../../api-mocking/mock-responses/spam-token-cleanup-mocks.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';

const ENABLED_NETWORKS = {
  eip155: {
    '0x1': true,
    '0x38': true,
    '0x89': true,
  },
};

/**
 * `assetsUnifyState` override that gates the unlock spam cleanup OFF. The
 * default mocks already enable it (see `base-flags.ts`), so only the off case
 * needs an explicit override. The package-side cleanup reads the *resolved*
 * flag (not the raw `versions` wrapper), so the override only needs the entry
 * the app version (8.10.x) resolves to.
 */
const CLEANUP_DISABLED_OVERRIDE = {
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

/**
 * The cleanup fires off two Token API round trips after `KeyringController:unlock`,
 * so give the rows time to disappear before failing.
 */
const CLEANUP_TIMEOUT_MS = 30_000;

/**
 * Writes the tracked assets straight into `AssetsController` — the slice the
 * cleanup reads and rewrites. `FixtureBuilder.withTokenHoldings` cannot be used
 * here because it registers every ERC-20 as a custom asset, and custom assets
 * are exempt from cleanup.
 *
 * @param fixture - The built fixture to mutate.
 */
function seedTrackedAssets(fixture: ReturnType<FixtureBuilder['build']>) {
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

function buildFixture() {
  const fixture = new FixtureBuilder()
    .withPopularNetworks()
    .withNetworkEnabledMap(ENABLED_NETWORKS)
    .build();

  seedTrackedAssets(fixture);

  return fixture;
}

appiumTest.describe(SmokeWalletPlatform('Spam token cleanup'), () => {
  appiumTest(
    'removes below-floor spam tokens from persisted state on unlock when the cleanup flag is on',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildFixture(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer: Mockttp) => {
            // Default mocks already enable useUnlockCleanup.
            await setupRemoteFeatureFlagsMock(mockServer, {});
            await mockOccurrenceApis(mockServer);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await WalletView.tapOnNewTokensSection();
          await TokensFullView.waitForVisible();

          for (const { symbol } of SPAM_ASSETS) {
            await NetworkManager.checkTokenDoesNotExist(symbol, {
              timeout: CLEANUP_TIMEOUT_MS,
            });
          }

          // The widely-listed token and the hand-imported one must survive, so
          // that an empty list cannot make the assertions above pass.
          await NetworkManager.checkTokenExists(LEGITIMATE_ASSET.symbol);
          await NetworkManager.checkTokenExists(CUSTOM_ASSET.symbol);
        },
      );
    },
  );

  appiumTest(
    'leaves persisted spam tokens untouched when the occurrence floor API fails',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildFixture(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer: Mockttp) => {
            // Default mocks already enable useUnlockCleanup.
            await setupRemoteFeatureFlagsMock(mockServer, {});
            await mockOccurrenceApis(mockServer, {
              failOccurrenceFloors: true,
            });
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await WalletView.tapOnNewTokensSection();
          await TokensFullView.waitForVisible();

          // Every spam row must still be held: a failed floor lookup must never
          // be read as "no floor", which would delete the whole set.
          for (const { symbol } of SPAM_ASSETS) {
            await NetworkManager.scrollToToken(symbol);
            await NetworkManager.checkTokenExists(symbol);
          }
        },
      );
    },
  );

  appiumTest(
    'leaves persisted spam tokens untouched when the cleanup flag is off',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildFixture(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              CLEANUP_DISABLED_OVERRIDE,
            );
            await mockOccurrenceApis(mockServer);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await WalletView.tapOnNewTokensSection();
          await TokensFullView.waitForVisible();

          // With useUnlockCleanup off the cleanup must not run, so even the
          // below-floor spam tokens survive unlock.
          for (const { symbol } of SPAM_ASSETS) {
            await NetworkManager.scrollToToken(symbol);
            await NetworkManager.checkTokenExists(symbol);
          }
        },
      );
    },
  );
});
