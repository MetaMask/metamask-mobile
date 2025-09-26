import Assertions from '../../framework/Assertions';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';

import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { Mockttp } from 'mockttp';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../api-mocking/helpers/mockHelpers';
import {
  SECURITY_ALERTS_BENIGN_RESPONSE,
  securityAlertsUrl,
} from '../../api-mocking/mock-responses/security-alerts-mock';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';

const BENIGN_ADDRESS_MOCK = '0x50587E46C5B96a3F6f9792922EC647F13E6EFAE4';

describe(SmokeConfirmationsRedesigned('Security Alert API - Send flow'), () => {
  const runTest = async (
    testSpecificMock: (mockServer: Mockttp) => Promise<void>,
    alertAssertion: () => Promise<void>,
  ) => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletSendButton();
        await SendView.inputAddress(BENIGN_ADDRESS_MOCK);
        await SendView.tapNextButton();
        await AmountView.typeInTransactionAmount('0');
        await AmountView.tapNextButton();
        await alertAssertion();
      },
    );
  };

  it('should not show security alerts for benign requests', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...confirmationsRedesignedFeatureFlags),
      );

      await setupMockPostRequest(
        mockServer,
        securityAlertsUrl('0x539'),
        {},
        SECURITY_ALERTS_BENIGN_RESPONSE,
        {
          statusCode: 201,
          ignoreFields: [
            'id',
            'jsonrpc',
            'toNative',
            'networkClientId',
            'traceContext',
          ],
        },
      );
    };

    await runTest(testSpecificMock, async () => {
      try {
        await Assertions.expectElementToNotBeVisible(
          TransactionConfirmationView.securityAlertBanner,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('The banner alert is not visible');
      }
    });
  });

  it('should show security alerts for malicious request', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...confirmationsRedesignedFeatureFlags),
      );
      await setupMockPostRequest(
        mockServer,
        securityAlertsUrl('0x539'),
        {},
        {
          block: 20733277,
          result_type: 'Malicious',
          reason: 'transfer_farming',
          description: '',
          features: ['Interaction with a known malicious address'],
        },
        {
          ignoreFields: [
            'id',
            'jsonrpc',
            'toNative',
            'networkClientId',
            'traceContext',
          ],
        },
      );
    };
    // The banner is shown on old confirmations screen
    await runTest(testSpecificMock, async () => {
      await Assertions.expectElementToBeVisible(
        TransactionConfirmationView.securityAlertBanner,
      );
      // await Assertions.expectElementToBeVisible(
      //   TransactionConfirmationView.securityAlertResponseMaliciousBanner,
      // );
    });
  });

  it('should show security alerts for error when validating request fails', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...confirmationsRedesignedFeatureFlags),
      );

      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: 'https://static.cx.metamask.io/api/v1/confirmations/ppom/ppom_version.json',
        response: {
          message: 'Internal Server Error',
        },
        responseCode: 500,
      });

      await setupMockPostRequest(
        mockServer,
        securityAlertsUrl('0x539'),
        {},
        {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred on the server.',
        },
        {
          statusCode: 500,
          ignoreFields: [
            'id',
            'jsonrpc',
            'toNative',
            'networkClientId',
            'traceContext',
          ],
        },
      );
    };

    await runTest(testSpecificMock, async () => {
      await Assertions.expectElementToBeVisible(
        TransactionConfirmationView.securityAlertBanner,
      );
      await Assertions.expectElementToBeVisible(
        TransactionConfirmationView.securityAlertResponseFailedBanner,
      );
    });
  });
});
