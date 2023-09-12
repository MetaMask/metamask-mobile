'use strict';

import { Smoke } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import { TEST_DAPP_LOCAL_URL, TestDApp } from '../../pages/TestDApp';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import root from '../../../locales/languages/en.json';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';

describe(Smoke('ERC721 tokens'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;
  const SENT_COLLECTIBLE_MESSAGE_TEXT = root.transactions.sent_collectible;

  beforeAll(async () => {
    jest.setTimeout(150000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8081'); // because on android we need to expose the localhost ports to run ganache
      await device.reverseTcpPort('8545'); // ganache
      await device.reverseTcpPort('8080'); // test-dapp
    }
  });

  it('send an ERC721 token from a dapp', async () => {
    await withFixtures(
      {
        dapp: true,
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
          TEST_DAPP_LOCAL_URL,
          nftsAddress,
        );

        // Transfer NFT
        await TestDApp.tapTransferFromButton(nftsAddress, TEST_DAPP_LOCAL_URL);
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
