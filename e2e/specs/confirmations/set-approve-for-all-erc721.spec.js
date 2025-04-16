'use strict';

import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';
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
import { ContractApprovalBottomSheetSelectorsText } from '../../selectors/Browser/ContractApprovalBottomSheet.selectors';
import ContractApprovalBottomSheet from '../../pages/Browser/ContractApprovalBottomSheet';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';

describe(SmokeConfirmations('ERC721 token'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('approve all ERC721 tokens', async () => {
    const testSpecificMock = {
      GET: [mockEvents.GET.suggestedGasFeesApiGanache],
    };

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
        testSpecificMock,
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

        // Set approval for all NFTs
        await TestDApp.tapNFTSetApprovalForAllButton();
        await Assertions.checkIfTextIsDisplayed(
          ContractApprovalBottomSheetSelectorsText.APPROVE,
        );

        // Tap approve button
        await ContractApprovalBottomSheet.tapApproveButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert that the ERC721 activity is an set approve for all and it is confirmed
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SET_APPROVAL_FOR_ALL_METHOD,
        );
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
