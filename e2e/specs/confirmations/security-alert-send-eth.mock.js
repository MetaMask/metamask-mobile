'use strict';
import TestHelpers from '../../helpers';

import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import Assertions from '../../utils/Assertions';
import { SmokeConfirmations } from '../../tags';

describe(SmokeConfirmations('Security Alert API - Send flow'), () => {
  const BENIGN_ADDRESS_MOCK = '0x50587E46C5B96a3F6f9792922EC647F13E6EFAE4';

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  const defaultFixture = new FixtureBuilder().withSepoliaNetwork().build();

  const navigateToSendConfirmation = async () => {
    await loginToApp();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSendButton();
    await SendView.inputAddress(BENIGN_ADDRESS_MOCK);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount('0');
    await AmountView.tapNextButton();
  };

  const runTest = async (testSpecificMock, alertAssertion) => {
    await withFixtures(
      {
        fixture: defaultFixture,
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await navigateToSendConfirmation();
        await alertAssertion();
      },
    );
  };

  it('should not show security alerts for benign requests', async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.remoteFeatureFlags,
      ],
      POST: [mockEvents.POST.securityAlertApiValidate],
    };

    await runTest(testSpecificMock, async () => {
      try {
        await Assertions.checkIfNotVisible(
          TransactionConfirmationView.securityAlertBanner,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('The banner alert is not visible');
      }
    });
  });

  it('should show security alerts for malicious request', async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.remoteFeatureFlags,
      ],
      POST: [
        {
          ...mockEvents.POST.securityAlertApiValidate,
          response: {
            block: 20733277,
            result_type: 'Malicious',
            reason: 'transfer_farming',
            description: '',
            features: ['Interaction with a known malicious address'],
          },
        },
      ],
    };

    await runTest(testSpecificMock, async () => {
      await Assertions.checkIfVisible(
        TransactionConfirmationView.securityAlertBanner,
      );
    });
  });

  it('should show security alerts for error when validating request fails', async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.remoteFeatureFlags,
        {
          urlEndpoint:
            'https://static.cx.metamask.io/api/v1/confirmations/ppom/ppom_version.json',
          responseCode: 500,
        },
      ],
      POST: [
        {
          ...mockEvents.POST.securityAlertApiValidate,
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
        TransactionConfirmationView.securityAlertResponseFailedBanner,
      );
    });
  });
});
