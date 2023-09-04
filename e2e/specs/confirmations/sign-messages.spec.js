'use strict';
import Browser from '../../pages/Drawer/Browser';
import TabBarComponent from '../../pages/TabBarComponent';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import SigningModal from '../../pages/modals/SigningModal';
import { TestDApp } from '../../pages/TestDApp';
import SettingsView from '../../pages/Drawer/Settings/SettingsView';
import AdvancedSettingsView from '../../pages/Drawer/Settings/AdvancedView';
import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import ToggleEthSignModal from '../../pages/modals/ToggleEthSignModal';

const MAX_ATTEMPTS = 3;

describe(Regression('Sign Messages'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should navigate to browser', async () => {
    await TabBarComponent.tapBrowser();
    await Browser.isVisible();
  });

  it('should connect to the test dapp', async () => {
    await Browser.navigateToTestDApp();
    await TestDApp.connect();
  });

  it('should sign personal message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapPersonalSignButton();
      await SigningModal.isPersonalRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel personal message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapPersonalSignButton();
      await SigningModal.isPersonalRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should sign typed message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapTypedSignButton();
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel typed message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapTypedSignButton();
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should sign typed V3 message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapTypedV3SignButton();
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel typed V3 message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapTypedV3SignButton();
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should sign typed V4 message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapTypedV4SignButton();
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel typed V4 message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapTypedV4SignButton();
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should allow eth_sign in advanced settings', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvanced();
    await AdvancedSettingsView.tapEthSignSwitch();
    await ToggleEthSignModal.isVisible();
    await ToggleEthSignModal.tapIUnderstandCheckbox();
    await ToggleEthSignModal.tapContinueButton();
    await ToggleEthSignModal.enterIUnderstandToContinue(
      'I only sign what I understand',
    );
    await ToggleEthSignModal.tapContinueButton();
    await TabBarComponent.tapBrowser();
  });

  it('should sign eth_sign message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapEthSignButton();
      await SigningModal.isEthRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel eth_sign message', async () => {
    await TestHelpers.retry(MAX_ATTEMPTS, async () => {
      await TestDApp.tapEthSignButton();
      await SigningModal.isEthRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });
});
