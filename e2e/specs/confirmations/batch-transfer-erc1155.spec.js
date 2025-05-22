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
import { buildPermissions } from '../../fixtures/utils';

describe(SmokeConfirmations('ERC1155 token'), () => {
  const ERC1155_CONTRACT = SMART_CONTRACTS.ERC1155;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('batch transfer ERC1155 tokens', async () => {
    const testSpecificMock  = {
      GET: [
        mockEvents.GET.suggestedGasFeesApiGanache
      ],
    };

    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: ERC1155_CONTRACT,
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const erc1155Address = await contractRegistry.getContractAddress(
          ERC1155_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: erc1155Address,
        });

        // Send batch transfer for ERC1155 tokens
        await TestDApp.tapERC1155BatchTransferButton();
        await Assertions.checkIfTextIsDisplayed(
          ContractApprovalBottomSheetSelectorsText.CONFIRM,
        );

        // Tap confirm button
        await ContractApprovalBottomSheet.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert that the ERC1155 activity is an smart contract interaction and it is confirmed
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SMART_CONTRACT_INTERACTION,
        );
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
