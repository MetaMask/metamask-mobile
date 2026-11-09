import { BaseController, type StateMetadata } from '@metamask/base-controller';
import { trace, TraceName } from '../../../../util/trace';
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
  type FetchUiSlotsScreenResult,
  UiSlotsHttpError,
  type UiSlotsReadTransport,
} from './UiSlotsApiReadClient';
import {
  UI_SLOTS_CONTROLLER_NAME,
  type UiSlotsControllerMessenger,
  type UiSlotsControllerState,
  type UiSlotsScreenId,
  type UiSlotsScreenResponse,
  type StoredScreenConfiguration,
  type UiSlot,
  type UiSlotsDiagnostics,
} from './types';

/**
 * `error` means the caller has nothing to render, `stale` means a refresh
 * failed but last-known-good content is still rendered. Both warrant a
 * backed-off retry; only `ready` means the cached freshness window is current,
 * so callers must not schedule off `getNextRefreshAt` for the other outcomes.
 */
export type UiSlotsLoadOutcome =
  | 'ready'
  | 'stale'
  | 'error'
  | 'disabled'
  | 'superseded';

/**
 * The token a screen currently loads under. Only the token still held for a
 * screen may write state, so a request superseded by a newer locale resolves
 * without touching anything.
 */
interface ActiveRequest {
  locale: string;
  force: boolean;
  abortController: AbortController;
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

const reuseUnchangedSlots = (
  previous: Record<string, UiSlot> | undefined,
  next: Record<string, UiSlot>,
): Record<string, UiSlot> => {
  if (!previous) {
    return next;
  }

  const nextIds = Object.keys(next);
  if (nextIds.length !== Object.keys(previous).length) {
    return next;
  }

  const merged: Record<string, UiSlot> = {};
  let changed = false;
  for (const id of nextIds) {
    const incoming = next[id];
    const existing = previous[id];
    if (
      existing &&
      existing.contentId === incoming.contentId &&
      existing.revision === incoming.revision
    ) {
      merged[id] = existing;
    } else {
      merged[id] = incoming;
      changed = true;
    }
  }

  return changed ? merged : previous;
};

const getUiSlotsLocaleCandidates = (
  _screenId: UiSlotsScreenId,
  locale: string,
): string[] => [...new Set([locale, locale.split('-')[0], 'en'])];

export class UiSlotsController extends BaseController<
  typeof UI_SLOTS_CONTROLLER_NAME,
  UiSlotsControllerState,
  UiSlotsControllerMessenger
> {
  #enabled: boolean;
  readonly #isExternalServicesEnabled: () => boolean;
  readonly #contractRegistry: UiSlotsContractRegistry;
  readonly #readClient: UiSlotsReadTransport;
  readonly #now: () => number;
  readonly #diagnostics: UiSlotsDiagnostics;
  readonly #activeRequestByScreen = new Map<UiSlotsScreenId, ActiveRequest>();
  readonly #missingConfigurationUntil = new Map<string, number>();
  readonly #refreshedAtByConfiguration = new Map<string, number>();
  readonly #etagByConfiguration = new Map<string, string>();
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
    isExternalServicesEnabled = () => true,
    state,
  }: {
    messenger: UiSlotsControllerMessenger;
    enabled: boolean;
    contractRegistry: UiSlotsContractRegistry;
    readClient: UiSlotsReadTransport;
    diagnostics: UiSlotsDiagnostics;
    now?: () => number;
    isExternalServicesEnabled?: () => boolean;
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
    this.#isExternalServicesEnabled = isExternalServicesEnabled;
    this.#contractRegistry = contractRegistry;
    this.#readClient = readClient;
    this.#diagnostics = diagnostics;
    this.#now = now;
  }

  loadScreen(
    screenId: UiSlotsScreenId,
    locale: string,
  ): Promise<UiSlotsLoadOutcome> {
    return this.#startScreenLoad(screenId, locale, false);
  }

  refreshScreen(
    screenId: UiSlotsScreenId,
    locale: string,
  ): Promise<UiSlotsLoadOutcome> {
    return this.#startScreenLoad(screenId, locale, true);
  }

  cancelScreenLoad(screenId: UiSlotsScreenId): void {
    const active = this.#activeRequestByScreen.get(screenId);
    if (!active) {
      return;
    }
    this.#activeRequestByScreen.delete(screenId);
    active.abortController.abort();
  }

