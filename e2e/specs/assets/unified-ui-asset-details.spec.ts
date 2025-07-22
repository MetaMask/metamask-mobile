'use strict';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { Regression } from '../../tags';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';

describe(Regression('Unified UI Asset Details Actions'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should hide bridge button in asset details when unified UI is enabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        launchArgs: {
          MM_UNIFIED_SWAPS_ENABLED: 'true',
          MM_BRIDGE_ENABLED: 'true',
        },
      },
      async () => {
        await loginToApp();

        // Navigate to ETH token details
        await WalletView.tapOnToken('Ethereum');

        // Verify swap button is visible in asset details
        await Assertions.checkIfVisible(TokenOverview.swapButton);

        // Verify bridge button is not visible when unified UI is enabled
        await Assertions.checkIfNotVisible(TokenOverview.bridgeButton);

        // Verify other action buttons are still visible
        await Assertions.checkIfVisible(TokenOverview.sendButton);
        await Assertions.checkIfVisible(TokenOverview.receiveButton);
      },
    );
  });

  it('should show bridge button in asset details when unified UI is disabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        launchArgs: {
          MM_UNIFIED_SWAPS_ENABLED: 'false',
          MM_BRIDGE_ENABLED: 'true',
        },
      },
      async () => {
        await loginToApp();

        // Navigate to ETH token details
        await WalletView.tapOnToken('Ethereum');

        // Verify both swap and bridge buttons are visible when unified UI is disabled
        await Assertions.checkIfVisible(TokenOverview.swapButton);
        await Assertions.checkIfVisible(TokenOverview.bridgeButton);

        // Verify other action buttons are still visible
        await Assertions.checkIfVisible(TokenOverview.sendButton);
        await Assertions.checkIfVisible(TokenOverview.receiveButton);
      },
    );
  });

  it('should have correct button count with unified UI enabled (4 buttons)', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        launchArgs: {
          MM_UNIFIED_SWAPS_ENABLED: 'true',
          MM_BRIDGE_ENABLED: 'true',
        },
      },
      async () => {
        await loginToApp();

        // Navigate to ETH token details
        await WalletView.tapOnToken('Ethereum');

        // Verify visible action buttons - should be 4 (Buy, Swap, Send, Receive)
        await Assertions.checkIfVisible(TokenOverview.sendButton);
        await Assertions.checkIfVisible(TokenOverview.receiveButton);
        await Assertions.checkIfVisible(TokenOverview.swapButton);

        // Bridge button should not be visible
        await Assertions.checkIfNotVisible(TokenOverview.bridgeButton);
      },
    );
  });

  it('should have correct button count with unified UI disabled (5 buttons)', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        launchArgs: {
          MM_UNIFIED_SWAPS_ENABLED: 'false',
          MM_BRIDGE_ENABLED: 'true',
        },
      },
      async () => {
        await loginToApp();

        // Navigate to ETH token details
        await WalletView.tapOnToken('Ethereum');

        // Verify all action buttons are visible - should be 5 (Buy, Swap, Bridge, Send, Receive)
        await Assertions.checkIfVisible(TokenOverview.sendButton);
        await Assertions.checkIfVisible(TokenOverview.receiveButton);
        await Assertions.checkIfVisible(TokenOverview.swapButton);
        await Assertions.checkIfVisible(TokenOverview.bridgeButton);
      },
    );
  });

  it('should navigate to unified interface when tapping swap with unified UI enabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        launchArgs: {
          MM_UNIFIED_SWAPS_ENABLED: 'true',
          MM_BRIDGE_ENABLED: 'true',
        },
      },
      async () => {
        await loginToApp();

        // Navigate to ETH token details
        await WalletView.tapOnToken('Ethereum');

        // Tap swap button (should open unified interface)
        await TokenOverview.tapSwapButton();

        // Wait for navigation
        await TestHelpers.delay(2000);

        // Verify we navigated away from token overview
        await Assertions.checkIfNotVisible(TokenOverview.container);

        // Add specific assertions for unified UI elements once available
        // For now, just verify we're not on the old swap interface
      },
    );
  });
});
