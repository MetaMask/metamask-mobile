import type {
  AccountTreeControllerGetAccountsFromSelectedAccountGroupAction,
  AccountTreeControllerSelectedAccountGroupChangeEvent,
} from '@metamask/account-tree-controller';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerSignTypedMessageAction,
} from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import type {
  NetworkControllerGetStateAction,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerFindNetworkClientIdByChainIdAction,
} from '@metamask/network-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import type { TransactionControllerAddTransactionAction } from '@metamask/transaction-controller';

/**
 * Actions from other controllers that PerpsController is allowed to call.
 */
export type PerpsControllerAllowedActions =
  | NetworkControllerGetStateAction
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | KeyringControllerGetStateAction
  | KeyringControllerSignTypedMessageAction
  | TransactionControllerAddTransactionAction
  | RemoteFeatureFlagControllerGetStateAction
  | AccountTreeControllerGetAccountsFromSelectedAccountGroupAction
  | AuthenticationController.AuthenticationControllerGetBearerToken;

/**
 * Events from other controllers that PerpsController is allowed to subscribe to.
 */
export type PerpsControllerAllowedEvents =
  | RemoteFeatureFlagControllerStateChangeEvent
  | AccountTreeControllerSelectedAccountGroupChangeEvent;

/**
 * The messenger type used by PerpsController and its services.
 * Defined here (rather than in PerpsController.ts) to avoid circular imports
 * between the controller and service files.
 *
 * The first two type parameters (Actions, Events) are filled in by
 * PerpsController.ts when it unions in its own actions/events.
 * Services use this base type directly since they only need the allowed
 * external actions/events.
 */
export type PerpsControllerMessengerBase = Messenger<
  'PerpsController',
  PerpsControllerAllowedActions,
  PerpsControllerAllowedEvents
>;
