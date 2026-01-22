import Browser from '../../../pages/Browser/BrowserView';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import SigningBottomSheet from '../../../pages/Browser/SigningBottomSheet';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';
import {
  buildPermissions,
  AnvilPort,
} from '../../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../framework/Constants';
import { RegressionConfirmations } from '../../../tags';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../framework/types';
import { AnvilManager } from '../../../seeder/anvil-manager';

describe(RegressionConfirmations('Ethereum Sign'), () => {
  it('Sign in with Ethereum', async () => {
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
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        await TestDApp.tapEthereumSignButton();
        await Assertions.expectElementToBeVisible(
          SigningBottomSheet.personalRequest,
        );
        await SigningBottomSheet.tapCancelButton();
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.personalRequest,
        );

        await TestDApp.tapEthereumSignButton();
        await Assertions.expectElementToBeVisible(
          SigningBottomSheet.personalRequest,
        );
        await SigningBottomSheet.tapSignButton();
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.personalRequest,
        );
      },
    );
  });
});
