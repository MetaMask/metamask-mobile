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
import type { AuthenticationController } from '@metamask/profile-sync-controller';
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

export interface CardAccountLookupCacheEntry {
  result: 'found' | 'not_found';
  checkedAt: number;
}

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

export type CardRedeemWithdrawalStatus =
  | 'submitting'
  | 'monitoring'
  | 'success'
  | 'failed';

export type CardRedeemWithdrawalErrorReason =
  | 'no_polling_chain'
  | 'submit_failed'
  | 'tx_reverted'
  | 'tx_timeout'
  | 'in_progress'
  | 'network'
  | 'server_error'
  | 'unknown';

/** PII-free: state logs ship this field verbatim. */
export interface CardRedeemWithdrawalError {
  reason: CardRedeemWithdrawalErrorReason;
  code: string | null;
  statusCode: number | null;
}

/**
 * In-flight / terminal redeem withdrawal. Not persisted — survives UI unmount
 * via controller state so monitoring continues after navigating away.
 * Typed as Record fields where needed for StateConstraint.
 */
export interface CardRedeemWithdrawal {
  mode: 'credit' | 'cashback';
  status: CardRedeemWithdrawalStatus;
  txHash: string | null;
  chainId: string | null;
  submittedAt: number;
  error: CardRedeemWithdrawalError | null;
}

export interface FetchCardHomeDataOptions {
  force?: boolean;
}

// -- Card links (CARD-585) --

export type CardLinkStatus = 'onboarding' | 'active' | 'closed';

/** Statuses a client may write. `closed` is a server-only write. */
export type CardLinkWriteStatus = Exclude<CardLinkStatus, 'closed'>;

/**
 * One public card link, as `GET /v1/card/links` returns it. Never carries the
 * provider cardholder ID. A `type` rather than an interface so it satisfies
 * the controller's Json state constraint.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardLink = {
  provider: CardProviderId;
  status: CardLinkStatus;
  linkedAccountRef: string | null;
  closedReason: 'migrated' | 'terminated' | null;
  migratedToProvider: string | null;
  linkedAt: string;
  updatedAt: string;
};

/** Body of `PUT /v1/card/links/{provider}`. Built only by CardController. */
export interface CardLinkWriteBody {
  status: CardLinkWriteStatus;
  providerCardholderId?: string;
  linkedAccountRef?: string;
}

/** Host build info sent as `x-metamask-client*` headers on card-link calls. */
export interface CardClientInfo {
  product: string;
  version: string;
  build?: string;
  platform: string;
}

/** Host SHA-256. Mobile passes QuickCrypto; the extension can pass `crypto.subtle`. */
export type CardSha256 = (text: string) => Promise<Uint8Array>;

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
  /**
   * Active / last redeem withdrawal (credit / mUSD Back). Not persisted.
   * Typed as Record<string, Json> for StateConstraint; cast at read sites.
   */
  redeemWithdrawal: Record<string, Json> | null;
  signInLink: Record<string, Json> | null;
  accountLookupCache: Record<string, Json>;
  /**
   * The profile's card links. `null` means not fetched yet, which is not the
   * same as `[]` (fetched, never linked).
   */
  cardLinks: CardLink[] | null;
  /** When `cardLinks` was last fetched; the result is reused for about 24h. */
  cardLinksFetchedAt: number | null;
  /** The one-time seed for a pre-existing cardholder has been sent. */
  cardLinksSeeded: boolean;
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
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
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
