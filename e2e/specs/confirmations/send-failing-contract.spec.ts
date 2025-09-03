import { RegressionConfirmations } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Assertions from '../../framework/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/mockHelpers';

describe(RegressionConfirmations('Failing contracts'), () => {
  const FAILING_CONTRACT = SMART_CONTRACTS.FAILING;

  it('sends a failing contract transaction', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      const { urlEndpoint, response } =
        mockEvents.GET.remoteFeatureFlagsOldConfirmations;
      const { urlEndpoint: gasUrlEndpoint, response: gasResponse } =
        mockEvents.GET.suggestedGasFeesApiGanache;
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: urlEndpoint,
        response,
        responseCode: 200,
      });
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: gasUrlEndpoint,
        response: gasResponse,
        responseCode: 200,
      });
    };

    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        smartContracts: [FAILING_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const failingAddress = await contractRegistry?.getContractAddress(
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

        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert the failed transaction is displayed
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.SMART_CONTRACT_INTERACTION,
        );
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.FAILED_TEXT,
        );
      },
    );
  });
});
