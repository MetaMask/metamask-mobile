import { SMART_CONTRACTS } from '../../../../../app/util/test/smart-contracts';
import { SmokeConfirmationsRedesigned } from '../../../../tags';
import { loginToApp } from '../../../../viewHelper';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../../pages/Browser/Confirmations/FooterActions';
import { mockEvents } from '../../../../api-mocking/mock-config/mock-events.js';
import Assertions from '../../../../framework/Assertions';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../../../framework/fixtures/FixtureUtils';
import RowComponents from '../../../../pages/Browser/Confirmations/RowComponents';
import TokenApproveConfirmation from '../../../../pages/Confirmation/TokenApproveConfirmation';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations';
import TestDApp from '../../../../pages/Browser/TestDApp';
import { DappVariants } from '../../../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../../api-mocking/mockHelpers';

describe(
  SmokeConfirmationsRedesigned('Token Approve - increaseAllowance method'),
  () => {
    const ERC_20_CONTRACT = SMART_CONTRACTS.HST;

    const testSpecificMock = async (mockServer: Mockttp) => {
      const { urlEndpoint, response } =
        mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations;
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
        response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
        responseCode: 200,
      });
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: urlEndpoint,
        response,
        responseCode: 200,
      });
    };

    it('creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it', async () => {
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
          testSpecificMock,
          smartContracts: [ERC_20_CONTRACT],
        },
        async ({ contractRegistry }) => {
          const erc20Address = await contractRegistry?.getContractAddress(
            ERC_20_CONTRACT,
          );

          await loginToApp();

          await TabBarComponent.tapBrowser();
          await TestDApp.navigateToTestDappWithContract({
            contractAddress: erc20Address,
          });

          await TestDApp.tapIncreaseAllowanceButton();

          // Check confirmation modal is visible
          await Assertions.expectElementToBeVisible(
            ConfirmationUITypes.ModalConfirmationContainer,
          );

          // Check all expected row components are visible
          await Assertions.expectElementToBeVisible(
            RowComponents.AccountNetwork,
          );
          await Assertions.expectElementToBeVisible(RowComponents.ApproveRow);
          await Assertions.expectElementToBeVisible(RowComponents.OriginInfo);
          await Assertions.expectElementToBeVisible(
            RowComponents.GasFeesDetails,
          );
          await Assertions.expectElementToBeVisible(
            RowComponents.AdvancedDetails,
          );

          // Check spending cap is visible and has the correct value
          await Assertions.expectElementToHaveText(
            TokenApproveConfirmation.SpendingCapValue,
            '1',
          );

          // Change the spending cap to 10 and save it
          await TokenApproveConfirmation.tapEditSpendingCapButton();
          await TokenApproveConfirmation.inputSpendingCap('5');
          await TokenApproveConfirmation.tapEditSpendingCapSaveButton();
          await Assertions.expectElementToHaveText(
            TokenApproveConfirmation.SpendingCapValue,
            '5',
          );

          // Accept confirmation
          await FooterActions.tapConfirmButton();

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Increase Allowance');
          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });
  },
);
