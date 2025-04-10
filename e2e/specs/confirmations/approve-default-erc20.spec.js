'use strict';
import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';

import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ContractApprovalBottomSheetSelectorsText } from '../../selectors/Browser/ContractApprovalBottomSheet.selectors';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';

import ContractApprovalBottomSheet from '../../pages/Browser/ContractApprovalBottomSheet';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';

const HST_CONTRACT = SMART_CONTRACTS.HST;
const EXPECTED_TOKEN_AMOUNT = '7';

describe(SmokeConfirmations('ERC20 tokens'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    if (device.getPlatform() === 'android') {
      await TestHelpers.reverseServerPort();
    }
  });

  it('approve default ERC20 token amount from a dapp', async () => {
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
        smartContract: HST_CONTRACT,
        testSpecificMock,
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
        await TestDApp.tapApproveERC20TokensButton();

        await Assertions.checkIfVisible(
          ContractApprovalBottomSheet.approveTokenAmount,
        );

        await Assertions.checkIfElementToHaveText(
          ContractApprovalBottomSheet.approveTokenAmount,
          EXPECTED_TOKEN_AMOUNT,
        );
        // Tap next button
        await Assertions.checkIfTextIsDisplayed(
          ContractApprovalBottomSheetSelectorsText.NEXT,
        );
        await ContractApprovalBottomSheet.tapNextButton();

        await Assertions.checkIfTextIsDisplayed(
          ContractApprovalBottomSheetSelectorsText.APPROVE,
        );
        // Tap approve button
        await ContractApprovalBottomSheet.tapApproveButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert erc20 is approved

        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
