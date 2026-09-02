import { BaseController, type StateMetadata } from '@metamask/base-controller';
import {
  UI_SLOTS_CONTRACT_MAJOR,
  UI_SLOTS_HARD_TTL_MS,
  UI_SLOTS_MAX_CONFIGURATIONS,
  UI_SLOTS_SOFT_TTL_MS,
} from './config';
import {
  parseUiSlotsResponse,
  UiSlotsResponseValidationError,
} from './contracts/v1';
import type { UiSlotsContractRegistry } from './contracts/registry';
import {
  isRetryableUiSlotsError,
  type FetchUiSlotsScreenRequest,
  type FetchUiSlotsScreenResult,
  type UiSlotsReadTransport,
} from './UiSlotsApiReadClient';
import {
  UI_SLOTS_CONTROLLER_NAME,
  type UiSlotsControllerMessenger,
  type UiSlotsControllerState,
  type UiSlotsScreenId,
  type UiSlotsScreenResponse,
  type StoredScreenConfiguration,
  type UiSlotsDiagnostics,
} from './types';

/**
 * `error` means the caller has nothing to render, `stale` means a refresh
 * failed but last-known-good content is still rendered. Both warrant a
 * backed-off retry; only `ready` means the cached freshness window is current,
 * so callers must not schedule off `getNextRefreshAt` for the other outcomes.
 */
export type UiSlotsLoadOutcome = 'ready' | 'stale' | 'error' | 'disabled';

/**
 * The token a screen currently loads under. Only the token still held for a
 * screen may write state, so a request superseded by a newer locale resolves
 * without touching anything.
 */
interface ActiveRequest {
  locale: string;
  promise: Promise<UiSlotsLoadOutcome>;
}

const metadata: StateMetadata<UiSlotsControllerState> = {
  enabled: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: false,
    usedInUi: true,
  },
  screenConfigurations: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  activeConfigurations: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: false,
    usedInUi: true,
  },
};

export const defaultUiSlotsControllerState: UiSlotsControllerState = {
  enabled: false,
  screenConfigurations: {},
  activeConfigurations: {},
};

const countByCode = (
  rejections: readonly { code: string }[],
): Record<string, number> =>
  rejections.reduce<Record<string, number>>((counts, { code }) => {
    counts[code] = (counts[code] ?? 0) + 1;
    return counts;
  }, {});

const buildConfigurationKey = (screenId: UiSlotsScreenId, locale: string) =>
  `${screenId}:${encodeURIComponent(locale)}:${UI_SLOTS_CONTRACT_MAJOR}`;

export class UiSlotsController extends BaseController<
  typeof UI_SLOTS_CONTROLLER_NAME,
  UiSlotsControllerState,
  UiSlotsControllerMessenger
