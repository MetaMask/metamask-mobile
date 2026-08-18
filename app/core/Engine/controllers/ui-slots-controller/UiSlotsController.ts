import { BaseController, type StateMetadata } from '@metamask/base-controller';
import {
  UI_SLOTS_HARD_TTL_MS,
  UI_SLOTS_MAX_CONFIGURATIONS,
  UI_SLOTS_MAX_DISMISSALS,
  UI_SLOTS_SOFT_TTL_MS,
} from './config';
import { buildUiSlotsConfigurationKey } from './configurationKey';
import {
  parseUiSlotsResponse,
  UiSlotsResponseValidationError,
} from './contracts/v1';
import type { UiSlotsContractRegistry } from './contracts/registry';
import {
  applyUiSlotsClientRules,
  interpretScreenConfiguration,
} from './interpret';
import type { UiSlotDefinitions } from './slotDefinitions';
import {
  UI_SLOTS_CONTROLLER_NAME,
  type UiSlot,
  type UiSlotsConfigurationKey,
  type UiSlotsControllerMessenger,
  type UiSlotsControllerState,
  type RenderedScreenConfiguration,
  type UiSlotsScreenId,
  type UiSlotsScreenResponse,
  type StoredScreenConfiguration,
  type UiSlotsDiagnostics,
  type UiSlotsPlatform,
} from './types';

interface InFlightRequest {
  requestId: number;
  promise: Promise<void>;
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
  renderedConfigurations: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  activeConfigurationKeys: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: false,
    usedInUi: true,
  },
  requestStatus: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: false,
    usedInUi: true,
  },
  dismissedContentIds: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: false,
    usedInUi: true,
  },
};

export const defaultUiSlotsControllerState: UiSlotsControllerState = {
  enabled: false,
  screenConfigurations: {},
  renderedConfigurations: {},
  activeConfigurationKeys: {},
  requestStatus: {},
  dismissedContentIds: {},
};

export class UiSlotsController extends BaseController<
  typeof UI_SLOTS_CONTROLLER_NAME,
  UiSlotsControllerState,
  UiSlotsControllerMessenger
