import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import RedesignedSendView from '../../page-objects/Send/RedesignedSendView';
import { Assertions, Gestures, LocalNode, Matchers } from '../../framework';
import BrowserView from '../../page-objects/Browser/BrowserView';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';
import TransactionConfirmView from '../../page-objects/Send/TransactionConfirmView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';

jest.setTimeout(150_000);

const TOKEN = 'Ethereum';

describe(FlaskBuildTests('Name Lookup Snap Tests'), () => {
  it('displays the resolved recipient address in the send flow', async () => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;

          return new FixtureBuilder()
            .withNetworkController({
              chainId: '0x1',
              rpcUrl: `http://localhost:${node.getPort() ?? AnvilPort()}`,
              type: 'custom',
              nickname: 'Local RPC',
              ticker: 'ETH',
            })
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
        await device.disableSynchronization();
        await WalletView.waitForTokenToBeReady(TOKEN);
        await WalletView.tapOnToken(TOKEN);
        await TokenOverview.tapSendButton();

        const domain = 'metamask.domain';
        await RedesignedSendView.enterZeroAmount();
        await RedesignedSendView.pressContinueButton();

        // Manually replacing the test to avoid flakiness from the '\n' input
        // added to the end of the text to hide the keyboard
        await Gestures.replaceText(
          RedesignedSendView.recipientAddressInput,
          domain,
          {
            elemDescription: 'Enter recipient address',
          },
        );

        await RedesignedSendView.pressReviewButton();
        await TransactionConfirmView.tapAdvancedDetails();

        await Gestures.waitAndTap(
          Matchers.getElementByText(
            domain,
            device.getPlatform() === 'ios' ? 1 : 0,
          ),
          {
            elemDescription: 'Recipient address',
            delay: 1000, // There's a animation that can cause flakiness
          },
        );

        await Assertions.expectTextDisplayed(
          '0xc0ffee254729296a45a3885639ac7e10f9d54979',
        );
      },
    );
  });
});
