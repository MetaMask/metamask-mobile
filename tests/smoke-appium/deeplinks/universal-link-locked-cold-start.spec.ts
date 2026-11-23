import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { openE2EUrl } from '../../framework/DeepLink.js';
import { PlatformDetector } from '../../framework/PlatformLocator.js';
import Gestures from '../../framework/Gestures.js';
import Assertions from '../../framework/Assertions.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';
import LoginView from '../../page-objects/wallet/LoginView.js';
import NetworkListModal from '../../page-objects/Network/NetworkListModal.js';
import {
  unlockIfLockScreenVisible,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';

// Canonical universal-link host declared in the Android manifest and the iOS
// associated-domain entitlements. `home` is interstitial-whitelisted and its
// `openNetworkSelector` param gives a distinct, assertable target.
const UNIVERSAL_LINK = 'https://link.metamask.io/home?openNetworkSelector=true';

appiumTest.describe(
  SmokeWalletPlatform('Universal Link Locked Cold Start'),
  () => {
    appiumTest.describe.configure({ timeout: 240000 });

    appiumTest(
      'routes a universal link to its target after unlocking a locked cold start',
      async ({ driver: _driver, currentDeviceDetails }) => {
        appiumTest.skip(
          PlatformDetector.isIOS(),
          'CI iOS e2e simulator build is ad-hoc signed, so LaunchServices cannot validate the link.metamask.io associated domain and hands the https URL to Safari instead of the app',
        );

        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await Assertions.expectElementToBeVisible(LoginView.container, {
              timeout: resolveE2EWaitTimeoutMs(60_000),
              description: 'Lock screen on fixture cold start',
            });

            await Gestures.terminateApp(currentDeviceDetails);

            await openE2EUrl(UNIVERSAL_LINK);

            await Assertions.expectElementToBeVisible(LoginView.container, {
              timeout: resolveE2EWaitTimeoutMs(60_000),
              description: 'Lock screen after universal-link cold launch',
            });
            await unlockIfLockScreenVisible();

            await Assertions.expectElementToBeVisible(
              NetworkListModal.selectNetwork,
              {
                timeout: resolveE2EWaitTimeoutMs(45_000),
                description:
                  'Network selector opens from the pending universal link after unlock',
              },
            );

            await NetworkListModal.swipeToDismissModal();
            await waitForWalletHomePlaywright();
          },
        );
      },
    );
  },
);
