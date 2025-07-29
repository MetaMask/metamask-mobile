import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import Assertions from '../../framework/Assertions';
import { SmokeConfirmations } from '../../tags';
import { MockApiEndpoint } from '../../framework/types';

describe(SmokeConfirmations('Security Alert API - Send flow'), () => {
  const BENIGN_ADDRESS_MOCK = '0x50587E46C5B96a3F6f9792922EC647F13E6EFAE4';

  const defaultFixture = new FixtureBuilder().withGanacheNetwork().build();

  const navigateToSendConfirmation = async () => {
    await loginToApp();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSendButton();
    await SendView.inputAddress(BENIGN_ADDRESS_MOCK);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount('0');
    await AmountView.tapNextButton();
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
      GET: [mockEvents.GET.remoteFeatureFlagsOldConfirmations],
      POST: [
        {
          ...mockEvents.POST.securityAlertApiValidate,
          urlEndpoint:
            'https://security-alerts.api.cx.metamask.io/validate/0x539',
        },
      ],
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
    const testSpecificMock = {
      GET: [mockEvents.GET.remoteFeatureFlagsOldConfirmations],
      POST: [
        {
          ...mockEvents.POST.securityAlertApiValidate,
          urlEndpoint:
            'https://security-alerts.api.cx.metamask.io/validate/0x539',
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
      await Assertions.expectElementToBeVisible(
        TransactionConfirmationView.securityAlertBanner,
      );
    });
  });

  it('should show security alerts for error when validating request fails', async () => {
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
          urlEndpoint:
            'https://security-alerts.api.cx.metamask.io/validate/0x539',
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
        TransactionConfirmationView.securityAlertResponseFailedBanner,
      );
    });
  });
});
