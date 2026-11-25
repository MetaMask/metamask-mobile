import {
  addEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import {
  UNKNOWN_LOCATION,
  type GeolocationController,
} from '@metamask/geolocation-controller';
import { fetchInitialGeolocation } from './geolocation-controller';

type NetInfoListener = (state: Partial<NetInfoState>) => void;

const mockRemoveListener = jest.fn();
let mockNetInfoListener: NetInfoListener | undefined;

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  addEventListener: jest.fn(),
}));

const mockAddEventListener = addEventListener as jest.Mock;

interface MockControllerState {
  location: string;
  status: string;
}

function buildGeolocationController(location: string, status: string = 'idle') {
  const state: MockControllerState = { location, status };
  return {
    state,
    getGeolocation: jest.fn().mockResolvedValue('US'),
    refreshGeolocation: jest.fn().mockResolvedValue('US'),
  } as unknown as jest.Mocked<GeolocationController> & {
    state: MockControllerState;
  };
}

const emitConnectivity = (isInternetReachable: boolean | null) => {
  mockNetInfoListener?.({ isInternetReachable });
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('fetchInitialGeolocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoListener = undefined;
    mockAddEventListener.mockImplementation((listener: NetInfoListener) => {
      mockNetInfoListener = listener;
      return mockRemoveListener;
    });
  });

  it('fetches geolocation when the location is unknown', () => {
    const controller = buildGeolocationController(UNKNOWN_LOCATION);

    fetchInitialGeolocation(controller);

    expect(controller.getGeolocation).toHaveBeenCalledTimes(1);
  });

  it('fetches geolocation when the location is empty', () => {
    const controller = buildGeolocationController('');

    fetchInitialGeolocation(controller);

    expect(controller.getGeolocation).toHaveBeenCalledTimes(1);
  });

  it('skips the fetch and connectivity listener when the hydrated state already has a known location', () => {
    const controller = buildGeolocationController('US');

    fetchInitialGeolocation(controller);

    expect(controller.getGeolocation).not.toHaveBeenCalled();
    expect(mockAddEventListener).not.toHaveBeenCalled();
  });

  it('swallows fetch errors', async () => {
    const controller = buildGeolocationController(UNKNOWN_LOCATION);
    controller.getGeolocation.mockRejectedValue(new Error('network'));

    expect(() => fetchInitialGeolocation(controller)).not.toThrow();
    await flushPromises();
  });

  describe('retry after connectivity is restored', () => {
    it('refreshes geolocation when the internet becomes reachable after a failed lookup', async () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);
      fetchInitialGeolocation(controller);
      controller.state.status = 'error';

      emitConnectivity(true);
      await flushPromises();

      expect(controller.refreshGeolocation).toHaveBeenCalledTimes(1);
    });

    it('does not refresh while the internet is unreachable', () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);
      fetchInitialGeolocation(controller);
      controller.state.status = 'error';

      emitConnectivity(false);
      emitConnectivity(null);

      expect(controller.refreshGeolocation).not.toHaveBeenCalled();
    });

    it('does not refresh while the initial lookup is still loading', () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);
      fetchInitialGeolocation(controller);
      controller.state.status = 'loading';

      emitConnectivity(true);

      expect(controller.refreshGeolocation).not.toHaveBeenCalled();
    });

    it('does not start a second refresh while one is in flight', async () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);
      controller.refreshGeolocation.mockReturnValue(
        new Promise(() => undefined),
      );
      fetchInitialGeolocation(controller);
      controller.state.status = 'error';

      emitConnectivity(true);
      emitConnectivity(true);
      await flushPromises();

      expect(controller.refreshGeolocation).toHaveBeenCalledTimes(1);
    });

    it('stops listening once a refresh resolves a known location', async () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);
      controller.refreshGeolocation.mockImplementation(async () => {
        controller.state.location = 'ES';
        controller.state.status = 'complete';
        return 'ES';
      });
      fetchInitialGeolocation(controller);
      controller.state.status = 'error';

      emitConnectivity(true);
      await flushPromises();

      expect(mockRemoveListener).toHaveBeenCalledTimes(1);
    });

    it('keeps listening and retries again when a refresh fails', async () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);
      controller.refreshGeolocation.mockRejectedValueOnce(new Error('network'));
      fetchInitialGeolocation(controller);
      controller.state.status = 'error';

      emitConnectivity(true);
      await flushPromises();
      emitConnectivity(true);
      await flushPromises();

      expect(controller.refreshGeolocation).toHaveBeenCalledTimes(2);
      expect(mockRemoveListener).not.toHaveBeenCalled();
    });

    it('stops listening when the initial lookup succeeds', () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);
      fetchInitialGeolocation(controller);
      controller.state.location = 'ES';
      controller.state.status = 'complete';

      emitConnectivity(true);

      expect(controller.refreshGeolocation).not.toHaveBeenCalled();
      expect(mockRemoveListener).toHaveBeenCalledTimes(1);
    });

    it('removes the listener when NetInfo invokes it synchronously with a known location', () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);
      mockAddEventListener.mockImplementation((listener: NetInfoListener) => {
        controller.state.location = 'ES';
        listener({ isInternetReachable: true });
        return mockRemoveListener;
      });

      expect(() => fetchInitialGeolocation(controller)).not.toThrow();
      expect(mockRemoveListener).toHaveBeenCalledTimes(1);
    });

    it('returns an unsubscribe function that removes the listener', () => {
      const controller = buildGeolocationController(UNKNOWN_LOCATION);

      const unsubscribe = fetchInitialGeolocation(controller);
      unsubscribe();
      controller.state.status = 'error';
      emitConnectivity(true);

      expect(mockRemoveListener).toHaveBeenCalledTimes(1);
      expect(controller.refreshGeolocation).not.toHaveBeenCalled();
    });
  });
});
