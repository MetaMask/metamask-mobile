import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getGeolocationControllerMessenger } from '../../messengers/geolocation-controller-messenger';
import type { ControllerInitRequest } from '../../types';
import { geolocationControllerInit } from './index';
import {
  GeolocationController,
  type GeolocationControllerMessenger,
} from '@metamask/geolocation-controller';
import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/geolocation-controller', () => {
  const MockGeolocationController = jest.fn().mockImplementation(() => ({
    getGeolocation: jest.fn().mockResolvedValue('US'),
  }));
  // Preserve instanceof checks
  MockGeolocationController.prototype = Object.create(
    MockGeolocationController.prototype,
  );
  return {
    ...jest.requireActual('@metamask/geolocation-controller'),
    GeolocationController: MockGeolocationController,
  };
});

function getInitRequestMock(
  overrides?: Partial<ControllerInitRequest<GeolocationControllerMessenger>>,
): jest.Mocked<ControllerInitRequest<GeolocationControllerMessenger>> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getGeolocationControllerMessenger(baseMessenger),
    initMessenger: undefined,
    ...overrides,
  };
}

describe('geolocationControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } = geolocationControllerInit(getInitRequestMock());
    expect(controller).toBeDefined();
    expect(GeolocationController).toHaveBeenCalledTimes(1);
  });

  it('passes the messenger to the controller', () => {
    geolocationControllerInit(getInitRequestMock());

    const ControllerMock = jest.mocked(GeolocationController);
    expect(ControllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
      }),
    );
  });

  it('triggers eager fetch when location is UNKNOWN', () => {
    const { controller } = geolocationControllerInit(getInitRequestMock());
    expect(controller.getGeolocation).toHaveBeenCalled();
  });

  it('skips eager fetch when persisted state has a known location', () => {
    const { controller } = geolocationControllerInit(
      getInitRequestMock({
        persistedState: {
          GeolocationController: {
            location: 'US',
            status: 'complete',
            lastFetchedAt: Date.now(),
            error: null,
          },
        },
      }),
    );
    expect(controller.getGeolocation).not.toHaveBeenCalled();
  });

  it('hydrates controller state from persisted state', () => {
    const persistedLocation = {
      location: 'FR',
      status: 'complete' as const,
      lastFetchedAt: 1234567890,
      error: null,
    };
    geolocationControllerInit(
      getInitRequestMock({
        persistedState: { GeolocationController: persistedLocation },
      }),
    );

    const ControllerMock = jest.mocked(GeolocationController);
    expect(ControllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: persistedLocation,
      }),
    );
  });
});
