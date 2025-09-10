import type { RestrictedMessenger } from '@metamask/base-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type {
  AccountActivityServiceActions,
  AccountActivityServiceEvents,
  WebSocketConnectionInfo,
} from '@metamask/backend-platform';
import type { TokenBalancesControllerActions } from '@metamask/assets-controllers';
import type { BaseControllerMessenger } from '../../types';

const SERVICE_NAME = 'AccountActivityService' as const;

// Define WebSocket connection state change event locally to avoid import issues
interface BackendWebSocketConnectionStateChangedEvent {
  type: 'BackendWebSocketService:connectionStateChanged';
  payload: [WebSocketConnectionInfo];
}

// Actions that AccountActivityService can call
type AllowedActions =
  | {
      type: 'AccountsController:getAccountByAddress';
      handler: (address: string) => InternalAccount | undefined;
    }
  | {
      type: 'AccountsController:getSelectedAccount';
      handler: () => InternalAccount;
    }
  | TokenBalancesControllerActions;

// Events that AccountActivityService can listen to
type AllowedEvents =
  | {
      type: 'AccountsController:selectedAccountChange';
      payload: [InternalAccount];
    }
  | BackendWebSocketConnectionStateChangedEvent;

// Messenger type for mobile app with all necessary permissions
export type AccountActivityServiceMessenger = RestrictedMessenger<
  typeof SERVICE_NAME,
  AccountActivityServiceActions | AllowedActions,
  AccountActivityServiceEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

/**
 * Get the messenger for the AccountActivityService.
 *
 * @param baseMessenger - The base controller messenger.
 * @returns The restricted messenger for the AccountActivityService.
 */
export function getAccountActivityServiceMessenger(
  baseMessenger: BaseControllerMessenger,
): AccountActivityServiceMessenger {
  return baseMessenger.getRestricted({
    name: SERVICE_NAME,
    allowedActions: [
      // AccountsController actions
      'AccountsController:getAccountByAddress',
      'AccountsController:getSelectedAccount',
      // TokenBalancesController actions (for polling configuration)
      'TokenBalancesController:updateChainPollingConfigs',
      'TokenBalancesController:getDefaultPollingInterval',
      'TokenBalancesController:getChainPollingConfig',
    ],
    allowedEvents: [
      // AccountsController events
      'AccountsController:selectedAccountChange',
      // WebSocket events for reconnection handling
      'BackendWebSocketService:connectionStateChanged',
    ],
  });
}
