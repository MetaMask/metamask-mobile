import { test as appiumTest } from '../../../../framework/fixtures/playwright/index.js';
import { SmokeConfirmations } from '../../../../tags.js';
import { loginToAppPlaywright } from '../../../../flows/wallet.flow.js';
import {
  confirmCloseAndAssertActivity,
  navigateToContractAndTap,
} from '../../../../flows/confirmations.flow.js';
import Assertions from '../../../../framework/Assertions.js';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper.js';
import RowComponents from '../../../../page-objects/Browser/Confirmations/RowComponents.js';
import TokenApproveConfirmation from '../../../../page-objects/Confirmation/TokenApproveConfirmation.js';
import { TestDappSelectorsWebIDs } from '../../../../selectors/Browser/TestDapp.selectors.js';
import { DappVariants } from '../../../../framework/Constants.js';
import { LocalNodeType } from '../../../../framework/types.js';
import {
  APPROVE_ACTIVITY,
  ERC_20_CONTRACT,
  approveTestSpecificMock,
  buildApproveFixture,
} from './approve.helpers.js';

appiumTest.describe(SmokeConfirmations('Token Approve - approve ERC20'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  appiumTest(
    'creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: buildApproveFixture,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1337,
              },
            },
          ],
          restartDevice: true,
          testSpecificMock: approveTestSpecificMock,
          smartContracts: [ERC_20_CONTRACT],
          currentDeviceDetails,
        },
        async ({ contractRegistry }) => {
          const erc20Address =
            await contractRegistry?.getContractAddress(ERC_20_CONTRACT);

          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await navigateToContractAndTap(
            erc20Address as string,
            TestDappSelectorsWebIDs.APPROVE_ERC_20_TOKENS_BUTTON_ID,
            'Approve ERC-20 button',
          );

          // Existence: BottomSheet children report isDisplayed=false on iOS.
          await Assertions.expectElementToExist(RowComponents.AccountNetwork, {
            description: 'Account Network',
          });
          await Assertions.expectElementToExist(RowComponents.ApproveRow, {
            description: 'Approve Row',
          });
          await Assertions.expectElementToExist(
            RowComponents.NetworkAndOrigin,
            {
              description: 'Network And Origin',
            },
          );
          await Assertions.expectElementToExist(RowComponents.GasFeesDetails, {
            description: 'Gas Fees Details',
          });
          await Assertions.expectElementToExist(RowComponents.AdvancedDetails, {
            description: 'Advanced Details',
          });

          await Assertions.expectElementToHaveText(
            TokenApproveConfirmation.SpendingCapValue,
            '7',
            {
              description: 'Spending Cap Value',
            },
          );

          await TokenApproveConfirmation.tapEditSpendingCapButton();
          await TokenApproveConfirmation.inputSpendingCap('10');
          await TokenApproveConfirmation.tapEditSpendingCapSaveButton();
          await Assertions.expectElementToHaveText(
            TokenApproveConfirmation.SpendingCapValue,
            '10',
            {
              description: 'Updated Spending Cap Value',
            },
          );

          await confirmCloseAndAssertActivity(APPROVE_ACTIVITY);
        },
      );
    },
  );
});
