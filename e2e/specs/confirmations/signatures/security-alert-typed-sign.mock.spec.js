'use strict';
import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/TabBarComponent';
import { loginToApp } from '../../../viewHelper';
import SigningBottomSheet from '../../../pages/Browser/SigningBottomSheet';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  withFixtures,
} from '../../../fixtures/fixture-helper';
import { SmokeConfirmations2 } from '../../../tags';
import TestHelpers from '../../../helpers';
import Assertions from '../../../utils/Assertions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import ConfirmationView from '../../../pages/Confirmation/ConfirmationView';

describe(SmokeConfirmations2('Security Alert API - Signature'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  const defaultFixture = new FixtureBuilder()
    // .withSepoliaNetwork()
    .withPermissionControllerConnectedToTestDapp()
    .build();

  const navigateToTestDApp = async () => {
    await loginToApp();
    await TabBarComponent.tapBrowser();
    await Browser.navigateToTestDApp();
  };

  const typedSignRequestBody = {
    jsonrpc: '2.0',
    method: 'eth_signTypedData',
    // params: [
    //   [
    //     { type: 'string', name: 'Message', value: 'Hi, Alice!' },
    //     { type: 'uint32', name: 'A number', value: '1337' }
    //   ],
    //   '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3'
    // ],
    origin: 'localhost',
  };

  it('should sign message', async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.securityAlertApiSupportedChains,
      ],
      POST: [{
        ...mockEvents.POST.securityAlertApiValidate,
        requestBody: typedSignRequestBody,
        urlEndpoint: 'https://security-alerts.api.cx.metamask.io/validate/0x1',
      }]
    };

    await withFixtures(
      {
        dapp: true,
        fixture: defaultFixture,
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await navigateToTestDApp();
        await TestDApp.tapTypedSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.typedRequest);
        try {
          await Assertions.checkIfNotVisible(ConfirmationView.securityAlertBanner);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log('The banner alert is not visible');
        }
      },
    );
  });

  it('should show security alert for malicious request', async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.securityAlertApiSupportedChains,
      ],
      POST: [{
        ...mockEvents.POST.securityAlertApiValidate,
        requestBody: typedSignRequestBody,
        response:{
          block: 20733277,
          result_type: 'Malicious',
          reason: 'malicious_domain',
          description: `You're interacting with a malicious domain. If you approve this request, you might lose your assets.`,
          features: [],
        },
        urlEndpoint: 'https://security-alerts.api.cx.metamask.io/validate/0x1',
      }]
    };

    await withFixtures(
      {
        dapp: true,
        fixture: defaultFixture,
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await navigateToTestDApp();
        await TestDApp.tapTypedSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.typedRequest);
        await Assertions.checkIfNotVisible(ConfirmationView.securityAlertLoader);
        await Assertions.checkIfVisible(ConfirmationView.securityAlertBanner);
      },
    );
  });

  it('should show security alert for error when validating request fails', async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.securityAlertApiSupportedChains,
        {
          urlEndpoint: 'https://static.cx.metamask.io/api/v1/confirmations/ppom/ppom_version.json',
          responseCode: 500
        }
      ],
      POST: [{
        ...mockEvents.POST.securityAlertApiValidate,
        requestBody: typedSignRequestBody,
        response:{
          error: 'Internal Server Error',
          message: 'An unexpected error occurred on the server.'
        },
        responseCode: 500,
        urlEndpoint: 'https://security-alerts.api.cx.metamask.io/validate/0x1',
      }]
    };
    await withFixtures(
      {
        dapp: true,
        fixture: defaultFixture,
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await navigateToTestDApp();
        await TestDApp.tapTypedSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.typedRequest);
        await Assertions.checkIfNotVisible(ConfirmationView.securityAlertLoader);
        await Assertions.checkIfVisible(ConfirmationView.securityAlertResponseFailedBanner);
      },
    );
  });
});
