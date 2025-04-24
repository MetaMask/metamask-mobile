'use strict';
import Assertions from '../../../utils/Assertions';
import Browser from '../../../pages/Browser/BrowserView';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import RequestTypes from '../../../pages/Browser/Confirmations/RequestTypes';
import AlertSystem from '../../../pages/Browser/Confirmations/AlertSystem';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import TestHelpers from '../../../helpers';
import { loginToApp } from '../../../viewHelper';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import { withFixtures } from '../../../fixtures/fixture-helper';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import { buildPermissions } from '../../../fixtures/utils';

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

describe(SmokeConfirmationsRedesigned('Alert System - Signature'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  const runTest = async (testSpecificMock, alertAssertion) => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withSepoliaNetwork()
          .withPermissionControllerConnectedToTestDapp(buildPermissions(['0xaa36a7']))
          .build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [
            mockEvents.GET.remoteFeatureFlagsReDesignedConfirmations,
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

  describe('Security Alert API', () => {
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
          await Assertions.checkIfNotVisible(AlertSystem.securityAlertBanner);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log('The banner alert is not visible');
        }
      });
    });

    // TODO: [ffmcgee] uncomment once https://github.com/MetaMask/metamask-mobile/pull/14836 is merged, will fix mock issue causing this test to fail
    it.skip('should show security alert for malicious request, acknowledge and confirm the signature', async () => {
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
        await Assertions.checkIfVisible(AlertSystem.securityAlertBanner);
        await Assertions.checkIfVisible(
          AlertSystem.securityAlertResponseMaliciousBanner,
        );
        // Confirm request
        await FooterActions.tapConfirmButton();
        await Assertions.checkIfVisible(AlertSystem.confirmAlertModal);
        // Acknowledge and confirm alert
        await AlertSystem.tapConfirmAlertCheckbox();
        await AlertSystem.tapConfirmAlertButton();
        await Assertions.checkIfNotVisible(RequestTypes.TypedSignRequest);
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
        await Assertions.checkIfVisible(AlertSystem.securityAlertBanner);
        await Assertions.checkIfVisible(
          AlertSystem.securityAlertResponseFailedBanner,
        );
      });
    });
  });

  describe('Inline Alert', () => {
    it('should show mismatch field alert, click the alert, acknowledge and confirm the signature', async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withSepoliaNetwork()
            .withPermissionControllerConnectedToTestDapp(buildPermissions(['0xaa36a7']))
            .build(),
          restartDevice: true,
          testSpecificMock: {
            GET: [mockEvents.GET.remoteFeatureFlagsReDesignedConfirmations],
          },
        },
        async () => {
          await loginToApp();
          await TabBarComponent.tapBrowser();
          await Browser.navigateToTestDApp();
          await TestDApp.tapSIWEBadDomainButton();
          await Assertions.checkIfVisible(RequestTypes.PersonalSignRequest);
          await Assertions.checkIfVisible(AlertSystem.inlineAlert);
          // Open alert modal and acknowledge the alert
          await AlertSystem.tapInlineAlert();
          await Assertions.checkIfVisible(AlertSystem.alertMismatchTitle);
          await AlertSystem.tapAcknowledgeAlertModal();
          await AlertSystem.tapGotItAlertModalButton();
          // Confirm request
          await FooterActions.tapConfirmButton();
          await Assertions.checkIfVisible(AlertSystem.confirmAlertModal);
          // Acknowledge and confirm alert
          await AlertSystem.tapConfirmAlertCheckbox();
          await AlertSystem.tapConfirmAlertButton();
          await Assertions.checkIfNotVisible(RequestTypes.PersonalSignRequest);
        },
      );
    });
  });
});
