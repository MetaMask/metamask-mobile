import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { loginToApp, loginToAppPlaywright } from '../../flows/wallet.flow';
import { Mockttp } from 'mockttp';

export const PERPS_SMOKE_MARKET_SYMBOL = 'ETH';

/** ETH mark price from `PERPS_ARBITRUM_MOCKS` — keep in sync with `perps-arbitrum-mocks.ts`. */
export const PERPS_SMOKE_ETH_MARK_PRICE = 2500;

/** Pro inline limit price has no percent chips; mirror bottom-sheet math for E2E presets. */
export const computeProLimitPriceForPercentPreset = (
  percentage: number,
  markPrice = PERPS_SMOKE_ETH_MARK_PRICE,
): string => {
  const multiplier = 1 + percentage / 100;
  return (markPrice * multiplier).toFixed(2);
};

/** Pre-grant notifications so the post-order tooltip does not block navigation (Detox + Appium). */
export const PERPS_SMOKE_PERMISSIONS = { notifications: 'YES' as const };

export const buildPerpsSmokeFixture = () =>
  new FixtureBuilder()
    .withPerpsProfile('no-positions')
    .withPerpsFirstTimeUser(false)
    .withAccountTreeController()
    .withNetworkController({
      type: 'rpc',
      chainId: '0xa4b1',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      nickname: 'Arbitrum One',
      ticker: 'ETH',
    })
    .withTokensForAllPopularNetworks([
      {
        address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
        type: 'erc20',
      },
    ])
    .withPopularNetworks()
    .build();

const PERPS_PRO_MODE_FLAGS = {
  perpsProModeEnabled: {
    enabled: true,
    minimumVersion: '7.0.0',
  },
  perpsProTriggeredOrdersEnabled: {
    enabled: true,
    minimumVersion: '7.0.0',
  },
};

export const setupPerpsSmokeMocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, PERPS_PRO_MODE_FLAGS);
  await PERPS_ARBITRUM_MOCKS(mockServer);
  await mockPerpsGeolocation(mockServer, RampsRegions[RampsRegionsEnum.SPAIN]);
};

/** Detox smoke entry: login and disable sync for streaming Perps UI. */
export const beginPerpsSmokeTest = async () => {
  await loginToApp();
};

/** Appium smoke entry (Playwright + Appium runner). */
export const beginPerpsSmokeTestPlaywright = async () => {
  await loginToAppPlaywright({ scenarioType: 'e2e' });
};
