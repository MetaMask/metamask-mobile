import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { waitFor } from '@testing-library/react-native';

import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { HardwareWalletProvider } from '../../../../../core/HardwareWallet/HardwareWalletProvider';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { ConfirmationFooterSelectorIDs } from '../../ConfirmationView.testIds';
import { AlertsContextProvider } from '../../context/alert-system-context';
import { ConfirmationContextProvider } from '../../context/confirmation-context';
import { QRHardwareContextProvider } from '../../context/qr-hardware-context';
import { useWatchOnlyAccountAlert } from '../../hooks/alerts/useWatchOnlyAccountAlert';
import AlertBanner from './alert-banner';
import { Footer } from '../footer/footer';

const TRANSFER_SENDER = '0xdc47789de4ceff0e8fe9d15d728af7f17550c164';

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

describeForPlatforms('Alert system (watch-only account)', () => {
  const { keyrings } = Engine.context.KeyringController.state;

  beforeEach(() => {
    keyrings.push({
      type: 'watch-only',
      accounts: [TRANSFER_SENDER],
      metadata: { id: 'watch-only', name: '' },
    });
  });

  afterEach(() => {
    keyrings.pop();
  });

  it('blocks a send from a watch-only account', async () => {
    const blockedMessage = strings('watch_only.blocked_message');
    expect(blockedMessage).not.toMatch(/\[missing ".*" translation\]/);

    const { getByTestId, getByText } = renderComponentViewScreen(
      WatchOnlyAlertHarness,
      { name: 'WatchOnlyAlert' },
      { state: transferConfirmationState },
    );

    await waitFor(() => {
      expect(getByText(blockedMessage)).toBeOnTheScreen();
    });
    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
    ).toBeDisabled();
  });
});
