'use strict';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SmokeNetworkExpansion } from '../../tags';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import ErrorBoundaryView from '../../pages/ErrorBoundaryView/ErrorBoundaryView';
import { buildPermissions } from '../../fixtures/utils';
const PASSWORD = '123123123';

describe(SmokeNetworkExpansion('Error Boundary Screen'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should trigger error boundary screen to reveal SRP', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapInvalidSigButton();
        await Assertions.checkIfVisible(ErrorBoundaryView.title);
        await ErrorBoundaryView.tapSRPLinkText();

        await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
          PASSWORD,
        );
        // If the following step fails, ensure you are using a test build with tap and hold to reveal animation disabled
        await RevealSecretRecoveryPhrase.tapToReveal();
        await Assertions.checkIfVisible(RevealSecretRecoveryPhrase.container);

        await Assertions.checkIfTextIsDisplayed(defaultGanacheOptions.mnemonic);
      },
    );
  });
});
