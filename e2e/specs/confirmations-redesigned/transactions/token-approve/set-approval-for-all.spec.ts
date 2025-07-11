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
  SmokeConfirmationsRedesigned('Token Approve - setApprovalForAll method'),
  () => {
    const ERC_721_CONTRACT = SMART_CONTRACTS.NFTS;
    const ERC_1155_CONTRACT = SMART_CONTRACTS.ERC1155;

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

    it('creates an approve transaction confirmation for given ERC721 and submits it', async () => {
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
          smartContract: ERC_721_CONTRACT,
        },
        // Remove any once withFixtures is typed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async ({ contractRegistry }: { contractRegistry: any }) => {
          const erc721Address = await contractRegistry.getContractAddress(
            ERC_721_CONTRACT,
          );

          await loginToApp();

          await TabBarComponent.tapBrowser();
          await TestDApp.navigateToTestDappWithContract({
            contractAddress: erc721Address,
          });

          await TestDApp.tapNFTSetApprovalForAllButton();

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
            'All',
          );

          // Accept confirmation
          await FooterActions.tapConfirmButton();

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.checkIfTextIsDisplayed('Set Approval For All');
          await Assertions.checkIfTextIsDisplayed('Confirmed');
        },
      );
    });

    it('creates an approve transaction confirmation for given ERC1155 and submits it', async () => {
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
          smartContract: ERC_1155_CONTRACT,
        },
        // Remove any once withFixtures is typed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async ({ contractRegistry }: { contractRegistry: any }) => {
          const erc1155Address = await contractRegistry.getContractAddress(
            ERC_1155_CONTRACT,
          );

          await loginToApp();

          await TabBarComponent.tapBrowser();
          await TestDApp.navigateToTestDappWithContract({
            contractAddress: erc1155Address,
          });

          await TestDApp.tapERC1155SetApprovalForAllButton();

          // Check confirmation modal is visible
          await Assertions.checkIfVisible(
            ConfirmationUITypes.ModalConfirmationContainer,
          );

          // Check spending cap is visible and has the correct value
          await Assertions.checkIfElementToHaveText(
            TokenApproveConfirmation.SpendingCapValue,
            'All',
          );

          // Accept confirmation
          await FooterActions.tapConfirmButton();

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.checkIfTextIsDisplayed('Set Approval For All');
          await Assertions.checkIfTextIsDisplayed('Confirmed');
        },
      );
    });

    describe('revoke mode', () => {
      it('creates an approve transaction confirmation for ERC 721 and submits it', async () => {
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
            smartContract: ERC_721_CONTRACT,
          },
          // Remove any once withFixtures is typed
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async ({ contractRegistry }: { contractRegistry: any }) => {
            const erc721Address = await contractRegistry.getContractAddress(
              ERC_721_CONTRACT,
            );

            await loginToApp();

            await TabBarComponent.tapBrowser();
            await TestDApp.navigateToTestDappWithContract({
              contractAddress: erc721Address,
            });

            await TestDApp.tapERC721RevokeApprovalButton();

            // Check confirmation modal is visible
            await Assertions.checkIfVisible(
              ConfirmationUITypes.ModalConfirmationContainer,
            );

            // Check spending cap is visible and has the correct value
            // All means, all token permissions revoked
            await Assertions.checkIfElementToHaveText(
              TokenApproveConfirmation.SpendingCapValue,
              'All',
            );

            // Accept confirmation
            await FooterActions.tapConfirmButton();

            // Check activity tab
            await TabBarComponent.tapActivity();
            await Assertions.checkIfTextIsDisplayed('Set Approval For All');
            await Assertions.checkIfTextIsDisplayed('Confirmed');
          },
        );
      });
    });
  },
);
