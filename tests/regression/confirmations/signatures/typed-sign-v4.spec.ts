import Browser from '../../../page-objects/Browser/BrowserView';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../page-objects/viewHelper.ts';
import SigningBottomSheet from '../../../page-objects/Browser/SigningBottomSheet';
import TestDApp from '../../../page-objects/Browser/TestDApp';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';
import {
  buildPermissions,
  AnvilPort,
} from '../../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { RegressionConfirmations } from '../../../tags';
import { LocalNode } from '../../../framework/types';
import { AnvilManager } from '../../../seeder/anvil-manager';

describe(RegressionConfirmations('Typed Sign V4'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
    );
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('should sign typed V4 message', async () => {
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
        await TestDApp.tapTypedV4SignButton();
        await Assertions.expectElementToBeVisible(
          SigningBottomSheet.typedRequest,
        );
        await SigningBottomSheet.tapCancelButton();
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.typedRequest,
        );
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.personalRequest,
        );
        await TestDApp.tapTypedV4SignButton();

        await SigningBottomSheet.tapSignButton();
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.typedRequest,
        );
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.personalRequest,
        );
      },
    );
  });
});
