'use strict';
import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import {
  SMART_CONTRACTS,
  contractConfiguration,
} from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../fixtures/utils';

const HST_CONTRACT = SMART_CONTRACTS.HST;

describe(SmokeConfirmations('ERC20 tokens'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('send an ERC20 token from a dapp', async () => {
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
        await TestHelpers.delay(3000);

        // Transfer ERC20 tokens
        await TestDApp.tapERC20TransferButton();
        await TestHelpers.delay(3000);

        // Tap confirm button
        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert "Sent Tokens" transaction is displayed
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SENT_TOKENS_MESSAGE_TEXT(
            contractConfiguration[HST_CONTRACT].tokenName,
          ),
        );
      },
    );
  });
});
