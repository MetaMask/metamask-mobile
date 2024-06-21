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

describe(SmokeConfirmations('ERC20 - Increase Allowance'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    if (device.getPlatform() === 'android') {
      await TestHelpers.reverseServerPort();
    }
  });

  it('from a dApp', async () => {
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
        await TestDApp.tapIncreaseAllowanceButton();

        //Input custom token amount
        await ContractApprovalModal.clearInput();
        await ContractApprovalModal.inputCustomAmount('2');

        // Assert that custom token amount is shown
        await Assertions.checkIfHasText(
          ContractApprovalModal.approveTokenAmount,
          '2',
        );
        // Tap next button
        await ContractApprovalModal.tapNextButton();

        // Tap approve button
        await ContractApprovalModal.tapApproveButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert that the ERC20 activity is an increase allowance and it is confirmed
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.INCREASE_ALLOWANCE_METHOD,
        );
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
