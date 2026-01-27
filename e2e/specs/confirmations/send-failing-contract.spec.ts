import { RegressionConfirmations } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import Assertions from '../../../tests/framework/Assertions';
import {
  buildPermissions,
  AnvilPort,
} from '../../../tests/framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../tests/framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../tests/framework/types';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

describe.skip(RegressionConfirmations('Failing contracts'), () => {
  const FAILING_CONTRACT = SMART_CONTRACTS.FAILING;

  it('sends a failing contract transaction', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
      );
    };

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
        smartContracts: [FAILING_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const failingAddress =
          await contractRegistry?.getContractAddress(FAILING_CONTRACT);
        await loginToApp();

        // Navigate to the browser screen
        await navigateToBrowserView();
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
