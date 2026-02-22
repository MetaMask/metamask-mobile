import Assertions from '../../../framework/Assertions';
import Browser from '../../../../e2e/pages/Browser/BrowserView';
import FooterActions from '../../../../e2e/pages/Browser/Confirmations/FooterActions';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import RequestTypes from '../../../../e2e/pages/Browser/Confirmations/RequestTypes';
import TestDApp from '../../../../e2e/pages/Browser/TestDApp';
import { loginToApp, navigateToBrowserView } from '../../../../e2e/viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { SmokeConfirmations } from '../../../../e2e/tags';
import {
  buildPermissions,
  AnvilPort,
} from '../../../framework/fixtures/FixtureUtils';
import RowComponents from '../../../../e2e/pages/Browser/Confirmations/RowComponents';
import { DappVariants } from '../../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../framework/types';
import { AnvilManager } from '../../../seeder/anvil-manager';

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

describe(SmokeConfirmations('Typed Signature Requests'), () => {
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
