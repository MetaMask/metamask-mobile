'use strict';
import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';
import Browser from '../../pages/Browser/BrowserView';

import TestDApp from '../../pages/Browser/TestDApp';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import enContent from '../../../locales/languages/en.json';

const HST_CONTRACT = SMART_CONTRACTS.HST;
const SENT_TOKENS_MESSAGE_TEXT = enContent.transactions.sent_tokens;
const WEBVIEW_TEST_DAPP_TRANSFER_TOKENS_BUTTON_ID = 'transferTokens';

describe(SmokeConfirmations('ERC20 tokens'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('send an ERC20 token from a dapp', async () => {
    await withFixtures(
      {
        dapp: true,
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
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: hstAddress,
        });
        await TestHelpers.delay(3000);

        // Transfer ERC20 tokens
        await TestDApp.tapERC20TransferButton();
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
