'use strict';

import { Regression } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/TabBarComponent.js';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';

import Assertions from '../../utils/Assertions.js';

import RevealPrivateKey from '../../pages/Settings/SecurityAndPrivacy/RevealPrivateKeyView.js';
import { RevealSeedViewSelectorsText } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors.js';

// import WalletView from '../../pages/wallet/WalletView.js';
// import AccountListView from '../../pages/AccountListView.js';
// import ImportAccountView from '../../pages/ImportAccountView.js';
// import { AccountListViewSelectorsText } from '../../selectors/AccountListView.selectors.js';

const fixtureServer = new FixtureServer();
// These keys are for testing private keys
// They should NEVER hold any eth or token
const HD_ACCOUNT_1_PRIVATE_KEY =
  '242251a690016cfcf8af43fb1ad7ff4c66c269bbca03f9f076ee8db93c191594';
// const IMPORTED_ACCOUNT_2_PRIVATE_KEY =
//   'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';

describe(Regression('reveal private key'), () => {
  const PASSWORD = '123123123';

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    const fixture = new FixtureBuilder()
      .withImportedAccountKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('shows the correct private key for selected hd account', async () => {
    // Navigate to Reveal private key screen
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();
    await SecurityAndPrivacy.scrollToRevealPrivateKey();
    await SecurityAndPrivacy.tapShowPrivateKey();
    await RevealPrivateKey.enterPasswordToRevealSecretCredential(PASSWORD);

    // Tap to reveal
    // If the following step fails, ensure you are using a test build with tap and hold to reveal animation disabled
    await RevealPrivateKey.tapToReveal();

    // Confirm that the private key container, title, and text are displayed
    await Assertions.checkIfVisible(RevealPrivateKey.container);
    await Assertions.checkIfTextIsDisplayed(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_PRIVATE_KEY_TITLE_TEXT,
    );
    await Assertions.checkIfTextIsDisplayed(HD_ACCOUNT_1_PRIVATE_KEY);

    // Copy to clipboard
    // Android devices running OS version < 11 (API level 29) will not see the copy to clipboard button presented
    // This will cause the following step to fail if e2e were being run on an older android OS prior to our minimum API level 29
    // See details here: https://github.com/MetaMask/metamask-mobile/pull/4170
    await RevealPrivateKey.tapToCopyCredentialToClipboard();
    await RevealPrivateKey.tapToRevealPrivateCredentialQRCode();
    await Assertions.checkIfVisible(
      RevealPrivateKey.revealCredentialQRCodeImage,
    );
    await RevealPrivateKey.scrollToDone();
    await TestHelpers.waitAndTapText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
    );

    // Confirm that the security and privacy screen is displayed
    await Assertions.checkIfVisible(
      SecurityAndPrivacy.securityAndPrivacyHeading,
    );
  });
});
