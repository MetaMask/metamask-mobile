import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { Assertions, Gestures, Matchers } from '../../framework/index.js';
import BrowserView from '../../page-objects/Browser/BrowserView.js';
import RedesignedSendView from '../../page-objects/Send/RedesignedSendView.js';
import TransactionConfirmView from '../../page-objects/Send/TransactionConfirmView.js';
import NetworkListModal from '../../page-objects/Network/NetworkListModal.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import TokenOverview from '../../page-objects/wallet/TokenOverview.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { getDecodedProxiedURL } from '../notifications/utils/helpers.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

const TOKEN = 'ETH';

appiumTest.describe(SmokeSnaps('Name Lookup Snap Tests'), () => {
  appiumTest.describe.configure({ timeout: 150_000 });

  appiumTest(
    'displays the resolved recipient address in the send flow',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
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
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectNameLookupButton');

          await BrowserView.tapCloseBrowserButton();
          await TabBarComponent.tapHome();
          await WalletView.tapOnNewTokensSection();
          await WalletView.tapTokenNetworkFilter();
          await NetworkListModal.tapOnCustomTab();
          await NetworkListModal.changeNetworkTo('Localhost');

          await WalletView.tapOnToken(TOKEN);
          await TokenOverview.tapSendButton();

          const domain = 'metamask.domain';
          await RedesignedSendView.enterZeroAmount();
          await RedesignedSendView.pressContinueButton();
          await RedesignedSendView.inputRecipientAddress(domain);

          await RedesignedSendView.pressReviewButton();
          await TransactionConfirmView.tapAdvancedDetails();

          await Gestures.waitAndTap(Matchers.getElementByText(domain, 0), {
            elemDescription: 'Recipient address',
            // There's an animation that can cause flakiness.
            delay: 1000,
          });

          await Assertions.expectTextDisplayed(
            '0xc0ffee254729296a45a3885639ac7e10f9d54979',
          );
        },
      );
    },
  );
});
