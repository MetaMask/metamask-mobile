import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../../viewHelper';
import SigningBottomSheet from '../../../pages/Browser/SigningBottomSheet';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import ConfirmationView from '../../../pages/Confirmation/ConfirmationView';
import { SmokeConfirmations } from '../../../tags';
import { buildPermissions } from '../../../framework/fixtures/FixtureUtils';
import { MockApiEndpoint } from '../../../framework/types';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeConfirmations('Security Alert API - Signature'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  const defaultFixture = new FixtureBuilder()
    .withSepoliaNetwork()
    .withPermissionControllerConnectedToTestDapp(buildPermissions(['0xaa36a7']))
    .build();

  const navigateToTestDAppAndTapTypedSignButton = async () => {
    await loginToApp();
    await TabBarComponent.tapBrowser();
    await Browser.navigateToTestDApp();
    await TestDApp.tapTypedSignButton();
    await Assertions.expectElementToBeVisible(SigningBottomSheet.typedRequest);
  };

  const runTest = async (
    testSpecificMock: {
      GET?: MockApiEndpoint[];
      POST?: MockApiEndpoint[];
    },
    alertAssertion: () => Promise<void>,
  ) => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: defaultFixture,
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await navigateToTestDAppAndTapTypedSignButton();
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
      '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
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
      await Assertions.expectElementToNotBeVisible(
        ConfirmationView.securityAlertBanner,
      );
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
          ignoreFields: [
            'id',
            'jsonrpc',
            'toNative',
            'networkClientId',
            'traceContext',
          ],
        },
      ],
    };

    await runTest(testSpecificMock, async () => {
      await Assertions.expectElementToBeVisible(
        ConfirmationView.securityAlertBanner,
      );
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
          response: {
            message: 'Internal Server Error',
          },
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
      await Assertions.expectElementToBeVisible(
        ConfirmationView.securityAlertResponseFailedBanner,
      );
    });
  });
});
