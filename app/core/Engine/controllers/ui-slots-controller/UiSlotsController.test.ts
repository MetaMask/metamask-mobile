import type { UiSlotsControllerMessenger } from './types';
import {
  UiSlotsController,
  defaultUiSlotsControllerState,
} from './UiSlotsController';
import { PREDICT_UI_SLOT_DEFINITIONS } from '../../../../components/UI/Predict/uiSlots/slotDefinitions';
import { buildUiSlotsConfigurationKey } from './configurationKey';
import { MOBILE_UI_SLOTS_CONTRACT_REGISTRY } from '../../../../components/UI/UiSlots/mobileContractRegistry';
import {
  UI_SLOTS_CAPABILITY_COHORT,
  UI_SLOTS_CONTRACT_MAJOR,
  UI_SLOTS_PLATFORM,
  UI_SLOTS_SOFT_TTL_MS,
} from './config';

jest.mock('../../../../util/Logger');

const buildConfigurationKey = ({
  screenId,
  locale,
}: {
  screenId: 'predict-home';
  locale: string;
}) =>
  buildUiSlotsConfigurationKey({
    screenId,
    locale,
    platform: UI_SLOTS_PLATFORM,
    contractMajor: UI_SLOTS_CONTRACT_MAJOR,
    capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
  });

const makeResponse = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  configurationVersion: 'config-1',
  screenId: 'predict-home',
  locale: 'en',
  publishedAt: '2026-08-13T10:00:00.000Z',
  slots: [
    {
      slotId: 'predict-home.before-portfolio',
      contentId: 'banner-1',
      revision: 1,
      widget: {
        type: 'alert-banner',
        schemaVersion: 1,
        props: {
          tone: 'info',
          title: 'Title',
          description: 'Description',
        },
      },
      actions: [
        {
          actionId: 'dismiss',
          trigger: 'close',
          params: { scope: 'content' },
        },
      ],
    },
  ],
  ...overrides,
});

function buildMessenger(
  call: jest.Mock = jest.fn(),
): jest.Mocked<UiSlotsControllerMessenger> {
  return {
    call,
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    registerActionHandler: jest.fn(),
    unregisterActionHandler: jest.fn(),
    clearEventSubscriptions: jest.fn(),
    registerInitialEventPayload: jest.fn(),
  } as unknown as jest.Mocked<UiSlotsControllerMessenger>;
}

const controllerOptions = {
  clientVersion: '1.0.0',
  platform: 'mobile' as const,
  contractMajor: UI_SLOTS_CONTRACT_MAJOR,
  capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
  enabled: true,
  diagnostics: {
    log: jest.fn(),
    error: jest.fn(),
  },
  slotDefinitions: PREDICT_UI_SLOT_DEFINITIONS,
  contractRegistry: MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
};

function getRenderedSlots(controller: UiSlotsController) {
  const key = controller.state.activeConfigurationKeys['predict-home'];
  return key
    ? Object.values(controller.state.renderedConfigurations[key].slotsById)
    : [];
}

