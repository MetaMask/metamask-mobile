import type {
  ControllerGetStateAction,
  ControllerStateChangedEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import type {
  AccountTreeControllerGetStateAction,
  AccountTreeControllerStateChangeEvent,
} from '@metamask/account-tree-controller';
import type { AccountsControllerGetStateAction } from '@metamask/accounts-controller';
import type {
  KeyringControllerUnlockEvent,
  KeyringControllerSignPersonalMessageAction,
} from '@metamask/keyring-controller';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type { NetworkControllerFindNetworkClientIdByChainIdAction } from '@metamask/network-controller';
import type {
  TransactionControllerAddTransactionAction,
  TransactionControllerTransactionConfirmedEvent,
} from '@metamask/transaction-controller';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import type { MultichainTransactionsControllerStateChange } from '@metamask/multichain-transactions-controller';

export const CARD_CONTROLLER_NAME = 'CardController';

/** The provider ID used when no other provider has been selected. */
export const DEFAULT_CARD_PROVIDER_ID = 'baanx';

export type CardHomeDataStatus = 'idle' | 'loading' | 'error' | 'success';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardControllerState = {
  /** ISO 3166-1 alpha-2 country code selected by the user. */
  selectedCountry: string | null;
  /** Active provider ID, derived from selectedCountry. */
  activeProviderId: string | null;
  /** Whether the user is authenticated with the active provider. */
  isAuthenticated: boolean;
  /** CAIP-10 account IDs that are card holders. */
  cardholderAccounts: string[];
  /**
   * Per-provider persistent data keyed by provider ID.
   * Values are JSON-serializable objects (e.g. `{ location: 'us' }`).
   */
  providerData: Record<string, Record<string, Json>>;
  /**
   * Cached card home data fetched from the active provider.
   * Not persisted to disk — re-fetched after each session validation.
   * Typed as Record<string, Json> to satisfy StateConstraint; cast to
   * CardHomeData when accessed in the controller.
   */
  cardHomeData: Record<string, Json> | null;
  /** Fetch status for cardHomeData. Not persisted. */
  cardHomeDataStatus: CardHomeDataStatus;
};

export type CardControllerActions = ControllerGetStateAction<
  typeof CARD_CONTROLLER_NAME,
  CardControllerState
>;

interface CardDelegationCompletedEvent {
  type: 'CardController:delegationCompleted';
  payload: [{ flow: 'onboarding' | 'manage' | 'enable' | null }];
}

export type CardControllerEvents =
  | ControllerStateChangedEvent<
      typeof CARD_CONTROLLER_NAME,
      CardControllerState
    >
  | CardDelegationCompletedEvent;

type CardControllerAllowedActions =
  | AccountsControllerGetStateAction
  | AccountTreeControllerGetStateAction
  | RemoteFeatureFlagControllerGetStateAction
  | KeyringControllerSignPersonalMessageAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | TransactionControllerAddTransactionAction
  | SnapControllerHandleRequestAction;

type CardControllerAllowedEvents =
  | AccountTreeControllerStateChangeEvent
  | KeyringControllerUnlockEvent
  | TransactionControllerTransactionConfirmedEvent
  | MultichainTransactionsControllerStateChange;

export type CardControllerMessenger = Messenger<
  typeof CARD_CONTROLLER_NAME,
  CardControllerActions | CardControllerAllowedActions,
  CardControllerEvents | CardControllerAllowedEvents
>;
