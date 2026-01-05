import { renderHook, waitFor } from '@testing-library/react-native';
import { useRampsControllerInit } from './useRampsControllerInit';

const mockFetchGeolocation = jest.fn().mockResolvedValue('US');

jest.mock('./useRampsGeolocation', () => ({
  __esModule: true,
  default: () => ({
    geolocation: null,
    isLoading: false,
    error: null,
    fetchGeolocation: mockFetchGeolocation,
  }),
  useRampsGeolocation: () => ({
    geolocation: null,
    isLoading: false,
    error: null,
    fetchGeolocation: mockFetchGeolocation,
  }),
}));

describe('useRampsControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization behavior', () => {
    it('calls fetchGeolocation on mount with forceRefresh false by default', async () => {
      renderHook(() => useRampsControllerInit());

      await waitFor(() => {
        expect(mockFetchGeolocation).toHaveBeenCalledWith({
          forceRefresh: false,
        });
      });
    });

    it('calls fetchGeolocation with forceRefresh true when specified', async () => {
      renderHook(() =>
        useRampsControllerInit({ forceGeolocationRefresh: true }),
      );

      await waitFor(() => {
        expect(mockFetchGeolocation).toHaveBeenCalledWith({
          forceRefresh: true,
        });
      });
    });

    it('only calls fetchGeolocation once on re-renders', async () => {
      const { rerender } = renderHook(() => useRampsControllerInit());

      rerender({});
      rerender({});

      await waitFor(() => {
        expect(mockFetchGeolocation).toHaveBeenCalledTimes(1);
      });
    });
  });
});
