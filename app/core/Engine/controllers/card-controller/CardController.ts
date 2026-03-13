import { BaseController, type StateMetadata } from '@metamask/base-controller';
import {
  CARD_CONTROLLER_NAME,
  type CardControllerMessenger,
  type CardControllerState,
} from './types';

const metadata: StateMetadata<CardControllerState> = {
  selectedCountry: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  activeProviderId: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  isAuthenticated: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  cardholderAccounts: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  providerData: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
};

export const defaultCardControllerState: CardControllerState = {
  selectedCountry: null,
  activeProviderId: null,
  isAuthenticated: false,
  cardholderAccounts: [],
  providerData: {},
};

/**
 * CardController manages the MetaMask Card feature state.
 *
 * This is a thin coordination layer that will eventually delegate
 * to provider implementations. For now it owns the persisted state
 * (country, provider, auth status) and syncs it to Redux via the
 * standard Engine batcher.
 */
export class CardController extends BaseController<
  typeof CARD_CONTROLLER_NAME,
  CardControllerState,
  CardControllerMessenger
> {
  constructor({
    messenger,
    state,
  }: {
    messenger: CardControllerMessenger;
    state?: Partial<CardControllerState>;
  }) {
    super({
      name: CARD_CONTROLLER_NAME,
      messenger,
      metadata,
      state: {
        ...defaultCardControllerState,
        ...state,
      },
    });
  }
}
