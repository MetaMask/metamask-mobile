import { SMART_CONTRACTS } from '../../../../../app/util/test/smart-contracts';
import { SmokeConfirmations } from '../../../../../e2e/tags';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../../e2e/viewHelper';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../../../../e2e/pages/wallet/TabBarComponent';
import Browser from '../../../../../e2e/pages/Browser/BrowserView';
import ConfirmationUITypes from '../../../../../e2e/pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../../../e2e/pages/Browser/Confirmations/FooterActions';
import Assertions from '../../../../framework/Assertions';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import {
  AnvilPort,
  buildPermissions,
} from '../../../../framework/fixtures/FixtureUtils';
import RowComponents from '../../../../../e2e/pages/Browser/Confirmations/RowComponents';
import TokenApproveConfirmation from '../../../../../e2e/pages/Confirmation/TokenApproveConfirmation';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations';
import TestDApp from '../../../../../e2e/pages/Browser/TestDApp';
import { DappVariants } from '../../../../framework/Constants';
import { setupMockRequest } from '../../../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationFeatureFlags } from '../../../../api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../../framework/types';
import { AnvilManager } from '../../../../seeder/anvil-manager';

describe(SmokeConfirmations('Token Approve - setApprovalForAll method'), () => {
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
      Object.assign({}, ...confirmationFeatureFlags),
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
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(['0x539']),
            )
            .build();
        },
        restartDevice: true,
        testSpecificMock,
        smartContracts: [ERC_721_CONTRACT],
      },
      async ({ contractRegistry }) => {
        const erc721Address =
          await contractRegistry?.getContractAddress(ERC_721_CONTRACT);

        await loginToApp();

        await navigateToBrowserView();
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
          {
            description: 'Account Network',
          },
        );
        await Assertions.expectElementToBeVisible(RowComponents.ApproveRow, {
          description: 'Approve Row',
        });
        await Assertions.expectElementToBeVisible(
          RowComponents.NetworkAndOrigin,
          {
            description: 'Network And Origin',
          },
        );
        await Assertions.expectElementToBeVisible(
          RowComponents.GasFeesDetails,
          {
            description: 'Gas Fees Details',
          },
        );
        await Assertions.expectElementToBeVisible(
          RowComponents.AdvancedDetails,
          {
            description: 'Advanced Details',
          },
        );

        // Check spending cap is visible and has the correct value
        await Assertions.expectElementToHaveText(
          TokenApproveConfirmation.SpendingCapValue,
          'All',
          {
            description: 'Spending Cap Value',
          },
        );

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Wait for browser screen to be visible after confirmation modal dismisses
        await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
          description:
            'Browser screen should be visible after confirming transaction',
        });

        // Close browser to reveal app tab bar, then check activity
        await Browser.tapCloseBrowserButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Set approval for all');
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
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(['0x539']),
            )
            .build();
        },
        restartDevice: true,
        testSpecificMock,
        smartContracts: [ERC_1155_CONTRACT],
      },
      async ({ contractRegistry }) => {
        const erc1155Address =
          await contractRegistry?.getContractAddress(ERC_1155_CONTRACT);

        await loginToApp();

        await navigateToBrowserView();
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

        // Wait for browser screen to be visible after confirmation modal dismisses
        await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
          description:
            'Browser screen should be visible after confirming transaction',
        });

        // Close browser to reveal app tab bar, then check activity
        await Browser.tapCloseBrowserButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Set approval for all');
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
          fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
            const node = localNodes?.[0] as unknown as AnvilManager;
            const rpcPort =
              node instanceof AnvilManager
                ? (node.getPort() ?? AnvilPort())
                : undefined;

            return new FixtureBuilder()
              .withNetworkController({
                providerConfig: {
                  chainId: '0x539',
                  rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                  type: 'custom',
                  nickname: 'Local RPC',
                  ticker: 'ETH',
                },
              })
              .withPermissionControllerConnectedToTestDapp(
                buildPermissions(['0x539']),
              )
              .build();
          },
          restartDevice: true,
          testSpecificMock,
          smartContracts: [ERC_721_CONTRACT],
        },
        async ({ contractRegistry }) => {
          const erc721Address =
            await contractRegistry?.getContractAddress(ERC_721_CONTRACT);

          await loginToApp();

          await navigateToBrowserView();
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

          // Close browser to reveal app tab bar, then check activity
          await Browser.tapCloseBrowserButton();
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Set approval for all');
          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });
  });
});
