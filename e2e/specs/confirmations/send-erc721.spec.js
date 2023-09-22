'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import { TestDApp } from '../../pages/TestDApp';
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
  let ganache;

  beforeAll(async () => {
    jest.setTimeout(150000);
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort('8545'); // ganache
      await device.reverseTcpPort('8080'); // test-dapp
    }
  });

  afterEach(async () => {
    await ganache.quit();
    await TestHelpers.delay(3000);
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
      async ({ contractRegistry, ganacheServer }) => {
        ganache = ganacheServer;
        const nftsAddress = await contractRegistry.getContractAddress(
          NFT_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();

        // Navigate to the ERC721 url
        await TestDApp.navigateToTestDappWithContract(nftsAddress);

        // Transfer NFT
        await TestDApp.tapTransferFromButton(nftsAddress);
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
