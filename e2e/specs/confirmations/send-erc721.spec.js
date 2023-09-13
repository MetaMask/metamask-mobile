'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import { TEST_DAPP_URL, TestDApp } from '../../pages/TestDApp';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import root from '../../../locales/languages/en.json';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';

describe(Regression('ERC721 tokens'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;
  const SENT_COLLECTIBLE_MESSAGE_TEXT = root.transactions.sent_collectible;
  const WEBVIEW_TEST_DAPP_TRANSFER_FROM_BUTTON_ID = 'transferFromButton';

  beforeAll(async () => {
    jest.setTimeout(150000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545');
    }
  });

  it('send an ERC721 token from a dapp', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: NFT_CONTRACT,
      },
      async ({ contractRegistry }) => {
        const nftsAddress = await contractRegistry.getContractAddress(
          NFT_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();

        // Navigate to the ERC721 url
        await TestDApp.navigateToTestDappWithContract(
          TEST_DAPP_URL,
          nftsAddress,
        );

        // Transfer NFT
        await TestDApp.tapButtonWithContract({
          buttonId: WEBVIEW_TEST_DAPP_TRANSFER_FROM_BUTTON_ID,
          contractAddress: nftsAddress,
        });
        await TestHelpers.delay(3000);

        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert collectible is sent
        await TestHelpers.checkIfElementByTextIsVisible(
          SENT_COLLECTIBLE_MESSAGE_TEXT,
        );
      },
    );
  });
});
