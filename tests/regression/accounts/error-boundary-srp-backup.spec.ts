'use strict';
import Browser from '../../../e2e/pages/Browser/BrowserView.ts';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper.ts';
import TestDApp from '../../../e2e/pages/Browser/TestDApp.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import {
  DappVariants,
  defaultGanacheOptions,
} from '../../framework/Constants.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { RegressionAccounts } from '../../../e2e/tags';
import TestHelpers from '../../../e2e/helpers';
import Assertions from '../../framework/Assertions.ts';
import RevealSecretRecoveryPhrase from '../../../e2e/pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase.ts';
import ErrorBoundaryView from '../../../e2e/pages/ErrorBoundaryView/ErrorBoundaryView.ts';
import {
  AnvilPort,
  buildPermissions,
} from '../../framework/fixtures/FixtureUtils.ts';
import { setupMockPostRequest } from '../../api-mocking/helpers/mockHelpers.ts';
import { Mockttp } from 'mockttp';
import {
  SECURITY_ALERTS_BENIGN_RESPONSE,
  SECURITY_ALERTS_REQUEST_BODY,
  securityAlertsUrl,
} from '../../api-mocking/mock-responses/security-alerts-mock.ts';
import { LocalNode } from '../../framework/types.ts';
import { AnvilManager } from '../../seeder/anvil-manager.ts';

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
