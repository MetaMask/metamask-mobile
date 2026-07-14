import {
  fetch as netInfoFetch,
  addEventListener as netInfoAddEventListener,
} from '@react-native-community/netinfo';
import { CONNECTIVITY_STATUSES } from '@metamask/connectivity-controller';
import { NetInfoConnectivityAdapter } from './netinfo-connectivity-adapter';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

describe('NetInfoConnectivityAdapter', () => {
  let adapter: NetInfoConnectivityAdapter;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    mockUnsubscribe = jest.fn();
    (netInfoAddEventListener as jest.Mock).mockReturnValue(mockUnsubscribe);
    (netInfoFetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  afterEach(() => {
    adapter?.destroy();
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('fetches NetInfo state when none has been observed yet', async () => {
      (netInfoFetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });
      adapter = new NetInfoConnectivityAdapter();
      await expect(adapter.getStatus()).resolves.toBe(
        CONNECTIVITY_STATUSES.Online,
      );
      expect(netInfoFetch).toHaveBeenCalled();
    });

    it('prefers listener-supplied state over a stale in-flight fetch', async () => {
      // Fetch resolves with stale data (online) only after we deliberately release it.
      let resolveFetch!: (state: {
        isConnected: boolean;
        isInternetReachable: boolean;
      }) => void;
      (netInfoFetch as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );

      adapter = new NetInfoConnectivityAdapter();
      const pending = adapter.getStatus();

      // Listener delivers fresher state (offline) while the fetch is in flight.
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      // Now let the stale fetch resolve — it must not clobber the listener state.
      resolveFetch({ isConnected: true, isInternetReachable: true });

      await expect(pending).resolves.toBe(CONNECTIVITY_STATUSES.Offline);
    });

    it('returns Online when isInternetReachable is true', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();
      adapter.onConnectivityChange(callback);

      // Simulate NetInfo state update (listener is set up in constructor)
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: true,
      });

      await expect(adapter.getStatus()).resolves.toBe(
        CONNECTIVITY_STATUSES.Online,
      );
    });

    it('returns Offline when isInternetReachable is false', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();
      adapter.onConnectivityChange(callback);

      // Simulate NetInfo state update (listener is set up in constructor)
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: false,
      });

      await expect(adapter.getStatus()).resolves.toBe(
        CONNECTIVITY_STATUSES.Offline,
      );
    });

    it('falls back to isConnected when isInternetReachable is null', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();
      adapter.onConnectivityChange(callback);

      // Simulate NetInfo state update with null isInternetReachable (listener is set up in constructor)
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: null,
      });

      await expect(adapter.getStatus()).resolves.toBe(
        CONNECTIVITY_STATUSES.Online,
      );
    });

    it('returns Offline when both isInternetReachable and isConnected are false', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();
      adapter.onConnectivityChange(callback);

      // Simulate NetInfo state update (listener is set up in constructor)
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      await expect(adapter.getStatus()).resolves.toBe(
        CONNECTIVITY_STATUSES.Offline,
      );
    });
  });

  describe('onConnectivityChange', () => {
    it('subscribes without fetching initial state', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      // Adapter no longer fetches initial state — the controller's init()
      // is responsible for seeding initial state via getStatus().
      expect(netInfoFetch).not.toHaveBeenCalled();
      expect(netInfoAddEventListener).toHaveBeenCalledTimes(1);
      expect(callback).not.toHaveBeenCalled();
    });

    it('calls callback when connectivity changes to offline', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      expect(callback).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Offline);
    });

    it('calls callback when connectivity changes to online', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: true,
      });

      expect(callback).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Online);
    });

    it('uses isConnected fallback when isInternetReachable is null', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: null,
      });

      expect(callback).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Online);
    });

    it('supports multiple callbacks', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      adapter.onConnectivityChange(callback1);
      adapter.onConnectivityChange(callback2);

      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      expect(callback1).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Offline);
      expect(callback2).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Offline);
    });
  });

  describe('destroy', () => {
    it('unsubscribes from NetInfo and clears callbacks', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);
      adapter.destroy();

      expect(mockUnsubscribe).toHaveBeenCalled();
      // After destroy, state is cleared; getStatus refetches and falls back to the default mock (Online).
      await expect(adapter.getStatus()).resolves.toBe(
        CONNECTIVITY_STATUSES.Online,
      );
    });

    it('can be called multiple times without error', () => {
      adapter = new NetInfoConnectivityAdapter();
      expect(() => {
        adapter.destroy();
        adapter.destroy();
      }).not.toThrow();
    });

    it('stops calling callbacks after destroy', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);
      adapter.destroy();

      // Simulate NetInfo state change after destroy
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      if (addEventListenerCallback) {
        addEventListenerCallback({
          isConnected: false,
          isInternetReachable: false,
        });
      }

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
