import { SMART_CONTRACTS } from '../../../../app/util/test/smart-contracts';
import { SmokeConfirmations } from '../../../tags';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import Assertions from '../../../../tests/framework/Assertions';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import {
  buildPermissions,
  AnvilPort,
} from '../../../../tests/framework/fixtures/FixtureUtils';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../tests/api-mocking/mock-responses/simulations';
import TestDApp from '../../../pages/Browser/TestDApp';
import { DappVariants } from '../../../../tests/framework/Constants';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../../tests/api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationFeatureFlags } from '../../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../../tests/framework/types';
import { AnvilManager } from '../../../../tests/seeder/anvil-manager';
import Browser from '../../../pages/Browser/BrowserView';

describe(SmokeConfirmations('Contract Interaction'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

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
  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('submits transaction', async () => {
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
        smartContracts: [NFT_CONTRACT],
      },
      async ({ contractRegistry }) => {
        const nftsAddress =
          await contractRegistry?.getContractAddress(NFT_CONTRACT);
        await loginToApp();

        // Navigate to the browser screen
        await navigateToBrowserView();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });

        await TestDApp.tapERC721MintButton();

        // Check all expected elements are visible
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );

        await Assertions.expectElementToBeVisible(RowComponents.AccountNetwork);
        await Assertions.expectElementToBeVisible(
          RowComponents.SimulationDetails,
        );
        await Assertions.expectElementToBeVisible(
          RowComponents.NetworkAndOrigin,
        );
        await Assertions.expectElementToBeVisible(RowComponents.GasFeesDetails);
        await Assertions.expectElementToBeVisible(
          RowComponents.AdvancedDetails,
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
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });
});
