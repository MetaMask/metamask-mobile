import { renderHook, act } from '@testing-library/react-hooks';
import { useUserLocation } from './useGeolocation';
import { useCardSDK } from '../sdk';

// Mock the useCardSDK hook
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

// Mock console.error to suppress error logs in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('useUserLocation', () => {
  const mockGetGeoLocation = jest.fn();
  const mockSDK = {
    getGeoLocation: mockGetGeoLocation,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
    // Reset mock implementations to ensure clean state
    mockGetGeoLocation.mockReset();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should initialize with empty location', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.location).toBe('');
    expect(typeof result.current.fetchLocation).toBe('function');
  });

  it('should fetch location successfully when autoFetch is true', async () => {
    const mockLocation = 'US';
    mockGetGeoLocation.mockResolvedValueOnce(mockLocation);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result, waitForNextUpdate } = renderHook(() =>
      useUserLocation(true),
    );

    expect(result.current.location).toBe('');

    await waitForNextUpdate();

    expect(result.current.location).toBe(mockLocation);
    expect(mockGetGeoLocation).toHaveBeenCalledTimes(1);
  });

  it('should not fetch location automatically when autoFetch is false', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useUserLocation(false));

    expect(result.current.location).toBe('');
    expect(mockGetGeoLocation).not.toHaveBeenCalled();
  });

  it('should not fetch location automatically when autoFetch is undefined', () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.location).toBe('');
    expect(mockGetGeoLocation).not.toHaveBeenCalled();
  });

  it('should fetch location manually when fetchLocation is called', async () => {
    const mockLocation = 'CA';
    mockGetGeoLocation.mockResolvedValueOnce(mockLocation);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.location).toBe('');

    await act(async () => {
      await result.current.fetchLocation();
    });

    expect(result.current.location).toBe(mockLocation);
    expect(mockGetGeoLocation).toHaveBeenCalledTimes(1);
  });

  it('should handle geolocation API errors gracefully', async () => {
    const mockError = new Error('Geolocation service unavailable');
    mockGetGeoLocation.mockRejectedValueOnce(mockError);
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.location).toBe('');

    await act(async () => {
      await result.current.fetchLocation();
    });

    expect(result.current.location).toBe('');
    expect(mockGetGeoLocation).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error fetching geolocation:',
      mockError,
    );
  });

  it('should not fetch location when SDK is not available', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });

    const { result } = renderHook(() => useUserLocation(true));

    await act(async () => {
      await result.current.fetchLocation();
    });

    expect(result.current.location).toBe('');
    expect(mockGetGeoLocation).not.toHaveBeenCalled();
  });

  it('should refetch location when SDK becomes available', async () => {
    const mockLocation = 'UK';
    mockGetGeoLocation.mockResolvedValueOnce(mockLocation);

    // Start with no SDK
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: null });
    const { result, rerender } = renderHook(() => useUserLocation(false));

    expect(result.current.location).toBe('');
    expect(mockGetGeoLocation).not.toHaveBeenCalled();

    // SDK becomes available - update mock and force re-render
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    rerender();

    // Now manually fetch location
    await act(async () => {
      await result.current.fetchLocation();
    });

    expect(result.current.location).toBe(mockLocation);
    expect(mockGetGeoLocation).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple consecutive fetch calls', async () => {
    const mockLocations = ['US', 'CA', 'UK'];

    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });

    const { result } = renderHook(() => useUserLocation());

    // First fetch
    mockGetGeoLocation.mockResolvedValueOnce(mockLocations[0]);
    await act(async () => {
      await result.current.fetchLocation();
    });
    expect(result.current.location).toBe(mockLocations[0]);

    // Second fetch
    mockGetGeoLocation.mockResolvedValueOnce(mockLocations[1]);
    await act(async () => {
      await result.current.fetchLocation();
    });
    expect(result.current.location).toBe(mockLocations[1]);

    // Third fetch
    mockGetGeoLocation.mockResolvedValueOnce(mockLocations[2]);
    await act(async () => {
      await result.current.fetchLocation();
    });
    expect(result.current.location).toBe(mockLocations[2]);

    expect(mockGetGeoLocation).toHaveBeenCalledTimes(3);
  });

  it('should handle empty string response from geolocation API', async () => {
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    mockGetGeoLocation.mockResolvedValueOnce('');

    const { result } = renderHook(() => useUserLocation());

    await act(async () => {
      await result.current.fetchLocation();
    });

    expect(result.current.location).toBe('');
    expect(mockGetGeoLocation).toHaveBeenCalledTimes(1);
  });

  it('should update location when autoFetch is changed from false to true', async () => {
    const mockLocation = 'FR';
    (useCardSDK as jest.Mock).mockReturnValue({ sdk: mockSDK });
    mockGetGeoLocation.mockResolvedValueOnce(mockLocation);

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ autoFetch }) => useUserLocation(autoFetch),
      {
        initialProps: { autoFetch: false },
      },
    );

    expect(result.current.location).toBe('');
    expect(mockGetGeoLocation).not.toHaveBeenCalled();

    // Change autoFetch to true
    rerender({ autoFetch: true });

    await waitForNextUpdate();

    expect(result.current.location).toBe(mockLocation);
    expect(mockGetGeoLocation).toHaveBeenCalledTimes(1);
  });
});
