import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import type {
  AccountTreeControllerGetAccountFromSelectedAccountGroupAction,
  AccountTreeControllerStateChangeEvent,
} from '@metamask/account-tree-controller';
import type { AccountsControllerGetStateAction } from '@metamask/accounts-controller';
import type {
  KeyringControllerUnlockEvent,
  KeyringControllerSignPersonalMessageAction,
} from '@metamask/keyring-controller';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import type {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
} from '@metamask/network-controller';
import type {
  TransactionControllerAddTransactionAction,
  TransactionControllerAddTransactionBatchAction,
  TransactionControllerGetStateAction,
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
} from '@metamask/transaction-controller';
import { CardProviderIds, type CardProviderId } from './provider-types';

export const CARD_CONTROLLER_NAME = 'CardController';

/** The provider ID used when no other provider has been selected. */
export const DEFAULT_CARD_PROVIDER_ID = CardProviderIds.Baanx;

export const MONEY_ACCOUNT_LAUNCH_MS = Date.UTC(2026, 4, 1);

export type CardHomeDataStatus = 'idle' | 'loading' | 'error' | 'success';
export type CardUnauthenticatedReason = 'onboarding_token_revoked';

/** PII-free: state logs ship this field verbatim. */
export type CardHomeDataErrorReason =
  | 'no_evm_address'
  | 'no_active_provider'
  | 'auth_expired'
  | 'rate_limited'
  | 'network'
  | 'server_error'
  | 'unknown';

export interface CardHomeDataError {
  reason: CardHomeDataErrorReason;
  /** CardProviderError.code or CardApiError.errorCode. */
  code: string | null;
  statusCode: number | null;
  at: number;
}

export interface FetchCardHomeDataOptions {
  force?: boolean;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardControllerState = {
  /** ISO 3166-1 alpha-2 country code selected by the user. */
  selectedCountry: string | null;
  /** Active provider ID, derived from selectedCountry. */
  activeProviderId: CardProviderId | null;
  /** Whether the user is authenticated with the active provider. */
  isAuthenticated: boolean;
  /** Stable user identifier issued by the active card provider. */
  providerUserId: string | null;
  /** Last reason the active provider session became unauthenticated. */
  lastUnauthenticatedReason: CardUnauthenticatedReason | null;
  /** CAIP-10 account IDs that are card holders. */
  cardholderAccounts: string[];
  /**
   * Per-provider persistent data keyed by provider ID.
   * Values are JSON-serializable objects (e.g. `{ location: 'us' }`).
   */
  providerData: Partial<Record<CardProviderId, Record<string, Json>>>;
  /**
   * Cached card home data. Persisted so a cold start renders the card from disk
   * while a background revalidation runs. Typed as Record<string, Json> to
   * satisfy StateConstraint; cast to CardHomeData in the controller.
   */
  cardHomeData: Record<string, Json> | null;
  /** Account `cardHomeData` was fetched for; a mismatch discards the cache. */
  cardHomeDataAddress: string | null;
  /** Persisted with the data: without it the card restores stuck in 'loading'. */
  cardHomeDataStatus: CardHomeDataStatus;
  /**
   * Last card-home fetch failure. PII-free (no message/body) because state logs
   * ship controller state verbatim. Typed as Record<string, Json> to satisfy
   * StateConstraint; cast to CardHomeDataError at read sites.
   */
  cardHomeDataError: Record<string, Json> | null;
  /** Never persisted, so `false` after a cold start signals data off disk. */
  cardHomeDataFetchedThisSession: boolean;
  /** True while `linkMoneyAccountCard` is in flight. Not persisted. */
  moneyAccountCardLinkInProgress: boolean;
};

export type CardControllerActions = ControllerGetStateAction<
  typeof CARD_CONTROLLER_NAME,
  CardControllerState
>;

export type CardControllerEvents = ControllerStateChangeEvent<
  typeof CARD_CONTROLLER_NAME,
  CardControllerState
>;

type CardControllerAllowedActions =
  | AccountsControllerGetStateAction
  | AccountTreeControllerGetAccountFromSelectedAccountGroupAction
  | RemoteFeatureFlagControllerGetStateAction
  | KeyringControllerSignPersonalMessageAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | NetworkControllerGetNetworkClientByIdAction
  | TransactionControllerAddTransactionAction
  | TransactionControllerAddTransactionBatchAction
  | TransactionControllerGetStateAction;

type CardControllerAllowedEvents =
  | AccountTreeControllerStateChangeEvent
  | RemoteFeatureFlagControllerStateChangeEvent
  | KeyringControllerUnlockEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionFailedEvent;

export type CardControllerMessenger = Messenger<
  typeof CARD_CONTROLLER_NAME,
  CardControllerActions | CardControllerAllowedActions,
  CardControllerEvents | CardControllerAllowedEvents
>;
