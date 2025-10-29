'use strict';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { DappVariants, defaultGanacheOptions } from '../../framework/Constants';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionAccounts } from '../../tags';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import ErrorBoundaryView from '../../pages/ErrorBoundaryView/ErrorBoundaryView';
import {
  AnvilPort,
  buildPermissions,
} from '../../framework/fixtures/FixtureUtils';
import { setupMockPostRequest } from '../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import {
  SECURITY_ALERTS_BENIGN_RESPONSE,
  SECURITY_ALERTS_REQUEST_BODY,
  securityAlertsUrl,
} from '../../api-mocking/mock-responses/security-alerts-mock';
import { LocalNode } from '../../framework/types';

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
          const node = localNodes?.[0] as unknown as { getPort?: () => number };
          const anvilPort = node?.getPort ? node.getPort() : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${anvilPort ?? AnvilPort()}`,
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

        await TabBarComponent.tapBrowser();
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
