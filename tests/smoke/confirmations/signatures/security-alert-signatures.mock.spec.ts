import Assertions from '../../../framework/Assertions';
import Browser from '../../../page-objects/Browser/BrowserView';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import RequestTypes from '../../../page-objects/Browser/Confirmations/RequestTypes';
import AlertSystem from '../../../page-objects/Browser/Confirmations/AlertSystem';
import TestDApp from '../../../page-objects/Browser/TestDApp';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../page-objects/viewHelper.ts';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import {
  buildPermissions,
  getTestDappLocalUrl,
} from '../../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../framework/Constants';
import { Mockttp } from 'mockttp';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../../api-mocking/helpers/mockHelpers';
import {
  SECURITY_ALERTS_BENIGN_RESPONSE,
  securityAlertsUrl,
} from '../../../api-mocking/mock-responses/security-alerts-mock';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks';

const typedSignRequestBody = {
  method: 'eth_signTypedData',
  params: [
    [
      { type: 'string', name: 'Message', value: 'Hi, Alice!' },
      { type: 'uint32', name: 'A number', value: '1337' },
    ],
    '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
  ],
};

describe(SmokeConfirmationsRedesigned('Security Alert API - Signature'), () => {
  const runTest = async (
    testSpecificMock: (mockServer: Mockttp) => Promise<void>,
    alertAssertion: () => Promise<void>,
  ) => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withSepoliaNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0xaa36a7']),
          )
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();
        await TestDApp.tapTypedSignButton();
        await Assertions.expectElementToBeVisible(
          RequestTypes.TypedSignRequest,
        );
        await alertAssertion();
      },
    );
  };

  it('should sign typed message', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...confirmationsRedesignedFeatureFlags),
      );

      await setupMockPostRequest(
        mockServer,
        securityAlertsUrl('0xaa36a7'),
        { ...typedSignRequestBody, origin: getTestDappLocalUrl() },
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
      await Assertions.expectElementToNotBeVisible(
        AlertSystem.securityAlertBanner,
      );
    });
  });

  it('should show security alert for malicious request', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...confirmationsRedesignedFeatureFlags),
      );

      await setupMockPostRequest(
        mockServer,
        'https://security-alerts.api.cx.metamask.io/validate/0xaa36a7',
        { ...typedSignRequestBody, origin: getTestDappLocalUrl() },
        {
          block: 20733277,
          result_type: 'Malicious',
          reason: 'malicious_domain',
          description: `You're interacting with a malicious domain. If you approve this request, you might lose your assets.`,
          features: [],
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

    await runTest(testSpecificMock, async () => {
      await Assertions.expectElementToBeVisible(
        AlertSystem.securityAlertBanner,
      );
      await Assertions.expectElementToBeVisible(
        AlertSystem.securityAlertResponseMaliciousBanner,
      );
    });
  });

  it('should show security alert for error when validating request fails', async () => {
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
        'https://security-alerts.api.cx.metamask.io/validate/0xaa36a7',
        { ...typedSignRequestBody, origin: getTestDappLocalUrl() },
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
        AlertSystem.securityAlertBanner,
      );
      await Assertions.expectElementToBeVisible(
        AlertSystem.securityAlertResponseFailedBanner,
      );
    });
  });
});
