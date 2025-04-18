'use strict';
import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../../viewHelper';
import SigningBottomSheet from '../../../pages/Browser/SigningBottomSheet';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import TestHelpers from '../../../helpers';
import Assertions from '../../../utils/Assertions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import ConfirmationView from '../../../pages/Confirmation/ConfirmationView';
import { SmokeConfirmations } from '../../../tags';
import { buildPermissions } from '../../../fixtures/utils';

describe(SmokeConfirmations('Security Alert API - Signature'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  const defaultFixture = new FixtureBuilder()
    .withSepoliaNetwork()
    .withPermissionControllerConnectedToTestDapp(buildPermissions(['0xaa36a7']))
    .withChainPermissions(['0xaa36a7'])
    .build();

  const navigateToTestDApp = async () => {
    await loginToApp();
    await TabBarComponent.tapBrowser();
    await Browser.navigateToTestDApp();
    await TestDApp.tapTypedSignButton();
    await Assertions.checkIfVisible(SigningBottomSheet.typedRequest);
  };

  const runTest = async (testSpecificMock, alertAssertion) => {
    await withFixtures(
      {
        dapp: true,
        fixture: defaultFixture,
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await navigateToTestDApp();
        await alertAssertion();
      },
    );
  };

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

  it('should sign typed message', async () => {
    const testSpecificMock = {
      GET: [mockEvents.GET.remoteFeatureFlagsOldConfirmations],
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
      GET: [mockEvents.GET.remoteFeatureFlagsOldConfirmations],
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
        mockEvents.GET.remoteFeatureFlagsOldConfirmations,
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
