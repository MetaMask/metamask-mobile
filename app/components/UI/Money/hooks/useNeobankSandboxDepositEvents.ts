import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ToastVariants } from '../../../../component-library/components/Toast';
import Engine from '../../../../core/Engine';
import ToastService from '../../../../core/ToastService/ToastService';
import Logger from '../../../../util/Logger';
import { getSessionProfileId } from '../../../../util/notifications/utils/get-session-profile-id';
import { selectKycControllerState } from '../../../../selectors/kycController';
import { selectMoneyMovementBrazilNeobankEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { strings } from '../../../../../locales/i18n';
import {
  getNeobankEventsUrl,
  isCompletedNeobankDeposit,
  parseNeobankEvent,
  readNeobankCustomerId,
  resolveNeobankDemoCustomerId,
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
  const [lookedUpCustomerId, setLookedUpCustomerId] = useState<
    string | null | undefined
  >(undefined);

  const isIronVendor = kycState.activeVendor === 'iron';
  const persistedCustomerId = kycState.moonpayCustomerId;

  // When Iron has no persisted customer id, resolve it once via the signed-in
  // profile id (Iron `external_id`) through NeoBankService. Failures fall
  // through to the demo constant so the sandbox toast still works.
  useEffect(() => {
    if (!neobankEnabled || !isIronVendor || persistedCustomerId) {
      setLookedUpCustomerId(undefined);
      return undefined;
    }

    let cancelled = false;

    const lookup = async () => {
      try {
        const profileId = await getSessionProfileId();
        if (!profileId) {
          if (!cancelled) {
            setLookedUpCustomerId(null);
          }
          return;
        }

        const customer =
          await Engine.context.NeoBankService.getCustomerByExternalId(
            profileId,
          );
        const resolved = readNeobankCustomerId(customer);
        if (!cancelled) {
          setLookedUpCustomerId(resolved);
        }
      } catch (error) {
        Logger.log('NeoBank demo customer lookup failed', error);
        if (!cancelled) {
          setLookedUpCustomerId(null);
        }
      }
    };

    lookup();

    return () => {
      cancelled = true;
    };
  }, [neobankEnabled, isIronVendor, persistedCustomerId]);

  // Only the Iron vendor path drives the sandbox demo. Wait for the async
  // lookup to settle before opening the socket so we do not connect with the
  // demo fallback and then reconnect with the real id.
  const customerId = (() => {
    if (!isIronVendor) {
      return null;
    }
    if (persistedCustomerId) {
      return persistedCustomerId;
    }
    if (lookedUpCustomerId === undefined) {
      return null;
    }
    return resolveNeobankDemoCustomerId(null, lookedUpCustomerId);
  })();

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
        Logger.log('NeoBank demo WebSocket connection failed');
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
