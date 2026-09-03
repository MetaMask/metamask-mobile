import { test as appiumTest } from '../../../../framework/fixtures/playwright/index.js';
import { SmokeConfirmations } from '../../../../tags.js';
import { loginToAppPlaywright } from '../../../../flows/wallet.flow.js';
import {
  confirmCloseAndAssertActivity,
  navigateToContractAndTap,
} from '../../../../flows/confirmations.flow.js';
import Assertions from '../../../../framework/Assertions.js';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper.js';
import TokenApproveConfirmation from '../../../../page-objects/Confirmation/TokenApproveConfirmation.js';
import { TestDappSelectorsWebIDs } from '../../../../selectors/Browser/TestDapp.selectors.js';
import { DappVariants } from '../../../../framework/Constants.js';
import { LocalNodeType } from '../../../../framework/types.js';
import {
  ERC_721_CONTRACT,
  SET_APPROVAL_FOR_ALL_ACTIVITY,
  buildSetApprovalFixture,
  setApprovalTestSpecificMock,
} from './set-approval-for-all.helpers.js';

appiumTest.describe(
  SmokeConfirmations('Token Approve - setApprovalForAll ERC721 revoke'),
  () => {
    appiumTest.describe.configure({ timeout: 2500000 });

    appiumTest(
      'creates an approve transaction confirmation for ERC 721 and submits it',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
            fixture: buildSetApprovalFixture,
            localNodeOptions: [
              {
                type: LocalNodeType.anvil,
                options: {
                  chainId: 1337,
                },
              },
            ],
            restartDevice: true,
            testSpecificMock: setApprovalTestSpecificMock,
            smartContracts: [ERC_721_CONTRACT],
            currentDeviceDetails,
          },
          async ({ contractRegistry }) => {
            const erc721Address =
              await contractRegistry?.getContractAddress(ERC_721_CONTRACT);

            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await navigateToContractAndTap(
              erc721Address as string,
              TestDappSelectorsWebIDs.ERC_721_REVOKE_APPROVAL_BUTTON_ID,
              'ERC-721 revoke approval button',
            );

            // All means all token permissions revoked
            await Assertions.expectElementToHaveText(
              TokenApproveConfirmation.SpendingCapValue,
              'All',
              {
                description: 'Revoke Spending Cap Value',
              },
            );

            await confirmCloseAndAssertActivity(SET_APPROVAL_FOR_ALL_ACTIVITY);
          },
        );
      },
    );
  },
);
