import Assertions from '../../../../tests/framework/Assertions';
import Browser from '../../../pages/Browser/BrowserView';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import RequestTypes from '../../../pages/Browser/Confirmations/RequestTypes';
import TestDApp from '../../../pages/Browser/TestDApp';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import {
  buildPermissions,
  AnvilPort,
} from '../../../../tests/framework/fixtures/FixtureUtils';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import { DappVariants } from '../../../../tests/framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationFeatureFlags } from '../../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../../tests/framework/types';
import { AnvilManager } from '../../../../tests/seeder/anvil-manager';

const SIGNATURE_LIST = [
  {
    specName: 'Typed V1 Sign',
    testDappBtn: TestDApp.tapTypedSignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
    additionAssertions: async () => {
      await Assertions.expectElementToBeVisible(RowComponents.NetworkAndOrigin);
    },
  },
  {
    specName: 'Typed V3 Sign',
    testDappBtn: TestDApp.tapTypedV3SignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
    additionAssertions: async () => {
      await Assertions.expectElementToBeVisible(RowComponents.OriginInfo);
    },
  },
  {
    specName: 'Typed V4 Sign',
    testDappBtn: TestDApp.tapTypedV4SignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
    additionAssertions: async () => {
      await Assertions.expectElementToBeVisible(RowComponents.OriginInfo);
    },
  },
];

describe(SmokeConfirmationsRedesigned('Typed Signature Requests'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...confirmationFeatureFlags),
    );
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  for (const {
    specName,
    testDappBtn,
    requestType,
    additionAssertions,
  } of SIGNATURE_LIST) {
    it(`should sign ${specName} message`, async () => {
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

          // cancel request
          await testDappBtn();
          await Assertions.expectElementToBeVisible(requestType);
          await FooterActions.tapCancelButton();
          await Assertions.expectElementToNotBeVisible(requestType);

          await testDappBtn();
          await Assertions.expectElementToBeVisible(requestType);

          // check different sections are visible
          await Assertions.expectElementToBeVisible(
            RowComponents.AccountNetwork,
          );
          await Assertions.expectElementToBeVisible(RowComponents.Message);

          // any signature specific additional assertions
          if (additionAssertions) {
            await additionAssertions();
          }

          // confirm request
          await FooterActions.tapConfirmButton();
          await Assertions.expectElementToNotBeVisible(requestType);
        },
      );
    });
  }
});
