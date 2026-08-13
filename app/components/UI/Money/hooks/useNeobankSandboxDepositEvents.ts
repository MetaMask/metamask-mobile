import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { ToastVariants } from '../../../../component-library/components/Toast';
import ToastService from '../../../../core/ToastService/ToastService';
import Logger from '../../../../util/Logger';
import { selectKycControllerState } from '../../../../selectors/kycController';
import { selectMoneyMovementBrazilNeobankEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { strings } from '../../../../../locales/i18n';
import {
  getNeobankEventsUrl,
  isCompletedNeobankDeposit,
  parseNeobankEvent,
} from '../utils/neobankEvents';

const RECONNECT_DELAY_MS = 3_000;

/**
 * Listens for the Iron sandbox deposit event used by the NeoBank demo.
 *
 * A sandbox `Completed` event proves the partner webhook and Mobile WebSocket
 * path, but it does not represent a Monad transfer. This hook intentionally
 * renders UI success without calling `submitMoneyAccountVaultDeposit`.
 */
export function useNeobankSandboxDepositEvents(): void {
  const neobankEnabled = useSelector(
    selectMoneyMovementBrazilNeobankEnabled,
  );
  const kycState = useSelector(selectKycControllerState);
  const handledEventIds = useRef(new Set<string>());

  const customerId =
    kycState.activeVendor === 'iron' ? kycState.moonpayCustomerId : null;

  useEffect(() => {
    if (!neobankEnabled || !customerId) {
      return undefined;
    }

    let disposed = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      if (disposed) {
        return;
      }

      socket = new WebSocket(getNeobankEventsUrl(customerId));

      socket.onmessage = (message) => {
        const event = parseNeobankEvent(message.data);
        if (!event || !isCompletedNeobankDeposit(event)) {
          return;
        }

        if (event.eventId && handledEventIds.current.has(event.eventId)) {
          return;
        }
        if (event.eventId) {
          handledEventIds.current.add(event.eventId);
        }

        // Sandbox fiat and crypto are simulated. Do not pass the Iron UUID or
        // its synthetic payout data to Core; there is no Monad receipt to vault.
        ToastService.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Confirmation,
          labelOptions: [
            {
              label: strings(
                'virtual_bank_account.deposit_demo.success_toast',
              ),
              isBold: true,
            },
          ],
          hasNoTimeout: false,
        });
      };

      socket.onerror = () => {
        Logger.warn('NeoBank demo WebSocket connection failed');
      };

      socket.onclose = () => {
        if (!disposed) {
          reconnectTimeout = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      socket?.close();
    };
  }, [customerId, neobankEnabled]);
}
