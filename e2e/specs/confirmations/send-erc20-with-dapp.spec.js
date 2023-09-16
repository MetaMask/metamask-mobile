'use strict';
import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';
import { TestDApp } from '../../pages/TestDApp';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import root from '../../../locales/languages/en.json';

const HST_CONTRACT = SMART_CONTRACTS.HST;
const SENT_TOKENS_MESSAGE_TEXT = root.transactions.sent_tokens;
const WEBVIEW_TEST_DAPP_TRANSFER_TOKENS_BUTTON_ID = 'transferTokens';

describe(Regression('ERC20 tokens'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
  });

  it('send an ERC20 token from a dapp', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: HST_CONTRACT,
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry.getContractAddress(
          HST_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();

        // Transfer ERC20 tokens
        await TestDApp.tapButtonWithContract({
          buttonId: WEBVIEW_TEST_DAPP_TRANSFER_TOKENS_BUTTON_ID,
          contractAddress: hstAddress,
        });
        await TestHelpers.delay(3000);

        // Tap confirm button
        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert "Sent Tokens" transaction is displayed
        await TestHelpers.checkIfElementByTextIsVisible(
          SENT_TOKENS_MESSAGE_TEXT,
        );
      },
    );
  });
});
