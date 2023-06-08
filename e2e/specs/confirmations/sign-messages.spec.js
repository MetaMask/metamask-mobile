'use strict';
import Browser from '../../pages/Drawer/Browser';
import TabBarComponent from '../../pages/TabBarComponent';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import SigningModal from '../../pages/modals/SigningModal';
import { TestDApp } from '../../pages/TestDApp';
import SettingsView from '../../pages/Drawer/Settings/SettingsView';
import AdvancedSettingsView from '../../pages/Drawer/Settings/AdvancedView';
import { Smoke } from '../../tags';

describe(Smoke('Sign Messages'), () => {
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

  it('should swipe to sign buttons', async () => {
    await TestDApp.swipeToSignButtons();
  });

  it('should sign personal message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapPersonalSignButton();
      await SigningModal.isPersonalRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel personal message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapPersonalSignButton({ skipSwipe: true });
      await SigningModal.isPersonalRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should sign typed message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapTypedSignButton({ skipSwipe: true });
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel typed message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapTypedSignButton({ skipSwipe: true });
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should sign typed V3 message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapTypedV3SignButton({ skipSwipe: true });
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel typed V3 message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapTypedV3SignButton({ skipSwipe: true });
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should sign typed V4 message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapTypedV4SignButton({ skipSwipe: true });
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel typed V4 message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapTypedV4SignButton({ skipSwipe: true });
      await SigningModal.isTypedRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should allow eth_sign in advanced settings', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvanced();
    await AdvancedSettingsView.tapEthSignSwitch();
    await TabBarComponent.tapBrowser();
  });

  it('should sign eth_sign message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapEthSignButton({ skipSwipe: true });
      await SigningModal.isEthRequestVisible();
      await SigningModal.tapSignButton();
      await SigningModal.isNotVisible();
    });
  });

  it('should cancel eth_sign message', async () => {
    await TestDApp.retry(async () => {
      await TestDApp.tapEthSignButton({ skipSwipe: true });
      await SigningModal.isEthRequestVisible();
      await SigningModal.tapCancelButton();
      await SigningModal.isNotVisible();
    });
  });
});