describe('UiSlotsController', () => {
  it('loads and publishes a validated screen', async () => {
    const messenger = buildMessenger(
      jest.fn().mockResolvedValue({
        status: 'modified',
        etag: '"config-1"',
        value: makeResponse(),
      }),
    );
    const controller = new UiSlotsController({
      messenger,
      ...controllerOptions,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(controller.state.requestStatus['predict-home']).toBe('ready');
    expect(getRenderedSlots(controller)).toHaveLength(1);
    const configurationKey = buildConfigurationKey({
      screenId: 'predict-home',
      locale: 'en',
    });
    expect(controller.state.screenConfigurations[configurationKey]?.etag).toBe(
      '"config-1"',
    );
  });

  it('deduplicates concurrent screen requests', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    const call = jest.fn().mockReturnValue(request);
    const controller = new UiSlotsController({
      messenger: buildMessenger(call),
      ...controllerOptions,
    });

    const first = controller.loadScreen('predict-home', 'en');
    const second = controller.loadScreen('predict-home', 'en');
    resolveRequest?.({
      status: 'modified',
      value: makeResponse(),
    });
    await Promise.all([first, second]);

    expect(call).toHaveBeenCalledTimes(1);
  });

  it('does not fetch or activate persisted content when disabled', async () => {
    const call = jest.fn();
    const controller = new UiSlotsController({
      ...controllerOptions,
      enabled: false,
      messenger: buildMessenger(call),
    });

    await controller.loadScreen('predict-home', 'en');

    expect(call).not.toHaveBeenCalled();
    expect(controller.state.activeConfigurationKeys).toEqual({});
    expect(controller.state.requestStatus['predict-home']).toBe('idle');
  });

  it('immediately removes active content when dynamically disabled', async () => {
    const controller = new UiSlotsController({
      ...controllerOptions,
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse(),
        }),
      ),
    });
    await controller.loadScreen('predict-home', 'en');

    controller.setEnabled(false);

    expect(controller.state.enabled).toBe(false);
    expect(controller.state.activeConfigurationKeys).toEqual({});
    expect(controller.state.renderedConfigurations).toEqual({});
  });

  it('disables active content when basic functionality is turned off', async () => {
    const controller = new UiSlotsController({
      ...controllerOptions,
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse(),
        }),
      ),
    });
    await controller.loadScreen('predict-home', 'en');

    controller.setBasicFunctionalityEnabled(false);
    controller.setEnabled(true);

    expect(controller.state.enabled).toBe(false);
    expect(controller.state.activeConfigurationKeys).toEqual({});
  });

  it('does not let an older locale request replace the latest locale', async () => {
    const resolvers = new Map<string, (value: unknown) => void>();
    const call = jest.fn(
      (_action: string, request: { locale: string }) =>
        new Promise((resolve) => {
          resolvers.set(request.locale, resolve);
        }),
    );
    const controller = new UiSlotsController({
      ...controllerOptions,
      messenger: buildMessenger(call),
    });

    const englishRequest = controller.loadScreen('predict-home', 'en');
    const frenchRequest = controller.loadScreen('predict-home', 'fr');
    resolvers.get('fr')?.({
      status: 'modified',
      value: makeResponse({ locale: 'fr' }),
    });
    await frenchRequest;
    resolvers.get('en')?.({
      status: 'modified',
      value: makeResponse({ locale: 'en' }),
    });
    await englishRequest;

    expect(controller.state.activeConfigurationKeys['predict-home']).toBe(
      buildConfigurationKey({
        screenId: 'predict-home',
        locale: 'fr',
      }),
    );
  });

  it('reactivates an existing in-flight request when locale returns to it', async () => {
    const resolvers = new Map<string, (value: unknown) => void>();
    const call = jest.fn(
      (_action: string, request: { locale: string }) =>
        new Promise((resolve) => {
          resolvers.set(request.locale, resolve);
        }),
    );
    const controller = new UiSlotsController({
      ...controllerOptions,
      messenger: buildMessenger(call),
    });

    const firstEnglishRequest = controller.loadScreen('predict-home', 'en');
    const frenchRequest = controller.loadScreen('predict-home', 'fr');
    const latestEnglishRequest = controller.loadScreen('predict-home', 'en');
    resolvers.get('fr')?.({
      status: 'modified',
      value: makeResponse({ locale: 'fr' }),
    });
    await frenchRequest;
    resolvers.get('en')?.({
      status: 'modified',
      value: makeResponse({ locale: 'en' }),
    });
    await Promise.all([firstEnglishRequest, latestEnglishRequest]);

    expect(call).toHaveBeenCalledTimes(2);
    expect(controller.state.activeConfigurationKeys['predict-home']).toBe(
      buildConfigurationKey({
        screenId: 'predict-home',
        locale: 'en',
      }),
    );
  });

  it('revalidates malformed persisted configuration before activation', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const configurationKey = buildConfigurationKey({
      screenId: 'predict-home',
      locale: 'en',
    });
    const call = jest.fn().mockResolvedValue({
      status: 'modified',
      value: makeResponse(),
    });
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      messenger: buildMessenger(call),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [configurationKey]: {
            response: { invalid: true },
            fetchedAt: now,
            capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
          },
        },
      } as never,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(call).toHaveBeenCalledWith('UiSlotsDataService:getScreen', {
      screenId: 'predict-home',
      locale: 'en',
      etag: undefined,
    });
    expect(getRenderedSlots(controller)).toHaveLength(1);
  });

  it('rejects malformed persisted cache metadata before activation', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const configurationKey = buildConfigurationKey({
      screenId: 'predict-home',
      locale: 'en',
    });
    const call = jest.fn().mockResolvedValue({
      status: 'modified',
      value: makeResponse(),
    });
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      messenger: buildMessenger(call),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [configurationKey]: {
            response: makeResponse(),
            fetchedAt: 'invalid',
            etag: 123,
            capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
          },
        },
      } as never,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(call).toHaveBeenCalledWith('UiSlotsDataService:getScreen', {
      screenId: 'predict-home',
      locale: 'en',
      etag: undefined,
    });
  });

  it('returns the next cache or content evaluation boundary', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const validUntil = now + 5 * 60 * 1000;
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse({
            slots: [
              {
                ...makeResponse().slots[0],
                validity: { until: new Date(validUntil).toISOString() },
              },
            ],
          }),
        }),
      ),
    });
    await controller.loadScreen('predict-home', 'en');

    expect(controller.getNextEvaluationAt('predict-home', 'en')).toBe(
      Math.min(now + UI_SLOTS_SOFT_TTL_MS, validUntil),
    );
  });

  it('expires content synchronously without waiting for a refresh', async () => {
    let now = 1_000;
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse({
            slots: [
              {
                ...makeResponse().slots[0],
                validity: { until: new Date(1_500).toISOString() },
              },
            ],
          }),
        }),
      ),
    });
    await controller.loadScreen('predict-home', 'en');
    expect(getRenderedSlots(controller)).toHaveLength(1);

    now = 2_000;
    controller.evaluateScreen('predict-home', 'en');

    expect(getRenderedSlots(controller)).toEqual([]);
  });

  it('reapplies validity rules after a 304 response', async () => {
    let now = 1_000;
    const configurationKey = buildConfigurationKey({
      screenId: 'predict-home',
      locale: 'en',
    });
    const response = makeResponse({
      slots: [
        {
          ...makeResponse().slots[0],
          validity: { until: new Date(1_500).toISOString() },
        },
      ],
    });
    const call = jest.fn(
      () =>
        new Promise((resolve) => {
          now = 2_000;
          resolve({ status: 'not-modified', etag: '"config-1"' });
        }),
    );
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      messenger: buildMessenger(call),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [configurationKey]: {
            response,
            fetchedAt: -1_000_000,
            etag: '"config-1"',
            capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
          },
        },
      } as never,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(getRenderedSlots(controller)).toEqual([]);
  });

  it('keeps last-known-good content after a failed refresh', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const response = makeResponse();
    const configurationKey = buildConfigurationKey({
      screenId: 'predict-home',
      locale: 'en',
    });
    const state = {
      ...defaultUiSlotsControllerState,
      screenConfigurations: {
        [configurationKey]: {
          response,
          fetchedAt: now - 20 * 60 * 1000,
          etag: '"config-1"',
          capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
        },
      },
    };
    const controller = new UiSlotsController({
      messenger: buildMessenger(jest.fn().mockRejectedValue(new Error('500'))),
      ...controllerOptions,
      now: () => now,
      state: state as never,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(controller.state.requestStatus['predict-home']).toBe('ready');
    expect(getRenderedSlots(controller)).toHaveLength(1);
  });

  it('replaces stale content with an empty compatible configuration', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const configurationKey = buildConfigurationKey({
      screenId: 'predict-home',
      locale: 'en',
    });
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse({
            configurationVersion: 'config-2',
            slots: [
              {
                ...makeResponse().slots[0],
                widget: {
                  type: 'future-widget',
                  schemaVersion: 1,
                  props: {},
                },
              },
            ],
          }),
        }),
      ),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [configurationKey]: {
            response: makeResponse(),
            fetchedAt: now - 20 * 60 * 1000,
            etag: '"config-1"',
            capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
          },
        },
      } as never,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(controller.state.requestStatus['predict-home']).toBe('ready');
    expect(getRenderedSlots(controller)).toEqual([]);
    expect(
      controller.state.screenConfigurations[configurationKey].response.slots,
    ).toEqual([]);
  });

  it('retains last-known-good content for a structurally malformed slot', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const configurationKey = buildConfigurationKey({
      screenId: 'predict-home',
      locale: 'en',
    });
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse({
            configurationVersion: 'config-2',
            slots: [{ ...makeResponse().slots[0], revision: undefined }],
          }),
        }),
      ),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [configurationKey]: {
            response: makeResponse(),
            fetchedAt: now - 20 * 60 * 1000,
            etag: '"config-1"',
            capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
          },
        },
      } as never,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(controller.state.requestStatus['predict-home']).toBe('ready');
    expect(getRenderedSlots(controller)).toHaveLength(1);
    expect(
      controller.state.screenConfigurations[configurationKey].response
        .configurationVersion,
    ).toBe('config-1');
  });

  it('removes dismissed content by content ID', async () => {
    const controller = new UiSlotsController({
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse(),
        }),
      ),
      ...controllerOptions,
    });
    await controller.loadScreen('predict-home', 'en');

    controller.dismissContent('banner-1');

    expect(controller.state.dismissedContentIds['banner-1']).toEqual(
      expect.any(Number),
    );
    expect(getRenderedSlots(controller)).toEqual([]);
  });

  it('bounds persisted configurations and dismissal history', async () => {
    let now = Date.parse('2026-08-13T10:00:00.000Z');
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      messenger: buildMessenger(
        jest.fn((_action, request: { locale: string }) =>
          Promise.resolve({
            status: 'modified',
            value: makeResponse({ locale: request.locale }),
          }),
        ),
      ),
    });

    for (let index = 0; index < 21; index += 1) {
      now += 1;
      await controller.loadScreen('predict-home', `locale-${index}`);
    }
    for (let index = 0; index < 501; index += 1) {
      now += 1;
      controller.dismissContent(`content-${index}`);
    }

    expect(Object.keys(controller.state.screenConfigurations)).toHaveLength(20);
    expect(Object.keys(controller.state.dismissedContentIds)).toHaveLength(500);
    expect(controller.state.dismissedContentIds['content-0']).toBeUndefined();
    expect(controller.state.dismissedContentIds['content-500']).toBeDefined();
  });

  it('filters expired and minimum-version-incompatible content', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const baseSlot = makeResponse().slots[0];
    const response = makeResponse({
      slots: [
        {
          ...baseSlot,
          contentId: 'expired',
          validity: { until: '2020-01-01T00:00:00.000Z' },
        },
        {
          ...baseSlot,
          contentId: 'future-client',
          compatibility: { mobile: { minimumVersion: '2.0.0' } },
        },
      ],
    });
    const controller = new UiSlotsController({
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: response,
        }),
      ),
      ...controllerOptions,
      now: () => now,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(getRenderedSlots(controller)).toEqual([]);
  });

  it('rejects content missing a required slot data reference', async () => {
    const controller = new UiSlotsController({
      messenger: buildMessenger(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse({
            slots: [
              {
                slotId: 'predict-home.live-now',
                contentId: 'carousel-without-markets',
                revision: 1,
                widget: {
                  type: 'market-carousel',
                  schemaVersion: 1,
                  props: {},
                },
              },
            ],
          }),
        }),
      ),
      ...controllerOptions,
    });

    await controller.loadScreen('predict-home', 'en');

    expect(getRenderedSlots(controller)).toEqual([]);
  });
});
