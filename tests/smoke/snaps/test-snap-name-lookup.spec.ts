import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import RedesignedSendView from '../../page-objects/Send/RedesignedSendView';
import { Assertions, LocalNode } from '../../framework';
import BrowserView from '../../page-objects/Browser/BrowserView';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Name Lookup Snap Tests'), () => {
  it('displays the resolved recipient address in the send flow', async () => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x1',
                rpcUrl: `http://localhost:${node.getPort() ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withTokensForAllPopularNetworks([
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
              },
            ])
            .build();
        },
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectNameLookupButton');

        await BrowserView.tapCloseBrowserButton();
        await TabBarComponent.tapHome();
        await WalletView.tapWalletSendButton();

        await RedesignedSendView.selectERC20Token();
        await RedesignedSendView.enterZeroAmount();
        await RedesignedSendView.pressContinueButton();
        await RedesignedSendView.inputRecipientAddress('metamask.domain');
        await RedesignedSendView.pressReviewButton();

        await Assertions.expectTextDisplayed('0xc0ffe...54979');
      },
    );
  });
});
