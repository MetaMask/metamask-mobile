'use strict';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { DappVariants, defaultGanacheOptions } from '../../framework/Constants';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionAccounts } from '../../tags';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import ErrorBoundaryView from '../../pages/ErrorBoundaryView/ErrorBoundaryView';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';

const PASSWORD = '123123123';

describe(RegressionAccounts('Error Boundary Screen'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should trigger error boundary screen to reveal SRP', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapInvalidSigButton();
        await Assertions.expectElementToBeVisible(ErrorBoundaryView.title);
        await ErrorBoundaryView.tapSRPLinkText();

        await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
          PASSWORD,
        );
        // If the following step fails, ensure you are using a test build with tap and hold to reveal animation disabled
        await RevealSecretRecoveryPhrase.tapToReveal();
        await Assertions.expectElementToBeVisible(
          RevealSecretRecoveryPhrase.container,
        );

        await Assertions.expectTextDisplayed(defaultGanacheOptions.mnemonic);
      },
    );
  });
});
