import { SmokeSnaps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import RedesignedSendView from '../../page-objects/Send/RedesignedSendView';
import { Assertions, Gestures, Matchers } from '../../framework';
import BrowserView from '../../page-objects/Browser/BrowserView';
import TransactionConfirmView from '../../page-objects/Send/TransactionConfirmView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
import { getDecodedProxiedURL } from '../notifications/utils/helpers';

jest.setTimeout(150_000);

const TOKEN = 'Ethereum';

describe(SmokeSnaps('Name Lookup Snap Tests'), () => {
  it('displays the resolved recipient address in the send flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
        disableSynchronization: true,
        testSpecificMock: async (mockServer) => {
          await mockServer
            .forPost('/proxy')
            .matching((request) => {
              try {
                const url = getDecodedProxiedURL(request.url);
                return /compliance\.(dev-api|api|uat-api)\.cx\.metamask\.io\/v1\/wallet\/batch/.test(
                  url,
                );
              } catch {
                return false;
              }
            })
            .asPriority(1001)
            .thenCallback(async (request) => {
              let addresses: string[] = [];
              try {
                const text = await request.body.getText();
                if (text) {
                  const parsed = JSON.parse(text) as unknown;
                  if (Array.isArray(parsed)) {
                    addresses = parsed.filter(
                      (a): a is string => typeof a === 'string',
                    );
                  }
                }
              } catch {
                /* ignore malformed body */
              }
              return {
                statusCode: 200,
                json: addresses.map((address) => ({
                  address,
                  blocked: false,
                })),
              };
            });
        },
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectNameLookupButton');

        await BrowserView.tapCloseBrowserButton();
        await TabBarComponent.tapHome();
        await device.disableSynchronization();
        await WalletView.tapOnNewTokensSection();
        await WalletView.tapTokenNetworkFilter();
        await NetworkListModal.tapOnCustomTab();
        await NetworkListModal.changeNetworkTo('Localhost');

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
