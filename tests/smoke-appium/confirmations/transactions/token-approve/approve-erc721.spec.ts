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
  APPROVE_ACTIVITY,
  ERC_721_CONTRACT,
  approveTestSpecificMock,
  buildApproveFixture,
} from './approve.helpers.js';

appiumTest.describe(
  SmokeConfirmations('Token Approve - approve ERC721'),
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
            smartContracts: [ERC_721_CONTRACT],
            currentDeviceDetails,
          },
          async ({ contractRegistry }) => {
            const erc721Address =
              await contractRegistry?.getContractAddress(ERC_721_CONTRACT);

            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await navigateToContractAndTap(
              erc721Address as string,
              TestDappSelectorsWebIDs.APPROVE_ERC_721_TOKEN_BUTTON_ID,
              'Approve ERC-721 button',
            );

            // #1 means the token id for ERC 721
            await Assertions.expectElementToHaveText(
              TokenApproveConfirmation.SpendingCapValue,
              '#1',
              {
                description: 'ERC-721 Spending Cap Value',
              },
            );

            await confirmCloseAndAssertActivity(APPROVE_ACTIVITY);
          },
        );
      },
    );
  },
);
