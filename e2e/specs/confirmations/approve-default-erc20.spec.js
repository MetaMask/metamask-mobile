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
import { TestDApp } from '../../pages/TestDApp';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import root from '../../../locales/languages/en.json';
import { ContractApprovalModalSelectorsIDs } from '../../selectors/Modals/ContractApprovalModal.selectors';

const HST_CONTRACT = SMART_CONTRACTS.HST;
const WEBVIEW_TEST_DAPP_APPROVE_TOKENS_BUTTON_ID = 'approveTokens';
const EXPECTED_TOKEN_AMOUNT = '7';

describe(SmokeConfirmations('ERC20 tokens'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    if (device.getPlatform() === 'android') {
      await TestHelpers.reverseServerPort();
    }
  });

  it('approve default ERC20 token amount from a dapp', async () => {
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

        // Approve ERC20 tokens
        await TestDApp.tapButtonWithContract({
          buttonId: WEBVIEW_TEST_DAPP_APPROVE_TOKENS_BUTTON_ID,
          contractAddress: hstAddress,
        });

        // Assert the default token amount is shown
        await TestHelpers.checkIfExists(
          ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT,
        );

        await expect(
          element(
            by.id(ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT),
          ),
        ).toHaveText(EXPECTED_TOKEN_AMOUNT);

        // Tap next button
        await TestHelpers.checkIfElementWithTextIsVisible(
          root.transaction.next,
        );
        await TestHelpers.tapByText(root.transaction.next);

        // Tap approve button
        await TestHelpers.checkIfElementWithTextIsVisible(
          root.transactions.tx_review_approve,
        );
        await TestHelpers.tapByText(root.transactions.tx_review_approve);

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert erc20 is approved
        await TestHelpers.checkIfElementByTextIsVisible(
          root.transaction.confirmed,
        );
      },
    );
  });
});
