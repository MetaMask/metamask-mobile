'use strict';
import { Mockttp } from 'mockttp';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import Ganache from '../../../app/util/test/ganache';
import { localNodeOptions } from './helpers/constants';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper.js';
import TestHelpers from '../../helpers.js';
import FixtureServer from '../../fixtures/fixture-server.js';
import {
  getFixturesServerPort,
  getMockServerPort,
} from '../../fixtures/utils.js';
import { SmokeTrade } from '../../tags.js';
import Assertions from '../../utils/Assertions.js';
import { stopMockServer } from '../../api-mocking/mock-server.js';
import { startMockServer } from './helpers/swap-mocks';

const fixtureServer: FixtureServer = new FixtureServer();

describe(SmokeTrade('Unified UI Wallet Actions'), (): void => {
  let mockServer: Mockttp;
  let localNode: Ganache;

  beforeAll(async (): Promise<void> => {
    localNode = new Ganache();
    await localNode.start(localNodeOptions);

    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer({}, mockServerPort);

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withGanacheNetwork('0x1')
      .withMetaMetricsOptIn()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
  });

  afterAll(async (): Promise<void> => {
    await stopFixtureServer(fixtureServer);
    if (mockServer) await stopMockServer(mockServer);
    if (localNode) await localNode.quit();
  });

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(120000);
  });

  it('should hide bridge button when unified UI is enabled', async (): Promise<void> => {
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        mockServerPort: `${getMockServerPort()}`,
        MM_UNIFIED_SWAPS_ENABLED: 'true',
        MM_BRIDGE_ENABLED: 'true',
      },
    });
    await loginToApp();

    // Tap actions button to open wallet actions bottom sheet
    await TabBarComponent.tapActions();

    // Verify swap button is visible
    await Assertions.checkIfVisible(WalletActionsBottomSheet.swapButton);

    // Verify bridge button is not visible when unified UI is enabled
    await Assertions.checkIfNotVisible(WalletActionsBottomSheet.bridgeButton);

    // Verify other action buttons are still visible
    await Assertions.checkIfVisible(WalletActionsBottomSheet.sendButton);
    await Assertions.checkIfVisible(WalletActionsBottomSheet.receiveButton);
  });

  it('should show bridge button when unified UI is disabled', async (): Promise<void> => {
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        mockServerPort: `${getMockServerPort()}`,
        MM_UNIFIED_SWAPS_ENABLED: 'false',
        MM_BRIDGE_ENABLED: 'true',
      },
    });
    await loginToApp();

    // Tap actions button to open wallet actions bottom sheet
    await TabBarComponent.tapActions();

    // Verify both swap and bridge buttons are visible when unified UI is disabled
    await Assertions.checkIfVisible(WalletActionsBottomSheet.swapButton);
    await Assertions.checkIfVisible(WalletActionsBottomSheet.bridgeButton);

    // Verify other action buttons are still visible
    await Assertions.checkIfVisible(WalletActionsBottomSheet.sendButton);
    await Assertions.checkIfVisible(WalletActionsBottomSheet.receiveButton);
  });

  it('should navigate to unified swap/bridge interface when tapping swap with unified UI enabled', async (): Promise<void> => {
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        mockServerPort: `${getMockServerPort()}`,
        MM_UNIFIED_SWAPS_ENABLED: 'true',
        MM_BRIDGE_ENABLED: 'true',
      },
    });
    await loginToApp();

    // Tap actions button to open wallet actions bottom sheet
    await TabBarComponent.tapActions();

    // Tap swap button (which should open unified interface)
    await WalletActionsBottomSheet.tapSwapButton();

    // Verify we're on the unified swap/bridge interface
    // This would check for unified UI specific elements
    await TestHelpers.delay(2000);
    // Add specific assertions for unified UI elements once available
  });
});
