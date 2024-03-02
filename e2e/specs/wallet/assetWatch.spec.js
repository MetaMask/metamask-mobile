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
import ContractApprovalModal from '../../pages/modals/ContractApprovalModal';
import Assertions from '../../utils/Assertions';
import WalletView from '../../pages/WalletView';
import { getFixturesServerPort } from '../../fixtures/utils';

import TransactionConfirmationView from '../../pages/TransactionConfirmView';
const HST_CONTRACT = SMART_CONTRACTS.HST;
const WEBVIEW_TEST_DAPP_APPROVE_TOKENS_BUTTON_ID = 'approveTokens';

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
          .withDefaultFixture()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: false,
        ganacheOptions: defaultGanacheOptions,
        smartContract: HST_CONTRACT,
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry.getContractAddress(
          HST_CONTRACT,
        );
        await device.launchApp({
          permissions: { notifications: 'YES' },
          launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
        });
        await loginToApp();
        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();

        // Approve ERC20 tokens
        await TestDApp.tapButtonWithContract({
          buttonId: 'createToken',
          contractAddress: hstAddress,
        });

        await TestHelpers.waitAndTapByLabel('Confirm');

        await TestDApp.tapButtonWithContract({
          buttonId: 'watchAssets',
          contractAddress: hstAddress,
        });

        // await TestHelpers.delay(1999999);

        // await TestHelpers.tapByText(watch_asset_request.add)
        await TestHelpers.tapByText('ADD TOKEN');

        // Navigate to the activity screen
        await TabBarComponent.tapWallet();

        await WalletView.isTokenVisibleInWallet('TST');
      },
    );
  });
});
