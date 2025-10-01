'use strict';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionAssets } from '../../tags';
import Assertions from '../../framework/Assertions';
import QuoteView from '../../pages/swaps/QuoteView';
import SendView from '../../pages/Send/SendView';

describe(RegressionAssets('Unified UI Asset Details Actions'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('displays actions and navigates when tapping swap from asset details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Navigate to ETH token details
        await WalletView.tapOnToken('Ethereum');

        // Verify essential action buttons are visible in asset details
        await Assertions.expectElementToBeVisible(TokenOverview.swapButton);
        await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
        await Assertions.expectElementToBeVisible(TokenOverview.receiveButton);

        // Tap swap button
        await TokenOverview.tapSwapButton();

        // Validate we navigated into the swap quote view
        await device.disableSynchronization();
        await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
          description: 'source token area should be visible on QuoteView',
        });
      },
    );
  });

  it('navigates when tapping send from asset details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Navigate to ETH token details
        await WalletView.tapOnToken('Ethereum');

        // Tap send button
        await TokenOverview.tapSendButton();

        // Verify we navigated into the send flow by checking an element on SendView
        await device.disableSynchronization();
        await Assertions.expectElementToBeVisible(SendView.addressInputField, {
          description: 'address input should be visible on SendView',
        });
      },
    );
  });
});
