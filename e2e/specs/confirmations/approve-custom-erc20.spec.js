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
import TestDApp from '../../pages/Browser/TestDApp';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import ContractApprovalModal from '../../pages/modals/ContractApprovalModal';
import Assertions from '../../utils/Assertions';
import { ActivitiesViewSelectorsText } from '../../selectors/ActivitiesView.selectors';

const HST_CONTRACT = SMART_CONTRACTS.HST;

describe(SmokeConfirmations('ERC20 tokens'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    if (device.getPlatform() === 'android') {
      await TestHelpers.reverseServerPort();
    }
  });

  it('approve custom ERC20 token amount from a dapp', async () => {
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
        await TestDApp.tapApproveButton();

        //Input custom token amount
        await ContractApprovalModal.clearInput();
        await ContractApprovalModal.inputCustomAmount('2');

        // Assert that custom token amount is shown
        await Assertions.checkIfElementToHaveText(
          ContractApprovalModal.approveTokenAmount,
          '2',
        );
        // Tap next button
        await ContractApprovalModal.tapNextButton();

        // Tap approve button
        await ContractApprovalModal.tapApproveButton();

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
