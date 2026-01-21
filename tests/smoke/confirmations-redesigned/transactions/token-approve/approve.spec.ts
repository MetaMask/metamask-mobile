import { SMART_CONTRACTS } from '../../../../../app/util/test/smart-contracts';
import { SmokeConfirmationsRedesigned } from '../../../../tags';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../../../page-objects/wallet/TabBarComponent';
import Browser from '../../../../page-objects/Browser/BrowserView';
import ConfirmationUITypes from '../../../../page-objects/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../../page-objects/Browser/Confirmations/FooterActions';
import Assertions from '../../../../framework/Assertions';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import {
  buildPermissions,
  AnvilPort,
} from '../../../../framework/fixtures/FixtureUtils';
import RowComponents from '../../../../page-objects/Browser/Confirmations/RowComponents';
import TokenApproveConfirmation from '../../../../page-objects/Confirmation/TokenApproveConfirmation';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations';
import TestDApp from '../../../../page-objects/Browser/TestDApp';
import { DappVariants } from '../../../../framework/Constants';
import { setupMockRequest } from '../../../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../../../api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../../framework/types';
import { AnvilManager } from '../../../../seeder/anvil-manager';

describe(SmokeConfirmationsRedesigned('Token Approve - approve method'), () => {
  const ERC_20_CONTRACT = SMART_CONTRACTS.HST;
  const ERC_721_CONTRACT = SMART_CONTRACTS.NFTS;

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

  it('creates an approve transaction confirmation for given ERC 20, changes the spending cap and submits it', async () => {
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
        smartContracts: [ERC_20_CONTRACT],
      },
      async ({ contractRegistry }) => {
        const erc20Address =
          await contractRegistry?.getContractAddress(ERC_20_CONTRACT);

        await loginToApp();

        await navigateToBrowserView();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: erc20Address,
        });

        await TestDApp.tapApproveERC20TokensButton();

        // Check confirmation modal is visible
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );

        // Check all expected row components are visible
        await Assertions.expectElementToBeVisible(RowComponents.AccountNetwork);
        await Assertions.expectElementToBeVisible(RowComponents.ApproveRow);
        await Assertions.expectElementToBeVisible(
          RowComponents.NetworkAndOrigin,
        );
        await Assertions.expectElementToBeVisible(RowComponents.GasFeesDetails);
        await Assertions.expectElementToBeVisible(
          RowComponents.AdvancedDetails,
        );

        // Check spending cap is visible and has the correct value
        await Assertions.expectElementToHaveText(
          TokenApproveConfirmation.SpendingCapValue,
          '7',
        );

        // Change the spending cap to 10 and save it
        await TokenApproveConfirmation.tapEditSpendingCapButton();
        await TokenApproveConfirmation.inputSpendingCap('10');
        await TokenApproveConfirmation.tapEditSpendingCapSaveButton();
        await Assertions.expectElementToHaveText(
          TokenApproveConfirmation.SpendingCapValue,
          '10',
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
        await Assertions.expectTextDisplayed('Approve');
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });

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

        await TestDApp.tapApproveERC721TokenButton();

        // Check confirmation modal is visible
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );

        // Check spending cap is visible and has the correct value
        // #1 means the token id for ERC 721
        await Assertions.expectElementToHaveText(
          TokenApproveConfirmation.SpendingCapValue,
          '#1',
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
        await Assertions.expectTextDisplayed('Approve');
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });
});
