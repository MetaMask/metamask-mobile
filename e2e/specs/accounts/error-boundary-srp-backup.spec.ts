'use strict';
import Browser from '../../pages/Browser/BrowserView';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import {
  DappVariants,
  defaultGanacheOptions,
} from '../../../tests/framework/Constants';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { RegressionAccounts } from '../../tags';
import TestHelpers from '../../helpers';
import Assertions from '../../../tests/framework/Assertions';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import ErrorBoundaryView from '../../pages/ErrorBoundaryView/ErrorBoundaryView';
import {
  AnvilPort,
  buildPermissions,
} from '../../../tests/framework/fixtures/FixtureUtils';
import { setupMockPostRequest } from '../../../tests/api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import {
  SECURITY_ALERTS_BENIGN_RESPONSE,
  SECURITY_ALERTS_REQUEST_BODY,
  securityAlertsUrl,
} from '../../../tests/api-mocking/mock-responses/security-alerts-mock';
import { LocalNode } from '../../../tests/framework/types';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

const PASSWORD = '123123123';

describe(RegressionAccounts('Error Boundary Screen'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should trigger error boundary screen to reveal SRP', async () => {
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
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupMockPostRequest(
            mockServer,
            securityAlertsUrl('0x539'),
            SECURITY_ALERTS_REQUEST_BODY,
            SECURITY_ALERTS_BENIGN_RESPONSE,
            {
              statusCode: 201,
            },
          );
        },
      },
      async () => {
        await loginToApp();

        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        await TestDApp.tapInvalidSigButton();
        await Assertions.expectElementToBeVisible(ErrorBoundaryView.title);
        await ErrorBoundaryView.tapSRPLinkText();

        await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
          PASSWORD,
        );
        // If the following step fails, ensure you are using a test build with tap and hold to reveal animation disabled
        await RevealSecretRecoveryPhrase.tapToReveal();
        await Assertions.expectElementToBeVisible(
          RevealSecretRecoveryPhrase.container,
        );

        await Assertions.expectTextDisplayed(defaultGanacheOptions.mnemonic);
      },
    );
  });
});
