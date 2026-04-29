/**
 * Component-view coverage for smoke `alert-system` typed-sign security API cases:
 * (1) Benign validation response -> no redesigned security banner (matches E2E mock
 * `SECURITY_ALERTS_BENIGN_RESPONSE`).
 * (2) Malicious `malicious_domain` -> banner + confirm alert modal flow (matches E2E
 * acknowledge path; no live security API).
 */
import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { merge } from 'lodash';
import { fireEvent, waitFor } from '@testing-library/react-native';

import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { HardwareWalletProvider } from '../../../../../core/HardwareWallet/HardwareWalletProvider';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { typedSignV1ConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import {
  ConfirmationFooterSelectorIDs,
  ConfirmationTopSheetSelectorsIDs,
  ConfirmationTopSheetSelectorsText,
  ConfirmAlertModalSelectorsIDs,
} from '../../ConfirmationView.testIds';
import { AlertsContextProvider } from '../../context/alert-system-context';
import { ConfirmationContextProvider } from '../../context/confirmation-context';
import { QRHardwareContextProvider } from '../../context/qr-hardware-context';
import useBlockaidAlerts from '../../hooks/alerts/useBlockaidAlerts';
import AlertBanner from './alert-banner';
import { Footer } from '../footer/footer';
import { Reason, ResultType } from '../blockaid-banner/BlockaidBanner.types';

/** Matches `messageParams.requestId` on the typed-sign fixture (security alert map key). */
const TYPED_SIGN_SECURITY_ALERT_KEY = '2453610887';

const TYPED_SIGN_SIGNER_ADDRESS =
  '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477' as const;

/** No `req`/`chainId` so `BlockaidAlertContent` skips gzip (view env). */
const benignSecurityApiResponse = {
  result_type: ResultType.Benign,
  reason: Reason.notApplicable,
  features: [] as string[],
};

const maliciousDomainSecurityResponse = {
  result_type: ResultType.Malicious,
  reason: Reason.maliciousDomain,
  description: `You're interacting with a malicious domain. If you approve this request, you might lose your assets.`,
  features: [] as string[],
};

function seedEngineKeyringWithTypedSignSigner(): void {
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
      accounts: [TYPED_SIGN_SIGNER_ADDRESS],
    },
  ];
}

function TypedSignMaliciousBlockaidFlowHarness() {
  const alerts = useBlockaidAlerts();
  return (
    <HardwareWalletProvider>
      <ConfirmationContextProvider>
        <AlertsContextProvider alerts={alerts}>
          <QRHardwareContextProvider>
            <AlertBanner />
            <Footer />
          </QRHardwareContextProvider>
        </AlertsContextProvider>
      </ConfirmationContextProvider>
    </HardwareWalletProvider>
  );
}

describeForPlatforms(
  'Alert system (typed sign — benign security response)',
  () => {
    beforeEach(() => {
      seedEngineKeyringWithTypedSignSigner();
    });

    it('lets user confirm without security banner or confirm-alert modal when validation is Benign', async () => {
      const state = merge({}, typedSignV1ConfirmationState, {
        securityAlerts: {
          alerts: {
            [TYPED_SIGN_SECURITY_ALERT_KEY]: benignSecurityApiResponse,
          },
        },
        engine: {
          backgroundState: {
            PreferencesController: {
              securityAlertsEnabled: true,
            },
          },
        },
      });

      const { findByTestId, queryByTestId } = renderComponentViewScreen(
        TypedSignMaliciousBlockaidFlowHarness,
        { name: 'TypedSignBenignBlockaid' },
        { state },
      );

      const confirmButton = await findByTestId(
        ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
      );

      await waitFor(() => {
        expect(
          queryByTestId(
            ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED,
          ),
        ).toBeNull();
      });

      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(
          queryByTestId(ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL),
        ).toBeNull();
      });

      expect(
        queryByTestId(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED,
        ),
      ).toBeNull();
    });
  },
);

describeForPlatforms('Alert system (typed sign — malicious blockaid)', () => {
  beforeEach(() => {
    seedEngineKeyringWithTypedSignSigner();
  });

  it('shows malicious banner then confirm alert modal after Confirm (malicious_domain)', async () => {
    const state = merge({}, typedSignV1ConfirmationState, {
      securityAlerts: {
        alerts: {
          [TYPED_SIGN_SECURITY_ALERT_KEY]: maliciousDomainSecurityResponse,
        },
      },
      engine: {
        backgroundState: {
          PreferencesController: {
            securityAlertsEnabled: true,
          },
        },
      },
    });

    const { getByTestId, getByText } = renderComponentViewScreen(
      TypedSignMaliciousBlockaidFlowHarness,
      { name: 'TypedSignMaliciousBlockaid' },
      { state },
    );

    const bannerTestId =
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED;

    await waitFor(() => {
      expect(getByTestId(bannerTestId)).toBeOnTheScreen();
    });

    expect(
      getByText(ConfirmationTopSheetSelectorsText.BANNER_MALICIOUS_TITLE),
    ).toBeOnTheScreen();

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
