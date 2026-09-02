import type { UiSlotsControllerMessenger } from './types';
import {
  UiSlotsController,
  defaultUiSlotsControllerState,
} from './UiSlotsController';
import { PREDICT_UI_SLOTS_V1_CONTRACTS } from '../../../../components/UI/Predict/uiSlots/contracts/v1';
import { UI_SLOTS_CONTRACT_MAJOR, UI_SLOTS_SOFT_TTL_MS } from './config';
import type { UiSlotsReadTransport } from './UiSlotsApiReadClient';

jest.mock('../../../../util/Logger');

const buildConfigurationKey = (locale: string) =>
  `wallet-home:${encodeURIComponent(locale)}:${UI_SLOTS_CONTRACT_MAJOR}`;

const makeResponse = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  configurationVersion: 'config-1',
  screenId: 'wallet-home',
  locale: 'en',
  publishedAt: '2026-08-13T10:00:00.000Z',
  slots: [
    {
      slotId: 'wallet-home.predict-empty-state',
      contentId: 'predict-empty-state-1',
      revision: 1,
      widget: {
        type: 'predict-discovery-list',
        schemaVersion: 1,
        props: {},
      },
      dataReferences: [
        {
          id: 'markets',
          type: 'predict-homepage-market-slots',
          params: {
            venue: 'polymarket',
            items: [{ type: 'series', seriesId: 'btc-up-or-down-5m' }],
          },
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

const buildReadClient = (
  fetchScreen: jest.Mock = jest.fn(),
): UiSlotsReadTransport => ({ fetchScreen });

const controllerOptions = {
  enabled: true,
  messenger: buildMessenger(),
  diagnostics: {
    log: jest.fn(),
    error: jest.fn(),
  },
  contractRegistry: PREDICT_UI_SLOTS_V1_CONTRACTS,
};

function getActiveSlots(controller: UiSlotsController) {
  const active = controller.state.activeConfigurations['wallet-home'];
  return active ? Object.values(active.slotsById) : [];
}

describe('UiSlotsController', () => {
  it('loads and publishes a validated screen', async () => {
    const readClient = buildReadClient(
      jest.fn().mockResolvedValue({
        status: 'modified',
        etag: '"config-1"',
        value: makeResponse(),
      }),
    );
    const controller = new UiSlotsController({
      readClient,
      ...controllerOptions,
    });

    const outcome = await controller.loadScreen('wallet-home', 'en');

    expect(outcome).toBe('ready');
    expect(getActiveSlots(controller)).toHaveLength(1);
    expect(
      controller.state.screenConfigurations[buildConfigurationKey('en')]?.etag,
    ).toBe('"config-1"');
  });

  it('deduplicates concurrent screen requests', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    const call = jest.fn().mockReturnValue(request);
    const controller = new UiSlotsController({
      readClient: buildReadClient(call),
      ...controllerOptions,
    });

    const first = controller.loadScreen('wallet-home', 'en');
    const second = controller.loadScreen('wallet-home', 'en');
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
      readClient: buildReadClient(call),
    });

    const outcome = await controller.loadScreen('wallet-home', 'en');

    expect(outcome).toBe('disabled');
    expect(call).not.toHaveBeenCalled();
    expect(controller.state.activeConfigurations).toEqual({});
  });

  it('immediately removes active content when dynamically disabled', async () => {
    const controller = new UiSlotsController({
      ...controllerOptions,
      readClient: buildReadClient(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse(),
        }),
      ),
    });
    await controller.loadScreen('wallet-home', 'en');

    controller.setEnabled(false);

    expect(controller.state.enabled).toBe(false);
    expect(controller.state.activeConfigurations).toEqual({});
  });

  it('does not let an older locale request replace the latest locale', async () => {
    const resolvers = new Map<string, (value: unknown) => void>();
    const call = jest.fn(
      (request: { locale: string }) =>
        new Promise((resolve) => {
          resolvers.set(request.locale, resolve);
        }),
    );
    const controller = new UiSlotsController({
      ...controllerOptions,
      readClient: buildReadClient(call),
    });

    const englishRequest = controller.loadScreen('wallet-home', 'en');
    const frenchRequest = controller.loadScreen('wallet-home', 'fr');
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

    expect(
      controller.state.activeConfigurations['wallet-home']?.configurationKey,
    ).toBe(buildConfigurationKey('fr'));
  });

  it('shares one request between concurrent loads of the same locale', async () => {
    const resolvers = new Map<string, (value: unknown) => void>();
    const call = jest.fn(
      (request: { locale: string }) =>
        new Promise((resolve) => {
          resolvers.set(request.locale, resolve);
        }),
    );
    const controller = new UiSlotsController({
      ...controllerOptions,
      readClient: buildReadClient(call),
    });

    const first = controller.loadScreen('wallet-home', 'en');
    const second = controller.loadScreen('wallet-home', 'en');
    resolvers.get('en')?.({
      status: 'modified',
      value: makeResponse({ locale: 'en' }),
    });
    await Promise.all([first, second]);

    expect(second).toBe(first);
    expect(call).toHaveBeenCalledTimes(1);
    expect(
      controller.state.activeConfigurations['wallet-home']?.configurationKey,
    ).toBe(buildConfigurationKey('en'));
  });

  it('revalidates malformed persisted configuration before activation', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const call = jest.fn().mockResolvedValue({
      status: 'modified',
      value: makeResponse(),
    });
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(call),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [buildConfigurationKey('en')]: {
            response: { invalid: true },
            fetchedAt: now,
          },
        },
      } as never,
    });

    await controller.loadScreen('wallet-home', 'en');

    expect(call).toHaveBeenCalledWith({
      screenId: 'wallet-home',
      locale: 'en',
      etag: undefined,
    });
    expect(getActiveSlots(controller)).toHaveLength(1);
  });

  it('rejects malformed persisted cache metadata before activation', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const call = jest.fn().mockResolvedValue({
      status: 'modified',
      value: makeResponse(),
    });
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(call),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [buildConfigurationKey('en')]: {
            response: makeResponse(),
            fetchedAt: 'invalid',
            etag: 123,
          },
        },
      } as never,
    });

    await controller.loadScreen('wallet-home', 'en');

    expect(call).toHaveBeenCalledWith({
      screenId: 'wallet-home',
      locale: 'en',
      etag: undefined,
    });
  });

  it('returns the next refresh boundary from the soft TTL', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse(),
        }),
      ),
    });
    await controller.loadScreen('wallet-home', 'en');

    expect(controller.getNextRefreshAt('wallet-home', 'en')).toBe(
      now + UI_SLOTS_SOFT_TTL_MS,
    );
  });

  it('reuses fresh cached content without a second request', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const call = jest.fn().mockResolvedValue({
      status: 'modified',
      value: makeResponse(),
    });
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(call),
    });
    await controller.loadScreen('wallet-home', 'en');

    await controller.loadScreen('wallet-home', 'en');

    expect(call).toHaveBeenCalledTimes(1);
  });

  it('keeps the rendered slot identity stable across repeated loads', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse(),
        }),
      ),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [buildConfigurationKey('en')]: {
            response: makeResponse(),
            fetchedAt: now,
            etag: '"config-1"',
          },
        },
      } as never,
    });

    await controller.loadScreen('wallet-home', 'en');
    const [firstSlot] = getActiveSlots(controller);
    const firstActive = controller.state.activeConfigurations['wallet-home'];
    await controller.loadScreen('wallet-home', 'en');

    expect(getActiveSlots(controller)[0]).toBe(firstSlot);
    expect(controller.state.activeConfigurations['wallet-home']).toBe(
      firstActive,
    );
  });

  it('keeps the rendered slot identity stable across a 304 revalidation', async () => {
    let now = Date.parse('2026-08-13T10:00:00.000Z');
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(
        jest.fn().mockResolvedValue({
          status: 'not-modified',
          etag: '"config-1"',
        }),
      ),
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [buildConfigurationKey('en')]: {
            response: makeResponse(),
            fetchedAt: now - UI_SLOTS_SOFT_TTL_MS - 1,
            etag: '"config-1"',
          },
        },
      } as never,
    });
    await controller.loadScreen('wallet-home', 'en');
    const [firstSlot] = getActiveSlots(controller);

    now += UI_SLOTS_SOFT_TTL_MS + 1;
    await controller.loadScreen('wallet-home', 'en');

    expect(getActiveSlots(controller)[0]).toBe(firstSlot);
    expect(
      controller.state.screenConfigurations[buildConfigurationKey('en')]
        .fetchedAt,
    ).toBe(now);
  });

  it('keeps last-known-good content after a failed refresh', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const fetchScreen = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed'));
    const controller = new UiSlotsController({
      readClient: buildReadClient(fetchScreen),
      ...controllerOptions,
      now: () => now,
      state: {
        ...defaultUiSlotsControllerState,
        screenConfigurations: {
          [buildConfigurationKey('en')]: {
            response: makeResponse(),
            fetchedAt: now - 20 * 60 * 1000,
            etag: '"config-1"',
          },
        },
      } as never,
    });

    const outcome = await controller.loadScreen('wallet-home', 'en');

    expect(outcome).toBe('stale');
    expect(getActiveSlots(controller)).toHaveLength(1);
    expect(fetchScreen).toHaveBeenCalledTimes(3);
  });

  it('reports an error outcome when a failed load has no cached content', async () => {
    const controller = new UiSlotsController({
      ...controllerOptions,
      readClient: buildReadClient(
        jest.fn().mockRejectedValue(new Error('404')),
      ),
    });

    const outcome = await controller.loadScreen('wallet-home', 'en');

    expect(outcome).toBe('error');
    expect(getActiveSlots(controller)).toEqual([]);
  });

  it('replaces stale content with an empty compatible configuration', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const configurationKey = buildConfigurationKey('en');
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(
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
          },
        },
      } as never,
    });

    await controller.loadScreen('wallet-home', 'en');

    expect(getActiveSlots(controller)).toEqual([]);
    expect(
      controller.state.screenConfigurations[configurationKey].response.slots,
    ).toEqual([]);
  });

  it('retains last-known-good content for a structurally malformed slot', async () => {
    const now = Date.parse('2026-08-13T10:00:00.000Z');
    const configurationKey = buildConfigurationKey('en');
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(
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
          },
        },
      } as never,
    });

    await controller.loadScreen('wallet-home', 'en');

    expect(getActiveSlots(controller)).toHaveLength(1);
    expect(
      controller.state.screenConfigurations[configurationKey].response
        .configurationVersion,
    ).toBe('config-1');
  });

  it('bounds persisted configurations', async () => {
    let now = Date.parse('2026-08-13T10:00:00.000Z');
    const controller = new UiSlotsController({
      ...controllerOptions,
      now: () => now,
      readClient: buildReadClient(
        jest.fn((request: { locale: string }) =>
          Promise.resolve({
            status: 'modified',
            value: makeResponse({ locale: request.locale }),
          }),
        ),
      ),
    });

    for (let index = 0; index < 21; index += 1) {
      now += 1;
      await controller.loadScreen('wallet-home', `locale-${index}`);
    }
    expect(Object.keys(controller.state.screenConfigurations)).toHaveLength(20);
  });

  it('rejects content missing a required slot data reference', async () => {
    const controller = new UiSlotsController({
      readClient: buildReadClient(
        jest.fn().mockResolvedValue({
          status: 'modified',
          value: makeResponse({
            slots: [
              {
                slotId: 'wallet-home.predict-empty-state',
                contentId: 'discovery-without-markets',
                revision: 1,
                widget: {
                  type: 'predict-discovery-list',
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

    await controller.loadScreen('wallet-home', 'en');

    expect(getActiveSlots(controller)).toEqual([]);
  });
});
