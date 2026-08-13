import {
  BaseController,
  type ControllerGetStateAction,
  type ControllerStateChangeEvent,
  type StateMetadata,
} from '@metamask/base-controller';
import type { KeyringControllerLockEvent } from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { VenueAccountAdapter } from '../adapters/types';
import { PredictError, PredictErrorCode } from '../errors';
import type {
  PredictAccountReadiness,
  PredictReadOptions,
  PredictVenueId,
} from '../types';

export const PREDICT_SESSION_SERVICE_NAME = 'PredictSessionService' as const;

export type PredictSessionRequestStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error';

// A type alias satisfies BaseController's JSON state constraint without widening
// account readiness to an arbitrary record.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictSessionServiceState = {
  accountReadiness: PredictAccountReadiness | null;
  requestStatus: PredictSessionRequestStatus;
};

export const defaultPredictSessionServiceState: PredictSessionServiceState = {
  accountReadiness: null,
  requestStatus: 'idle',
};

const metadata: StateMetadata<PredictSessionServiceState> = {
  accountReadiness: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  requestStatus: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
};

export interface PredictSessionServiceRefreshAccountReadinessAction {
  type: 'PredictSessionService:refreshAccountReadiness';
  handler: (
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ) => Promise<PredictAccountReadiness>;
}

export type PredictSessionServiceActions =
  | ControllerGetStateAction<
      typeof PREDICT_SESSION_SERVICE_NAME,
      PredictSessionServiceState
    >
  | PredictSessionServiceRefreshAccountReadinessAction;

// EngineService still consumes the legacy stateChange event.
// eslint-disable-next-line @typescript-eslint/no-deprecated
export type PredictSessionServiceEvents = ControllerStateChangeEvent<
  typeof PREDICT_SESSION_SERVICE_NAME,
  PredictSessionServiceState
>;

type PredictSessionServiceAllowedActions =
  AuthenticationController.AuthenticationControllerGetBearerTokenAction;

type PredictSessionServiceAllowedEvents =
  | AuthenticationController.AuthenticationControllerStateChangeEvent
  | KeyringControllerLockEvent;

export type PredictSessionServiceMessenger = Messenger<
  typeof PREDICT_SESSION_SERVICE_NAME,
  PredictSessionServiceActions | PredictSessionServiceAllowedActions,
  PredictSessionServiceEvents | PredictSessionServiceAllowedEvents
>;

export interface PredictSessionServiceOptions {
  messenger: PredictSessionServiceMessenger;
  account?: VenueAccountAdapter;
  authenticate?: () => Promise<void>;
  venueId: PredictVenueId;
}

/** Owns runtime-only authenticated context and Account Readiness projection. */
export class PredictSessionService extends BaseController<
  typeof PREDICT_SESSION_SERVICE_NAME,
  PredictSessionServiceState,
  PredictSessionServiceMessenger
> {
  readonly #account?: VenueAccountAdapter;
  readonly #authenticate: () => Promise<void>;
  readonly #venueId: PredictVenueId;
  #destroyed = false;
  #authenticationGeneration = 0;
  #nextRequestGeneration = 0;
  #requestGeneration = 0;
  #authenticatingRequests = 0;
  readonly #handleAuthenticationStateChange = () => {
    if (this.#authenticatingRequests > 0) {
      return;
    }
    this.#invalidateAuthentication();
  };
  readonly #handleKeyringLock = () => {
    this.#invalidateAuthentication();
  };

  constructor({
    messenger,
    account,
    authenticate,
    venueId,
  }: PredictSessionServiceOptions) {
    super({
      name: PREDICT_SESSION_SERVICE_NAME,
      messenger,
      metadata,
      state: defaultPredictSessionServiceState,
    });
    this.#account = account;
    this.#authenticate = authenticate ?? (async () => undefined);
    this.#venueId = venueId;

    messenger.registerActionHandler(
      'PredictSessionService:refreshAccountReadiness',
      this.refreshAccountReadiness.bind(this),
    );
    messenger.subscribe(
      'AuthenticationController:stateChange',
      this.#handleAuthenticationStateChange,
    );
    messenger.subscribe('KeyringController:lock', this.#handleKeyringLock);
  }

  async refreshAccountReadiness(
    venueId: PredictVenueId,
    options?: PredictReadOptions,
  ): Promise<PredictAccountReadiness> {
    if (venueId !== this.#venueId) {
      throw PredictError.from(PredictErrorCode.UNSUPPORTED_VENUE);
    }
    if (!this.#account) {
      throw PredictError.from(PredictErrorCode.SERVICE_DEGRADED);
    }

    const requestGeneration = ++this.#nextRequestGeneration;
    this.update((state) => {
      state.accountReadiness = null;
      state.requestStatus = 'loading';
    });

    try {
      this.#authenticatingRequests += 1;
      try {
        await this.#authenticate();
      } finally {
        this.#authenticatingRequests -= 1;
      }
      if (options?.signal?.aborted) {
        throw this.#createAbortError();
      }
      const authenticationGeneration = this.#authenticationGeneration;
      this.#requestGeneration = requestGeneration;
      this.update((state) => {
        state.accountReadiness = null;
        state.requestStatus = 'loading';
      });
      const readiness = await this.#account.fetchAccountReadiness(options);
      if (
        options?.signal?.aborted ||
        authenticationGeneration !== this.#authenticationGeneration ||
        requestGeneration !== this.#requestGeneration
      ) {
        if (requestGeneration === this.#requestGeneration) {
          this.#resetProjection();
        }
        return readiness;
      }
      this.update((state) => {
        state.accountReadiness = readiness;
        state.requestStatus = 'success';
      });
      return readiness;
    } catch (error) {
      if (requestGeneration !== this.#requestGeneration) {
        throw error;
      }
      this.update((state) => {
        state.accountReadiness = null;
        state.requestStatus = 'error';
      });
      throw error;
    }
  }

  clearAccountReadiness(): void {
    this.#nextRequestGeneration += 1;
    this.#requestGeneration = this.#nextRequestGeneration;
    this.#resetProjection();
  }

  #invalidateAuthentication(): void {
    this.#authenticationGeneration += 1;
    this.#resetProjection();
  }

  #resetProjection(): void {
    this.update((state) => {
      state.accountReadiness = null;
      state.requestStatus = 'idle';
    });
  }

  #createAbortError(): Error {
    const error = new Error('Predict Account Readiness request was cancelled.');
    error.name = 'AbortError';
    return error;
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;
    this.#nextRequestGeneration += 1;
    this.#requestGeneration = this.#nextRequestGeneration;
    this.messenger.unregisterActionHandler(
      'PredictSessionService:refreshAccountReadiness',
    );
    this.messenger.unsubscribe(
      'AuthenticationController:stateChange',
      this.#handleAuthenticationStateChange,
    );
    this.messenger.unsubscribe(
      'KeyringController:lock',
      this.#handleKeyringLock,
    );
    super.destroy();
  }
}
