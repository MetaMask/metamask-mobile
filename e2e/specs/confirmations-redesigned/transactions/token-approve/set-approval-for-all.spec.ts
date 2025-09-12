import { SMART_CONTRACTS } from '../../../../../app/util/test/smart-contracts';
import { SmokeConfirmationsRedesigned } from '../../../../tags';
import { loginToApp } from '../../../../viewHelper';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../../pages/Browser/Confirmations/FooterActions';
import Assertions from '../../../../framework/Assertions';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../../../framework/fixtures/FixtureUtils';
import RowComponents from '../../../../pages/Browser/Confirmations/RowComponents';
import TokenApproveConfirmation from '../../../../pages/Confirmation/TokenApproveConfirmation';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations';
import TestDApp from '../../../../pages/Browser/TestDApp';
import { DappVariants } from '../../../../framework/Constants';
import { setupMockRequest } from '../../../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../../../api-mocking/mock-responses/feature-flags-mocks';

describe(
  SmokeConfirmationsRedesigned('Token Approve - setApprovalForAll method'),
  () => {
    const ERC_721_CONTRACT = SMART_CONTRACTS.NFTS;
    const ERC_1155_CONTRACT = SMART_CONTRACTS.ERC1155;

    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
        response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
        responseCode: 200,
      });
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...confirmationsRedesignedFeatureFlags),
      );
    };

    it('creates an approve transaction confirmation for given ERC721 and submits it', async () => {
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
          smartContracts: [ERC_721_CONTRACT],
        },
        async ({ contractRegistry }) => {
          const erc721Address = await contractRegistry?.getContractAddress(
            ERC_721_CONTRACT,
          );

          await loginToApp();

          await TabBarComponent.tapBrowser();
          await TestDApp.navigateToTestDappWithContract({
            contractAddress: erc721Address,
          });

          await TestDApp.tapNFTSetApprovalForAllButton();

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
            'All',
          );

          // Accept confirmation
          await FooterActions.tapConfirmButton();

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Set Approval For All');
          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });

    it('creates an approve transaction confirmation for given ERC1155 and submits it', async () => {
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
          smartContracts: [ERC_1155_CONTRACT],
        },
        async ({ contractRegistry }) => {
          const erc1155Address = await contractRegistry?.getContractAddress(
            ERC_1155_CONTRACT,
          );

          await loginToApp();

          await TabBarComponent.tapBrowser();
          await TestDApp.navigateToTestDappWithContract({
            contractAddress: erc1155Address,
          });

          await TestDApp.tapERC1155SetApprovalForAllButton();

          // Check confirmation modal is visible
          await Assertions.expectElementToBeVisible(
            ConfirmationUITypes.ModalConfirmationContainer,
          );

          // Check spending cap is visible and has the correct value
          await Assertions.expectElementToHaveText(
            TokenApproveConfirmation.SpendingCapValue,
            'All',
          );

          // Accept confirmation
          await FooterActions.tapConfirmButton();

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Set Approval For All');
          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });

    describe('revoke mode', () => {
      it('creates an approve transaction confirmation for ERC 721 and submits it', async () => {
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
            smartContracts: [ERC_721_CONTRACT],
          },
          async ({ contractRegistry }) => {
            const erc721Address = await contractRegistry?.getContractAddress(
              ERC_721_CONTRACT,
            );

            await loginToApp();

            await TabBarComponent.tapBrowser();
            await TestDApp.navigateToTestDappWithContract({
              contractAddress: erc721Address,
            });

            await TestDApp.tapERC721RevokeApprovalButton();

            // Check confirmation modal is visible
            await Assertions.expectElementToBeVisible(
              ConfirmationUITypes.ModalConfirmationContainer,
            );

            // Check spending cap is visible and has the correct value
            // All means, all token permissions revoked
            await Assertions.expectElementToHaveText(
              TokenApproveConfirmation.SpendingCapValue,
              'All',
            );

            // Accept confirmation
            await FooterActions.tapConfirmButton();

            // Check activity tab
            await TabBarComponent.tapActivity();
            await Assertions.expectTextDisplayed('Set Approval For All');
            await Assertions.expectTextDisplayed('Confirmed');
          },
        );
      });
    });
  },
);
