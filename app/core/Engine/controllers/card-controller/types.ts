import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';

export const CARD_CONTROLLER_NAME = 'CardController';

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
};

export type CardControllerActions = ControllerGetStateAction<
  typeof CARD_CONTROLLER_NAME,
  CardControllerState
>;

export type CardControllerEvents = ControllerStateChangeEvent<
  typeof CARD_CONTROLLER_NAME,
  CardControllerState
>;

export type CardControllerMessenger = Messenger<
  typeof CARD_CONTROLLER_NAME,
  CardControllerActions,
  CardControllerEvents
>;
