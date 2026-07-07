import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { merge } from 'lodash';

import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { HardwareWalletProvider } from '../../../../../core/HardwareWallet/HardwareWalletProvider';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { siweSignatureConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import {
  AlertModalSelectorsIDs,
  AlertModalSelectorsText,
  AlertTypeIDs,
  ConfirmationFooterSelectorIDs,
  ConfirmAlertModalSelectorsIDs,
} from '../../ConfirmationView.testIds';
import { AlertsContextProvider } from '../../context/alert-system-context';
import { ConfirmationContextProvider } from '../../context/confirmation-context';
import { QRHardwareContextProvider } from '../../context/qr-hardware-context';
import useDomainMismatchAlerts from '../../hooks/alerts/useDomainMismatchAlerts';
import { NetworkAndOriginRow } from '../rows/transactions/network-and-origin-row/network-and-origin-row';
import { Footer } from '../footer/footer';

/**
 * `meta.url` origin must differ from the SIWE message domain so
 * `isValidSIWEOrigin` fails (same idea as SIWE “bad domain” E2E).
 */
const SIWE_BAD_DOMAIN_STATE = merge({}, siweSignatureConfirmationState, {
  engine: {
    backgroundState: {
      PreferencesController: {
        securityAlertsEnabled: true,
      },
      ApprovalController: {
        pendingApprovals: {
          '72424261-e22f-11ef-8e59-bf627a5d8354': {
            requestData: {
              meta: {
                url: 'https://malicious.example.test/fake-dapp/',
              },
            },
          },
        },
      },
    },
  },
});

const SIWE_SIGNER_ADDRESS =
  '0x8eeee1781fd885ff5ddef7789486676961873d12' as const;

function seedEngineKeyringWithSiweSigner(): void {
  const engineMock = jest.requireMock(
    '../../../../../../app/core/Engine',
  ) as unknown as {
    default: {
      context: {
        KeyringController: { state: { keyrings: unknown[] } };
      };
    };
  };
  engineMock.default.context.KeyringController.state.keyrings = [
    {
      type: ExtendedKeyringTypes.hd,
      accounts: [SIWE_SIGNER_ADDRESS],
    },
  ];
}

function SiweDomainMismatchInlineFlowHarness() {
  const alerts = useDomainMismatchAlerts();
  return (
    <HardwareWalletProvider>
      <ConfirmationContextProvider>
        <AlertsContextProvider alerts={alerts}>
          <QRHardwareContextProvider>
            <NetworkAndOriginRow />
            <Footer />
          </QRHardwareContextProvider>
        </AlertsContextProvider>
      </ConfirmationContextProvider>
    </HardwareWalletProvider>
  );
}

describeForPlatforms('Alert system (SIWE inline)', () => {
  /**
   * Smoke `alert-system` Inline: domain mismatch → inline icon → alert modal →
   * acknowledge → Confirm → second confirm modal → acknowledge (no broadcast assertion).
   */
  beforeEach(() => {
    seedEngineKeyringWithSiweSigner();
  });

  it('inline mismatch: open modal, acknowledge, then confirm modals', async () => {
    const { getByTestId, getByText } = renderComponentViewScreen(
      SiweDomainMismatchInlineFlowHarness,
      { name: 'SiweInlineMismatch' },
      { state: SIWE_BAD_DOMAIN_STATE },
    );

    expect(getByTestId(AlertTypeIDs.INLINE_ALERT)).toBeOnTheScreen();

    fireEvent.press(getByTestId(AlertTypeIDs.INLINE_ALERT));

    await waitFor(() =>
      expect(
        getByText(AlertModalSelectorsText.ALERT_ORIGIN_MISMATCH_TITLE),
      ).toBeOnTheScreen(),
    );

    fireEvent.press(getByTestId(AlertModalSelectorsIDs.ALERT_MODAL_CHECKBOX));
    fireEvent.press(
      getByTestId(AlertModalSelectorsIDs.ALERT_MODAL_ACKNOWLEDGE_BUTTON),
    );

    fireEvent.press(getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON));

    await waitFor(() =>
      expect(
        getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL),
      ).toBeOnTheScreen(),
    );

    fireEvent.press(
      getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CHECKBOX),
    );
    fireEvent.press(
      getByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON),
    );
  });
});