  #canLoad(): boolean {
    return this.#enabled && this.#isExternalServicesEnabled();
  }

  #startScreenLoad(
    screenId: UiSlotsScreenId,
    locale: string,
    force: boolean,
  ): Promise<UiSlotsLoadOutcome> {
    if (!this.#canLoad()) {
      this.#clearActiveConfiguration(screenId);
      return Promise.resolve('disabled');
    }

    const active = this.#activeRequestByScreen.get(screenId);
    if (active?.locale === locale && (!force || active.force)) {
      return active.promise;
    }
    active?.abortController.abort();

    // The token has to be readable by `#loadScreen` before its promise exists.
    const request = {
      locale,
      force,
      abortController: new AbortController(),
    } as ActiveRequest;
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
      for (const request of this.#activeRequestByScreen.values()) {
        request.abortController.abort();
      }
      this.#activeRequestByScreen.clear();
    }
  }

  /** When the soft TTL expires and a revalidation becomes worthwhile. */
  getNextRefreshAt(
    screenId: UiSlotsScreenId,
    locale: string,
  ): number | undefined {
    if (!this.#canLoad()) {
      return undefined;
    }
    const candidates = getUiSlotsLocaleCandidates(screenId, locale);
    const activeKey =
      this.state.activeConfigurations[screenId]?.configurationKey;
    const activeCandidateIndex = activeKey
      ? candidates.findIndex(
          (candidate) =>
            buildConfigurationKey(screenId, candidate) === activeKey,
        )
      : -1;
    const relevantCandidates =
      activeCandidateIndex >= 0
        ? candidates.slice(0, activeCandidateIndex + 1)
        : candidates;
    const refreshTimes = relevantCandidates.flatMap((candidate) => {
      const key = buildConfigurationKey(screenId, candidate);
      const fetchedAt =
        this.#refreshedAtByConfiguration.get(key) ??
        this.state.screenConfigurations[key]?.fetchedAt;
      const missingUntil = this.#missingConfigurationUntil.get(key);
      return [
        ...(fetchedAt !== undefined && Number.isFinite(fetchedAt)
          ? [fetchedAt + UI_SLOTS_SOFT_TTL_MS]
          : []),
        ...(missingUntil === undefined ? [] : [missingUntil]),
      ];
    });
    return refreshTimes.length > 0 ? Math.min(...refreshTimes) : undefined;
  }

  async #loadScreen(
    screenId: UiSlotsScreenId,
    locale: string,
    request: ActiveRequest,
  ): Promise<UiSlotsLoadOutcome> {
    const candidates = getUiSlotsLocaleCandidates(screenId, locale).map(
      (candidate) => {
        const key = buildConfigurationKey(screenId, candidate);
        return {
          locale: candidate,
          key,
          cached: this.#readCachedConfiguration(key, screenId, candidate),
        };
      },
    );
    const fallback = candidates.find(({ cached }) => cached);
    if (fallback?.cached) {
      this.#activateConfiguration(
        fallback.key,
        screenId,
        fallback.cached.response,
      );
    }
    let lastRetryableError: unknown;

    for (const { locale: candidate, key, cached } of candidates) {
      if (this.#activeRequestByScreen.get(screenId) !== request) {
        return 'superseded';
      }

      if (cached) {
        this.#activateConfiguration(key, screenId, cached.response);
        if (
          !request.force &&
          this.#now() - cached.fetchedAt < UI_SLOTS_SOFT_TTL_MS
        ) {
          return 'ready';
        }
      } else {
        const missingUntil = this.#missingConfigurationUntil.get(key);
        if (
          !request.force &&
          missingUntil !== undefined &&
          this.#now() < missingUntil
        ) {
          continue;
        }
        this.#missingConfigurationUntil.delete(key);
      }

      try {
        const result = await trace({ name: TraceName.UiSlotsLoad }, () =>
          this.#readClient.fetchScreen({
            screenId,
            locale: candidate,
            etag: cached?.etag,
            signal: request.abortController.signal,
          }),
        );

        if (this.#activeRequestByScreen.get(screenId) !== request) {
          return 'superseded';
        }
        this.#missingConfigurationUntil.delete(key);
        return this.#applyScreenResult(
          result,
          cached,
          key,
          screenId,
          candidate,
        );
      } catch (error) {
        if (this.#activeRequestByScreen.get(screenId) !== request) {
          return 'superseded';
        }
        if (
          !cached &&
          error instanceof UiSlotsHttpError &&
          error.status === 404
        ) {
          this.#missingConfigurationUntil.set(
            key,
            this.#now() + UI_SLOTS_SOFT_TTL_MS,
          );
          continue;
        }
        if (!cached && isRetryableUiSlotsError(error)) {
          lastRetryableError = error;
          continue;
        }
        return this.#handleLoadError(
          error,
          request,
          screenId,
          Boolean(cached || fallback?.cached),
        );
      }
    }

    if (lastRetryableError) {
      return this.#handleLoadError(
        lastRetryableError,
        request,
        screenId,
        Boolean(fallback?.cached),
      );
    }
    this.#clearActiveConfiguration(screenId);
    return 'ready';
  }

  #applyScreenResult(
    result: FetchUiSlotsScreenResult,
    cached: StoredScreenConfiguration | undefined,
    key: string,
    screenId: UiSlotsScreenId,
    locale: string,
  ): UiSlotsLoadOutcome {
    if (result.status === 'not-modified') {
      if (!cached) {
        throw new Error('UI Slots returned 304 without cached content.');
      }
      const fetchedAt = this.#now();
      this.#refreshedAtByConfiguration.set(key, fetchedAt);
      if (result.etag) {
        this.#etagByConfiguration.set(key, result.etag);
      }
      this.update((state) => {
        const stored = state.screenConfigurations[key];
        if (!stored) {
          return;
        }
        stored.fetchedAt = fetchedAt;
        if (result.etag) {
          stored.etag = result.etag;
        }
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
  }

  #handleLoadError(
    error: unknown,
    request: ActiveRequest,
    screenId: UiSlotsScreenId,
    hasCachedConfiguration: boolean,
  ): UiSlotsLoadOutcome {
    if (this.#activeRequestByScreen.get(screenId) !== request) {
      return 'superseded';
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return 'superseded';
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
    return hasCachedConfiguration ? 'stale' : 'error';
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
      const fetchedAt =
        this.#refreshedAtByConfiguration.get(configurationKey) ??
        stored.fetchedAt;
      if (this.#now() - fetchedAt >= UI_SLOTS_HARD_TTL_MS) {
        this.#forgetConfiguration(configurationKey, screenId);
        return undefined;
      }
      return {
        response: validatedResponse,
        etag: this.#etagByConfiguration.get(configurationKey) ?? stored.etag,
        fetchedAt,
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
    const previousActive = this.state.activeConfigurations[screenId];
    const slotsById = reuseUnchangedSlots(
      previousActive?.configurationKey === configurationKey
        ? previousActive.slotsById
        : undefined,
      Object.fromEntries(response.slots.map((slot) => [slot.slotId, slot])),
    );
    const activeSlotsUnchanged =
      previousActive?.configurationKey === configurationKey &&
      previousActive.slotsById === slotsById;
    const evictedKeys = Object.entries(this.state.screenConfigurations)
      .filter(([key]) => key !== configurationKey)
      .sort(([, first], [, second]) => second.fetchedAt - first.fetchedAt)
      .slice(UI_SLOTS_MAX_CONFIGURATIONS - 1)
      .map(([key]) => key);
    this.#validatedResponses.set(configurationKey, response);
    this.#refreshedAtByConfiguration.delete(configurationKey);
    if (etag) {
      this.#etagByConfiguration.set(configurationKey, etag);
    } else {
      this.#etagByConfiguration.delete(configurationKey);
    }
    for (const key of evictedKeys) {
      this.#validatedResponses.delete(key);
      this.#refreshedAtByConfiguration.delete(key);
      this.#etagByConfiguration.delete(key);
    }
    this.update((state) => {
      state.screenConfigurations[configurationKey] = {
        response,
        etag,
        fetchedAt: this.#now(),
      };
      if (!activeSlotsUnchanged) {
        state.activeConfigurations[screenId] = { configurationKey, slotsById };
      }
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
    this.#refreshedAtByConfiguration.delete(configurationKey);
    this.#etagByConfiguration.delete(configurationKey);
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
