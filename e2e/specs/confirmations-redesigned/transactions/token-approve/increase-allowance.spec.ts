import { SMART_CONTRACTS } from '../../../../../app/util/test/smart-contracts';
import { SmokeConfirmationsRedesigned } from '../../../../tags';
import TestHelpers from '../../../../helpers';
import { loginToApp } from '../../../../viewHelper';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../../pages/Browser/Confirmations/FooterActions';
import { mockEvents } from '../../../../api-mocking/mock-config/mock-events.js';
import Assertions from '../../../../utils/Assertions';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../../fixtures/fixture-helper';
import { buildPermissions } from '../../../../fixtures/utils';
import RowComponents from '../../../../pages/Browser/Confirmations/RowComponents';
import TokenApproveConfirmation from '../../../../pages/Confirmation/TokenApproveConfirmation';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations';
import TestDApp from '../../../../pages/Browser/TestDApp';

describe(
  SmokeConfirmationsRedesigned('Token Approve - increaseAllowance method'),
  () => {
    const ERC_20_CONTRACT = SMART_CONTRACTS.HST;

    const testSpecificMock = {
      POST: [],
      GET: [
        SIMULATION_ENABLED_NETWORKS_MOCK,
        mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations,
      ],
    };

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    it('creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it', async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withGanacheNetwork()
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(['0x539']),
            )
            .build(),
          restartDevice: true,
          ganacheOptions: defaultGanacheOptions,
          testSpecificMock,
          smartContract: ERC_20_CONTRACT,
        },
        // Remove any once withFixtures is typed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async ({ contractRegistry }: { contractRegistry: any }) => {
          const erc20Address = await contractRegistry.getContractAddress(
            ERC_20_CONTRACT,
          );

          await loginToApp();

          await TabBarComponent.tapBrowser();
          await TestDApp.navigateToTestDappWithContract({
            contractAddress: erc20Address,
          });

          await TestDApp.tapIncreaseAllowanceButton();

          // Check confirmation modal is visible
          await Assertions.checkIfVisible(
            ConfirmationUITypes.ModalConfirmationContainer,
          );

          // Check all expected row components are visible
          await Assertions.checkIfVisible(RowComponents.AccountNetwork);
          await Assertions.checkIfVisible(RowComponents.ApproveRow);
          await Assertions.checkIfVisible(RowComponents.OriginInfo);
          await Assertions.checkIfVisible(RowComponents.GasFeesDetails);
          await Assertions.checkIfVisible(RowComponents.AdvancedDetails);

          // Check spending cap is visible and has the correct value
          await Assertions.checkIfElementToHaveText(
            TokenApproveConfirmation.SpendingCapValue,
            '1',
          );

          // Change the spending cap to 10 and save it
          await TokenApproveConfirmation.tapEditSpendingCapButton();
          await TokenApproveConfirmation.inputSpendingCap('5');
          await TokenApproveConfirmation.tapEditSpendingCapSaveButton();
          await Assertions.checkIfElementToHaveText(
            TokenApproveConfirmation.SpendingCapValue,
            '5',
          );

          // Accept confirmation
          await FooterActions.tapConfirmButton();

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.checkIfTextIsDisplayed('Increase Allowance');
          await Assertions.checkIfTextIsDisplayed('Confirmed');
        },
      );
    });
  },
);
