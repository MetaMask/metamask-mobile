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
    it('returns Online by default when no state is available', () => {
      adapter = new NetInfoConnectivityAdapter();
      expect(adapter.getStatus()).toBe(CONNECTIVITY_STATUSES.Online);
    });

    it('returns Online when isInternetReachable is true', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();
      adapter.onConnectivityChange(callback);

      // Simulate NetInfo state update
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: true,
      });

      expect(adapter.getStatus()).toBe(CONNECTIVITY_STATUSES.Online);
    });

    it('returns Offline when isInternetReachable is false', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();
      adapter.onConnectivityChange(callback);

      // Simulate NetInfo state update
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: false,
      });

      expect(adapter.getStatus()).toBe(CONNECTIVITY_STATUSES.Offline);
    });

    it('falls back to isConnected when isInternetReachable is null', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();
      adapter.onConnectivityChange(callback);

      // Simulate NetInfo state update with null isInternetReachable
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: null,
      });

      expect(adapter.getStatus()).toBe(CONNECTIVITY_STATUSES.Online);
    });

    it('returns Offline when both isInternetReachable and isConnected are false', () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();
      adapter.onConnectivityChange(callback);

      // Simulate NetInfo state update
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      expect(adapter.getStatus()).toBe(CONNECTIVITY_STATUSES.Offline);
    });
  });

  describe('onConnectivityChange', () => {
    it('fetches initial state and calls callback', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      // Wait for initial fetch
      await Promise.resolve();

      expect(netInfoFetch).toHaveBeenCalled();
      expect(netInfoAddEventListener).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Online);
    });

    it('calls callback when connectivity changes to offline', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      // Wait for initial fetch
      await Promise.resolve();
      callback.mockClear();

      // Simulate NetInfo state change
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: false,
        isInternetReachable: false,
      });

      expect(callback).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Offline);
    });

    it('calls callback when connectivity changes to online', async () => {
      (netInfoFetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      // Wait for initial fetch
      await Promise.resolve();
      callback.mockClear();

      // Simulate NetInfo state change
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: true,
      });

      expect(callback).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Online);
    });

    it('uses isConnected fallback when isInternetReachable is null', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      // Wait for initial fetch
      await Promise.resolve();
      callback.mockClear();

      // Simulate NetInfo state with null isInternetReachable
      const addEventListenerCallback = (netInfoAddEventListener as jest.Mock)
        .mock.calls[0]?.[0];
      addEventListenerCallback({
        isConnected: true,
        isInternetReachable: null,
      });

      expect(callback).toHaveBeenCalledWith(CONNECTIVITY_STATUSES.Online);
    });
  });

  describe('destroy', () => {
    it('unsubscribes from NetInfo and clears callback', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      // Wait for initial fetch
      await Promise.resolve();

      adapter.destroy();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(adapter.getStatus()).toBe(CONNECTIVITY_STATUSES.Online); // Should still work but with no state
    });

    it('can be called multiple times without error', () => {
      adapter = new NetInfoConnectivityAdapter();
      expect(() => {
        adapter.destroy();
        adapter.destroy();
      }).not.toThrow();
    });

    it('stops calling callback after destroy', async () => {
      adapter = new NetInfoConnectivityAdapter();
      const callback = jest.fn();

      adapter.onConnectivityChange(callback);

      // Wait for initial fetch
      await Promise.resolve();
      callback.mockClear();

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
