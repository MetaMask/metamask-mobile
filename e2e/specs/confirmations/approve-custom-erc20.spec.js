'use strict';
import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import ContractApprovalBottomSheet from '../../pages/Browser/ContractApprovalBottomSheet';
import Assertions from '../../utils/Assertions';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';

const HST_CONTRACT = SMART_CONTRACTS.HST;

describe(SmokeConfirmations('ERC20 tokens'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    if (device.getPlatform() === 'android') {
      await TestHelpers.reverseServerPort();
    }
  });

  it('approve custom ERC20 token amount from a dapp', async () => {
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

        //Input custom token amount
        await Assertions.checkIfVisible(
          ContractApprovalBottomSheet.approveTokenAmount,
        );
        await ContractApprovalBottomSheet.clearInput();
        await ContractApprovalBottomSheet.inputCustomAmount('2');

        // Assert that custom token amount is shown
        await Assertions.checkIfElementToHaveText(
          ContractApprovalBottomSheet.approveTokenAmount,
          '2',
        );
        // Tap next button
        await ContractApprovalBottomSheet.tapNextButton();

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
