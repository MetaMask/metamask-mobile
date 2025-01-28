'use strict';
import Assertions from '../../../utils/Assertions';
import Browser from '../../../pages/Browser/BrowserView';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import RequestTypes from '../../../pages/Browser/Confirmations/RequestTypes';
// import SecurityAlerts from '../../../pages/Browser/Confirmations/SecurityAlerts';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import TestHelpers from '../../../helpers';
import { loginToApp } from '../../../viewHelper';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import { withFixtures } from '../../../fixtures/fixture-helper';
import ConfirmationView from '../../../pages/Confirmation/ConfirmationView';

const typedSignRequestBody = {
  method: 'eth_signTypedData',
  params: [
    [
      { type: 'string', name: 'Message', value: 'Hi, Alice!' },
      { type: 'uint32', name: 'A number', value: '1337' },
    ],
    '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
  ],
  origin: 'localhost',
};

describe(SmokeConfirmationsRedesigned('Security Alert API - Signature'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  const runTest = async (testSpecificMock, alertAssertion) => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withSepoliaNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [
            mockEvents.GET.securityAlertApiSupportedChains,
            ...(testSpecificMock.GET ?? []),
          ],
          POST: [...(testSpecificMock.POST ?? [])],
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();
        await TestDApp.tapTypedSignButton();
        await Assertions.checkIfVisible(RequestTypes.TypedSignRequest);
        await alertAssertion();
      },
    );
  };

  it('should sign typed message', async () => {
    const testSpecificMock = {
      POST: [
        {
          ...mockEvents.POST.securityAlertApiValidate,
          requestBody: typedSignRequestBody,
        },
      ],
    };

    await runTest(testSpecificMock, async () => {
      try {
        await Assertions.checkIfNotVisible(
          ConfirmationView.securityAlertBanner,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('The banner alert is not visible');
      }
    });
  });

  it('should show security alert for malicious request', async () => {
    const testSpecificMock = {
      POST: [
        {
          ...mockEvents.POST.securityAlertApiValidate,
          requestBody: typedSignRequestBody,
          response: {
            block: 20733277,
            result_type: 'Malicious',
            reason: 'malicious_domain',
            description: `You're interacting with a malicious domain. If you approve this request, you might lose your assets.`,
            features: [],
          },
        },
      ],
    };

    await runTest(testSpecificMock, async () => {
      await Assertions.checkIfVisible(ConfirmationView.securityAlertBanner);
    });
  });

  it('should show security alert for error when validating request fails', async () => {
    const testSpecificMock = {
      GET: [
        {
          urlEndpoint:
            'https://static.cx.metamask.io/api/v1/confirmations/ppom/ppom_version.json',
          responseCode: 500,
        },
      ],
      POST: [
        {
          ...mockEvents.POST.securityAlertApiValidate,
          requestBody: typedSignRequestBody,
          response: {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred on the server.',
          },
          responseCode: 500,
        },
      ],
    };

    await runTest(testSpecificMock, async () => {
      await Assertions.checkIfVisible(
        ConfirmationView.securityAlertResponseFailedBanner,
      );
    });
  });
});
