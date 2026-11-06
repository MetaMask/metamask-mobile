/**
 * Component-view coverage for the watch-only account confirmation alert:
 * a signature or transaction requested from a watch-only account renders the
 * blocking alert and a disabled Confirm; any other account confirms normally.
 */
import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { waitFor } from '@testing-library/react-native';

import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { strings } from '../../../../../../locales/i18n';
import { HardwareWalletProvider } from '../../../../../core/HardwareWallet/HardwareWalletProvider';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  transferConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import { ConfirmationFooterSelectorIDs } from '../../ConfirmationView.testIds';
import { AlertsContextProvider } from '../../context/alert-system-context';
import { ConfirmationContextProvider } from '../../context/confirmation-context';
import { QRHardwareContextProvider } from '../../context/qr-hardware-context';
import { useWatchOnlyAccountAlert } from '../../hooks/alerts/useWatchOnlyAccountAlert';
import AlertBanner from './alert-banner';
import { Footer } from '../footer/footer';

const MISSING_TRANSLATION = /\[missing ".*" translation\]/;
const TYPED_SIGN_SIGNER = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477';
const TRANSFER_SENDER = '0xdc47789de4ceff0e8fe9d15d728af7f17550c164';

function seedKeyring(type: string, address: string): void {
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
    { type, accounts: [address] },
  ];
}

function WatchOnlyAlertHarness() {
  const alerts = useWatchOnlyAccountAlert();
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

const blockedTitle = strings('watch_only.blocked_title');
const blockedMessage = strings('watch_only.blocked_message');

describeForPlatforms('Alert system (watch-only account)', () => {
  it.each([
    ['signature', typedSignV1ConfirmationState, TYPED_SIGN_SIGNER],
    ['transaction', transferConfirmationState, TRANSFER_SENDER],
  ])(
    'blocks a %s requested from a watch-only account',
    async (_kind, state, address) => {
      seedKeyring('watch-only', address);

      const { getByTestId, getByText } = renderComponentViewScreen(
        WatchOnlyAlertHarness,
        { name: 'WatchOnlyAlert' },
        { state },
      );

      expect(blockedTitle).not.toMatch(MISSING_TRANSLATION);
      expect(blockedMessage).not.toMatch(MISSING_TRANSLATION);
      await waitFor(() => {
        expect(getByText(blockedMessage)).toBeOnTheScreen();
      });
      expect(getByText(blockedTitle)).toBeOnTheScreen();
      expect(
        getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      ).toBeDisabled();
    },
  );

  it('confirms normally for an account that can sign', async () => {
    seedKeyring(ExtendedKeyringTypes.hd, TYPED_SIGN_SIGNER);

    const { findByTestId, queryByText } = renderComponentViewScreen(
      WatchOnlyAlertHarness,
      { name: 'WatchOnlyAlertControl' },
      { state: typedSignV1ConfirmationState },
    );

    const confirmButton = await findByTestId(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
    expect(confirmButton).toBeEnabled();
    expect(queryByText(blockedMessage)).toBeNull();
  });
});
