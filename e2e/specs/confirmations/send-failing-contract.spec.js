'use strict';

import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';

describe(SmokeConfirmations('Failing contracts'), () => {
  const FAILING_CONTRACT = SMART_CONTRACTS.FAILING;

  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('sends a failing contract transaction', async () => {

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
        smartContract: FAILING_CONTRACT,
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const failingAddress = await contractRegistry.getContractAddress(
          FAILING_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: failingAddress,
        });

        // Send a failing transaction
        await TestDApp.tapSendFailingTransactionButton();
        await TestHelpers.delay(3000);

        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert the failed transaction is displayed
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SMART_CONTRACT_INTERACTION
        );
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.FAILED_TEXT
        );
      },
    );
  });
});