> {
  readonly #clientVersion: string;
  readonly #platform: UiSlotsPlatform;
  readonly #contractMajor: number;
  readonly #capabilityCohort: string;
  #enabled: boolean;
  #rolloutEnabled: boolean;
  #basicFunctionalityEnabled = true;
  readonly #slotDefinitions: UiSlotDefinitions;
  readonly #contractRegistry: UiSlotsContractRegistry;
  readonly #now: () => number;
  readonly #diagnostics: UiSlotsDiagnostics;
  readonly #inFlight = new Map<string, InFlightRequest>();
  readonly #nextRequestIdByScreen = new Map<UiSlotsScreenId, number>();
  readonly #latestRequestIdByScreen = new Map<UiSlotsScreenId, number>();
  readonly #lastRequestedLocaleByScreen = new Map<UiSlotsScreenId, string>();
  readonly #contentLocations = new Map<
    string,
    Map<UiSlotsConfigurationKey, string>
  >();
  readonly #indexedContentIdsByConfiguration = new Map<
    UiSlotsConfigurationKey,
    Set<string>
  >();

  constructor({
    messenger,
    clientVersion,
    platform,
    contractMajor,
    capabilityCohort,
    enabled,
    slotDefinitions,
    contractRegistry,
    diagnostics,
    now = Date.now,
    state,
  }: {
    messenger: UiSlotsControllerMessenger;
    clientVersion: string;
    platform: UiSlotsPlatform;
    contractMajor: number;
    capabilityCohort: string;
    enabled: boolean;
    slotDefinitions: UiSlotDefinitions;
    contractRegistry: UiSlotsContractRegistry;
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
        renderedConfigurations: {},
        activeConfigurationKeys: {},
        requestStatus: {},
      },
    });
    this.#clientVersion = clientVersion;
    this.#platform = platform;
    this.#contractMajor = contractMajor;
    this.#capabilityCohort = capabilityCohort;
    this.#enabled = enabled;
    this.#rolloutEnabled = enabled;
    this.#slotDefinitions = slotDefinitions;
    this.#contractRegistry = contractRegistry;
    this.#diagnostics = diagnostics;
    this.#now = now;
  }

  loadScreen(screenId: UiSlotsScreenId, locale: string): Promise<void> {
    this.#lastRequestedLocaleByScreen.set(screenId, locale);
    if (!this.#enabled) {
      this.update((state) => {
        delete state.activeConfigurationKeys[screenId];
        state.requestStatus[screenId] = 'idle';
      });
      return Promise.resolve();
    }

    const inFlightKey = `${screenId}:${locale}`;
    const existing = this.#inFlight.get(inFlightKey);
    if (existing) {
      this.#latestRequestIdByScreen.set(screenId, existing.requestId);
      return existing.promise;
    }

    const requestId = (this.#nextRequestIdByScreen.get(screenId) ?? 0) + 1;
    this.#nextRequestIdByScreen.set(screenId, requestId);
    this.#latestRequestIdByScreen.set(screenId, requestId);
    const request = this.#loadScreen(screenId, locale, requestId).finally(
      () => {
        if (this.#inFlight.get(inFlightKey)?.requestId === requestId) {
          this.#inFlight.delete(inFlightKey);
        }
      },
    );
    this.#inFlight.set(inFlightKey, { requestId, promise: request });
    return request;
  }

  setEnabled(enabled: boolean): void {
    this.#rolloutEnabled = enabled;
    this.#updateEffectiveEnabled();
  }

  setBasicFunctionalityEnabled(enabled: boolean): void {
    this.#basicFunctionalityEnabled = enabled;
    this.#updateEffectiveEnabled();
  }

  #updateEffectiveEnabled(): void {
    const enabled = this.#rolloutEnabled && this.#basicFunctionalityEnabled;
    if (this.#enabled === enabled) {
      return;
    }

    this.#enabled = enabled;
    this.update((state) => {
      state.enabled = enabled;
      if (!enabled) {
        state.activeConfigurationKeys = {};
        state.renderedConfigurations = {};
        for (const screenId of Object.keys(
          state.requestStatus,
        ) as UiSlotsScreenId[]) {
          state.requestStatus[screenId] = 'idle';
        }
      }
    });

    if (!enabled) {
      for (const screenId of this.#lastRequestedLocaleByScreen.keys()) {
        const requestId = (this.#nextRequestIdByScreen.get(screenId) ?? 0) + 1;
        this.#nextRequestIdByScreen.set(screenId, requestId);
        this.#latestRequestIdByScreen.set(screenId, requestId);
      }
      this.#inFlight.clear();
      this.#contentLocations.clear();
      this.#indexedContentIdsByConfiguration.clear();
      return;
    }

    for (const [screenId, locale] of this.#lastRequestedLocaleByScreen) {
      this.loadScreen(screenId, locale).catch((error) => {
        this.#diagnostics.error(
          error instanceof Error
            ? error
            : new Error('Failed to enable UI Slots screen.'),
        );
      });
    }
  }

  getNextEvaluationAt(
    screenId: UiSlotsScreenId,
    locale: string,
  ): number | undefined {
    const candidates = [
      this.getNextRefreshAt(screenId, locale),
      this.getNextContentBoundaryAt(screenId, locale),
    ].filter((value): value is number => value !== undefined);
    return candidates.length > 0 ? Math.min(...candidates) : undefined;
  }

  getNextRefreshAt(
    screenId: UiSlotsScreenId,
    locale: string,
  ): number | undefined {
    if (!this.#enabled) {
      return undefined;
    }

    const configurationKey = this.#buildConfigurationKey({
      screenId,
      locale,
    });
    const cached = this.state.screenConfigurations[configurationKey];
    if (!cached) {
      return undefined;
    }
    return cached.fetchedAt + UI_SLOTS_SOFT_TTL_MS;
  }

  getNextContentBoundaryAt(
    screenId: UiSlotsScreenId,
    locale: string,
  ): number | undefined {
    if (!this.#enabled) {
      return undefined;
    }
    const configurationKey = this.#buildConfigurationKey({
      screenId,
      locale,
    });
    const cached = this.state.screenConfigurations[configurationKey];
    if (!cached) {
      return undefined;
    }
    const now = this.#now();
    const candidates = [cached.fetchedAt + UI_SLOTS_HARD_TTL_MS];
    for (const slot of cached.response.slots) {
      for (const boundary of [slot.validity?.from, slot.validity?.until]) {
        const timestamp = boundary ? Date.parse(boundary) : Number.NaN;
        if (Number.isFinite(timestamp) && timestamp > now) {
          candidates.push(timestamp);
        }
      }
    }

    return Math.min(...candidates);
  }

  evaluateScreen(screenId: UiSlotsScreenId, locale: string): void {
    if (!this.#enabled) {
      return;
    }
    const configurationKey = this.#buildConfigurationKey({
      screenId,
      locale,
    });
    const cached = this.state.screenConfigurations[configurationKey];
    const compatibleCache = cached
      ? this.#validateCachedConfiguration(cached, screenId, locale, this.#now())
      : undefined;

    if (compatibleCache) {
      this.#activateConfiguration(
        configurationKey,
        screenId,
        compatibleCache.response,
      );
      return;
    }
    if (cached) {
      this.update((state) => {
        delete state.screenConfigurations[configurationKey];
        delete state.renderedConfigurations[configurationKey];
        if (state.activeConfigurationKeys[screenId] === configurationKey) {
          delete state.activeConfigurationKeys[screenId];
        }
      });
      this.#removeConfigurationIndex(configurationKey);
    }
  }

  dismissContent(contentId: string): void {
    const locations = this.#contentLocations.get(contentId);
    this.update((state) => {
      state.dismissedContentIds[contentId] = this.#now();
      this.#pruneDismissals(state.dismissedContentIds);

      for (const [configurationKey, slotId] of locations ?? []) {
        const rendered = state.renderedConfigurations[configurationKey];
        if (!rendered) {
          continue;
        }
        delete rendered.slotsById[slotId];
        rendered.slotIds = rendered.slotIds.filter(
          (candidate) => candidate !== slotId,
        );
      }
    });
    this.#contentLocations.delete(contentId);
  }

  #buildConfigurationKey({
    screenId,
    locale,
  }: {
    screenId: UiSlotsScreenId;
    locale: string;
  }): UiSlotsConfigurationKey {
    return buildUiSlotsConfigurationKey({
      screenId,
      locale,
      platform: this.#platform,
      contractMajor: this.#contractMajor,
      capabilityCohort: this.#capabilityCohort,
    });
  }

  async #loadScreen(
    screenId: UiSlotsScreenId,
    locale: string,
    requestId: number,
  ): Promise<void> {
    const configurationKey = this.#buildConfigurationKey({
      screenId,
      locale,
    });
    const now = this.#now();
    const cached = this.state.screenConfigurations[configurationKey];
    const compatibleCache = cached
      ? this.#validateCachedConfiguration(cached, screenId, locale, now)
      : undefined;

    if (compatibleCache) {
      this.#activateConfiguration(
        configurationKey,
        screenId,
        compatibleCache.response,
      );
      if (now - compatibleCache.fetchedAt < UI_SLOTS_SOFT_TTL_MS) {
        return;
      }
    } else {
      this.update((state) => {
        delete state.activeConfigurationKeys[screenId];
        state.requestStatus[screenId] = 'loading';
        if (cached) {
          delete state.screenConfigurations[configurationKey];
          delete state.renderedConfigurations[configurationKey];
        }
      });
      if (cached) {
        this.#removeConfigurationIndex(configurationKey);
      }
    }

    try {
      const result = await this.messenger.call('UiSlotsDataService:getScreen', {
        screenId,
        locale,
        etag: compatibleCache?.etag,
      });

      if (this.#latestRequestIdByScreen.get(screenId) !== requestId) {
        return;
      }

      if (result.status === 'not-modified') {
        const current = this.state.screenConfigurations[configurationKey];
        if (!current) {
          throw new Error('UI Slots returned 304 without cached content.');
        }

        const rendered = this.#toRenderedConfiguration(current.response);
        const evictedKeys = this.#configurationKeysToEvict(configurationKey);
        this.update((state) => {
          const stored = state.screenConfigurations[configurationKey];
          stored.fetchedAt = this.#now();
          stored.etag = result.etag ?? stored.etag;
          state.renderedConfigurations[configurationKey] = rendered;
          state.activeConfigurationKeys[screenId] = configurationKey;
          state.requestStatus[screenId] = 'ready';
          this.#evictConfigurationKeys(state, evictedKeys);
        });
        this.#replaceConfigurationIndex(configurationKey, rendered);
        evictedKeys.forEach((key) => this.#removeConfigurationIndex(key));
        return;
      }

      const { response, rejectedSlotCount, rejections } = parseUiSlotsResponse(
        result.value,
        this.#contractRegistry,
      );
      if (response.screenId !== screenId || response.locale !== locale) {
        throw new Error('UI Slots response did not match the request.');
      }

      const rendered = this.#toRenderedConfiguration(response, true);
      const evictedKeys = this.#configurationKeysToEvict(configurationKey);
      this.update((state) => {
        state.screenConfigurations[configurationKey] = {
          response,
          etag: result.etag,
          fetchedAt: this.#now(),
          capabilityCohort: this.#capabilityCohort,
        };
        state.renderedConfigurations[configurationKey] = rendered;
        state.activeConfigurationKeys[screenId] = configurationKey;
        state.requestStatus[screenId] = 'ready';
        this.#evictConfigurationKeys(state, evictedKeys);
      });
      this.#replaceConfigurationIndex(configurationKey, rendered);
      evictedKeys.forEach((key) => this.#removeConfigurationIndex(key));

      if (rejectedSlotCount > 0) {
        const rejectionCounts = rejections.reduce<Record<string, number>>(
          (counts, { code }) => {
            counts[code] = (counts[code] ?? 0) + 1;
            return counts;
          },
          {},
        );
        this.#diagnostics.log('UI Slots response contained rejected slots', {
          screenId,
          configurationVersion: response.configurationVersion,
          rejectedSlotCount,
          rejectionCounts,
        });
      }
    } catch (error) {
      if (this.#latestRequestIdByScreen.get(screenId) !== requestId) {
        return;
      }
      this.update((state) => {
        state.requestStatus[screenId] = compatibleCache ? 'ready' : 'error';
      });
      const validationError =
        error instanceof UiSlotsResponseValidationError ? error : undefined;
      const rejectionCounts = validationError?.rejections.reduce<
        Record<string, number>
      >((counts, { code }) => {
        counts[code] = (counts[code] ?? 0) + 1;
        return counts;
      }, {});
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
    }
  }

  #interpret(response: UiSlotsScreenResponse, logRejections = false): UiSlot[] {
    const interpreted = interpretScreenConfiguration(
      response,
      this.#slotDefinitions,
    );
    if (logRejections && interpreted.rejections.length > 0) {
      const rejectionCounts = interpreted.rejections.reduce<
        Record<string, number>
      >((counts, { code }) => {
        counts[code] = (counts[code] ?? 0) + 1;
        return counts;
      }, {});
      this.#diagnostics.log(
        'UI Slots configuration contained incompatible slots',
        {
          screenId: response.screenId,
          configurationVersion: response.configurationVersion,
          rejectedSlotCount: interpreted.rejections.length,
          rejectionCounts,
        },
      );
    }
    return applyUiSlotsClientRules({
      slots: interpreted.slots,
      dismissedContentIds: this.state.dismissedContentIds,
      clientVersion: this.#clientVersion,
      platform: this.#platform,
      now: this.#now(),
    });
  }

  #validateCachedConfiguration(
    cached: unknown,
    screenId: UiSlotsScreenId,
    locale: string,
    now: number,
  ): StoredScreenConfiguration | undefined {
    if (typeof cached !== 'object' || cached === null) {
      return undefined;
    }
    const candidate = cached as Partial<StoredScreenConfiguration>;
    if (
      candidate.capabilityCohort !== this.#capabilityCohort ||
      typeof candidate.fetchedAt !== 'number' ||
      !Number.isFinite(candidate.fetchedAt) ||
      (candidate.etag !== undefined && typeof candidate.etag !== 'string') ||
      now - candidate.fetchedAt >= UI_SLOTS_HARD_TTL_MS
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
        capabilityCohort: candidate.capabilityCohort,
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

  #activateConfiguration(
    configurationKey: UiSlotsConfigurationKey,
    screenId: UiSlotsScreenId,
    response: UiSlotsScreenResponse,
  ): void {
    const rendered = this.#toRenderedConfiguration(response);
    this.update((state) => {
      const stored = state.screenConfigurations[configurationKey];
      if (stored) {
        stored.response = response;
      }
      state.renderedConfigurations[configurationKey] = rendered;
      state.activeConfigurationKeys[screenId] = configurationKey;
      state.requestStatus[screenId] = 'ready';
    });
    this.#replaceConfigurationIndex(configurationKey, rendered);
  }

  #toRenderedConfiguration(
    response: UiSlotsScreenResponse,
    logRejections = false,
  ): RenderedScreenConfiguration {
    const slots = this.#interpret(response, logRejections);
    return {
      slotsById: Object.fromEntries(slots.map((slot) => [slot.slotId, slot])),
      slotIds: slots.map((slot) => slot.slotId),
    };
  }

  #replaceConfigurationIndex(
    configurationKey: UiSlotsConfigurationKey,
    rendered: RenderedScreenConfiguration,
  ): void {
    this.#removeConfigurationIndex(configurationKey);
    const contentIds = new Set<string>();

    for (const slot of Object.values(rendered.slotsById)) {
      contentIds.add(slot.contentId);
      const locations =
        this.#contentLocations.get(slot.contentId) ??
        new Map<UiSlotsConfigurationKey, string>();
      locations.set(configurationKey, slot.slotId);
      this.#contentLocations.set(slot.contentId, locations);
    }

    this.#indexedContentIdsByConfiguration.set(configurationKey, contentIds);
  }

  #removeConfigurationIndex(configurationKey: UiSlotsConfigurationKey): void {
    const contentIds =
      this.#indexedContentIdsByConfiguration.get(configurationKey);
    for (const contentId of contentIds ?? []) {
      const locations = this.#contentLocations.get(contentId);
      locations?.delete(configurationKey);
      if (locations?.size === 0) {
        this.#contentLocations.delete(contentId);
      }
    }
    this.#indexedContentIdsByConfiguration.delete(configurationKey);
  }

  #configurationKeysToEvict(
    currentKey: UiSlotsConfigurationKey,
  ): UiSlotsConfigurationKey[] {
    return Object.entries(this.state.screenConfigurations)
      .filter(([key]) => key !== currentKey)
      .sort(([, first], [, second]) => second.fetchedAt - first.fetchedAt)
      .slice(UI_SLOTS_MAX_CONFIGURATIONS - 1)
      .map(([key]) => key);
  }

  #evictConfigurationKeys(
    state: UiSlotsControllerState,
    keys: UiSlotsConfigurationKey[],
  ): void {
    for (const key of keys) {
      delete state.screenConfigurations[key];
      delete state.renderedConfigurations[key];
      for (const [screenId, activeKey] of Object.entries(
        state.activeConfigurationKeys,
      )) {
        if (activeKey === key) {
          delete state.activeConfigurationKeys[screenId as UiSlotsScreenId];
        }
      }
    }
  }

  #pruneDismissals(dismissals: Record<string, number>): void {
    const entries = Object.entries(dismissals);
    if (entries.length <= UI_SLOTS_MAX_DISMISSALS) {
      return;
    }

    entries
      .sort(([, first], [, second]) => first - second)
      .slice(0, entries.length - UI_SLOTS_MAX_DISMISSALS)
      .forEach(([contentId]) => delete dismissals[contentId]);
  }
}
