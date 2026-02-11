import { CONNECTIVITY_STATUSES } from '@metamask/connectivity-controller';
import { RootState } from '../reducers';
import {
  selectConnectivityStatus,
  selectIsDeviceOffline,
} from './connectivityController';

describe('ConnectivityController Selectors', () => {
  const createMockRootState = (connectivityControllerState?: {
    connectivityStatus?:
      | typeof CONNECTIVITY_STATUSES.Online
      | typeof CONNECTIVITY_STATUSES.Offline;
  }): RootState =>
    ({
      engine: {
        backgroundState: {
          ConnectivityController: connectivityControllerState,
        },
      },
    }) as unknown as RootState;

  describe('selectConnectivityStatus', () => {
    it('returns Online when connectivity status is Online', () => {
      const mockState = createMockRootState({
        connectivityStatus: CONNECTIVITY_STATUSES.Online,
      });

      const result = selectConnectivityStatus(mockState);

      expect(result).toBe(CONNECTIVITY_STATUSES.Online);
    });

    it('returns Offline when connectivity status is Offline', () => {
      const mockState = createMockRootState({
        connectivityStatus: CONNECTIVITY_STATUSES.Offline,
      });

      const result = selectConnectivityStatus(mockState);

      expect(result).toBe(CONNECTIVITY_STATUSES.Offline);
    });

    it('returns Online as default when ConnectivityController state is undefined', () => {
      const mockState = createMockRootState();

      const result = selectConnectivityStatus(mockState);

      expect(result).toBe(CONNECTIVITY_STATUSES.Online);
    });

    it('returns Online as default when connectivityStatus is undefined', () => {
      const mockState = createMockRootState({});

      const result = selectConnectivityStatus(mockState);

      expect(result).toBe(CONNECTIVITY_STATUSES.Online);
    });

    it('returns Online as default when state is null', () => {
      const mockState = {
        engine: {
          backgroundState: {
            ConnectivityController: null,
          },
        },
      } as unknown as RootState;

      const result = selectConnectivityStatus(mockState);

      expect(result).toBe(CONNECTIVITY_STATUSES.Online);
    });
  });

  describe('selectIsDeviceOffline', () => {
    it('returns true when connectivity status is Offline', () => {
      const mockState = createMockRootState({
        connectivityStatus: CONNECTIVITY_STATUSES.Offline,
      });

      const result = selectIsDeviceOffline(mockState);

      expect(result).toBe(true);
    });

    it('returns false when connectivity status is Online', () => {
      const mockState = createMockRootState({
        connectivityStatus: CONNECTIVITY_STATUSES.Online,
      });

      const result = selectIsDeviceOffline(mockState);

      expect(result).toBe(false);
    });

    it('returns false when ConnectivityController state is undefined', () => {
      const mockState = createMockRootState();

      const result = selectIsDeviceOffline(mockState);

      expect(result).toBe(false);
    });

    it('returns false when connectivityStatus is undefined', () => {
      const mockState = createMockRootState({});

      const result = selectIsDeviceOffline(mockState);

      expect(result).toBe(false);
    });

    it('returns false when state is null', () => {
      const mockState = {
        engine: {
          backgroundState: {
            ConnectivityController: null,
          },
        },
      } as unknown as RootState;

      const result = selectIsDeviceOffline(mockState);

      expect(result).toBe(false);
    });
  });
});