> {
  #enabled: boolean;
  readonly #contractRegistry: UiSlotsContractRegistry;
  readonly #readClient: UiSlotsReadTransport;
  readonly #now: () => number;
  readonly #diagnostics: UiSlotsDiagnostics;
  readonly #activeRequestByScreen = new Map<UiSlotsScreenId, ActiveRequest>();
  /**
   * Responses already parsed against this build's contracts, so a persisted
   * configuration is validated once per session and its object identity stays
   * stable afterwards. Held in memory rather than written back to state
   * because re-parsing yields identical content and every controller write
   * costs an app-wide state update.
   */
  readonly #validatedResponses = new Map<string, UiSlotsScreenResponse>();

  constructor({
    messenger,
    enabled,
    contractRegistry,
    readClient,
    diagnostics,
    now = Date.now,
    state,
  }: {
    messenger: UiSlotsControllerMessenger;
    enabled: boolean;
    contractRegistry: UiSlotsContractRegistry;
    readClient: UiSlotsReadTransport;
    diagnostics: UiSlotsDiagnostics;
    now?: () => number;
    state?: Partial<UiSlotsControllerState>;
  }) {
    super({
      name: UI_SLOTS_CONTROLLER_NAME,
      messenger,
      metadata,
      state: {
        ...defaultUiSlotsControllerState,
        ...state,
        enabled,
        activeConfigurations: {},
      },
    });
    this.#enabled = enabled;
    this.#contractRegistry = contractRegistry;
    this.#readClient = readClient;
    this.#diagnostics = diagnostics;
    this.#now = now;
  }

  loadScreen(
    screenId: UiSlotsScreenId,
    locale: string,
  ): Promise<UiSlotsLoadOutcome> {
    if (!this.#enabled) {
      this.#clearActiveConfiguration(screenId);
      return Promise.resolve('disabled');
    }

    const active = this.#activeRequestByScreen.get(screenId);
    if (active?.locale === locale) {
      return active.promise;
    }

    // The token has to be readable by `#loadScreen` before its promise exists.
    const request = { locale } as ActiveRequest;
    this.#activeRequestByScreen.set(screenId, request);
    request.promise = this.#loadScreen(screenId, locale, request).finally(
      () => {
        if (this.#activeRequestByScreen.get(screenId) === request) {
          this.#activeRequestByScreen.delete(screenId);
        }
      },
    );
    return request.promise;
  }

  setEnabled(enabled: boolean): void {
    if (this.#enabled === enabled) {
      return;
    }

    this.#enabled = enabled;
    this.update((state) => {
      state.enabled = enabled;
      if (!enabled) {
        state.activeConfigurations = {};
      }
    });

    if (!enabled) {
      this.#activeRequestByScreen.clear();
    }
  }

  /** When the soft TTL expires and a revalidation becomes worthwhile. */
  getNextRefreshAt(
    screenId: UiSlotsScreenId,
    locale: string,
  ): number | undefined {
    const fetchedAt =
      this.state.screenConfigurations[buildConfigurationKey(screenId, locale)]
        ?.fetchedAt;
    return this.#enabled &&
      fetchedAt !== undefined &&
      Number.isFinite(fetchedAt)
      ? fetchedAt + UI_SLOTS_SOFT_TTL_MS
      : undefined;
  }

  async #loadScreen(
    screenId: UiSlotsScreenId,
    locale: string,
    request: ActiveRequest,
  ): Promise<UiSlotsLoadOutcome> {
    const key = buildConfigurationKey(screenId, locale);
    const cached = this.#readCachedConfiguration(key, screenId, locale);

    if (cached) {
      this.#activateConfiguration(key, screenId, cached.response);
      if (this.#now() - cached.fetchedAt < UI_SLOTS_SOFT_TTL_MS) {
        return 'ready';
      }
    } else {
      this.#clearActiveConfiguration(screenId);
    }

    try {
      const result = await this.#fetchScreen({
        screenId,
        locale,
        etag: cached?.etag,
      });

      if (this.#activeRequestByScreen.get(screenId) !== request) {
        return 'ready';
      }

      if (result.status === 'not-modified') {
        if (!cached) {
          throw new Error('UI Slots returned 304 without cached content.');
        }
        // The active configuration already points at this content, so only the
        // freshness metadata moves. Leaving `response` untouched keeps the
        // rendered slot identity stable and consumers from re-rendering.
        this.update((state) => {
          const stored = state.screenConfigurations[key];
          if (!stored) {
            return;
          }
          stored.fetchedAt = this.#now();
          stored.etag = result.etag ?? stored.etag;
        });
        return 'ready';
      }

      const { response, rejections } = parseUiSlotsResponse(
        result.value,
        this.#contractRegistry,
      );
      if (response.screenId !== screenId || response.locale !== locale) {
        throw new Error('UI Slots response did not match the request.');
      }
      if (rejections.length > 0) {
        this.#diagnostics.log('UI Slots response contained rejected slots', {
          screenId,
          configurationVersion: response.configurationVersion,
          rejectedSlotCount: rejections.length,
          rejectionCounts: countByCode(rejections),
        });
      }
      this.#storeConfiguration(key, screenId, response, result.etag);
      return 'ready';
    } catch (error) {
      if (this.#activeRequestByScreen.get(screenId) !== request) {
        return 'ready';
      }
      const validationError =
        error instanceof UiSlotsResponseValidationError ? error : undefined;
      const rejectionCounts = validationError
        ? countByCode(validationError.rejections)
        : undefined;
      this.#diagnostics.error(
        error instanceof Error
          ? error
          : new Error('Failed to load UI Slots configuration.'),
        {
          tags: { feature: 'ui-slots' },
          context: {
            name: UI_SLOTS_CONTROLLER_NAME,
            data: {
              screenId,
              reason: validationError?.code ?? 'load-failed',
              ...(rejectionCounts && Object.keys(rejectionCounts).length > 0
                ? { rejectionCounts }
                : {}),
            },
          },
        },
      );
      return cached ? 'stale' : 'error';
    }
  }

  async #fetchScreen(
    request: FetchUiSlotsScreenRequest,
  ): Promise<FetchUiSlotsScreenResult> {
    for (let retries = 0; ; retries += 1) {
      try {
        return await this.#readClient.fetchScreen(request);
      } catch (error) {
        if (retries >= 2 || !isRetryableUiSlotsError(error)) {
          throw error;
        }
      }
    }
  }

  /**
   * Returns cached content that this build can still parse, validating
   * persisted entries once per session. Anything stale or incompatible is
   * dropped so the caller falls through to a network read.
   */
  #readCachedConfiguration(
    configurationKey: string,
    screenId: UiSlotsScreenId,
    locale: string,
  ): StoredScreenConfiguration | undefined {
    const stored = this.state.screenConfigurations[configurationKey];
    if (!stored) {
      return undefined;
    }

    const validatedResponse = this.#validatedResponses.get(configurationKey);
    if (validatedResponse) {
      if (this.#now() - stored.fetchedAt >= UI_SLOTS_HARD_TTL_MS) {
        this.#forgetConfiguration(configurationKey, screenId);
        return undefined;
      }
      return {
        response: validatedResponse,
        etag: stored.etag,
        fetchedAt: stored.fetchedAt,
      };
    }

    const validated = this.#validatePersistedConfiguration(
      stored,
      screenId,
      locale,
    );
    if (!validated) {
      this.#forgetConfiguration(configurationKey, screenId);
      return undefined;
    }
    this.#validatedResponses.set(configurationKey, validated.response);
    return validated;
  }

  #validatePersistedConfiguration(
    cached: unknown,
    screenId: UiSlotsScreenId,
    locale: string,
  ): StoredScreenConfiguration | undefined {
    if (typeof cached !== 'object' || cached === null) {
      return undefined;
    }
    const candidate = cached as Partial<StoredScreenConfiguration>;
    if (
      typeof candidate.fetchedAt !== 'number' ||
      !Number.isFinite(candidate.fetchedAt) ||
      (candidate.etag !== undefined && typeof candidate.etag !== 'string') ||
      this.#now() - candidate.fetchedAt >= UI_SLOTS_HARD_TTL_MS
    ) {
      return undefined;
    }

    try {
      const { response } = parseUiSlotsResponse(
        candidate.response,
        this.#contractRegistry,
      );
      if (response.screenId !== screenId || response.locale !== locale) {
        return undefined;
      }
      return {
        response,
        etag: candidate.etag,
        fetchedAt: candidate.fetchedAt,
      };
    } catch (error) {
      this.#diagnostics.error(
        error instanceof Error
          ? error
          : new Error('Invalid persisted UI Slots configuration.'),
        {
          tags: { feature: 'ui-slots' },
          context: {
            name: UI_SLOTS_CONTROLLER_NAME,
            data: { reason: 'invalid-persisted-configuration', screenId },
          },
        },
      );
      return undefined;
    }
  }

  #storeConfiguration(
    configurationKey: string,
    screenId: UiSlotsScreenId,
    response: UiSlotsScreenResponse,
    etag: string | undefined,
  ): void {
    const slotsById = Object.fromEntries(
      response.slots.map((slot) => [slot.slotId, slot]),
    );
    const evictedKeys = Object.entries(this.state.screenConfigurations)
      .filter(([key]) => key !== configurationKey)
      .sort(([, first], [, second]) => second.fetchedAt - first.fetchedAt)
      .slice(UI_SLOTS_MAX_CONFIGURATIONS - 1)
      .map(([key]) => key);
    this.#validatedResponses.set(configurationKey, response);
    for (const key of evictedKeys) {
      this.#validatedResponses.delete(key);
    }
    this.update((state) => {
      state.screenConfigurations[configurationKey] = {
        response,
        etag,
        fetchedAt: this.#now(),
      };
      state.activeConfigurations[screenId] = { configurationKey, slotsById };
      for (const key of evictedKeys) {
        delete state.screenConfigurations[key];
        for (const [activeScreenId, active] of Object.entries(
          state.activeConfigurations,
        )) {
          if (active?.configurationKey === key) {
            delete state.activeConfigurations[
              activeScreenId as UiSlotsScreenId
            ];
          }
        }
      }
    });
  }

  /**
   * No-op when the screen already renders this configuration. Without the
   * guard every screen focus would rewrite state and remount every widget.
   */
  #activateConfiguration(
    configurationKey: string,
    screenId: UiSlotsScreenId,
    response: UiSlotsScreenResponse,
  ): void {
    if (
      this.state.activeConfigurations[screenId]?.configurationKey ===
      configurationKey
    ) {
      return;
    }
    const slotsById = Object.fromEntries(
      response.slots.map((slot) => [slot.slotId, slot]),
    );
    this.update((state) => {
      state.activeConfigurations[screenId] = { configurationKey, slotsById };
    });
  }

  #clearActiveConfiguration(screenId: UiSlotsScreenId): void {
    if (!this.state.activeConfigurations[screenId]) {
      return;
    }
    this.update((state) => {
      delete state.activeConfigurations[screenId];
    });
  }

  #forgetConfiguration(
    configurationKey: string,
    screenId: UiSlotsScreenId,
  ): void {
    this.#validatedResponses.delete(configurationKey);
    this.update((state) => {
      delete state.screenConfigurations[configurationKey];
      if (
        state.activeConfigurations[screenId]?.configurationKey ===
        configurationKey
      ) {
        delete state.activeConfigurations[screenId];
      }
    });
  }
}
