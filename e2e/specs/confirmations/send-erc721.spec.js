'use strict';

import { SmokeConfirmations } from '../../tags';
import { loginToApp } from '../../viewHelper';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Assertions from '../../utils/Assertions';
import Utilities from '../../utils/Utilities';

describe(SmokeConfirmations('ERC721 tokens'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

  beforeAll(async () => {
    jest.setTimeout(150000);
    await Utilities.reverseServerPort();
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
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });
        // Transfer NFT
        await TestDApp.tapNFTTransferButton();
        await Utilities.delay(3000);

        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert collectible is sent
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SENT_COLLECTIBLE_MESSAGE_TEXT,
        );
      },
    );
  });
});
