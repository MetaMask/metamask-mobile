'use strict';
import Browser from '../../pages/Drawer/Browser';
import TabBarComponent from '../../pages/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
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
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
  });

  it('Sign messages tests', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();
        // Navigate to the browser
        await TabBarComponent.tapBrowser();
        await Browser.isVisible();
        // Navigate to the DApp
        await Browser.navigateToTestDApp();
        await TestDApp.connect();

        // Sign personal message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapPersonalSignButton();
          await SigningModal.isPersonalRequestVisible();
          await SigningModal.tapSignButton();
          await SigningModal.isNotVisible();
        });

        // Cancel personal message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapTypedSignButton();
          await SigningModal.isTypedRequestVisible();
          await SigningModal.tapCancelButton();
          await SigningModal.isNotVisible();
        });

        // Sign typed message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapTypedSignButton();
          await SigningModal.isTypedRequestVisible();
          await SigningModal.tapSignButton();
          await SigningModal.isNotVisible();
        });

        // Cancel typed message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapTypedSignButton();
          await SigningModal.isTypedRequestVisible();
          await SigningModal.tapCancelButton();
          await SigningModal.isNotVisible();
        });

        // Sign typed v3 message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapTypedV3SignButton();
          await SigningModal.isTypedRequestVisible();
          await SigningModal.tapSignButton();
          await SigningModal.isNotVisible();
        });

        // Cancel typed v3 message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapTypedV3SignButton();
          await SigningModal.isTypedRequestVisible();
          await SigningModal.tapCancelButton();
          await SigningModal.isNotVisible();
        });

        // Sign typed V4 message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapTypedV4SignButton();
          await SigningModal.isTypedRequestVisible();
          await SigningModal.tapSignButton();
          await SigningModal.isNotVisible();
        });

        // Cancel typed V4 message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapTypedV4SignButton();
          await SigningModal.isTypedRequestVisible();
          await SigningModal.tapCancelButton();
          await SigningModal.isNotVisible();
        });

        // Allow eth_sign in advanced settings
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

        // Sign eth_sign message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapEthSignButton();
          await SigningModal.isEthRequestVisible();
          await SigningModal.tapSignButton();
          await SigningModal.isNotVisible();
        });

        // Cancel eth_sign message
        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapEthSignButton();
          await SigningModal.isEthRequestVisible();
          await SigningModal.tapCancelButton();
          await SigningModal.isNotVisible();
        });
      },
    );
  });
});
